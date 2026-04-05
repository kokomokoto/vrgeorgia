'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';
import {
  getConversations,
  getMessages,
  sendMessage,
  getUnreadCount,
  resolveImageUrl,
  type Conversation,
  type Message,
} from '@/lib/api';

export default function ChatWidget() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<Conversation['user'] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // წაუკითხავი მესიჯების რაოდენობა - პოლინგი
  useEffect(() => {
    if (!token) return;
    const check = () => { getUnreadCount().then(r => setUnread(r.count)).catch(() => {}); };
    check();
    const iv = setInterval(check, 15000);
    return () => clearInterval(iv);
  }, [token]);

  // კონვერსაციების ჩატვირთვა
  const loadConversations = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getConversations();
      setConversations(data);
    } catch {}
  }, [token]);

  useEffect(() => {
    if (open && token) loadConversations();
  }, [open, token, loadConversations]);

  // მესიჯების ჩატვირთვა
  const loadMessages = useCallback(async (userId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const msgs = await getMessages(userId);
      setMessages(msgs);
      // განავრცეთ unread
      getUnreadCount().then(r => setUnread(r.count)).catch(() => {});
    } catch {} finally { setLoading(false); }
  }, [token]);

  // არჩეული მომხმარებლის მესიჯები
  useEffect(() => {
    if (!selectedUser) return;
    loadMessages(selectedUser._id);
    // პოლინგი ყოველ 5 წამში
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => loadMessages(selectedUser._id), 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedUser, loadMessages]);

  // ავტო-სქროლი
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !selectedUser || sending) return;
    setSending(true);
    try {
      await sendMessage(selectedUser._id, text.trim());
      setText('');
      await loadMessages(selectedUser._id);
      await loadConversations();
    } catch {} finally { setSending(false); }
  };

  const myId = user?.id || user?._id;

  const formatTime = (d: string) => {
    const date = new Date(d);
    return date.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' });
  };

  // თუ არ არის ავტორიზებული, ღილაკი login-ზე გადაამისამართებს
  const handleOpen = () => {
    if (!token) {
      router.push('/login');
      return;
    }
    setOpen(!open);
  };

  return (
    <>
      {/* ჩათის ფანჯარა */}
      {open && token && (
        <div className="fixed bottom-20 right-4 z-50 w-[360px] h-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            {selectedUser ? (
              <div className="flex items-center gap-2 min-w-0">
                <button onClick={() => { setSelectedUser(null); setMessages([]); }} className="hover:bg-blue-700 rounded-full p-1 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                </button>
                {selectedUser.avatar ? (
                  <img src={resolveImageUrl(selectedUser.avatar)} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {selectedUser.email?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <span className="text-sm font-medium truncate">{selectedUser.username || selectedUser.email}</span>
              </div>
            ) : (
              <span className="text-sm font-semibold">შეტყობინებები</span>
            )}
            <button onClick={() => setOpen(false)} className="hover:bg-blue-700 rounded-full p-1 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Content */}
          {!selectedUser ? (
            /* კონვერსაციების სია */
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-slate-400">
                  ჯერ არ გაქვთ შეტყობინებები
                </div>
              ) : (
                conversations.map(conv => (
                  <button
                    key={conv.user._id}
                    onClick={() => setSelectedUser(conv.user)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left"
                  >
                    {conv.user.avatar ? (
                      <img src={resolveImageUrl(conv.user.avatar)} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm text-slate-500 flex-shrink-0">
                        {conv.user.email?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-800 truncate">{conv.user.username || conv.user.email}</span>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">{formatTime(conv.lastMessage.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{conv.lastMessage.content}</p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="bg-blue-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          ) : (
            /* მესიჯების თრედი */
            <>
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                {loading && messages.length === 0 && (
                  <div className="flex items-center justify-center h-full text-sm text-slate-400">იტვირთება...</div>
                )}
                {messages.map(msg => {
                  const senderId = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
                  const isMe = senderId === myId;
                  return (
                    <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-md' : 'bg-slate-100 text-slate-800 rounded-bl-md'}`}>
                        <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                        <div className={`text-[10px] mt-1 ${isMe ? 'text-blue-200' : 'text-slate-400'} text-right`}>
                          {formatTime(msg.createdAt)}
                          {isMe && msg.read && <span className="ml-1">✓✓</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              {/* Input */}
              <div className="border-t border-slate-200 px-3 py-2 flex gap-2 flex-shrink-0">
                <input
                  type="text"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="დაწერეთ შეტყობინება..."
                  className="flex-1 text-sm border border-slate-200 rounded-full px-4 py-2 focus:outline-none focus:border-blue-400"
                />
                <button
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  className="bg-blue-600 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-colors flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ფლოატინგ ღილაკი */}
      <button
        onClick={handleOpen}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
        title="ჩათი"
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
        )}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </>
  );
}
