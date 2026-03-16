import urllib.request
import urllib.parse
import json
import math
import os

import time

def query_overpass(query, retries=3, backoff=5):
    url = "https://overpass-api.de/api/interpreter"
    data = query.encode('utf-8')
    
    for attempt in range(retries):
        req = urllib.request.Request(url, data=data)
        try:
            # Add a timeout to urlopen to fail fast if the server hangs
            response = urllib.request.urlopen(req, timeout=90)
            return json.loads(response.read().decode('utf-8'))
        except Exception as e:
            print(f"Error querying overpass (Attempt {attempt + 1}/{retries}): {e}")
            if attempt < retries - 1:
                time.sleep(backoff)
                
    print("Failed to fetch data from Overpass API after all retries.")
    return None

def distance(lat1, lon1, lat2, lon2):
    R = 6371000
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2) * math.sin(dlat/2) + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2) * math.sin(dlon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

print("Loading Nagoya City Subway stations from raw_stations.json...")
with open('raw_stations.json', 'r', encoding='utf-8') as f:
    station_data = json.load(f)

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

unique_stations = {}
for s in stations:
    if s['name'] not in unique_stations:
        unique_stations[s['name']] = s

print(f"Found {len(unique_stations)} subway stations.")

print("Loading elevators in Nagoya from raw_elevators.json...")
with open('raw_elevators.json', 'r', encoding='utf-8') as f:
    elevator_data = json.load(f)

elevators = []
if elevator_data and 'elements' in elevator_data:
    for el in elevator_data['elements']:
        lat = el.get('lat') or (el.get('center', {}).get('lat'))
        lon = el.get('lon') or (el.get('center', {}).get('lon'))
        tags = el.get('tags', {})
        if lat and lon:
            # tagから情報を抽出
            description = tags.get('description', 'OSMデータ（詳細不明）')
            elevators.append({
                'id': el['id'],
                'lat': lat,
                'lon': lon,
                'description': description
            })

print(f"Found {len(elevators)} elevators in Nagoya on OSM.")

features = []
elevator_count = 0

# 各エレベーターがどの駅の近くにあるか判定する（各エレベーターから最も近い駅を探し、200m以内ならその駅のエレベーターとする）
for el in elevators:
    closest_station = None
    min_dist = float('inf')
    
    for s_name, s_data in unique_stations.items():
        dist = distance(el['lat'], el['lon'], s_data['lat'], s_data['lon'])
        if dist < min_dist:
            min_dist = dist
            closest_station = s_name
            
    if closest_station and min_dist <= 400:
        unique_stations[closest_station]['has_elevator'] = True  # type: ignore
        elevator_count += 1  # type: ignore
        
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [el['lon'], el['lat']]
            },
            "properties": {
                "id": f"osm_{el['id']}",
                "station": closest_station,
                "location": f"{closest_station}駅周辺",
                "description": el['description'],
                "status": "稼働中"  # モックステータス
            }
        }
        features.append(feature)

# さらに駅自身のデータもGeoJSONのFeatureとして追加
for s_name, s_data in unique_stations.items():
    feature = {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [s_data['lon'], s_data['lat']]
        },
        "properties": {
            "id": f"station_{s_name}",
            "type": "station",
            "station": s_name,
            "has_elevator": s_data['has_elevator']
        }
    }
    features.append(feature)

geojson_data = {
    "type": "FeatureCollection",
    "features": features
}

os.makedirs('data', exist_ok=True)

with open('data/all-elevators.geojson', 'w', encoding='utf-8') as f:
    json.dump(geojson_data, f, ensure_ascii=False, indent=2)

print(f"Exported {elevator_count} elevators to data/all-elevators.geojson")

stations_without = [s for s in unique_stations.values() if not s['has_elevator']]
stations_with = [s for s in unique_stations.values() if s['has_elevator']]

with open('data/missing_stations.txt', 'w', encoding='utf-8') as f:
    f.write(f"OSM上にエレベーターデータが存在した駅: {len(stations_with)}駅\n")
    f.write(f"OSM上にエレベーターデータが存在しなかった駅（半径400m以内）: {len(stations_without)}駅\n\n")
    f.write("-- エレベーターデータがない駅一覧 --\n")
    for s in sorted([s['name'] for s in stations_without]):
        f.write(s + "\n")

print(f"Exported missing stations list to data/missing_stations.txt")
