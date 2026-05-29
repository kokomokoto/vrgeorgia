'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Item = { href: string; icon: string; label: string; exact?: boolean };

const ITEMS: Item[] = [
  { href: '/admin', icon: '📊', label: 'მიმოხილვა', exact: true },
  { href: '/admin/registrations', icon: '📝', label: 'რეგისტრაციები' },
  { href: '/admin/users', icon: '👥', label: 'მომხმარებლები' },
  { href: '/admin/agents', icon: '🏢', label: 'აგენტები' },
  { href: '/admin/properties', icon: '🏘️', label: 'განცხადებები' },
  { href: '/admin/tours', icon: '🌐', label: '3D ტურები' },
  { href: '/admin/messages', icon: '💬', label: 'შეტყობინებები' },
  { href: '/admin/analytics', icon: '📈', label: 'ანალიტიკა' },
];

export function AdminSidebar({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname();

  const isActive = (item: Item) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname?.startsWith(item.href + '/');

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white p-4 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">🏠 VR Georgia</h1>
        <p className="text-gray-400 text-sm">ადმინისტრატორის პანელი</p>
      </div>

      <nav className="space-y-2">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between gap-3 block transition ${
              isActive(item) ? 'bg-blue-600' : 'hover:bg-gray-800'
            }`}
          >
            <span className="flex items-center gap-3">
              <span>{item.icon}</span> {item.label}
            </span>
            {item.href === '/admin/registrations' && pendingCount > 0 && (
              <span className="bg-rose-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                {pendingCount}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="mt-8 border-t border-gray-800 pt-4">
        <Link
          href="/"
          className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 block text-gray-400"
        >
          <span>🏠</span> საიტზე დაბრუნება
        </Link>
      </div>
    </div>
  );
}
