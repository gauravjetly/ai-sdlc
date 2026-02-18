#!/bin/bash
# Install Exec Agent Dependencies

echo "📊 Installing Exec Agent dependencies..."

# Check if python3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    echo "Please install Python 3: brew install python3"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate and install dependencies
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "✅ Exec Agent dependencies installed successfully!"
echo ""
echo "To use the Exec Agent:"
echo "  source venv/bin/activate"
echo "  python exec-agent.py generate <project-id>"
