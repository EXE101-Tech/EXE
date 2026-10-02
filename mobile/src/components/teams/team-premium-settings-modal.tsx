import { Text } from '@/components/ui/text';
import { CalendarClock, Check, Crown, Info, Save } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TouchableOpacity, View } from 'react-native';

import { GradientButton } from '@/components/brand/gradient-button';
import { PopupModal } from '@/components/ui/popup-modal';
import { SelectDropdown, type SelectOption } from '@/components/ui/select-dropdown';
import { useUpdateTeamPremiumSettingsMutation } from '@/hooks/queries/use-teams';
import { TIME_SLOTS } from '@/lib/slots';
import { cn } from '@/lib/utils';
import { showToast } from '@/stores/toast-store';
import type { TeamResponse } from '@/schemas/teams';

// The activity schedule only covers weekdays: Monday = 0 ... Friday = 4 (server rejects higher values).
const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6'];

const FREQUENCY_OPTIONS: SelectOption[] = [
  { value: '', label: 'Không nhắc' },
  { value: 'WEEKLY', label: 'Hàng tuần' },
  { value: 'MONTHLY', label: 'Hàng tháng' },
];

// The fee reminder day uses Monday = 0 ... Sunday = 6.
const FEE_DAY_OPTIONS: SelectOption[] = [
  { value: '', label: 'Chọn thứ' },
  ...['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'].map((label, index) => ({
    value: String(index),
    label,
  })),
];

const slotKey = (weekday: number, time: string) => `${weekday}|${time}`;

interface FormState {
  frequency: string;
  day: string;
  slots: string[];
}

function teamToForm(team: TeamResponse): FormState {
  return {
    frequency: team.fee_reminder_frequency ?? '',
    day: team.fee_reminder_day == null ? '' : String(team.fee_reminder_day),
    slots: (team.activity_schedule ?? []).map((slot) => slotKey(slot.weekday, slot.time)),
  };
}

interface TeamPremiumSettingsModalProps {
  visible: boolean;
  team: TeamResponse;
  /** The owner edits; members get a read-only view of the same schedule. */
  canEdit: boolean;
  onClose: () => void;
}

/** Premium club tools: fee-reminder cadence and a weekday activity schedule. */
export function TeamPremiumSettingsModal({ visible, team, canEdit, onClose }: TeamPremiumSettingsModalProps) {
  return (
    <PopupModal
      visible={visible}
      onClose={onClose}
      title={canEdit ? 'Quản lý CLB' : 'Lịch riêng của CLB'}
      subtitle={`${team.name} · ${canEdit ? 'Thiết lập lịch hoạt động và nhắc thu phí' : 'Chỉ được xem thiết lập của chủ CLB'}`}
      icon={Crown}
      iconColor="#8B5CF6"
      headerAccessory={
        <View className="flex-row items-center gap-1 rounded-full border border-violet-300/40 bg-violet-400/10 px-2 py-0.5">
          <Crown size={10} color="#8B5CF6" />
          <Text className="text-[10px] font-black text-violet-500">PREMIUM</Text>
        </View>
      }
      tall
      scroll={false}
    >
      {/* Mounted only while visible so every opening starts from the latest saved settings. */}
      {visible ? <SettingsForm team={team} canEdit={canEdit} onClose={onClose} /> : null}
    </PopupModal>
  );
}

function SettingsForm({ team, canEdit, onClose }: { team: TeamResponse; canEdit: boolean; onClose: () => void }) {
  const save = useUpdateTeamPremiumSettingsMutation();
  const [form, setForm] = useState<FormState>(() => teamToForm(team));
  const [error, setError] = useState('');

  const selected = useMemo(() => new Set(form.slots), [form.slots]);

  const toggleSlot = (weekday: number, time: string) => {
    if (!canEdit) return;
    const key = slotKey(weekday, time);
    setForm((current) => ({
      ...current,
      slots: current.slots.includes(key) ? current.slots.filter((item) => item !== key) : [...current.slots, key],
    }));
  };

  const submit = async () => {
    if (!canEdit) return;
    if (form.frequency && form.day === '') {
      setError('Hãy chọn ngày nhắc thu phí.');
      return;
    }
    setError('');
    try {
      await save.mutateAsync({
        id: team.id,
        data: {
          fee_reminder_frequency: form.frequency ? (form.frequency as 'WEEKLY' | 'MONTHLY') : null,
          fee_reminder_day: form.frequency ? Number(form.day) : null,
          activity_schedule: form.slots.map((value) => {
            const [weekday, time] = value.split('|');
            return { weekday: Number(weekday), time };
          }),
        },
      });
      onClose();
      showToast('Đã lưu thiết lập Premium của CLB.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không lưu được thiết lập Premium của CLB');
    }
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

          <View className="gap-3 rounded-2xl border border-border p-4 dark:border-border-dark">
            <View className="flex-row items-start gap-2">
              <CalendarClock size={18} color="#8B5CF6" />
              <View className="flex-1">
                <Text className="text-sm font-black text-slate-900 dark:text-white">Nhắc thu phí CLB</Text>
                <Text className="mt-0.5 text-xs text-slate-500">Có thể để trống để không gửi nhắc phí.</Text>
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">Loại nhắc</Text>
                <View pointerEvents={canEdit ? 'auto' : 'none'} style={{ opacity: canEdit ? 1 : 0.6 }}>
                  <SelectDropdown
                    className="h-11 w-full"
                    value={form.frequency}
                    options={FREQUENCY_OPTIONS}
                    onChange={(value) => setForm((current) => ({ ...current, frequency: value }))}
                  />
                </View>
              </View>
              <View className="flex-1">
                <Text className="mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">Ngày nhắc</Text>
                <View
                  pointerEvents={canEdit && form.frequency ? 'auto' : 'none'}
                  style={{ opacity: canEdit && form.frequency ? 1 : 0.6 }}
                >
                  <SelectDropdown
                    className="h-11 w-full"
                    value={form.day}
                    options={FEE_DAY_OPTIONS}
                    onChange={(value) => setForm((current) => ({ ...current, day: value }))}
                  />
                </View>
              </View>
            </View>
          </View>

          <View className="flex-row items-end justify-between">
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <CalendarClock size={15} color="#6366F1" />
                <Text className="text-sm font-black text-slate-900 dark:text-white">Lịch hoạt động riêng</Text>
              </View>
              <Text className="mt-0.5 text-[11px] text-slate-500">
                Các ô 30 phút từ thứ 2 đến thứ 6. Hàng thứ giữ cố định khi cuộn.
              </Text>
            </View>
            <Text className="text-xs font-bold text-indigo-500">{form.slots.length} ô đã chọn</Text>
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

        <View className="gap-4 px-4 pt-1">
          <View>
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
                      disabled={!canEdit}
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

          {!canEdit ? (
            <View className="flex-row items-start gap-2 rounded-2xl border border-sky-300/30 bg-sky-400/10 p-3">
              <Info size={16} color="#0284C7" />
              <Text className="flex-1 text-xs text-sky-600 dark:text-sky-300">
                Lịch này do chủ CLB Premium thiết lập. Thành viên chỉ có quyền xem.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View className="flex-row items-center justify-between gap-3 border-t border-border bg-bg px-4 py-3 dark:border-border-dark dark:bg-bg-dark">
        <TouchableOpacity onPress={onClose} className="px-2 py-3">
          <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">{canEdit ? 'Hủy' : 'Đóng'}</Text>
        </TouchableOpacity>
        {canEdit ? (
          <GradientButton
            label="Lưu thiết lập"
            icon={<Save size={15} color="#fff" />}
            loading={save.isPending}
            onPress={submit}
            className="min-w-[160px]"
          />
        ) : null}
      </View>
    </>
  );
}
