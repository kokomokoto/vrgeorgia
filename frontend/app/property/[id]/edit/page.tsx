'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/components/AuthProvider';
import { getProperty, updateProperty, resolveImageUrl } from '@/lib/api';
import { MapView } from '@/components/MapView';
import { CityCombobox } from '@/components/CityCombobox';
import AddressSearch from '@/components/AddressSearch';
import TbilisiDistrictSelector from '@/components/TbilisiDistrictSelector';
import type { Property } from '@/lib/types';

// საქართველოს რეგიონები
const GEORGIAN_REGIONS = [
  { value: 'tbilisi', label: 'თბილისი' },
  { value: 'adjara', label: 'აჭარა' },
  { value: 'imereti', label: 'იმერეთი' },
  { value: 'kakheti', label: 'კახეთი' },
  { value: 'shida_kartli', label: 'შიდა ქართლი' },
  { value: 'kvemo_kartli', label: 'ქვემო ქართლი' },
  { value: 'samegrelo', label: 'სამეგრელო-ზემო სვანეთი' },
  { value: 'guria', label: 'გურია' },
  { value: 'racha', label: 'რაჭა-ლეჩხუმი და ქვემო სვანეთი' },
  { value: 'mtskheta', label: 'მცხეთა-მთიანეთი' },
  { value: 'samtskhe', label: 'სამცხე-ჯავახეთი' },
  { value: 'abkhazia', label: 'აფხაზეთი' }
];

// ქალაქი → რეგიონის ავტომატური მაპინგი
const CITY_TO_REGION: Record<string, string> = {
  'თბილისი': 'tbilisi',
  'ბათუმი': 'adjara', 'ქობულეთი': 'adjara', 'ხელვაჩაური': 'adjara',
  'ქუთაისი': 'imereti', 'ზესტაფონი': 'imereti', 'სამტრედია': 'imereti', 'წყალტუბო': 'imereti', 'ჭიათურა': 'imereti', 'საჩხერე': 'imereti', 'ტყიბული': 'imereti',
  'რუსთავი': 'kvemo_kartli', 'მარნეული': 'kvemo_kartli', 'გარდაბანი': 'kvemo_kartli', 'ბოლნისი': 'kvemo_kartli', 'თეთრიწყარო': 'kvemo_kartli', 'დმანისი': 'kvemo_kartli', 'წალკა': 'kvemo_kartli',
  'გორი': 'shida_kartli', 'ხაშური': 'shida_kartli', 'კასპი': 'shida_kartli',
  'თელავი': 'kakheti', 'გურჯაანი': 'kakheti', 'საგარეჯო': 'kakheti', 'სიღნაღი': 'kakheti', 'დედოფლისწყარო': 'kakheti', 'ლაგოდეხი': 'kakheti',
  'ზუგდიდი': 'samegrelo', 'ფოთი': 'samegrelo', 'სენაკი': 'samegrelo',
  'ოზურგეთი': 'guria', 'ლანჩხუთი': 'guria',
  'მცხეთა': 'mtskheta', 'დუშეთი': 'mtskheta',
  'ახალციხე': 'samtskhe', 'ბორჯომი': 'samtskhe',
  'ამბროლაური': 'racha',
};

// ქონების ტიპები
const PROPERTY_TYPES = [
  { value: 'apartment', label: 'ბინა', icon: '🏢' },
  { value: 'house', label: 'კერძო სახლი', icon: '🏠' },
  { value: 'commercial', label: 'კომერციული', icon: '🏪' },
  { value: 'land', label: 'მიწა', icon: '🌍' },
  { value: 'cottage', label: 'აგარაკი', icon: '🏡' },
  { value: 'hotel', label: 'სასტუმრო', icon: '🏨' },
  { value: 'building', label: 'შენობა', icon: '🏗️' },
  { value: 'warehouse', label: 'საწყობი', icon: '📦' },
  { value: 'parking', label: 'ავტოფარეხი', icon: '🚗' },
];

// გარიგების ტიპები
const DEAL_TYPES = [
  { value: 'sale', label: 'იყიდება', icon: '💰' },
  { value: 'rent', label: 'ქირავდება', icon: '🔑' },
  { value: 'mortgage', label: 'გირავდება', icon: '🏦' },
  { value: 'daily', label: 'დღიურად', icon: '📅' },
  { value: 'under_construction', label: 'მშენებარე', icon: '🔨' },
];

export default function EditPropertyPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const id = params.id as string;

  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [priceCurrency, setPriceCurrency] = useState<'USD' | 'GEL'>('USD');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [tbilisiDistrict, setTbilisiDistrict] = useState('');
  const [tbilisiSubdistricts, setTbilisiSubdistricts] = useState<string[]>([]);
  const [sqm, setSqm] = useState('');
  const [rooms, setRooms] = useState('');
  const [type, setType] = useState('apartment');
  const [dealType, setDealType] = useState('sale');
  const [exteriorLink, setExteriorLink] = useState('');
  const [interiorLink, setInteriorLink] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  
  // ფოტოების მართვა
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);
  const [newPhotos, setNewPhotos] = useState<FileList | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated || !id) return;

    getProperty(id)
      .then((res) => {
        const p = res.property;
        setTitle(p.title);
        setDesc(p.desc);
        setPrice(String(p.price));
        setPriceCurrency(p.priceCurrency || 'USD');
        setCity(p.city || '');
        setRegion(p.region || '');
        setTbilisiDistrict((p as any).tbilisiDistrict || '');
        setTbilisiSubdistricts((p as any).tbilisiSubdistricts || []);
        setSqm(String(p.sqm || ''));
        setRooms(String(p.rooms || ''));
        setType(p.type);
        setDealType(p.dealType);
        setExteriorLink(p.exteriorLink || p.threeDLink || '');
        setInteriorLink(p.interiorLink || '');
        setContactPhone(p.contact?.phone || '');
        setContactEmail(p.contact?.email || '');
        setLat(p.location.lat);
        setLng(p.location.lng);
        setExistingPhotos(p.photos || []);
        setMainPhotoIndex((p as any).mainPhoto || 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [hydrated, id]);

  if (!hydrated) {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        გთხოვთ გაიაროთ ავტორიზაცია
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-slate-500">იტვირთება...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  const handleDeletePhoto = (index: number) => {
    const newPhotos = existingPhotos.filter((_, i) => i !== index);
    setExistingPhotos(newPhotos);
    // თუ მთავარი ფოტო წაიშალა, პირველს გავხადოთ მთავარი
    if (mainPhotoIndex >= newPhotos.length) {
      setMainPhotoIndex(Math.max(0, newPhotos.length - 1));
    } else if (index < mainPhotoIndex) {
      setMainPhotoIndex(mainPhotoIndex - 1);
    }
  };

  const handleSetMainPhoto = (index: number) => {
    setMainPhotoIndex(index);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      await updateProperty(id, {
        title,
        desc,
        price: Number(price),
        priceCurrency,
        city,
        region,
        tbilisiDistrict,
        tbilisiSubdistricts,
        sqm: Number(sqm) || 0,
        rooms: Number(rooms) || 0,
        type: type as any,
        dealType: dealType as any,
        exteriorLink,
        interiorLink,
        contactPhone,
        contactEmail,
        photos: existingPhotos,
        mainPhoto: mainPhotoIndex
      } as any);
      
      router.push('/profile');
    } catch (err: any) {
      setError(err.message || 'შენახვა ვერ მოხერხდა');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_420px]">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-lg font-semibold">{t('edit') || 'რედაქტირება'}</div>

        <div className="mt-4 grid gap-4">
          {/* === გარიგების ტიპი === */}
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">გარიგების ტიპი</div>
            <div className="flex flex-wrap gap-2">
              {DEAL_TYPES.map((dt) => (
                <button
                  key={dt.value}
                  type="button"
                  onClick={() => setDealType(dt.value)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    dealType === dt.value
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{dt.icon}</span>
                  <span>{dt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* === ქონების ტიპი === */}
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">ქონების ტიპი</div>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map((pt) => (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => setType(pt.value)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    type === pt.value
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{pt.icon}</span>
                  <span>{pt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* === სათაური და აღწერა === */}
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">სათაური და აღწერა</div>
            <div className="grid gap-2">
              <input
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder={t('title')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                className="min-h-[120px] rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder={t('description')}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
          </div>
          {/* === ფასი === */}
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">ფასი</div>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder={t('price')}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <div className="flex rounded-md border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPriceCurrency('USD')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    priceCurrency === 'USD' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  $
                </button>
                <button
                  type="button"
                  onClick={() => setPriceCurrency('GEL')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    priceCurrency === 'GEL' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ₾
                </button>
              </div>
            </div>
          </div>

          {/* === მდებარეობა === */}
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">მდებარეობა</div>
            <div className="grid grid-cols-2 gap-2">
            <CityCombobox 
              value={city} 
              onChange={(newCity) => {
                setCity(newCity);
                // ავტომატურად დავაყენოთ რეგიონი ქალაქის მიხედვით
                if (CITY_TO_REGION[newCity]) {
                  setRegion(CITY_TO_REGION[newCity]);
                }
                if (newCity.toLowerCase() !== 'თბილისი') {
                  setTbilisiDistrict('');
                  setTbilisiSubdistricts([]);
                }
              }} 
              placeholder={t('city')} 
            />
            {city.toLowerCase() !== 'თბილისი' ? (
              <select 
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" 
                value={region} 
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="">{t('region')}</option>
                {GEORGIAN_REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            ) : (
              <div className="text-sm text-slate-500 flex items-center px-3">
                რეგიონი: თბილისი
              </div>
            )}
          </div>

          {/* თბილისის უბნები */}
          {city.toLowerCase() === 'თბილისი' && (
            <TbilisiDistrictSelector
              selectedDistrict={tbilisiDistrict}
              selectedSubdistricts={tbilisiSubdistricts}
              onDistrictChange={setTbilisiDistrict}
              onSubdistrictsChange={setTbilisiSubdistricts}
            />
          )}
          </div>

          {/* === ფართობი და ოთახები === */}
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">პარამეტრები</div>
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="number" 
                className="rounded-md border border-slate-200 px-3 py-2 text-sm" 
                placeholder={t('sqm') || 'ფართობი (კვ.მ)'} 
                value={sqm} 
                onChange={(e) => setSqm(e.target.value)} 
              />
              <input 
                type="number" 
                className="rounded-md border border-slate-200 px-3 py-2 text-sm" 
                placeholder={t('rooms') || 'ოთახების რაოდენობა'} 
                value={rooms} 
                onChange={(e) => setRooms(e.target.value)} 
              />
            </div>
          </div>

          {/* === 3D ბმულები === */}
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">3D ტურები</div>
            <div className="grid gap-2">
              <input
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder={`${t('exterior3d')} (iframe URL)`}
                value={exteriorLink}
                onChange={(e) => setExteriorLink(e.target.value)}
              />
              <input
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder={`${t('interior3d')} (iframe URL)`}
                value={interiorLink}
                onChange={(e) => setInteriorLink(e.target.value)}
              />
            </div>
          </div>

          {/* === საკონტაქტო === */}
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2">საკონტაქტო</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder={t('phone')}
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
              <input
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder={t('email')}
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
          </div>

          {/* არსებული ფოტოები */}
          {existingPhotos.length > 0 && (
            <div>
              <div className="text-sm font-medium text-slate-700 mb-2">
                ფოტოები ({existingPhotos.length})
              </div>
              <div className="grid grid-cols-3 gap-2">
                {existingPhotos.map((photo, idx) => (
                  <div key={photo} className="relative group">
                    <img
                      src={resolveImageUrl(photo)}
                      alt={`Photo ${idx + 1}`}
                      className={`aspect-square w-full object-cover rounded-md ${idx === mainPhotoIndex ? 'ring-2 ring-blue-500' : ''}`}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetMainPhoto(idx)}
                        className={`px-2 py-1 text-xs rounded ${idx === mainPhotoIndex ? 'bg-blue-500 text-white' : 'bg-white text-slate-700'}`}
                      >
                        {idx === mainPhotoIndex ? '✓ მთავარი' : 'მთავარი'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(idx)}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded"
                      >
                        წაშლა
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-sm text-slate-600">
            {t('coordinates')}: {lat?.toFixed(5) ?? '—'}, {lng?.toFixed(5) ?? '—'}
          </div>

          {error && <div className="text-sm text-red-700">{error}</div>}

          <div className="flex gap-2">
            <button
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? 'ინახება...' : (t('save') || 'შენახვა')}
            </button>
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => router.push('/profile')}
            >
              {t('cancel') || 'გაუქმება'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {/* მისამართის ძებნა */}
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="text-sm font-medium text-slate-700 mb-2">მისამართის ძებნა</div>
          <AddressSearch 
            placeholder="ჩაწერეთ ქუჩა, მისამართი..."
            onSelect={(searchLat, searchLng, address) => {
              setLat(searchLat);
              setLng(searchLng);
              if (!city && address) {
                const parts = address.split(',').map(p => p.trim());
                if (parts.length > 1) {
                  setCity(parts[parts.length - 1]);
                }
              }
            }}
          />
        </div>

        <MapView
          properties={lat && lng ? [{ _id: id, title, desc, price: Number(price), city, region, location: { lat, lng }, type: type as any, dealType: dealType as any, photos: existingPhotos, exteriorLink, interiorLink, contact: { phone: contactPhone, email: contactEmail } }] : []}
          selectedLocation={lat && lng ? { lat, lng } : null}
          center={lat && lng ? { lat, lng } : undefined}
          zoom={lat && lng ? 17 : undefined}
          onPick={(a, b) => {
            setLat(a);
            setLng(b);
          }}
        />
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
          💡 ჯერ მოძებნეთ ქუჩა ზემოთ, შემდეგ რუკაზე დააკლიკეთ ზუსტი ადგილის მისათითებლად.
        </div>
      </div>
    </div>
  );
}
