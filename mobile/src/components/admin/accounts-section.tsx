import { Text } from '@/components/ui/text';
import { Search, Shield, Trash2, UserPlus, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/brand/empty-state';
import { LoadingState } from '@/components/brand/loading-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useAdminAccountsQuery,
  useAdminUsersQuery,
  useCreateAdminAccountMutation,
  useDeleteAdminAccountMutation,
  useDeleteUserMutation,
} from '@/hooks/queries/use-admin';
import { adminAccountCreateSchema } from '@/schemas/admin';
import { useAuthStore } from '@/stores/auth-store';
import {
  AdminRow,
  SectionHeading,
  ShowMoreButton,
  confirmAction,
  formatDateTimeVi,
  showError,
  useShowMore,
} from './admin-ui';

type Notify = (message: string) => void;

/** "Tài khoản admin": the admin list, plus the form that grants another admin account. */
export function AdminAccountsSection({ notify }: { notify: Notify }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const accounts = useAdminAccountsQuery();
  const remove = useDeleteAdminAccountMutation();
  const { visible, remaining, showMore } = useShowMore(accounts.data ?? []);

  const askRemove = (id: number, name: string) =>
    confirmAction({
      title: 'Xóa tài khoản admin',
      message: `Xóa tài khoản admin ${name}? Tài khoản sẽ không thể đăng nhập lại.`,
      confirmLabel: 'Xóa',
      onConfirm: () =>
        remove.mutate(id, {
          onSuccess: () => notify(`Đã xóa tài khoản admin ${name}.`),
          onError: (error) => showError(error, 'Không thể xóa tài khoản admin.'),
        }),
    });

  return (
    <View className="gap-4">
      <CreateAdminForm notify={notify} />

      <View className="gap-3">
        <SectionHeading icon={Shield} iconColor="#537fff" title="Tài khoản quản trị" hint={`${accounts.data?.length ?? 0} tài khoản`} />
        {accounts.isLoading ? (
          <LoadingState label="Đang tải tài khoản admin…" />
        ) : accounts.isError ? (
          <EmptyState title="Không tải được tài khoản admin" description="Kéo xuống để tải lại." />
        ) : (
          visible.map((account) => {
            const name = account.profile?.full_name || account.email;
            const isSelf = account.id === currentUserId;
            return (
              <AdminRow key={account.id}>
                <View className="flex-row items-center justify-between gap-3">
                  <View className="min-w-0 flex-1">
                    <Text className="font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                      {name}
                    </Text>
                    <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={1} selectable>
                      {account.email}
                    </Text>
                  </View>
                  <Badge variant="success" label="Admin" />
                </View>
                {isSelf ? (
                  <Text className="text-xs text-slate-400">Tài khoản hiện tại</Text>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={remove.isPending && remove.variables === account.id}
                    onPress={() => askRemove(account.id, name)}
                    className="self-start border-rose-400/50"
                  >
                    <Trash2 size={14} color="#E11D48" />
                    <Text className="text-sm font-bold text-rose-600 dark:text-rose-400">Xóa tài khoản</Text>
                  </Button>
                )}
              </AdminRow>
            );
          })
        )}
        <ShowMoreButton remaining={remaining} onPress={showMore} />
      </View>

      <Text className="rounded-2xl border border-border p-4 text-xs leading-5 text-slate-500 dark:border-border-dark dark:text-slate-400">
        <Text className="text-xs font-bold text-slate-700 dark:text-slate-200">Quyền của admin: </Text>
        tài khoản quản trị chỉ xem và kiểm duyệt. Like, bình luận, tạo bài, tạo phòng, tạo CLB và tham gia nội dung bị
        chặn ở backend.
      </Text>
    </View>
  );
}

function CreateAdminForm({ notify }: { notify: Notify }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const create = useCreateAdminAccountMutation();

  const submit = () => {
    const parsed = adminAccountCreateSchema.safeParse(form);
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof form;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    create.mutate(parsed.data, {
      onSuccess: () => {
        setForm({ name: '', email: '', password: '' });
        notify('Đã cấp tài khoản admin mới.');
      },
      onError: (error) => showError(error, 'Không thể tạo tài khoản admin.'),
    });
  };

  const update = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <View className="gap-3 rounded-2xl border border-border bg-white p-4 dark:border-border-dark dark:bg-[#111827]">
      <SectionHeading icon={UserPlus} iconColor="#537fff" title="Cấp tài khoản admin" />
      <Input placeholder="Họ tên" value={form.name} onChangeText={update('name')} error={errors.name} />
      <Input
        placeholder="Email"
        value={form.email}
        onChangeText={update('email')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        error={errors.email}
      />
      <Input
        placeholder="Mật khẩu (tối thiểu 6 ký tự)"
        value={form.password}
        onChangeText={update('password')}
        secureTextEntry
        autoCapitalize="none"
        error={errors.password}
      />
      <Button label="Cấp tài khoản" loading={create.isPending} onPress={submit} />
    </View>
  );
}

/** "Danh sách tài khoản": member accounts, searchable, with delete. Admin accounts are protected by the server. */
export function UsersSection({ notify }: { notify: Notify }) {
  const users = useAdminUsersQuery();
  const remove = useDeleteUserMutation();
  const [query, setQuery] = useState('');

  const term = query.trim().toLowerCase();
  const filtered = (users.data ?? []).filter(
    (user) => !term || user.email.toLowerCase().includes(term) || (user.profile?.full_name ?? '').toLowerCase().includes(term),
  );
  const { visible, remaining, showMore } = useShowMore(filtered);

  const askRemove = (id: number, name: string) =>
    confirmAction({
      title: 'Xóa tài khoản',
      message: `Xóa tài khoản ${name}? Tài khoản sẽ không thể đăng nhập lại.`,
      confirmLabel: 'Xóa',
      onConfirm: () =>
        remove.mutate(id, {
          onSuccess: () => notify(`Đã xóa tài khoản ${name}.`),
          onError: (error) => showError(error, 'Không thể xóa tài khoản.'),
        }),
    });

  return (
    <View className="gap-3">
      <SectionHeading
        icon={UserRound}
        iconColor="#537fff"
        title={`Danh sách tài khoản (${users.data?.length ?? 0})`}
        hint="Admin được bảo vệ"
      />
      <View className="flex-row items-center gap-2 rounded-xl border border-border bg-white px-3 dark:border-border-dark dark:bg-[#0d1424]">
        <Search size={14} color="#94A3B8" />
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm theo tên hoặc email…"
          autoCapitalize="none"
          autoCorrect={false}
          containerClassName="flex-1"
          className="h-11 border-0 bg-transparent px-1 text-sm dark:bg-transparent"
        />
      </View>

      {users.isLoading ? (
        <LoadingState label="Đang tải tài khoản…" />
      ) : users.isError ? (
        <EmptyState title="Không tải được tài khoản" description="Kéo xuống để tải lại." />
      ) : visible.length === 0 ? (
        <EmptyState icon={UserRound} title={term ? 'Không tìm thấy tài khoản phù hợp.' : 'Chưa có tài khoản người dùng.'} />
      ) : (
        visible.map((user) => {
          const name = user.profile?.full_name || user.email;
          return (
            <AdminRow key={user.id}>
              <View className="flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1">
                  <Text className="font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                    {user.profile?.full_name || 'Chưa cập nhật'}
                  </Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={1} selectable>
                    {user.email}
                  </Text>
                  <Text className="mt-1 text-[11px] text-slate-400">Tạo lúc {formatDateTimeVi(user.created_at)}</Text>
                </View>
                {user.is_premium ? <Badge variant="default" label="Premium" /> : null}
              </View>
              <Button
                variant="outline"
                size="sm"
                loading={remove.isPending && remove.variables === user.id}
                onPress={() => askRemove(user.id, name)}
                className="self-start border-rose-400/50"
              >
                <Trash2 size={14} color="#E11D48" />
                <Text className="text-sm font-bold text-rose-600 dark:text-rose-400">Xóa tài khoản</Text>
              </Button>
            </AdminRow>
          );
        })
      )}
      <ShowMoreButton remaining={remaining} onPress={showMore} />
    </View>
  );
}
