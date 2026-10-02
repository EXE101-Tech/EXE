import { Text } from '@/components/ui/text';
import { Film } from 'lucide-react-native';
import { useState, type ComponentType } from 'react';
import { Image, Pressable, View } from 'react-native';

import { resolveMediaUrl } from '@/api/resolve-media-url';
import { ImageLightbox } from '@/components/profile/image-lightbox';

/**
 * expo-video is a native module: a dev build made before it was added lacks it, and importing it there
 * throws. Loading it lazily lets posts still render (with a notice instead of the player).
 */
let PostVideo: ComponentType<{ uri: string; height?: number }> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  PostVideo = require('./post-video').default;
} catch {
  PostVideo = null;
}

interface PostMediaProps {
  url: string;
  type: 'image' | 'video';
  /** Alt/accessibility text for images. */
  label?: string;
  height?: number;
}

export function PostMedia({ url, type, label, height = 280 }: PostMediaProps) {
  const [lightbox, setLightbox] = useState(false);
  const uri = resolveMediaUrl(url);
  if (!uri) return null;

  if (type === 'video') {
    return PostVideo ? (
      <PostVideo uri={uri} height={height} />
    ) : (
      <View className="items-center gap-1 bg-slate-100 py-8 dark:bg-white/5">
        <Film size={22} color="#94A3B8" />
        <Text className="text-xs font-semibold text-slate-500">Video cần bản build mới của ứng dụng để phát.</Text>
      </View>
    );
  }

  return (
    <>
      <Pressable onPress={() => setLightbox(true)} accessibilityLabel={label ?? 'Xem ảnh'}>
        <Image source={{ uri }} style={{ width: '100%', height }} resizeMode="contain" className="bg-slate-50 dark:bg-black/20" />
      </Pressable>
      <ImageLightbox visible={lightbox} uri={uri} onClose={() => setLightbox(false)} />
    </>
  );
}
