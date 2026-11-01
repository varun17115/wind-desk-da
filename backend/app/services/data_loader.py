import os
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
from ..config import DATA_DIR, FUELHH_ENDPOINT, WINDFOR_ENDPOINT

class DataLoader:
    _instance: Optional["DataLoader"] = None

    def __init__(self):
        self.fuelhh_file = DATA_DIR / "fuelhh_wind_jan2026.json"
        self.windfor_file = DATA_DIR / "windfor_jan2026.json"
        
        # Raw records
        self.raw_actuals: List[Dict[str, Any]] = []
        self.raw_forecasts: List[Dict[str, Any]] = []

        # Indexed structures
        # actuals_30min: key = "YYYY-MM-DDTHH:MM:SSZ" -> generation MW
        self.actuals_30min: Dict[str, float] = {}
        # actuals_hourly: key = "YYYY-MM-DDTHH:00:00Z" -> average generation MW over the 2 settlement periods
        self.actuals_hourly: Dict[str, float] = {}

        # forecasts: list of dicts with parsed datetimes for fast filtering
        # Each item: {'publish_dt': datetime, 'start_dt': datetime, 'publish_time': str, 'start_time': str, 'generation': float}
        self.parsed_forecasts: List[Dict[str, Any]] = []
        
        # Available delivery dates in January 2026
        self.available_dates: List[str] = []

        self.load_data()

    @classmethod
    def get_instance(cls) -> "DataLoader":
        if cls._instance is None:
            cls._instance = DataLoader()
        return cls._instance

    def load_data(self):
        """Loads cached JSON files and populates indexed lookup tables."""
        if not self.fuelhh_file.exists() or not self.windfor_file.exists():
            print(f"[DataLoader] Warning: Cached files missing at {DATA_DIR}")
            return

        print(f"[DataLoader] Loading FUELHH actuals from {self.fuelhh_file}...")
        with open(self.fuelhh_file, "r", encoding="utf-8") as f:
            self.raw_actuals = json.load(f)

        print(f"[DataLoader] Loading WINDFOR forecasts from {self.windfor_file}...")
        with open(self.windfor_file, "r", encoding="utf-8") as f:
            self.raw_forecasts = json.load(f)

        # Index actuals
        # FUELHH has 30-min entries. Group by hour to compute both 30-min and hourly averages
        hourly_buckets: Dict[str, List[float]] = {}
        for r in self.raw_actuals:
            st = r.get("startTime")
            gen = float(r.get("generation", 0.0))
            if st:
                self.actuals_30min[st] = gen
                # Normalized hour key (round down minute to 00)
                hour_key = st[:13] + ":00:00Z"
                if hour_key not in hourly_buckets:
                    hourly_buckets[hour_key] = []
                hourly_buckets[hour_key].append(gen)

        for hour_key, gens in hourly_buckets.items():
            self.actuals_hourly[hour_key] = sum(gens) / len(gens)

        # Parse and index forecasts
        self.parsed_forecasts = []
        for r in self.raw_forecasts:
            pub_str = r.get("publishTime")
            start_str = r.get("startTime")
            gen = float(r.get("generation", 0.0))
            if pub_str and start_str:
                try:
                    pub_dt = datetime.fromisoformat(pub_str.replace("Z", "+00:00"))
                    start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
                    self.parsed_forecasts.append({
                        "publish_dt": pub_dt,
                        "start_dt": start_dt,
                        "publish_time": pub_str,
                        "start_time": start_str,
                        "generation": gen
                    })
                except Exception:
                    continue

        # Sort forecasts by publish_dt descending for quick latest-wins resolution
        self.parsed_forecasts.sort(key=lambda x: x["publish_dt"], reverse=True)

        # Identify all distinct January 2026 delivery dates that have full 24-hour actuals
        days_set = set()
        for hour_key in self.actuals_hourly.keys():
            if hour_key.startswith("2026-01"):
                day_str = hour_key[:10]
                days_set.add(day_str)

        self.available_dates = sorted(list(days_set))
        print(f"[DataLoader] Ready. Loaded {len(self.actuals_hourly)} hourly actuals, "
              f"{len(self.parsed_forecasts)} forecasts across {len(self.available_dates)} January dates.")

    def get_available_dates(self) -> List[str]:
        return self.available_dates

    def get_actual_hourly(self, start_time_iso: str) -> Optional[float]:
        return self.actuals_hourly.get(start_time_iso)

    def get_actual_30min(self, start_time_iso: str) -> Optional[float]:
        return self.actuals_30min.get(start_time_iso)
