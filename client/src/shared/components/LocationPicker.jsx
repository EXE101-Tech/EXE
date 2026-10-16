import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, LocateFixed, X, Loader2, Check, Map as MapIcon, CheckCircle2 } from 'lucide-react';
import { courtService } from '../services/api';
import { VERIFIED_VENUES, findVenueCoordinates } from '../constants/venueLocations';

// Fix icon Leaflet trong Vite
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// Icon ghim vị trí đã chọn
const customPinIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [26, 42],
  iconAnchor: [13, 42],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Danh sách sân ban đầu đã xác thực tọa độ Google Maps
const INITIAL_VENUES = VERIFIED_VENUES.map((v, i) => ({
  id: `verified-${i + 1}`,
  name: v.name,
  address: v.address,
  latitude: v.lat,
  longitude: v.lng,
  sport_key: v.sport,
  keywords: v.keywords,
}));

// Tạo Icon sân thể thao có thể bấm trực tiếp trên bản đồ
function createVenueIcon(sportKey = 'badminton') {
  const emoji = sportKey === 'football' ? '⚽' : sportKey === 'pickleball' ? '🏓' : sportKey === 'tennis' ? '🎾' : '🏸';
  return L.divIcon({
    className: 'custom-venue-marker',
    html: `<div style="
      background: linear-gradient(135deg, #10b981, #059669);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      font-size: 16px;
      cursor: pointer;
      transition: transform 0.2s;
    " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// Vị trí trung tâm khu vực Quận 9 / Tăng Nhơn Phú
const DEFAULT_CENTER = [10.846895, 106.797142];

// Component điều khiển camera của bản đồ
function MapController({ targetCenter }) {
  const map = useMap();
  useEffect(() => {
    if (targetCenter && targetCenter[0] && targetCenter[1]) {
      map.flyTo(targetCenter, map.getZoom() < 15 ? 16 : map.getZoom(), { duration: 0.6 });
    }
  }, [targetCenter, map]);
  return null;
}

// Bắt sự kiện click lên bản đồ để di chuyển ghim
function MapClickHandler({ onPick, isSelectingVenueRef }) {
  useMapEvents({
    click(e) {
      // Nếu vừa click vào một Marker sân thể thao, không để map click ghi đè
      if (isSelectingVenueRef?.current) return;
      onPick(e.latlng);
    },
  });
  return null;
}

// Tính khoảng cách giữa 2 tọa độ (theo km)
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Dịch ngược địa chỉ kết hợp nhiều nguồn (BigDataCloud + Nominatim)
async function fetchReverseAddress(lat, lon, registeredVenues = []) {
  // 1. Kiểm tra xem có trùng hoặc rất gần một sân nào trong hệ thống (dưới 350m) không
  if (registeredVenues && registeredVenues.length > 0) {
    const nearby = registeredVenues.find((v) => {
      if (!v.latitude || !v.longitude) return false;
      return getDistanceKm(lat, lon, v.latitude, v.longitude) <= 0.35;
    });
    if (nearby) {
      return `${nearby.name} (${nearby.address})`;
    }
  }

  // 2. Thử lấy từ BigDataCloud API (Cực nhanh, miễn phí, không chặn VN, trả tiếng Việt chuẩn)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=vi`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (res.ok) {
      const d = await res.json();
      const parts = [];
      if (d.locality) parts.push(d.locality);
      if (d.city && d.city !== d.locality && d.city !== d.principalSubdivision) parts.push(d.city);
      if (d.principalSubdivision) parts.push(d.principalSubdivision);

      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
  } catch {
    // Bỏ qua nếu timeout hoặc lỗi mạng
  }

  // 3. Thử nguồn fallback OpenStreetMap Nominatim
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && !data.error) {
        const addr = data.address || {};
        const parts = [];
        const place = data.name && data.name !== addr.road ? data.name : '';
        if (place) parts.push(place);
        const street = [addr.house_number, addr.road].filter(Boolean).join(' ');
        if (street && street !== place) parts.push(street);
        const sub = addr.suburb || addr.quarter || addr.neighbourhood || addr.village;
        if (sub) parts.push(sub);
        const dist = addr.city_district || addr.district || addr.county || addr.town;
        if (dist) parts.push(dist);
        const city = addr.city || addr.state;
        if (city) parts.push(city);

        if (parts.length > 0) return parts.join(', ');
        if (data.display_name) return data.display_name.split(',').slice(0, 4).join(',').trim();
      }
    }
  } catch {
    // Fallback
  }

  // 4. Nếu không lấy được tên chữ, trả về tọa độ rõ ràng
  return `Vị trí bản đồ (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
}

export default function LocationPicker({
  value = '',
  onChange,
  placeholder = 'Nhập tên sân, địa chỉ hoặc bấm Map để chọn...',
  required = false,
  error = '',
  name = 'location',
  disabled = false,
}) {
  const [isOpenMap, setIsOpenMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [flyCenter, setFlyCenter] = useState(null);
  const [markerPos, setMarkerPos] = useState(DEFAULT_CENTER);
  const [registeredVenues, setRegisteredVenues] = useState(INITIAL_VENUES);

  const searchTimerRef = useRef(null);
  const dropdownRef = useRef(null);
  const isSelectingVenueRef = useRef(false);
  const lastEmittedValueRef = useRef(null);

  // Gửi sự kiện cập nhật giá trị ra form ngoài
  const emitChange = useCallback(
    (newText, coords = null) => {
      lastEmittedValueRef.current = newText;
      setSearchQuery(newText);
      if (typeof onChange === 'function') {
        onChange({
          target: {
            name: name || 'location',
            value: newText,
          },
          ...(coords ? { lat: coords[0], lon: coords[1] } : {}),
        });
      }
    },
    [name, onChange]
  );

  // Đồng bộ giá trị từ ngoài truyền vào (bỏ qua nếu value trùng với giá trị vừa emit ra)
  useEffect(() => {
    if (value !== undefined && value !== null) {
      if (value === lastEmittedValueRef.current) return;
      queueMicrotask(() => {
        setSearchQuery(value);
        const coords = findVenueCoordinates(value);
        if (coords) {
          setMarkerPos(coords);
          setFlyCenter(coords);
        }
      });
    }
  }, [value]);

  // Tải danh sách sân sẵn có trong hệ thống và gộp với danh mục verified
  useEffect(() => {
    courtService
      .getVenues()
      .then((venues) => {
        if (Array.isArray(venues) && venues.length > 0) {
          const merged = [...INITIAL_VENUES];
          venues.forEach((v) => {
            const existing = merged.find((m) => m.name.toLowerCase() === v.name?.toLowerCase());
            if (existing) {
              if (v.latitude && v.longitude) {
                existing.latitude = parseFloat(v.latitude);
                existing.longitude = parseFloat(v.longitude);
              }
              existing.dbId = v.id;
            } else {
              merged.push({
                id: `venue-${v.id}`,
                name: v.name,
                address: v.address,
                latitude: parseFloat(v.latitude) || DEFAULT_CENTER[0],
                longitude: parseFloat(v.longitude) || DEFAULT_CENTER[1],
                sport_key: v.sport_key,
              });
            }
          });
          setRegisteredVenues(merged);
        }
      })
      .catch(() => {});
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Nhập chữ tìm kiếm
  const handleInputChange = (e) => {
    const text = e.target.value;
    setSearchQuery(text);
    emitChange(text);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!text.trim() || text.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const query = text.trim().toLowerCase();
        // 1. Tìm trong các sân đã đăng ký
        const matchedVenues = registeredVenues
          .filter((v) => {
            const nameMatch = v.name && v.name.toLowerCase().includes(query);
            const addrMatch = v.address && v.address.toLowerCase().includes(query);
            const kwMatch = v.keywords && v.keywords.some((k) => query.includes(k) || k.includes(query));
            return nameMatch || addrMatch || kwMatch;
          })
          .slice(0, 5)
          .map((v) => ({
            id: v.id,
            title: v.name,
            subtitle: v.address,
            lat: v.latitude,
            lon: v.longitude,
            isSystemVenue: true,
          }));

        // 2. Chỉ tìm qua Nominatim nếu chưa khớp sân nào trong hệ thống
        let osmResults = [];
        if (matchedVenues.length < 3) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1500);
            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                query
              )}&countrycodes=vn&addressdetails=1&limit=4`,
              { signal: controller.signal }
            ).catch(() => null);
            clearTimeout(timeoutId);
            if (res && res.ok) {
              const data = await res.json().catch(() => []);
              osmResults = (data || []).map((item) => ({
                id: item.place_id,
                title: item.name || item.display_name?.split(',')[0],
                subtitle: item.display_name,
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon),
              }));
            }
          } catch {
            // Bỏ qua nếu lỗi mạng hoặc timeout
          }
        }

        const combined = [...matchedVenues, ...osmResults];
        setSearchResults(combined);
        setShowDropdown(combined.length > 0);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  // Chọn địa điểm từ gợi ý dropdown
  const handleSelectLocation = (loc) => {
    const chosen = loc.isSystemVenue
      ? `${loc.title} (${loc.subtitle})`
      : loc.subtitle || loc.title;

    const coords = [parseFloat(loc.lat), parseFloat(loc.lon)];
    isSelectingVenueRef.current = true;
    setTimeout(() => {
      isSelectingVenueRef.current = false;
    }, 500);

    setMarkerPos(coords);
    setFlyCenter(coords);
    emitChange(chosen, coords);
    setShowDropdown(false);
    setIsOpenMap(true);
  };

  // Click vào một icon sân trên bản đồ
  const handleSelectVenueOnMap = (venue, e) => {
    if (e) {
      if (e.originalEvent) {
        e.originalEvent.stopPropagation();
        e.originalEvent.preventDefault();
      }
      if (L?.DomEvent?.stopPropagation) {
        L.DomEvent.stopPropagation(e);
      }
    }
    isSelectingVenueRef.current = true;
    setTimeout(() => {
      isSelectingVenueRef.current = false;
    }, 500);

    const coords = [parseFloat(venue.latitude), parseFloat(venue.longitude)];
    setMarkerPos(coords);
    setFlyCenter(coords);
    const chosenText = `${venue.name} (${venue.address})`;
    emitChange(chosenText, coords);
  };

  // Click hoặc kéo ghim trên bản đồ (áp dụng cho cả khi bấm vào các địa danh trên ảnh map)
  const handlePickCoordinates = useCallback(
    async (latlng) => {
      const lat = latlng.lat;
      const lon = latlng.lng;
      const coords = [lat, lon];
      setMarkerPos(coords);

      // Gán ngay giá trị tức thì để form hợp lệ
      const immediateText = `Sân tại vị trí (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
      emitChange(immediateText, coords);

      // Chạy dịch tên đường tiếng Việt
      setIsReverseGeocoding(true);
      try {
        const prettyAddress = await fetchReverseAddress(lat, lon, registeredVenues);
        if (prettyAddress) {
          emitChange(prettyAddress, coords);
        }
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [emitChange, registeredVenues]
  );

  // Định vị GPS hiện tại
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt của bạn không hỗ trợ định vị GPS');
      return;
    }

    setIsReverseGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setIsOpenMap(true);
        setFlyCenter([lat, lon]);
        handlePickCoordinates({ lat, lng: lon });
      },
      (err) => {
        console.warn('Lỗi GPS:', err);
        setIsReverseGeocoding(false);
        alert('Không thể lấy vị trí GPS. Vui lòng cho phép quyền truy cập vị trí trên trình duyệt.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Kéo thả hoặc click vào Marker chính
  const markerEventHandlers = useMemo(
    () => ({
      dragend(e) {
        const marker = e.target;
        if (marker != null) {
          const latlng = marker.getLatLng();
          handlePickCoordinates(latlng);
        }
      },
      click() {
        if (markerPos) {
          handlePickCoordinates({ lat: markerPos[0], lng: markerPos[1] });
        }
      },
    }),
    [markerPos, handlePickCoordinates]
  );

  return (
    <div className="w-full relative" ref={dropdownRef}>
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-rose-500 pointer-events-none">
          <MapPin className="w-4 h-4" />
        </div>

        <input
          type="text"
          name={name}
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`w-full pl-10 pr-24 py-3 rounded-2xl bg-slate-50 dark:bg-white/5 border ${
            error
              ? 'border-rose-500 focus:border-rose-500'
              : 'border-slate-200 dark:border-white/10 focus:border-[#589470] dark:focus:border-[#DBE64C]'
          } focus:outline-none text-sm font-medium text-slate-900 dark:text-white transition-all shadow-sm`}
        />

        {/* Nút thao tác bên phải ô Input */}
        <div className="absolute right-2 flex items-center gap-1">
          {isSearching && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 mr-0.5" />
          )}

          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                emitChange('');
                setMarkerPos(DEFAULT_CENTER);
              }}
              title="Xóa địa chỉ"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/10 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Nút GPS định vị hiện tại */}
          <button
            type="button"
            onClick={handleLocateMe}
            title="Dùng vị trí hiện tại của tôi"
            disabled={isReverseGeocoding}
            className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition active:scale-95"
          >
            {isReverseGeocoding ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            ) : (
              <LocateFixed className="w-4 h-4" />
            )}
          </button>

          {/* Nút Bật/Tắt Bản đồ */}
          <button
            type="button"
            onClick={() => setIsOpenMap(!isOpenMap)}
            title={isOpenMap ? 'Thu gọn bản đồ' : 'Mở bản đồ chọn sân'}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm active:scale-95 ${
              isOpenMap
                ? 'bg-[#589470] text-white shadow-[#589470]/30'
                : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isOpenMap ? 'Đóng map' : 'Map'}</span>
          </button>
        </div>
      </div>

      {/* Dropdown gợi ý tìm kiếm địa chỉ */}
      {showDropdown && searchResults.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl z-[2000] overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-white/5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Gợi ý địa điểm ({searchResults.length})
          </div>
          {searchResults.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectLocation(item)}
              className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/70 dark:hover:bg-emerald-500/10 transition flex items-start gap-2.5 group"
            >
              <div className="mt-0.5 p-1 rounded-lg bg-slate-100 dark:bg-white/10 group-hover:bg-[#589470]/20 text-[#589470] transition shrink-0">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
                  <span>{item.title}</span>
                  {item.isSystemVenue && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      Sân hệ thống
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-400 truncate">
                  {item.subtitle}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Khung Bản đồ Google Maps Tiles qua Leaflet */}
      {isOpenMap && (
        <div className="mt-2.5 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-lg bg-slate-100 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200">
          <div className="px-3 py-2 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Bấm vào bất kỳ đâu trên bản đồ hoặc bấm vào icon sân để chọn
            </span>
            {isReverseGeocoding && (
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Đang nhận diện...
              </span>
            )}
          </div>

          <div className="h-64 w-full relative z-0">
            <MapContainer
              center={markerPos || DEFAULT_CENTER}
              zoom={15}
              scrollWheelZoom={true}
              className="h-full w-full"
            >
              {/* Lớp bản đồ Google Maps sắc nét, tiếng Việt */}
              <TileLayer
                attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              />

              <MapController targetCenter={flyCenter} />
              <MapClickHandler onPick={handlePickCoordinates} isSelectingVenueRef={isSelectingVenueRef} />

              {/* Các icon SÂN THỂ THAO ĐÃ ĐĂNG KÝ TRONG HỆ THỐNG - BẤM ĐƯỢC TRỰC TIẾP */}
              {registeredVenues.map((v) => {
                if (!v.latitude || !v.longitude) return null;
                return (
                  <Marker
                    key={`venue-pin-${v.id}`}
                    position={[v.latitude, v.longitude]}
                    icon={createVenueIcon(v.sport_key)}
                    eventHandlers={{
                      click: (e) => {
                        if (e?.originalEvent) {
                          e.originalEvent.stopPropagation();
                        }
                        if (L?.DomEvent?.stopPropagation) {
                          L.DomEvent.stopPropagation(e);
                        }
                        handleSelectVenueOnMap(v, e);
                      },
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -16]} className="font-bold text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-md rounded-lg px-2 py-1 border border-slate-200 dark:border-white/10">
                      {v.name}
                    </Tooltip>
                  </Marker>
                );
              })}

              {/* Ghim vị trí bạn đang chọn (màu xanh dương, kéo thả được và bấm được) */}
              {markerPos && (
                <Marker
                  position={markerPos}
                  icon={customPinIcon}
                  draggable={true}
                  eventHandlers={markerEventHandlers}
                >
                  <Tooltip permanent direction="top" offset={[0, -36]} className="font-bold text-xs bg-emerald-600 text-white shadow-lg rounded-lg px-2 py-0.5 border-none">
                    Vị trí bạn chọn
                  </Tooltip>
                </Marker>
              )}
            </MapContainer>
          </div>

          {/* Thanh xác nhận vị trí đã chọn */}
          <div className="p-3 bg-white dark:bg-slate-900/90 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Vị trí bạn đã chọn:
              </div>
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                <span className="truncate">
                  {searchQuery || `Tọa độ: ${markerPos[0].toFixed(5)}, ${markerPos[1].toFixed(5)}`}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!searchQuery) {
                  const fallback = `Sân tại tọa độ (${markerPos[0].toFixed(5)}, ${markerPos[1].toFixed(5)})`;
                  emitChange(fallback, markerPos);
                }
                setIsOpenMap(false);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-[#589470]/20 active:scale-95 transition flex items-center justify-center gap-1.5 shrink-0"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Dùng vị trí này</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
