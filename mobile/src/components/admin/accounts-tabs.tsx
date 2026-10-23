import { Shield, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { useAdminAccountsQuery, useAdminUsersQuery } from '@/hooks/queries/use-admin';
import { AdminAccountsSection, UsersSection } from './accounts-section';
import { Segmented } from './admin-ui';

type AccountView = 'users' | 'admins';

/** Web has two tabs here ("Danh sách tài khoản" and "Tài khoản admin"); on mobile they are one tab with two views. */
export function AccountsTabs({ notify }: { notify: (message: string) => void }) {
  const [view, setView] = useState<AccountView>('users');
  const users = useAdminUsersQuery();
  const admins = useAdminAccountsQuery();

  return (
    <View className="gap-4">
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'users', label: 'Người dùng', icon: UserRound, count: users.data?.length },
          { value: 'admins', label: 'Admin', icon: Shield, count: admins.data?.length },
        ]}
      />
      {view === 'users' ? <UsersSection notify={notify} /> : <AdminAccountsSection notify={notify} />}
    </View>
  );
}
