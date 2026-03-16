import urllib.request
import urllib.parse
import json

url = "https://overpass-api.de/api/interpreter"
query = """
[out:json][timeout:60];
area["name"="名古屋市"]->.searchArea;
(
  node["name"="名古屋"]["railway"="station"](area.searchArea);
  way["name"="名古屋"]["railway"="station"](area.searchArea);
  rel["name"="名古屋"]["railway"="station"](area.searchArea);
);
out center tags;
"""
req = urllib.request.Request(url, data=query.encode('utf-8'))
response = urllib.request.urlopen(req)
data = json.loads(response.read().decode('utf-8'))
with open('nagoya_tags.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
