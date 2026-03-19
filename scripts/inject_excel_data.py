import json
import re
import os

# File paths
EXCEL_JSON_PATH = os.path.join('raw_data', 'elevators_from_excel.json')
GEOJSON_PATH = os.path.join('data', 'all-elevators.geojson')
JS_PATH = os.path.join('data', 'all-elevators.js')

def clean_station_name(name):
    # Remove contents inside full-width or half-width brackets, e.g., "熱田神宮西（神宮西）" -> "熱田神宮西"
    # Match both standard and full-width parenthesis
    cleaned = re.sub(r'[\(\（].*?[\)\）]', '', name)
    return cleaned.strip()

def main():
    try:
        # Load the parsed Excel data
        if not os.path.exists(EXCEL_JSON_PATH):
            print(f"Error: Excel JSON not found at {EXCEL_JSON_PATH}")
            return

        with open(EXCEL_JSON_PATH, 'r', encoding='utf-8') as f:
            excel_data = json.load(f)

        # Load the existing GeoJSON data
        if not os.path.exists(GEOJSON_PATH):
            print(f"Error: GeoJSON not found at {GEOJSON_PATH}. Run generate_geojson.py first.")
            return

        with open(GEOJSON_PATH, 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)

        # Ensure geojson_data has 'features' list
        if 'features' not in geojson_data:
            print("Error: Target file is not a valid GeoJSON FeatureCollection.")
            return

        # Create a mapping for quick station lookup to update has_elevator
        station_features = {}
        for feature in geojson_data['features']:
            if feature.get('properties', {}).get('type') == 'station':
                name = feature['properties'].get('station')
                if name:
                    station_features[name] = feature

        added_count = 0
        updated_stations = set()

        for item in excel_data:
            # Parse latitude and longitude
            lat_lon_str = item.get('Latitude, Longitude')
            if not lat_lon_str:
                print(f"Skipping entry missing coordinates: {item.get('Station')}")
                continue
            
            try:
                lat_str, lon_str = lat_lon_str.split(',')
                lat = float(lat_str.strip())
                lon = float(lon_str.strip())
            except ValueError:
                print(f"Error parsing coordinates for {item.get('Station')}: {lat_lon_str}")
                continue

            station_name = clean_station_name(item.get('Station', ''))
            description = item.get('Description', '')
            status = item.get('Status', '')
            item_id = item.get('ID', '')

            # Create GeoJSON Feature
            new_feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat]  # Note: GeoJSON uses [longitude, latitude]
                },
                "properties": {
                    "id": item_id if item_id and str(item_id) != 'nan' else f"excel_{added_count}",
                    "station": station_name,
                    "location": f"{station_name}駅周辺",
                    "description": description,
                    "status": status if status and str(status) != 'nan' else "稼働中",
                    "source": "manual_excel",
                    "wheelchair": "yes",
                    "highway": "elevator"
                }
            }

            geojson_data['features'].append(new_feature)
            added_count += 1

            # Update has_elevator flag for the station
            if station_name in station_features:
                station_features[station_name]['properties']['has_elevator'] = True
                updated_stations.add(station_name)

        # Write back to GeoJSON file
        with open(GEOJSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(geojson_data, f, ensure_ascii=False, indent=2)

        # Also write to .js file for the web app
        with open(JS_PATH, 'w', encoding='utf-8') as f:
            f.write(f"const elevatorData = {json.dumps(geojson_data, ensure_ascii=False)};")

        print(f"Successfully added {added_count} elevator features to {GEOJSON_PATH} and {JS_PATH}")
        print(f"Updated has_elevator flag for {len(updated_stations)} stations.")

    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
