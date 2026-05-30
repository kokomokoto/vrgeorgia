'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMe } from '@/lib/api';
import { getApiBase } from '@/lib/config';
import { AdminSidebar } from '@/components/AdminSidebar';

interface Stats {
  totalUsers: number;
  pendingRegistrations: number;
  totalAgents: number;
  unverifiedAgents: number;
  totalProperties: number;
  pendingProperties: number;
  activeProperties: number;
  totalMessages: number;
  recentUsers: number;
  recentProperties: number;
  propertiesByType: { _id: string; count: number }[];
  propertiesByDealType: { _id: string; count: number }[];
  usersByRole: { _id: string; count: number }[];
  dailyStats: { date: string; users: number; properties: number }[];
}
interface AuditLog {
  _id: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  adminId?: { name?: string; email?: string };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const { user } = await getMe();
      if (user.role !== 'admin') {
        const roleLabel =
          user.role === 'agent' ? 'აგენტი' : user.role === 'user' ? 'მომხმარებელი' : String(user.role ?? '—');
        setError(
          `თქვენი ანგარიში (${user.email}) არ არის ადმინისტრატორი — მიმდინარე როლი: ${roleLabel}. ` +
            'ადმინის უფლება უნდა დაენიჭოს ბაზაში (role: admin), შემდეგ გამოდით და ხელახლა შედით.'
        );
        setLoading(false);
        return;
      }

      const api = getApiBase();
      const res = await fetch(`${api}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 403) {
        setError('წვდომა აკრძალულია. მხოლოდ ადმინისტრატორისთვის.');
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error('Failed to load');

      const [statsData, logsRes] = await Promise.all([
        res.json(),
        fetch(`${api}/api/admin/audit-logs?limit=12`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setStats(statsData);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setAuditLogs(logsData.logs || []);
      }
    } catch (err) {
      setError('მონაცემების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const propertyTypeNames: Record<string, string> = {
    apartment: 'ბინა',
    house: 'სახლი',
    commercial: 'კომერციული',
    land: 'მიწა',
    cottage: 'აგარაკი',
    hotel: 'სასტუმრო',
    building: 'შენობა',
    warehouse: 'საწყობი',
    parking: 'ავტოფარეხი',
    business: 'ბიზნესი'
  };

  const dealTypeNames: Record<string, string> = {
    sale: 'იყიდება',
    rent: 'ქირავდება',
    mortgage: 'გირავდება'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">წვდომა შეზღუდულია</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/" className="text-blue-600 hover:underline">
            მთავარ გვერდზე დაბრუნება
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar pendingCount={stats?.pendingRegistrations || 0} />

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">მიმოხილვა</h1>
          <p className="text-gray-600">საიტის სტატისტიკა და მონაცემები</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">მომხმარებლები</p>
                <p className="text-3xl font-bold text-gray-800">{stats?.totalUsers || 0}</p>
                <p className="text-green-500 text-sm mt-1">+{stats?.recentUsers || 0} ბოლო 30 დღეში</p>
              </div>
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                👥
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">აგენტები</p>
                <p className="text-3xl font-bold text-gray-800">{stats?.totalAgents || 0}</p>
                <p className="text-gray-400 text-sm mt-1">რეგისტრირებული • {stats?.unverifiedAgents || 0} ვერიფიკაციის მოლოდინში</p>
              </div>
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                🏢
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">განცხადებები</p>
                <p className="text-3xl font-bold text-gray-800">{stats?.totalProperties || 0}</p>
                <p className="text-green-500 text-sm mt-1">+{stats?.recentProperties || 0} ბოლო 30 დღეში</p>
              </div>
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center text-2xl">
                🏘️
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">მოლოდინში</p>
                <p className="text-3xl font-bold text-orange-500">{stats?.pendingProperties || 0}</p>
                <p className="text-gray-400 text-sm mt-1">დასამტკიცებელი</p>
              </div>
              <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center text-2xl">
                ⏳
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Properties by Type */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">განცხადებები ტიპის მიხედვით</h3>
            <div className="space-y-3">
              {stats?.propertiesByType.map((item) => (
                <div key={item._id} className="flex items-center justify-between">
                  <span className="text-gray-600">{propertyTypeNames[item._id] || item._id}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${(item.count / (stats?.totalProperties || 1)) * 100}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-gray-800 font-medium w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Properties by Deal Type */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">განცხადებები გარიგების ტიპით</h3>
            <div className="space-y-3">
              {stats?.propertiesByDealType.map((item) => (
                <div key={item._id} className="flex items-center justify-between">
                  <span className="text-gray-600">{dealTypeNames[item._id] || item._id}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${(item.count / (stats?.totalProperties || 1)) * 100}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-gray-800 font-medium w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Daily Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">ბოლო 7 დღის აქტივობა</h3>
          <div className="flex items-end justify-between h-40 gap-2">
            {stats?.dailyStats.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-blue-500 rounded-t"
                    style={{ height: `${Math.max(day.users * 20, 4)}px` }}
                    title={`მომხმარებლები: ${day.users}`}
                  ></div>
                  <div
                    className="w-full bg-green-500 rounded-t"
                    style={{ height: `${Math.max(day.properties * 20, 4)}px` }}
                    title={`განცხადებები: ${day.properties}`}
                  ></div>
                </div>
                <span className="text-xs text-gray-500">{day.date.slice(5)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-600">მომხმარებლები</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">განცხადებები</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">სწრაფი მოქმედებები</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/admin/registrations"
              className="p-4 bg-rose-50 rounded-lg hover:bg-rose-100 transition text-center relative"
            >
              {(stats?.pendingRegistrations || 0) > 0 && (
                <span className="absolute top-2 right-2 bg-rose-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                  {stats?.pendingRegistrations}
                </span>
              )}
              <div className="text-3xl mb-2">📝</div>
              <div className="font-medium text-gray-800">რეგისტრაციები</div>
              <div className="text-sm text-gray-500">{stats?.pendingRegistrations || 0} დასამტკიცებელი</div>
            </Link>
            <Link
              href="/admin/properties?status=pending"
              className="p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition text-center"
            >
              <div className="text-3xl mb-2">⏳</div>
              <div className="font-medium text-gray-800">მოლოდინში</div>
              <div className="text-sm text-gray-500">{stats?.pendingProperties || 0} განცხადება</div>
            </Link>
            <Link
              href="/admin/users"
              className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition text-center"
            >
              <div className="text-3xl mb-2">👥</div>
              <div className="font-medium text-gray-800">მომხმარებლები</div>
              <div className="text-sm text-gray-500">მართვა</div>
            </Link>
            <Link
              href="/admin/agents"
              className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition text-center"
            >
              <div className="text-3xl mb-2">✅</div>
              <div className="font-medium text-gray-800">ვერიფიკაცია</div>
              <div className="text-sm text-gray-500">აგენტების</div>
            </Link>
            <Link
              href="/admin/messages"
              className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition text-center"
            >
              <div className="text-3xl mb-2">💬</div>
              <div className="font-medium text-gray-800">შეტყობინებები</div>
              <div className="text-sm text-gray-500">{stats?.totalMessages || 0} სულ</div>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">ადმინისტრატორის ქმედებების ჟურნალი</h3>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-gray-500">ჩანაწერები ჯერ არ არის</p>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log._id} className="flex items-center justify-between border-b border-gray-100 pb-2 text-sm">
                  <div className="text-gray-700">
                    <span className="font-medium">{log.action}</span> • {log.targetType} • {log.targetId.slice(-6)}
                  </div>
                  <div className="text-gray-500">
                    {(log.adminId?.name || log.adminId?.email || 'admin')} • {new Date(log.createdAt).toLocaleString('ka-GE')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
