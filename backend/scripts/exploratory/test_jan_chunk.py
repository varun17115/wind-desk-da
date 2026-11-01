import urllib.request
import json
import time

def fetch_chunk(start_str, end_str, dataset):
    url = f"https://data.elexon.co.uk/bmrs/api/v1/datasets/{dataset}/stream?publishDateTimeFrom={start_str}&publishDateTimeTo={end_str}"
    t0 = time.time()
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        t1 = time.time()
        print(f"[{dataset}] {start_str} to {end_str}: {len(data)} items in {t1-t0:.2f}s")
        return data

# Test a 5-day chunk
fuel_sample = fetch_chunk("2026-01-01T00:00:00Z", "2026-01-06T00:00:00Z", "FUELHH")
wind_sample = fetch_chunk("2026-01-01T00:00:00Z", "2026-01-06T00:00:00Z", "WINDFOR")

print(f"Sample FUELHH record: {fuel_sample[0] if fuel_sample else None}")
print(f"Sample WINDFOR record: {wind_sample[0] if wind_sample else None}")
