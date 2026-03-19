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

print("Loading Nagoya City Subway stations from raw_data/raw_stations.json...")
with open('raw_data/raw_stations.json', 'r', encoding='utf-8') as f:
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

print("Loading elevators in Nagoya from raw_data/raw_elevators.json...")
with open('raw_data/raw_elevators.json', 'r', encoding='utf-8') as f:
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

print("Loading toilets in Nagoya from raw_data/raw_toilets.json...")
toilets = []
try:
    with open('raw_data/raw_toilets.json', 'r', encoding='utf-8') as f:
        toilet_data = json.load(f)
    if toilet_data and 'elements' in toilet_data:
        for el in toilet_data['elements']:
            lat = el.get('lat') or (el.get('center', {}).get('lat'))
            lon = el.get('lon') or (el.get('center', {}).get('lon'))
            tags = el.get('tags', {})
            if lat and lon:
                toilets.append({
                    'id': el['id'],
                    'lat': lat,
                    'lon': lon,
                    'name': tags.get('name', '多目的トイレ'),
                    'description': tags.get('description', '車椅子対応トイレ')
                })
    print(f"Found {len(toilets)} accessible toilets on OSM.")
except Exception as e:
    print(f"Error loading toilets: {e}")

features = []
elevator_count = 0

# 各エレベーターがどの駅の近くにあるか判定する
for el in elevators:
    closest_station = None
    min_dist = float('inf')
    
    for s_name, s_data in unique_stations.items():
        dist = distance(el['lat'], el['lon'], s_data['lat'], s_data['lon'])
        if dist < min_dist:
            min_dist = dist
            closest_station = s_name
            
    if closest_station and min_dist <= 400:
        unique_stations[closest_station]['has_elevator'] = True
        elevator_count += 1
        
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
                "status": "稼働中"
            }
        }
        features.append(feature)

# トイレデータも追加
toilet_count = 0
for t in toilets:
    closest_station = None
    min_dist = float('inf')
    for s_name, s_data in unique_stations.items():
        dist = distance(t['lat'], t['lon'], s_data['lat'], s_data['lon'])
        if dist < min_dist:
            min_dist = dist
            closest_station = s_name
    
    # 駅の近く（500m以内）のトイレのみ採用、または独立したトイレとして表示
    location_desc = f"{closest_station}駅周辺" if (closest_station and min_dist <= 500) else "市内施設"
    
    feature = {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [t['lon'], t['lat']]
        },
        "properties": {
            "id": f"toilet_{t['id']}",
            "type": "toilet",
            "station": closest_station if (closest_station and min_dist <= 500) else "不明",
            "location": location_desc,
            "description": t['description'],
            "name": t['name'],
            "status": "利用可能"
        }
    }
    features.append(feature)
    toilet_count += 1

print(f"Added {toilet_count} toilet features.")

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

# all-elevators.js も生成する (main.jsで読み込むため)
with open('data/all-elevators.js', 'w', encoding='utf-8') as f:
    f.write(f"const elevatorData = {json.dumps(geojson_data, ensure_ascii=False)};")

print(f"Exported data to data/all-elevators.geojson and data/all-elevators.js")
