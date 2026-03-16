import zipfile
import re

found = False
with zipfile.ZipFile('objectlist.xlsx') as zf:
    for name in zf.namelist():
        if name.endswith('.xml'):
            with zf.open(name) as f:
                content = f.read().decode('utf-8', errors='ignore')
                if 'エレベータ' in content:
                    print(f'Found "エレベータ" in {name}')
                    matches = re.finditer(r'.{0,50}エレベータ.{0,50}', content)
                    for match in list(matches)[:10]:
                        print('... ' + match.group(0) + ' ...')
                    found = True
if not found:
    print('Not found anywhere.')
