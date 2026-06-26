import requests
import re
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

queries = [
    'Sân cầu lông Trúc Long Badminton Quận 9',
    'Sân Bóng Đá 197 Arena Quận 9',
    'Sân Cầu Lông Tăng Nhơn Phú (Badminton Passion Hub)',
    'Sân Cầu Lông Trạm Cầu Lông Quận 9',
    'Sân cầu lông Trường Viện Kiểm Sát Quận 9',
    'Sân Cầu Lông An Bình Quận 9',
    'Sân bóng đá mini Long Trường Quận 9',
    'Sân bóng đá Võ Văn Hát Quận 9',
    'Sân bóng đá 185 Phước Long B',
    'Sân bóng đá Tiến Minh 339',
    'Song Phát Pickleball Quận 9',
    'Prime Pickleball Quận 9',
    'Phong Phú Sport Pickleball Quận 9',
    'Kenik Pickleball Quận 9',
    'Sân Tennis Trung Tâm TDTT Quận 9',
    'Sân Tennis Công An Quận 9',
    'CLB Sân Tennis 99 Quận 9'
]

def get_coords(query):
    url = f'https://www.google.com/maps/search/{urllib.parse.quote(query)}'
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'}
    try:
        res = requests.get(url, headers=headers)
        match = re.search(r'/@([-0-9.]+),([-0-9.]+),', res.url)
        if match:
            return query, float(match.group(1)), float(match.group(2))
        
        match2 = re.search(r'APP_INITIALIZATION_STATE=.*?\[\[\[([-0-9.]+),([-0-9.]+)\]', res.text)
        if match2:
            return query, float(match2.group(2)), float(match2.group(1))
             
        return query, 0.0, 0.0
    except Exception as e:
        return query, 0.0, 0.0

if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=5) as executor:
        results = executor.map(get_coords, queries)
        for q, lat, lon in results:
            print(f'{q.encode("ascii", "ignore").decode("ascii")}::: {lat}, {lon}')
