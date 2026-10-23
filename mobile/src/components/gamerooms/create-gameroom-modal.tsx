import { Text } from '@/components/ui/text';
import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import { AlignLeft, Calendar, Clock, DollarSign, Gamepad2, MapPin, type LucideIcon, Sparkles, Trophy, Users } from 'lucide-react-native';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { z } from 'zod';

import { LocationPicker } from '@/components/map/location-picker';
import { DateTimeField } from '@/components/ui/date-time-field';
import { Input } from '@/components/ui/input';
import { PopupModal } from '@/components/ui/popup-modal';
import { LoadingState } from '@/components/brand/loading-state';
import { SelectDropdown, type SelectOption } from '@/components/ui/select-dropdown';
import { useCreateGameroomMutation, useUpdateGameroomMutation } from '@/hooks/queries/use-gamerooms';
import { useCourtsQuery, useSportsQuery } from '@/hooks/queries/use-courts';
import { isActiveSportName, SPORTS, SPORT_KEY_BY_NAME } from '@/lib/constants';
import { parseCostInputToVnd, storedCostToInput } from '@/lib/price';
import { getVietnamDate, slotStart, toVietnamDateInput, toVietnamTimeInput } from '@/lib/slots';
import type { MatchResponse } from '@/schemas/gamerooms';
import { ctaGradient } from '@/theme/colors';
import { cn } from '@/lib/utils';
import { showToast } from '@/stores/toast-store';

/** Same wording as the web form, which spells out what each level means. */
const LEVEL_OPTIONS: SelectOption[] = [
  { value: 'Beginner', label: 'Mới tập / Vui là chính' },
  { value: 'Intermediate', label: 'Trung bình / Đều tay' },
  { value: 'Advanced', label: 'Khá / Giỏi (Đánh bao sân)' },
  { value: 'Expert', label: 'Chuyên nghiệp (Thi đấu giải)' },
];

const formSchema = z
  .object({
    sportId: z.string().min(1, 'Chọn môn thể thao'),
    courtId: z.string().optional(),
    title: z.string().trim().min(1, 'Nhập tên phòng').max(200),
    location: z.string().trim().max(255).optional(),
    requiredLevel: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng YYYY-MM-DD'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Định dạng HH:mm'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Định dạng HH:mm'),
    maxPlayers: z
      .string()
      .trim()
      .refine((v) => /^\d+$/.test(v) && Number(v) >= 2, 'Tối thiểu 2 người'),
    priceInfo: z
      .string()
      .trim()
      .refine((v) => parseCostInputToVnd(v) !== null, 'Nhập số nguyên theo nghìn đồng, ví dụ 50 hoặc 50.000'),
    description: z.string().optional(),
  })
  .refine((values) => slotStart(values.date, values.endTime) > slotStart(values.date, values.startTime), {
    message: 'Giờ kết thúc phải sau giờ bắt đầu',
    path: ['endTime'],
  });

type FormValues = z.infer<typeof formSchema>;

interface CreateGameroomModalProps {
  visible: boolean;
  onClose: () => void;
  /** When set, the modal edits this room instead of creating a new one. */
  room?: MatchResponse | null;
}

const defaultValues = (): FormValues => ({
  sportId: '',
  courtId: 'none',
  title: '',
  location: '',
  requiredLevel: 'Intermediate',
  date: getVietnamDate(),
  startTime: '19:00',
  endTime: '21:00',
  maxPlayers: '6',
  priceInfo: '',
  description: '',
});

function roomToFormValues(room: MatchResponse): FormValues {
  return {
    sportId: String(room.sport_id),
    courtId: room.court_id ? String(room.court_id) : 'none',
    title: room.title,
    location: room.location ?? '',
    requiredLevel: room.required_level,
    date: toVietnamDateInput(room.start_time),
    startTime: toVietnamTimeInput(room.start_time),
    endTime: toVietnamTimeInput(room.end_time),
    maxPlayers: String(room.max_players),
    priceInfo: storedCostToInput(room.price_info),
    description: room.description ?? '',
  };
}

/** Emoji shown on a sport's picker card, keyed off the API's Vietnamese sport name. */
function sportEmoji(name: string): string {
  const key = SPORT_KEY_BY_NAME[name.trim().toLowerCase()];
  return SPORTS.find((s) => s.key === key)?.emoji ?? '🏅';
}

function FieldLabel({
  icon: Icon,
  iconColor = '#94A3B8',
  required,
  hint,
  children,
}: {
  icon?: LucideIcon;
  iconColor?: string;
  required?: boolean;
  hint?: string;
  children: string;
}) {
  return (
    <View className="mb-2 flex-row flex-wrap items-center gap-1.5">
      {Icon ? <Icon size={13} color={iconColor} /> : null}
      <Text className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {children}
        {required ? <Text className="text-rose-500"> *</Text> : null}
      </Text>
      {hint ? <Text className="text-[11px] font-semibold text-amber-500">{hint}</Text> : null}
    </View>
  );
}

export function CreateGameroomModal({ visible, onClose, room }: CreateGameroomModalProps) {
  const { data: sports, isLoading: isLoadingSports } = useSportsQuery();
  const createRoom = useCreateGameroomMutation();
  const updateRoom = useUpdateGameroomMutation();
  const isEditing = Boolean(room);
  const saveMutation = isEditing ? updateRoom : createRoom;
  const availableSports = (sports ?? []).filter((s) => s.id != null && isActiveSportName(s.name));

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues(),
  });

  // Seed the form each time the modal opens: from the room when editing, blank when creating.
  useEffect(() => {
    if (visible) reset(room ? roomToFormValues(room) : defaultValues());
  }, [visible, room, reset]);

  const selectedSportId = useWatch({ control, name: 'sportId' });
  const { data: courtsForSport } = useCourtsQuery(
    selectedSportId ? { sport_id: Number(selectedSportId) } : {},
  );
  const courtOptions: SelectOption[] = [
    { value: 'none', label: 'Không chọn sân cụ thể' },
    ...(courtsForSport ?? []).map((court) => ({
      value: String(court.id),
      label: `${court.venue.name} · ${court.name}`,
    })),
  ];

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = handleSubmit(async (values) => {
    const priceVnd = parseCostInputToVnd(values.priceInfo)!;
    try {
      const payload = {
        title: values.title,
        description: values.description?.trim() || undefined,
        location: values.location?.trim() || undefined,
        price_info: String(priceVnd / 1000),
        sport_id: Number(values.sportId),
        court_id: values.courtId && values.courtId !== 'none' ? Number(values.courtId) : undefined,
        required_level: values.requiredLevel,
        start_time: slotStart(values.date, values.startTime).toISOString(),
        end_time: slotStart(values.date, values.endTime).toISOString(),
        max_players: Number(values.maxPlayers),
      };
      if (room) await updateRoom.mutateAsync({ id: room.id, data: payload });
      else await createRoom.mutateAsync(payload);
      handleClose();
      showToast(room ? 'Đã cập nhật phòng chơi.' : 'Đã tạo phòng chơi.');
    } catch {
      // Mutation error is surfaced below the form.
    }
  });

  return (
    <PopupModal
      visible={visible}
      onClose={handleClose}
      title={isEditing ? 'Chỉnh sửa phòng chờ' : 'Mở phòng chờ thi đấu'}
      subtitle="Tạo sảnh chờ tìm bạn chơi phù hợp theo trình độ và thời gian"
      icon={Gamepad2}
      bodyClassName="gap-4"
      footer={
        <View className="flex-row items-center justify-end gap-3">
      <TouchableOpacity onPress={handleClose} className="px-3 py-3">
        <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">Hủy</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={submit}
        disabled={saveMutation.isPending}
        className={cn('overflow-hidden rounded-xl', saveMutation.isPending && 'opacity-50')}
      >
        <LinearGradient
          colors={ctaGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16 }}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Sparkles size={15} color="#fff" />
              <Text className="text-sm font-bold text-white">{isEditing ? 'Lưu thay đổi' : 'Tạo Phòng Ngay'}</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
        </View>
      }
    >
      {isLoadingSports ? (
        <LoadingState label="Đang tải danh sách môn thể thao…" />
      ) : (
        <>
        <View>
          <FieldLabel required>Chọn môn thể thao</FieldLabel>
          <Controller
            control={control}
            name="sportId"
            render={({ field }) => (
              <View className="flex-row flex-wrap gap-2">
                {availableSports.map((sport) => {
                  const isSelected = field.value === String(sport.id);
                  return (
                    <TouchableOpacity
                      key={sport.id}
                      onPress={() => {
                        field.onChange(String(sport.id));
                        setValue('courtId', 'none');
                      }}
                      className={cn(
                        'basis-[31%] items-center gap-1 rounded-2xl border-2 px-2 py-3',
                        isSelected
                          ? 'border-brand bg-brand/10 dark:border-brand-dark dark:bg-brand-dark/10'
                          : 'border-border bg-white dark:border-border-dark dark:bg-white/5',
                      )}
                    >
                      <Text className="text-2xl">{sportEmoji(sport.name)}</Text>
                      <Text
                        className={cn(
                          'text-xs font-bold',
                          isSelected ? 'text-brand dark:text-brand-dark' : 'text-slate-700 dark:text-slate-200',
                        )}
                      >
                        {sport.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          />
          {errors.sportId ? (
            <Text className="mt-1 text-xs font-semibold text-rose-500">{errors.sportId.message}</Text>
          ) : null}
        </View>

        <View>
          <FieldLabel required>Tên phòng / tiêu đề kèo đấu</FieldLabel>
          <Controller
            control={control}
            name="title"
            render={({ field }) => (
              <Input
                placeholder="VD: Kèo Cầu lông giao lưu tối thứ 4 trình Trung bình, có bao cầu…"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.title?.message}
              />
            )}
          />
        </View>

        <View>
          <FieldLabel icon={Trophy} iconColor="#F59E0B">
            Trình độ yêu cầu
          </FieldLabel>
          <Controller
            control={control}
            name="requiredLevel"
            render={({ field }) => (
              <SelectDropdown
                className="h-12 w-full bg-white dark:bg-[#0d1424]"
                value={field.value}
                options={LEVEL_OPTIONS}
                onChange={field.onChange}
              />
            )}
          />
        </View>

        <View>
          <FieldLabel icon={MapPin} iconColor="#F43F5E" required>
            Địa điểm / sân thi đấu
          </FieldLabel>
          <Controller
            control={control}
            name="location"
            render={({ field }) => (
              <LocationPicker
                placeholder="Nhập tên sân, địa chỉ hoặc bấm 'Map' để chọn trên bản đồ..."
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.location?.message}
              />
            )}
          />
          {courtOptions.length > 1 ? (
            <Controller
              control={control}
              name="courtId"
              render={({ field }) => (
                <SelectDropdown
                  className="mt-2 h-11 w-full bg-white dark:bg-[#0d1424]"
                  value={field.value ?? 'none'}
                  options={courtOptions}
                  onChange={(value) => {
                    field.onChange(value);
                    const court = (courtsForSport ?? []).find((c) => String(c.id) === value);
                    if (court) setValue('location', court.venue.name);
                  }}
                />
              )}
            />
          ) : null}
        </View>

        <View>
          <View>
            <FieldLabel icon={Calendar} iconColor="#F59E0B">
              Ngày thi đấu
            </FieldLabel>
            <Controller
              control={control}
              name="date"
              render={({ field }) => (
                <DateTimeField mode="date" value={field.value} onChange={field.onChange} error={errors.date?.message} />
              )}
            />
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <FieldLabel icon={Clock} iconColor="#3B82F6">
              Bắt đầu
            </FieldLabel>
            <Controller
              control={control}
              name="startTime"
              render={({ field }) => (
                <DateTimeField mode="time" value={field.value} onChange={field.onChange} error={errors.startTime?.message} />
              )}
            />
          </View>
          <View className="flex-1">
            <FieldLabel icon={Clock} iconColor="#3B82F6">
              Kết thúc
            </FieldLabel>
            <Controller
              control={control}
              name="endTime"
              render={({ field }) => (
                <DateTimeField mode="time" value={field.value} onChange={field.onChange} error={errors.endTime?.message} />
              )}
            />
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <FieldLabel icon={Users} iconColor="#3B82F6">
              Tổng số người chơi tối đa
            </FieldLabel>
            <Controller
              control={control}
              name="maxPlayers"
              render={({ field }) => (
                <Input
                  keyboardType="number-pad"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.maxPlayers?.message}
                />
              )}
            />
            {!errors.maxPlayers ? (
              <Text className="mt-1 text-[11px] font-semibold text-amber-500">(tính luôn cả chủ bài đăng)</Text>
            ) : null}
          </View>
          <View className="flex-1">
            <FieldLabel icon={DollarSign} iconColor="#10B981" required>
              Chi phí/người (nghìn đồng)
            </FieldLabel>
            <Controller
              control={control}
              name="priceInfo"
              render={({ field }) => (
                <Input
                  placeholder="VD: 50 hoặc 50.000"
                  keyboardType="number-pad"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.priceInfo?.message}
                />
              )}
            />
            {!errors.priceInfo ? (
              <Text className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                Nhập 50 = 50.000đ; có thể nhập 50.000. Không nhập số thập phân.
              </Text>
            ) : null}
          </View>
        </View>

        <View>
          <FieldLabel icon={AlignLeft} iconColor="#8B5CF6">
            Mô tả chi tiết & ghi chú
          </FieldLabel>
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <Input
                placeholder="Ghi chú thêm về quy định sân, chuẩn bị dụng cụ (cầu, vợt, nước uống), sđt liên hệ…"
                multiline
                numberOfLines={3}
                className="h-24 py-3"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </View>

        {saveMutation.isError ? (
          <View className="rounded-xl bg-rose-50 px-3 py-2.5 dark:bg-rose-500/10">
            <Text className="text-sm font-semibold text-rose-600 dark:text-rose-300">
              {saveMutation.error instanceof Error
                ? saveMutation.error.message
                : isEditing
                  ? 'Không cập nhật được phòng'
                  : 'Không tạo được phòng'}
            </Text>
          </View>
        ) : null}
        </>
      )}
    </PopupModal>
  );
}
