import type { Property, User } from './types';
import { API_BASE, getApiBase } from './config';
import {
  resolvePropertyImageUrl,
  type PropertyImageVariant,
} from './imageUrl';

export type { Property, User };
export type { PropertyImageVariant } from './imageUrl';
export { resolvePropertyImageUrl, applyCloudinaryTransform } from './imageUrl';

/**
 * სურათის URL:
 * - ავატარი/აგენტი: variant-ის გარეშე
 * - ობიექტის ფოტო: variant 'thumb' | 'large' (Cloudinary f_auto → AVIF)
 * - 360°: isPanorama: true → master URL უცვლელად
 */
export function resolveImageUrl(
  path: string | null | undefined,
  variant?: PropertyImageVariant,
  options?: { isPanorama?: boolean }
): string {
  if (variant) {
    return resolvePropertyImageUrl(path, variant, options);
  }
  return resolvePropertyImageUrl(path, 'original', options);
}

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
  const raw = window.localStorage.getItem('token');
  const t = raw?.trim();
  return t || null;
}

function formatApiErrorBody(json: unknown, rawText: string, status: number): string {
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    if (Array.isArray(o.errors)) {
      const parts = o.errors.map((e: unknown) => {
        if (e && typeof e === 'object') {
          const x = e as Record<string, unknown>;
          return String(x.msg ?? x.message ?? JSON.stringify(e));
        }
        return String(e);
      });
      const joined = parts.filter(Boolean).join(', ');
      if (joined) return joined;
    }
    if (o.errors && typeof o.errors === 'object' && !Array.isArray(o.errors)) {
      const entries = Object.entries(o.errors as Record<string, unknown>).map(
        ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`
      );
      if (entries.length) return entries.join('; ');
    }
    if (typeof o.message === 'string' && o.message.trim()) return o.message.trim();
    if (o.message && typeof o.message === 'object') return JSON.stringify(o.message);
  }
  const trimmed = rawText?.trim();
  if (trimmed && trimmed !== '{}') return trimmed.slice(0, 500);
  return `HTTP ${status} — სერვერმა ცარიელი ან გაურკვეველი პასუხი დააბრუნა. შეამოწმეთ backend ლოგი და Cloudinary/MongoDB კონფიგურაცია.`;
}

function formatNetworkError(base: string, init: RequestInit): string {
  const isLocal =
    base.includes('localhost') || base.includes('127.0.0.1') || base.includes(':5000');
  const isUpload = init.body instanceof FormData;
  if (isLocal) {
    return `სერვერთან კავშირი ვერ მოხერხდა (${base}). გაუშვით backend: cd backend && npm run dev`;
  }
  if (isUpload) {
    return (
      `სერვერთან კავშირი ვერ მოხერხდა (${base}). ` +
      'შესაძლო მიზეზები: API დროებით გამორთულია (Render), მოთხოვნა ძალიან დიდია (ბევრი ფოტო), ან დრო ამოიწურა. ' +
      'სცადეთ ხელახლა 1–2 წუთში, შეამცირეთ ფოტოების რაოდენობა/ზომა, ან შეამოწმეთ Render → vrgeorgia-api → Logs/Metrics.'
    );
  }
  return (
    `სერვერთან კავშირი ვერ მოხერხდა (${base}). ` +
    'სცადეთ გვერდის განახლება; თუ არ გამოსწორდა — შეამოწმეთ Render-ზე API სერვისი.'
  );
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
    res = await fetch(`${getApiBase()}${path}`, { ...init, headers, cache: 'no-store' });
  } catch {
    throw new Error(formatNetworkError(getApiBase(), init));
  }

  if (!res.ok) {
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    // არასწორი ტოკენი + user კვლავ localStorage-ში = „ზომბი“ სესია; login/register-ის 401 არ ვარტავთ
    if (
      res.status === 401 &&
      typeof window !== 'undefined' &&
      !path.includes('/api/auth/login') &&
      !path.includes('/api/auth/register')
    ) {
      window.dispatchEvent(new CustomEvent('vr-auth-unauthorized'));
    }
    throw new Error(formatApiErrorBody(json, text, res.status));
  }

  const raw = await res.text();
  if (!raw?.trim()) {
    throw new Error('სერვერმა ცარიელი პასუხი დააბრუნა');
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error('სერვერმა არა-JSON პასუხი დააბრუნა');
  }
}

export async function register(body: RegisterBody) {
  // რეგისტრაცია ელოდება ადმინის დამტკიცებას — სერვერი აბრუნებს { pending, message }
  return request<{ pending?: boolean; message?: string; token?: string; user?: User }>('/api/auth/register', {
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
  priceCurrency?: string;
  priceType?: string;
  city?: string;
  region?: string;
  tbilisiDistrict?: string;
  tbilisiSubdistricts?: string[];
  type?: string[]; // მრავალი კატეგორიის არჩევა
  dealType?: string[];
  has3d?: string;
  hasPhotos?: string;
  minSqm?: string;
  maxSqm?: string;
  minConstructionYear?: string;
  maxConstructionYear?: string;
  minRenovationYear?: string;
  maxRenovationYear?: string;
  rooms?: string[];
  bedrooms?: string[];
  amenities?: string[]; // კომფორტი და კომუნიკაციები
  buildingProject?: string[];
  renovationStatus?: string[];
  balconies?: string[];
  sort?: string;
  propertyId?: string;
  lang?: string;
};

export async function listProperties(query: PropertyQuery) {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    if ((k === 'tbilisiSubdistricts' || k === 'type' || k === 'dealType' || k === 'amenities' || k === 'buildingProject' || k === 'renovationStatus' || k === 'balconies' || k === 'rooms' || k === 'bedrooms') && Array.isArray(v)) {
      params[k] = JSON.stringify(v);
    } else {
      params[k] = String(v);
    }
  }
  const qs = new URLSearchParams(params).toString();
  return request<{ properties: Property[] }>(`/api/properties${qs ? `?${qs}` : ''}`);
}

export async function getProperty(
  id: string,
  lang?: string,
  opts?: { shareToken?: string }
) {
  const params = new URLSearchParams();
  if (lang) params.set('lang', lang);
  if (opts?.shareToken) params.set('t', opts.shareToken);
  const q = params.toString();
  return request<{ property: Property }>(`/api/properties/${id}${q ? `?${q}` : ''}`);
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

export async function updateProperty(
  id: string,
  data: Partial<Property> & {
    brokerListingMode?: 'public' | 'unlisted' | 'private' | 'sold';
  }
) {
  return request<{ property: Property }>(`/api/properties/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function addPropertyPhotos(id: string, files: File[], panoramaFlags?: boolean[]) {
  const form = new FormData();
  for (const f of files) form.append('photos', f);
  if (panoramaFlags?.length) {
    form.append('panoramaFlags', JSON.stringify(panoramaFlags));
  }
  return request<{ photos: string[]; panoramaPhotos?: string[] }>(`/api/properties/${id}/photos`, {
    method: 'POST',
    body: form,
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

export type AgentPropertiesQuery = PropertyQuery & {
  page?: number;
  limit?: number;
};

export async function getAgentProperties(agentId: string, query: AgentPropertiesQuery = {}) {
  const { page = 1, limit, ...rest } = query;
  const params: Record<string, string> = { page: String(page) };
  if (limit !== undefined) params.limit = String(limit);

  for (const [k, v] of Object.entries(rest)) {
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    if (
      (k === 'tbilisiSubdistricts' ||
        k === 'type' ||
        k === 'dealType' ||
        k === 'amenities' ||
        k === 'buildingProject' ||
        k === 'renovationStatus' ||
        k === 'balconies' ||
        k === 'rooms' ||
        k === 'bedrooms') &&
      Array.isArray(v)
    ) {
      params[k] = JSON.stringify(v);
    } else {
      params[k] = String(v);
    }
  }

  const qs = new URLSearchParams(params).toString();
  return request<{ properties: Property[]; total: number; page: number; totalPages: number }>(
    `/api/agents/${agentId}/properties?${qs}`
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
