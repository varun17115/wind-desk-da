import urllib.request
import json
from datetime import datetime

url = "https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream?publishDateTimeFrom=2026-01-02T00:00:00Z&publishDateTimeTo=2026-01-03T00:00:00Z"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))

# Group by publishTime
by_pub = {}
for r in data:
    pub = r['publishTime']
    if pub not in by_pub:
        by_pub[pub] = []
    by_pub[pub].append(r)

print(f"Total records: {len(data)}")
print(f"Total distinct publish times: {len(by_pub)}")
for pub in sorted(by_pub.keys())[:3]:
    records = by_pub[pub]
    start_times = [r['startTime'] for r in records]
    print(f"\nPublishTime: {pub}")
    print(f"  Count: {len(records)}")
    print(f"  Earliest startTime: {min(start_times)}")
    print(f"  Latest startTime:   {max(start_times)}")
    # Sample 3 records
    for s in records[:3]:
        print(f"    startTime={s['startTime']}, gen={s['generation']}")
