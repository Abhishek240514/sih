"""
ml_detector.py
==============
Hybrid ML Threat-Detection Pipeline for SIH Crypto Forensics.

Pipeline
--------
1. Ingest engineered features from ../backend/processed/engineered_features.csv
2. Join with ground-truth labels from ../data_generator/outputs/ground_truth.csv
3. Stage-1  - Unsupervised : IsolationForest  -> anomaly_score  in [0, 1]
4. Stage-2  - Supervised   : XGBoost Classifier -> xgb_prob     in [0, 1]
   .  Handles extreme class imbalance via scale_pos_weight
   .  Evaluated with Precision & Recall (printed to console)
5. Fusion   - Investigation Priority Score = alpha*xgb_prob + (1-alpha)*anomaly_score
6. Explainability Engine  - SHAP TreeExplainer -> top-3 feature reasons per entity
7. Output   - machine_learning/models/ranked_alerts.json  (frontend-ready)

All paths are resolved relative to this file's location so the script
works regardless of the working directory from which it is invoked.

Usage
-----
    python3 machine_learning/ml_detector.py

Requirements
------------
    pip install xgboost shap scikit-learn pandas numpy
"""

from __future__ import annotations

import json
import logging
import os
import sys
import warnings
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
import shap
import xgboost as xgb
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("ml_detector")

# ---------------------------------------------------------------------------
# Path constants  (all relative to this script's location)
# ---------------------------------------------------------------------------
_HERE: Path = Path(__file__).resolve().parent          # machine_learning/
_FEATURES_CSV: Path = _HERE.parent / "backend" / "processed" / "engineered_features.csv"
_GROUND_TRUTH_CSV: Path = _HERE.parent / "data_generator" / "outputs" / "ground_truth.csv"
_MODELS_DIR: Path = _HERE / "models"
_OUTPUT_JSON: Path = _MODELS_DIR / "ranked_alerts.json"

# Priority-score fusion weight: how much to weight supervised vs unsupervised
_ALPHA: float = 0.65   # XGBoost weight;  (1 - _ALPHA) = IsolationForest weight

# IsolationForest contamination - approximate fraction of anomalies expected
_CONTAMINATION: float = 0.05

# Minimum investigation priority score to flag as an alert in the JSON
_ALERT_THRESHOLD: float = 0.40

# Feature columns used as model inputs
FEATURE_COLS: List[str] = [
    "entity_size",
    "in_degree",
    "out_degree",
    "pagerank",
    "tx_count",
    "tx_velocity",
    "ip_hop_count",
    "total_sent_btc",
    "total_recv_btc",
]


# ---------------------------------------------------------------------------
# 1. Data Ingestion & Merge
# ---------------------------------------------------------------------------

def _synthesise_training_rows(
    entity_df: pd.DataFrame,
    gt_df: pd.DataFrame,
    n_benign: int = 30,
    n_suspicious: int = 10,
    rng_seed: int = 42,
) -> pd.DataFrame:
    """
    When ground-truth entity IDs do not overlap with the backend entity IDs
    (a common occurrence with synthetic data generators), we cannot do a
    direct key join.  Instead we generate *synthetic* labelled training rows
    by sampling from the feature distributions of the real entity_df, then
    perturbing them to create plausible suspicious profiles.

    Suspicious profiles are created by amplifying the features most
    associated with illicit behaviour:
      - tx_velocity    (high -> laundering / mixing pattern)
      - ip_hop_count   (high -> Tor / VPN hopping)
      - out_degree     (high -> fan-out structuring)
      - btc_net_flow   (strongly negative -> incoming mixing sink)

    The synthetic rows are tagged with entity_id = '__synth_N__' and are
    used ONLY during XGBoost training; they are excluded from the final
    ranked-alerts output.

    Returns
    -------
    synth_df : DataFrame with entity_id + FEATURE_COLS + ['label']
    """
    rng = np.random.default_rng(rng_seed)
    rows: List[Dict[str, Any]] = []

    # Compute per-feature statistics from real entities
    stats = entity_df[FEATURE_COLS].describe()

    def _sample_row(label: int, idx: int) -> Dict[str, Any]:
        row: Dict[str, Any] = {"entity_id": f"__synth_{label}_{idx}__", "label": label}
        for feat in FEATURE_COLS:
            mu = float(stats.loc["mean", feat])
            sd = max(float(stats.loc["std", feat]), 1e-6)
            val = float(rng.normal(mu, sd))

            # For suspicious rows push high-risk features upward
            if label == 1:
                if feat in ("tx_velocity", "ip_hop_count", "out_degree", "tx_count"):
                    val = mu + abs(rng.normal(2.5 * sd, sd))   # right-tail amplification
                elif feat == "total_sent_btc":
                    val = mu + abs(rng.normal(3.0 * sd, sd))

            # Clamp non-negative features
            if feat not in ("btc_net_flow",):
                val = max(0.0, val)
            row[feat] = round(val, 6)
        return row

    for i in range(n_benign):
        rows.append(_sample_row(0, i))
    for i in range(n_suspicious):
        rows.append(_sample_row(1, i))

    synth_df = pd.DataFrame(rows)
    log.info(
        "  -> Synthesised %d labelled training rows (%d benign, %d suspicious) "
        "because ground-truth entity IDs do not overlap with backend entity IDs.",
        len(synth_df),
        n_benign,
        n_suspicious,
    )
    return synth_df


def load_and_merge() -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Load engineered features and ground-truth labels.

    Join strategy
    -------------
    1. Try a direct entity_id join between backend entities and ground-truth.
    2. If overlap is zero (ID-format mismatch between data-generator and backend),
       synthesise realistic labelled training rows so XGBoost always has data.

    Returns
    -------
    entity_df  : entity-level feature frame from backend (for scoring ALL entities)
    gt_df      : raw ground-truth DataFrame
    train_df   : labelled DataFrame used for XGBoost training
                 (may be a direct join subset OR synthesised rows)
    """
    log.info("Loading engineered features from: %s", _FEATURES_CSV)
    if not _FEATURES_CSV.exists():
        log.error("Engineered features CSV not found at %s", _FEATURES_CSV)
        sys.exit(1)

    feat_df = pd.read_csv(_FEATURES_CSV)
    log.info("  -> %d wallet rows, %d columns", len(feat_df), feat_df.shape[1])

    # Aggregate to entity level: mean for continuous, sum/max for counts
    agg_rules = {col: "mean" for col in FEATURE_COLS}
    agg_rules.update({
        "entity_size":  "max",
        "ip_hop_count": "max",
        "in_degree":    "sum",
        "out_degree":   "sum",
        "tx_count":     "sum",
    })
    entity_df = feat_df.groupby("Entity_ID").agg(agg_rules).reset_index()
    entity_df.rename(columns={"Entity_ID": "entity_id"}, inplace=True)
    log.info("  -> %d distinct entities after aggregation", len(entity_df))

    # Ground Truth
    log.info("Loading ground-truth labels from: %s", _GROUND_TRUTH_CSV)
    if not _GROUND_TRUTH_CSV.exists():
        log.warning("Ground-truth CSV not found - supervised stage will be skipped.")
        empty = pd.DataFrame(columns=["entity_id", "label"])
        return entity_df, empty, empty

    gt_df = pd.read_csv(_GROUND_TRUTH_CSV)
    gt_df.columns = gt_df.columns.str.strip()
    gt_df["entity_id"] = gt_df["entity_id"].str.strip()
    gt_df["label"] = pd.to_numeric(gt_df["label"], errors="coerce").fillna(0).astype(int)
    log.info(
        "  -> %d ground-truth rows  |  label=1: %d  |  label=0: %d",
        len(gt_df),
        int((gt_df["label"] == 1).sum()),
        int((gt_df["label"] == 0).sum()),
    )

    # Attempt direct join on entity_id
    merged = entity_df.merge(
        gt_df[["entity_id", "label"]], on="entity_id", how="inner"
    )
    n_overlap = len(merged)
    log.info("  -> Direct entity_id join overlap: %d rows", n_overlap)

    if n_overlap > 0:
        # Use the matched subset for supervised training
        train_df = merged[["entity_id", "label"] + FEATURE_COLS].copy()
        log.info("  -> Using direct-join subset for XGBoost training.")
    else:
        # ID mismatch: synthesise training data from feature distributions
        log.warning(
            "  -> No entity_id overlap between backend and ground-truth. "
            "Generating synthetic training rows from feature statistics."
        )
        train_df = _synthesise_training_rows(entity_df, gt_df)

    return entity_df, gt_df, train_df


# ---------------------------------------------------------------------------
# 2. Feature Matrix Preparation
# ---------------------------------------------------------------------------
def build_feature_matrix(
    entity_df: pd.DataFrame,
    train_df: pd.DataFrame,
    gt_df: pd.DataFrame,
) -> Tuple[pd.DataFrame, np.ndarray, np.ndarray, np.ndarray, pd.DataFrame, List[str]]:
    """
    Build feature matrices for scoring (ALL entities) and training (labelled).

    Derives additional ratio features to improve discriminative power:
      - btc_net_flow   : total_sent_btc - total_recv_btc
      - degree_ratio   : out_degree / (in_degree + 1)
      - btc_per_tx     : (total_sent + total_recv) / (tx_count + 1)

    Parameters
    ----------
    entity_df : aggregated entity-level features from the backend
    train_df  : labelled rows for supervised training (direct join OR synthesised)
    gt_df     : raw ground-truth for label look-up on scored entities

    Returns
    -------
    X_all        : feature DataFrame for ALL entities  (IsolationForest + inference)
    y_all        : label array for ALL entities (-1 where unknown)
    X_train      : feature array for labelled training rows
    y_train      : label array for labelled training rows
    ref_all      : entity_id + features reference DataFrame
    feature_names: ordered list of feature column names
    """
    entity_df = entity_df.copy()

    # Derived features
    entity_df["btc_net_flow"] = entity_df["total_sent_btc"] - entity_df["total_recv_btc"]
    entity_df["degree_ratio"] = entity_df["out_degree"] / (entity_df["in_degree"] + 1)
    entity_df["btc_per_tx"] = (
        (entity_df["total_sent_btc"] + entity_df["total_recv_btc"])
        / (entity_df["tx_count"] + 1)
    )

    feature_names = FEATURE_COLS + ["btc_net_flow", "degree_ratio", "btc_per_tx"]

    # Ensure all feature columns exist in entity_df
    for col in feature_names:
        if col not in entity_df.columns:
            entity_df[col] = 0.0

    X_all = entity_df[feature_names].fillna(0.0).reset_index(drop=True)
    ref_all = entity_df[["entity_id"] + feature_names].copy().reset_index(drop=True)

    # y_all: labels for ALL entities (for metadata/output only; -1 = unknown)
    label_map = dict(zip(gt_df["entity_id"], gt_df["label"]))
    y_all = np.array([label_map.get(eid, -1) for eid in entity_df["entity_id"]])

    # Training matrix from train_df (may contain synthetic rows)
    train_df = train_df.copy()
    for col in feature_names:
        if col not in train_df.columns:
            train_df[col] = 0.0
    # Add derived features to train_df if missing
    if "btc_net_flow" not in train_df.columns:
        train_df["btc_net_flow"] = (
            train_df["total_sent_btc"] - train_df["total_recv_btc"]
        )
    if "degree_ratio" not in train_df.columns:
        train_df["degree_ratio"] = train_df["out_degree"] / (train_df["in_degree"] + 1)
    if "btc_per_tx" not in train_df.columns:
        train_df["btc_per_tx"] = (
            (train_df["total_sent_btc"] + train_df["total_recv_btc"])
            / (train_df["tx_count"] + 1)
        )

    X_train = train_df[feature_names].fillna(0.0).values
    y_train = train_df["label"].values

    log.info(
        "Scoring matrix: %s | Training matrix: %s | Features: %d",
        X_all.shape,
        X_train.shape,
        len(feature_names),
    )
    return X_all, y_all, X_train, y_train, ref_all, feature_names


# ---------------------------------------------------------------------------
# 3a. Stage-1: Unsupervised IsolationForest
# ---------------------------------------------------------------------------
def run_isolation_forest(X: pd.DataFrame) -> np.ndarray:
    """
    Fit IsolationForest on the full entity matrix.

    The raw decision_function output (higher = more normal) is negated and
    min-max scaled to produce anomaly_score in [0, 1] where 1 = most anomalous.

    Returns
    -------
    anomaly_score : np.ndarray of shape (n_entities,) in [0, 1]
    """
    log.info(
        "Stage-1 | IsolationForest  (n_estimators=200, contamination=%.2f)",
        _CONTAMINATION,
    )
    iso = IsolationForest(
        n_estimators=200,
        contamination=_CONTAMINATION,
        random_state=42,
        n_jobs=-1,
    )
    iso.fit(X)

    raw_scores = iso.decision_function(X)            # higher = more normal
    anomaly_score = MinMaxScaler().fit_transform(
        (-raw_scores).reshape(-1, 1)
    ).flatten()

    log.info(
        "  -> IsolationForest complete. Anomaly score range: [%.4f, %.4f]",
        anomaly_score.min(),
        anomaly_score.max(),
    )
    return anomaly_score


# ---------------------------------------------------------------------------
# 3b. Stage-2: Supervised XGBoost Classifier
# ---------------------------------------------------------------------------
def run_xgboost(
    X_score: pd.DataFrame,
    X_train: np.ndarray,
    y_train: np.ndarray,
    feature_names: List[str],
) -> Tuple[np.ndarray, Any]:
    """
    Train XGBoost on the labelled training matrix (X_train / y_train) —
    which may be a direct entity-join subset OR synthesised rows — then
    predict suspicion probabilities for ALL entities in X_score.

    Handles extreme class imbalance via scale_pos_weight.
    Prints Precision, Recall, and a full classification report to console.

    Parameters
    ----------
    X_score      : feature DataFrame for ALL entities (used for inference)
    X_train      : feature array for labelled training samples
    y_train      : label array for training samples
    feature_names: column names matching X_train columns

    Returns
    -------
    xgb_prob : np.ndarray of P(suspicious) in [0, 1] for every scored entity
    model    : fitted XGBClassifier (or None if training was impossible)
    """
    n_pos = int((y_train == 1).sum())
    n_neg = int((y_train == 0).sum())

    log.info(
        "Stage-2 | XGBoost  (training samples: %d  |  pos=%d, neg=%d)",
        len(y_train),
        n_pos,
        n_neg,
    )

    # Fallback: no positive class at all
    if len(y_train) == 0 or n_pos == 0:
        log.warning(
            "  -> No positive training samples. XGBoost returns 0.0 for all entities."
        )
        return np.zeros(len(X_score)), None

    # Class-imbalance weight
    scale_pos_weight = max(1.0, n_neg / n_pos)

    # Train / test split - stratified when enough samples exist
    if len(y_train) >= 6 and n_pos >= 2:
        X_tr, X_te, y_tr, y_te = train_test_split(
            X_train,
            y_train,
            test_size=0.25,
            stratify=y_train,
            random_state=42,
        )
    else:
        # Too few samples: train on all, report in-sample metrics
        X_tr, X_te = X_train.copy(), X_train.copy()
        y_tr, y_te = y_train.copy(), y_train.copy()
        log.warning(
            "  -> Too few training samples for a held-out split; "
            "reporting in-sample metrics."
        )

    model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(
        X_tr,
        y_tr,
        eval_set=[(X_te, y_te)],
        verbose=False,
    )

    # Evaluation metrics
    y_pred = model.predict(X_te)
    precision = precision_score(y_te, y_pred, zero_division=0)
    recall    = recall_score(y_te, y_pred, zero_division=0)

    sep = "=" * 60
    print(f"\n{sep}")
    print("  XGBoost Supervised Classifier -- Evaluation Metrics")
    print(sep)
    print(
        classification_report(
            y_te,
            y_pred,
            target_names=["Benign", "Suspicious"],
            zero_division=0,
        )
    )
    print(f"  Precision : {precision:.4f}")
    print(f"  Recall    : {recall:.4f}")
    print(f"{sep}\n")

    # Predict probabilities for ALL entities in scoring set
    xgb_prob = model.predict_proba(X_score)[:, 1]
    log.info(
        "  -> XGBoost complete. Scoring probability range: [%.4f, %.4f]",
        xgb_prob.min(),
        xgb_prob.max(),
    )
    return xgb_prob, model


# ---------------------------------------------------------------------------
# 4. Priority Score Fusion
# ---------------------------------------------------------------------------
def fuse_scores(anomaly_score: np.ndarray, xgb_prob: np.ndarray) -> np.ndarray:
    """
    Weighted linear fusion:
        priority = ALPHA * xgb_prob + (1 - ALPHA) * anomaly_score

    Both inputs are already in [0, 1]; the result is clipped to [0, 1].
    """
    priority = _ALPHA * xgb_prob + (1.0 - _ALPHA) * anomaly_score
    priority = np.clip(priority, 0.0, 1.0)
    log.info(
        "Score fusion complete. Priority range: [%.4f, %.4f]",
        priority.min(),
        priority.max(),
    )
    return priority


# ---------------------------------------------------------------------------
# 5. Explainability Engine  (SHAP TreeExplainer)
# ---------------------------------------------------------------------------
def explain_entities(
    model: Any,
    X: pd.DataFrame,
    feature_names: List[str],
    top_k: int = 3,
) -> List[List[Dict[str, Any]]]:
    """
    Compute SHAP-based per-entity feature attributions.

    For each entity the top_k features by absolute SHAP value are returned
    as a list of dicts with human-readable explanations.

    Falls back to XGBoost global feature importances if SHAP fails.

    Returns
    -------
    explanations : List[List[Dict]]  -- one inner list per entity
    """
    if model is None:
        log.warning("Explainability: No XGBoost model; returning empty explanations.")
        return [[] for _ in range(len(X))]

    try:
        log.info(
            "Explainability | SHAP TreeExplainer for %d entities ...", len(X)
        )
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X)   # (n_entities, n_features)

        explanations: List[List[Dict[str, Any]]] = []
        for i in range(len(X)):
            row_shap = shap_values[i]
            row_vals = X.iloc[i].values
            ranked_idx = np.argsort(np.abs(row_shap))[::-1][:top_k]
            reasons = []
            for idx in ranked_idx:
                sv = float(row_shap[idx])
                fv = float(row_vals[idx])
                reasons.append(
                    {
                        "rank": len(reasons) + 1,
                        "feature": feature_names[idx],
                        "shap_value": round(sv, 6),
                        "feature_value": round(fv, 6),
                        "direction": "increases_risk" if sv > 0 else "decreases_risk",
                        "explanation": _human_readable_reason(
                            feature_names[idx], sv, fv
                        ),
                    }
                )
            explanations.append(reasons)

        log.info("  -> SHAP explanations complete.")
        return explanations

    except Exception as exc:  # noqa: BLE001
        log.warning(
            "SHAP failed (%s); falling back to XGBoost feature importances.", exc
        )
        importances = model.feature_importances_
        top_idx = np.argsort(importances)[::-1][:top_k]
        fallback = [
            {
                "rank": rank + 1,
                "feature": feature_names[idx],
                "shap_value": round(float(importances[idx]), 6),
                "feature_value": None,
                "direction": "increases_risk",
                "explanation": (
                    f"Feature '{feature_names[idx]}' has high global importance "
                    f"(XGBoost weight = {importances[idx]:.4f})"
                ),
            }
            for rank, idx in enumerate(top_idx)
        ]
        return [fallback for _ in range(len(X))]


def _human_readable_reason(feature: str, shap_val: float, feat_val: float) -> str:
    """Generate a concise natural-language sentence for a SHAP attribution."""
    direction = "elevates" if shap_val > 0 else "suppresses"
    magnitude = abs(shap_val)

    _LABELS: Dict[str, str] = {
        "tx_velocity":    "High transaction velocity",
        "ip_hop_count":   "High IP-hopping count",
        "pagerank":       "Elevated PageRank centrality",
        "out_degree":     "High outgoing transaction degree",
        "in_degree":      "High incoming transaction degree",
        "total_sent_btc": "Large total BTC sent",
        "total_recv_btc": "Large total BTC received",
        "btc_net_flow":   "Significant net BTC flow imbalance",
        "degree_ratio":   "Skewed out-to-in degree ratio",
        "btc_per_tx":     "High BTC value per transaction",
        "entity_size":    "Large cluster size (co-spending wallets)",
        "tx_count":       "High transaction count",
    }
    label = _LABELS.get(feature, f"Feature '{feature}'")
    return (
        f"{label} (value={feat_val:.4f}) {direction} suspicion "
        f"[SHAP={shap_val:+.4f}, |contribution|={magnitude:.4f}]"
    )


# ---------------------------------------------------------------------------
# 6. Build and Save Output JSON
# ---------------------------------------------------------------------------
def _risk_tier(score: float) -> str:
    """Map a priority score to a human-readable risk tier."""
    if score >= 0.80:
        return "CRITICAL"
    if score >= 0.60:
        return "HIGH"
    if score >= 0.40:
        return "MEDIUM"
    if score >= 0.20:
        return "LOW"
    return "MINIMAL"


def build_output(
    ref_df: pd.DataFrame,
    y_all: np.ndarray,
    anomaly_scores: np.ndarray,
    xgb_probs: np.ndarray,
    priority_scores: np.ndarray,
    explanations: List[List[Dict[str, Any]]],
    gt_df: pd.DataFrame,
    feature_names: List[str],
) -> List[Dict[str, Any]]:
    """
    Assemble one alert record per entity, sorted by priority score descending.
    """
    label_map = dict(zip(gt_df["entity_id"], gt_df["label"])) if len(gt_df) else {}
    type_map: Dict[str, str] = {}
    if "type" in gt_df.columns:
        type_map = dict(zip(gt_df["entity_id"], gt_df["type"]))

    alerts: List[Dict[str, Any]] = []
    for i, row in ref_df.iterrows():
        eid = str(row["entity_id"])
        pri = float(priority_scores[i])
        gt_label = label_map.get(eid, -1)

        record: Dict[str, Any] = {
            "entity_id": eid,
            "investigation_priority": round(pri, 4),
            "risk_tier": _risk_tier(pri),
            "anomaly_score": round(float(anomaly_scores[i]), 4),
            "xgb_suspicion_prob": round(float(xgb_probs[i]), 4),
            "ground_truth_label": int(gt_label) if gt_label != -1 else None,
            "entity_type": type_map.get(eid, "unknown"),
            "features": {
                feat: round(float(row[feat]), 6)
                for feat in feature_names
                if feat in row.index
            },
            "top_3_reasons": explanations[i],
            "flagged_as_alert": pri >= _ALERT_THRESHOLD,
        }
        alerts.append(record)

    alerts.sort(key=lambda r: r["investigation_priority"], reverse=True)
    return alerts


def save_json(alerts: List[Dict[str, Any]]) -> None:
    """Create the models/ directory and write ranked_alerts.json."""
    _MODELS_DIR.mkdir(parents=True, exist_ok=True)

    flagged = [a for a in alerts if a["flagged_as_alert"]]
    output: Dict[str, Any] = {
        "metadata": {
            "pipeline_version": "1.0.0",
            "generated_at": pd.Timestamp.now(tz="UTC").isoformat(),
            "total_entities": len(alerts),
            "flagged_alerts": len(flagged),
            "alert_threshold": _ALERT_THRESHOLD,
            "fusion_alpha (xgb_weight)": _ALPHA,
            "model_stages": [
                "Stage-1: IsolationForest (unsupervised anomaly detection, n_estimators=200)",
                "Stage-2: XGBoost Classifier (supervised threat classification, n_estimators=300)",
            ],
            "explainability": "SHAP TreeExplainer -- top-3 feature attributions per entity",
            "score_formula": "priority = 0.65 * xgb_suspicion_prob + 0.35 * anomaly_score",
        },
        "score_distribution": {
            "CRITICAL": sum(1 for a in alerts if a["risk_tier"] == "CRITICAL"),
            "HIGH":     sum(1 for a in alerts if a["risk_tier"] == "HIGH"),
            "MEDIUM":   sum(1 for a in alerts if a["risk_tier"] == "MEDIUM"),
            "LOW":      sum(1 for a in alerts if a["risk_tier"] == "LOW"),
            "MINIMAL":  sum(1 for a in alerts if a["risk_tier"] == "MINIMAL"),
        },
        "ranked_alerts": alerts,
    }

    with open(_OUTPUT_JSON, "w", encoding="utf-8") as fh:
        json.dump(output, fh, indent=2, default=str)

    log.info(
        "Output written -> %s  (%d total entities, %d flagged)",
        _OUTPUT_JSON,
        len(alerts),
        len(flagged),
    )


# ---------------------------------------------------------------------------
# Main entry-point
# ---------------------------------------------------------------------------
def main() -> None:
    sep = "=" * 60
    log.info(sep)
    log.info("  SIH Crypto Forensics -- ML Threat Detection Pipeline v1.0")
    log.info(sep)

    # 1. Load data (with smart join / synthesis fallback)
    entity_df, gt_df, train_df = load_and_merge()

    # 2. Build scoring matrix (ALL entities) + training matrix (labelled)
    X_all, y_all, X_train, y_train, ref_all, feature_names = build_feature_matrix(
        entity_df, train_df, gt_df
    )

    # 3a. Unsupervised: IsolationForest anomaly scores
    anomaly_scores = run_isolation_forest(X_all)

    # 3b. Supervised: XGBoost suspicion probabilities + evaluation metrics
    xgb_probs, xgb_model = run_xgboost(X_all, X_train, y_train, feature_names)

    # 4. Fuse scores into Investigation Priority Score [0, 1]
    priority_scores = fuse_scores(anomaly_scores, xgb_probs)

    # 5. SHAP explainability: top-3 reasons per entity
    explanations = explain_entities(xgb_model, X_all, feature_names, top_k=3)

    # 6. Assemble alert records and persist JSON
    alerts = build_output(
        ref_all,
        y_all,
        anomaly_scores,
        xgb_probs,
        priority_scores,
        explanations,
        gt_df,
        feature_names,
    )
    save_json(alerts)

    # Console summary table
    print(f"\n{sep}")
    print("  Investigation Priority Score -- Top Entities")
    print(sep)
    print(f"  {'Entity ID':<30} {'Priority':>8}  {'Tier':<10}  {'GT':>6}")
    print("  " + "-" * 56)
    for a in alerts[:10]:
        gt_str = str(a["ground_truth_label"]) if a["ground_truth_label"] is not None else "?"
        flag = "[!]" if a["flagged_as_alert"] else "   "
        print(
            f"  {flag} {a['entity_id']:<27} "
            f"{a['investigation_priority']:>8.4f}  "
            f"{a['risk_tier']:<10}  {gt_str:>6}"
        )
    print(sep)
    print(f"\n  Output      -> {_OUTPUT_JSON}")
    print(f"  Entities scored : {len(alerts)}")
    print(
        f"  Flagged (>= {_ALERT_THRESHOLD}): "
        f"{sum(1 for a in alerts if a['flagged_as_alert'])}"
    )
    print()


if __name__ == "__main__":
    main()
