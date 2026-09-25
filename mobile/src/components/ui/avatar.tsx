import { useState } from 'react';
import { Image, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ctaGradient } from '@/theme/colors';

export interface AvatarProps {
  uri?: string | null;
  fallback: string;
  size?: number;
}

export function Avatar({ uri, fallback, size = 44 }: AvatarProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const failed = uri === failedUri;

  const style = { width: size, height: size, borderRadius: size / 2, overflow: 'hidden' as const };
  if (uri && !failed) {
    return <Image source={{ uri }} style={style} onError={() => setFailedUri(uri)} />;
  }
  return (
    <LinearGradient
      colors={ctaGradient}
      style={[style, { alignItems: 'center', justifyContent: 'center' }]}
    >
      <Text style={{ fontSize: size * 0.4 }} className="font-black text-white">
        {fallback.charAt(0).toUpperCase() || '?'}
      </Text>
    </LinearGradient>
  );
}
