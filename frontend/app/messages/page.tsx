'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getConversations, getMessages, sendMessage, Conversation, Message } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <MessagesContent />
    </Suspense>
  );
}

function MessagesContent() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get('user');
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  useEffect(() => {
    if (selectedUserId) {
      loadMessages(selectedUserId);
    }
  }, [selectedUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadConversations() {
    try {
      setLoading(true);
      const data = await getConversations();
      setConversations(data);
      
      // Auto-select first conversation if none selected
      if (!selectedUserId && data.length > 0) {
        setSelectedUserId(data[0].user._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(userId: string) {
    try {
      const data = await getMessages(userId);
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUserId || sending) return;
    
    setSending(true);
    try {
      const msg = await sendMessage(selectedUserId, newMessage.trim());
      setMessages(prev => [...prev, msg]);
      setNewMessage('');
      // Update conversation list
      loadConversations();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">{t('loginRequired')}</p>
          <Link href="/login" className="text-blue-600 hover:underline">{t('login')}</Link>
        </div>
      </main>
    );
  }

  const selectedConversation = conversations.find(c => c.user._id === selectedUserId);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">{t('messages')}</h1>
        
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-80 border-r border-slate-200 flex flex-col">
              <div className="p-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-900">{t('conversations')}</h2>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 px-4">
                    <svg className="w-12 h-12 mx-auto mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p>{t('noMessages')}</p>
                  </div>
                ) : (
                  conversations.map(conv => (
                    <button
                      key={conv.user._id}
                      onClick={() => setSelectedUserId(conv.user._id)}
                      className={`w-full p-4 text-left hover:bg-slate-50 border-b border-slate-100 ${
                        selectedUserId === conv.user._id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                          {conv.user.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={`${process.env.NEXT_PUBLIC_API_BASE}${conv.user.avatar}`} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="text-slate-500 text-sm">{conv.user.email[0].toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900 truncate">
                              {conv.user.username || conv.user.email}
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatTime(conv.lastMessage.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 truncate mt-0.5">
                            {conv.lastMessage.isFromMe && <span className="text-slate-400">{t('you')}: </span>}
                            {conv.lastMessage.content}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-blue-600 text-white rounded-full mt-1">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 flex flex-col">
              {selectedUserId && selectedConversation ? (
                <>
                  {/* Header */}
                  <div className="p-4 border-b border-slate-200 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                      {selectedConversation.user.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`${process.env.NEXT_PUBLIC_API_BASE}${selectedConversation.user.avatar}`} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-slate-500">{selectedConversation.user.email[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {selectedConversation.user.username || selectedConversation.user.email}
                      </p>
                      {selectedConversation.user.phone && (
                        <p className="text-xs text-slate-500">{selectedConversation.user.phone}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Messages List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map(msg => {
                      const isMe = typeof msg.sender === 'string' 
                        ? msg.sender === (user._id || user.id)
                        : msg.sender._id === (user._id || user.id);
                      
                      return (
                        <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] ${isMe ? 'order-2' : ''}`}>
                            {/* Property reference if exists */}
                            {msg.property && (
                              <Link 
                                href={`/property/${msg.property._id}`}
                                className="block mb-2 p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                              >
                                <div className="flex items-center gap-2">
                                  {msg.property.photos?.[0] && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img 
                                      src={`${process.env.NEXT_PUBLIC_API_BASE}${msg.property.photos[0]}`} 
                                      alt="" 
                                      className="w-10 h-10 rounded object-cover"
                                    />
                                  )}
                                  <span className="text-sm text-slate-700 truncate">{msg.property.title}</span>
                                </div>
                              </Link>
                            )}
                            
                            <div className={`px-4 py-2 rounded-2xl ${
                              isMe 
                                ? 'bg-blue-600 text-white rounded-br-md' 
                                : 'bg-slate-200 text-slate-900 rounded-bl-md'
                            }`}>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            <p className={`text-xs mt-1 ${isMe ? 'text-right' : 'text-left'} text-slate-400`}>
                              {formatTime(msg.createdAt)}
                              {isMe && msg.read && <span className="ml-1">✓✓</span>}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {/* Input */}
                  <form onSubmit={handleSend} className="p-4 border-t border-slate-200">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder={t('typeMessage')}
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p>{t('selectConversation')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
