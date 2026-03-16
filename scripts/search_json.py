import json

with open('data/all-elevators.geojson', 'r', encoding='utf-8') as f:
    data = json.load(f)

nagoya_features = []
for feature in data['features']:
    props = feature.get('properties', {})
    if props.get('station') == '名古屋':
        nagoya_features.append(feature)

print(f"Found {len(nagoya_features)} features for '名古屋'")
print(json.dumps(nagoya_features, indent=2, ensure_ascii=False))
