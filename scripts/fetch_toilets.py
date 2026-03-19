import urllib.request
import json
import time

def query_overpass(query, filename):
    url = "https://overpass-api.de/api/interpreter"
    data = query.encode('utf-8')
    
    for attempt in range(5):
        try:
            print(f"Querying {filename} for toilets (attempt {attempt+1})...")
            req = urllib.request.Request(url, data=data)
            response = urllib.request.urlopen(req, timeout=90)
            result = response.read().decode('utf-8')
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(result)
            print(f"Success! Saved to {filename}")
            return True
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(5)
    return False

# Bounding box for Nagoya City
bbox = "35.0,136.75,35.25,137.05"

toilets_query = f"""
[out:json][timeout:120];
(
  node["amenity"="toilets"]["wheelchair"~"yes|designated"]({bbox});
  way["amenity"="toilets"]["wheelchair"~"yes|designated"]({bbox});
  node["toilets:wheelchair"="yes"]({bbox});
  way["toilets:wheelchair"="yes"]({bbox});
  node["wheelchair"="yes"]["amenity"~"townhall|library|community_centre|museum|theatre|shopping_mall|department_store"]({bbox});
  way["wheelchair"="yes"]["amenity"~"townhall|library|community_centre|museum|theatre|shopping_mall|department_store"]({bbox});
);
out center;
"""

if __name__ == "__main__":
    query_overpass(toilets_query, "raw_data/raw_toilets.json")
