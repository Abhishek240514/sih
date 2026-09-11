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
# pip install -r requirements.txt

echo "Creating data directories..."
mkdir -p data/{raw,processed,models,sample,generated}

if [ "$1" == "generate" ] || [ "$1" == "all" ] || [ "$1" == "fullstack" ]; then
    echo ""
    echo "=========================================="
    echo "Generating synthetic forensic dataset..."
    echo "=========================================="
    python scripts/generate_forensic_csvs.py
fi

if [ "$1" == "train" ] || [ "$1" == "all" ]; then
    echo "Running pipeline (ingestion + feature engineering + graph + ML training)..."
    python scripts/run_pipeline.py --generate --transactions 50000
fi

if [ "$1" == "fullstack" ]; then
    echo ""
    echo "=========================================="
    echo "Starting Full Stack (Backend + Frontend)"
    echo "=========================================="
    
    # Start backend in background
    echo "Starting API server on http://localhost:8000..."
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    
    # Wait for backend to be ready
    echo "Waiting for backend..."
    for i in $(seq 1 30); do
        if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
            echo "Backend is ready!"
            break
        fi
        sleep 1
    done
    
    # Start frontend
    echo "Starting frontend on http://localhost:3000..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install
    fi
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    echo ""
    echo "=========================================="
    echo "  Full Stack Running:"
    echo "  Backend API:  http://localhost:8000"
    echo "  Swagger Docs: http://localhost:8000/docs"
    echo "  Frontend:     http://localhost:3000"
    echo "  Press Ctrl+C to stop all"
    echo "=========================================="
    
    # Cleanup on exit
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
    wait
fi

if [ "$1" == "frontend" ]; then
    echo "Starting frontend dev server..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install
    fi
    npm run dev
fi

if [ "$1" == "serve" ] || [ "$1" == "all" ] || [ $# -eq 0 ]; then
    echo "Starting API server..."
    echo "API will be available at http://localhost:8000"
    echo "Swagger docs at http://localhost:8000/docs"
    echo "Press Ctrl+C to stop"
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
fi
