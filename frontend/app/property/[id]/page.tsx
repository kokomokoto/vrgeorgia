'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { getProperty, listProperties, resolveImageUrl } from '@/lib/api';
import { getPropertyAddressLine } from '@/lib/propertyDisplay';
import { useAutoTranslate } from '@/lib/translate';
import { MapView } from '@/components/MapView';
import { ShareButtons } from '@/components/ShareButtons';
import FavoriteButton from '@/components/FavoriteButton';
import CompareButton from '@/components/CompareButton';
import { PropertyCard } from '@/components/PropertyCard';
import { PropertyPriceRow } from '@/components/PropertyPriceRow';
import { PropertySpecChips } from '@/components/PropertySpecChips';
import { BrokerContactChannels } from '@/components/BrokerContactChannels';
import { PanoramaViewer } from '@/components/PanoramaViewer';
import { isPanoramaPhoto } from '@/lib/panorama';
import { resolveTourPublicUrl } from '@/lib/tourBuilder';
import { useAuth } from '@/components/AuthProvider';
import type { Property } from '@/lib/types';

// Lightbox — ჩვეულებრივი ფოტო ან 360° პანორამა
function LightboxModal({ photos, panoramaPhotos, index, onClose, onChangeIndex, t }: {
  photos: string[];
  panoramaPhotos?: string[];
  index: number;
  onClose: () => void;
  onChangeIndex: (i: number) => void;
  t: (key: string) => string;
}) {
  const currentUrl = resolveImageUrl(photos[index]);
  const is360 = isPanoramaPhoto(photos[index], panoramaPhotos);
  const viewerWrapRef = React.useRef<HTMLDivElement>(null);
  const [show360Ui, setShow360Ui] = React.useState(true);
  const hide360Overlay = React.useCallback(() => {
    setShow360Ui((prev) => (prev ? false : prev));
  }, []);
  const [portalReady, setPortalReady] = React.useState(false);

  React.useEffect(() => {
    setShow360Ui(true);
  }, [index]);

  React.useEffect(() => {
    setPortalReady(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const toggleViewerFullscreen = React.useCallback(() => {
    const el = viewerWrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen();
    }
  }, []);

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onChangeIndex(index - 1);
      if (e.key === 'ArrowRight' && index < photos.length - 1) onChangeIndex(index + 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [index, photos.length, onClose, onChangeIndex]);

  if (!portalReady) return null;

  return createPortal(
    <div
      className="fixed inset-0 !z-[9999] flex items-center justify-center bg-black/90"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {index > 0 && (
        <button
          type="button"
          aria-label={t('previous_photo') || 'Previous photo'}
          className="absolute left-0 top-28 bottom-32 z-[10000] flex w-14 cursor-pointer items-center justify-center transition-colors hover:bg-white/10 md:w-20"
          onClick={(e) => { e.stopPropagation(); onChangeIndex(index - 1); }}
        >
          <span className="text-white/80 text-5xl leading-none drop-shadow-lg hover:text-white transition-colors">
            ‹
          </span>
        </button>
      )}
      
      {is360 ? (
        <div
          className="mx-auto flex w-[min(96vw,1600px)] flex-col items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            ref={viewerWrapRef}
            className="relative h-[min(94vh,1040px)] w-full min-h-[560px]"
          >
          <PanoramaViewer
            key={currentUrl}
            src={currentUrl}
            showNavbar={false}
            onContainerClick={hide360Overlay}
            className="h-full w-full rounded-lg"
          />

          <button
            type="button"
            aria-label="სრული ეკრანი"
            className="absolute bottom-4 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-lg bg-black/55 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-black/75"
            onClick={(e) => {
              e.stopPropagation();
              toggleViewerFullscreen();
            }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          </button>

          {show360Ui && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <span className="select-none rounded-2xl bg-black/50 px-8 py-4 text-5xl font-bold tracking-wide text-white shadow-2xl backdrop-blur-sm md:text-6xl">
                360°
              </span>
            </div>
          )}

          </div>
        </div>
      ) : (
        <img
          src={currentUrl}
          alt={`Photo ${index + 1}`}
          className="max-h-[90vh] max-w-[90vw] object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      )}
      
      {index < photos.length - 1 && (
        <button
          type="button"
          aria-label={t('next_photo') || 'Next photo'}
          className="absolute right-0 top-28 bottom-32 z-[10000] flex w-14 cursor-pointer items-center justify-center transition-colors hover:bg-white/10 md:w-20"
          onClick={(e) => { e.stopPropagation(); onChangeIndex(index + 1); }}
        >
          <span className="text-white/80 text-5xl leading-none drop-shadow-lg hover:text-white transition-colors">
            ›
          </span>
        </button>
      )}
      
      <div className="absolute bottom-4 left-1/2 z-[10000] -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-sm text-white">
        {index + 1} / {photos.length}
      </div>
      <div
        className="absolute bottom-16 left-1/2 z-[10000] flex max-w-[80vw] -translate-x-1/2 gap-1.5 overflow-x-auto p-2"
        onClick={(e) => e.stopPropagation()}
      >
        {photos.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChangeIndex(i)}
            className={`h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border-2 transition-all ${
              i === index ? 'scale-110 border-white' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <img src={resolveImageUrl(p)} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      <button
        type="button"
        aria-label={t('close') || 'Close'}
        className="absolute top-4 right-4 z-[10001] flex h-11 w-11 items-center justify-center rounded-full bg-black/60 p-0 text-white shadow-lg transition-colors hover:bg-black/80"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <svg
          className="block h-6 w-6 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>,
    document.body
  );
}

function PropertyDetailInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const shareTokenFromUrl = searchParams.get('t')?.trim() || undefined;
  const { i18n, t } = useTranslation();
  const { user: currentUser } = useAuth();

  const [property, setProperty] = useState<Property | null>(null);
  const [similarProperties, setSimilarProperties] = useState<Property[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [heroPhotoIndex, setHeroPhotoIndex] = useState(0);
  const [hoverPhotoIndex, setHoverPhotoIndex] = useState<number | null>(null);
  const [view3dMode, setView3dMode] = useState<'exterior' | 'interior' | 'tour'>('exterior');
  const propertyMapSectionRef = React.useRef<HTMLDivElement>(null);

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

  const tour3dWrapRef = React.useRef<HTMLDivElement>(null);
  const propertyMapWrapRef = React.useRef<HTMLDivElement>(null);
  const toggleTour3dFullscreen = React.useCallback(() => {
    const el = tour3dWrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen();
    }
  }, []);
  const togglePropertyMapFullscreen = React.useCallback(() => {
    const el = propertyMapWrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen();
    }
  }, []);

  const scrollToPropertyMap = React.useCallback(() => {
    const el =
      propertyMapSectionRef.current ??
      document.getElementById('property-map-section');
    if (!el) return;

    // lightbox / მოდალები ხშირად ტოვებს overflow:hidden-ს
    if (document.body.style.overflow === 'hidden') {
      document.body.style.overflow = '';
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

    // scroll-margin-top (scroll-mt-24) + block:start — ჰედერის ქვეშ არ ჩაიფაროს
    el.scrollIntoView({ behavior, block: 'start', inline: 'nearest' });

    // ზოგ ბრაუზერში scrollIntoView არ მოძრაობს — window.scrollTo სათადარო
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const headerOffset = 96;
      const targetTop = window.scrollY + rect.top - headerOffset;
      if (Math.abs(window.scrollY - targetTop) > 8) {
        window.scrollTo({ top: Math.max(0, targetTop), behavior });
      }
    });
  }, []);

  useEffect(() => {
    let alive = true;
    setError(null);
    getProperty(params.id, i18n.language, { shareToken: shareTokenFromUrl })
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
  }, [params.id, i18n.language, shareTokenFromUrl]);

  useEffect(() => {
    if (!property) return;
    const ph = property.photos || [];
    if (ph.length === 0) {
      setHeroPhotoIndex(0);
      return;
    }
    setHeroPhotoIndex(
      Math.min(Math.max(0, property.mainPhoto ?? 0), ph.length - 1)
    );
  }, [property?._id, property?.photos?.length, property?.mainPhoto]);

  if (error) return <div className="text-sm text-red-700">{error}</div>;
  if (!property) return <div className="text-sm text-slate-500">Loading…</div>;

  const photos = property.photos || [];

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';

  const sqm = property.sqm || 0;
  const rooms = property.rooms || 0;

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
    
    return parts;
  };

  const autoDescription = generateAutoDescription();

  // საბოლოო ტექსტები
  const displayTitle = needsTranslation && translatedTitle ? translatedTitle : property.title;
  const displayDesc = needsTranslation && translatedDesc ? translatedDesc : property.desc;
  const addressLine = getPropertyAddressLine(property);

  const link3dExterior = (property.exteriorLink || property.threeDLink || '').trim();
  const link3dInterior = (property.interiorLink || '').trim();
  const link3dPanoramaTour = resolveTourPublicUrl(property.tourLink);
  const has3dExterior = !!link3dExterior;
  const has3dInterior = !!link3dInterior;
  const has3dPanoramaTour = !!link3dPanoramaTour;
  const has3dTour = has3dExterior || has3dInterior || has3dPanoramaTour;
  const showMediaHero = has3dTour || photos.length > 0;
  const displayPhotoIndex =
    hoverPhotoIndex !== null ? hoverPhotoIndex : heroPhotoIndex;
  const displayPhotoUrl = photos[displayPhotoIndex];
  const displayIs360 = displayPhotoUrl
    ? isPanoramaPhoto(displayPhotoUrl, property.panoramaPhotos)
    : false;
  const usePhotoHero = showMediaHero && !has3dTour && photos.length > 0;
  const showing3dTour = view3dMode === 'tour' && has3dPanoramaTour;
  const showing3dInterior = !showing3dTour && view3dMode === 'interior' && has3dInterior;
  const showing3dExterior = !showing3dTour && !showing3dInterior && has3dExterior;

  const ownerRoleLabel =
    owner && typeof owner === 'object' && owner.role === 'agent' ? t('agent_role') : t('broker');

  const listedDateLabel = property.createdAt
    ? new Date(property.createdAt).toLocaleDateString('ka-GE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;
  const displayId = property.numericId ?? property._id;

  const sharePageUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : `https://vrgeorgia.ge/property/${property._id}${shareTokenFromUrl ? `?t=${shareTokenFromUrl}` : ''}`;

  const sidebarPanels = (
    <>
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3">
        <PropertyPriceRow p={property} />
        <PropertySpecChips p={property} gapClass="gap-1.5" />
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3">
        <div className="flex items-center gap-3">
          {owner?.avatar ? (
            <img
              src={resolveImageUrl(owner.avatar)}
              alt=""
              className="h-14 w-14 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xl text-slate-400">
              {owner?.email?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-900">
              {owner?.name || owner?.email || t('unknown')}
            </div>
            <div className="text-sm text-slate-500">{ownerRoleLabel}</div>
          </div>
        </div>

        <BrokerContactChannels
          phone={property.contact?.phone || owner?.phone}
          email={property.contact?.email || owner?.email}
        />

        {owner?._id && (
          <Link
            href={`/agent/${owner._id}`}
            className="block w-full rounded-md bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            {t('otherListings')}
          </Link>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3">
        <ShareButtons
          variant="sidebar"
          url={sharePageUrl}
          title={displayTitle}
          description={displayDesc}
        />
      </div>
    </>
  );

  return (
    <div className="grid w-full min-w-0 gap-2 sm:gap-2.5 lg:grid-cols-[1fr_minmax(280px,320px)] lg:items-start">
      {/* სათაური + მისამართი — მარცხე სვეტი (3D-ის სიგანე) */}
      <div className="flex min-w-0 gap-2 rounded-lg border border-slate-200 bg-white p-2.5 sm:gap-2.5 sm:p-3 lg:col-start-1 lg:row-start-1">
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-base font-semibold text-slate-900 sm:text-xl">
            {displayTitle}
            {translatingTitle && (
              <span className="ml-2 text-sm font-normal text-slate-400">{t('translating')}...</span>
            )}
          </h1>
          {addressLine ? (
            <a
              href="#property-map-section"
              onClick={(e) => {
                e.preventDefault();
                scrollToPropertyMap();
              }}
              className="mt-1.5 flex w-full min-w-0 cursor-pointer items-start gap-1.5 rounded-md text-left text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-700"
            >
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="min-w-0 flex-1 break-words underline decoration-slate-300 decoration-dotted underline-offset-2">
                {addressLine}
              </span>
            </a>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1.5 self-start">
          <CompareButton propertyId={property._id} size="md" />
          <FavoriteButton propertyId={property._id} size="md" />
        </div>
      </div>

      {/* ID, თარიღი, ნახვები — მარჯვე სვეტი (ფასის პანელის სიგანე) */}
      <div className="flex flex-col justify-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3 lg:col-start-2 lg:row-start-1">
        <div className="font-mono text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
          ID: {displayId}
        </div>
        {(listedDateLabel || typeof property.views === 'number') && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
            {listedDateLabel && <span>📅 {listedDateLabel}</span>}
            {typeof property.views === 'number' && (
              <span>
                👁️ {property.views} {t('views_count')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3D ან მთავარი ფოტო + მარჯვე პანელები (desktop) */}
      {showMediaHero && (
        <>
        <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3 lg:col-start-1 lg:row-start-2">
          {has3dTour ? (
          <>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold">{t('view3d')}</div>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={!has3dExterior}
                onClick={() => has3dExterior && setView3dMode('exterior')}
                className={`rounded-md px-3 py-1 text-sm transition-colors ${
                  showing3dExterior
                    ? 'bg-blue-600 text-white'
                    : has3dExterior
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : 'cursor-not-allowed bg-slate-50 text-slate-300'
                }`}
              >
                {t('exterior')}
              </button>
              <button
                type="button"
                disabled={!has3dInterior}
                onClick={() => has3dInterior && setView3dMode('interior')}
                className={`rounded-md px-3 py-1 text-sm transition-colors ${
                  showing3dInterior
                    ? 'bg-blue-600 text-white'
                    : has3dInterior
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : 'cursor-not-allowed bg-slate-50 text-slate-300'
                }`}
              >
                {t('interior')}
              </button>
              <button
                type="button"
                disabled={!has3dPanoramaTour}
                onClick={() => has3dPanoramaTour && setView3dMode('tour')}
                className={`rounded-md px-3 py-1 text-sm transition-colors ${
                  showing3dTour
                    ? 'bg-blue-600 text-white'
                    : has3dPanoramaTour
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : 'cursor-not-allowed bg-slate-50 text-slate-300'
                }`}
              >
                {t('view3d_tour')}
              </button>
            </div>
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
            
            const rawUrl = showing3dTour
              ? link3dPanoramaTour
              : showing3dInterior
                ? link3dInterior
                : link3dExterior || link3dInterior || link3dPanoramaTour;

            const embedUrl = showing3dTour ? rawUrl : convertToEmbedUrl(rawUrl || '');
            
            if (!embedUrl || !embedUrl.startsWith('http')) {
              return (
                <div className="mx-auto flex aspect-video w-full max-h-[85vh] items-center justify-center rounded-md border border-slate-200 bg-slate-100">
                  <p className="text-slate-500">{t('invalid_3d_link')}</p>
                </div>
              );
            }
            
            return (
              <div
                ref={tour3dWrapRef}
                className="relative mx-auto aspect-video w-full max-h-[85vh] overflow-hidden rounded-md border border-slate-200"
              >
                <iframe
                  className="absolute inset-0 h-full w-full"
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
                  className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow transition-colors hover:text-blue-600"
                >
                  🔗 {t('open_new_tab')}
                </a>
                <button
                  type="button"
                  aria-label="სრული ეკრანი"
                  className="absolute bottom-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-lg bg-black/55 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-black/80"
                  onClick={toggleTour3dFullscreen}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
                    />
                  </svg>
                </button>
              </div>
            );
          })()}
          </>
          ) : usePhotoHero ? (
            <>
              <div className="mb-2 text-sm font-semibold">
                {t('photos')} ({photos.length})
              </div>
              <div className="relative mx-auto aspect-video w-full max-h-[85vh] overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                {photos.length > 1 && displayPhotoIndex > 0 && (
                  <button
                    type="button"
                    aria-label={t('previous_photo') || 'Previous photo'}
                    className="absolute left-0 top-0 z-20 flex h-full w-12 items-center justify-center bg-gradient-to-r from-black/45 to-transparent text-white/90 transition-colors hover:from-black/60 sm:w-14"
                    onClick={() => {
                      setHoverPhotoIndex(null);
                      setHeroPhotoIndex((i) => Math.max(0, i - 1));
                    }}
                  >
                    <span className="text-3xl leading-none drop-shadow-lg">‹</span>
                  </button>
                )}
                {photos.length > 1 && displayPhotoIndex < photos.length - 1 && (
                  <button
                    type="button"
                    aria-label={t('next_photo') || 'Next photo'}
                    className="absolute right-0 top-0 z-20 flex h-full w-12 items-center justify-center bg-gradient-to-l from-black/45 to-transparent text-white/90 transition-colors hover:from-black/60 sm:w-14"
                    onClick={() => {
                      setHoverPhotoIndex(null);
                      setHeroPhotoIndex((i) => Math.min(photos.length - 1, i + 1));
                    }}
                  >
                    <span className="text-3xl leading-none drop-shadow-lg">›</span>
                  </button>
                )}
                <button
                  type="button"
                  className="group relative block h-full w-full cursor-pointer text-left"
                  onClick={() => setLightboxIndex(displayPhotoIndex)}
                  aria-label={t('photos')}
                >
                  <img
                    key={displayPhotoUrl}
                    src={resolveImageUrl(displayPhotoUrl)}
                    alt=""
                    className={`h-full w-full transition-opacity group-hover:opacity-95 ${
                      displayIs360 ? 'object-contain bg-slate-900' : 'object-cover'
                    }`}
                  />
                  {displayIs360 && (
                    <span className="absolute left-2 top-2 rounded bg-blue-600 px-2 py-0.5 text-xs font-bold text-white shadow">
                      {t('photo_360')}
                    </span>
                  )}
                </button>
                {photos.length > 1 && (
                  <span className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-lg bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {displayPhotoIndex + 1} / {photos.length}
                  </span>
                )}
              </div>
            </>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:gap-2.5 lg:col-start-2 lg:row-start-2 lg:h-full lg:self-stretch lg:justify-between">
          {sidebarPanels}
        </div>
        </>
      )}

      {/* ფოტოები, აღწერა, დეტალები — სრული სიგანე */}
      <div
        className={`grid w-full min-w-0 gap-2 sm:gap-2.5 ${
          showMediaHero ? 'lg:col-span-2 lg:row-start-3' : 'lg:col-start-1 lg:row-start-2'
        }`}
      >
      {/* ფოტოები - ჰორიზონტალური სქროლით */}
      {photos.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3">
          {!usePhotoHero && (
            <div className="mb-2 text-sm font-semibold">
              {t('photos')} ({photos.length})
            </div>
          )}
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto py-0.5 scrollbar-thin">
            {photos.map((p, idx) => {
              const is360Thumb = isPanoramaPhoto(p, property.panoramaPhotos);
              const isThumbActive = usePhotoHero
                ? hoverPhotoIndex === idx ||
                  (hoverPhotoIndex === null && idx === heroPhotoIndex)
                : false;
              return (
              <div 
                key={p} 
                role="button"
                tabIndex={0}
                className={`relative flex-shrink-0 cursor-pointer rounded-lg border-2 transition-all hover:opacity-90 ${
                  isThumbActive ? 'border-blue-600' : 'border-transparent'
                }`}
                onMouseEnter={() => {
                  if (usePhotoHero) setHoverPhotoIndex(idx);
                }}
                onMouseLeave={() => {
                  if (usePhotoHero) setHoverPhotoIndex(null);
                }}
                onClick={() => {
                  if (usePhotoHero) {
                    setHoverPhotoIndex(null);
                    setHeroPhotoIndex(idx);
                  } else {
                    setLightboxIndex(idx);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (usePhotoHero) {
                      setHoverPhotoIndex(null);
                      setHeroPhotoIndex(idx);
                    } else {
                      setLightboxIndex(idx);
                    }
                  }
                }}
              >
                <img 
                  src={resolveImageUrl(p)} 
                  alt={`Photo ${idx + 1}`} 
                  className={`h-[140px] sm:h-[180px] w-auto rounded-lg ${is360Thumb ? 'object-contain bg-slate-900 min-w-[200px]' : 'object-cover'}`}
                />
                {is360Thumb && (
                  <span className="absolute left-1.5 top-1.5 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                    {t('photo_360')}
                  </span>
                )}
              </div>
            );
            })}
          </div>
        </div>
      )}

      {property.desc && (
        <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3">
          <div className="text-sm font-semibold mb-2">
            {t('description')}
            {translatingDesc && (
              <span className="ml-2 text-xs text-slate-400 font-normal">{t('translating')}...</span>
            )}
          </div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap break-words overflow-hidden">{displayDesc}</div>
        </div>
      )}

      {/* პირადი ჩანაწერი - მხოლოდ მფლობელისთვის */}
      {isOwner && property.privateNotes && (
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-2.5 sm:p-3">
          <div className="text-sm font-semibold mb-2 flex items-center gap-2 text-amber-800">
            🔒 {t('private_notes')}
            <span className="text-xs font-normal text-amber-600">({t('only_you_see')})</span>
          </div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap">{property.privateNotes}</div>
        </div>
      )}

      {/* დეტალური ინფორმაცია - ზემოთ */}
      <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3">
        <div className="text-sm font-semibold mb-2">{t('detailed_info')}</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-2.5">
          {(property.sqm ?? 0) > 0 && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 rounded-lg">
              <span className="text-xl sm:text-2xl">📐</span>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">{t('area_detail')}</div>
                <div className="text-sm sm:text-base font-medium text-slate-800">
                  {property.sqm!.toLocaleString('en-US')} {t('sqm_unit_short')}
                </div>
              </div>
            </div>
          )}
          {(property.houseSqm ?? 0) > 0 && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 rounded-lg">
              <span className="text-xl sm:text-2xl">🏠</span>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">{t('house_area_detail')}</div>
                <div className="text-sm sm:text-base font-medium text-slate-800">
                  {property.houseSqm!.toLocaleString('en-US')} {t('sqm_unit_short')}
                </div>
              </div>
            </div>
          )}
          {((property.rooms || property.roomCount || 0) > 0) && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 rounded-lg">
              <span className="text-xl sm:text-2xl">🚪</span>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">{t('rooms_detail')}</div>
                <div className="text-sm sm:text-base font-medium text-slate-800">{property.rooms || property.roomCount}</div>
              </div>
            </div>
          )}
          {(property.floor ?? 0) > 0 && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 rounded-lg">
              <span className="text-xl sm:text-2xl">🏢</span>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">{t('floor_detail')}</div>
                <div className="text-sm sm:text-base font-medium text-slate-800">
                  {property.floor}{property.totalFloors ? ` / ${property.totalFloors}` : ''}
                </div>
              </div>
            </div>
          )}
          {property.buildingProject && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 rounded-lg">
              <span className="text-xl sm:text-2xl">🏠</span>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">{t('project_detail')}</div>
                <div className="text-sm sm:text-base font-medium text-slate-800">
                  {t(`project_${property.buildingProject}`) || property.buildingProject}
                </div>
              </div>
            </div>
          )}
          {(property.balcony ?? 0) > 0 && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 rounded-lg">
              <span className="text-xl sm:text-2xl">🌅</span>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">{t('balcony_detail')}</div>
                <div className="text-sm sm:text-base font-medium text-slate-800">{property.balcony}</div>
              </div>
            </div>
          )}
          {(property.loggia ?? 0) > 0 && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 rounded-lg">
              <span className="text-xl sm:text-2xl">🪟</span>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">{t('loggia_detail')}</div>
                <div className="text-sm sm:text-base font-medium text-slate-800">{property.loggia}</div>
              </div>
            </div>
          )}
          {(property.bathroom ?? 0) > 0 && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 rounded-lg">
              <span className="text-xl sm:text-2xl">🚿</span>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">{t('bathroom_detail')}</div>
                <div className="text-sm sm:text-base font-medium text-slate-800">{property.bathroom}</div>
              </div>
            </div>
          )}
          {(property.constructionYear ?? 0) > 0 && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 rounded-lg">
              <span className="text-xl sm:text-2xl">🏗️</span>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">{t('construction_year')}</div>
                <div className="text-sm sm:text-base font-medium text-slate-800">{property.constructionYear}</div>
              </div>
            </div>
          )}
          {(property.renovationYear ?? 0) > 0 && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 rounded-lg">
              <span className="text-xl sm:text-2xl">🛠️</span>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">{t('renovation_year')}</div>
                <div className="text-sm sm:text-base font-medium text-slate-800">{property.renovationYear}</div>
              </div>
            </div>
          )}
          {property.cadastralCode && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-50 rounded-lg col-span-2">
              <span className="text-xl sm:text-2xl">📋</span>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">{t('cadastral_code')}</div>
                <div className="text-sm font-medium text-slate-800 font-mono truncate">{property.cadastralCode}</div>
              </div>
            </div>
          )}
        </div>

        {/* ავტომატური აღწერა - ხაზის ქვემოთ */}
        {autoDescription.length > 0 && (
          <>
            <hr className="border-slate-200 my-3 sm:my-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
              {autoDescription.map((item, idx) => (
                <div key={idx} className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-md">
                  {item}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* კომფორტი და კომუნიკაციები */}
      {property.amenities && Object.values(property.amenities).some(v => v) && (
        <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3">
          <div className="text-sm font-semibold mb-2">{t('comfort_communications')}</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {property.amenities.elevator && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🛗</span>
                <span className="text-sm font-medium">{t('amenity_elevator')}</span>
              </div>
            )}
            {property.amenities.furniture && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🛋️</span>
                <span className="text-sm font-medium">{t('amenity_furniture')}</span>
              </div>
            )}
            {property.amenities.garage && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🚗</span>
                <span className="text-sm font-medium">{t('amenity_garage')}</span>
              </div>
            )}
            {property.amenities.basement && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🏚️</span>
                <span className="text-sm font-medium">{t('amenity_basement')}</span>
              </div>
            )}
            {property.amenities.centralHeating && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🔥</span>
                <span className="text-sm font-medium">{t('amenity_centralHeating')}</span>
              </div>
            )}
            {property.amenities.naturalGas && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🔵</span>
                <span className="text-sm font-medium">{t('amenity_naturalGas')}</span>
              </div>
            )}
            {property.amenities.storage && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">📦</span>
                <span className="text-sm font-medium">{t('amenity_storage')}</span>
              </div>
            )}
            {property.amenities.internet && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">📶</span>
                <span className="text-sm font-medium">{t('amenity_internet')}</span>
              </div>
            )}
            {property.amenities.electricity && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">⚡</span>
                <span className="text-sm font-medium">{t('amenity_electricity')}</span>
              </div>
            )}
            {property.amenities.water && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">💧</span>
                <span className="text-sm font-medium">{t('amenity_water')}</span>
              </div>
            )}
            {property.amenities.security && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🔒</span>
                <span className="text-sm font-medium">{t('amenity_security')}</span>
              </div>
            )}
            {property.amenities.airConditioner && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">❄️</span>
                <span className="text-sm font-medium">{t('amenity_airConditioner')}</span>
              </div>
            )}
            {property.amenities.fireplace && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🪵</span>
                <span className="text-sm font-medium">{t('amenity_fireplace')}</span>
              </div>
            )}
            {property.amenities.pool && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🏊</span>
                <span className="text-sm font-medium">{t('amenity_pool')}</span>
              </div>
            )}
            {property.amenities.garden && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🌳</span>
                <span className="text-sm font-medium">{t('amenity_garden')}</span>
              </div>
            )}
            {property.amenities.balcony && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🌅</span>
                <span className="text-sm font-medium">{t('balcony')}</span>
              </div>
            )}
            {property.amenities.terrace && (
              <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
                <span className="text-xl">🏞️</span>
                <span className="text-sm font-medium">{t('terrace')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* რუკა - ადგილმდებარეობა */}
      <div
        ref={propertyMapSectionRef}
        id="property-map-section"
        className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3"
      >
        <div className="text-sm font-semibold mb-2">{t('mapLocation')}</div>
        <div
          ref={propertyMapWrapRef}
          className="relative h-[200px] overflow-hidden rounded-lg sm:h-[300px]"
        >
          <MapView
            properties={[property]}
            selectedLocation={property.location}
            center={property.location}
            zoom={15}
            heightClassName="h-full"
            className="h-full rounded-none border-0"
          />
          <button
            type="button"
            aria-label="სრული ეკრანი"
            className="absolute bottom-3 right-3 z-[1000] flex h-11 w-11 items-center justify-center rounded-lg bg-black/55 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-black/80"
            onClick={togglePropertyMapFullscreen}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
              />
            </svg>
          </button>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          {t('coordinates')}: {property.location.lat.toFixed(5)}, {property.location.lng.toFixed(5)}
        </div>
      </div>
      </div>

      {/* ფასი, ბროკერი — ფოტო/3D ჰეროს გარეშე */}
      {!showMediaHero && (
        <div className="flex flex-col gap-2 sm:gap-2.5 lg:col-start-2 lg:row-start-2 lg:sticky lg:top-4 lg:self-start">
          {sidebarPanels}
        </div>
      )}

      {/* მსგავსი ობიექტები — სრული სიგანე */}
      {similarProperties.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3 lg:col-span-2">
          <div className="text-sm font-semibold mb-2">{t('similar_properties')}</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
          panoramaPhotos={property.panoramaPhotos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChangeIndex={setLightboxIndex}
          t={t}
        />
      )}
    </div>
  );
}

export default function PropertyDetailPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
      <PropertyDetailInner />
    </Suspense>
  );
}
