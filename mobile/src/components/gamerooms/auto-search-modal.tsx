import { Text } from '@/components/ui/text';
import { CalendarClock, Check, Crown, MapPin, Save, Trophy, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TouchableOpacity, View } from 'react-native';

import { LoadingState } from '@/components/brand/loading-state';
import { GradientButton } from '@/components/brand/gradient-button';
import { Input } from '@/components/ui/input';
import { PopupModal } from '@/components/ui/popup-modal';
import { SelectDropdown, type SelectOption } from '@/components/ui/select-dropdown';
import { useSportsQuery } from '@/hooks/queries/use-courts';
import {
  useAutoSearchQuery,
  useRemoveAutoSearchMutation,
  useSaveAutoSearchMutation,
} from '@/hooks/queries/use-gamerooms';
import { isActiveSportName, SKILL_REQUIREMENT_OPTIONS } from '@/lib/constants';
import { TIME_SLOTS } from '@/lib/slots';
import { cn } from '@/lib/utils';
import type { RoomSearchPreference } from '@/schemas/gamerooms';
import { showAlert } from '@/stores/dialog-store';

// Weekday index matches the server (Monday = 0 ... Sunday = 6).
const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const LEVEL_OPTIONS: SelectOption[] = [{ value: '', label: 'Mọi trình độ' }, ...SKILL_REQUIREMENT_OPTIONS];

interface FormState {
  sportId: string;
  level: string;
  maxPrice: string;
  location: string;
  slots: string[];
}

const slotKey = (weekday: number, time: string) => `${weekday}|${time}`;

function preferenceToForm(preference: RoomSearchPreference | null): FormState {
  if (!preference) return { sportId: '', level: '', maxPrice: '', location: '', slots: [] };
  return {
    sportId: preference.sport_id ? String(preference.sport_id) : '',
    level: preference.required_level ?? '',
    maxPrice: preference.max_price == null ? '' : Number(preference.max_price).toLocaleString('vi-VN'),
    location: preference.location ?? '',
    slots: preference.time_slots.map((slot) => slotKey(slot.weekday, slot.time)),
  };
}

/** Accepts "50000" or grouped "50.000"; returns null for empty and NaN for anything else. */
function parsePrice(value: string): number | null {
  const raw = value.trim();
  if (!raw) return null;
  if (/^\d{1,3}(?:\.\d{3})+$/.test(raw)) return Number(raw.replace(/\./g, ''));
  if (/^\d+$/.test(raw)) return Number(raw);
  return Number.NaN;
}

interface AutoSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

/** Premium feature: saved criteria the server matches against newly opened rooms (and notifies on). */
export function AutoSearchModal({ visible, onClose, onSaved }: AutoSearchModalProps) {
  return (
    <PopupModal
      visible={visible}
      onClose={onClose}
      title="Tự động tìm phòng"
      subtitle="Khi có phòng phù hợp, SportGo sẽ gửi thông báo cho bạn."
      icon={CalendarClock}
      headerAccessory={
        <View className="flex-row items-center gap-1 rounded-full border border-violet-300/40 bg-violet-400/10 px-2 py-0.5">
          <Crown size={10} color="#8B5CF6" />
          <Text className="text-[10px] font-black text-violet-500">PREMIUM</Text>
        </View>
      }
      tall
      scroll={false}
    >
      {/* The body mounts only while visible, so each opening loads the saved setup and starts a fresh form. */}
      {visible ? <AutoSearchContent onClose={onClose} onSaved={onSaved} /> : null}
    </PopupModal>
  );
}

function AutoSearchContent({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const { data: preference, isLoading, isError, error } = useAutoSearchQuery(true);

  if (isLoading) return <LoadingState label="Đang tải thiết lập của bạn…" />;
  if (isError) {
    return (
      <View className="p-4">
        <Text className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {error instanceof Error ? error.message : 'Không tải được thiết lập tự động tìm phòng'}
        </Text>
      </View>
    );
  }
  // The key restarts the form when the saved copy changes (for example right after saving).
  return (
    <AutoSearchForm key={preference?.updated_at ?? 'new'} preference={preference ?? null} onClose={onClose} onSaved={onSaved} />
  );
}

function AutoSearchForm({
  preference,
  onClose,
  onSaved,
}: {
  preference: RoomSearchPreference | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { data: sports } = useSportsQuery();
  const save = useSaveAutoSearchMutation();
  const remove = useRemoveAutoSearchMutation();

  const [form, setForm] = useState<FormState>(() => preferenceToForm(preference));
  const [error, setError] = useState('');

  const sportOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'Tất cả môn' },
      ...(sports ?? [])
        .filter((sport) => sport.id != null && isActiveSportName(sport.name))
        .map((sport) => ({ value: String(sport.id), label: sport.name })),
    ],
    [sports],
  );

  const selected = useMemo(() => new Set(form.slots), [form.slots]);

  const toggleSlot = (weekday: number, time: string) => {
    const key = slotKey(weekday, time);
    setForm((current) => ({
      ...current,
      slots: current.slots.includes(key) ? current.slots.filter((item) => item !== key) : [...current.slots, key],
    }));
  };

  const submit = async () => {
    if (!form.slots.length) {
      setError('Hãy chọn ít nhất một khung giờ 30 phút.');
      return;
    }
    const maxPrice = parsePrice(form.maxPrice);
    if (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice < 0)) {
      setError('Giá tối đa phải là số tiền hợp lệ.');
      return;
    }
    setError('');
    try {
      await save.mutateAsync({
        sport_id: form.sportId ? Number(form.sportId) : null,
        required_level: form.level || null,
        max_price: maxPrice,
        location: form.location.trim() || null,
        time_slots: form.slots.map((value) => {
          const [weekday, time] = value.split('|');
          return { weekday: Number(weekday), time };
        }),
        is_active: true,
      });
      onSaved?.();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không lưu được thiết lập tự động tìm phòng');
    }
  };

  const confirmRemove = () => {
    showAlert('Xóa thiết lập', 'Bạn sẽ không còn nhận thông báo phòng phù hợp nữa. Tiếp tục?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () =>
          remove.mutate(undefined, {
            onSuccess: onClose,
            onError: (removeError) => showAlert('Lỗi', removeError.message),
          }),
      },
    ]);
  };

  return (
    <>
      <ScrollView className="flex-1" stickyHeaderIndices={[1]} contentContainerClassName="pb-6">
        <View className="gap-4 p-4">
          {error ? (
            <View className="rounded-xl bg-rose-50 px-3 py-2.5 dark:bg-rose-500/10">
              <Text className="text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</Text>
            </View>
          ) : null}

          <View>
            <Text className="mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">Môn thể thao</Text>
            <SelectDropdown
              icon={Trophy}
              iconColor="#F59E0B"
              className="h-12 w-full"
              value={form.sportId}
              options={sportOptions}
              onChange={(value) => setForm((current) => ({ ...current, sportId: value }))}
            />
          </View>

          <View>
            <Text className="mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">Trình độ</Text>
            <SelectDropdown
              icon={Users}
              iconColor="#537fff"
              className="h-12 w-full"
              value={form.level}
              options={LEVEL_OPTIONS}
              onChange={(value) => setForm((current) => ({ ...current, level: value }))}
            />
          </View>

          <View>
            <Text className="mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">Giá tối đa / người (đ)</Text>
            <Input
              placeholder="Ví dụ: 50.000"
              keyboardType="number-pad"
              value={form.maxPrice}
              onChangeText={(value) => setForm((current) => ({ ...current, maxPrice: value }))}
            />
            <Text className="mt-1 text-[11px] text-slate-500">
              Phòng có giá nhỏ hơn hoặc bằng mức này sẽ được tính là phù hợp.
            </Text>
          </View>

          <View>
            <View className="mb-1.5 flex-row items-center gap-1.5">
              <MapPin size={13} color="#F43F5E" />
              <Text className="text-xs font-bold text-slate-700 dark:text-slate-200">Khu vực mong muốn</Text>
            </View>
            <Input
              placeholder="Ví dụ: Quận 7, Thủ Đức"
              maxLength={255}
              value={form.location}
              onChangeText={(value) => setForm((current) => ({ ...current, location: value }))}
            />
            <Text className="mt-1 text-[11px] text-slate-500">Có thể nhập tên quận, khu vực hoặc địa điểm.</Text>
          </View>

          <View className="flex-row items-end justify-between">
            <View className="flex-1">
              <Text className="text-sm font-black text-slate-900 dark:text-white">Khung giờ muốn tìm</Text>
              <Text className="mt-0.5 text-[11px] text-slate-500">
                Chạm vào các ô 30 phút. Hàng thứ giữ cố định khi cuộn.
              </Text>
            </View>
            <Text className="text-xs font-bold text-brand dark:text-brand-dark">{form.slots.length} ô đã chọn</Text>
          </View>
        </View>

        {/* Sticky day header (index 1 of the scroll content) */}
        <View className="flex-row border-b border-border bg-bg px-4 py-2 dark:border-border-dark dark:bg-bg-dark">
          <View className="w-12 items-center justify-center">
            <Text className="text-[10px] font-bold text-slate-400">Giờ</Text>
          </View>
          {DAYS.map((day) => (
            <View key={day} className="flex-1 items-center">
              <Text className="text-[11px] font-black text-slate-600 dark:text-slate-300">{day}</Text>
            </View>
          ))}
        </View>

        <View className="px-4 pt-1">
          {TIME_SLOTS.map((time) => (
            <View key={time} className="flex-row items-center">
              <View className="w-12 justify-center">
                <Text className="text-[10px] font-semibold text-slate-400">{time}</Text>
              </View>
              {DAYS.map((day, weekday) => {
                const isSelected = selected.has(slotKey(weekday, time));
                return (
                  <Pressable
                    key={day}
                    accessibilityLabel={`${day} ${time}`}
                    onPress={() => toggleSlot(weekday, time)}
                    className={cn(
                      'm-px h-7 flex-1 items-center justify-center rounded-md border',
                      isSelected
                        ? 'border-brand bg-brand dark:border-brand-dark dark:bg-brand-dark'
                        : 'border-border bg-white dark:border-border-dark dark:bg-white/5',
                    )}
                  >
                    {isSelected ? <Check size={12} color="#fff" /> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="flex-row items-center justify-between gap-3 border-t border-border bg-bg px-4 py-3 dark:border-border-dark dark:bg-bg-dark">
        {preference ? (
          <TouchableOpacity onPress={confirmRemove} disabled={remove.isPending} className="px-2 py-3">
            <Text className="text-sm font-bold text-rose-500">Xóa thiết lập</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onClose} className="px-2 py-3">
            <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">Hủy</Text>
          </TouchableOpacity>
        )}
        <GradientButton
          label="Lưu thiết lập"
          icon={<Save size={15} color="#fff" />}
          loading={save.isPending}
          onPress={submit}
          className="min-w-[160px]"
        />
      </View>
    </>
  );
}
