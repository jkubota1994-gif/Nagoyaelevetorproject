import json

def distance(lat1, lon1, lat2, lon2):
    import math
    R = 6371000
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2) * math.sin(dlat/2) + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2) * math.sin(dlon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

with open('raw_data/raw_elevators.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

targets = [
    {"name": "茶屋ヶ坂", "lat": 35.1844986, "lon": 136.9623993},
    {"name": "砂田橋", "lat": 35.1887683, "lon": 136.9544499},
    {"name": "ナゴヤドーム前矢田", "lat": 35.1909445, "lon": 136.9439779}
]

for t in targets:
    print(f"--- Station: {t['name']} ---")
    found = False
    for el in data.get('elements', []):
        lat = el.get('lat') or el.get('center', {}).get('lat')
        lon = el.get('lon') or el.get('center', {}).get('lon')
        if lat and lon:
            dist = distance(t['lat'], t['lon'], lat, lon)
            if dist <= 500: # 500m
                tags = el.get('tags', {})
                print(f"ID: {el['id']}, Dist: {dist:.1f}m, Tags: {tags}")
                found = True
    if not found:
        print("No elevators found within 500m")
