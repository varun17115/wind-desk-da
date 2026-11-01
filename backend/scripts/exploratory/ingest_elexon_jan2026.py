import urllib.request
import json
import os
import time
from datetime import datetime, timedelta

DATA_DIR = os.path.join(os.path.dirname(__file__), "backend", "data")
os.makedirs(DATA_DIR, exist_ok=True)

def fetch_elexon_stream(dataset, start_iso, end_iso):
    url = f"https://data.elexon.co.uk/bmrs/api/v1/datasets/{dataset}/stream?publishDateTimeFrom={start_iso}&publishDateTimeTo={end_iso}"
    print(f"Fetching {dataset} from {start_iso} to {end_iso}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"  -> Received {len(data)} records for {dataset}")
            return data
    except Exception as e:
        print(f"  -> Error fetching {dataset}: {e}")
        return []

def collect_month_data():
    # We want data for purchase decisions made in January 2026.
    # Delivery days: 2026-01-01 to 2026-01-31.
    # Purchase decisions are made on D-1, so forecasts published from 2025-12-30 to 2026-01-31.
    # And actuals from 2026-01-01T00:00:00Z to 2026-02-01T23:59:59Z.
    
    # Let's fetch in 5-day chunks to be safe with Elexon rate limits and timeouts
    start_date = datetime(2025, 12, 30, 0, 0, 0)
    end_date = datetime(2026, 2, 2, 0, 0, 0)
    
    # 1. Fetch FUELHH
    fuel_records = []
    curr = start_date
    while curr < end_date:
        next_curr = min(curr + timedelta(days=5), end_date)
        s_iso = curr.strftime("%Y-%m-%dT%H:%M:%SZ")
        e_iso = next_curr.strftime("%Y-%m-%dT%H:%M:%SZ")
        chunk = fetch_elexon_stream("FUELHH", s_iso, e_iso)
        # Filter for fuelType == 'WIND' to keep storage compact and focused
        wind_chunk = [r for r in chunk if r.get('fuelType') == 'WIND']
        fuel_records.extend(wind_chunk)
        time.sleep(0.5)
        curr = next_curr

    print(f"Total WIND FUELHH records collected: {len(fuel_records)}")
    
    # 2. Fetch WINDFOR
    windfor_records = []
    curr = start_date
    while curr < end_date:
        next_curr = min(curr + timedelta(days=5), end_date)
        s_iso = curr.strftime("%Y-%m-%dT%H:%M:%SZ")
        e_iso = next_curr.strftime("%Y-%m-%dT%H:%M:%SZ")
        chunk = fetch_elexon_stream("WINDFOR", s_iso, e_iso)
        windfor_records.extend(chunk)
        time.sleep(0.5)
        curr = next_curr

    print(f"Total WINDFOR records collected: {len(windfor_records)}")

    # Save to JSON
    fuel_file = os.path.join(DATA_DIR, "fuelhh_wind_jan2026.json")
    with open(fuel_file, "w") as f:
        json.dump(fuel_records, f)
    print(f"Saved {fuel_file} ({os.path.getsize(fuel_file) / 1024:.1f} KB)")

    windfor_file = os.path.join(DATA_DIR, "windfor_jan2026.json")
    with open(windfor_file, "w") as f:
        json.dump(windfor_records, f)
    print(f"Saved {windfor_file} ({os.path.getsize(windfor_file) / 1024:.1f} KB)")

if __name__ == "__main__":
    collect_month_data()
