'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE } from '@/lib/config';
import { AdminSidebar } from '@/components/AdminSidebar';

interface PendingUser {
  _id: string;
  email: string;
  name?: string;
  phone?: string;
  personalId?: string;
  role: string;
  status: string;
  createdAt: string;
}

const roleNames: Record<string, string> = {
  user: 'მომხმარებელი',
  agent: 'აგენტი',
  admin: 'ადმინი',
};

export default function AdminRegistrationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/admin/users?status=pending&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        setError('წვდომა აკრძალულია. მხოლოდ ადმინისტრატორისთვის.');
        return;
      }
      if (!res.ok) {
        setError('მონაცემების ჩატვირთვა ვერ მოხერხდა');
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      setError('სერვერთან კავშირი ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const act = async (id: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !confirm('ნამდვილად გსურთ ამ რეგისტრაციის უარყოფა?')) return;
    const token = localStorage.getItem('token');
    setBusyId(id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${id}/${action}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u._id !== id));
      } else {
        alert('ოპერაცია ვერ შესრულდა');
      }
    } catch {
      alert('ოპერაცია ვერ შესრულდა');
    } finally {
      setBusyId(null);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/" className="text-blue-600 hover:underline">მთავარ გვერდზე დაბრუნება</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar pendingCount={users.length} />

      <div className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">რეგისტრაციის მოთხოვნები</h1>
          <p className="text-gray-600">დასამტკიცებელი ანგარიშები: {users.length}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">მომხმარებელი</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">როლი</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">თარიღი</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">მოქმედებები</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">იტვირთება...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">დასამტკიცებელი მოთხოვნები არ არის ✅</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">{u.name || '(უსახელო)'}</div>
                      <div className="text-sm text-gray-500">{u.email}</div>
                      {u.phone && <div className="text-sm text-gray-500">📞 {u.phone}</div>}
                      {u.personalId && <div className="text-sm text-gray-500">პ/ნ: {u.personalId}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                        {roleNames[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(u.createdAt).toLocaleString('ka-GE')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={busyId === u._id}
                          onClick={() => act(u._id, 'approve')}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                        >
                          ✅ დამტკიცება
                        </button>
                        <button
                          disabled={busyId === u._id}
                          onClick={() => act(u._id, 'reject')}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                        >
                          ❌ უარყოფა
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
