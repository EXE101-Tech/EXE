import { createContext, useContext } from 'react';

export const UserProfileContext = createContext({ openProfile: () => {} });

export default function useUserProfile() {
  return useContext(UserProfileContext);
}
