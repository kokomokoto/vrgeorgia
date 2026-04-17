export type DealType = 'sale' | 'rent' | 'mortgage';
export type PropertyType = 'apartment' | 'house' | 'commercial' | 'land' | 'cottage' | 'hotel' | 'building' | 'warehouse' | 'parking' | 'business';
export type PriceCurrency = 'USD' | 'GEL';
export type PriceType = 'total' | 'per_sqm';
export type BuildingProject = '' | 'czech' | 'khrushchev' | 'urban' | 'lvov' | 'budapest' | 'kiev' | 'moscow' | 'new_build' | 'tbilisi' | 'other';

export type Amenities = {
  basement?: boolean;
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
  region?: string;
  tbilisiDistrict?: string;
  tbilisiSubdistricts?: string[];
  sqm?: number;
  rooms?: number;
  bedrooms?: number;
  
  // დეტალური ინფორმაცია
  roomCount?: number;
  floor?: number;
  totalFloors?: number;
  balcony?: number;
  loggia?: number;
  bathroom?: number;
  cadastralCode?: string;
  buildingProject?: BuildingProject;
  
  // კომფორტი
  amenities?: Amenities;
  
  location: { lat: number; lng: number };
  type: PropertyType;
  dealType: DealType;
  photos: string[];
  mainPhoto?: number;
  threeDLink?: string; // ძველი ველი - ბექვორდ კომპატიბილობა
  exteriorLink?: string; // 3D ექსტერიერი
  interiorLink?: string; // 3D ინტერიერი
  mediaLinks?: Array<{
    url: string;
    type: 'youtube' | 'facebook' | 'tiktok' | 'instagram' | 'other';
    title?: string;
  }>;
  contact?: { phone?: string; email?: string };
  privateNotes?: string;
  userId?: string | { _id: string; email: string; name?: string; phone?: string; avatar?: string };
  views?: number;
  createdAt?: string;
};

export type User = { id: string; _id?: string; email: string; phone?: string; avatar?: string; name?: string; role?: 'user' | 'agent' | 'admin' };
