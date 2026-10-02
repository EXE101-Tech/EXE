import { Text } from '@/components/ui/text';
import { X, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';

import { cn } from '@/lib/utils';
import { AppDialog } from './app-dialog';
import { ToastBanner } from './toast-banner';

interface PopupModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  /** Extra content placed in the header, left of the close button (badges and the like). */
  headerAccessory?: ReactNode;
  children: ReactNode;
  /** Pinned under the body (action buttons). */
  footer?: ReactNode;
  /**
   * `false` renders the children as they are (inside a flexible area) so the caller can supply its own
   * ScrollView, for example one with sticky headers. Defaults to a scrolling body.
   */
  scroll?: boolean;
  /** Fixed, tall popup (82% of the screen) for long content such as schedule grids. */
  tall?: boolean;
  /** `sm` keeps list-like popups compact (they scroll inside); `md` (default) suits forms. */
  size?: 'sm' | 'md';
  /** Tapping the dimmed area closes the popup. Disable while a request is running. */
  dismissOnBackdrop?: boolean;
  bodyClassName?: string;
}

/**
 * Centered dialog over a dimmed backdrop (the mobile counterpart of the web `sg-modal-*` dialogs).
 * Used for every form and detail sheet so they open as popups instead of full pages.
 */
export function PopupModal({
  visible,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconColor = '#537fff',
  headerAccessory,
  children,
  footer,
  scroll = true,
  tall = false,
  size = 'md',
  dismissOnBackdrop = true,
  bodyClassName,
}: PopupModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-1 items-center justify-center px-4 py-6">
          <ToastBanner />
          <Pressable
            accessibilityLabel="Đóng"
            onPress={dismissOnBackdrop ? onClose : undefined}
            className="absolute inset-0 bg-slate-950/75"
          />

          <View
            style={tall ? { height: '82%' } : { maxHeight: size === 'sm' ? '58%' : '82%' }}
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101827]"
          >
            <View className="flex-row items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10">
              {Icon ? (
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 dark:bg-brand-dark/15">
                  <Icon size={22} color={iconColor} />
                </View>
              ) : null}
              <View className="flex-1">
                <Text className="text-lg font-black text-slate-900 dark:text-white" numberOfLines={1}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={2}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              {headerAccessory}
              <Pressable onPress={onClose} accessibilityLabel="Đóng" hitSlop={8} className="rounded-full p-1.5">
                <X size={20} color="#64748B" />
              </Pressable>
            </View>

            {scroll ? (
              <ScrollView
                className={tall ? 'flex-1' : undefined}
                contentContainerClassName={cn('gap-4 p-5', bodyClassName)}
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
                {children}
              </ScrollView>
            ) : (
              <View className={tall ? 'flex-1' : 'shrink'}>{children}</View>
            )}

            {footer ? (
              <View className="border-t border-slate-100 bg-slate-50 px-5 py-3.5 dark:border-white/10 dark:bg-white/[0.03]">
                {footer}
              </View>
            ) : null}
          </View>
          <AppDialog />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
