import requests
import time

addresses = [
    '75 Hoàng Hữu Nam, Phường Tăng Nhơn Phú, Quận 9',
    '591C Đường Lê Văn Việt, Phường Tăng Nhơn Phú, Quận 9',
    '135/34 Đình Phong Phú, Phường Tăng Nhơn Phú, Quận 9',
    '80c Đường số 197, Phường Tăng Nhơn Phú, Quận 9',
    'Số 45 Bùi Xương Trạch, Phường Long Trường, Quận 9',
    'Đối diện hẻm 225/124 Đường Võ Văn Hát, Phường Long Trường, Quận 9'
]

headers = {'User-Agent': 'EXE101_App (student_project)'}

for addr in addresses:
    parts = addr.split(',')
    clean_parts = []
    for p in parts:
        if 'Quận' in p or 'Thủ Đức' in p or 'Ho Chi Minh' in p:
            break
        clean_parts.append(p.strip())
    
    query = ', '.join(clean_parts)
    print(f'Testing: {query}')
    
    url = 'https://nominatim.openstreetmap.org/search'
    
    # Strategy 1: User's exact suggestion + Ho Chi Minh
    params = {'q': query + ', Ho Chi Minh', 'format': 'json', 'limit': 1}
    res = requests.get(url, params=params, headers=headers).json()
    if res:
        print(f'  FOUND with city: {res[0]["lat"]}, {res[0]["lon"]}')
    else:
        # Strategy 2: User's exact suggestion only
        params = {'q': query, 'format': 'json', 'limit': 1}
        res2 = requests.get(url, params=params, headers=headers).json()
        if res2:
            print(f'  FOUND without city: {res2[0]["lat"]}, {res2[0]["lon"]}')
        else:
            # Strategy 3: Just the street name
            street_only = clean_parts[0]
            # Remove exact numbers from street to get the road (e.g., 80c Đường số 197 -> Đường số 197)
            import re
            street_only_no_num = re.sub(r'^(Số \d+|\d+[a-zA-Z]*|Đối diện hẻm \d+/\d+|\d+/\d+|Hẻm \d+)\s+', '', street_only).strip()
            
            params = {'q': f"{street_only_no_num}, {clean_parts[1] if len(clean_parts)>1 else ''}, Ho Chi Minh", 'format': 'json', 'limit': 1}
            res3 = requests.get(url, params=params, headers=headers).json()
            if res3:
                print(f'  FOUND generic street: {res3[0]["lat"]}, {res3[0]["lon"]}')
            else:
                print(f'  FAILED')
    time.sleep(1.5)
