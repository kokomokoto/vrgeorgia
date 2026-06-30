'use client';

import { useCallback, useEffect, useState } from 'react';
import { resolveImageUrl } from '@/lib/api';
import { getApiBase } from '@/lib/config';

type AgentOption = {
  _id: string;
  user?: string;
  name: string;
  email: string;
  company?: string;
  photo?: string;
  propertyCount?: number;
};

export function AdminTransferPropertyModal({
  open,
  propertyId,
  propertyTitle,
  excludeAgentId,
  excludeUserId,
  onClose,
  onTransferred,
}: {
  open: boolean;
  propertyId: string;
  propertyTitle: string;
  /** ამჟამინდელი აგენტის Agent._id — არ გამოჩნდეს სიაში */
  excludeAgentId?: string;
  /** ამჟამინდელი მფლობელის User._id */
  excludeUserId?: string;
  onClose: () => void;
  onTransferred: () => void;
}) {
  const [search, setSearch] = useState('');
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');

  const loadAgents = useCallback(async (q: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (q.trim()) params.set('search', q.trim());

      const res = await fetch(`${getApiBase()}/api/admin/agents?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      const list = (data.agents || []) as AgentOption[];
      setAgents(
        list.filter((a) => {
          if (excludeAgentId && String(a._id) === String(excludeAgentId)) return false;
          if (excludeUserId && a.user && String(a.user) === String(excludeUserId)) return false;
          return true;
        })
      );
    } catch {
      setError('აგენტების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  }, [excludeAgentId, excludeUserId]);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setSelectedId('');
    setError('');
    loadAgents('');
  }, [open, loadAgents]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => loadAgents(search), 300);
    return () => clearTimeout(timer);
  }, [search, open, loadAgents]);

  const handleSubmit = async () => {
    if (!selectedId) {
      setError('აირჩიეთ აგენტი');
      return;
    }

    const agent = agents.find((a) => a._id === selectedId);
    if (!agent) return;
    if (!confirm(`განცხადება „${propertyTitle}“ გადაეცეს აგენტს „${agent.name}“?`)) return;

    const token = localStorage.getItem('token');
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${getApiBase()}/api/admin/properties/${propertyId}/transfer`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId: selectedId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || 'გადაცემა ვერ მოხერხდა');
        return;
      }
      onTransferred();
      onClose();
    } catch {
      setError('გადაცემა ვერ მოხერხდა');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-bold text-gray-800">🔀 აგენტზე გადაცემა</h2>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{propertyTitle}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="აგენტის ძებნა (სახელი, ელ-ფოსტა, კომპანია)..."
            className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            autoFocus
          />

          {error && (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-400">იტვირთება...</div>
          ) : agents.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">აგენტი ვერ მოიძებნა</div>
          ) : (
            <ul className="space-y-2">
              {agents.map((agent) => {
                const selected = selectedId === agent._id;
                return (
                  <li key={agent._id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(agent._id)}
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                        selected
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                        {agent.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resolveImageUrl(agent.photo)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-400">👤</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-800">{agent.name}</p>
                        <p className="truncate text-xs text-gray-500">{agent.email}</p>
                        {agent.company && (
                          <p className="truncate text-xs text-gray-400">{agent.company}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-gray-400">
                        {agent.propertyCount ?? 0} განც.
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            გაუქმება
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedId}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'იგზავნება...' : 'გადაცემა'}
          </button>
        </div>
      </div>
    </div>
  );
}
