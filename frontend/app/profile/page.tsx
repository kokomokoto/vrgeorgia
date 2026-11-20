'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/components/AuthProvider';
import { Filters, type FiltersState } from '@/components/Filters';
import { PropertyPriceRow } from '@/components/PropertyPriceRow';
import { PropertySpecChips } from '@/components/PropertySpecChips';
import {
  getMyProperties,
  deleteProperty,
  updateProfile,
  uploadAvatar,
  resolveImageUrl,
  updateProperty,
  changePassword,
  listSearcherAgents,
  setPropertyPinned,
  type SearcherAgentRow,
} from '@/lib/api';
import { PropertyCardGridSkeleton } from '@/components/Skeleton';
import PinnedListingMark from '@/components/PinnedListingMark';
import { isPanoramaPhoto } from '@/lib/panorama';
import {
  DEFAULT_MAP_FILTERS,
  filtersAreActive,
  filtersToPropertyQuery,
} from '@/lib/mapQuery';
import { trackSearchFilters } from '@/lib/searchAnalytics';
import type { Property } from '@/lib/types';
import { isAdminRole, isAgentRole, isSearcherRole } from '@/lib/userRoles';
import { getPropertyOwnerLocationLine } from '@/lib/propertyDisplay';
import { propertyHref } from '@/lib/propertyPublicPath';

type BrokerListingMode =
  | 'public'
  | 'unlisted'
  | 'private'
  | 'sold'
  | 'sold_listed'
  | 'sold_unlisted';

type ProfileVisibilityFilter = '' | BrokerListingMode | 'pinned';

function brokerListingModeFromProperty(p: Property): BrokerListingMode {
  if (p.status === 'sold') {
    return p.listingVisibility === 'public' ? 'sold_listed' : 'sold_unlisted';
  }
  const vis = p.listingVisibility || 'public';
  return vis === 'unlisted' || vis === 'private' || vis === 'public' ? vis : 'public';
}

function isSoldListingMode(mode: BrokerListingMode): boolean {
  return mode === 'sold' || mode === 'sold_listed' || mode === 'sold_unlisted';
}

function needsPrivateShareLink(mode: BrokerListingMode): boolean {
  return mode === 'unlisted' || mode === 'sold_unlisted';
}

function IconEyeOpen({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function IconEyeClosed({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
      />
    </svg>
  );
}

function IconCopyLink({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function IconPin({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16 3a1 1 0 011 1v2.586l1.707 1.707A1 1 0 0118 10h-3v7l-2 3-2-3v-7H8a1 1 0 01-.707-1.707L9 6.586V4a1 1 0 011-1h6z" />
    </svg>
  );
}

function ProfilePinToggleButton({
  pinned,
  busy,
  onClick,
  label,
}: {
  pinned?: boolean;
  busy?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={label}
      aria-label={label}
      aria-pressed={Boolean(pinned)}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
        pinned
          ? 'bg-amber-500 text-white shadow-md hover:bg-amber-600'
          : 'border border-slate-300 bg-white text-slate-400 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-500'
      }`}
    >
      {busy ? (
        <span className="text-[10px] font-semibold leading-none">…</span>
      ) : (
        <IconPin className="h-4 w-4" />
      )}
    </button>
  );
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, logout, setAuth } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hydrated, setHydrated] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rangeProperties, setRangeProperties] = useState<Property[]>([]);
  const [allPropertiesCount, setAllPropertiesCount] = useState(0);
  const [propertiesTotal, setPropertiesTotal] = useState(0);
  const [initLoading, setInitLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [visibilitySavingId, setVisibilitySavingId] = useState<string | null>(null);
  const [linkCopiedId, setLinkCopiedId] = useState<string | null>(null);
  /** გაყიდულის ▾ ჩამოსაშლელი გახსნილია ამ ობიექტზე */
  const [soldMenuPropertyId, setSoldMenuPropertyId] = useState<string | null>(null);

  useEffect(() => {
    if (!soldMenuPropertyId) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('[data-sold-menu]')) return;
      setSoldMenuPropertyId(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [soldMenuPropertyId]);

  const [filters, setFilters] = useState<FiltersState>(DEFAULT_MAP_FILTERS);
  const [sortBy, setSortBy] = useState('date_desc');
  const [filterVisibility, setFilterVisibility] = useState<ProfileVisibilityFilter>('');
  const [pinningId, setPinningId] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const isSearcher = Boolean(user && isSearcherRole(user.role));
  const isAdmin = Boolean(user && isAdminRole(user.role));
  const canSetListingVisibility = user ? isAgentRole(user.role) || isAdminRole(user.role) : false;
  const canChangePassword = user
    ? isAgentRole(user.role) || isAdminRole(user.role) || isSearcher
    : false;

  const myPropertiesQueryExtras = useCallback(() => {
    if (filterVisibility === 'pinned') return { pinned: '1' as const };
    if (filterVisibility) return { brokerListingMode: filterVisibility };
    return {};
  }, [filterVisibility]);

  const [searcherAgents, setSearcherAgents] = useState<SearcherAgentRow[]>([]);
  const [searcherLoading, setSearcherLoading] = useState(false);

  const clearAllFilters = useCallback(() => {
    setFilters({ ...DEFAULT_MAP_FILTERS });
    setFilterVisibility('');
  }, []);

  const loadInitial = useCallback(async () => {
    try {
      const res = await getMyProperties({ limit: 200, sort: 'date_desc' });
      setRangeProperties(res.properties);
      setAllPropertiesCount(res.totalAll ?? res.properties.length);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error_load_failed'));
    } finally {
      setInitLoading(false);
    }
  }, [t]);

  const loadSearcherAgents = useCallback(async () => {
    setSearcherLoading(true);
    try {
      const res = await listSearcherAgents();
      setSearcherAgents(res.agents || []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error_load_failed'));
    } finally {
      setSearcherLoading(false);
      setInitLoading(false);
    }
  }, [t]);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated || !user) return;
    setEditPhone(user.phone || '');
    setEditName((user as { name?: string }).name || '');
    setEditEmail(user.email || '');
    setInitLoading(true);
    if (isSearcherRole(user.role)) {
      void loadSearcherAgents();
    } else {
      void loadInitial();
    }
  }, [hydrated, user, loadInitial, loadSearcherAgents]);

  useEffect(() => {
    if (!hydrated || !user || initLoading || isSearcherRole(user.role)) return;

    let alive = true;
    const timer = window.setTimeout(async () => {
      setListLoading(true);
      setError(null);
      try {
        const res = await getMyProperties({
          ...filtersToPropertyQuery(filters, sortBy, i18n.language),
          ...myPropertiesQueryExtras(),
          limit: 200,
        });
        if (!alive) return;
        setProperties(res.properties);
        setPropertiesTotal(res.total);
        if (!filtersAreActive(filters) && !filterVisibility) {
          setAllPropertiesCount(res.totalAll ?? res.total);
        }
        trackSearchFilters('profile', filters, {
          sort: sortBy,
          resultCount: res.properties.length,
        });
      } catch (err: unknown) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : t('error_load_failed'));
      } finally {
        if (alive) setListLoading(false);
      }
    }, 400);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [hydrated, user, initLoading, filters, sortBy, filterVisibility, myPropertiesQueryExtras, i18n.language, t]);

  const refreshList = useCallback(async () => {
    const res = await getMyProperties({
      ...filtersToPropertyQuery(filters, sortBy, i18n.language),
      ...myPropertiesQueryExtras(),
      limit: 200,
    });
    setProperties(res.properties);
    setPropertiesTotal(res.total);
    const allRes = await getMyProperties({ limit: 200, sort: 'date_desc' });
    setRangeProperties(allRes.properties);
    setAllPropertiesCount(allRes.totalAll ?? allRes.properties.length);
  }, [filters, sortBy, myPropertiesQueryExtras, i18n.language]);

  if (!hydrated) {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
        <p className="text-slate-600 mb-4">{t('loginRequired')}</p>
        <Link href="/login" className="text-blue-600 hover:underline">
          {t('login')}
        </Link>
      </div>
    );
  }

  const setBrokerListingMode = async (property: Property, mode: BrokerListingMode) => {
    // „გაყიდული“ მთავარი კლიკი → დეფოლტი მხოლოდ ლინკით
    const resolved: BrokerListingMode = mode === 'sold' ? 'sold_unlisted' : mode;
    setVisibilitySavingId(property._id);
    try {
      const res = await updateProperty(property._id, { brokerListingMode: resolved });
      setProperties((prev) => prev.map((x) => (x._id === res.property._id ? res.property : x)));
      setRangeProperties((prev) => prev.map((x) => (x._id === res.property._id ? res.property : x)));
      setSoldMenuPropertyId(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('error_save_failed'));
    } finally {
      setVisibilitySavingId(null);
    }
  };

  const propertyViewHref = (property: Property) => {
    const base = propertyHref(property);
    const mode = brokerListingModeFromProperty(property);
    if (needsPrivateShareLink(mode) && property.shareToken) {
      return `${base}?t=${encodeURIComponent(property.shareToken)}`;
    }
    return base;
  };

  const copyListingLink = (property: Property) => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}${propertyViewHref(property)}`;
    void navigator.clipboard.writeText(url).then(() => {
      setLinkCopiedId(property._id);
      window.setTimeout(() => setLinkCopiedId(null), 2000);
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirm_delete'))) return;

    setDeleting(id);
    try {
      await deleteProperty(id);
      await refreshList();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('error_delete_failed'));
    } finally {
      setDeleting(null);
    }
  };

  const handleTogglePin = async (property: Property) => {
    if (!isAdmin || pinningId) return;
    const nextPinned = !property.pinned;
    setPinningId(property._id);
    try {
      const updated = await setPropertyPinned(property._id, nextPinned);
      const apply = (p: Property): Property =>
        p._id === property._id
          ? {
              ...p,
              pinned: updated.pinned ?? nextPinned,
              pinnedAt: updated.pinnedAt ?? (nextPinned ? new Date().toISOString() : null),
            }
          : p;
      if (filterVisibility === 'pinned' && !nextPinned) {
        setProperties((prev) => prev.filter((p) => p._id !== property._id));
        setPropertiesTotal((n) => Math.max(0, n - 1));
      } else {
        setProperties((prev) => prev.map(apply));
      }
      setRangeProperties((prev) => prev.map(apply));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('pinFailed'));
    } finally {
      setPinningId(null);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await updateProfile({ phone: editPhone, name: editName, email: editEmail });
      const token = localStorage.getItem('token');
      if (token) setAuth(token, res.user);
      setEditMode(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('error_save_failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const res = await uploadAvatar(file);
      const token = localStorage.getItem('token');
      if (token) setAuth(token, res.user);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('error_upload_failed'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordMessage(null);
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordError(t('password_too_short'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('password_mismatch'));
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError(t('password_same_as_current'));
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordMessage(t('change_password_success'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : t('error_save_failed'));
    } finally {
      setChangingPassword(false);
    }
  };

  const filtersActive = filtersAreActive(filters) || Boolean(filterVisibility);

  const photolessProperties = rangeProperties.filter(
    (p) => !Array.isArray(p.photos) || p.photos.length === 0
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            <div
              className="relative h-24 w-24 rounded-full bg-slate-200 overflow-hidden cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {(user as { avatar?: string }).avatar ? (
                <img
                  src={resolveImageUrl((user as { avatar?: string }).avatar)}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl text-slate-400">
                  {user.email[0].toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs">{uploadingAvatar ? '...' : t('changeAvatar')}</span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800 mb-4">{t('profile')}</h1>

            {editMode ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{t('name_label')}</label>
                  <input
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder={t('your_name')}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{t('email')}</label>
                  <input
                    type="email"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{t('phone')}</label>
                  <input
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+995 5XX XXX XXX"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? '...' : t('save')}
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      resetPasswordForm();
                    }}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {t('cancel')}
                  </button>
                </div>

                {canChangePassword && (
                  <div className="mt-2 space-y-3 border-t border-slate-200 pt-4">
                    <p className="text-sm font-medium text-slate-800">{t('change_password')}</p>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">{t('current_password')}</label>
                      <input
                        type="password"
                        autoComplete="current-password"
                        className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">{t('new_password')}</label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t('password_min')}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">{t('confirm_new_password')}</label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
                    {passwordMessage && <p className="text-sm text-green-700">{passwordMessage}</p>}
                    <button
                      type="button"
                      onClick={handleChangePassword}
                      disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                      className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {changingPassword ? '...' : t('change_password')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2 text-sm">
                  {(user as { name?: string }).name && (
                    <p>
                      <span className="text-slate-500">{t('name_label')}:</span>{' '}
                      <span className="font-medium">{(user as { name?: string }).name}</span>
                    </p>
                  )}
                  <p>
                    <span className="text-slate-500">{t('email')}:</span>{' '}
                    <span className="font-medium">{user.email}</span>
                  </p>
                  {user.phone && (
                    <p>
                      <span className="text-slate-500">{t('phone')}:</span>{' '}
                      <span className="font-medium">{user.phone}</span>
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      resetPasswordForm();
                      setEditMode(true);
                    }}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {t('editProfile')}
                  </button>
                  {user.agentRequestFeatureEnabled && !isSearcher && (
                    <Link
                      href="/profile/requests"
                      className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                    >
                      {t('agent_request')}
                    </Link>
                  )}
                  {!isSearcher && (
                    <Link
                      href="/upload"
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      {t('upload')}
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    {t('logout')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {!isSearcher && photolessProperties.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">
            📷 {t('photoless_listings_title')}
            <span className="ml-2 text-sm font-normal text-amber-700">
              ({photolessProperties.length})
            </span>
          </h2>
          <div className="overflow-hidden rounded-xl border border-amber-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">{t('photoless_col_title')}</th>
                    <th className="px-4 py-3">{t('photoless_col_type')}</th>
                    <th className="px-4 py-3">{t('photoless_col_status')}</th>
                    <th className="px-4 py-3">{t('photoless_col_date')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {photolessProperties.map((item) => (
                    <tr key={item._id}>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">{item.title || '—'}</span>
                        <span className="ml-2 text-xs text-slate-400">
                          #{item.numericId ?? item._id.slice(-6)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {t(item.type, { defaultValue: item.type })}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {t(`status_${item.status}`, {
                          defaultValue: item.status,
                        })}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString(
                              i18n.language === 'en'
                                ? 'en-GB'
                                : i18n.language === 'ru'
                                  ? 'ru-RU'
                                  : 'ka-GE',
                              {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/property/${item._id}/edit`}
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          {t('photoless_add_photos')} →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isSearcher ? (
      <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-800">
            {t('searcher_agents_title')} ({searcherAgents.length})
          </h2>
          <p className="mt-1 text-sm text-slate-500">{t('searcher_agents_subtitle')}</p>
        </div>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {initLoading || searcherLoading ? (
          <p className="py-8 text-center text-sm text-slate-500">{t('loading')}</p>
        ) : searcherAgents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
            {t('searcher_no_agents')}
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {searcherAgents.map((a) => (
              <li key={a.userId}>
                <Link
                  href={`/profile/searcher/${a.userId}`}
                  className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-teal-300 hover:bg-teal-50/50"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
                    {a.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveImageUrl(a.photo, 'thumb')}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-500">
                        {(a.name?.[0] || '?').toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800">{a.name || a.email}</p>
                    {a.company ? (
                      <p className="truncate text-xs text-slate-500">{a.company}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                        {a.totalCount} {t('searcher_agent_listings_count')}
                      </span>
                      {a.pendingCount > 0 ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                          {a.pendingCount} {t('searcher_pending_short')}
                        </span>
                      ) : null}
                      {a.notifyTime1 || a.notifyTime2 ? (
                        <span className="rounded-full bg-teal-100 px-2 py-0.5 font-medium text-teal-800">
                          {[a.notifyTime1, a.notifyTime2].filter(Boolean).join(' / ')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      ) : (
      <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            {t('myProperties')} ({allPropertiesCount})
          </h2>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
          >
            <option value="date_desc">{t('sort_date_desc', 'ახალი → ძველი')}</option>
            <option value="date_asc">{t('sort_date_asc', 'ძველი → ახალი')}</option>
            <option value="price_asc">{t('sort_price_asc', 'ფასი ↑')}</option>
            <option value="price_desc">{t('sort_price_desc', 'ფასი ↓')}</option>
            <option value="area_asc">{t('sort_area_asc', 'ფართობი ↑')}</option>
            <option value="area_desc">{t('sort_area_desc', 'ფართობი ↓')}</option>
            <option value="views_desc">{t('sort_views_desc', 'ნახვები ↓')}</option>
          </select>
        </div>

        {allPropertiesCount > 0 && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
            <p className="mb-3 text-sm text-slate-500">
              {t('profilePropertySearchHint', 'ძიება მხოლოდ თქვენს განცხადებებში')}
            </p>
            <Filters
              value={filters}
              onChange={setFilters}
              onClearAll={clearAllFilters}
              rangeProperties={rangeProperties}
              showCategories
            />
            {canSetListingVisibility && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <label className="text-sm text-slate-600" htmlFor="profile-visibility-filter">
                  {t('listingVisibilityLabel')}:
                </label>
                <select
                  id="profile-visibility-filter"
                  value={filterVisibility}
                  onChange={(e) =>
                    setFilterVisibility((e.target.value || '') as ProfileVisibilityFilter)
                  }
                  className="min-w-[10rem] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">{t('all_visibilities')}</option>
                  <option value="public">{t('listingMode_public')}</option>
                  <option value="unlisted">{t('listingMode_unlisted')}</option>
                  <option value="private">{t('listingMode_private')}</option>
                  <option value="sold">{t('listingMode_sold')}</option>
                  {isAdmin && (
                    <option value="pinned">{t('listingMode_pinned')}</option>
                  )}
                </select>
              </div>
            )}
          </div>
        )}

        {allPropertiesCount > 0 && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-800">
              {initLoading || listLoading
                ? t('loading')
                : filtersActive && allPropertiesCount > 0
                  ? t('found_results', { count: propertiesTotal, total: allPropertiesCount })
                  : t('agentListingsFound', { count: propertiesTotal })}
            </p>
          </div>
        )}

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {initLoading || listLoading ? (
          <PropertyCardGridSkeleton count={4} gridClassName="grid-cols-1" />
        ) : allPropertiesCount === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 mb-4">{t('noProperties')}</p>
            <Link href="/upload" className="text-blue-600 hover:underline">
              {t('addFirst')}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {properties.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">{t('empty_search_result')}</p>
            ) : (
              properties.map((property) => {
                const mainPhotoIndex = property.mainPhoto || 0;
                const mainImg = property.photos?.[mainPhotoIndex] || property.photos?.[0];
                const locationLine = getPropertyOwnerLocationLine(property);

                return (
                  <div
                    key={property._id}
                    className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50 sm:p-4"
                  >
                    <div className="flex items-start gap-3">
                      <Link
                        href={propertyViewHref(property)}
                        className="relative block h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-md bg-slate-100 ring-offset-2 hover:ring-2 hover:ring-blue-500 sm:h-20 sm:w-28"
                        aria-label={property.title}
                      >
                        {mainImg ? (
                          <img
                            src={resolveImageUrl(mainImg, 'thumb', {
                              isPanorama: isPanoramaPhoto(mainImg, property.panoramaPhotos),
                            })}
                            alt={property.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-1 text-center text-[11px] leading-tight text-slate-400">
                            {t('no_photo')}
                          </div>
                        )}
                        {isAdmin && property.pinned ? (
                          <div className="pointer-events-none absolute right-1 top-1 z-10">
                            <PinnedListingMark pinned size="sm" />
                          </div>
                        ) : null}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={propertyViewHref(property)}
                          className="line-clamp-2 font-medium text-slate-800 hover:text-blue-600"
                        >
                          {property.title}
                        </Link>
                        <p
                          className="mt-1 line-clamp-2 text-sm text-slate-500"
                          title={locationLine || undefined}
                        >
                          {locationLine || '—'}
                        </p>
                        <div className="mt-1.5 hidden min-w-0 items-center gap-2 md:flex">
                          <PropertySpecChips
                            p={property}
                            compact
                            nowrap
                            gapClass="gap-1.5"
                            className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                          />
                          <PropertyPriceRow p={property} compact className="shrink-0" />
                          {property.views !== undefined && (
                            <span className="shrink-0 text-xs text-slate-400">👁 {property.views}</span>
                          )}
                          <span className="shrink-0 font-mono text-xs text-slate-400">
                            ID: {property.numericId || property._id.slice(-6)}
                          </span>
                        </div>
                      </div>

                      <div className="hidden shrink-0 flex-col gap-2 md:flex">
                        <Link
                          href={`/property/${property._id}/edit`}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          {t('edit')}
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(property._id)}
                          disabled={deleting === property._id}
                          className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deleting === property._id ? '...' : t('delete')}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-col gap-2 md:hidden">
                      <PropertySpecChips
                        p={property}
                        compact
                        gapClass="gap-1.5"
                        className="flex-wrap"
                      />
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <PropertyPriceRow p={property} compact />
                        {property.views !== undefined && (
                          <span className="text-xs text-slate-400">👁 {property.views}</span>
                        )}
                        <span className="font-mono text-xs text-slate-400">
                          ID: {property.numericId || property._id.slice(-6)}
                        </span>
                      </div>
                    </div>

                    {canSetListingVisibility && (() => {
                      const currentMode = brokerListingModeFromProperty(property);
                      const copyLabel = needsPrivateShareLink(currentMode)
                        ? t('copyPrivateLink')
                        : t('copyLink');
                      return (
                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                        <p className="text-xs font-medium text-slate-600">{t('listingVisibilityLabel')}</p>
                        <div className="flex flex-wrap items-stretch gap-1.5">
                          {(
                            [
                              ['public', t('listingMode_public')],
                              ['unlisted', t('listingMode_unlisted')],
                              ['private', t('listingMode_private')],
                            ] as const
                          ).map(([mode, label]) => {
                            const active = currentMode === mode;
                            return (
                              <button
                                key={mode}
                                type="button"
                                disabled={visibilitySavingId === property._id}
                                onClick={() => setBrokerListingMode(property, mode)}
                                className={`rounded-md px-2 py-1.5 text-center text-xs font-medium transition-colors ${
                                  active
                                    ? 'bg-blue-600 text-white'
                                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                } disabled:opacity-50`}
                              >
                                {label}
                              </button>
                            );
                          })}
                          {(() => {
                            const soldActive = isSoldListingMode(currentMode);
                            const menuOpen = soldMenuPropertyId === property._id;
                            const saving = visibilitySavingId === property._id;
                            return (
                              <div className="relative" data-sold-menu>
                                <div
                                  className={`flex overflow-hidden rounded-md ${
                                    soldActive
                                      ? 'bg-blue-600 text-white'
                                      : 'border border-slate-200 bg-white text-slate-700'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => setBrokerListingMode(property, 'sold')}
                                    className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 text-center text-xs font-medium transition-colors disabled:opacity-50 ${
                                      soldActive ? 'hover:bg-blue-700' : 'hover:bg-slate-50'
                                    }`}
                                  >
                                    {currentMode === 'sold_listed' ? (
                                      <IconEyeOpen
                                        className={`h-3.5 w-3.5 shrink-0 ${soldActive ? 'opacity-90' : 'opacity-60'}`}
                                      />
                                    ) : (
                                      <IconEyeClosed
                                        className={`h-3.5 w-3.5 shrink-0 ${soldActive ? 'opacity-90' : 'opacity-60'}`}
                                      />
                                    )}
                                    {t('listingMode_sold')}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={saving}
                                    aria-label={t('listingMode_sold_choose')}
                                    aria-expanded={menuOpen}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSoldMenuPropertyId((prev) =>
                                        prev === property._id ? null : property._id
                                      );
                                    }}
                                    className={`shrink-0 border-l px-1.5 py-1.5 text-xs disabled:opacity-50 ${
                                      soldActive
                                        ? 'border-blue-500 hover:bg-blue-700'
                                        : 'border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span aria-hidden className="inline-block leading-none">
                                      {menuOpen ? '▴' : '▾'}
                                    </span>
                                  </button>
                                </div>
                                {menuOpen && (
                                  <div className="absolute left-0 z-20 mt-1 min-w-[10.5rem] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                                    {(
                                      [
                                        [
                                          'sold_unlisted',
                                          t('listingMode_sold_via_link'),
                                          'closed',
                                        ],
                                        [
                                          'sold_listed',
                                          t('listingMode_sold_visible'),
                                          'open',
                                        ],
                                      ] as const
                                    ).map(([mode, label, eye]) => (
                                      <button
                                        key={mode}
                                        type="button"
                                        disabled={saving}
                                        onClick={() => setBrokerListingMode(property, mode)}
                                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors disabled:opacity-50 ${
                                          currentMode === mode
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                      >
                                        {eye === 'open' ? (
                                          <IconEyeOpen className="h-3.5 w-3.5 shrink-0" />
                                        ) : (
                                          <IconEyeClosed className="h-3.5 w-3.5 shrink-0" />
                                        )}
                                        <span>{label}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          <button
                            type="button"
                            title={
                              linkCopiedId === property._id ? t('linkCopied') : copyLabel
                            }
                            aria-label={
                              linkCopiedId === property._id ? t('linkCopied') : copyLabel
                            }
                            onClick={() => copyListingLink(property)}
                            className={`inline-flex items-center justify-center self-stretch rounded-md border px-2 transition-colors ${
                              linkCopiedId === property._id
                                ? 'border-green-300 bg-green-50 text-green-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
                            }`}
                          >
                            <IconCopyLink />
                          </button>
                          {isAdmin && (
                            <div className="inline-flex items-center self-center">
                              <ProfilePinToggleButton
                                pinned={property.pinned}
                                busy={pinningId === property._id}
                                onClick={() => handleTogglePin(property)}
                                label={property.pinned ? t('unpinListing') : t('pinListing')}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })()}

                    <div className="mt-3 grid grid-cols-2 gap-2 md:hidden">
                      <Link
                        href={`/property/${property._id}/edit`}
                        className="rounded-md border border-slate-300 px-3 py-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        {t('edit')}
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(property._id)}
                        disabled={deleting === property._id}
                        className="rounded-md border border-red-300 px-3 py-2 text-center text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deleting === property._id ? '...' : t('delete')}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
