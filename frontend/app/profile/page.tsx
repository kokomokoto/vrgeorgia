'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/components/AuthProvider';
import { Filters, type FiltersState } from '@/components/Filters';
import { getMyProperties, deleteProperty, updateProfile, uploadAvatar, resolveImageUrl, updateProperty, changePassword } from '@/lib/api';
import { PropertyCardGridSkeleton } from '@/components/Skeleton';
import { isPanoramaPhoto } from '@/lib/panorama';
import {
  DEFAULT_MAP_FILTERS,
  filtersAreActive,
  filtersToPropertyQuery,
} from '@/lib/mapQuery';
import { trackSearchFilters } from '@/lib/searchAnalytics';
import type { Property } from '@/lib/types';
import { isAdminRole, isAgentRole } from '@/lib/userRoles';

type BrokerListingMode = 'public' | 'unlisted' | 'private' | 'sold';

function brokerListingModeFromProperty(p: Property): BrokerListingMode {
  if (p.status === 'sold') return 'sold';
  return p.listingVisibility || 'public';
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

  const [filters, setFilters] = useState<FiltersState>(DEFAULT_MAP_FILTERS);
  const [sortBy, setSortBy] = useState('date_desc');
  const [filterVisibility, setFilterVisibility] = useState<'' | BrokerListingMode>('');

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

  const canSetListingVisibility = user ? isAgentRole(user.role) || isAdminRole(user.role) : false;
  const canChangePassword = user
    ? isAgentRole(user.role) || isAdminRole(user.role)
    : false;

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

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated || !user) return;
    setEditPhone(user.phone || '');
    setEditName((user as { name?: string }).name || '');
    setEditEmail(user.email || '');
    setInitLoading(true);
    void loadInitial();
  }, [hydrated, user, loadInitial]);

  useEffect(() => {
    if (!hydrated || !user || initLoading) return;

    let alive = true;
    const timer = window.setTimeout(async () => {
      setListLoading(true);
      setError(null);
      try {
        const res = await getMyProperties({
          ...filtersToPropertyQuery(filters, sortBy, i18n.language),
          ...(filterVisibility ? { brokerListingMode: filterVisibility } : {}),
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
  }, [hydrated, user, initLoading, filters, sortBy, filterVisibility, i18n.language, t]);

  const refreshList = useCallback(async () => {
    const res = await getMyProperties({
      ...filtersToPropertyQuery(filters, sortBy, i18n.language),
      ...(filterVisibility ? { brokerListingMode: filterVisibility } : {}),
      limit: 200,
    });
    setProperties(res.properties);
    setPropertiesTotal(res.total);
    const allRes = await getMyProperties({ limit: 200, sort: 'date_desc' });
    setRangeProperties(allRes.properties);
    setAllPropertiesCount(allRes.totalAll ?? allRes.properties.length);
  }, [filters, sortBy, filterVisibility, i18n.language]);

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
    setVisibilitySavingId(property._id);
    try {
      const res = await updateProperty(property._id, { brokerListingMode: mode });
      setProperties((prev) => prev.map((x) => (x._id === res.property._id ? res.property : x)));
      setRangeProperties((prev) => prev.map((x) => (x._id === res.property._id ? res.property : x)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('error_save_failed'));
    } finally {
      setVisibilitySavingId(null);
    }
  };

  const copyUnlistedLink = (property: Property) => {
    if (!property.shareToken) return;
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/property/${property._id}?t=${property.shareToken}`;
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
                  <Link
                    href="/upload"
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    {t('upload')}
                  </Link>
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

      <div className="rounded-lg border border-slate-200 bg-white p-6">
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
                    setFilterVisibility((e.target.value || '') as '' | BrokerListingMode)
                  }
                  className="min-w-[10rem] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">{t('all_visibilities')}</option>
                  <option value="public">{t('listingMode_public')}</option>
                  <option value="unlisted">{t('listingMode_unlisted')}</option>
                  <option value="private">{t('listingMode_private')}</option>
                  <option value="sold">{t('listingMode_sold')}</option>
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

                return (
                  <div
                    key={property._id}
                    className="flex items-start gap-4 rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
                  >
                    <div className="h-20 w-28 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                      {mainImg ? (
                        <img
                          src={resolveImageUrl(mainImg, 'thumb', {
                            isPanorama: isPanoramaPhoto(mainImg, property.panoramaPhotos),
                          })}
                          alt={property.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400 text-xs">
                          {t('no_photo')}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/property/${property._id}`}
                        className="font-medium text-slate-800 hover:text-blue-600 line-clamp-1"
                      >
                        {property.title}
                      </Link>
                      <p className="text-sm text-slate-500 mt-1">
                        {property.city}
                        {property.region ? `, ${property.region}` : ''}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm font-semibold text-blue-600">
                          {property.priceCurrency === 'GEL' ? '₾' : '$'}
                          {property.price.toLocaleString()}
                        </p>
                        {property.views !== undefined && (
                          <span className="text-xs text-slate-400">👁 {property.views}</span>
                        )}
                        <span className="text-xs text-slate-400 font-mono">
                          ID: {property.numericId || property._id.slice(-6)}
                        </span>
                      </div>

                      {canSetListingVisibility && (
                        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                          <p className="text-xs font-medium text-slate-600">{t('listingVisibilityLabel')}</p>
                          <div className="flex flex-wrap gap-1">
                            {(
                              [
                                ['public', t('listingMode_public')],
                                ['unlisted', t('listingMode_unlisted')],
                                ['private', t('listingMode_private')],
                                ['sold', t('listingMode_sold')],
                              ] as const
                            ).map(([mode, label]) => {
                              const active = brokerListingModeFromProperty(property) === mode;
                              return (
                                <button
                                  key={mode}
                                  type="button"
                                  disabled={visibilitySavingId === property._id}
                                  onClick={() => setBrokerListingMode(property, mode)}
                                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                                    active
                                      ? 'bg-blue-600 text-white'
                                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                  } disabled:opacity-50`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                          {brokerListingModeFromProperty(property) === 'unlisted' && property.shareToken && (
                            <button
                              type="button"
                              onClick={() => copyUnlistedLink(property)}
                              className="text-xs font-medium text-blue-600 hover:underline"
                            >
                              {linkCopiedId === property._id ? t('linkCopied') : t('copyPrivateLink')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/property/${property._id}/edit`}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        {t('edit')}
                      </Link>
                      <button
                        onClick={() => handleDelete(property._id)}
                        disabled={deleting === property._id}
                        className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
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
    </div>
  );
}
