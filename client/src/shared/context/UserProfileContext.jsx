import { useCallback, useMemo, useState } from 'react';
import UserProfileModal from '../components/UserProfileModal';
import { UserProfileContext } from '../hooks/useUserProfile';

export function UserProfileProvider({ children }) {
  const [userId, setUserId] = useState(null);
  const openProfile = useCallback((id) => { if (id) setUserId(Number(id)); }, []);
  const value = useMemo(() => ({ openProfile }), [openProfile]);
  return <UserProfileContext.Provider value={value}>
    {children}
    {userId && <UserProfileModal key={userId} userId={userId} onClose={() => setUserId(null)} />}
  </UserProfileContext.Provider>;
}
