const STORAGE_KEY = 'vr-upload-draft-v1';

export type UploadDraft = {
  version: 1;
  savedAt: number;
  currentStep: number;
  title: string;
  desc: string;
  price: string;
  priceCurrency: 'USD' | 'GEL';
  priceType: 'total' | 'per_sqm';
  city: string;
  street: string;
  region: string;
  tbilisiDistrict: string;
  tbilisiSubdistricts: string[];
  sqm: string;
  houseSqm: string;
  type: string;
  dealType: string;
  exteriorLink: string;
  interiorLink: string;
  tourLink: string;
  defaultMediaView: 'exterior' | 'interior' | 'tour' | 'photos';
  contactPhone: string;
  contactEmail: string;
  lat: number | null;
  lng: number | null;
  addressMapFillText: string;
  addressMapFillKey: number;
  cadastralCode: string;
  cadastralHidden: boolean;
  roomCount: number | null;
  bedroomCount: number | null;
  floor: string;
  totalFloors: string;
  constructionYear: string;
  renovationYear: string;
  renovationStatus: string;
  buildingStatus: string;
  buildingProject: string;
  landStatus: string;
  balcony: number;
  loggia: number;
  bathroom: number;
  basement: boolean;
  attic: boolean;
  elevator: boolean;
  furniture: boolean;
  garage: boolean;
  centralHeating: boolean;
  naturalGas: boolean;
  storage: boolean;
  internet: boolean;
  electricity: boolean;
  water: boolean;
  security: boolean;
  airConditioner: boolean;
  fireplace: boolean;
  pool: boolean;
  garden: boolean;
  terrace: boolean;
  isolatedKitchen: boolean;
  heatingCooling: boolean;
  privateNotes: string;
  brokerListingMode: 'public' | 'unlisted' | 'private' | 'sold';
};

export function createEmptyUploadDraft(): UploadDraft {
  return {
    version: 1,
    savedAt: 0,
    currentStep: 1,
    title: '',
    desc: '',
    price: '',
    priceCurrency: 'USD',
    priceType: 'total',
    city: '',
    street: '',
    region: '',
    tbilisiDistrict: '',
    tbilisiSubdistricts: [],
    sqm: '',
    houseSqm: '',
    type: '',
    dealType: '',
    exteriorLink: '',
    interiorLink: '',
    tourLink: '',
    defaultMediaView: 'exterior',
    contactPhone: '',
    contactEmail: '',
    lat: null,
    lng: null,
    addressMapFillText: '',
    addressMapFillKey: 0,
    cadastralCode: '',
    cadastralHidden: false,
    roomCount: null,
    bedroomCount: null,
    floor: '',
    totalFloors: '',
    constructionYear: '',
    renovationYear: '',
    renovationStatus: '',
    buildingStatus: '',
    buildingProject: '',
    landStatus: '',
    balcony: 0,
    loggia: 0,
    bathroom: 0,
    basement: false,
    attic: false,
    elevator: false,
    furniture: false,
    garage: false,
    centralHeating: false,
    naturalGas: false,
    storage: false,
    internet: false,
    electricity: false,
    water: false,
    security: false,
    airConditioner: false,
    fireplace: false,
    pool: false,
    garden: false,
    terrace: false,
    isolatedKitchen: false,
    heatingCooling: false,
    privateNotes: '',
    brokerListingMode: 'public',
  };
}

function normalizeDraft(raw: Partial<UploadDraft>): UploadDraft {
  const empty = createEmptyUploadDraft();
  return {
    ...empty,
    ...raw,
    version: 1,
    tbilisiSubdistricts: Array.isArray(raw.tbilisiSubdistricts) ? raw.tbilisiSubdistricts : [],
    lat: typeof raw.lat === 'number' ? raw.lat : null,
    lng: typeof raw.lng === 'number' ? raw.lng : null,
    roomCount: typeof raw.roomCount === 'number' ? raw.roomCount : null,
    bedroomCount: typeof raw.bedroomCount === 'number' ? raw.bedroomCount : null,
    priceCurrency: raw.priceCurrency === 'GEL' ? 'GEL' : 'USD',
    priceType: raw.priceType === 'per_sqm' ? 'per_sqm' : 'total',
    defaultMediaView:
      raw.defaultMediaView === 'interior' ||
      raw.defaultMediaView === 'tour' ||
      raw.defaultMediaView === 'photos' ||
      raw.defaultMediaView === 'exterior'
        ? raw.defaultMediaView
        : 'exterior',
    brokerListingMode:
      raw.brokerListingMode === 'unlisted' ||
      raw.brokerListingMode === 'private' ||
      raw.brokerListingMode === 'sold'
        ? raw.brokerListingMode
        : 'public',
  };
}

export function uploadDraftHasContent(draft: UploadDraft): boolean {
  const empty = createEmptyUploadDraft();
  return (Object.keys(empty) as (keyof UploadDraft)[]).some((key) => {
    if (key === 'version' || key === 'savedAt') return false;
    const a = draft[key];
    const b = empty[key];
    if (Array.isArray(a)) return a.length > 0;
    return a !== b;
  });
}

export function loadUploadDraft(): UploadDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = normalizeDraft(JSON.parse(raw) as Partial<UploadDraft>);
    return uploadDraftHasContent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveUploadDraft(draft: UploadDraft): void {
  if (typeof window === 'undefined') return;
  try {
    if (!uploadDraftHasContent(draft)) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    /* ignore quota */
  }
}

export function clearUploadDraftStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
