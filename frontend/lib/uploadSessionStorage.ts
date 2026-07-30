const STORAGE_KEY = 'vr-upload-session-v1';

/** სესია ამ ხნის შემდეგ მოძველებულია — ახალი ატვირთვა ახალ გასაღებს იღებს */
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * ერთი ატვირთვის მდგომარეობა, რომელიც გვერდის განახლებასაც უძლებს.
 *
 * ატვირთვა ორნაბიჯიანია (ობიექტი → ფოტოები), ამიტომ შუაში ჩავარდნისას ობიექტი
 * ბაზაში უფოტოოდ რჩებოდა და ხელახალი დაჭერა ახალ დუბლიკატს ქმნიდა. ეს სესია
 * ინახავს იდემპოტენტობის გასაღებს, შექმნილი ობიექტის id-ს და უკვე ატვირთული
 * ფოტოების id-ებს, რომ გამეორება იმავე ობიექტს გააგრძელოს.
 */
export type UploadSession = {
  version: 1;
  createdAt: number;
  clientRequestId: string;
  propertyId: string | null;
  uploadedPhotoIds: string[];
};

function newRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `up-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function isFresh(session: UploadSession): boolean {
  return Date.now() - session.createdAt < SESSION_TTL_MS;
}

function normalize(raw: Partial<UploadSession> | null): UploadSession | null {
  if (!raw || typeof raw.clientRequestId !== 'string' || !raw.clientRequestId) return null;
  const session: UploadSession = {
    version: 1,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : 0,
    clientRequestId: raw.clientRequestId,
    propertyId: typeof raw.propertyId === 'string' && raw.propertyId ? raw.propertyId : null,
    uploadedPhotoIds: Array.isArray(raw.uploadedPhotoIds)
      ? raw.uploadedPhotoIds.filter((id): id is string => typeof id === 'string')
      : [],
  };
  return isFresh(session) ? session : null;
}

export function loadUploadSession(): UploadSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalize(JSON.parse(raw) as Partial<UploadSession>);
  } catch {
    return null;
  }
}

export function saveUploadSession(session: UploadSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore quota */
  }
}

export function clearUploadSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** არსებული (ცოცხალი) სესია ან ახალი — ერთი ატვირთვის ყველა ცდას ერთი გასაღები აქვს */
export function ensureUploadSession(): UploadSession {
  const existing = loadUploadSession();
  if (existing) return existing;
  const created: UploadSession = {
    version: 1,
    createdAt: Date.now(),
    clientRequestId: newRequestId(),
    propertyId: null,
    uploadedPhotoIds: [],
  };
  saveUploadSession(created);
  return created;
}
