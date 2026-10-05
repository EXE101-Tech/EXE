import { Text } from '@/components/ui/text';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  BadgeCheck,
  ChartNoAxesCombined,
  Crown,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { ScreenContainer } from '@/components/brand/screen-container';
import { TopNavbar } from '@/components/navigation/top-navbar';
import { useAuthStore } from '@/stores/auth-store';

const BENEFITS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Sparkles,
    title: 'Tự động tìm phòng và gửi thông báo',
    text: 'Thiết lập sẵn môn chơi, thời gian, khu vực và trình độ để hệ thống tự tìm phòng phù hợp, không cần tự vào tìm mỗi ngày.',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Ưu tiên và mời tự động phòng sắp bắt đầu',
    text: 'Nếu phòng Premium còn thiếu người trong vòng 4 giờ trước giờ chơi, hệ thống sẽ mời đúng số người còn thiếu trong cùng khu vực hoạt động. Sau mỗi 30 phút nếu phòng vẫn chưa đủ hoặc chưa có phản hồi, hệ thống mời thêm 1 người.',
  },
  {
    icon: Users,
    title: 'Mở rộng CLB và có lịch riêng',
    text: 'Tăng giới hạn thành viên so với mức cơ bản tối đa 15 người. Chủ CLB thiết lập lịch hoạt động, thành viên trong CLB được xem lịch.',
  },
  {
    icon: BadgeCheck,
    title: 'Lịch nhắc thu phí cho CLB',
    text: 'Chủ CLB chọn ngày và nhắc hàng tuần hoặc hàng tháng; thành viên nhận thông báo theo lịch đã đặt.',
  },
];

export default function PremiumScreen() {
  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const isPremium = Boolean(user?.isPremium);

  // Re-read the profile whenever this tab is shown so an existing entitlement stays current.
  useFocusEffect(
    useCallback(() => {
      refreshProfile().catch(() => {});
    }, [refreshProfile]),
  );

  return (
    <ScreenContainer className="px-4 pb-10">
      <TopNavbar />

      <TouchableOpacity onPress={() => router.back()} hitSlop={8} className="mb-4 flex-row items-center gap-1.5 self-start">
        <ArrowLeft size={16} color="#94A3B8" />
        <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">Quay lại</Text>
      </TouchableOpacity>

      <LinearGradient
        colors={['#1b2240', '#151d34', '#111e37']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 22, borderWidth: 1, borderColor: 'rgba(160,148,246,0.25)', padding: 26, overflow: 'hidden' }}
      >
        <View
          className="flex-row items-center gap-2 self-start rounded-lg border px-2.5 py-1.5"
          style={{ borderColor: 'rgba(202,174,250,0.45)', backgroundColor: 'rgba(137,90,183,0.24)' }}
        >
          <Crown size={14} color="#e7dcff" />
          <Text className="text-[10px] font-extrabold tracking-widest text-[#e7dcff]">SPORTGO PREMIUM</Text>
        </View>

        <Text className="mt-5 text-4xl font-black leading-[42px] text-white">
          Chủ động hơn{'\n'}
          <Text className="text-4xl font-black leading-[42px] text-[#b8b1ff]">trong mỗi trận chơi.</Text>
        </Text>
        <Text className="mt-3 text-[13px] leading-6 text-[#b1bdd4]">
          Gói Premium sẽ sớm được mở trên mobile với các tính năng tự động tìm phòng, mời người cùng khu vực để lấp đầy
          phòng và quản lý hoạt động CLB theo lịch đã thiết lập.
        </Text>

        <View
          accessibilityLabel={isPremium ? 'Gói Premium đang hoạt động' : 'Premium sẽ sớm mở trên mobile'}
          className="mt-6 flex-row items-center gap-2 self-start rounded-xl border px-4 py-3"
          style={{
            borderColor: isPremium ? 'rgba(103,211,184,0.55)' : '#6879aa',
            backgroundColor: isPremium ? 'rgba(48,143,124,0.2)' : 'rgba(15,24,48,0.3)',
          }}
        >
          {isPremium ? (
            <>
              <BadgeCheck size={16} color="#b9f3e2" />
              <Text className="text-sm font-black text-[#b9f3e2]">Đã nâng cấp</Text>
            </>
          ) : (
            <Text className="text-sm font-black text-white">Premium sẽ sớm mở trên mobile</Text>
          )}
        </View>
        {isPremium && user?.premium_until ? (
          <Text className="mt-2 text-xs text-[#b9f3e2]">
            Hiệu lực đến {new Date(user.premium_until).toLocaleDateString('vi-VN')}
          </Text>
        ) : null}
      </LinearGradient>

      <View className="mb-4 mt-8">
        <Text className="text-[11px] font-extrabold tracking-widest text-brand dark:text-brand-dark">GÓI PREMIUM</Text>
        <Text className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">
          Tự động hóa những việc bạn thường phải làm thủ công
        </Text>
      </View>

      <View className="gap-3">
        {BENEFITS.map(({ icon: Icon, title, text }) => (
          <View
            key={title}
            className="rounded-2xl border border-border bg-white p-5 dark:border-border-dark dark:bg-[#111827]"
          >
            <View className="h-10 w-10 items-center justify-center rounded-xl border border-[#536aa9] bg-[#293863]">
              <Icon size={20} color="#b8c7ff" />
            </View>
            <Text className="mt-3.5 text-[15px] font-extrabold leading-5 text-slate-900 dark:text-white">{title}</Text>
            <Text className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{text}</Text>
          </View>
        ))}
      </View>

      <Text className="mt-6 text-[11px] leading-4 text-slate-500">Premium sẽ sớm mở trên mobile.</Text>
    </ScreenContainer>
  );
}
