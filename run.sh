#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "Bitcoin Forensic Intelligence System"
echo "=========================================="

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "Created .env from .env.example"
    else
        echo "Warning: .env.example not found, using defaults"
    fi
fi

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Creating data directories..."
mkdir -p data/{raw,processed,models,sample}

if [ "$1" == "generate" ] || [ "$1" == "all" ]; then
    echo "Generating synthetic dataset..."
    python scripts/generate_dataset.py --transactions 50000 --wallets 15000 --days 30 --output data/sample/dataset.json
fi

if [ "$1" == "train" ] || [ "$1" == "all" ]; then
    echo "Running pipeline (ingestion + feature engineering + graph + ML training)..."
    python scripts/run_pipeline.py --generate --transactions 50000
fi

if [ "$1" == "serve" ] || [ "$1" == "all" ] || [ $# -eq 0 ]; then
    echo "Starting API server..."
    echo "API will be available at http://localhost:8000"
    echo "Swagger docs at http://localhost:8000/docs"
    echo "Press Ctrl+C to stop"
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
fi