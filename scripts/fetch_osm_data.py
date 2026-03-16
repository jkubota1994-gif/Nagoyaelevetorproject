import urllib.request
import urllib.parse
import json
import time

def query_overpass(query, filename):
    url = "https://overpass-api.de/api/interpreter"
    data = query.encode('utf-8')
    
    for attempt in range(5):
        try:
            print(f"Querying {filename} (attempt {attempt+1})...")
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

# Bounding box for Nagoya City roughly
bbox = "35.0,136.75,35.25,137.05"

stations_query = f"""
[out:json][timeout:90];
(
  node["railway"="station"]["operator"~"名古屋市交通局|名古屋市営地下鉄"]({bbox});
  way["railway"="station"]["operator"~"名古屋市交通局|名古屋市営地下鉄"]({bbox});
  rel["railway"="station"]["operator"~"名古屋市交通局|名古屋市営地下鉄"]({bbox});
  node["railway"="station"]["network"~"名古屋市交通局|名古屋市営地下鉄"]({bbox});
  way["railway"="station"]["network"~"名古屋市交通局|名古屋市営地下鉄"]({bbox});
  rel["railway"="station"]["network"~"名古屋市交通局|名古屋市営地下鉄"]({bbox});
  node["station"="subway"]({bbox});
  way["station"="subway"]({bbox});
);
out center;
"""

elevators_query = f"""
[out:json][timeout:90];
(
  node["highway"="elevator"]({bbox});
  way["highway"="elevator"]({bbox});
  node["elevator"="yes"]({bbox});
  way["elevator"="yes"]({bbox});
  node["indoor"="elevator"]({bbox});
);
out center;
"""

if __name__ == "__main__":
    query_overpass(stations_query, "raw_stations.json")
    query_overpass(elevators_query, "raw_elevators.json")
