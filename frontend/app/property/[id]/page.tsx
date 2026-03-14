'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { getProperty, listProperties, resolveImageUrl } from '@/lib/api';
import { useCurrencyRate } from '@/lib/currency';
import { useAutoTranslate } from '@/lib/translate';
import { MapView } from '@/components/MapView';
import { ShareButtons } from '@/components/ShareButtons';
import FavoriteButton from '@/components/FavoriteButton';
import CompareButton from '@/components/CompareButton';
import { PropertyCard } from '@/components/PropertyCard';
import type { Property } from '@/lib/types';

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { i18n, t } = useTranslation();
  const { rate: USD_TO_GEL } = useCurrencyRate();

  const [property, setProperty] = useState<Property | null>(null);
  const [similarProperties, setSimilarProperties] = useState<Property[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'GEL'>('USD');
  const [view3dMode, setView3dMode] = useState<'exterior' | 'interior'>('exterior');

  // ენის დეტექცია - hooks ყოველთვის ერთნაირად უნდა გამოიძახონ
  const currentLang = i18n.language || 'ka';
  const needsTranslation = currentLang !== 'ka';

  // ავტომატური თარგმანი - hooks MUST be called unconditionally
  const { translated: translatedDesc, loading: translatingDesc } = useAutoTranslate(
    needsTranslation && property?.desc ? property.desc : '',
    'ka',
    currentLang
  );

  const { translated: translatedTitle, loading: translatingTitle } = useAutoTranslate(
    needsTranslation && property?.title ? property.title : '',
    'ka',
    currentLang
  );

  useEffect(() => {
    let alive = true;
    setError(null);
    getProperty(params.id, i18n.language)
      .then((r) => {
        if (!alive) return;
        setProperty(r.property);
        
        // მსგავსი ობიექტების ჩატვირთვა
        listProperties({ 
          type: [r.property.type], 
          city: r.property.city,
          lang: i18n.language 
        }).then((res) => {
          if (!alive) return;
          // გამოვრიცხავთ ამ ობიექტს და ვიღებთ მაქს 6 მსგავსს
          const similar = res.properties
            .filter(p => p._id !== r.property._id)
            .slice(0, 6);
          setSimilarProperties(similar);
        });
      })
      .catch((e) => {
        if (!alive) return;
        setError(e.message || 'Failed');
      });
    return () => {
      alive = false;
    };
  }, [params.id, i18n.language]);

  // amenity-ზე კლიკი - მთავარ გვერდზე გადასვლა ფილტრით
  const handleAmenityClick = (amenityKey: string) => {
    router.push(`/?amenities=${encodeURIComponent(JSON.stringify([amenityKey]))}`);
  };

  if (error) return <div className="text-sm text-red-700">{error}</div>;
  if (!property) return <div className="text-sm text-slate-500">Loading…</div>;

  const photos = property.photos || [];
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';

  // ფასების გამოთვლა - გავითვალისწინოთ ორიგინალი ვალუტა
  const originalCurrency = property.priceCurrency || 'USD';
  
  // გამოვთვალოთ ფასი ორივე ვალუტაში
  let priceUSD: number;
  let priceGEL: number;
  
  if (originalCurrency === 'USD') {
    priceUSD = property.price;
    priceGEL = Math.round(property.price * USD_TO_GEL);
  } else {
    priceGEL = property.price;
    priceUSD = Math.round(property.price / USD_TO_GEL);
  }
  
  const displayPrice = currency === 'USD' ? priceUSD : priceGEL;
  const currencySymbol = currency === 'USD' ? '$' : '₾';

  // ფასი კვადრატზე
  const sqm = property.sqm || 0;
  const rooms = property.rooms || 0;
  const pricePerSqm = sqm > 0 ? Math.round(displayPrice / sqm) : null;

  // მომხმარებლის ინფორმაცია
  const owner = typeof property.userId === 'object' ? property.userId : null;

  // ავტომატური აღწერის გენერაცია თარგმანებით
  const generateAutoDescription = () => {
    const parts: string[] = [];
    
    // ტიპი და გარიგება თარგმანით
    const typeLabel = t(property.type) || property.type;
    const dealLabel = t(property.dealType === 'rent' ? 'rentType' : property.dealType) || property.dealType;
    parts.push(`${typeLabel} ${dealLabel}`);
    
    // მდებარეობა - თბილისის დუბლირების გარეშე
    if (property.city || property.region) {
      const regionLabel = property.region ? t(`region_${property.region}`) : '';
      // თუ ქალაქი და რეგიონი ერთია (თბილისი), მხოლოდ ერთხელ ვაჩვენოთ
      const isTbilisi = property.city?.toLowerCase() === 'თბილისი' && property.region === 'tbilisi';
      const location = isTbilisi 
        ? property.city 
        : [property.city, regionLabel].filter(Boolean).join(', ');
      if (location) parts.push(`${t('location')}: ${location}`);
    }
    
    if (pricePerSqm) {
      parts.push(`${t('pricePerSqm')}: ${currencySymbol}${pricePerSqm.toLocaleString()}`);
    }
    
    return parts;
  };

  const autoDescription = generateAutoDescription();

  // საბოლოო ტექსტები
  const displayTitle = needsTranslation && translatedTitle ? translatedTitle : property.title;
  const displayDesc = needsTranslation && translatedDesc ? translatedDesc : property.desc;

  return (
    <div className="grid gap-4 max-w-4xl mx-auto">
      {/* სათაური და ფასი */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xl font-semibold text-slate-900">
              {displayTitle}
              {translatingTitle && (
                <span className="ml-2 text-sm text-slate-400 font-normal">{t('translating')}...</span>
              )}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {property.city || ''}{property.city && property.region ? ' • ' : ''}
              {property.region ? t(`region_${property.region}`) : ''}
            </div>
            {/* Share Buttons */}
            <div className="mt-3 flex items-center gap-2">
              <ShareButtons 
                url={typeof window !== 'undefined' ? window.location.href : `https://vrgeorgia.ge/property/${property._id}`}
                title={displayTitle}
                description={displayDesc}
              />
              <div className="flex gap-1 ml-2">
                <FavoriteButton propertyId={property._id} />
                <CompareButton propertyId={property._id} />
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-700">
              {currencySymbol}{displayPrice.toLocaleString()}
            </div>
            {/* ვალუტის გადართვა */}
            <div className="mt-1 flex gap-1 justify-end">
              <button
                onClick={() => setCurrency('USD')}
                className={`px-2 py-1 text-xs rounded ${currency === 'USD' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                USD
              </button>
              <button
                onClick={() => setCurrency('GEL')}
                className={`px-2 py-1 text-xs rounded ${currency === 'GEL' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                GEL
              </button>
            </div>
            {/* ფასი კვადრატზე */}
            {pricePerSqm && (
              <div className="mt-1 text-sm text-slate-500">
                {currencySymbol}{pricePerSqm.toLocaleString()}/{t('sqmUnit')}
              </div>
            )}
            {/* მიმდინარე კურსი */}
            {currency === 'GEL' && (
              <div className="mt-1 text-xs text-slate-400">
                {t('exchangeRate')}: 1$ = {USD_TO_GEL.toFixed(2)}₾
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3D - ექსტერიერი და ინტერიერი */}
      {(property.exteriorLink || property.interiorLink || property.threeDLink) && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold">{t('view3d')}</div>
            {property.exteriorLink && property.interiorLink && (
              <div className="flex gap-1">
                <button
                  onClick={() => setView3dMode('exterior')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    view3dMode === 'exterior'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t('exterior')}
                </button>
                <button
                  onClick={() => setView3dMode('interior')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    view3dMode === 'interior'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t('interior')}
                </button>
              </div>
            )}
          </div>
          {(() => {
            // ლინკის კონვერტაცია embed ფორმატში
            const convertToEmbedUrl = (input: string) => {
              if (!input) return '';
              
              let url = input.trim();
              
              // თუ iframe კოდია, ამოვიღოთ src
              if (url.includes('<iframe') && url.includes('src=')) {
                const srcMatch = url.match(/src=["']([^"']+)["']/);
                if (srcMatch && srcMatch[1]) {
                  url = srcMatch[1];
                }
              }
              
              // Supersplat view -> s (embed format)
              if (url.includes('superspl.at/view?id=')) {
                url = url.replace('superspl.at/view?id=', 'superspl.at/s?id=');
              }
              
              // YouTube watch -> embed
              if (url.includes('youtube.com/watch')) {
                try {
                  const videoId = new URL(url).searchParams.get('v');
                  if (videoId) return `https://www.youtube.com/embed/${videoId}`;
                } catch {}
              }
              // YouTube short links
              if (url.includes('youtu.be/')) {
                const videoId = url.split('youtu.be/')[1]?.split('?')[0];
                if (videoId) return `https://www.youtube.com/embed/${videoId}`;
              }
              
              return url;
            };
            
            const rawUrl = property.exteriorLink && property.interiorLink
              ? (view3dMode === 'exterior' ? property.exteriorLink : property.interiorLink)
              : (property.exteriorLink || property.interiorLink || property.threeDLink);
            
            const embedUrl = convertToEmbedUrl(rawUrl || '');
            
            // თუ URL ცარიელია ან არავალიდურია, არაფერს არ ვაჩვენებთ
            if (!embedUrl || !embedUrl.startsWith('http')) {
              return (
                <div className="h-[200px] flex items-center justify-center bg-slate-100 rounded-md">
                  <p className="text-slate-500">3D ლინკი არ არის მითითებული ან არასწორია</p>
                </div>
              );
            }
            
            return (
              <div className="relative">
                <iframe 
                  className="h-[450px] w-full rounded-md border border-slate-200" 
                  src={embedUrl}
                  title="3D Tour"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; xr-spatial-tracking; web-share"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  loading="lazy"
                  style={{ border: 'none' }}
                />
                {/* ახალ ტაბში გახსნის ღილაკი */}
                <a 
                  href={embedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white px-3 py-1.5 rounded-lg shadow text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors flex items-center gap-1"
                >
                  🔗 ახალ ტაბში
                </a>
              </div>
            );
          })()}
        </div>
      )}

      {/* ფოტოები - მეორე */}
      {photos.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold">{t('photos')} ({photos.length})</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((p, idx) => (
              <div 
                key={p} 
                className="cursor-pointer overflow-hidden rounded-lg hover:opacity-90 transition-opacity"
                onClick={() => setLightboxIndex(idx)}
              >
                <img 
                  src={resolveImageUrl(p)} 
                  alt={`Photo ${idx + 1}`} 
                  className="aspect-[4/3] w-full object-cover" 
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ავტომატური აღწერა მონაცემებიდან */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold mb-3">{t('characteristics')}</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {autoDescription.map((item, idx) => (
            <div key={idx} className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-md">
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* დეტალური ინფორმაცია - იკონებით */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold mb-4">დეტალური ინფორმაცია</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* ფართი */}
          {property.sqm && property.sqm > 0 && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <span className="text-2xl">📐</span>
              <div>
                <div className="text-xs text-slate-500">ფართი</div>
                <div className="font-medium text-slate-800">{property.sqm} მ²</div>
              </div>
            </div>
          )}
          
          {/* ოთახები */}
          {(property.rooms || property.roomCount) && (property.rooms || property.roomCount || 0) > 0 && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <span className="text-2xl">🚪</span>
              <div>
                <div className="text-xs text-slate-500">ოთახები</div>
                <div className="font-medium text-slate-800">{property.rooms || property.roomCount}</div>
              </div>
            </div>
          )}
          
          {/* სართული */}
          {property.floor && property.floor > 0 && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <span className="text-2xl">🏢</span>
              <div>
                <div className="text-xs text-slate-500">სართული</div>
                <div className="font-medium text-slate-800">
                  {property.floor}{property.totalFloors ? ` / ${property.totalFloors}` : ''}
                </div>
              </div>
            </div>
          )}
          
          {/* აივანი */}
          {property.balcony && property.balcony > 0 && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <span className="text-2xl">🌅</span>
              <div>
                <div className="text-xs text-slate-500">აივანი</div>
                <div className="font-medium text-slate-800">{property.balcony}</div>
              </div>
            </div>
          )}
          
          {/* ლოჯია */}
          {property.loggia && property.loggia > 0 && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <span className="text-2xl">🪟</span>
              <div>
                <div className="text-xs text-slate-500">ლოჯია</div>
                <div className="font-medium text-slate-800">{property.loggia}</div>
              </div>
            </div>
          )}
          
          {/* სველი წერტილი */}
          {property.bathroom && property.bathroom > 0 && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <span className="text-2xl">🚿</span>
              <div>
                <div className="text-xs text-slate-500">სველი წერტილი</div>
                <div className="font-medium text-slate-800">{property.bathroom}</div>
              </div>
            </div>
          )}
          
          {/* საკადასტრო კოდი */}
          {property.cadastralCode && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg col-span-2">
              <span className="text-2xl">📋</span>
              <div>
                <div className="text-xs text-slate-500">საკადასტრო კოდი</div>
                <div className="font-medium text-slate-800 font-mono text-sm">{property.cadastralCode}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* კომფორტი და კომუნიკაციები */}
      {property.amenities && Object.values(property.amenities).some(v => v) && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold mb-2">კომფორტი და კომუნიკაციები</div>
          <div className="text-xs text-slate-500 mb-4">დააჭირეთ რომ იპოვოთ სხვა ობიექტები ამ მახასიათებლით</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {property.amenities.elevator && (
              <button onClick={() => handleAmenityClick('elevator')} className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <span className="text-xl">🛗</span>
                <span className="text-sm font-medium">ლიფტი</span>
              </button>
            )}
            {property.amenities.furniture && (
              <button onClick={() => handleAmenityClick('furniture')} className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <span className="text-xl">🛋️</span>
                <span className="text-sm font-medium">ავეჯი</span>
              </button>
            )}
            {property.amenities.garage && (
              <button onClick={() => handleAmenityClick('garage')} className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <span className="text-xl">🚗</span>
                <span className="text-sm font-medium">ავტოფარეხი</span>
              </button>
            )}
            {property.amenities.basement && (
              <button onClick={() => handleAmenityClick('basement')} className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <span className="text-xl">🏚️</span>
                <span className="text-sm font-medium">სარდაფი</span>
              </button>
            )}
            {property.amenities.centralHeating && (
              <button onClick={() => handleAmenityClick('centralHeating')} className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <span className="text-xl">🔥</span>
                <span className="text-sm font-medium">ცენტრ. გათბობა</span>
              </button>
            )}
            {property.amenities.naturalGas && (
              <button onClick={() => handleAmenityClick('naturalGas')} className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <span className="text-xl">🔵</span>
                <span className="text-sm font-medium">ბუნებრივი აირი</span>
              </button>
            )}
            {property.amenities.storage && (
              <button onClick={() => handleAmenityClick('storage')} className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <span className="text-xl">📦</span>
                <span className="text-sm font-medium">საკუჭნაო</span>
              </button>
            )}
            {property.amenities.internet && (
              <button onClick={() => handleAmenityClick('internet')} className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <span className="text-xl">📶</span>
                <span className="text-sm font-medium">ინტერნეტი</span>
              </button>
            )}
            {property.amenities.electricity && (
              <button onClick={() => handleAmenityClick('electricity')} className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <span className="text-xl">⚡</span>
                <span className="text-sm font-medium">ელექტროობა</span>
              </button>
            )}
            {property.amenities.water && (
              <button onClick={() => handleAmenityClick('water')} className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <span className="text-xl">💧</span>
                <span className="text-sm font-medium">წყალი</span>
              </button>
            )}
            {property.amenities.security && (
              <button onClick={() => handleAmenityClick('security')} className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <span className="text-xl">🔒</span>
                <span className="text-sm font-medium">დაცვა</span>
              </button>
            )}
            {property.amenities.airConditioner && (
              <button onClick={() => handleAmenityClick('airConditioner')} className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <span className="text-xl">❄️</span>
                <span className="text-sm font-medium">კონდიციონერი</span>
              </button>
            )}
            {property.amenities.fireplace && (
              <button onClick={() => handleAmenityClick('fireplace')} className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <span className="text-xl">🪵</span>
                <span className="text-sm font-medium">ბუხარი</span>
              </button>
            )}
            {property.amenities.pool && (
              <button onClick={() => handleAmenityClick('pool')} className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <span className="text-xl">🏊</span>
                <span className="text-sm font-medium">აუზი</span>
              </button>
            )}
            {property.amenities.garden && (
              <button onClick={() => handleAmenityClick('garden')} className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <span className="text-xl">🌳</span>
                <span className="text-sm font-medium">ბაღი</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ავტორის აღწერა */}
      {property.desc && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold mb-3">
            {t('description')}
            {translatingDesc && (
              <span className="ml-2 text-xs text-slate-400 font-normal">{t('translating')}...</span>
            )}
          </div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap">{displayDesc}</div>
        </div>
      )}

      {/* რუკა - ადგილმდებარეობა */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold mb-3">{t('mapLocation')}</div>
        <div className="h-[300px] rounded-lg overflow-hidden">
          <MapView 
            properties={[property]} 
            selectedLocation={property.location}
            center={property.location}
            zoom={15}
          />
        </div>
        <div className="mt-2 text-xs text-slate-500">
          {t('coordinates')}: {property.location.lat.toFixed(5)}, {property.location.lng.toFixed(5)}
        </div>
      </div>

      {/* მაკლერი / მფლობელი */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold mb-3">{t('seller')}</div>
        <div className="flex items-center gap-4">
          {owner?.avatar ? (
            <img 
              src={resolveImageUrl(owner.avatar)} 
              alt="Avatar" 
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-xl text-slate-400">
              {owner?.email?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="flex-1">
            <div className="font-medium text-slate-800">
              {owner?.name || owner?.email || t('unknown')}
            </div>
            {property.contact?.phone && (
              <div className="text-sm text-slate-600">{t('phone')}: {property.contact.phone}</div>
            )}
            {property.contact?.email && (
              <div className="text-sm text-slate-600">{t('email')}: {property.contact.email}</div>
            )}
          </div>
          {owner?._id && (
            <Link
              href={`/agent/${owner._id}`}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {t('otherListings')}
            </Link>
          )}
        </div>
      </div>

      {/* მსგავსი ობიექტები */}
      {similarProperties.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-sm font-semibold mb-4">მსგავსი ობიექტები</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similarProperties.map((p) => (
              <PropertyCard key={p._id} p={p} />
            ))}
          </div>
        </div>
      )}

      {/* Lightbox მოდალი */}
      {lightboxIndex !== null && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightboxIndex(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white text-3xl hover:text-slate-300 z-50"
            onClick={() => setLightboxIndex(null)}
          >
            ×
          </button>
          
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-slate-300 p-2"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
            >
              ‹
            </button>
          )}
          
          <img
            src={resolveImageUrl(photos[lightboxIndex])}
            alt={`Photo ${lightboxIndex + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          
          {lightboxIndex < photos.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-slate-300 p-2"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
            >
              ›
            </button>
          )}
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
            {lightboxIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </div>
  );
}
