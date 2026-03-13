'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { register } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

export default function RegisterPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setAuth } = useAuth();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [phone, setPhone] = React.useState('');
  const [name, setName] = React.useState('');
  const [role, setRole] = React.useState<'user' | 'agent'>('user');
  
  // Agent field
  const [personalId, setPersonalId] = React.useState('');
  
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  return (
    <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-lg font-semibold">{t('register')}</div>
      
      {/* Role Selection */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            role === 'user' 
              ? 'bg-blue-700 text-white' 
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
          onClick={() => setRole('user')}
        >
          👤 {t('user') || 'მომხმარებელი'}
        </button>
        <button
          type="button"
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
            role === 'agent' 
              ? 'bg-blue-700 text-white' 
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
          onClick={() => setRole('agent')}
        >
          🏢 {t('agent') || 'აგენტი'}
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        <input
          className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder={t('name') || 'სახელი და გვარი'}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder={t('email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="relative">
          <input
            className="w-full rounded-md border border-slate-200 px-3 py-2 pr-10 text-sm"
            placeholder="პაროლი (მინ. 6 სიმბოლო)"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            )}
          </button>
        </div>
        <input
          className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder={t('phone')}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        {/* Agent-specific fields */}
        {role === 'agent' && (
          <>
            <input
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder={t('personalId') || 'პირადი ნომერი'}
              value={personalId}
              onChange={(e) => setPersonalId(e.target.value)}
              maxLength={11}
            />
          </>
        )}

        {error && <div className="text-sm text-red-700">{error}</div>}
        
        <button
          className="mt-2 rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              const data: any = { email, password, phone, name, role };
              if (role === 'agent') {
                data.personalId = personalId;
              }
              const res = await register(data);
              setAuth(res.token, res.user);
              router.push('/');
            } catch (e: any) {
              setError(e.message || 'Failed');
            } finally {
              setLoading(false);
            }
          }}
        >
          {role === 'agent' ? (t('registerAsAgent') || 'დარეგისტრირდი აგენტად') : t('submit')}
        </button>
      </div>
    </div>
  );
}
