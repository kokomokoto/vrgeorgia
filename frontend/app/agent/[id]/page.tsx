'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { getUserProperties, resolveImageUrl } from '@/lib/api';
import { PropertyCard } from '@/components/PropertyCard';
import type { Property } from '@/lib/types';

export default function AgentPage() {
  const params = useParams<{ id: string }>();
  const { t } = useTranslation();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    getUserProperties(params.id)
      .then((res) => {
        if (!alive) return;
        setProperties(res.properties);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e.message || 'Failed to load');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [params.id]);

  // ინფორმაცია მფლობელზე პირველი property-დან
  const owner = properties.length > 0 && typeof properties[0].userId === 'object' 
    ? properties[0].userId 
    : null;

  if (loading) {
    return <div className="text-sm text-slate-500">იტვირთება...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* მაკლერის პროფილი */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-4">
          {owner?.avatar ? (
            <img 
              src={resolveImageUrl(owner.avatar)} 
              alt="Avatar" 
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-2xl text-slate-400">
              {owner?.email?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {owner?.name || owner?.email || 'მაკლერი'}
            </h1>
            {owner?.phone && (
              <p className="text-sm text-slate-600 mt-1">
                {t('phone')}: {owner.phone}
              </p>
            )}
            {owner?.email && (
              <p className="text-sm text-slate-600">
                {t('email')}: {owner.email}
              </p>
            )}
            <p className="text-sm text-slate-500 mt-2">
              განცხადებები: {properties.length}
            </p>
          </div>
        </div>
      </div>

      {/* განცხადებები */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          ატვირთული განცხადებები
        </h2>
        
        {properties.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500">
            ამ მაკლერს ჯერ არ აქვს განცხადებები
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.filter(Boolean).map((p) => (
              <PropertyCard key={p._id} p={p} />
            ))}
          </div>
        )}
      </div>

      <Link 
        href="/" 
        className="inline-block text-blue-600 hover:underline text-sm"
      >
        ← უკან მთავარ გვერდზე
      </Link>
    </div>
  );
}
