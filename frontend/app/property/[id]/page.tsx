'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { getProperty, listProperties, resolveImageUrl, contactPropertyOwner } from '@/lib/api';
import { useCurrencyRate } from '@/lib/currency';
import { useAutoTranslate } from '@/lib/translate';
import { MapView } from '@/components/MapView';
import { ShareButtons } from '@/components/ShareButtons';
import FavoriteButton from '@/components/FavoriteButton';
import CompareButton from '@/components/CompareButton';
import { PropertyCard } from '@/components/PropertyCard';
import { useAuth } from '@/components/AuthProvider';
import type { Property } from '@/lib/types';

// Lightbox კომპონენტი - keyboard ნავიგაცია + დიდი ღილაკები
function LightboxModal({ photos, index, onClose, onChangeIndex }: {
  photos: string[];
  index: number;
  onClose: () => void;
  onChangeIndex: (i: number) => void;
}) {
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onChangeIndex(index - 1);
      if (e.key === 'ArrowRight' && index < photos.length - 1) onChangeIndex(index + 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [index, photos.length, onClose, onChangeIndex]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <button 
        className="absolute top-4 right-4 text-white text-4xl hover:text-slate-300 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors"
        onClick={onClose}
      >
        ×
      </button>
      
      {index > 0 && (
        <button
          className="absolute left-0 top-0 h-full w-20 md:w-32 flex items-center justify-center z-50 cursor-pointer hover:bg-white/10 transition-colors"
          onClick={(e) => { e.stopPropagation(); onChangeIndex(index - 1); }}
        >
          <span className="text-white/80 text-5xl leading-none drop-shadow-lg hover:text-white transition-colors">
            ‹
          </span>
        </button>
      )}
      
      <img
        src={resolveImageUrl(photos[index])}
        alt={`Photo ${index + 1}`}
        className="max-h-[90vh] max-w-[90vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      
      {index < photos.length - 1 && (
        <button
          className="absolute right-0 top-0 h-full w-20 md:w-32 flex items-center justify-center z-50 cursor-pointer hover:bg-white/10 transition-colors"
          onClick={(e) => { e.stopPropagation(); onChangeIndex(index + 1); }}
        >
          <span className="text-white/80 text-5xl leading-none drop-shadow-lg hover:text-white transition-colors">
            ›
          </span>
        </button>
      )}
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-full">
        {index + 1} / {photos.length}
      </div>
      
      {/* ქვედა thumbnails */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5 max-w-[80vw] overflow-x-auto p-2" onClick={(e) => e.stopPropagation()}>
        {photos.map((p, i) => (
          <button
            key={i}
            onClick={() => onChangeIndex(i)}
            className={`flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
              i === index ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <img src={resolveImageUrl(p)} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

// შეტყობინების ფორმა ბროკერის პანელში
function PropertyMessageForm({ propertyId, propertyTitle }: { propertyId: string; propertyTitle: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [message, setMessage] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const handleSend = async () => {
    if (!user) { router.push('/login'); return; }
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await contactPropertyOwner(propertyId, message.trim());
      setSent(true);
      setMessage('');
      setTimeout(() => setSent(false), 3000);
    } catch (err: any) {
      alert(err.message || 'შეცდომა');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full border-t border-slate-200 pt-3 mt-1">
      <div className="text-xs font-medium text-slate-600 mb-2">✉️ შეტყობინების გაგზავნა</div>
      {sent ? (
        <div className="text-center py-3 text-sm text-green-600 font-medium">
          ✓ შეტყობინება გაიგზავნა!
        </div>
      ) : (
        <>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={`შეტყობინება "${propertyTitle.slice(0, 30)}${propertyTitle.length > 30 ? '...' : ''}"-ს შესახებ...`}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[70px] focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            maxLength={2000}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="w-full mt-2 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'იგზავნება...' : 'გაგზავნა'}
          </button>
        </>
      )}
    </div>
  );
}

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { i18n, t } = useTranslation();
  const { rate: USD_TO_GEL } = useCurrencyRate();
  const { user: currentUser } = useAuth();

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

  // ფასი კვადრატზე / სრული ფასი
  const sqm = property.sqm || 0;
  const rooms = property.rooms || 0;
  const isPerSqm = property.priceType === 'per_sqm';
  const pricePerSqm = isPerSqm ? displayPrice : (sqm > 0 ? Math.round(displayPrice / sqm) : null);
  const totalPrice = isPerSqm && sqm > 0 ? Math.round(displayPrice * sqm) : null;

  // მომხმარებლის ინფორმაცია
  const owner = typeof property.userId === 'object' ? property.userId : null;

  const isOwner = currentUser && owner?._id && (currentUser.id === owner._id || currentUser._id === owner._id);

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
    <div className="grid gap-3 sm:gap-4 max-w-6xl mx-auto w-full min-w-0 overflow-hidden">
      {/* სათაური და ფასი - ყველაზე ზემოთ */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="text-base sm:text-xl font-semibold text-slate-900 break-words">
              {displayTitle}
              {translatingTitle && (
                <span className="ml-2 text-sm text-slate-400 font-normal">{t('translating')}...</span>
              )}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {property.city || ''}{property.city && property.region ? ' • ' : ''}
              {property.region ? t(`region_${property.region}`) : ''}
            </div>
          </div>
          <div className="sm:text-right flex-shrink-0">
            <div className="text-xl sm:text-2xl font-bold text-blue-700">
              {currencySymbol}{displayPrice.toLocaleString()}{property.priceType === 'per_sqm' ? <span className="text-base font-normal text-slate-500">/{t('sqmUnit')}</span> : ''}
            </div>
            {/* ვალუტის გადართვა */}
            <div className="mt-1 flex gap-1 sm:justify-end">
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
            {/* ფასი კვადრატზე / სრული ფასი */}
            {isPerSqm && totalPrice && (
              <div className="mt-1 text-sm text-slate-500">
                სრული: {currencySymbol}{totalPrice.toLocaleString()}
              </div>
            )}
            {!isPerSqm && pricePerSqm && (
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

      {/* 3D + ფოტოები (მარცხნივ) და ბროკერი (მარჯვნივ) */}
      <div className="grid lg:grid-cols-[1fr_280px] gap-3 sm:gap-4">
      <div className="grid gap-3 sm:gap-4">
      {/* 3D - ექსტერიერი და ინტერიერი */}
      {(property.exteriorLink || property.interiorLink || property.threeDLink) && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
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
            const convertToEmbedUrl = (input: string) => {
              if (!input) return '';
              let url = input.trim();
              if (url.includes('<iframe') && url.includes('src=')) {
                const srcMatch = url.match(/src=["']([^"']+)["']/);
                if (srcMatch && srcMatch[1]) url = srcMatch[1];
              }
              if (url.includes('superspl.at/view?id=')) {
                url = url.replace('superspl.at/view?id=', 'superspl.at/s?id=');
              }
              if (url.includes('youtube.com/watch')) {
                try {
                  const videoId = new URL(url).searchParams.get('v');
                  if (videoId) return `https://www.youtube.com/embed/${videoId}`;
                } catch {}
              }
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
                  className="h-[250px] sm:h-[350px] md:h-[450px] w-full rounded-md border border-slate-200" 
                  src={embedUrl}
                  title="3D Tour"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; xr-spatial-tracking; web-share"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  loading="lazy"
                  style={{ border: 'none' }}
                />
                <a 
                  href={embedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-2 left-2 bg-white/90 hover:bg-white px-3 py-1.5 rounded-lg shadow text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors flex items-center gap-1"
                >
                  🔗 ახალ ტაბში
                </a>
              </div>
            );
          })()}
        </div>
      )}

      {/* ფოტოები - ჰორიზონტალური სქროლით, 3D-ის ქვემოთ */}
      {photos.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
          <div className="mb-3 text-sm font-semibold">{t('photos')} ({photos.length})</div>
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {photos.map((p, idx) => (
              <div 
                key={p} 
                className="flex-shrink-0 cursor-pointer overflow-hidden rounded-lg hover:opacity-90 transition-opacity"
                onClick={() => setLightboxIndex(idx)}
              >
                <img 
                  src={resolveImageUrl(p)} 
                  alt={`Photo ${idx + 1}`} 
                  className="h-[140px] sm:h-[180px] w-auto object-cover rounded-lg" 
                />
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* ბროკერის პანელი - მარჯვნივ */}
      <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
        <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4 lg:sticky lg:top-4">
          <div className="text-sm font-semibold mb-3">ბროკერი</div>
          <div className="flex flex-col items-center text-center gap-3">
            {owner?.avatar ? (
              <img 
                src={resolveImageUrl(owner.avatar)} 
                alt="Avatar" 
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-2xl text-slate-400">
                {owner?.email?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div>
              <div className="font-medium text-slate-800">
                {owner?.name || owner?.email || t('unknown')}
              </div>
              {property.contact?.phone && (
                <div className="mt-1 text-sm text-slate-600">{t('phone')}: {property.contact.phone}</div>
              )}
              {property.contact?.email && (
                <div className="text-sm text-slate-600">{t('email')}: {property.contact.email}</div>
              )}
            </div>
            {owner?._id && (
              <Link
                href={`/agent/${owner._id}`}
                className="w-full text-center px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {t('otherListings')}
              </Link>
            )}

            {/* შეტყობინების გაგზავნა */}
            {owner?._id && !isOwner && <PropertyMessageForm propertyId={property._id} propertyTitle={property.title} />}
          </div>
        </div>
      </div>
      </div>

      {/* პირადი ჩანაწერი - მხოლოდ მფლობელისთვის */}
      {isOwner && property.privateNotes && (
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-3 sm:p-4">
          <div className="text-sm font-semibold mb-2 flex items-center gap-2 text-amber-800">
            🔒 პირადი ჩანაწერი
            <span className="text-xs font-normal text-amber-600">(მხოლოდ თქვენ ხედავთ)</span>
          </div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap">{property.privateNotes}</div>
        </div>
      )}

      {/* დეტალური ინფორმაცია - ზემოთ */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
        <div className="text-sm font-semibold mb-3 sm:mb-4">დეტალური ინფორმაცია</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
          {(property.sqm ?? 0) > 0 && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 rounded-lg">
              <span className="text-xl sm:text-2xl">📐</span>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">ფართი</div>
                <div className="text-sm sm:text-base font-medium text-slate-800">{property.sqm} მ²</div>
              </div>
            </div>
          )}
          {((property.rooms || property.roomCount || 0) > 0) && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 rounded-lg">
              <span className="text-xl sm:text-2xl">🚪</span>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">ოთახები</div>
                <div className="text-sm sm:text-base font-medium text-slate-800">{property.rooms || property.roomCount}</div>
              </div>
            </div>
          )}
          {(property.floor ?? 0) > 0 && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 rounded-lg">
              <span className="text-xl sm:text-2xl">🏢</span>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">სართული</div>
                <div className="text-sm sm:text-base font-medium text-slate-800">
                  {property.floor}{property.totalFloors ? ` / ${property.totalFloors}` : ''}
                </div>
              </div>
            </div>
          )}
          {(property.balcony ?? 0) > 0 && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 rounded-lg">
              <span className="text-xl sm:text-2xl">🌅</span>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">აივანი</div>
                <div className="text-sm sm:text-base font-medium text-slate-800">{property.balcony}</div>
              </div>
            </div>
          )}
          {(property.loggia ?? 0) > 0 && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 rounded-lg">
              <span className="text-xl sm:text-2xl">🪟</span>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">ლოჯია</div>
                <div className="text-sm sm:text-base font-medium text-slate-800">{property.loggia}</div>
              </div>
            </div>
          )}
          {(property.bathroom ?? 0) > 0 && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 rounded-lg">
              <span className="text-xl sm:text-2xl">🚿</span>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">სველი წერტილი</div>
                <div className="text-sm sm:text-base font-medium text-slate-800">{property.bathroom}</div>
              </div>
            </div>
          )}
          {property.cadastralCode && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 rounded-lg col-span-2">
              <span className="text-xl sm:text-2xl">📋</span>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">საკადასტრო კოდი</div>
                <div className="text-sm font-medium text-slate-800 font-mono truncate">{property.cadastralCode}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ავტომატური აღწერა მონაცემებიდან */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
        <div className="text-sm font-semibold mb-3">{t('characteristics')}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
          {autoDescription.map((item, idx) => (
            <div key={idx} className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-md">
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* კომფორტი და კომუნიკაციები */}
      {property.amenities && Object.values(property.amenities).some(v => v) && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
          <div className="text-sm font-semibold mb-3 sm:mb-4">კომფორტი და კომუნიკაციები</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {property.amenities.elevator && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🛗</span>
                <span className="text-sm font-medium">ლიფტი</span>
              </div>
            )}
            {property.amenities.furniture && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🛋️</span>
                <span className="text-sm font-medium">ავეჯი</span>
              </div>
            )}
            {property.amenities.garage && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🚗</span>
                <span className="text-sm font-medium">ავტოფარეხი</span>
              </div>
            )}
            {property.amenities.basement && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🏚️</span>
                <span className="text-sm font-medium">სარდაფი</span>
              </div>
            )}
            {property.amenities.centralHeating && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🔥</span>
                <span className="text-sm font-medium">ცენტრ. გათბობა</span>
              </div>
            )}
            {property.amenities.naturalGas && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🔵</span>
                <span className="text-sm font-medium">ბუნებრივი აირი</span>
              </div>
            )}
            {property.amenities.storage && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">📦</span>
                <span className="text-sm font-medium">საკუჭნაო</span>
              </div>
            )}
            {property.amenities.internet && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">📶</span>
                <span className="text-sm font-medium">ინტერნეტი</span>
              </div>
            )}
            {property.amenities.electricity && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">⚡</span>
                <span className="text-sm font-medium">ელექტროობა</span>
              </div>
            )}
            {property.amenities.water && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">💧</span>
                <span className="text-sm font-medium">წყალი</span>
              </div>
            )}
            {property.amenities.security && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🔒</span>
                <span className="text-sm font-medium">დაცვა</span>
              </div>
            )}
            {property.amenities.airConditioner && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">❄️</span>
                <span className="text-sm font-medium">კონდიციონერი</span>
              </div>
            )}
            {property.amenities.fireplace && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🪵</span>
                <span className="text-sm font-medium">ბუხარი</span>
              </div>
            )}
            {property.amenities.pool && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🏊</span>
                <span className="text-sm font-medium">აუზი</span>
              </div>
            )}
            {property.amenities.garden && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🌳</span>
                <span className="text-sm font-medium">ბაღი</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ავტორის აღწერა */}
      {property.desc && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
          <div className="text-sm font-semibold mb-3">
            {t('description')}
            {translatingDesc && (
              <span className="ml-2 text-xs text-slate-400 font-normal">{t('translating')}...</span>
            )}
          </div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap break-words overflow-hidden">{displayDesc}</div>
        </div>
      )}

      {/* ID, თარიღი, ნახვები, გაზიარება - რუკის ზემოთ */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded truncate max-w-[200px]">ID: {property.numericId || property._id}</span>
          {property.createdAt && (
            <span>📅 {new Date(property.createdAt).toLocaleDateString('ka-GE')}</span>
          )}
          {typeof property.views === 'number' && (
            <span>👁️ {property.views} ნახვა</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ShareButtons 
            url={typeof window !== 'undefined' ? window.location.href : `https://vrgeorgia.ge/property/${property._id}`}
            title={displayTitle}
            description={displayDesc}
          />
          <div className="flex gap-1">
            <FavoriteButton propertyId={property._id} />
            <CompareButton propertyId={property._id} />
          </div>
        </div>
      </div>

      {/* რუკა - ადგილმდებარეობა */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
        <div className="text-sm font-semibold mb-3">{t('mapLocation')}</div>
        <div className="h-[200px] sm:h-[300px] rounded-lg overflow-hidden">
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

      {/* მსგავსი ობიექტები */}
      {similarProperties.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
          <div className="text-sm font-semibold mb-4">მსგავსი ობიექტები</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {similarProperties.map((p) => (
              <PropertyCard key={p._id} p={p} />
            ))}
          </div>
        </div>
      )}

      {/* Lightbox მოდალი */}
      {lightboxIndex !== null && (
        <LightboxModal
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChangeIndex={setLightboxIndex}
        />
      )}
    </div>
  );
}
