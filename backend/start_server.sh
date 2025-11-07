#!/bin/bash

echo "========================================"
echo "   Spottr Backend Server Startup"
echo "========================================"
echo ""

cd "$(dirname "$0")"

echo "Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed!"
    echo "Please install Python 3.9 or higher."
    exit 1
fi

python3 --version

echo ""
echo "Checking virtual environment..."
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to create virtual environment!"
        exit 1
    fi
    echo "Virtual environment created successfully!"
fi

echo ""
echo "Activating virtual environment..."
source venv/bin/activate

echo ""
echo "Checking dependencies..."
if ! pip show fastapi &> /dev/null; then
    echo "Installing dependencies... This may take a few minutes."
    echo ""
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install dependencies!"
        exit 1
    fi
    echo "Dependencies installed successfully!"
fi

echo ""
echo "Checking model file..."
if [ ! -f "../models/weights/best.pt" ]; then
    echo "WARNING: Model file not found at ../models/weights/best.pt"
    echo "Please ensure the model file exists before continuing."
    echo ""
    read -p "Press enter to continue..."
fi

echo ""
echo "========================================"
echo "   Starting Detection Server"
echo "========================================"
echo ""
echo "Server will start on http://0.0.0.0:8000"
echo "Press Ctrl+C to stop the server"
echo ""
echo "Your IP addresses:"
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'
echo ""
echo "Update my-app/services/detection-config.ts with your IP address"
echo ""
echo "========================================"
echo ""

python main.py
