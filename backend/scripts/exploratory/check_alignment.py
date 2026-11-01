import urllib.request
import json

# Check WINDFOR start times step
url_wf = "https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream?publishDateTimeFrom=2026-01-02T02:00:00Z&publishDateTimeTo=2026-01-02T03:00:00Z"
req = urllib.request.Request(url_wf, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    wf = json.loads(resp.read().decode('utf-8'))

print("WINDFOR start times:")
for r in wf[:10]:
    print(" ", r['startTime'], "gen:", r['generation'])

# Check FUELHH start times step
url_fh = "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?publishDateTimeFrom=2026-01-02T02:00:00Z&publishDateTimeTo=2026-01-02T03:00:00Z"
req = urllib.request.Request(url_fh, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as resp:
    fh = json.loads(resp.read().decode('utf-8'))

wind_fh = [r for r in fh if r.get('fuelType') == 'WIND']
print("\nFUELHH (WIND) start times:")
for r in wind_fh[:10]:
    print(" ", r['startTime'], "gen:", r['generation'], "settlementPeriod:", r.get('settlementPeriod'))
