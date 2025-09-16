# This file serves as an entry point for uvicorn
# The actual application is defined in app/main.py

# Import the app directly from the app module
import sys
import os
from pathlib import Path

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Now import the app
from app.main import app

# This allows the file to be run directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9090)