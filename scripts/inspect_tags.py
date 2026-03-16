import urllib.request
import urllib.parse
import json

def query_overpass(query):
    url = "https://overpass-api.de/api/interpreter"
    data = query.encode('utf-8')
    req = urllib.request.Request(url, data=data)
    try:
        response = urllib.request.urlopen(req)
        return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error querying overpass: {e}")
        return None

print("Querying ALL railway stations in Nagoya...")
query = """
[out:json][timeout:60];
area["name"="名古屋市"]->.searchArea;
(
  node["railway"="station"](area.searchArea);
);
out tags;
"""
data = query_overpass(query)

with open('all_stations_tags.txt', 'w', encoding='utf-8') as f:
    if data and 'elements' in data:
        for el in data['elements']:
            tags = el.get('tags', {})
            name = tags.get('name', 'Unknown')
            op = tags.get('operator', 'None')
            net = tags.get('network', 'None')
            if '名古屋' in op or '名古屋' in net or '交通局' in op:
                f.write(f"Name: {name}, Operator: {op}, Network: {net}\\n")
print("Done.")
