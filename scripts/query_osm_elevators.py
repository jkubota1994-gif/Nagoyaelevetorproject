# query_osm_elevators.py
import urllib.request
import urllib.parse
import json
import time

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

print("Querying Nagoya City Subway stations...")
# Network could be 名古屋市交通局 or 名古屋市営地下鉄
networks_query = """
[out:json][timeout:60];
area["name"="名古屋市"]->.searchArea;
(
  node["railway"="station"]["network"~"名古屋市営地下鉄"](area.searchArea);
  way["railway"="station"]["network"~"名古屋市営地下鉄"](area.searchArea);
  rel["railway"="station"]["network"~"名古屋市営地下鉄"](area.searchArea);
  
  node["railway"="station"]["operator"~"名古屋市交通局"](area.searchArea);
  way["railway"="station"]["operator"~"名古屋市交通局"](area.searchArea);
  rel["railway"="station"]["operator"~"名古屋市交通局"](area.searchArea);
);
out center;
"""
station_data = query_overpass(networks_query)

stations = []
if station_data and 'elements' in station_data:
    for el in station_data['elements']:
        tags = el.get('tags', {})
        name = tags.get('name')
        if not name:
            continue
        lat = el.get('lat') or (el.get('center', {}).get('lat'))
        lon = el.get('lon') or (el.get('center', {}).get('lon'))
        if lat and lon:
             stations.append({'name': name, 'lat': lat, 'lon': lon, 'has_elevator': False})

# Remove duplicates based on station name
unique_stations = {}
for s in stations:
    if s['name'] not in unique_stations:
        unique_stations[s['name']] = s

print(f"Found {len(unique_stations)} subway stations.")

# Now let's query elevators in Nagoya
print("Querying elevators in Nagoya...")
elevators_query = """
[out:json][timeout:60];
area["name"="名古屋市"]->.searchArea;
(
  node["highway"="elevator"](area.searchArea);
  way["highway"="elevator"](area.searchArea);
);
out center;
"""
elevator_data = query_overpass(elevators_query)
elevators = []
if elevator_data and 'elements' in elevator_data:
    for el in elevator_data['elements']:
        lat = el.get('lat') or (el.get('center', {}).get('lat'))
        lon = el.get('lon') or (el.get('center', {}).get('lon'))
        if lat and lon:
            elevators.append((lat, lon))

print(f"Found {len(elevators)} elevators in Nagoya on OSM.")

import math
def distance(lat1, lon1, lat2, lon2):
    R = 6371000
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2) * math.sin(dlat/2) + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2) * math.sin(dlon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

for s_name, s_data in unique_stations.items():
    for elat, elon in elevators:
        if distance(s_data['lat'], s_data['lon'], elat, elon) < 200:
            unique_stations[s_name]['has_elevator'] = True  # type: ignore
            break

stations_with_elevator = [s for s in unique_stations.values() if s['has_elevator']]
stations_without = [s for s in unique_stations.values() if not s['has_elevator']]

with open('osm_missing_stations.txt', 'w', encoding='utf-8') as f:
    f.write(f"Stations WITH possible OSM elevator data: {len(stations_with_elevator)}\\n")
    f.write(f"Stations WITHOUT OSM elevator data (within 200m): {len(stations_without)}\\n\\n")
    f.write("Stations that might be missing elevator data in OSM:\\n")
    for s in sorted([s['name'] for s in stations_without]):
        f.write(s + "\\n")
