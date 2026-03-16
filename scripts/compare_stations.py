import json

d1 = open('data/all-elevators.js', encoding='utf-8').read().replace('const elevatorData = ', '').strip().strip(';')
data = json.loads(d1)
stations_in_geo = set([f['properties']['station'] for f in data['features']])

d2 = open('data/timetable.js', encoding='utf-8').read().replace('const timetableData = ', '').strip().strip(';')
timetable_data = json.loads(d2)
stations_in_time = set(timetable_data.keys())

with open('output.txt', 'w', encoding='utf-8') as f:
    f.write("In GeoJSON but NOT in timetable:\n")
    for s in sorted(list(stations_in_geo - stations_in_time)):
        f.write(f"- {s}\n")
    f.write("\nIn timetable but NOT in GeoJSON:\n")
    for s in sorted(list(stations_in_time - stations_in_geo)):
        f.write(f"- {s}\n")
