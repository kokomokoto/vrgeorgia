'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Stats {
  totalUsers: number;
  totalAgents: number;
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

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 403) {
        setError('წვდომა აკრძალულია. მხოლოდ ადმინისტრატორისთვის.');
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error('Failed to load');

      const data = await res.json();
      setStats(data);
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
    land: 'მიწა'
  };

  const dealTypeNames: Record<string, string> = {
    sale: 'იყიდება',
    rent: 'ქირავდება',
    daily: 'დღიურად'
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
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white p-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">🏠 VR Georgia</h1>
          <p className="text-gray-400 text-sm">ადმინისტრატორის პანელი</p>
        </div>

        <nav className="space-y-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${
              activeTab === 'overview' ? 'bg-blue-600' : 'hover:bg-gray-800'
            }`}
          >
            <span>📊</span> მიმოხილვა
          </button>
          <Link
            href="/admin/users"
            className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 block"
          >
            <span>👥</span> მომხმარებლები
          </Link>
          <Link
            href="/admin/agents"
            className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 block"
          >
            <span>🏢</span> აგენტები
          </Link>
          <Link
            href="/admin/properties"
            className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 block"
          >
            <span>🏘️</span> განცხადებები
          </Link>
          <Link
            href="/admin/messages"
            className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 block"
          >
            <span>💬</span> შეტყობინებები
          </Link>
          <Link
            href="/admin/analytics"
            className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 block"
          >
            <span>📈</span> ანალიტიკა
          </Link>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Link
            href="/"
            className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 block text-gray-400"
          >
            <span>🏠</span> საიტზე დაბრუნება
          </Link>
        </div>
      </div>

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
                <p className="text-gray-400 text-sm mt-1">რეგისტრირებული</p>
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
      </div>
    </div>
  );
}
