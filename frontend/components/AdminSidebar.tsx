'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getApiBase } from '@/lib/config';

type Item = { href: string; icon: string; label: string; exact?: boolean; badgeKey?: 'registrations' | 'properties' | 'trash' | 'duplicates' };

const ITEMS: Item[] = [
  { href: '/admin', icon: '📊', label: 'მიმოხილვა', exact: true },
  { href: '/admin/registrations', icon: '📝', label: 'რეგისტრაციები', badgeKey: 'registrations' },
  { href: '/admin/users', icon: '👥', label: 'მომხმარებლები' },
  { href: '/admin/agents', icon: '🏢', label: 'აგენტები' },
  { href: '/admin/properties', icon: '🏘️', label: 'განცხადებები', badgeKey: 'properties' },
  { href: '/admin/duplicates', icon: '🧬', label: 'დუბლიკატები', badgeKey: 'duplicates' },
  { href: '/admin/trash', icon: '🗑️', label: 'ნაგვის ყუთი', badgeKey: 'trash' },
  { href: '/admin/tours', icon: '🌐', label: '3D ტურები' },
  { href: '/admin/messages', icon: '💬', label: 'შეტყობინებები' },
  { href: '/admin/audit-logs', icon: '📋', label: 'ჟურნალი' },
];

const ANALYTICS_ITEMS: Item[] = [
  { href: '/admin/analytics', icon: '📈', label: 'ანალიტიკა', exact: true },
  { href: '/admin/analytics/search', icon: '🔍', label: 'სერჩის ანალიტიკა' },
];

export function AdminSidebar({
  pendingRegistrations: pendingRegistrationsProp,
  pendingProperties: pendingPropertiesProp,
}: {
  pendingRegistrations?: number;
  pendingProperties?: number;
} = {}) {
  const pathname = usePathname();
  const [pendingRegistrations, setPendingRegistrations] = useState(pendingRegistrationsProp ?? 0);
  const [pendingProperties, setPendingProperties] = useState(pendingPropertiesProp ?? 0);
  const [trashCount, setTrashCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);

  useEffect(() => {
    if (pendingRegistrationsProp !== undefined) setPendingRegistrations(pendingRegistrationsProp);
  }, [pendingRegistrationsProp]);

  useEffect(() => {
    if (pendingPropertiesProp !== undefined) setPendingProperties(pendingPropertiesProp);
  }, [pendingPropertiesProp]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${getApiBase()}/api/admin/counts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || !alive) return;
        const data = await res.json();
        setPendingRegistrations(data.pendingRegistrations ?? 0);
        setPendingProperties(data.pendingProperties ?? 0);
        setTrashCount(data.trashCount ?? 0);
        setDuplicateCount(data.duplicateCount ?? 0);
      } catch {
        /* ignore */
      }
    })();

    return () => {
      alive = false;
    };
  }, [pathname]);

  const isActive = (item: Item) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname?.startsWith(item.href + '/');

  const analyticsSectionActive =
    pathname === '/admin/analytics' || pathname?.startsWith('/admin/analytics/');

  const badgeFor = (key?: Item['badgeKey']) => {
    if (key === 'registrations' && pendingRegistrations > 0) return pendingRegistrations;
    if (key === 'properties' && pendingProperties > 0) return pendingProperties;
    if (key === 'trash' && trashCount > 0) return trashCount;
    if (key === 'duplicates' && duplicateCount > 0) return duplicateCount;
    return 0;
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 overflow-y-auto bg-gray-900 p-4 text-white">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">🏠 VR Georgia</h1>
        <p className="text-sm text-gray-400">ადმინისტრატორის პანელი</p>
      </div>

      <nav className="space-y-2">
        {ITEMS.map((item) => {
          const badge = badgeFor(item.badgeKey);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 transition ${
                isActive(item) ? 'bg-blue-600' : 'hover:bg-gray-800'
              }`}
            >
              <span className="flex items-center gap-3">
                <span>{item.icon}</span> {item.label}
              </span>
              {badge > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${
                    item.badgeKey === 'properties'
                      ? 'bg-orange-500'
                      : item.badgeKey === 'trash'
                        ? 'bg-gray-500'
                        : item.badgeKey === 'duplicates'
                          ? 'bg-purple-500'
                          : 'bg-rose-500'
                  }`}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}

        <div className={`rounded-lg ${analyticsSectionActive ? 'bg-gray-800/60' : ''}`}>
          {ANALYTICS_ITEMS.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex w-full items-center gap-3 rounded-lg py-3 transition ${
                index === 0 ? 'px-4' : 'pl-10 pr-4'
              } ${isActive(item) ? 'bg-blue-600' : 'hover:bg-gray-800'}`}
            >
              <span>{item.icon}</span>
              <span className={index === 1 ? 'text-sm' : ''}>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="mt-8 border-t border-gray-800 pt-4">
        <Link
          href="/"
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-gray-400 hover:bg-gray-800"
        >
          <span>🏠</span> საიტზე დაბრუნება
        </Link>
      </div>
    </div>
  );
}
