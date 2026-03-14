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

        <div className="mt-4 grid gap-2">
          <input
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            placeholder={t('title')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="min-h-[140px] rounded-md border border-slate-200 px-3 py-2 text-sm"
            placeholder={t('description')}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          {/* ფასი და ვალუტა */}
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

          <div className="grid grid-cols-2 gap-2">
            <CityCombobox 
              value={city} 
              onChange={(newCity) => {
                setCity(newCity);
                if (newCity.toLowerCase() !== 'თბილისი') {
                  setTbilisiDistrict('');
                  setTbilisiSubdistricts([]);
                } else {
                  setRegion('tbilisi');
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

          <div className="grid grid-cols-2 gap-2">
            <select
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="apartment">ბინა</option>
              <option value="house">კერძო სახლი</option>
              <option value="commercial">კომერციული</option>
              <option value="land">მიწა</option>
              <option value="cottage">აგარაკი</option>
              <option value="hotel">სასტუმრო</option>
              <option value="building">შენობა</option>
              <option value="warehouse">საწყობი</option>
              <option value="parking">ავტოფარეხი</option>
            </select>
            <select
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              value={dealType}
              onChange={(e) => setDealType(e.target.value)}
            >
              <option value="sale">იყიდება</option>
              <option value="rent">ქირავდება</option>
              <option value="mortgage">გირავდება</option>
              <option value="daily">ქირავდება დღიურად</option>
              <option value="under_construction">მშენებარე</option>
            </select>
          </div>

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
