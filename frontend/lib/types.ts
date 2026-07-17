export type DealType = 'sale' | 'rent' | 'mortgage';
export type PropertyType = 'apartment' | 'house' | 'commercial' | 'land' | 'cottage' | 'hotel' | 'building' | 'warehouse' | 'parking' | 'business';
export type PriceCurrency = 'USD' | 'GEL';
export type PriceType = 'total' | 'per_sqm';
export type DefaultMediaView = 'exterior' | 'interior' | 'tour' | 'photos';
export type BuildingProject = '' | 'czech' | 'khrushchev' | 'urban' | 'lvov' | 'budapest' | 'kiev' | 'moscow' | 'new_build' | 'tbilisi' | 'other';
export type BuildingStatus = '' | 'newly_built' | 'under_construction' | 'old_built';
export type RenovationStatus = '' | 'green_frame' | 'white_frame' | 'black_frame' | 'renovated' | 'to_renovate';
export type LandStatus = '' | 'agricultural' | 'non_agricultural';

export type Amenities = {
  basement?: boolean;
  attic?: boolean;
  elevator?: boolean;
  furniture?: boolean;
  garage?: boolean;
  centralHeating?: boolean;
  naturalGas?: boolean;
  storage?: boolean;
  internet?: boolean;
  electricity?: boolean;
  water?: boolean;
  security?: boolean;
  airConditioner?: boolean;
  fireplace?: boolean;
  pool?: boolean;
  garden?: boolean;
  balcony?: boolean;
  terrace?: boolean;
  isolatedKitchen?: boolean;
  heatingCooling?: boolean;
};

export type Property = {
  _id: string;
  numericId?: number;
  title: string;
  desc: string;
  price: number;
  priceCurrency?: PriceCurrency;
  priceType?: PriceType;
  city?: string;
  street?: string;
  region?: string;
  tbilisiDistrict?: string;
  tbilisiSubdistricts?: string[];
  sqm?: number;
  houseSqm?: number;
  rooms?: number;
  bedrooms?: number;
  
  // დეტალური ინფორმაცია
  roomCount?: number;
  floor?: number;
  totalFloors?: number;
  balcony?: number;
  loggia?: number;
  bathroom?: number;
  constructionYear?: number;
  renovationYear?: number;
  cadastralCode?: string;
  /** true: საკადასტრო არ ჩანს საჯაროდ და არ იძებნება ძიებით */
  cadastralHidden?: boolean;
  buildingProject?: BuildingProject;
  buildingStatus?: BuildingStatus;
  renovationStatus?: RenovationStatus;
  /** მიწის სტატუსი (სასოფლო / არასასოფლო) — type=land */
  landStatus?: LandStatus;
  
  // კომფორტი
  amenities?: Amenities;
  
  location: { lat: number; lng: number };
  type: PropertyType;
  dealType: DealType;
  photos: string[];
  /** 360° equirectangular ფოტოების URL-ები */
  panoramaPhotos?: string[];
  mainPhoto?: number;
  threeDLink?: string; // ძველი ველი - ბექვორდ კომპატიბილობა
  exteriorLink?: string; // 3D ექსტერიერი
  interiorLink?: string; // 3D ინტერიერი
  tourLink?: string; // VR 360° ტური (tour-builder)
  /** ობიექტის გახსნისას პირველი მედია ტაბი */
  defaultMediaView?: DefaultMediaView;
  mediaLinks?: Array<{
    url: string;
    type: 'youtube' | 'facebook' | 'tiktok' | 'instagram' | 'other';
    title?: string;
  }>;
  contact?: { phone?: string; email?: string };
  privateNotes?: string;
  userId?: string | { _id: string; email: string; name?: string; phone?: string; avatar?: string; role?: 'user' | 'agent' | 'admin' | 'agent_admin' };
  /** Agent პროფილის ID (owner agent-ისთვის) */
  ownerAgentProfileId?: string;
  views?: number;
  createdAt?: string;
  status?: 'pending' | 'active' | 'rejected' | 'sold';
  /** ადმინის მიერ აპინული — მთავარ გვერდზე პირველ რიგში */
  pinned?: boolean;
  pinnedAt?: string | null;
  /** საჯარო სია: public | unlisted (ლინკით) | private (მხოლოდ მფლობელი) */
  listingVisibility?: 'public' | 'unlisted' | 'private';
  /** მხოლოდ მფლობლისთვის (unlisted ლინკის ასლი) */
  shareToken?: string;
};

export type User = { id: string; _id?: string; email: string; phone?: string; avatar?: string; name?: string; role?: 'user' | 'agent' | 'admin' | 'agent_admin'; status?: 'pending' | 'approved' | 'rejected' };
