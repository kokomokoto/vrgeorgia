'use client';

import { useTranslation } from 'react-i18next';
import { useAuth } from '@/components/AuthProvider';
import { isAdminRole } from '@/lib/userRoles';

const sizeClasses = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
} as const;

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
} as const;

/** ადმინის ნიშანი აპინულ ბარათზე — ფავორიტისა და შედარების ღილაკების ზომით. */
export default function PinnedListingMark({
  pinned,
  size = 'md',
}: {
  pinned?: boolean;
  size?: keyof typeof sizeClasses;
}) {
  const { user, authBootstrapped } = useAuth();
  const { t } = useTranslation();
  if (!authBootstrapped || !isAdminRole(user?.role) || !pinned) return null;

  return (
    <span
      className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-amber-500 text-white shadow-md`}
      title={t('pinnedListing')}
      aria-label={t('pinnedListing')}
      role="img"
    >
      <svg className={iconSizes[size]} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M16 3a1 1 0 011 1v2.586l1.707 1.707A1 1 0 0118 10h-3v7l-2 3-2-3v-7H8a1 1 0 01-.707-1.707L9 6.586V4a1 1 0 011-1h6z" />
      </svg>
    </span>
  );
}
