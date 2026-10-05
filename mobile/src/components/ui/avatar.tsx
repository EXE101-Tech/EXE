import { Text } from '@/components/ui/text';
import { useState } from 'react';
import { Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ctaGradient } from '@/theme/colors';

export interface AvatarProps {
  uri?: string | null;
  fallback: string;
  size?: number;
  /** Premium accounts get a glowing ring (mirrors the web `sg-premium-avatar`). */
  premium?: boolean;
}

export function Avatar({ uri, fallback, size = 44, premium = false }: AvatarProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const failed = uri === failedUri;

  const style = { width: size, height: size, borderRadius: size / 2, overflow: 'hidden' as const };
  const avatar =
    uri && !failed ? (
      <Image source={{ uri }} style={style} onError={() => setFailedUri(uri)} />
    ) : (
      <LinearGradient colors={ctaGradient} style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: size * 0.4 }} className="font-black text-white">
          {fallback.charAt(0).toUpperCase() || '?'}
        </Text>
      </LinearGradient>
    );

  if (!premium) return avatar;
  return (
    <View
      style={{
        padding: 2,
        borderRadius: (size + 8) / 2,
        borderWidth: 2,
        borderColor: '#8b9cff',
        shadowColor: '#7c84ff',
        shadowOpacity: 0.55,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
        elevation: 6,
      }}
    >
      {avatar}
    </View>
  );
}
