import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Navigation, X, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';
import { findVenueCoordinates, buildGoogleMapsDirectionsUrl } from '../constants/venueLocations';
import { courtService } from '../services/api';

// Fix Leaflet icons
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

const venuePinIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [28, 44],
  iconAnchor: [14, 44],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const DEFAULT_HCM = [10.846895, 106.797142]; // Mặc định trung tâm Tăng Nhơn Phú / Quận 9

function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 16, { duration: 0.8 });
    }
  }, [center, map]);
  return null;
}

export default function ViewLocationModal({
  isOpen,
  onClose,
  title = 'Địa điểm thi đấu',
  location = '',
  coords = null,
}) {
  const [mapCenter, setMapCenter] = useState(DEFAULT_HCM);
  const [hasResolvedCoords, setHasResolvedCoords] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoadingCoords, setIsLoadingCoords] = useState(false);

  useEffect(() => {
    if (!isOpen || !location) return;

    // 1. Nếu có tọa độ truyền vào trực tiếp
    if (coords && coords[0] && coords[1]) {
      const target = [parseFloat(coords[0]), parseFloat(coords[1])];
      queueMicrotask(() => {
        setMapCenter(target);
        setHasResolvedCoords(true);
      });
      return;
    }

    // 2. Tìm trong danh mục sân đã xác thực hoặc trích xuất số tọa độ
    const matchedCoords = findVenueCoordinates(location);
    if (matchedCoords) {
      queueMicrotask(() => {
        setMapCenter(matchedCoords);
        setHasResolvedCoords(true);
      });
      return;
    }

    // 3. Thử tìm trong danh sách sân từ backend nếu chưa khớp
    courtService
      .getVenues()
      .then((venues) => {
        if (Array.isArray(venues)) {
          const norm = location.toLowerCase();
          const found = venues.find(
            (v) =>
              v.latitude &&
              v.longitude &&
              (norm.includes(v.name?.toLowerCase()) || norm.includes(v.address?.toLowerCase()))
          );
          if (found) {
            setMapCenter([parseFloat(found.latitude), parseFloat(found.longitude)]);
            setHasResolvedCoords(true);
            return;
          }
        }
      })
      .catch(() => {});

    // 4. Nếu là địa chỉ lạ, thử geocode
    queueMicrotask(() => setIsLoadingCoords(true));
    const controller = new AbortController();
    // Làm sạch địa chỉ để geocode dễ hơn
    const cleanQuery = location
      .replace(/\([^)]*\)/g, ' ')
      .replace(/Sân\s*(cầu lông|bóng đá|pickleball|tennis)?/gi, '')
      .trim();

    const timeoutId = setTimeout(() => controller.abort(), 2000);
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        cleanQuery || location
      )}&countrycodes=vn&limit=1`,
      { signal: controller.signal }
    )
      .then((res) => (res && res.ok ? res.json() : []))
      .then((data) => {
        if (data && data.length > 0) {
          setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
          setHasResolvedCoords(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeoutId);
        setIsLoadingCoords(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isOpen, location, coords]);

  if (!isOpen) return null;

  // Xử lý sao chép địa chỉ
  const handleCopy = () => {
    if (!location) return;
    navigator.clipboard?.writeText(location);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Tạo link Google Maps dẫn đường chính xác
  const googleMapsDirectionsUrl = buildGoogleMapsDirectionsUrl(
    location,
    hasResolvedCoords ? mapCenter : null
  );

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col my-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#74C365] to-[#589470] p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black leading-tight">Vị Trí Sân Thi Đấu</h3>
              <p className="text-xs opacity-90 truncate max-w-[280px] sm:max-w-md">{title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Location Info Banner */}
        <div className="p-4 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Địa chỉ sân:
            </span>
            <div className="text-sm font-bold text-slate-900 dark:text-white break-words flex items-start gap-1.5">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{location || 'Chưa cập nhật địa chỉ'}</span>
            </div>
          </div>

          {location && (
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition flex items-center gap-1.5 shrink-0 shadow-sm"
              title="Sao chép địa chỉ"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          )}
        </div>

        {/* Khung bản đồ Google Maps Tiles */}
        <div className="h-72 w-full relative z-0 bg-slate-100 dark:bg-slate-800">
          <MapContainer
            center={mapCenter}
            zoom={16}
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
              url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            />
            <MapController center={mapCenter} />

            <Marker position={mapCenter} icon={venuePinIcon}>
              <Tooltip permanent direction="top" offset={[0, -38]} className="font-bold text-xs bg-emerald-600 text-white border-none shadow-lg rounded-lg px-2.5 py-1">
                📍 {title || 'Sân thi đấu'}
              </Tooltip>
            </Marker>
          </MapContainer>

          {isLoadingCoords && (
            <div className="absolute top-3 right-3 z-[1000] px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur text-white text-xs font-medium flex items-center gap-1.5 shadow-lg">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Đang định vị sân...
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            Tọa độ: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{mapCenter[0].toFixed(5)}, {mapCenter[1].toFixed(5)}</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20 transition"
            >
              Đóng
            </button>

            {/* Nút mở chỉ đường Google Maps */}
            <a
              href={googleMapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-[#589470]/25 transition flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Chỉ đường (Google Maps)</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
