import { Text } from '@/components/ui/text';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { ArrowLeft, LocateFixed, MapPin, Navigation, Search, Star, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, TextInput, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { resolveMediaUrl } from '@/api/resolve-media-url';
import { useNearbyVenuesQuery } from '@/hooks/queries/use-courts';
import { SPORTS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { VenueResponse } from '@/schemas/courts';

/** MapLibre needs a base style even when every layer is composed via JSX children below. */
const BASE_STYLE: StyleSpecification = { version: 8, sources: {}, layers: [] };
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const HCM_CENTER: [number, number] = [106.660172, 10.762622];
const NEARBY_RADIUS_KM = 50;

export default function MapScreen() {
  const cameraRef = useRef<CameraRef>(null);
  const [origin, setOrigin] = useState({ latitude: HCM_CENTER[1], longitude: HCM_CENTER[0] });
  const [query, setQuery] = useState('');
  const [selectedVenue, setSelectedVenue] = useState<VenueResponse | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const { data: venues, isLoading } = useNearbyVenuesQuery(origin.latitude, origin.longitude, NEARBY_RADIUS_KM);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      try {
        const position = await Location.getCurrentPositionAsync({});
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setOrigin(next);
        cameraRef.current?.flyTo({ center: [next.longitude, next.latitude], zoom: 14, duration: 800 });
      } catch {
        // Keep the HCM center fallback.
      }
    })();
  }, []);

  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền vị trí', 'Hãy cấp quyền vị trí để định vị bạn trên bản đồ.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setOrigin(next);
      cameraRef.current?.flyTo({ center: [next.longitude, next.latitude], zoom: 14, duration: 800 });
    } catch {
      Alert.alert('Lỗi', 'Không thể định vị được vị trí của bạn.');
    } finally {
      setIsLocating(false);
    }
  };

  const trimmedQuery = query.trim().toLowerCase();
  const mappableVenues = (venues ?? []).filter((v) => v.latitude != null && v.longitude != null);
  const filteredVenues = trimmedQuery
    ? mappableVenues.filter(
        (v) => v.name.toLowerCase().includes(trimmedQuery) || v.address.toLowerCase().includes(trimmedQuery),
      )
    : mappableVenues;

  const handleSelectVenue = (venue: VenueResponse) => {
    setSelectedVenue(venue);
    if (venue.latitude != null && venue.longitude != null) {
      cameraRef.current?.flyTo({ center: [venue.longitude, venue.latitude], zoom: 16, duration: 600 });
    }
  };

  const sportMeta = selectedVenue ? SPORTS.find((s) => s.key === selectedVenue.sport_key) : undefined;

  return (
    <View className="flex-1 bg-bg dark:bg-bg-dark">
      <MapLibreMap style={{ flex: 1 }} mapStyle={BASE_STYLE} onPress={() => setSelectedVenue(null)}>
        <Camera ref={cameraRef} initialViewState={{ center: HCM_CENTER, zoom: 12 }} />

        <RasterSource
          id="osm"
          tiles={[OSM_TILE_URL]}
          tileSize={256}
          minzoom={0}
          maxzoom={19}
          attribution="© OpenStreetMap contributors"
        >
          <Layer id="osm-layer" type="raster" />
        </RasterSource>

        <UserLocation animated accuracy />

        {filteredVenues.map((venue) => {
          const isSelected = selectedVenue?.id === venue.id;
          return (
            <Marker
              key={venue.id}
              id={`venue-${venue.id}`}
              lngLat={[venue.longitude as number, venue.latitude as number]}
              anchor="bottom"
              onPress={() => handleSelectVenue(venue)}
            >
              <View
                className={cn(
                  'h-9 w-9 items-center justify-center rounded-full border-2 border-white shadow-md',
                  isSelected ? 'bg-brand dark:bg-brand-dark' : 'bg-rose-500',
                )}
              >
                <MapPin size={16} color="#fff" />
              </View>
            </Marker>
          );
        })}
      </MapLibreMap>

      <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0" pointerEvents="box-none">
        <View className="flex-row items-center gap-2 px-4 pt-2">
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full bg-white shadow-md dark:bg-[#0F1E36]"
          >
            <ArrowLeft size={18} color="#0F172A" />
          </Pressable>
          <View className="h-11 flex-1 flex-row items-center gap-2 rounded-full bg-white px-3 shadow-md dark:bg-[#0F1E36]">
            <Search size={14} color="#94A3B8" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm sân theo tên hoặc địa chỉ..."
              placeholderTextColor="#94A3B8"
              className="h-11 flex-1 text-sm text-slate-900 dark:text-white"
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={6}>
                <X size={14} color="#94A3B8" />
              </Pressable>
            ) : null}
          </View>
        </View>
        {isLoading ? (
          <View className="mx-4 mt-2 flex-row items-center gap-2 self-start rounded-full bg-white/95 px-3 py-1.5 shadow dark:bg-[#0F1E36]/95">
            <ActivityIndicator size="small" color="#0EA5E9" />
            <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đang tìm sân gần bạn…</Text>
          </View>
        ) : (
          <View className="mx-4 mt-2 self-start rounded-full bg-white/95 px-3 py-1.5 shadow dark:bg-[#0F1E36]/95">
            <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {filteredVenues.length} sân trong bán kính {NEARBY_RADIUS_KM}km
            </Text>
          </View>
        )}
      </SafeAreaView>

      <Pressable
        onPress={handleLocateMe}
        disabled={isLocating}
        className="absolute bottom-6 right-4 h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg dark:bg-[#0F1E36]"
      >
        {isLocating ? <ActivityIndicator size="small" color="#0EA5E9" /> : <LocateFixed size={20} color="#0EA5E9" />}
      </Pressable>

      {selectedVenue ? (
        <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 px-4 pb-3">
          <View className="flex-row gap-3 rounded-2xl bg-white p-3 shadow-xl dark:bg-[#0F1E36]">
            <View className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-brand/10 dark:bg-brand-dark/15">
              {selectedVenue.image_url ? (
                <Image source={{ uri: resolveMediaUrl(selectedVenue.image_url) }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Text className="text-2xl">{sportMeta?.emoji ?? '🏟️'}</Text>
                </View>
              )}
            </View>
            <View className="flex-1 justify-center gap-1">
              <Text className="text-sm font-black text-slate-900 dark:text-white" numberOfLines={1}>
                {selectedVenue.name}
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={1}>
                {selectedVenue.address}
              </Text>
              {selectedVenue.rating != null ? (
                <View className="flex-row items-center gap-1">
                  <Star size={11} color="#F59E0B" fill="#F59E0B" />
                  <Text className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {selectedVenue.rating.toFixed(1)} ({selectedVenue.review_count})
                  </Text>
                </View>
              ) : null}
            </View>
            <Pressable
              onPress={() => router.push({ pathname: '/bookings/[id]', params: { id: String(selectedVenue.id) } })}
              className="items-center justify-center self-center rounded-xl bg-brand px-3 py-2 dark:bg-brand-dark"
            >
              <Navigation size={14} color="#fff" />
              <Text className="mt-0.5 text-[10px] font-bold text-white">Xem sân</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      ) : null}
    </View>
  );
}
