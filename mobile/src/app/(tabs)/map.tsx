import * as Location from 'expo-location';
import { router } from 'expo-router';
import { ArrowLeft, LocateFixed, Navigation, Search, Star, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { resolveMediaUrl } from '@/api/resolve-media-url';
import { useNearbyVenuesQuery } from '@/hooks/queries/use-courts';
import { SPORTS } from '@/lib/constants';
import type { VenueResponse } from '@/schemas/courts';

const HCM_CENTER = { latitude: 10.762622, longitude: 106.660172 };
const NEARBY_RADIUS_KM = 50;

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [origin, setOrigin] = useState(HCM_CENTER);
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
        mapRef.current?.animateToRegion({ ...next, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 800);
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
      mapRef.current?.animateToRegion({ ...next, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 800);
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
      mapRef.current?.animateToRegion(
        { latitude: venue.latitude, longitude: venue.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        600,
      );
    }
  };

  const sportMeta = selectedVenue ? SPORTS.find((s) => s.key === selectedVenue.sport_key) : undefined;

  return (
    <View className="flex-1 bg-bg dark:bg-bg-dark">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{ ...HCM_CENTER, latitudeDelta: 0.15, longitudeDelta: 0.15 }}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={() => setSelectedVenue(null)}
      >
        {filteredVenues.map((venue) => (
          <Marker
            key={venue.id}
            coordinate={{ latitude: venue.latitude as number, longitude: venue.longitude as number }}
            title={venue.name}
            description={venue.address}
            pinColor={selectedVenue?.id === venue.id ? '#0EA5E9' : undefined}
            onPress={() => handleSelectVenue(venue)}
          />
        ))}
      </MapView>

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
