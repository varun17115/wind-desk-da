import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("DATA_DIR", BASE_DIR / "data"))

# Elexon API Endpoints
ELEXON_BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"
FUELHH_ENDPOINT = f"{ELEXON_BASE_URL}/datasets/FUELHH/stream"
WINDFOR_ENDPOINT = f"{ELEXON_BASE_URL}/datasets/WINDFOR/stream"

# Market Defaults (UK Electricity Market / Elexon BSC)
DEFAULT_GATE_CLOSURE_HOUR = 11  # 11:00 GMT on Day D-1 (standard Day-Ahead gate closure)
TYPICAL_WINTER_PEAK_DEMAND_MW = 38000.0  # Typical UK winter evening peak demand (~38 GW)
DEFAULT_CONFIDENCE_LEVEL = 0.90  # 90th percentile wind shortfall protection

# Server Config
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
CORS_ORIGINS = ["*"]
