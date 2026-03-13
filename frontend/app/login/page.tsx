'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { login, register } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setAuth } = useAuth();
  
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Register state
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => setMounted(true), []);

  const labels = {
    login: mounted ? t('login') : 'შესვლა',
    register: mounted ? t('register') : 'რეგისტრაცია',
    email: mounted ? t('email') : 'ელ-ფოსტა',
    phone: mounted ? t('phone') : 'ტელეფონი',
    submit: mounted ? t('submit') : 'გაგზავნა',
    alreadyHaveAccount: mounted ? t('alreadyHaveAccount') : 'უკვე გაქვთ ანგარიში?',
    noAccount: mounted ? t('noAccount') : 'არ გაქვთ ანგარიში?'
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await login({ email, password });
      setAuth(res.token, res.user);
      router.push('/');
    } catch (e: any) {
      setError(e.message || 'შესვლა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await register({ email: regEmail, password: regPassword, phone: regPhone || undefined });
      setAuth(res.token, res.user);
      router.push('/');
    } catch (e: any) {
      setError(e.message || 'რეგისტრაცია ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white overflow-hidden">
      {/* ტაბები */}
      <div className="flex border-b border-slate-200">
        <button
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'login'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
          onClick={() => { setActiveTab('login'); setError(null); }}
        >
          {labels.login}
        </button>
        <button
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'register'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
          onClick={() => { setActiveTab('register'); setError(null); }}
        >
          {labels.register}
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'login' ? (
          /* შესვლის ფორმა */
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{labels.email}</label>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="example@mail.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">პაროლი</label>
              <div className="relative">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="••••••••"
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
            </div>
            
            {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</div>}
            
            <button
              className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              disabled={loading}
              onClick={handleLogin}
            >
              {loading ? 'იტვირთება...' : labels.login}
            </button>
            
            <p className="text-center text-sm text-slate-600">
              {labels.noAccount}{' '}
              <button
                className="text-blue-600 hover:underline font-medium"
                onClick={() => { setActiveTab('register'); setError(null); }}
              >
                {labels.register}
              </button>
            </p>
          </div>
        ) : (
          /* რეგისტრაციის ფორმა */
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{labels.email} *</label>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="example@mail.com"
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">პაროლი *</label>
              <div className="relative">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="მინ. 6 სიმბოლო"
                  type={showRegPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  tabIndex={-1}
                >
                  {showRegPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{labels.phone}</label>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="+995 5XX XXX XXX"
                type="tel"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
              />
            </div>
            
            {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</div>}
            
            <button
              className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              disabled={loading}
              onClick={handleRegister}
            >
              {loading ? 'იტვირთება...' : labels.register}
            </button>
            
            <p className="text-center text-sm text-slate-600">
              {labels.alreadyHaveAccount}{' '}
              <button
                className="text-blue-600 hover:underline font-medium"
                onClick={() => { setActiveTab('login'); setError(null); }}
              >
                {labels.login}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
