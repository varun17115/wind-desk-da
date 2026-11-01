import urllib.request
import json
import traceback

urls_to_test = [
    'https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?publishDateTimeFrom=2026-01-01T00:00:00Z&publishDateTimeTo=2026-01-02T00:00:00Z',
    'https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH?publishDateTimeFrom=2026-01-01T00:00:00Z&publishDateTimeTo=2026-01-02T00:00:00Z',
    'https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream?publishDateTimeFrom=2026-01-01T00:00:00Z&publishDateTimeTo=2026-01-02T00:00:00Z',
    'https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR?publishDateTimeFrom=2026-01-01T00:00:00Z&publishDateTimeTo=2026-01-02T00:00:00Z',
    'https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?settlementDateFrom=2026-01-01&settlementDateTo=2026-01-02',
    'https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream?settlementDateFrom=2026-01-01&settlementDateTo=2026-01-02'
]

for url in urls_to_test:
    print(f"Testing: {url}")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            print(f"  Status: {resp.status}, Bytes: {len(data)}")
            try:
                parsed = json.loads(data)
                if isinstance(parsed, list):
                    print(f"  Count: {len(parsed)}")
                    if len(parsed) > 0:
                        print(f"  Sample: {parsed[0]}")
                elif isinstance(parsed, dict):
                    print(f"  Keys: {list(parsed.keys())}")
                    if 'data' in parsed:
                        print(f"  Data items: {len(parsed['data'])}")
                        if len(parsed['data']) > 0:
                            print(f"  Sample: {parsed['data'][0]}")
            except Exception as e:
                print(f"  JSON parse failed: {e}, preview: {data[:200]}")
    except Exception as e:
        print(f"  Request failed: {e}")
