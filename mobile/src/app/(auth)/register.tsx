import { Text } from '@/components/ui/text';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import { Check, Eye, EyeOff, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { z } from 'zod';

import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { Button } from '@/components/ui/button';
import { ScreenContainer } from '@/components/brand/screen-container';
import { Input } from '@/components/ui/input';
import { userCreateSchema } from '@/schemas/auth';
import { useAuthStore } from '@/stores/auth-store';

const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Vui lòng nhập tên'),
    email: userCreateSchema.shape.email,
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);

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
      if (!acceptedTerms) {
        setFormError('Vui lòng chấp nhận quy tắc cộng đồng trước khi tạo tài khoản.');
        return;
      }
      await register({ name: data.name, email: data.email, password: data.password, accepted_terms: true });
      // Account is created and signed in; new users go straight to onboarding.
      router.replace('/onboarding');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Đăng ký thất bại');
    }
  };

  return (
    <ScreenContainer className="justify-center gap-6" scroll>
      <View className="items-center gap-3">
        <View
          className="h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 dark:bg-brand-dark/10"
          style={{ shadowColor: '#537fff', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } }}
        >
          <UserPlus size={26} color="#537fff" />
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
                placeholder="you@gmail.com"
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

        <Pressable onPress={() => setAcceptedTerms((value) => !value)} className="flex-row items-start gap-2">
          <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-md border border-border dark:border-border-dark" style={{ backgroundColor: acceptedTerms ? '#537fff' : 'transparent' }}>
            {acceptedTerms ? <Check size={14} color="#fff" /> : null}
          </View>
          <Text className="flex-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Tôi đồng ý tuân thủ quy tắc cộng đồng SportGo và đã đọc chính sách quyền riêng tư.
          </Text>
        </Pressable>

        <View className="flex-row items-center gap-3">
          <View className="h-px flex-1 bg-border dark:bg-border-dark" />
          <Text className="text-[11px] font-bold uppercase text-slate-400">Hoặc đăng ký qua</Text>
          <View className="h-px flex-1 bg-border dark:bg-border-dark" />
        </View>

        <GoogleSignInButton acceptedTerms={acceptedTerms} onError={setFormError} />
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
