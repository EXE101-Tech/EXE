import type { ComponentType } from 'react';

import type { KnownVenue } from '@/lib/geocoding';
import type { LatLng } from '@/lib/venue-locations';

export interface PickerMapProps {
  markerPos: LatLng;
  flyTarget: LatLng | null;
  venues: KnownVenue[];
  onPick: (position: LatLng) => void;
  onSelectVenue: (venue: KnownVenue) => void;
}

export interface PinMapProps {
  center: LatLng;
  label: string;
}

interface LocationMapModule {
  PickerMap: ComponentType<PickerMapProps>;
  PinMap: ComponentType<PinMapProps>;
}

/**
 * MapLibre is a native module: Expo Go (or a dev build made before it was added) throws when it is imported.
 * Requiring it lazily here keeps that failure to the map areas, which then show a notice, instead of crashing
 * the forms that embed them. Returns null when the module is unavailable.
 */
export function loadLocationMap(): LocationMapModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./location-map') as LocationMapModule;
  } catch {
    return null;
  }
}
