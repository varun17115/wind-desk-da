import urllib.request
import json
import re

for url in [
    'https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream',
    'https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream',
    'https://data.elexon.co.uk/bmrs/api/v1/openapi.json',
    'https://data.elexon.co.uk/bmrs/api/v1/swagger.json',
    'https://data.elexon.co.uk/bmrs/api/v1/api-docs'
]:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            content = resp.read()
            print(f"{url} -> status {resp.status}, length {len(content)}")
            # look for json or parameter patterns
            matches = re.findall(r'publishDateTimeFrom|settlementDate|publishTime|startTime', content.decode('utf-8', errors='ignore'))
            print(f"  keywords: {set(matches)}")
    except Exception as e:
        print(f"{url} -> {e}")
