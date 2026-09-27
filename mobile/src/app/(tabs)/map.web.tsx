import { Text } from '@/components/ui/text';
import { router } from 'expo-router';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MapScreenWeb() {
  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <View className="flex-row items-center gap-2 px-4 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full bg-white shadow-md dark:bg-[#0F1E36]"
        >
          <ArrowLeft size={18} color="#0F172A" />
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center gap-3 px-8">
        <MapPin size={40} color="#94A3B8" />
        <Text className="text-center text-base font-bold text-slate-900 dark:text-white">
          Bản đồ chưa hỗ trợ trên web
        </Text>
        <Text className="text-center text-sm text-slate-500 dark:text-slate-400">
          Vui lòng mở ứng dụng trên điện thoại (Expo Go / bản build di động) để xem sân trên bản đồ.
        </Text>
      </View>
    </SafeAreaView>
  );
}
