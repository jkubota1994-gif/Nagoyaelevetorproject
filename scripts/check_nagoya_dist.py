import json
import math

def distance(lat1, lon1, lat2, lon2):
    R = 6371000
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2) * math.sin(dlat/2) + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2) * math.sin(dlon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

# Load the found original geojson? No, we need the raw OSM elevator response if possible, but generate_geojson.py didn't save it.
# Let's just run an Overpass query for elevators near Nagoya station directly.
import urllib.request
url = "https://overpass-api.de/api/interpreter"
query = """
[out:json][timeout:60];
(
  node["highway"="elevator"](around:1000, 35.1707285, 136.8818431);
  way["highway"="elevator"](around:1000, 35.1707285, 136.8818431);
  node["elevator"="yes"](around:1000, 35.1707285, 136.8818431);
  way["elevator"="yes"](around:1000, 35.1707285, 136.8818431);
  node["indoor"="elevator"](around:1000, 35.1707285, 136.8818431);
);
out center;
"""
req = urllib.request.Request(url, data=query.encode('utf-8'))
response = urllib.request.urlopen(req)
data = json.loads(response.read().decode('utf-8'))

elevators = data.get('elements', [])
print(f"Found {len(elevators)} elevators within 1000m of Nagoya station.")
for el in elevators:
    lat = el.get('lat') or el.get('center', {}).get('lat')
    lon = el.get('lon') or el.get('center', {}).get('lon')
    if lat and lon:
        dist = distance(35.1707285, 136.8818431, lat, lon)
        print(f"Elevator id {el['id']} is {dist:.1f}m away")
