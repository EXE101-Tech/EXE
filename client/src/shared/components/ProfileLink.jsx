import { useUserProfile } from '../context/UserProfileContext';

// Wraps a name or avatar so clicking it opens that member's public profile.
export default function ProfileLink({ userId, name, className = '', children, ...props }) {
  const { openProfile } = useUserProfile();
  if (!userId) return children;
  return <button
    type="button"
    {...props}
    className={`sg-profile-name-link ${className}`}
    title={name ? `Xem hồ sơ ${name}` : 'Xem hồ sơ'}
    onClick={(event) => { event.stopPropagation(); openProfile(userId); }}
  >{children}</button>;
}
