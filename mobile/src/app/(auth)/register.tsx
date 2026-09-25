import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { CheckCircle, Eye, EyeOff, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { ScreenContainer } from '@/components/brand/screen-container';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';

const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Vui lòng nhập tên'),
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const register = useAuthStore((s) => s.register);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: RegisterForm) => {
    setFormError('');
    try {
      await register({ name: data.name, email: data.email, password: data.password });
      setSuccess(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Đăng ký thất bại');
    }
  };

  if (success) {
    return (
      <ScreenContainer className="items-center justify-center gap-4" scroll={false}>
        <CheckCircle size={56} color="#0EA5E9" />
        <Text className="text-2xl font-black text-slate-900 dark:text-white">Đăng ký thành công!</Text>
        <Text className="text-center text-sm text-slate-500 dark:text-slate-400">
          Tài khoản của bạn đã được tạo. Hãy đăng nhập để bắt đầu.
        </Text>
        <Button label="Quay lại Đăng nhập" onPress={() => router.replace('/(auth)/login')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="justify-center gap-6" scroll>
      <View className="items-center gap-3">
        <View
          className="h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 dark:bg-brand-dark/10"
          style={{ shadowColor: '#0EA5E9', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } }}
        >
          <UserPlus size={26} color="#0EA5E9" />
        </View>
        <View className="items-center">
          <Text className="text-2xl font-black text-slate-900 dark:text-white">Tạo tài khoản</Text>
          <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">Hành trình bắt đầu từ đây</Text>
        </View>
      </View>

      <View className="gap-4">
        <View>
          <Text className="mb-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">Họ và tên</Text>
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <Input
                placeholder="Nguyễn Văn A"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.name?.message}
              />
            )}
          />
        </View>

        <View>
          <Text className="mb-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">Email</Text>
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

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">Mật khẩu</Text>
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <View className="relative justify-center">
                  <Input
                    placeholder="Tối thiểu 6 ký tự"
                    secureTextEntry={!showPassword}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.password?.message}
                    className="pr-11"
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)} className="absolute right-3" hitSlop={8}>
                    {showPassword ? <EyeOff size={16} color="#94A3B8" /> : <Eye size={16} color="#94A3B8" />}
                  </Pressable>
                </View>
              )}
            />
          </View>

          <View className="flex-1">
            <Text className="mb-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">Xác nhận MK</Text>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field }) => (
                <Input
                  placeholder="Nhập lại"
                  secureTextEntry={!showPassword}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.confirmPassword?.message}
                />
              )}
            />
          </View>
        </View>

        {formError ? (
          <View className="rounded-xl bg-rose-50 px-3 py-2.5 dark:bg-rose-500/10">
            <Text className="text-sm font-semibold text-rose-600 dark:text-rose-300">{formError}</Text>
          </View>
        ) : null}

        <Button label="Hoàn tất Đăng ký" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      </View>

      <View className="flex-row justify-center gap-1">
        <Text className="text-sm text-slate-500 dark:text-slate-400">Đã có tài khoản?</Text>
        <Link href="/(auth)/login" asChild>
          <Pressable>
            <Text className="text-sm font-bold text-brand dark:text-brand-dark">Đăng nhập</Text>
          </Pressable>
        </Link>
      </View>
    </ScreenContainer>
  );
}
