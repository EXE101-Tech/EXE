import { Text } from '@/components/ui/text';
import { Redirect, router } from 'expo-router';
import { ArrowLeft, ArrowRight, Check, MapPin, Trophy, UserRound, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { GradientButton } from '@/components/brand/gradient-button';
import { ScreenContainer } from '@/components/brand/screen-container';
import { Button } from '@/components/ui/button';
import { SelectDropdown, type SelectOption } from '@/components/ui/select-dropdown';
import { useUpdateProfileMutation } from '@/hooks/queries/use-auth';
import { ACTIVITY_DISTRICTS, SPORTS, type SportKey } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

const SPORT_DESCRIPTIONS: Partial<Record<SportKey, string>> = {
  badminton: 'Nhanh, vui và dễ tìm bạn chơi',
  pickleball: 'Môn thể thao đang phát triển',
  football: 'Kết nối đội hình cùng khu vực',
};

const LEVELS = [
  { value: 'Beginner', label: 'Mới chơi', description: 'Chơi vui, đang làm quen' },
  { value: 'Intermediate', label: 'Trung bình', description: 'Đã chơi thường xuyên' },
  { value: 'Advanced', label: 'Khá', description: 'Tự tin trong các trận đấu' },
  { value: 'Expert', label: 'Nâng cao', description: 'Kinh nghiệm và kỹ thuật tốt' },
];

const DISTRICT_OPTIONS: SelectOption[] = [
  { value: '', label: 'Chọn quận/khu vực' },
  ...ACTIVITY_DISTRICTS.map((district) => ({ value: district, label: district })),
];

const MAX_SPORTS = 3;
const LAST_FORM_STEP = 3;
const DONE_STEP = 4;

export default function OnboardingScreen() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const onboardingPending = useAuthStore((s) => s.onboardingPending);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const updateProfile = useUpdateProfileMutation();

  const [step, setStep] = useState(0);
  const [selectedSports, setSelectedSports] = useState<SportKey[]>([]);
  const [skills, setSkills] = useState<Partial<Record<SportKey, string>>>({});
  const [district, setDistrict] = useState('');
  const [error, setError] = useState('');

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!onboardingPending) return <Redirect href="/(tabs)/forum" />;

  const toggleSport = (key: SportKey) => {
    if (selectedSports.includes(key)) {
      setSelectedSports((current) => current.filter((item) => item !== key));
      setSkills((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      return;
    }
    if (selectedSports.length < MAX_SPORTS) setSelectedSports((current) => [...current, key]);
  };

  const canContinue =
    step === 1
      ? selectedSports.length > 0
      : step === 2
        ? selectedSports.every((key) => skills[key])
        : step === LAST_FORM_STEP
          ? Boolean(district)
          : true;

  const save = async () => {
    if (!canContinue || updateProfile.isPending) return;
    setError('');
    try {
      await updateProfile.mutateAsync({
        district,
        sports: Object.fromEntries(selectedSports.map((key) => [key, skills[key] as string])),
      });
      setStep(DONE_STEP);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu thông tin. Vui lòng thử lại.');
    }
  };

  const finish = async () => {
    await completeOnboarding();
    router.replace('/(tabs)/forum');
  };

  const showProgress = step > 0 && step < DONE_STEP;

  return (
    <ScreenContainer className="gap-6 py-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand/10 dark:bg-brand-dark/10">
            <Zap size={18} color="#537fff" fill="#537fff" />
          </View>
          <Text className="text-lg font-black text-slate-900 dark:text-white">SPORTGO</Text>
        </View>
        {showProgress ? (
          <Text className="rounded-full border border-border px-3 py-1 text-xs font-bold text-slate-500 dark:border-border-dark dark:text-slate-300">
            Bước {step}/{LAST_FORM_STEP}
          </Text>
        ) : null}
      </View>

      {showProgress ? (
        <View className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <View
            className="h-full rounded-full bg-brand dark:bg-brand-dark"
            style={{ width: `${(step / LAST_FORM_STEP) * 100}%` }}
          />
        </View>
      ) : null}

      <View className="flex-1 justify-center gap-6">
        {step === 0 ? (
          <View className="items-center gap-4">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-brand/10 dark:bg-brand-dark/10">
              <Zap size={44} color="#537fff" fill="#537fff" />
            </View>
            <Text className="text-sm font-black uppercase tracking-widest text-brand dark:text-brand-dark">
              Xin chào, {user?.name || 'bạn'}!
            </Text>
            <Text className="text-center text-3xl font-black text-slate-900 dark:text-white">
              Chào mừng bạn đến với thế giới thể thao
            </Text>
            <Text className="text-center text-sm leading-6 text-slate-500 dark:text-slate-400">
              Hãy cho SportGo biết một chút về bạn để tìm những trận chơi phù hợp và kết nối với cộng đồng gần bạn.
            </Text>
          </View>
        ) : null}

        {step === 1 ? (
          <View className="gap-4">
            <View className="items-center gap-2">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-indigo-400/15">
                <Trophy size={28} color="#6366F1" />
              </View>
              <Text className="text-center text-2xl font-black text-slate-900 dark:text-white">
                Bạn thường chơi môn nào?
              </Text>
              <Text className="text-center text-sm text-slate-500 dark:text-slate-400">
                Chọn từ 1 đến {MAX_SPORTS} môn để SportGo gợi ý đúng hơn.
              </Text>
            </View>
            <View className="gap-3">
              {SPORTS.map((sport) => {
                const selected = selectedSports.includes(sport.key);
                return (
                  <Pressable
                    key={sport.key}
                    onPress={() => toggleSport(sport.key)}
                    className={cn(
                      'flex-row items-center gap-4 rounded-2xl border p-4',
                      selected
                        ? 'border-brand bg-brand/10 dark:border-brand-dark dark:bg-brand-dark/10'
                        : 'border-border bg-white dark:border-border-dark dark:bg-white/5',
                    )}
                  >
                    <Text className="text-4xl">{sport.emoji}</Text>
                    <View className="flex-1">
                      <Text className="text-base font-black text-slate-900 dark:text-white">{sport.name}</Text>
                      <Text className="text-xs text-slate-500 dark:text-slate-400">
                        {SPORT_DESCRIPTIONS[sport.key]}
                      </Text>
                    </View>
                    {selected ? (
                      <View className="h-7 w-7 items-center justify-center rounded-full bg-brand dark:bg-brand-dark">
                        <Check size={16} color="#fff" />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View className="gap-4">
            <View className="items-center gap-2">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/15">
                <UserRound size={28} color="#0891B2" />
              </View>
              <Text className="text-center text-2xl font-black text-slate-900 dark:text-white">
                Trình độ của bạn thế nào?
              </Text>
              <Text className="text-center text-sm text-slate-500 dark:text-slate-400">
                Chọn trình độ cho từng môn bạn đã chọn.
              </Text>
            </View>
            <View className="gap-4">
              {SPORTS.filter((sport) => selectedSports.includes(sport.key)).map((sport) => (
                <View
                  key={sport.key}
                  className="gap-3 rounded-2xl border border-border bg-white p-4 dark:border-border-dark dark:bg-white/5"
                >
                  <Text className="text-base font-black text-slate-900 dark:text-white">
                    {sport.emoji} {sport.name}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {LEVELS.map((level) => {
                      const selected = skills[sport.key] === level.value;
                      return (
                        <Pressable
                          key={level.value}
                          onPress={() => setSkills((current) => ({ ...current, [sport.key]: level.value }))}
                          className={cn(
                            'w-[48%] rounded-xl border px-3 py-2.5',
                            selected
                              ? 'border-brand bg-brand/10 dark:border-brand-dark dark:bg-brand-dark/10'
                              : 'border-border dark:border-border-dark',
                          )}
                        >
                          <Text className="text-sm font-black text-slate-900 dark:text-white">{level.label}</Text>
                          <Text className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {level.description}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {step === LAST_FORM_STEP ? (
          <View className="gap-4">
            <View className="items-center gap-2">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/15">
                <MapPin size={28} color="#0891B2" />
              </View>
              <Text className="text-center text-2xl font-black text-slate-900 dark:text-white">
                Bạn thường hoạt động ở đâu?
              </Text>
              <Text className="text-center text-sm text-slate-500 dark:text-slate-400">
                Chọn quận để SportGo tìm người chơi và lời mời gần bạn.
              </Text>
            </View>
            <View>
              <Text className="mb-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">Khu vực hoạt động</Text>
              <SelectDropdown
                icon={MapPin}
                iconColor="#F43F5E"
                value={district}
                options={DISTRICT_OPTIONS}
                onChange={setDistrict}
              />
              <Text className="mt-2 text-xs text-slate-500">
                Bạn có thể chỉnh sửa khu vực này sau trong mục Hồ sơ.
              </Text>
            </View>
          </View>
        ) : null}

        {step === DONE_STEP ? (
          <View className="items-center gap-4">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-emerald-500">
              <Check size={48} color="#fff" />
            </View>
            <Text className="text-sm font-black uppercase tracking-widest text-emerald-500">Hồ sơ đã sẵn sàng</Text>
            <Text className="text-center text-3xl font-black text-slate-900 dark:text-white">
              Cùng SportGo bắt đầu nhé!
            </Text>
            <Text className="text-center text-sm leading-6 text-slate-500 dark:text-slate-400">
              Bạn có thể chỉnh sửa các môn chơi, trình độ và khu vực hoạt động bất cứ lúc nào trong mục Hồ sơ.
            </Text>
          </View>
        ) : null}

        {error ? (
          <View className="rounded-xl bg-rose-50 px-3 py-2.5 dark:bg-rose-500/10">
            <Text className="text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</Text>
          </View>
        ) : null}
      </View>

      <View className="gap-3">
        {step === 0 ? (
          <GradientButton
            label="Bắt đầu thiết lập"
            icon={<ArrowRight size={18} color="#fff" />}
            onPress={() => setStep(1)}
          />
        ) : null}

        {step >= 1 && step < LAST_FORM_STEP ? (
          <GradientButton
            label="Tiếp tục"
            icon={<ArrowRight size={18} color="#fff" />}
            disabled={!canContinue}
            onPress={() => setStep(step + 1)}
          />
        ) : null}

        {step === LAST_FORM_STEP ? (
          <GradientButton
            label="Hoàn tất thiết lập"
            icon={<Check size={18} color="#fff" />}
            disabled={!canContinue}
            loading={updateProfile.isPending}
            onPress={save}
          />
        ) : null}

        {step >= 1 && step < DONE_STEP ? (
          <Button
            variant="ghost"
            onPress={() => {
              setError('');
              setStep(step - 1);
            }}
          >
            <ArrowLeft size={16} color="#94A3B8" />
            <Text className="text-sm font-bold text-slate-500 dark:text-slate-400">Quay lại</Text>
          </Button>
        ) : null}

        {step === DONE_STEP ? (
          <GradientButton label="Bắt đầu khám phá" icon={<ArrowRight size={18} color="#fff" />} onPress={finish} />
        ) : null}
      </View>
    </ScreenContainer>
  );
}
