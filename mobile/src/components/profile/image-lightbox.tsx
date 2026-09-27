import { X } from 'lucide-react-native';
import { Image, Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ImageLightboxProps {
  visible: boolean;
  uri: string;
  onClose: () => void;
}

export function ImageLightbox({ visible, uri, onClose }: ImageLightboxProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/90" onPress={onClose}>
        <SafeAreaView className="absolute right-4 top-4">
          <Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-white/10" hitSlop={8}>
            <X size={20} color="#fff" />
          </Pressable>
        </SafeAreaView>
        <View className="h-2/3 w-full px-4">
          <Image source={{ uri }} className="h-full w-full" resizeMode="contain" />
        </View>
      </Pressable>
    </Modal>
  );
}
