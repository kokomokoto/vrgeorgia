'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Message {
  _id: string;
  content: string;
  sender?: {
    name: string;
    email: string;
  };
  receiver?: {
    name: string;
    email: string;
  };
  read: boolean;
  createdAt: string;
}

export default function AdminMessages() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMessages();
  }, [page]);

  const fetchMessages = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      });

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/messages?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 403) {
        setError('წვდომა აკრძალულია');
        return;
      }

      const data = await res.json();
      setMessages(data.messages);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError('მონაცემების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
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
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white p-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">🏠 VR Georgia</h1>
          <p className="text-gray-400 text-sm">ადმინისტრატორის პანელი</p>
        </div>

        <nav className="space-y-2">
          <Link href="/admin" className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 block">
            <span>📊</span> მიმოხილვა
          </Link>
          <Link href="/admin/users" className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 block">
            <span>👥</span> მომხმარებლები
          </Link>
          <Link href="/admin/agents" className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 block">
            <span>🏢</span> აგენტები
          </Link>
          <Link href="/admin/properties" className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 block">
            <span>🏘️</span> განცხადებები
          </Link>
          <div className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 bg-blue-600">
            <span>💬</span> შეტყობინებები
          </div>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Link href="/" className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 block text-gray-400">
            <span>🏠</span> საიტზე დაბრუნება
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">შეტყობინებები</h1>
          <p className="text-gray-600">სულ: {total} შეტყობინება</p>
        </div>

        {/* Messages List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">იტვირთება...</div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-gray-500">შეტყობინებები ვერ მოიძებნა</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {messages.map((message) => (
                <div key={message._id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-800">
                          {message.sender?.name || message.sender?.email || 'უცნობი'}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium text-gray-800">
                          {message.receiver?.name || message.receiver?.email || 'უცნობი'}
                        </span>
                        {!message.read && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            წაუკითხავი
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2">{message.content}</p>
                    </div>
                    <div className="text-sm text-gray-400 ml-4">
                      {new Date(message.createdAt).toLocaleString('ka-GE')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

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
      </div>
    </div>
  );
}
