"""
TerraSense — Backend Application Entrypoint
Exports the FastAPI app instance from app.main.
Allows running with:
    uvicorn main:app --reload --port 8000
    uvicorn app.main:app --reload --port 8000
"""

import sys
from pathlib import Path

# Ensure backend directory is on Python path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
