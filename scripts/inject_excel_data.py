import json
import re

# File paths
EXCEL_JSON_PATH = 'elevators_from_excel.json'
GEOJSON_PATH = 'data/all-elevators.geojson'

def clean_station_name(name):
    # Remove contents inside full-width or half-width brackets, e.g., "熱田神宮西（神宮西）" -> "熱田神宮西"
    # Match both standard and full-width parenthesis
    cleaned = re.sub(r'[\(\（].*?[\)\）]', '', name)
    return cleaned.strip()

def main():
    try:
        # Load the parsed Excel data
        with open(EXCEL_JSON_PATH, 'r', encoding='utf-8') as f:
            excel_data = json.load(f)

        # Load the existing GeoJSON data
        with open(GEOJSON_PATH, 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)

        # Ensure geojson_data has 'features' list
        if 'features' not in geojson_data:
            print("Error: Target file is not a valid GeoJSON FeatureCollection.")
            return

        added_count = 0
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
                    "id": item_id,
                    "station": station_name,
                    "description": description,
                    "status": status,
                    "source": "manual_excel",
                    "wheelchair": "yes",
                    "highway": "elevator"
                }
            }

            geojson_data['features'].append(new_feature)
            added_count += 1

        # Write back to GeoJSON file
        with open(GEOJSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(geojson_data, f, ensure_ascii=False, indent=2)

        print(f"Successfully added {added_count} elevator features to {GEOJSON_PATH}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == '__main__':
    main()
