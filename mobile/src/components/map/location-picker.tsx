import { Text } from '@/components/ui/text';
import * as Location from 'expo-location';
import { Check, CheckCircle2, LocateFixed, Map as MapIcon, MapPin, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useScrollLock } from '@/components/ui/scroll-lock';
import { useVenuesQuery } from '@/hooks/queries/use-courts';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';
import {
  DEFAULT_CENTER,
  buildKnownVenues,
  reverseAddress,
  searchPlaces,
  type KnownVenue,
  type PlaceSuggestion,
} from '@/lib/geocoding';
import { findVenueCoordinates, type LatLng } from '@/lib/venue-locations';
import { loadLocationMap } from './load-location-map';
import { showAlert } from '@/stores/dialog-store';

interface LocationPickerProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

const MIN_QUERY_LENGTH = 2;

/**
 * A live GPS fix can fail or time out (emulators, indoors, a cold start), so fall back to the last known
 * position, which is accurate enough for choosing a venue. Rethrows the live error when there is no fallback.
 */
async function getCurrentOrLastKnownPosition(): Promise<Location.LocationObject> {
  try {
    return await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  } catch (error) {
    const lastKnown = await Location.getLastKnownPositionAsync();
    if (lastKnown) return lastKnown;
    throw error;
  }
}
const SEARCH_DEBOUNCE_MS = 350;

/**
 * Location field with address suggestions (SportGo venues first, then OpenStreetMap), a GPS button and a
 * full-screen map to pick a point (web: LocationPicker). The form only ever stores the resulting text.
 */
export function LocationPicker({
  value,
  onChange,
  placeholder = "Nhập tên sân, địa chỉ hoặc bấm 'Map' để chọn...",
  error,
  disabled = false,
}: LocationPickerProps) {
  const setScrollLocked = useScrollLock();
  const { data: backendVenues } = useVenuesQuery();
  const venues = useMemo(() => buildKnownVenues(backendVenues), [backendVenues]);

  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [flyTarget, setFlyTarget] = useState<LatLng | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbort = useRef<AbortController | null>(null);
  // Only the latest pin may write its address back; a slower earlier lookup is dropped.
  const pickToken = useRef(0);

  // Never leave the form's scrolling locked after the map goes away mid-touch.
  useEffect(() => {
    if (!isMapOpen) setScrollLocked(false);
  }, [isMapOpen, setScrollLocked]);

  const locationMap = useMemo(() => loadLocationMap(), []);
  const mapUnavailableMessage = !locationMap
    ? 'Bản đồ cần development build (không chạy trong Expo Go). Bạn vẫn có thể nhập địa chỉ hoặc dùng vị trí hiện tại.'
    : !env.mapStyleUrl
      ? 'Chưa cấu hình bản đồ: hãy đặt EXPO_PUBLIC_MAP_STYLE_URL trong file .env rồi chạy lại `npx expo start -c`.'
      : null;

  const markerPos: LatLng = pin ?? findVenueCoordinates(value) ?? DEFAULT_CENTER;

  const cancelSearch = () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchAbort.current?.abort();
    searchAbort.current = null;
  };

  const handleChangeText = (text: string) => {
    onChange(text);
    cancelSearch();

    if (text.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimer.current = setTimeout(async () => {
      const controller = new AbortController();
      searchAbort.current = controller;
      const results = await searchPlaces(text, venues, controller.signal);
      if (controller.signal.aborted) return;
      setSuggestions(results);
      setIsSearching(false);
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleSelectSuggestion = (item: PlaceSuggestion) => {
    const chosen = item.isSystemVenue ? `${item.title} (${item.subtitle})` : item.subtitle || item.title;
    const coords: LatLng = [item.lat, item.lon];
    cancelSearch();
    setIsSearching(false);
    setSuggestions([]);
    setPin(coords);
    setFlyTarget(coords);
    onChange(chosen);
  };

  const handleSelectVenue = (venue: KnownVenue) => {
    const coords: LatLng = [venue.latitude, venue.longitude];
    pickToken.current += 1;
    setPin(coords);
    setFlyTarget(coords);
    onChange(`${venue.name} (${venue.address})`);
  };

  /** Drops the pin: the form is valid straight away, then the pin is turned into a readable address. */
  const handlePickCoordinates = async ([lat, lon]: LatLng) => {
    const token = ++pickToken.current;
    setPin([lat, lon]);
    onChange(`Sân tại vị trí (${lat.toFixed(5)}, ${lon.toFixed(5)})`);

    setIsReverseGeocoding(true);
    try {
      const address = await reverseAddress(lat, lon, venues);
      if (token === pickToken.current && address) onChange(address);
    } finally {
      if (token === pickToken.current) setIsReverseGeocoding(false);
    }
  };

  const handleLocateMe = async () => {
    setIsReverseGeocoding(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Cần quyền vị trí', 'Hãy cấp quyền vị trí để dùng vị trí hiện tại của bạn.');
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        showAlert('Vị trí đang tắt', 'Hãy bật Vị trí (Location) trong cài đặt của thiết bị rồi thử lại.');
        return;
      }
      const position = await getCurrentOrLastKnownPosition();
      const coords: LatLng = [position.coords.latitude, position.coords.longitude];
      cancelSearch();
      setSuggestions([]);
      setIsSearching(false);
      setFlyTarget(coords);
      if (!mapUnavailableMessage) setIsMapOpen(true);
      await handlePickCoordinates(coords);
    } catch (error) {
      // The cause is only appended while developing, so users still get one short, plain message.
      const detail = __DEV__ && error instanceof Error ? ` (${error.message})` : '';
      showAlert('Lỗi', `Không thể lấy vị trí GPS. Vui lòng thử lại.${detail}`);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleClear = () => {
    cancelSearch();
    pickToken.current += 1;
    setSuggestions([]);
    setIsSearching(false);
    setIsReverseGeocoding(false);
    setPin(null);
    onChange('');
  };

  const confirmMapSelection = () => {
    if (!value.trim()) onChange(`Sân tại tọa độ (${markerPos[0].toFixed(5)}, ${markerPos[1].toFixed(5)})`);
    setIsMapOpen(false);
  };

  const MapView = locationMap?.PickerMap;

  return (
    <View>
      <View className="relative justify-center">
        <Input
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          editable={!disabled}
          error={error}
          className="pl-10 pr-28"
        />
        <View pointerEvents="none" className="absolute left-3.5 top-0 h-12 justify-center">
          <MapPin size={16} color="#F43F5E" />
        </View>
        <View className="absolute right-2 top-0 h-12 flex-row items-center gap-1">
          {isSearching ? <ActivityIndicator size="small" color="#94A3B8" /> : null}
          {value ? (
            <Pressable onPress={handleClear} hitSlop={6} accessibilityLabel="Xóa địa chỉ" className="rounded-lg p-1.5">
              <X size={14} color="#94A3B8" />
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleLocateMe}
            disabled={isReverseGeocoding || disabled}
            hitSlop={6}
            accessibilityLabel="Dùng vị trí hiện tại của tôi"
            className="rounded-lg p-1.5"
          >
            {isReverseGeocoding ? <ActivityIndicator size="small" color="#3B82F6" /> : <LocateFixed size={18} color="#3B82F6" />}
          </Pressable>
          <Pressable
            onPress={() => setIsMapOpen((open) => !open)}
            disabled={disabled}
            accessibilityLabel={isMapOpen ? 'Thu gọn bản đồ' : 'Mở bản đồ chọn sân'}
            className={cn(
              'flex-row items-center gap-1 rounded-xl px-2.5 py-1.5',
              isMapOpen ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-white/10',
            )}
          >
            <MapIcon size={13} color={isMapOpen ? '#fff' : '#64748B'} />
            <Text className={cn('text-xs font-bold', isMapOpen ? 'text-white' : 'text-slate-700 dark:text-slate-300')}>
              {isMapOpen ? 'Đóng map' : 'Map'}
            </Text>
          </Pressable>
        </View>
      </View>

      {suggestions.length > 0 ? (
        <View className="mt-1.5 overflow-hidden rounded-2xl border border-border bg-white dark:border-border-dark dark:bg-[#0d1424]">
          <Text className="bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:bg-white/5">
            Gợi ý địa điểm ({suggestions.length})
          </Text>
          {suggestions.map((item) => (
            <Pressable
              key={String(item.id)}
              onPress={() => handleSelectSuggestion(item)}
              className="flex-row items-start gap-2.5 border-t border-border px-3.5 py-2.5 active:bg-emerald-50 dark:border-border-dark dark:active:bg-emerald-500/10"
            >
              <View className="mt-0.5 rounded-lg bg-slate-100 p-1 dark:bg-white/10">
                <MapPin size={14} color="#589470" />
              </View>
              <View className="flex-1">
                <View className="flex-row flex-wrap items-center gap-1.5">
                  <Text className="text-xs font-bold text-slate-800 dark:text-slate-100" numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.isSystemVenue ? (
                    <Text className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      Sân hệ thống
                    </Text>
                  ) : null}
                </View>
                <Text className="text-[11px] text-slate-400" numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {isMapOpen ? (
        // Opens right under the field like the web picker; the form is not scrolled while the map is touched.
        <View className="mt-2.5 overflow-hidden rounded-2xl border border-border bg-slate-100 dark:border-border-dark dark:bg-slate-900">
          <View className="flex-row items-center justify-between gap-2 border-b border-border bg-slate-50 px-3 py-2 dark:border-border-dark dark:bg-white/5">
            <View className="flex-1 flex-row items-center gap-1.5">
              <View className="h-2 w-2 rounded-full bg-emerald-500" />
              <Text className="flex-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Bấm vào bất kỳ đâu trên bản đồ hoặc bấm vào icon sân để chọn
              </Text>
            </View>
            {isReverseGeocoding ? (
              <View className="flex-row items-center gap-1">
                <ActivityIndicator size="small" color="#059669" />
                <Text className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Đang nhận diện…</Text>
              </View>
            ) : null}
          </View>

          <View
            style={{ height: 256 }}
            onTouchStart={() => setScrollLocked(true)}
            onTouchEnd={() => setScrollLocked(false)}
            onTouchCancel={() => setScrollLocked(false)}
          >
            {mapUnavailableMessage || !MapView ? (
              <View className="flex-1 items-center justify-center gap-3 px-8">
                <MapPin size={28} color="#537fff" />
                <Text className="text-center text-sm text-slate-500 dark:text-slate-400">{mapUnavailableMessage}</Text>
              </View>
            ) : (
              <MapView
                markerPos={markerPos}
                flyTarget={flyTarget}
                venues={venues}
                onPick={handlePickCoordinates}
                onSelectVenue={handleSelectVenue}
              />
            )}
          </View>

          <View className="flex-row items-center gap-3 border-t border-border bg-white px-3 py-3 dark:border-border-dark dark:bg-[#111827]">
            <View className="flex-1">
              <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Vị trí bạn đã chọn:</Text>
              <View className="mt-0.5 flex-row items-center gap-1.5">
                <CheckCircle2 size={14} color="#10B981" />
                <Text className="flex-1 text-xs font-bold text-emerald-600 dark:text-emerald-400" numberOfLines={2}>
                  {value || `Tọa độ: ${markerPos[0].toFixed(5)}, ${markerPos[1].toFixed(5)}`}
                </Text>
              </View>
            </View>
            <Button size="sm" onPress={confirmMapSelection}>
              <Check size={14} color="#fff" />
              <Text className="text-sm font-bold text-white">Dùng vị trí này</Text>
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
}
