import { Text } from '@/components/ui/text';
import {
  ClipboardList,
  Gamepad2,
  LogOut,
  Shield,
  UserRound,
  Users,
  FileText,
  Hourglass,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, TouchableOpacity, View } from 'react-native';

import { AccountsTabs } from '@/components/admin/accounts-tabs';
import { ContentSection } from '@/components/admin/content-section';
import { PaymentsSection } from '@/components/admin/payments-section';
import { Segmented } from '@/components/admin/admin-ui';
import { ScreenContainer } from '@/components/brand/screen-container';
import { StatCard } from '@/components/brand/stat-card';
import { ThemeToggleButton } from '@/components/navigation/theme-toggle-button';
import { useAdminSummaryQuery, useRefreshAdmin } from '@/hooks/queries/use-admin';
import { useAuthStore } from '@/stores/auth-store';
import { showAlert } from '@/stores/dialog-store';

type AdminTab = 'payments' | 'content' | 'accounts';

const TAB_OPTIONS = [
  { value: 'payments' as const, label: 'Giao dịch', icon: ClipboardList },
  { value: 'content' as const, label: 'Kiểm duyệt', icon: Shield },
  { value: 'accounts' as const, label: 'Tài khoản', icon: UserRound },
];

/** Moderation console (web: "Trung tâm kiểm duyệt"): Premium payments, content moderation and accounts. */
export default function AdminScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data: summary } = useAdminSummaryQuery();
  const refreshAll = useRefreshAdmin();

  const [tab, setTab] = useState<AdminTab>('payments');
  const [notice, setNotice] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const notify = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 4000);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setRefreshing(false);
    }
  };

  const confirmLogout = () =>
    showAlert('Đăng xuất', 'Bạn có chắc muốn đăng xuất khỏi trung tâm quản trị?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);

  const cards = [
    { label: 'Người dùng', value: summary?.users ?? '—', icon: Users, colorClassName: 'bg-blue-500/10', iconColor: '#2563EB' },
    { label: 'Bài viết', value: summary?.posts ?? '—', icon: FileText, colorClassName: 'bg-emerald-500/10', iconColor: '#059669' },
    { label: 'CLB', value: summary?.teams ?? '—', icon: Shield, colorClassName: 'bg-violet-500/10', iconColor: '#7C3AED' },
    { label: 'Phòng', value: summary?.rooms ?? '—', icon: Gamepad2, colorClassName: 'bg-amber-500/10', iconColor: '#D97706' },
    { label: 'Chờ duyệt', value: summary?.pending_payments ?? '—', icon: Hourglass, colorClassName: 'bg-rose-500/10', iconColor: '#E11D48' },
  ];

  return (
    <ScreenContainer
      className="gap-4 pt-2"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#537fff" />}
    >
      <View className="flex-row items-center gap-3 border-b border-border pb-4 dark:border-border-dark">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand/10 dark:bg-brand-dark/15">
          <Shield size={22} color="#537fff" />
        </View>
        <View className="flex-1">
          <Text className="text-[10px] font-extrabold tracking-widest text-brand dark:text-brand-dark">SPORTGO ADMIN</Text>
          <Text className="text-lg font-black text-slate-900 dark:text-white">Trung tâm kiểm duyệt</Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={1}>
            Đăng nhập: {user?.email}
          </Text>
        </View>
        <ThemeToggleButton />
        <TouchableOpacity
          onPress={confirmLogout}
          accessibilityLabel="Đăng xuất"
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full border border-rose-500/40"
        >
          <LogOut size={16} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <View className="flex-row flex-wrap gap-3">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </View>

      <Segmented value={tab} onChange={setTab} options={TAB_OPTIONS} />

      {notice ? (
        <Text
          accessibilityRole="alert"
          className="rounded-xl bg-brand/10 px-4 py-3 text-sm font-semibold text-brand dark:bg-brand-dark/15 dark:text-brand-dark"
        >
          {notice}
        </Text>
      ) : null}

      {tab === 'payments' ? <PaymentsSection notify={notify} /> : null}
      {tab === 'content' ? <ContentSection notify={notify} /> : null}
      {tab === 'accounts' ? <AccountsTabs notify={notify} /> : null}
    </ScreenContainer>
  );
}
