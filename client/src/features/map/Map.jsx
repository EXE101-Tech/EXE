import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Search, MapPin, Navigation, Map as MapIcon, X, LocateFixed, Loader2 } from 'lucide-react';
import { useChat } from '../../shared/context/ChatContext';

// Sửa lỗi icon leaflet mặc định
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

const HCM_CENTER = [10.762622, 106.660172];

// Component dùng để di chuyển map tới vị trí xác định
function MapController({ center, zoom = 14 }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

// Bắt sự kiện Click lên bản đồ
function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export default function MapPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState(HCM_CENTER);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { isChatOpen } = useChat();

  // Focus ô tìm kiếm khi load
  const searchInputRef = useRef(null);

  // TÌM KIẾM THEO TỪ KHÓA (Geocoding)
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=5`
      );
      const data = await response.json();
      
      setSearchResults(data);
      if (data.length > 0) {
        // Tự động di chuyển đến kết quả đầu tiên
        const firstResult = data[0];
        handleSelectLocation(firstResult);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // KHI BẤM VÀO BẢN ĐỒ (Reverse Geocoding)
  const handleMapClick = async (latlng) => {
    setIsLoading(true);
    setSearchResults([]); // Xóa kết quả tìm kiếm hiện tại (nếu có) để nhường chỗ cho sidebar chi tiết
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && !data.error) {
        const locationObj = {
          place_id: data.place_id,
          lat: data.lat,
          lon: data.lon,
          display_name: data.display_name,
          name: data.name || data.address?.road || data.address?.suburb || 'Khu vực chưa đặt tên',
          address: data.address
        };
        setSelectedLocation(locationObj);
        setMapCenter([parseFloat(data.lat), parseFloat(data.lon)]);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // KHI CHỌN 1 ĐỊA ĐIỂM TỪ DANH SÁCH
  const handleSelectLocation = (loc) => {
    const lat = parseFloat(loc.lat);
    const lon = parseFloat(loc.lon);
    
    const locationObj = {
      place_id: loc.place_id,
      lat,
      lon,
      display_name: loc.display_name,
      name: loc.name || loc.address?.road || loc.display_name.split(',')[0],
      address: loc.address
    };

    setSelectedLocation(locationObj);
    setMapCenter([lat, lon]);
    setSearchResults([]); // Ẩn danh sách kết quả sau khi chọn
  };

  // LẤY VỊ TRÍ HIỆN TẠI
  const handleLocateMe = () => {
    setIsLoading(true);

    // Hàm dự phòng: Lấy vị trí qua IP nếu máy tính không có GPS hoặc người dùng từ chối
    const fallbackToIP = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.latitude && data.longitude) {
          const lat = data.latitude;
          const lon = data.longitude;
          setUserLocation([lat, lon]);
          setMapCenter([lat, lon]);
          await handleMapClick({ lat, lng: lon });
        } else {
          alert("Không thể định vị được vị trí của bạn.");
        }
      } catch (err) {
        console.error("IP fallback error:", err);
        alert("Không thể định vị được vị trí của bạn.");
      } finally {
        setIsLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setUserLocation([lat, lon]);
          setMapCenter([lat, lon]);
          
          // Lấy luôn tên đường của vị trí hiện tại
          await handleMapClick({ lat, lng: lon });
          setIsLoading(false);
        },
        (error) => {
          console.warn("Lỗi GPS (có thể do chưa cấp quyền hoặc máy không có GPS). Chuyển sang định vị IP...", error);
          fallbackToIP();
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      fallbackToIP();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden relative">
      
      {/* SIDEBAR BÊN TRÁI (Giống Google Maps) */}
      <div 
        className={`w-full md:w-[400px] h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col z-[1000] absolute top-0 left-0 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        
        {/* Header & Search Bar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="w-10 h-10 rounded-xl bg-[#CDFF00] flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-transform"
              title="Đóng sidebar"
            >
              <MapIcon className="w-5 h-5 text-gray-900" />
            </button>
            <div>
              <h1 className="font-black text-gray-900 dark:text-white text-lg">Khám phá</h1>
              <p className="text-xs text-gray-500 font-medium">Bản đồ thể thao</p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="relative group">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm địa điểm..."
              className="w-full pl-11 pr-4 py-3 bg-gray-100 dark:bg-gray-800 border-transparent focus:border-[#CDFF00] focus:bg-white dark:focus:bg-gray-950 rounded-2xl outline-none text-sm text-gray-900 dark:text-white shadow-sm transition-all"
            />
            <button type="submit" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#CDFF00]">
              <Search className="w-4 h-4" />
            </button>
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>

        {/* Khu vực hiển thị kết quả (Content Area) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          
          {/* Đang tải */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-10 opacity-60">
              <Loader2 className="w-6 h-6 animate-spin text-[#CDFF00] mb-2" />
              <p className="text-sm text-gray-500">Đang tìm kiếm...</p>
            </div>
          )}

          {/* Danh sách kết quả tìm kiếm */}
          {!isLoading && searchResults.length > 0 && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {searchResults.map((result) => (
                <button
                  key={result.place_id}
                  onClick={() => handleSelectLocation(result)}
                  className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex gap-3 items-start"
                >
                  <MapPin className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">
                      {result.name || result.display_name.split(',')[0]}
                    </h4>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {result.display_name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Chi tiết địa điểm đang chọn */}
          {!isLoading && searchResults.length === 0 && selectedLocation && (
            <div>
              <div className="h-40 w-full bg-gray-200 dark:bg-gray-800 relative">
                {/* Nơi chứa ảnh tĩnh của bản đồ OSM làm hình minh họa nếu thích, hoặc banner màu gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/20 backdrop-blur-sm"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <MapPin className="w-12 h-12 text-blue-600 dark:text-blue-400 opacity-20" />
                </div>
              </div>
              
              <div className="p-5 -mt-6 relative bg-white dark:bg-gray-900 rounded-t-3xl">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                  {selectedLocation.name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  {selectedLocation.display_name}
                </p>

                <div className="flex gap-2">
                  <button className="flex-1 bg-[#CDFF00] hover:bg-[#b8e600] text-gray-900 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                    <Navigation className="w-4 h-4" />
                    Đường đi
                  </button>
                  <button className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                    <MapPin className="w-4 h-4" />
                    Lưu điểm
                  </button>
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Tọa độ:</span>
                    <span className="font-mono text-gray-900 dark:text-gray-300">
                      {parseFloat(selectedLocation.lat).toFixed(5)}, {parseFloat(selectedLocation.lon).toFixed(5)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hướng dẫn trống ban đầu */}
          {!isLoading && searchResults.length === 0 && !selectedLocation && (
            <div className="p-8 text-center text-gray-500">
              <MapIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">Tìm kiếm địa điểm hoặc nhấp vào bất kỳ đâu trên bản đồ để xem chi tiết.</p>
            </div>
          )}
        </div>
      </div>

      {/* KHU VỰC BẢN ĐỒ */}
      <div className="flex-1 relative z-0 h-full w-full">
        {/* Nút mở Sidebar khi bị ẩn */}
        {!isSidebarOpen && (
          <div className="absolute left-4 top-4 z-[1000]">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              title="Mở thanh tìm kiếm"
              className="w-12 h-12 bg-[#CDFF00] rounded-2xl shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
            >
              <MapIcon className="w-6 h-6 text-gray-900" />
            </button>
          </div>
        )}

        <div 
          className="absolute right-6 z-[1000] transition-all duration-300 ease-in-out"
          style={{ bottom: '80px' }}
        >
          <button 
            onClick={handleLocateMe}
            title="Vị trí của bạn"
            className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-500 transition-all hover:scale-110 active:scale-95"
          >
            <LocateFixed className="w-5 h-5" />
          </button>
        </div>

        <MapContainer 
          center={mapCenter} 
          zoom={14} 
          scrollWheelZoom={true} 
          className="h-full w-full"
          zoomControl={false} // Tắt zoom control mặc định để tự tùy chỉnh nếu muốn
        >
          {/* TileLayer của Google Maps (Gốc) */}
          <TileLayer
            attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          />
          
          <MapController center={mapCenter} zoom={selectedLocation ? 16 : 14} />
          <ClickHandler onMapClick={handleMapClick} />

          {/* Marker cho điểm đang được chọn (khi tìm kiếm hoặc bấm trên map) */}
          {selectedLocation && (
            <Marker position={[selectedLocation.lat, selectedLocation.lon]}>
              <Popup>
                <div className="font-bold">{selectedLocation.name}</div>
              </Popup>
            </Marker>
          )}

          {/* Marker cho vị trí người dùng */}
          {userLocation && (
            <Marker position={userLocation}>
              <Popup>
                <div className="font-bold text-blue-600">Vị trí hiện tại của bạn</div>
              </Popup>
            </Marker>
          )}

          {/* Marker cho các kết quả tìm kiếm (khi chưa chọn cái nào cụ thể) */}
          {searchResults.length > 0 && searchResults.map(res => (
            <Marker 
              key={res.place_id} 
              position={[parseFloat(res.lat), parseFloat(res.lon)]}
              eventHandlers={{
                click: () => handleSelectLocation(res),
              }}
            >
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
