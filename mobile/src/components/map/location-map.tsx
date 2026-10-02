import { Camera, Map as MapLibreMap, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { Text } from '@/components/ui/text';
import { MapPin } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { env } from '@/lib/env';
import type { KnownVenue } from '@/lib/geocoding';
import type { LatLng } from '@/lib/venue-locations';

/**
 * MapLibre views used by the location picker and the location viewer. Like the main map screen this is a
 * native module, so callers load this file lazily inside try/catch (see `loadLocationMap`).
 */

const sportEmoji = (sportKey?: string | null) =>
  sportKey === 'football' ? '⚽' : sportKey === 'pickleball' ? '🏓' : sportKey === 'tennis' ? '🎾' : '🏸';

const toLngLat = ([lat, lng]: LatLng): [number, number] => [lng, lat];

/** Keeps the camera on `target`, flying there whenever it changes. */
function useFlyTo(target: LatLng | null, zoom: number) {
  const cameraRef = useRef<CameraRef>(null);
  const lat = target?.[0];
  const lng = target?.[1];
  useEffect(() => {
    if (lat == null || lng == null) return;
    cameraRef.current?.flyTo({ center: [lng, lat], zoom, duration: 600 });
  }, [lat, lng, zoom]);
  return cameraRef;
}

interface PickerMapProps {
  /** The currently chosen pin. */
  markerPos: LatLng;
  /** Moves the camera when set or changed (search result, GPS, venue pick). */
  flyTarget: LatLng | null;
  venues: KnownVenue[];
  onPick: (position: LatLng) => void;
  onSelectVenue: (venue: KnownVenue) => void;
}

/** Tap anywhere to drop the pin, or tap a venue icon to choose that venue (web: "Bấm vào bất kỳ đâu trên bản đồ"). */
export function PickerMap({ markerPos, flyTarget, venues, onPick, onSelectVenue }: PickerMapProps) {
  const cameraRef = useFlyTo(flyTarget, 16);
  // A tap on a venue icon can also reach the map's own press handler; ignore that one for a moment.
  const selectingVenue = useRef(false);

  return (
    <MapLibreMap
      style={{ flex: 1 }}
      mapStyle={env.mapStyleUrl}
      onPress={(event) => {
        if (selectingVenue.current) return;
        const [lng, lat] = event.nativeEvent.lngLat;
        onPick([lat, lng]);
      }}
    >
      <Camera ref={cameraRef} initialViewState={{ center: toLngLat(markerPos), zoom: 15 }} />

      {venues.map((venue) => (
        <Marker
          key={venue.id}
          id={`venue-${venue.id}`}
          lngLat={[venue.longitude, venue.latitude]}
          anchor="center"
          onPress={() => {
            selectingVenue.current = true;
            setTimeout(() => {
              selectingVenue.current = false;
            }, 500);
            onSelectVenue(venue);
          }}
        >
          <View className="h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-emerald-600 shadow-md">
            <Text className="text-sm">{sportEmoji(venue.sport_key)}</Text>
          </View>
        </Marker>
      ))}

      <Marker id="picked-location" lngLat={toLngLat(markerPos)} anchor="bottom">
        <View className="items-center">
          <View className="mb-1 rounded-lg bg-emerald-600 px-2 py-0.5">
            <Text className="text-[10px] font-bold text-white">Vị trí bạn chọn</Text>
          </View>
          <MapPin size={34} color="#E11D48" fill="#E11D48" />
        </View>
      </Marker>
    </MapLibreMap>
  );
}

interface PinMapProps {
  center: LatLng;
  label: string;
}

/** Read-only map with a single labelled pin (web: ViewLocationModal). */
export function PinMap({ center, label }: PinMapProps) {
  const cameraRef = useFlyTo(center, 16);

  return (
    <MapLibreMap style={{ flex: 1 }} mapStyle={env.mapStyleUrl}>
      <Camera ref={cameraRef} initialViewState={{ center: toLngLat(center), zoom: 16 }} />
      <Marker id="location-pin" lngLat={toLngLat(center)} anchor="bottom">
        <View className="items-center">
          <View className="mb-1 max-w-[220px] rounded-lg bg-emerald-600 px-2.5 py-1">
            <Text className="text-xs font-bold text-white" numberOfLines={1}>
              📍 {label}
            </Text>
          </View>
          <MapPin size={36} color="#E11D48" fill="#E11D48" />
        </View>
      </Marker>
    </MapLibreMap>
  );
}
