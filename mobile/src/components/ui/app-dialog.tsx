import { Text } from '@/components/ui/text';
import { CircleAlert, Info, TriangleAlert } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDialogStore, type DialogButton } from '@/stores/dialog-store';

/**
 * The app's own alert/confirm dialog (replaces the system `Alert`). It is mounted at the app root and again
 * inside every native Modal, because a Modal draws over the root view and would hide a dialog raised from it.
 */
export function AppDialog() {
  const request = useDialogStore((s) => s.queue[0]);
  const dismiss = useDialogStore((s) => s.dismiss);

  if (!request) return null;

  const isError = /^lỗi/i.test(request.title);
  const hasDestructive = request.buttons.some((button) => button.style === 'destructive');
  const cancelButton = request.buttons.find((button) => button.style === 'cancel');
  const Icon = isError ? CircleAlert : hasDestructive ? TriangleAlert : Info;
  const iconColor = isError ? '#E11D48' : hasDestructive ? '#D97706' : '#537fff';
  const iconBg = isError ? 'bg-rose-500/10' : hasDestructive ? 'bg-amber-500/10' : 'bg-brand/10 dark:bg-brand-dark/15';

  // Close first, then run the handler, so a handler that raises another dialog queues it cleanly.
  const answer = (button?: DialogButton) => {
    dismiss();
    button?.onPress?.();
  };

  const stacked = request.buttons.length > 2;

  return (
    <Animated.View
      entering={FadeIn.duration(120)}
      className="absolute inset-0 z-[100] items-center justify-center px-6"
      accessibilityViewIsModal
    >
      {/* Tapping outside only dismisses when the dialog offers a cancel choice, like the system alert. */}
      <Pressable
        accessibilityLabel="Đóng"
        onPress={cancelButton ? () => answer(cancelButton) : undefined}
        className="absolute inset-0 bg-slate-950/75"
      />

      <Animated.View
        entering={ZoomIn.duration(140)}
        accessibilityRole="alert"
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101827]"
      >
        <View className="flex-row items-start gap-3 px-5 pb-4 pt-5">
          <View className={cn('h-11 w-11 items-center justify-center rounded-2xl', iconBg)}>
            <Icon size={22} color={iconColor} />
          </View>
          <View className="flex-1 gap-1 pt-0.5">
            <Text className="text-lg font-black text-slate-900 dark:text-white">{request.title}</Text>
            {request.message ? (
              <Text className="text-sm leading-5 text-slate-500 dark:text-slate-400">{request.message}</Text>
            ) : null}
          </View>
        </View>

        <View
          className={cn(
            'gap-2.5 border-t border-slate-100 bg-slate-50 px-5 py-3.5 dark:border-white/10 dark:bg-white/[0.03]',
            stacked ? 'flex-col' : 'flex-row justify-end',
          )}
        >
          {request.buttons.map((button, index) => (
            <Button
              key={`${button.text}-${index}`}
              variant={button.style === 'destructive' ? 'destructive' : button.style === 'cancel' ? 'outline' : 'default'}
              label={button.text}
              onPress={() => answer(button)}
              className={stacked ? 'w-full' : undefined}
            />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}
