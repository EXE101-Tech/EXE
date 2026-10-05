import { Text } from '@/components/ui/text';
import { CheckCircle2, Info } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/lib/utils';
import { useToastStore } from '@/stores/toast-store';

/**
 * Renders the current toast. It is mounted once at the app root and again inside every PopupModal, because a
 * native Modal draws over the root view and would otherwise hide confirmations shown while a popup is open.
 */
export function ToastBanner() {
  const toast = useToastStore((s) => s.toast);
  const hide = useToastStore((s) => s.hide);
  const insets = useSafeAreaInsets();

  if (!toast) return null;
  const Icon = toast.tone === 'success' ? CheckCircle2 : Info;

  return (
    <View pointerEvents="box-none" style={{ top: insets.top + 8 }} className="absolute inset-x-0 z-50 items-center px-4">
      <Pressable
        onPress={hide}
        accessibilityRole="alert"
        className={cn(
          'max-w-md flex-row items-start gap-3 rounded-2xl border-2 bg-white px-4 py-3 shadow-xl dark:bg-slate-900',
          toast.tone === 'success' ? 'border-emerald-600' : 'border-brand dark:border-brand-dark',
        )}
      >
        <Icon size={20} color={toast.tone === 'success' ? '#059669' : '#537fff'} />
        <Text className="flex-1 text-sm font-bold leading-5 text-slate-800 dark:text-white">{toast.message}</Text>
      </Pressable>
    </View>
  );
}
