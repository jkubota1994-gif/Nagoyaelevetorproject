import json
import re

with open('data/all-elevators.js', 'r', encoding='utf-8') as f:
    content = f.read()
    # Extract the JSON part
    match = re.search(r'const elevatorData = (\{.*\});', content)
    if not match:
        print("Failed to find JSON in data/all-elevators.js")
        exit(1)
    data = json.loads(match.group(1))

targets = ["茶屋ヶ坂", "砂田橋", "ナゴヤドーム前矢田"]
found_pins = {t: [] for t in targets}
station_flags = {t: False for t in targets}

for feature in data['features']:
    props = feature['properties']
    if props.get('type') == 'station':
        name = props.get('station')
        if name in targets:
            station_flags[name] = props.get('has_elevator')
    else:
        name = props.get('station')
        if name in targets:
            found_pins[name].append(props.get('id'))

for t in targets:
    print(f"Station: {t}")
    print(f"  has_elevator flag: {station_flags[t]}")
    print(f"  Elevator Pins: {found_pins[t]}")
