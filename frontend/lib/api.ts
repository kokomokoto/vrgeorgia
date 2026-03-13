import type { Property, User } from './types';

export type { Property, User };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';

export type RegisterBody = { 
  email: string; 
  password: string; 
  phone?: string;
  name?: string;
  role?: 'user' | 'agent';
  company?: string;
  experience?: number;
  specializations?: string[];
  areas?: string[];
  languages?: string[];
};
export type LoginBody = { email: string; password: string };

function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('token');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: 'no-store' });
  } catch (fetchError) {
    // Network error - სერვერი არ მუშაობს
    throw new Error('სერვერთან კავშირი ვერ მოხერხდა. გთხოვთ შეამოწმოთ backend გაშვებულია თუ არა (npm start backend ფოლდერში)');
  }
  
  if (!res.ok) {
    const text = await res.text();
    // Try to parse validation errors
    try {
      const json = JSON.parse(text);
      if (json.errors && Array.isArray(json.errors)) {
        const messages = json.errors.map((e: any) => e.msg || e.message || 'შეცდომა').join(', ');
        throw new Error(messages);
      }
      throw new Error(json.message || text);
    } catch (e: any) {
      if (e.message) throw e;
      throw new Error(text || `Request failed: ${res.status}`);
    }
  }
  return (await res.json()) as T;
}

export async function register(body: RegisterBody) {
  return request<{ token: string; user: User }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function login(body: LoginBody) {
  return request<{ token: string; user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export type PropertyQuery = {
  q?: string;
  minPrice?: string;
  maxPrice?: string;
  city?: string;
  region?: string;
  tbilisiDistrict?: string;
  tbilisiSubdistricts?: string[];
  type?: string[]; // მრავალი კატეგორიის არჩევა
  dealType?: string;
  has3d?: string;
  hasPhotos?: string;
  minSqm?: string;
  maxSqm?: string;
  minRooms?: string;
  maxRooms?: string;
  amenities?: string[]; // კომფორტი და კომუნიკაციები
  lang?: string;
};

export async function listProperties(query: PropertyQuery) {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    if ((k === 'tbilisiSubdistricts' || k === 'type' || k === 'amenities') && Array.isArray(v)) {
      params[k] = JSON.stringify(v);
    } else {
      params[k] = String(v);
    }
  }
  const qs = new URLSearchParams(params).toString();
  return request<{ properties: Property[] }>(`/api/properties${qs ? `?${qs}` : ''}`);
}

export async function getProperty(id: string, lang?: string) {
  const qs = lang ? `?lang=${encodeURIComponent(lang)}` : '';
  return request<{ property: Property }>(`/api/properties/${id}${qs}`);
}

export async function createProperty(form: FormData) {
  return request<{ property: Property }>('/api/properties', {
    method: 'POST',
    body: form
  });
}

export async function getMyProperties() {
  return request<{ properties: Property[] }>('/api/properties/user/my');
}

export async function updateProperty(id: string, data: Partial<Property>) {
  return request<{ property: Property }>(`/api/properties/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteProperty(id: string) {
  return request<{ ok: boolean }>(`/api/properties/${id}`, {
    method: 'DELETE'
  });
}

// Profile APIs
export async function getMe() {
  return request<{ user: User }>('/api/auth/me');
}

export async function updateProfile(data: { phone?: string; name?: string; email?: string }) {
  return request<{ user: User }>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function uploadAvatar(file: File) {
  const form = new FormData();
  form.append('avatar', file);
  return request<{ user: User }>('/api/auth/avatar', {
    method: 'POST',
    body: form
  });
}

// Get properties by user id
export async function getUserProperties(userId: string) {
  return request<{ properties: Property[] }>(`/api/properties/user/${userId}`);
}

// ========== FAVORITES ==========

export async function getFavorites() {
  return request<{ favorites: Property[] }>('/api/auth/favorites');
}

export async function addToFavorites(propertyId: string) {
  return request<{ favorites: string[]; message: string }>(`/api/auth/favorites/${propertyId}`, {
    method: 'POST'
  });
}

export async function removeFromFavorites(propertyId: string) {
  return request<{ favorites: string[]; message: string }>(`/api/auth/favorites/${propertyId}`, {
    method: 'DELETE'
  });
}

export async function checkFavorite(propertyId: string) {
  return request<{ isFavorite: boolean }>(`/api/auth/favorites/check/${propertyId}`);
}

// ========== AGENTS ==========

export interface Agent {
  _id: string;
  user: string;
  name: string;
  phone: string;
  email: string;
  photo: string;
  bio: {
    ka: string;
    en: string;
    ru: string;
    tr: string;
    az: string;
  };
  company: string;
  license: string;
  experience: number;
  specializations: string[];
  areas: string[];
  languages: string[];
  avgRating: number;
  totalReviews: number;
  verified: boolean;
  active: boolean;
  createdAt: string;
}

export interface AgentReview {
  _id: string;
  user: { _id: string; username?: string };
  score: number;
  review: string;
  createdAt: string;
}

export async function getAgents(params?: { city?: string; specialization?: string; minRating?: number; page?: number }) {
  const qs = params ? '?' + new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString() : '';
  return request<{ agents: Agent[]; total: number; page: number; totalPages: number }>(`/api/agents${qs}`);
}

export async function getAgent(id: string) {
  return request<Agent>(`/api/agents/${id}`);
}

export async function getAgentProperties(agentId: string, page = 1) {
  return request<{ properties: Property[]; total: number; page: number; totalPages: number }>(
    `/api/agents/${agentId}/properties?page=${page}`
  );
}

export async function getAgentReviews(agentId: string) {
  return request<AgentReview[]>(`/api/agents/${agentId}/reviews`);
}

export async function createOrUpdateAgentProfile(form: FormData) {
  return request<Agent>('/api/agents/profile', {
    method: 'POST',
    body: form
  });
}

export async function getMyAgentProfile() {
  return request<Agent>('/api/agents/me/profile');
}

export async function addAgentReview(agentId: string, score: number, review?: string) {
  return request<{ avgRating: number; totalReviews: number }>(`/api/agents/${agentId}/review`, {
    method: 'POST',
    body: JSON.stringify({ score, review })
  });
}

export async function deleteAgentReview(agentId: string) {
  return request<{ message: string; avgRating: number; totalReviews: number }>(`/api/agents/${agentId}/review`, {
    method: 'DELETE'
  });
}

// ========== MESSAGES ==========

export interface Message {
  _id: string;
  sender: { _id: string; email: string; username?: string; avatar?: string } | string;
  receiver: { _id: string; email: string; username?: string; avatar?: string } | string;
  content: string;
  property?: { _id: string; title: string; photos?: string[] };
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface Conversation {
  user: { _id: string; email: string; username?: string; avatar?: string; phone?: string };
  lastMessage: {
    content: string;
    createdAt: string;
    isFromMe: boolean;
    property?: { _id: string; title: string; photos?: string[] };
  };
  unreadCount: number;
}

export async function getConversations() {
  return request<Conversation[]>('/api/messages/conversations');
}

export async function getMessages(userId: string, page = 1) {
  return request<Message[]>(`/api/messages/with/${userId}?page=${page}`);
}

export async function sendMessage(receiverId: string, content: string, propertyId?: string) {
  return request<Message>('/api/messages/send', {
    method: 'POST',
    body: JSON.stringify({ receiverId, content, propertyId })
  });
}

export async function getUnreadCount() {
  return request<{ count: number }>('/api/messages/unread-count');
}

export async function markConversationRead(userId: string) {
  return request<{ ok: boolean }>(`/api/messages/read/${userId}`, {
    method: 'PUT'
  });
}

export async function contactPropertyOwner(propertyId: string, content: string) {
  return request<{ ok: boolean; message: Message }>(`/api/messages/contact-owner/${propertyId}`, {
    method: 'POST',
    body: JSON.stringify({ content })
  });
}
