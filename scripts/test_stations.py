import urllib.request
import urllib.parse
import json

url = "https://overpass-api.de/api/interpreter"
query = """
[out:json][timeout:60];
area["name"="名古屋市"]->.searchArea;
(
  node["railway"="station"]["network"~"名古屋市営地下鉄|名古屋市交通局"](area.searchArea);
  way["railway"="station"]["network"~"名古屋市営地下鉄|名古屋市交通局"](area.searchArea);
  rel["railway"="station"]["network"~"名古屋市営地下鉄|名古屋市交通局"](area.searchArea);
  
  node["railway"="station"]["operator"~"名古屋市交通局|名古屋市営地下鉄"](area.searchArea);
  way["railway"="station"]["operator"~"名古屋市交通局|名古屋市営地下鉄"](area.searchArea);
  rel["railway"="station"]["operator"~"名古屋市交通局|名古屋市営地下鉄"](area.searchArea);
);
out center;
"""
try:
    req = urllib.request.Request(url, data=query.encode('utf-8'))
    response = urllib.request.urlopen(req)
    data = json.loads(response.read().decode('utf-8'))
    unique = set()
    for el in data.get('elements', []):
        name = el.get('tags', {}).get('name')
        if name:
            unique.add(name)
    with open('found_stations.txt', 'w', encoding='utf-8') as f:
        for name in sorted(unique):
            f.write(name + "\n")
except Exception as e:
    print(f"Error: {e}")
