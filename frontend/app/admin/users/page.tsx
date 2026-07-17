'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiBase } from '@/lib/config';
import { resolveImageUrl } from '@/lib/api';
import { AdminSidebar } from '@/components/AdminSidebar';
import { ROLE_BADGE_COLORS, roleLabel } from '@/lib/userRoles';

interface User {
  _id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
  avatar?: string;
  status?: string;
  createdAt: string;
}

export default function AdminUsers() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter })
      });

      const res = await fetch(`${getApiBase()}/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 403) {
        setError('წვდომა აკრძალულია');
        return;
      }

      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError('მონაცემების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiBase()}/api/admin/users/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editingUser)
      });

      if (res.ok) {
        setEditingUser(null);
        fetchUsers();
      }
    } catch (err) {
      alert('განახლება ვერ მოხერხდა');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('ნამდვილად გსურთ მომხმარებლის წაშლა?')) return;
    // OK = მისი განცხადებებიც წაიშლება; Cancel = განცხადებები რჩება
    const deleteProps = confirm('ასევე წავშალო ამ მომხმარებლის ყველა განცხადება?\n\nOK — განცხადებებიც წაიშლება\nგაუქმება — განცხადებები დარჩება');
    const keepProperties = !deleteProps;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiBase()}/api/admin/users/${userId}?keepProperties=${keepProperties}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      alert('წაშლა ვერ მოხერხდა');
    }
  };

  const openPasswordReset = (user: User) => {
    setPasswordUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordFeedback(null);
  };

  const handleResetPassword = async () => {
    if (!passwordUser) return;
    if (newPassword.length < 6) {
      setPasswordFeedback('ახალი პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback('პაროლები არ ემთხვევა');
      return;
    }

    const token = localStorage.getItem('token');
    setResettingPassword(true);
    setPasswordFeedback(null);
    try {
      const res = await fetch(`${getApiBase()}/api/admin/users/${passwordUser._id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordFeedback(data.message || 'პაროლის აღდგენა ვერ მოხერხდა');
        return;
      }
      alert(
        `პაროლი განახლდა მომხმარებლისთვის: ${passwordUser.email}\n\nშეატყობინეთ აგენტს ახალი პაროლი (დროებითი) და ურჩიეთ პროფილიდან შეცვალოს.`
      );
      setPasswordUser(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordFeedback('პაროლის აღდგენა ვერ მოხერხდა');
    } finally {
      setResettingPassword(false);
    }
  };

  const roleBadgeColors = ROLE_BADGE_COLORS;

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
      <AdminSidebar />

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">მომხმარებლები</h1>
            <p className="text-gray-600">სულ: {total} მომხმარებელი</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <input
              type="text"
              placeholder="ძიება ემეილით ან სახელით..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">ყველა როლი</option>
              <option value="user">მომხმარებელი</option>
              <option value="agent">აგენტი</option>
              <option value="agent_admin">აგენტი-ადმინი</option>
              <option value="admin">ადმინი</option>
            </select>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              ძიება
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">მომხმარებელი</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">ტელეფონი</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">როლი</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">რეგისტრაცია</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">მოქმედებები</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    იტვირთება...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    მომხმარებლები ვერ მოიძებნა
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resolveImageUrl(user.avatar)}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
                            {(user.name?.[0] || user.email?.[0] || '?').toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium text-gray-800">{user.name || '(უსახელო)'}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {user.phone || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleBadgeColors[user.role as keyof typeof roleBadgeColors] || 'bg-gray-100 text-gray-700'}`}>
                        {roleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString('ka-GE')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        ✏️ რედაქტირება
                      </button>
                      <button
                        onClick={() => openPasswordReset(user)}
                        className="text-amber-700 hover:text-amber-900 mr-3"
                      >
                        🔑 პაროლი
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        🗑️ წაშლა
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {pages > 1 && (
            <div className="px-6 py-4 bg-gray-50 flex justify-between items-center">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50"
              >
                ← წინა
              </button>
              <span className="text-gray-600">
                გვერდი {page} / {pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50"
              >
                შემდეგი →
              </button>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">მომხმარებლის რედაქტირება</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">სახელი</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ემეილი</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ტელეფონი</label>
                  <input
                    type="text"
                    value={editingUser.phone}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">როლი</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="user">მომხმარებელი</option>
                    <option value="agent">აგენტი</option>
                    <option value="agent_admin">აგენტი-ადმინი</option>
                    <option value="admin">ადმინი</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  გაუქმება
                </button>
                <button
                  onClick={handleUpdateUser}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  შენახვა
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Password reset modal */}
        {passwordUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-1">პაროლის აღდგენა</h2>
              <p className="mb-4 text-sm text-gray-600">
                {passwordUser.name || '(უსახელო)'} · {passwordUser.email}
              </p>
              <p className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                დააყენეთ დროებითი პაროლი და გადაეცით აგენტს. შემდეგ აგენტმა პროფილიდან უნდა შეცვალოს საკუთარი პაროლი.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ახალი პაროლი</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="მინ. 6 სიმბოლო"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">გაიმეორეთ პაროლი</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                {passwordFeedback && (
                  <p className="text-sm text-red-600">{passwordFeedback}</p>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordUser(null);
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordFeedback(null);
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  გაუქმება
                </button>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={resettingPassword || !newPassword || !confirmPassword}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {resettingPassword ? '...' : 'პაროლის დაყენება'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
