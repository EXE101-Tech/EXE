import { Text } from '@/components/ui/text';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Check, Copy, ExternalLink, MapPin, Navigation } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { PopupModal } from '@/components/ui/popup-modal';
import { useVenuesQuery } from '@/hooks/queries/use-courts';
import { env } from '@/lib/env';
import { DEFAULT_CENTER, buildKnownVenues, geocodeLocation } from '@/lib/geocoding';
import { buildGoogleMapsDirectionsUrl, findVenueCoordinates, type LatLng } from '@/lib/venue-locations';
import { loadLocationMap } from './load-location-map';
import { showAlert } from '@/stores/dialog-store';

interface ViewLocationModalProps {
  onClose: () => void;
  /** Shown under the popup title, usually the room name. */
  title?: string;
  location?: string | null;
  /** Exact coordinates when the room is tied to a registered court; otherwise they are looked up from the text. */
  coords?: LatLng | null;
}

/** Shows where a room is held on a map, with copy-address and Google Maps directions (web: ViewLocationModal). */
export function ViewLocationModal({ onClose, title = 'Địa điểm thi đấu', location, coords = null }: ViewLocationModalProps) {
  const address = location?.trim() ?? '';
  const { data: backendVenues } = useVenuesQuery();
  const venues = useMemo(() => buildKnownVenues(backendVenues), [backendVenues]);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationMap = useMemo(() => loadLocationMap(), []);

  const coordsLat = coords?.[0];
  const coordsLng = coords?.[1];
  // Coordinates, then the verified venue list / SportGo venues, then an OpenStreetMap lookup of the text.
  const { data: resolved, isFetching } = useQuery({
    queryKey: ['location-coords', address, coordsLat, coordsLng],
    queryFn: async ({ signal }): Promise<LatLng | null> => {
      if (coordsLat != null && coordsLng != null) return [coordsLat, coordsLng];
      const known = findVenueCoordinates(address);
      if (known) return known;
      return geocodeLocation(address, venues, signal);
    },
    enabled: address.length > 0,
    staleTime: Infinity,
  });

  const center: LatLng = resolved ?? DEFAULT_CENTER;
  const PinMap = locationMap?.PinMap;
  const mapUnavailableMessage = !locationMap
    ? 'Bản đồ cần development build (không chạy trong Expo Go). Bạn vẫn có thể bấm Chỉ đường để mở Google Maps.'
    : !env.mapStyleUrl
      ? 'Chưa cấu hình bản đồ: hãy đặt EXPO_PUBLIC_MAP_STYLE_URL trong file .env rồi chạy lại `npx expo start -c`.'
      : null;

  const handleCopy = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2500);
  };

  const openDirections = async () => {
    try {
      await Linking.openURL(buildGoogleMapsDirectionsUrl(address, resolved ?? null));
    } catch {
      showAlert('Lỗi', 'Không mở được Google Maps trên thiết bị này.');
    }
  };

  return (
    <PopupModal
      visible
      onClose={onClose}
      title="Vị trí sân thi đấu"
      subtitle={title}
      icon={MapPin}
      iconColor="#059669"
      scroll={false}
      footer={
        <View className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-[11px] text-slate-500 dark:text-slate-400" numberOfLines={2}>
            Tọa độ:{' '}
            <Text className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
              {center[0].toFixed(5)}, {center[1].toFixed(5)}
            </Text>
          </Text>
          <View className="flex-row gap-2">
            <Button variant="outline" size="sm" label="Đóng" onPress={onClose} />
            <Button size="sm" onPress={openDirections}>
              <Navigation size={14} color="#fff" />
              <Text className="text-sm font-bold text-white">Chỉ đường</Text>
              <ExternalLink size={12} color="#fff" />
            </Button>
          </View>
        </View>
      }
    >
      <View className="flex-row items-start justify-between gap-3 border-b border-border bg-slate-50 p-4 dark:border-border-dark dark:bg-white/5">
        <View className="flex-1">
          <Text className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Địa chỉ sân</Text>
          <View className="flex-row items-start gap-1.5">
            <MapPin size={15} color="#F43F5E" />
            <Text className="flex-1 text-sm font-bold text-slate-900 dark:text-white">
              {address || 'Chưa cập nhật địa chỉ'}
            </Text>
          </View>
        </View>
        {address ? (
          <Pressable
            onPress={handleCopy}
            accessibilityLabel="Sao chép địa chỉ"
            className="flex-row items-center gap-1 rounded-xl border border-border bg-white px-3 py-1.5 dark:border-border-dark dark:bg-white/10"
          >
            {copied ? <Check size={13} color="#10B981" /> : <Copy size={13} color="#64748B" />}
            <Text className="text-xs font-semibold text-slate-700 dark:text-slate-200">{copied ? 'Đã chép' : 'Sao chép'}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ height: 288 }} className="bg-slate-100 dark:bg-slate-800">
        {mapUnavailableMessage || !PinMap ? (
          <View className="flex-1 items-center justify-center gap-2 px-8">
            <MapPin size={26} color="#537fff" />
            <Text className="text-center text-xs text-slate-500 dark:text-slate-400">{mapUnavailableMessage}</Text>
          </View>
        ) : (
          <PinMap center={center} label={title} />
        )}
        {isFetching ? (
          <View className="absolute right-3 top-3 flex-row items-center gap-1.5 rounded-xl bg-black/70 px-3 py-1.5">
            <ActivityIndicator size="small" color="#fff" />
            <Text className="text-xs font-medium text-white">Đang định vị sân…</Text>
          </View>
        ) : null}
        {!isFetching && address && !resolved ? (
          <View className="absolute inset-x-3 bottom-3 rounded-xl bg-black/70 px-3 py-2">
            <Text className="text-center text-xs text-white">
              Chưa xác định được vị trí chính xác. Bấm Chỉ đường để tìm theo địa chỉ trên Google Maps.
            </Text>
          </View>
        ) : null}
      </View>
    </PopupModal>
  );
}
