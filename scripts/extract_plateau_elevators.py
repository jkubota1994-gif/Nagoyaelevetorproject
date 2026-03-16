import os
import urllib.request
import zipfile
import re
import json
import xml.etree.ElementTree as ET
import time

url = "https://assets.cms.plateau.reearth.io/assets/79/e43a02-06b6-40c2-ae97-51eba1b4297b/23100_nagoya-shi_city_2022_citygml_4_op.zip"
zip_path = "plateau_data.zip"
output_json = "data/plateau_elevators.json"

def reporthook(count, block_size, total_size):
    global start_time
    if count == 0:
        start_time = time.time()
        return
    duration = time.time() - start_time
    progress_size = int(count * block_size)
    speed = int(progress_size / (1024 * duration)) if duration > 0 else 0
    percent = min(int(count * block_size * 100 / total_size), 100)
    if count % 10000 == 0:
        print(f"\rDownloading... {percent}%, {progress_size / (1024 * 1024):.1f} MB, {speed} KB/s", end="")

if not os.path.exists(zip_path):
    print("Downloading 2.8GB PLATEAU dataset. This will take a few minutes...")
    urllib.request.urlretrieve(url, zip_path, reporthook)
    print("\nDownload complete.")

elevators = []

def extract_from_xml(content, filename):
    if 'エレベータ' not in content and 'Elevator' not in content:
        return []
    
    results = []
    try:
        # Strip XML declaration and potential namespaces that cause ET issues if not fully resolvable
        # Actually ET can handle generic parsing if we ignore namespaces using regex or iter.
        root = ET.fromstring(content)
        parent_map = {c: p for p in root.iter() for c in p}
        
        for elem in root.iter():
            text = elem.text or ""
            if 'エレベータ' in text or 'Elevator' in text:
                curr = elem
                geom_elem = None
                # Go up the tree to find geometry
                while curr is not None:
                    # Look for gml:posList or gml:pos
                    # We can check tag names ignoring namespace prefix
                    for child in curr.iter():
                        tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag
                        if tag in ['posList', 'pos']:
                            geom_elem = child
                            break
                    if geom_elem is not None:
                        break
                    
                    if curr in parent_map:
                        curr = parent_map[curr]
                    else:
                        break
                
                if geom_elem is not None and geom_elem.text:
                    coords = geom_elem.text.strip().split()
                    if len(coords) >= 2:
                        # Assuming EPSG:6697 -> Lat, Lon, Height
                        lat = float(coords[0])
                        lon = float(coords[1])
                        
                        results.append({
                            'lat': lat,
                            'lon': lon,
                            'description': text.strip(),
                            'source_file': filename
                        })
    except Exception as e:
        print(f"Error parsing {filename}: {e}")
    return results

print("Extracting elevator data from ZIP...")
processed_count = 0
found_count = 0

with zipfile.ZipFile(zip_path) as zf:
    # Target building and transportation GMLs
    target_files = [n for n in zf.namelist() if n.endswith('.gml') and ('udx/bldg/' in n or 'udx/tran/' in n)]
    print(f"Found {len(target_files)} target GML files to scan.")
    
    for filename in target_files:
        with zf.open(filename) as f:
            content = f.read().decode('utf-8', errors='ignore')
            ext_results = extract_from_xml(content, filename)
            for r in ext_results:
                elevators.append(r)
                found_count += 1
        
        processed_count += 1
        if processed_count % 100 == 0:
            print(f"Processed {processed_count}/{len(target_files)} files. Found {found_count} elevator markers so far.")

print(f"Extraction finished. Total elevators found: {len(elevators)}")

os.makedirs('data', exist_ok=True)
with open(output_json, 'w', encoding='utf-8') as f:
    json.dump(elevators, f, ensure_ascii=False, indent=2)

print(f"Saved to {output_json}")

# Optionally remove the large zip file to save disk space
try:
    os.remove(zip_path)
    print("Deleted temporary zip file.")
except:
    pass
