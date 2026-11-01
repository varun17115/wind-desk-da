import json

with open('backend/data/fuelhh_wind_jan2026.json') as f:
    fuel = json.load(f)
with open('backend/data/windfor_jan2026.json') as f:
    wind = json.load(f)

print(f"FUELHH records: {len(fuel)}")
print(f"Sample FUELHH: {fuel[0]}")
fuel_starts = [r['startTime'] for r in fuel]
print(f"FUELHH startTime range: {min(fuel_starts)} to {max(fuel_starts)}")

print(f"\nWINDFOR records: {len(wind)}")
print(f"Sample WINDFOR: {wind[0]}")
wind_pubs = [r['publishTime'] for r in wind]
wind_starts = [r['startTime'] for r in wind]
print(f"WINDFOR publishTime range: {min(wind_pubs)} to {max(wind_pubs)}")
print(f"WINDFOR startTime range: {min(wind_starts)} to {max(wind_starts)}")

# Check days covered in January
unique_days = sorted(list(set(s[:10] for s in fuel_starts if s.startswith('2026-01'))))
print(f"\nUnique January 2026 days in FUELHH: {len(unique_days)} days -> {unique_days[0]} to {unique_days[-1]}")
