import { ActivityIndicator, Text, View } from 'react-native';

export function LoadingState({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <View className="items-center justify-center gap-3 py-12">
      <ActivityIndicator size="large" color="#0EA5E9" />
      <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</Text>
    </View>
  );
}
