'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { resolveImageUrl } from '@/lib/api';
import { getApiBase } from '@/lib/config';
import { AdminSidebar } from '@/components/AdminSidebar';

interface DuplicateItem {
  _id: string;
  numericId?: number;
  title: string;
  price: number;
  priceCurrency: string;
  type: string;
  dealType: string;
  city: string;
  street: string;
  status: string;
  photoCount: number;
  photos: string[];
  createdAt: string;
  hasClientRequestId: boolean;
}

interface DuplicateGroup {
  key: string;
  owner?: { name?: string; email?: string } | null;
  count: number;
  keeperId: string;
  firstCreatedAt: string;
  lastCreatedAt: string;
  totalPhotos: number;
  photolessCount: number;
  items: DuplicateItem[];
}

interface PhotolessItem {
  _id: string;
  numericId?: number;
  title: string;
  price: number;
  priceCurrency: string;
  type: string;
  dealType: string;
  city: string;
  street: string;
  status: string;
  owner?: { name?: string; email?: string } | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  apartment: 'ბინა',
  house: 'სახლი',
  commercial: 'კომერციული',
  land: 'მიწა',
  cottage: 'კოტეჯი',
  hotel: 'სასტუმრო',
  building: 'შენობა',
  warehouse: 'საწყობი',
  parking: 'პარკინგი',
  business: 'ბიზნესი',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'მოდერაციაში',
  active: 'აქტიური',
  rejected: 'უარყოფილი',
  sold: 'გაყიდული',
};

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString('ka-GE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export default function AdminDuplicatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [photoless, setPhotoless] = useState<PhotolessItem[]>([]);
  const [totalDuplicates, setTotalDuplicates] = useState(0);
  const [windowMinutes, setWindowMinutes] = useState(60);
  const [sinceDays, setSinceDays] = useState(90);
  const [keeperByGroup, setKeeperByGroup] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fetchDuplicates = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        windowMinutes: String(windowMinutes),
        sinceDays: String(sinceDays),
      });
      const res = await fetch(`${getApiBase()}/api/admin/duplicates?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        router.push('/');
        return;
      }
      if (!res.ok) throw new Error('fetch failed');

      const data = await res.json();
      const list: DuplicateGroup[] = data.groups || [];
      setGroups(list);
      setPhotoless(data.photoless || []);
      setTotalDuplicates(data.totalDuplicates || 0);
      setKeeperByGroup(
        Object.fromEntries(list.map((g) => [g.key, g.keeperId])) as Record<string, string>
      );
    } catch {
      setError('დუბლიკატების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  }, [router, sinceDays, windowMinutes]);

  useEffect(() => {
    fetchDuplicates();
  }, [fetchDuplicates]);

  const handleMerge = async (group: DuplicateGroup) => {
    const keeperId = keeperByGroup[group.key] || group.keeperId;
    const duplicateIds = group.items.map((i) => i._id).filter((id) => id !== keeperId);
    if (duplicateIds.length === 0) return;

    const confirmed = confirm(
      `გაერთიანება: ${duplicateIds.length} დუბლიკატის ფოტოები გადმოვა შენარჩუნებულ ობიექტზე, ` +
        'დანარჩენები ნაგვის ყუთში გადავა (აღდგენადია). გავაგრძელოთ?'
    );
    if (!confirmed) return;

    const token = localStorage.getItem('token');
    setBusyKey(group.key);
    setError('');
    setNotice('');
    try {
      const res = await fetch(`${getApiBase()}/api/admin/duplicates/merge`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keeperId, duplicateIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || 'გაერთიანება ვერ მოხერხდა');
        return;
      }
      setNotice(data?.message || 'გაერთიანდა');
      await fetchDuplicates();
    } catch {
      setError('გაერთიანება ვერ მოხერხდა');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <main className="ml-64 flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🧬 დუბლიკატები</h1>
          <p className="text-sm text-gray-500">
            ერთი და იმავე მფლობელის იდენტური განცხადებები, რომლებიც მოკლე დროში აიტვირთა —
            ჩავარდნილი ატვირთვის განმეორებითი დაჭერის შედეგი. ფოტოები გადმოგვაქვს ერთ
            ობიექტზე, დანარჩენები ნაგვის ყუთში გადადის.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-4 rounded-xl bg-white p-4 shadow-sm">
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">ფანჯარა (წუთი)</span>
            <input
              type="number"
              min={5}
              max={1440}
              value={windowMinutes}
              onChange={(e) => setWindowMinutes(Math.max(5, Number(e.target.value) || 60))}
              className="w-28 rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">პერიოდი (დღე)</span>
            <input
              type="number"
              min={1}
              max={365}
              value={sinceDays}
              onChange={(e) => setSinceDays(Math.max(1, Number(e.target.value) || 90))}
              className="w-28 rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={fetchDuplicates}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            ძებნა
          </button>
          <p className="ml-auto text-sm text-gray-500">
            ჯგუფი: {groups.length} · ზედმეტი ჩანაწერი: {totalDuplicates} · უფოტოო:{' '}
            {photoless.length}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {notice && (
          <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center rounded-xl bg-white py-16 shadow-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl bg-white py-16 text-center text-gray-400 shadow-sm">
            დუბლიკატი არ მოიძებნა
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => {
              const keeperId = keeperByGroup[group.key] || group.keeperId;
              const busy = busyKey === group.key;
              return (
                <div key={group.key} className="rounded-xl bg-white p-5 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-gray-800">{group.items[0]?.title}</h2>
                      <p className="text-xs text-gray-500">
                        {group.owner?.name || '—'}
                        {group.owner?.email ? ` · ${group.owner.email}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {group.count} ჩანაწერი · {formatDate(group.firstCreatedAt)} —{' '}
                        {formatDate(group.lastCreatedAt)}
                        {group.photolessCount > 0
                          ? ` · ${group.photolessCount} უფოტოო`
                          : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleMerge(group)}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busy ? 'მიმდინარეობს…' : 'გაერთიანება'}
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.items.map((item) => {
                      const isKeeper = item._id === keeperId;
                      return (
                        <label
                          key={item._id}
                          className={`flex cursor-pointer gap-3 rounded-lg border-2 p-3 transition-colors ${
                            isKeeper
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`keeper-${group.key}`}
                            checked={isKeeper}
                            onChange={() =>
                              setKeeperByGroup((prev) => ({ ...prev, [group.key]: item._id }))
                            }
                            className="mt-1"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 h-16 w-full overflow-hidden rounded bg-gray-100">
                              {item.photos[0] ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={resolveImageUrl(item.photos[0])}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs text-gray-400">
                                  ფოტო არ არის
                                </div>
                              )}
                            </div>
                            <p className="text-xs font-medium text-gray-800">
                              #{item.numericId ?? '—'} · {item.photoCount} ფოტო
                            </p>
                            <p className="text-xs text-gray-500">
                              {TYPE_LABELS[item.type] || item.type} ·{' '}
                              {STATUS_LABELS[item.status] || item.status}
                            </p>
                            <p className="text-xs text-gray-400">{formatDate(item.createdAt)}</p>
                            <Link
                              href={`/property/${item._id}`}
                              target="_blank"
                              className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                            >
                              გახსნა →
                            </Link>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-xs text-gray-400">
                    მონიშნულია შესანარჩუნებელი ობიექტი (ავტომატურად — ყველაზე მეტი ფოტოთი).
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {!loading && photoless.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-800">📷 უფოტოო განცხადებები</h2>
            <p className="mb-4 text-sm text-gray-500">
              ობიექტი შენახულია, ფოტოები კი ვერ აიტვირთა — ჩავარდნილი ატვირთვის კვალი.
              გახსენით რედაქტირებაში და დაამატეთ ფოტოები, ან წაშალეთ ჩანაწერი.
            </p>
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">სათაური</th>
                    <th className="px-4 py-3">მფლობელი</th>
                    <th className="px-4 py-3">ტიპი</th>
                    <th className="px-4 py-3">სტატუსი</th>
                    <th className="px-4 py-3">თარიღი</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {photoless.map((item) => (
                    <tr key={item._id}>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-800">
                          {item.title || '—'}
                        </span>
                        <span className="ml-2 text-xs text-gray-400">
                          #{item.numericId ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {item.owner?.name || '—'}
                        {item.owner?.email ? (
                          <span className="block text-gray-400">{item.owner.email}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {TYPE_LABELS[item.type] || item.type}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {STATUS_LABELS[item.status] || item.status}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/property/${item._id}/edit`}
                          target="_blank"
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          ფოტოების დამატება →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="mt-6 text-xs text-gray-400">
          წაშლილი დუბლიკატები აღდგენადია{' '}
          <Link href="/admin/trash" className="text-blue-600 hover:underline">
            ნაგვის ყუთიდან
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
