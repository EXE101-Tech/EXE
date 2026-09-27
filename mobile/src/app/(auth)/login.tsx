import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { Eye, EyeOff, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ScreenContainer } from '@/components/brand/screen-container';
import { Input } from '@/components/ui/input';
import { userLoginSchema, type UserLogin } from '@/schemas/auth';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserLogin>({
    resolver: zodResolver(userLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: UserLogin) => {
    setFormError('');
    try {
      await login(data);
      router.replace('/(tabs)/profile');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Đăng nhập thất bại');
    }
  };

  return (
    <ScreenContainer className="justify-center gap-6" scroll={false}>
      <View className="items-center gap-3">
        <View
          className="h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 dark:bg-brand-dark/10"
          style={{ shadowColor: '#0EA5E9', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } }}
        >
          <Zap size={26} color="#0EA5E9" />
        </View>
        <View className="items-center">
          <Text className="text-2xl font-black text-slate-900 dark:text-white">Đăng nhập</Text>
          <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">Chào mừng trở lại với SportGo</Text>
        </View>
      </View>

      <View className="gap-4">
        <View>
          <Text className="mb-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">Địa chỉ Email</Text>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Input
                placeholder="your@email.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.email?.message}
              />
            )}
          />
        </View>

        <View>
          <View className="mb-1.5 flex-row items-center justify-between">
            <Text className="text-sm font-bold text-slate-700 dark:text-slate-200">Mật khẩu</Text>
            <Text className="text-xs font-bold text-brand dark:text-brand-dark">Quên mật khẩu?</Text>
          </View>
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <View className="relative justify-center">
                <Input
                  placeholder="Nhập mật khẩu"
                  secureTextEntry={!showPassword}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.password?.message}
                  className="pr-12"
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} className="absolute right-4" hitSlop={8}>
                  {showPassword ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
                </Pressable>
              </View>
            )}
          />
        </View>

        {formError ? (
          <View className="rounded-xl bg-rose-50 px-3 py-2.5 dark:bg-rose-500/10">
            <Text className="text-sm font-semibold text-rose-600 dark:text-rose-300">{formError}</Text>
          </View>
        ) : null}

        <Button label="Đăng nhập" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />

        <View className="flex-row items-center gap-3">
          <View className="h-px flex-1 bg-border dark:bg-border-dark" />
          <Text className="text-[11px] font-bold uppercase text-slate-400">Hoặc đăng nhập qua</Text>
          <View className="h-px flex-1 bg-border dark:bg-border-dark" />
        </View>

        <Button
          variant="outline"
          label="Google"
          onPress={() => Alert.alert('Sắp ra mắt', 'Đăng nhập bằng Google sẽ có ở giai đoạn tiếp theo.')}
        />
      </View>

      <View className="flex-row justify-center gap-1">
        <Text className="text-sm text-slate-500 dark:text-slate-400">Chưa có tài khoản?</Text>
        <Link href="/(auth)/register" asChild>
          <Pressable>
            <Text className="text-sm font-bold text-brand dark:text-brand-dark">Đăng ký ngay</Text>
          </Pressable>
        </Link>
      </View>
    </ScreenContainer>
  );
}
