'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/components/AuthProvider';
import { getMyProperties, deleteProperty, updateProfile, uploadAvatar, resolveImageUrl } from '@/lib/api';
import type { Property } from '@/lib/types';

export default function ProfilePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, logout, setAuth } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hydrated, setHydrated] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Profile editing
  const [editMode, setEditMode] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated || !user) return;
    setEditPhone(user.phone || '');
    setEditName((user as any).name || '');
    setEditEmail(user.email || '');
    
    getMyProperties()
      .then((res) => setProperties(res.properties))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [hydrated, user]);

  if (!hydrated) {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
        <p className="text-slate-600 mb-4">{t('loginRequired') || 'გთხოვთ გაიაროთ ავტორიზაცია'}</p>
        <Link href="/login" className="text-blue-600 hover:underline">
          {t('login')}
        </Link>
      </div>
    );
  }

  const handleDelete = async (id: string) => {
    if (!confirm('დარწმუნებული ხართ რომ გსურთ წაშლა?')) return;
    
    setDeleting(id);
    try {
      await deleteProperty(id);
      setProperties((prev) => prev.filter((p) => p._id !== id));
    } catch (err: any) {
      alert(err.message || 'წაშლა ვერ მოხერხდა');
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
    } catch (err: any) {
      alert(err.message || 'შენახვა ვერ მოხერხდა');
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
    } catch (err: any) {
      alert(err.message || 'ატვირთვა ვერ მოხერხდა');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* პროფილის ინფორმაცია */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-6">
          {/* ავატარი */}
          <div className="flex-shrink-0">
            <div 
              className="relative h-24 w-24 rounded-full bg-slate-200 overflow-hidden cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {(user as any).avatar ? (
                <img
                  src={resolveImageUrl((user as any).avatar)}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl text-slate-400">
                  {user.email[0].toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs">{uploadingAvatar ? '...' : 'შეცვლა'}</span>
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

          {/* ინფორმაცია */}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800 mb-4">{t('profile') || 'პროფილი'}</h1>
            
            {editMode ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">სახელი</label>
                  <input
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="თქვენი სახელი"
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
                    {saving ? '...' : (t('save') || 'შენახვა')}
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {t('cancel') || 'გაუქმება'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2 text-sm">
                  {(user as any).name && (
                    <p><span className="text-slate-500">სახელი:</span> <span className="font-medium">{(user as any).name}</span></p>
                  )}
                  <p><span className="text-slate-500">{t('email')}:</span> <span className="font-medium">{user.email}</span></p>
                  {user.phone && (
                    <p><span className="text-slate-500">{t('phone')}:</span> <span className="font-medium">{user.phone}</span></p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => setEditMode(true)}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {t('editProfile') || 'პროფილის რედაქტირება'}
                  </button>
                  <Link
                    href="/upload"
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    {t('upload') || 'განცხადების დამატება'}
                  </Link>
                  <button
                    onClick={logout}
                    className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    {t('logout') || 'გასვლა'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ჩემი განცხადებები */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          {t('myProperties') || 'ჩემი განცხადებები'} ({properties.length})
        </h2>

        {loading ? (
          <p className="text-sm text-slate-500">იტვირთება...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : properties.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 mb-4">{t('noProperties') || 'თქვენ ჯერ არ გაქვთ განცხადებები'}</p>
            <Link
              href="/upload"
              className="text-blue-600 hover:underline"
            >
              {t('addFirst') || 'დაამატეთ პირველი განცხადება'}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {properties.map((property) => {
              // მთავარი ფოტო
              const mainPhotoIndex = property.mainPhoto || 0;
              const mainImg = property.photos?.[mainPhotoIndex] || property.photos?.[0];
              
              return (
              <div
                key={property._id}
                className="flex items-start gap-4 rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
              >
                {/* ფოტო */}
                <div className="h-20 w-28 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                  {mainImg ? (
                    <img
                      src={resolveImageUrl(mainImg)}
                      alt={property.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400 text-xs">
                      ფოტო არ არის
                    </div>
                  )}
                </div>

                {/* ინფორმაცია */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/property/${property._id}`}
                    className="font-medium text-slate-800 hover:text-blue-600 line-clamp-1"
                  >
                    {property.title}
                  </Link>
                  <p className="text-sm text-slate-500 mt-1">
                    {property.city}{property.region ? `, ${property.region}` : ''}
                  </p>
                  <p className="text-sm font-semibold text-blue-600 mt-1">
                    ${property.price.toLocaleString()}
                  </p>
                </div>

                {/* მოქმედებები */}
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/property/${property._id}/edit`}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    {t('edit') || 'რედაქტირება'}
                  </Link>
                  <button
                    onClick={() => handleDelete(property._id)}
                    disabled={deleting === property._id}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deleting === property._id ? '...' : (t('delete') || 'წაშლა')}
                  </button>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}