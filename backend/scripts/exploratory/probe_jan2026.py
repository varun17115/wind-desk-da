import urllib.request
import json
from datetime import datetime, timedelta

def fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8'))

print("Fetching FUELHH for 2026-01-01 to 2026-01-03...")
fuelhh_url = "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?publishDateTimeFrom=2026-01-01T00:00:00Z&publishDateTimeTo=2026-01-03T00:00:00Z"
fuel_data = fetch_json(fuelhh_url)
print(f"FUELHH total records: {len(fuel_data)}")
wind_actuals = [d for d in fuel_data if d.get('fuelType') == 'WIND']
print(f"WIND actuals count: {len(wind_actuals)}")
if wind_actuals:
    print("Sample wind actual:", wind_actuals[0])
    print("Start times range:", wind_actuals[0]['startTime'], "to", wind_actuals[-1]['startTime'])

print("\nFetching WINDFOR for publishDateTimeFrom 2025-12-31 to 2026-01-02...")
windfor_url = "https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream?publishDateTimeFrom=2025-12-31T00:00:00Z&publishDateTimeTo=2026-01-02T00:00:00Z"
windfor_data = fetch_json(windfor_url)
print(f"WINDFOR total records: {len(windfor_data)}")
if windfor_data:
    print("Sample WINDFOR record:", windfor_data[0])
    publish_times = set(d['publishTime'] for d in windfor_data)
    print(f"Unique publish times: {len(publish_times)}, sample publish times:", sorted(list(publish_times))[:5])
    start_times = set(d['startTime'] for d in windfor_data)
    print(f"Unique start times: {len(start_times)}, sample start times:", sorted(list(start_times))[:5])
