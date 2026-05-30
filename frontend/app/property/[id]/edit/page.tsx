'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/components/AuthProvider';
import { addPropertyPhotos, getProperty, updateProperty, resolveImageUrl } from '@/lib/api';
import { detectPanoramaFromFile, isPanoramaPhoto, normalizePhotoUrl } from '@/lib/panorama';
import {
  MAX_PROPERTY_PHOTOS,
  adjustMainIndexAfterRemoval,
  reorderArray,
} from '@/lib/propertyPhotos';
import { captureFlipPositions } from '@/lib/flipAnimation';
import { PhotoSortableGrid } from '@/components/PhotoSortableGrid';
import { usePhotoDragReorder } from '@/components/usePhotoDragReorder';
import { MapView } from '@/components/MapView';
import { CityCombobox } from '@/components/CityCombobox';
import AddressSearch from '@/components/AddressSearch';
import { reverseGeocodeLabel } from '@/lib/reverseGeocode';
import { splitStreetFromFullAddress } from '@/lib/propertyDisplay';
import {
  applyConstructionYearChange,
  applyFloorChange,
  applyRenovationYearChange,
  applyTotalFloorsChange,
  getFloorInputMax,
  getRenovationInputMin,
  validateDetailFields,
} from '@/lib/propertyDetailValidation';
import TbilisiDistrictSelector, { CITIES_WITH_DISTRICTS } from '@/components/TbilisiDistrictSelector';
import { PropertyRoomsBedroomsSelectors } from '@/components/PropertyRoomsBedroomsSelectors';
import {
  BALCONY_CUSTOM_MIN,
  BALCONY_PRESETS,
  BATHROOM_CUSTOM_MIN,
  BATHROOM_PRESETS,
  COUNT_THEME_CYAN,
  COUNT_THEME_ORANGE,
  COUNT_THEME_PURPLE,
  PropertyCountSelector,
} from '@/components/PropertyCountSelector';
import { PropertyVirtualTourFields } from '@/components/PropertyVirtualTourFields';
import { FormattedNumberInput } from '@/components/FormattedNumberInput';
import { formatNumberForDisplay } from '@/lib/formatNumberInput';
import type { Property } from '@/lib/types';

// საქართველოს რეგიონები
const GEORGIAN_REGIONS = [
  { value: 'tbilisi', key: 'region_tbilisi' },
  { value: 'adjara', key: 'region_adjara' },
  { value: 'imereti', key: 'region_imereti' },
  { value: 'kakheti', key: 'region_kakheti' },
  { value: 'shida_kartli', key: 'region_shida_kartli' },
  { value: 'kvemo_kartli', key: 'region_kvemo_kartli' },
  { value: 'samegrelo', key: 'region_samegrelo' },
  { value: 'guria', key: 'region_guria' },
  { value: 'racha', key: 'region_racha' },
  { value: 'mtskheta', key: 'region_mtskheta' },
  { value: 'samtskhe', key: 'region_samtskhe' },
  { value: 'abkhazia', key: 'region_abkhazia' }
];

// ქონების ტიპები იკონებით
const PROPERTY_TYPES = [
  { value: 'apartment', key: 'apartment', icon: '🏢' },
  { value: 'house', key: 'house', icon: '🏠' },
  { value: 'commercial', key: 'commercial', icon: '🏪' },
  { value: 'land', key: 'land', icon: '🌍' },
  { value: 'cottage', key: 'cottage', icon: '🏡' },
  { value: 'hotel', key: 'hotel', icon: '🏨' },
  { value: 'building', key: 'building', icon: '🏗️' },
  { value: 'warehouse', key: 'warehouse', icon: '📦' },
  { value: 'parking', key: 'parking', icon: '🚗' },
  { value: 'business', key: 'business', icon: '💼' },
];

// გარიგების ტიპები იკონებით
const DEAL_TYPES = [
  { value: 'sale', key: 'deal_sale', icon: '💰' },
  { value: 'rent', key: 'deal_rent', icon: '🔑' },
  { value: 'mortgage', key: 'deal_mortgage', icon: '🏦' },
];

// ქალაქი → რეგიონის ავტომატური მაპინგი
const CITY_TO_REGION: Record<string, string> = {
  'თბილისი': 'tbilisi',
  'ბათუმი': 'adjara', 'ქობულეთი': 'adjara', 'ხელვაჩაური': 'adjara',
  'ქუთაისი': 'imereti', 'ზესტაფონი': 'imereti', 'სამტრედია': 'imereti', 'წყალტუბო': 'imereti', 'ჭიათურა': 'imereti', 'საჩხერე': 'imereti', 'ტყიბული': 'imereti', 'ხონი': 'imereti', 'ვანი': 'imereti', 'ბაღდათი': 'imereti', 'თერჯოლა': 'imereti', 'ხარაგაული': 'imereti',
  'რუსთავი': 'kvemo_kartli', 'მარნეული': 'kvemo_kartli', 'გარდაბანი': 'kvemo_kartli', 'ბოლნისი': 'kvemo_kartli', 'თეთრიწყარო': 'kvemo_kartli', 'დმანისი': 'kvemo_kartli', 'წალკა': 'kvemo_kartli',
  'გორი': 'shida_kartli', 'ხაშური': 'shida_kartli', 'კასპი': 'shida_kartli', 'კარელი': 'shida_kartli',
  'თელავი': 'kakheti', 'გურჯაანი': 'kakheti', 'საგარეჯო': 'kakheti', 'სიღნაღი': 'kakheti', 'დედოფლისწყარო': 'kakheti', 'ლაგოდეხი': 'kakheti', 'ყვარელი': 'kakheti', 'ახმეტა': 'kakheti',
  'ზუგდიდი': 'samegrelo', 'ფოთი': 'samegrelo', 'სენაკი': 'samegrelo', 'მარტვილი': 'samegrelo', 'ხობი': 'samegrelo', 'წალენჯიხა': 'samegrelo', 'მესტია': 'samegrelo',
  'ოზურგეთი': 'guria', 'ლანჩხუთი': 'guria', 'ჩოხატაური': 'guria',
  'მცხეთა': 'mtskheta', 'დუშეთი': 'mtskheta', 'თიანეთი': 'mtskheta', 'ყაზბეგი': 'mtskheta',
  'ახალციხე': 'samtskhe', 'ბორჯომი': 'samtskhe', 'ადიგენი': 'samtskhe', 'ახალქალაქი': 'samtskhe', 'ნინოწმინდა': 'samtskhe', 'ასპინძა': 'samtskhe',
  'ამბროლაური': 'racha', 'ონი': 'racha', 'ცაგერი': 'racha', 'ლენტეხი': 'racha',
};

export default function EditPropertyPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const { user, profileLoaded } = useAuth();
  const isAdmin = profileLoaded && user?.role === 'admin';
  const id = params.id as string;

  const [hydrated, setHydrated] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyOwnerId, setPropertyOwnerId] = useState<string | null>(null);

  // ეტაპი
  const [currentStep, setCurrentStep] = useState(1);

  // ფორმის მონაცემები
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [priceCurrency, setPriceCurrency] = useState<'USD' | 'GEL'>('USD');
  const [priceType, setPriceType] = useState<'total' | 'per_sqm'>('total');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [region, setRegion] = useState('');
  const [tbilisiDistrict, setTbilisiDistrict] = useState('');
  const [tbilisiSubdistricts, setTbilisiSubdistricts] = useState<string[]>([]);
  const [sqm, setSqm] = useState('');
  const [houseSqm, setHouseSqm] = useState('');
  const [type, setType] = useState('');
  const [dealType, setDealType] = useState('');
  const [exteriorLink, setExteriorLink] = useState('');
  const [interiorLink, setInteriorLink] = useState('');
  const [tourLink, setTourLink] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [addressMapFill, setAddressMapFill] = useState({ key: 0, text: '' });
  const [cadastralCode, setCadastralCode] = useState('');
  const [cadastralHidden, setCadastralHidden] = useState(false);

  // ფოტოები
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [panoramaPhotos, setPanoramaPhotos] = useState<string[]>([]);
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);
  const [addingPhotos, setAddingPhotos] = useState(false);
  const addPhotosInputRef = useRef<HTMLInputElement | null>(null);

  // დეტალური ინფორმაცია
  const [roomCount, setRoomCount] = useState<number | null>(null);
  const [bedroomCount, setBedroomCount] = useState<number | null>(null);
  const [floor, setFloor] = useState('');
  const [totalFloors, setTotalFloors] = useState('');
  const [constructionYear, setConstructionYear] = useState('');
  const [renovationYear, setRenovationYear] = useState('');
  const [renovationStatus, setRenovationStatus] = useState('');
  const [buildingProject, setBuildingProject] = useState('');
  const [balcony, setBalcony] = useState<number>(0);
  const [loggia, setLoggia] = useState<number>(0);
  const [bathroom, setBathroom] = useState<number>(0);
  const [basement, setBasement] = useState(false);
  const [elevator, setElevator] = useState(false);
  const [furniture, setFurniture] = useState(false);
  const [garage, setGarage] = useState(false);
  const [centralHeating, setCentralHeating] = useState(false);
  const [naturalGas, setNaturalGas] = useState(false);
  const [storage, setStorage] = useState(false);
  const [internet, setInternet] = useState(false);
  const [electricity, setElectricity] = useState(false);
  const [water, setWater] = useState(false);
  const [security, setSecurity] = useState(false);
  const [airConditioner, setAirConditioner] = useState(false);
  const [fireplace, setFireplace] = useState(false);
  const [pool, setPool] = useState(false);
  const [garden, setGarden] = useState(false);
  const [terrace, setTerrace] = useState(false);
  const [isolatedKitchen, setIsolatedKitchen] = useState(false);
  const [heatingCooling, setHeatingCooling] = useState(false);

  // პირადი ჩანაწერი
  const [privateNotes, setPrivateNotes] = useState('');

  const [panoramaSaving, setPanoramaSaving] = useState(false);

  useEffect(() => setHydrated(true), []);

  // მონაცემების ჩატვირთვა
  useEffect(() => {
    if (!hydrated || !id) return;
    getProperty(id)
      .then((res) => {
        const p = res.property;
        const ownerRaw = p.userId as { _id?: string } | string | undefined;
        const ownerId =
          ownerRaw && typeof ownerRaw === 'object'
            ? String(ownerRaw._id || '')
            : ownerRaw
              ? String(ownerRaw)
              : '';
        setPropertyOwnerId(ownerId || null);
        setTitle(p.title);
        setDesc(p.desc);
        setPrice(String(p.price));
        setPriceCurrency(p.priceCurrency || 'USD');
        setPriceType(p.priceType || 'total');
        setCity(p.city || '');
        setStreet(p.street || '');
        if (p.street || p.city) {
          setAddressMapFill({
            key: 1,
            text: [p.street, p.city].filter(Boolean).join(', '),
          });
        }
        setRegion(p.region || '');
        setTbilisiDistrict((p as any).tbilisiDistrict || '');
        setTbilisiSubdistricts((p as any).tbilisiSubdistricts || []);
        setSqm(String(p.sqm || ''));
        setHouseSqm(String((p as Property).houseSqm || ''));
        setType(p.type);
        setDealType(p.dealType);
        setExteriorLink(p.exteriorLink || p.threeDLink || '');
        setInteriorLink(p.interiorLink || '');
        setTourLink(p.tourLink || '');
        setContactPhone(p.contact?.phone || '');
        setContactEmail(p.contact?.email || '');
        setLat(p.location.lat);
        setLng(p.location.lng);
        setExistingPhotos(p.photos || []);
        setPanoramaPhotos((p as Property).panoramaPhotos || []);
        setMainPhotoIndex((p as any).mainPhoto || 0);
        setCadastralCode((p as any).cadastralCode || '');
        setCadastralHidden(Boolean((p as any).cadastralHidden));
        // დეტალური ინფორმაცია
        const rawRooms = Number(p.rooms ?? (p as any).roomCount ?? 0);
        const rawBed = Number((p as any).bedrooms ?? 0);
        setRoomCount(rawRooms <= 0 ? null : rawRooms);
        setBedroomCount(rawBed <= 0 ? null : rawBed);
        const loadedTotalFloors = String((p as any).totalFloors || '');
        const loadedFloor = String((p as any).floor || '');
        const loadedConstructionYear = String((p as any).constructionYear || '');
        const loadedRenovationYear = String((p as any).renovationYear || '');
        setTotalFloors(loadedTotalFloors);
        setFloor(applyFloorChange(loadedFloor, loadedTotalFloors));
        setConstructionYear(loadedConstructionYear);
        setRenovationYear(applyRenovationYearChange(loadedRenovationYear, loadedConstructionYear));
        setRenovationStatus((p as any).renovationStatus || '');
        setBuildingProject((p as any).buildingProject || '');
        setBalcony((p as any).balcony || 0);
        setLoggia((p as any).loggia || 0);
        setBathroom((p as any).bathroom || 0);
        // amenities
        const am = (p as any).amenities || {};
        setBasement(!!am.basement);
        setElevator(!!am.elevator);
        setFurniture(!!am.furniture);
        setGarage(!!am.garage);
        setCentralHeating(!!am.centralHeating);
        setNaturalGas(!!am.naturalGas);
        setStorage(!!am.storage);
        setInternet(!!am.internet);
        setElectricity(!!am.electricity);
        setWater(!!am.water);
        setSecurity(!!am.security);
        setAirConditioner(!!am.airConditioner);
        setFireplace(!!am.fireplace);
        setPool(!!am.pool);
        setGarden(!!am.garden);
        setTerrace(!!am.terrace);
        setIsolatedKitchen(!!am.isolatedKitchen);
        setHeatingCooling(!!am.heatingCooling);
        // პირადი ჩანაწერი
        setPrivateNotes((p as any).privateNotes || '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setDataLoading(false));
  }, [hydrated, id]);

  const photoGridRef = useRef<HTMLDivElement>(null);
  const pendingFlipRef = useRef<Map<string, DOMRect> | null>(null);
  const photoLayoutKey = existingPhotos.join('|');

  const handlePhotoReorder = useCallback((from: number, to: number) => {
    if (from === to) return;
    if (photoGridRef.current) {
      pendingFlipRef.current = captureFlipPositions(photoGridRef.current);
    }
    setExistingPhotos((prev) => {
      const next = reorderArray(prev, from, to);
      setMainPhotoIndex((mi) => {
        const mainPhoto = prev[mi];
        if (!mainPhoto) return 0;
        const nextIndex = next.indexOf(mainPhoto);
        return nextIndex >= 0 ? nextIndex : 0;
      });
      return next;
    });
  }, []);

  const { getThumbDragProps, isDragging, draggingIndex } = usePhotoDragReorder(handlePhotoReorder);
  const draggingFlipKey =
    draggingIndex !== null && existingPhotos[draggingIndex]
      ? existingPhotos[draggingIndex]
      : null;

  // ეტაპების შემოწმება (იგივე რიგი, რაც ატვირთვაში)
  const isStep1Complete = dealType !== '' && type !== '';
  const isStep2Complete = lat !== null && lng !== null;
  const isStep3Complete = city !== '' && (city.toLowerCase() !== 'თბილისი' ? region !== '' : true);
  const isStep4Complete = title !== '' && price !== '';
  const isStep5Filled =
    roomCount !== null ||
    bedroomCount !== null ||
    floor !== '' ||
    balcony > 0 ||
    loggia > 0 ||
    bathroom > 0 ||
    constructionYear !== '' ||
    renovationYear !== '' ||
    renovationStatus !== '' ||
    basement ||
    elevator ||
    furniture ||
    garage ||
    centralHeating ||
    naturalGas ||
    internet ||
    electricity ||
    water ||
    terrace;
  const isStep5Complete = isStep5Filled;
  const isStep6Complete = existingPhotos.length > 0;
  const isStep7Complete = privateNotes.trim() !== '';

  const completedSteps = [
    isStep1Complete,
    isStep2Complete,
    isStep3Complete,
    isStep4Complete,
    isStep5Complete,
    isStep6Complete,
    isStep7Complete,
  ].filter(Boolean).length;

  if (!hydrated) {
    return <div className="flex items-center justify-center min-h-[400px] text-slate-500">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>;
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto mt-12 rounded-xl border border-slate-200 bg-white p-8 text-center">
        <div className="text-5xl mb-4">🔐</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">{t('auth_required')}</h2>
        <p className="text-slate-600">{t('auth_required_edit')}</p>
      </div>
    );
  }

  if (dataLoading) {
    return <div className="flex items-center justify-center min-h-[400px] text-slate-500">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>;
  }

  if (error && !title) {
    return <div className="text-sm text-red-600 p-4">{error}</div>;
  }

  const previewProps: Property[] =
    lat !== null && lng !== null
      ? [{
          _id: id,
          title: title || t('property'),
          desc: desc || '',
          price: Number(price || 0),
          city,
          region,
          location: { lat, lng },
          type: type as any || 'apartment',
          dealType: dealType as any || 'sale',
          photos: existingPhotos,
          exteriorLink,
          interiorLink,
          tourLink,
          contact: { phone: contactPhone, email: contactEmail }
        }]
      : [];

  const steps = [
    { num: 1, title: t('type_and_deal_step'), icon: '🏠', complete: isStep1Complete },
    { num: 2, title: t('map_marking'), icon: '🗺️', complete: isStep2Complete },
    { num: 3, title: t('location_step'), icon: '📍', complete: isStep3Complete },
    { num: 4, title: t('details_step'), icon: '📝', complete: isStep4Complete },
    { num: 5, title: t('detailed_info_step'), icon: '🔧', complete: isStep5Complete },
    { num: 6, title: t('photos_step'), icon: '📷', complete: isStep6Complete },
    { num: 7, title: t('private_notes_step'), icon: '🔒', complete: isStep7Complete },
  ];

  // ფოტოს წაშლა
  const handleDeletePhoto = (index: number) => {
    const removed = existingPhotos[index];
    const newPhotos = existingPhotos.filter((_, i) => i !== index);
    setExistingPhotos(newPhotos);
    if (removed) {
      setPanoramaPhotos((prev) => prev.filter((u) => u !== removed));
    }
    setMainPhotoIndex((prev) => adjustMainIndexAfterRemoval(prev, index));
  };

  const cleanPanoramaList = (list: string[], photos: string[]) =>
    list.filter((u) => photos.some((p) => p === u || normalizePhotoUrl(p) === normalizePhotoUrl(u)));

  const persistPanoramaPhotos = async (next: string[]) => {
    const clean = cleanPanoramaList(next, existingPhotos);
    setPanoramaSaving(true);
    try {
      const res = await updateProperty(id, {
        photos: existingPhotos,
        panoramaPhotos: clean,
      } as any);
      setPanoramaPhotos((res.property as Property).panoramaPhotos || clean);
    } finally {
      setPanoramaSaving(false);
    }
  };

  const togglePanoramaPhoto = async (photoUrl: string) => {
    const prev = panoramaPhotos;
    const wasOn = isPanoramaPhoto(photoUrl, prev);
    const next = wasOn
      ? prev.filter((u) => !isPanoramaPhoto(photoUrl, [u]))
      : [...prev.filter((u) => !isPanoramaPhoto(photoUrl, [u])), photoUrl];
    setPanoramaPhotos(next);
    try {
      await persistPanoramaPhotos(next);
    } catch (err: unknown) {
      setPanoramaPhotos(prev);
      setError(err instanceof Error ? err.message : t('error_save_failed'));
    }
  };

  const handleAddMorePhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_PROPERTY_PHOTOS - existingPhotos.length;
    if (remaining <= 0) {
      setError(t('max_photos_reached', { max: MAX_PROPERTY_PHOTOS }));
      return;
    }
    const list = Array.from(files).slice(0, remaining);
    setAddingPhotos(true);
    setError(null);
    try {
      const panoramaFlags = await Promise.all(list.map((f) => detectPanoramaFromFile(f)));
      const res = await addPropertyPhotos(id, list, panoramaFlags);
      setExistingPhotos(res.photos || []);
      setPanoramaPhotos(res.panoramaPhotos || []);
      setMainPhotoIndex((prev) => {
        const nextLen = (res.photos || []).length;
        return prev >= nextLen ? Math.max(0, nextLen - 1) : prev;
      });
      if (addPhotosInputRef.current) addPhotosInputRef.current.value = '';
    } catch (err: any) {
      setError(err.message || t('error_save_failed'));
    } finally {
      setAddingPhotos(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (lat === null || lng === null) throw new Error(t('error_select_location'));
      if (!type) throw new Error(t('error_select_type'));
      if (!dealType) throw new Error(t('error_select_deal_type'));
      // cadastralCode არასავალდებულოა

      const detailError = validateDetailFields(floor, totalFloors, constructionYear, renovationYear);
      if (detailError === 'floor_exceeds_total') throw new Error(t('error_floor_exceeds_total'));
      if (detailError === 'renovation_before_construction') {
        throw new Error(t('error_renovation_before_construction'));
      }

      const amenities = {
        basement, elevator, furniture, garage, centralHeating,
        naturalGas, storage, internet, electricity, water,
        security, airConditioner, fireplace, pool, garden,
        balcony: balcony > 0,
        terrace,
        isolatedKitchen, heatingCooling
      };

      const roomsPayload = roomCount === null ? 0 : roomCount;
      const bedroomsPayload = bedroomCount === null ? 0 : bedroomCount;

      await updateProperty(id, {
        title, desc,
        price: Number(price),
        priceCurrency, priceType,
        city, street: street.trim(), region,
        tbilisiDistrict, tbilisiSubdistricts,
        sqm: Number(sqm) || 0,
        houseSqm: Number(houseSqm) || 0,
        rooms: roomsPayload,
        bedrooms: bedroomsPayload,
        type: type as any,
        dealType: dealType as any,
        exteriorLink, interiorLink, tourLink,
        contactPhone, contactEmail,
        location: { lat, lng },
        photos: existingPhotos,
        panoramaPhotos: cleanPanoramaList(panoramaPhotos, existingPhotos),
        mainPhoto: mainPhotoIndex,
        floor: Number(floor) || 0,
        totalFloors: Number(totalFloors) || 0,
        constructionYear: constructionYear ? Number(constructionYear) : null,
        renovationYear: renovationYear ? Number(renovationYear) : null,
        renovationStatus,
        buildingProject,
        balcony, loggia, bathroom,
        amenities, cadastralCode, cadastralHidden,
        privateNotes,
      } as any);

      router.push(`/property/${id}`);
    } catch (err: any) {
      setError(err.message || t('error_save_failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-w-0">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <span className="text-3xl">✏️</span>
          {t('edit_property')}
        </h1>
        <p className="text-slate-600 mt-1">{t('edit_property_desc')}</p>
        {isAdmin && propertyOwnerId && user?.id && propertyOwnerId !== user.id && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            ადმინის რეჟიმი — რედაქტირებთ სხვა მომხმარებლის განცხადებას.
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* მთავარი ფორმა */}
        <div className="space-y-4">
          {/* ეტაპი 1: გარიგების და ქონების ტიპი */}
          <div className={`rounded-xl border-2 transition-all ${currentStep === 1 ? 'border-blue-500 shadow-lg' : isStep1Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}>
            <button onClick={() => setCurrentStep(prev => prev === 1 ? 0 : 1)} className="w-full text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isStep1Complete ? 'bg-green-500 text-white' : currentStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  {isStep1Complete ? '✓' : '1'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">🏠 {t('type_and_deal_step')}</h3>
                  <p className="text-sm text-slate-500">{t('type_and_deal_step_desc')}</p>
                </div>
                {isStep1Complete && (
                  <span className="ml-auto text-right text-sm text-green-600 font-medium">
                    {DEAL_TYPES.find((d) => d.value === dealType) ? t(DEAL_TYPES.find((d) => d.value === dealType)!.key) : ''}
                    {' · '}
                    {PROPERTY_TYPES.find((pt) => pt.value === type) ? t(PROPERTY_TYPES.find((pt) => pt.value === type)!.key) : ''}
                  </span>
                )}
              </div>
            </button>
            {currentStep === 1 && (
              <div className="mt-4 space-y-6">
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-slate-800">💼 {t('deal_type_select')}</h4>
                  <p className="mb-3 text-sm text-slate-500">{t('what_deal')}</p>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {DEAL_TYPES.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          if (dealType === item.value) {
                            setDealType('');
                            setType('');
                          } else {
                            setDealType(item.value);
                          }
                        }}
                        className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                          dealType === item.value
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-3xl mb-2">{item.icon}</div>
                        <div className="font-medium text-slate-700 text-sm">{t(item.key)}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {dealType !== '' && (
                  <div className="border-t border-slate-200 pt-6">
                    <h4 className="mb-3 text-sm font-semibold text-slate-800">🏠 {t('property_type_select')}</h4>
                    <p className="mb-3 text-sm text-slate-500">{t('what_selling')}</p>
                    <div className="grid grid-cols-3 gap-3">
                      {PROPERTY_TYPES.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setType(type === item.value ? '' : item.value)}
                          className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                            type === item.value
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="text-3xl mb-2">{item.icon}</div>
                          <div className="font-medium text-slate-700">{t(item.key)}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {isStep1Complete && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    {t('next_step')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ეტაპი 2: რუკაზე მონიშვნა */}
          <div className={`rounded-xl border-2 transition-all ${currentStep === 2 ? 'border-blue-500 shadow-lg' : isStep2Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}>
            <button onClick={() => setCurrentStep(prev => prev === 2 ? 0 : 2)} className="w-full text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isStep2Complete ? 'bg-green-500 text-white' : currentStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  {isStep2Complete ? '✓' : '2'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">🗺️ {t('map_marking')}</h3>
                  <p className="text-sm text-slate-500">{t('specify_exact_location')}</p>
                </div>
                {isStep2Complete && <span className="ml-auto text-green-600 font-medium">📍 {t('map_marked')}</span>}
              </div>
            </button>
            {currentStep === 2 && (
              <div className="space-y-4 mt-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <label className="block text-sm font-medium text-slate-700 mb-2">📋 {t('cadastral_code')} <span className="text-slate-400 text-xs">({t('cadastral_optional')})</span></label>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder={t('cadastral_placeholder')}
                    value={cadastralCode}
                    onChange={(e) => setCadastralCode(e.target.value)}
                  />
                  <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={cadastralHidden}
                      onChange={(e) => setCadastralHidden(e.target.checked)}
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-800">{t('cadastral_hide_label')}</span>
                      <span className="mt-1 block text-xs text-slate-500">{t('cadastral_hide_hint')}</span>
                    </span>
                  </label>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-medium text-slate-700 mb-2">🔍 {t('address_search')}</div>
                  <AddressSearch
                    mapFillFromPick={addressMapFill}
                    placeholder={t('address_search_placeholder')}
                    onSelect={(searchLat, searchLng, address) => {
                      setLat(searchLat);
                      setLng(searchLng);
                      let nextCity = city;
                      if (!city && address) {
                        const parts = address.split(',').map((p) => p.trim());
                        if (parts.length > 1) {
                          nextCity = parts[parts.length - 1];
                          setCity(nextCity);
                        }
                      }
                      setStreet(splitStreetFromFullAddress(address, nextCity));
                      setAddressMapFill((s) => ({ key: s.key + 1, text: address }));
                    }}
                  />
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height: '350px' }}>
                  <MapView
                    properties={previewProps}
                    selectedLocation={lat !== null && lng !== null ? { lat, lng } : null}
                    center={lat !== null && lng !== null ? { lat, lng } : undefined}
                    zoom={lat !== null && lng !== null ? 17 : undefined}
                    onPick={async (a, b) => {
                      setLat(a);
                      setLng(b);
                      const label = await reverseGeocodeLabel(a, b);
                      if (label) {
                        setStreet(splitStreetFromFullAddress(label, city));
                        setAddressMapFill((s) => ({ key: s.key + 1, text: label }));
                      }
                    }}
                  />
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <span className="text-2xl">💡</span>
                  <div className="text-sm text-blue-700">{t('map_hint')}</div>
                </div>
                {lat !== null && lng !== null && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <span className="text-green-700 text-sm">✅ {t('coordinates_label')}: {lat.toFixed(5)}, {lng.toFixed(5)}</span>
                  </div>
                )}
                {isStep2Complete && (
                  <button onClick={() => setCurrentStep(3)} className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    {t('next_step')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ეტაპი 3: მდებარეობა */}
          <div className={`rounded-xl border-2 transition-all ${currentStep === 3 ? 'border-blue-500 shadow-lg' : isStep3Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}>
            <button onClick={() => setCurrentStep(prev => prev === 3 ? 0 : 3)} className="w-full text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isStep3Complete ? 'bg-green-500 text-white' : currentStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  {isStep3Complete ? '✓' : '3'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">📍 {t('location_step')}</h3>
                  <p className="text-sm text-slate-500">{t('where_located')}</p>
                </div>
                {isStep3Complete && <span className="ml-auto text-green-600 font-medium">{city}{tbilisiDistrict && `, ${tbilisiDistrict}`}</span>}
              </div>
            </button>
            {currentStep === 3 && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">🏙️ {t('city_label')}</label>
                    <CityCombobox
                      value={city}
                      onChange={(newCity) => {
                        setCity(newCity);
                        const autoRegion = CITY_TO_REGION[newCity];
                        if (autoRegion) setRegion(autoRegion);
                        if (newCity.toLowerCase() !== 'თბილისი') {
                          setTbilisiDistrict('');
                          setTbilisiSubdistricts([]);
                        } else {
                          setRegion('tbilisi');
                        }
                      }}
                    />
                  </div>
                  {city.toLowerCase() !== 'თბილისი' ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">🗺️ {t('region_label')}</label>
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                      >
                        <option value="">{t('choose_region')}</option>
                        {GEORGIAN_REGIONS.map((r) => (
                          <option key={r.value} value={r.value}>{t(r.key)}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-end">
                      <div className="w-full rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-blue-700">
                        📍 {t('region_label')}: {t('region_tbilisi')}
                      </div>
                    </div>
                  )}
                </div>
                {CITIES_WITH_DISTRICTS.includes(city) && (
                  <TbilisiDistrictSelector
                    city={city}
                    selectedDistrict={tbilisiDistrict}
                    selectedSubdistricts={tbilisiSubdistricts}
                    onDistrictChange={setTbilisiDistrict}
                    onSubdistrictsChange={setTbilisiSubdistricts}
                  />
                )}
                {isStep3Complete && (
                  <button onClick={() => setCurrentStep(4)} className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    {t('next_step')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ეტაპი 4: ძირითადი ინფორმაცია */}
          <div className={`rounded-xl border-2 transition-all ${currentStep === 4 ? 'border-blue-500 shadow-lg' : isStep4Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}>
            <button onClick={() => setCurrentStep(prev => prev === 4 ? 0 : 4)} className="w-full text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isStep4Complete ? 'bg-green-500 text-white' : currentStep === 4 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  {isStep4Complete ? '✓' : '4'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">📝 {t('details_step')}</h3>
                  <p className="text-sm text-slate-500">{t('details_desc')}</p>
                </div>
                {isStep4Complete && (
                  <span className="ml-auto text-green-600 font-medium">
                    {formatNumberForDisplay(price)} {priceCurrency === 'USD' ? '$' : '₾'}
                    {priceType === 'per_sqm' ? `/${t('filter_per_sqm')}` : ''}
                    {houseSqm
                      ? ` • ${t('house_area_detail')}: ${formatNumberForDisplay(houseSqm)} ${t('sqm_unit_short')}`
                      : ''}
                    {sqm ? ` • ${formatNumberForDisplay(sqm)} ${t('sqm_unit_short')}` : ''}
                  </span>
                )}
              </div>
            </button>
            {currentStep === 4 && (
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">✏️ {t('title_label_icon')}</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder={t('title_example')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">📄 {t('desc_label_icon')}</label>
                  <textarea
                    className="w-full min-h-[120px] rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder={t('desc_placeholder')}
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">💵 {t('price_label_icon')}</label>
                    <div className="flex gap-2">
                      <FormattedNumberInput
                        className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        placeholder="0"
                        value={price}
                        onChange={setPrice}
                      />
                      <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                        <button type="button" onClick={() => setPriceCurrency('USD')}
                          className={`px-4 py-3 font-medium transition-colors ${priceCurrency === 'USD' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>$</button>
                        <button type="button" onClick={() => setPriceCurrency('GEL')}
                          className={`px-4 py-3 font-medium transition-colors ${priceCurrency === 'GEL' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>₾</button>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button type="button" onClick={() => setPriceType('total')}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${priceType === 'total' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{t('total_price')}</button>
                      <button type="button" onClick={() => setPriceType('per_sqm')}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${priceType === 'per_sqm' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{t('price_per_sqm')}</button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        🏠 {t('house_sqm_label')}{' '}
                        <span className="font-normal text-slate-400">({t('cadastral_optional')})</span>
                      </label>
                      <FormattedNumberInput
                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        placeholder="0"
                        value={houseSqm}
                        onChange={setHouseSqm}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        📐 {t('area_sqm')}{' '}
                        <span className="font-normal text-slate-400">({t('cadastral_optional')})</span>
                      </label>
                      <FormattedNumberInput
                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        placeholder="0"
                        value={sqm}
                        onChange={setSqm}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">📞 {t('contact_phone')}</label>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="+995 ..."
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">📧 {t('contact_email')}</label>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="email@example.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                  </div>
                </div>
                <PropertyVirtualTourFields
                  exteriorLink={exteriorLink}
                  interiorLink={interiorLink}
                  tourLink={tourLink}
                  onExteriorChange={setExteriorLink}
                  onInteriorChange={setInteriorLink}
                  onTourChange={setTourLink}
                />
                {isStep4Complete && (
                  <button onClick={() => setCurrentStep(5)} className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    {t('next_step')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ეტაპი 5: დეტალური ინფორმაცია */}
          <div className={`rounded-xl border-2 transition-all ${currentStep === 5 ? 'border-blue-500 shadow-lg' : isStep5Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}>
            <button onClick={() => setCurrentStep(prev => prev === 5 ? 0 : 5)} className="w-full text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isStep5Complete ? 'bg-green-500 text-white' : currentStep === 5 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  {isStep5Complete ? '✓' : '5'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">🔧 {t('detailed_info_header')}</h3>
                  <p className="text-sm text-slate-500">{t('detailed_info_desc')}</p>
                </div>
                {roomCount !== null && (
                  <span className="ml-auto text-green-600 font-medium">
                    {roomCount} {t('rooms_short')}
                    {bedroomCount !== null ? `, ${bedroomCount} ${t('bedrooms_short')}` : ''}
                  </span>
                )}
              </div>
            </button>
            {currentStep === 5 && (
              <div className="space-y-6 mt-4">
                <PropertyRoomsBedroomsSelectors
                  roomCount={roomCount}
                  setRoomCount={setRoomCount}
                  bedroomCount={bedroomCount}
                  setBedroomCount={setBedroomCount}
                />

                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      🏢 {t('floor_label')}{' '}
                      <span className="font-normal text-slate-400">({t('cadastral_optional')})</span>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">{t('which_floor')}</label>
                        <input
                          type="number"
                          min={1}
                          max={getFloorInputMax(totalFloors)}
                          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          placeholder={t('floor_example')}
                          value={floor}
                          onChange={(e) => setFloor(applyFloorChange(e.target.value, totalFloors))}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">{t('total_floors')}</label>
                        <input
                          type="number"
                          min={1}
                          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          placeholder={t('total_floors_example')}
                          value={totalFloors}
                          onChange={(e) => {
                            const next = applyTotalFloorsChange(e.target.value, floor);
                            setTotalFloors(next.totalFloors);
                            setFloor(next.floor);
                          }}
                        />
                      </div>
                    </div>
                    {getFloorInputMax(totalFloors) !== undefined && (
                      <p className="mt-2 text-xs text-slate-500">
                        {t('floor_max_hint', { max: getFloorInputMax(totalFloors) })}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      🏠 {t('building_project_label')}{' '}
                      <span className="font-normal text-slate-400">({t('cadastral_optional')})</span>
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {[
                        { value: 'new_build', label: t('project_new_build') },
                        { value: 'czech', label: t('project_czech') },
                        { value: 'khrushchev', label: t('project_khrushchev') },
                        { value: 'urban', label: t('project_urban') },
                        { value: 'lvov', label: t('project_lvov') },
                        { value: 'budapest', label: t('project_budapest') },
                        { value: 'kiev', label: t('project_kiev') },
                        { value: 'moscow', label: t('project_moscow') },
                        { value: 'tbilisi', label: t('project_tbilisi') },
                        { value: 'other', label: t('project_other') },
                      ].map((proj) => (
                        <button
                          key={proj.value}
                          type="button"
                          onClick={() => setBuildingProject(buildingProject === proj.value ? '' : proj.value)}
                          className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                            buildingProject === proj.value
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                          }`}
                        >
                          {proj.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      📅 {t('construction_renovation_years_label')}{' '}
                      <span className="font-normal text-slate-400">({t('cadastral_optional')})</span>
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">{t('construction_year')}</label>
                        <input
                          type="number"
                          min={1800}
                          max={2100}
                          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          placeholder="მაგ: 2008"
                          value={constructionYear}
                          onChange={(e) => {
                            const next = applyConstructionYearChange(e.target.value, renovationYear);
                            setConstructionYear(next.constructionYear);
                            setRenovationYear(next.renovationYear);
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">{t('renovation_year')}</label>
                        <input
                          type="number"
                          min={getRenovationInputMin(constructionYear) ?? 1800}
                          max={2100}
                          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          placeholder="მაგ: 2021"
                          value={renovationYear}
                          onChange={(e) => setRenovationYear(e.target.value)}
                          onBlur={() =>
                            setRenovationYear(applyRenovationYearChange(renovationYear, constructionYear))
                          }
                        />
                      </div>
                    </div>
                    {getRenovationInputMin(constructionYear) !== undefined && (
                      <p className="mt-2 text-xs text-slate-500">
                        {t('renovation_min_hint', { min: getRenovationInputMin(constructionYear) })}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      🧱 {t('filter_renovation')}{' '}
                      <span className="font-normal text-slate-400">({t('cadastral_optional')})</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'green_frame', label: t('renovation_green_frame') },
                        { value: 'white_frame', label: t('renovation_white_frame') },
                        { value: 'black_frame', label: t('renovation_black_frame') },
                        { value: 'renovated', label: t('renovation_renovated') },
                        { value: 'to_renovate', label: t('renovation_to_renovate') },
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setRenovationStatus(renovationStatus === item.value ? '' : item.value)}
                          className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                            renovationStatus === item.value
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>

                {/* აივანი და ლოჯია */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">🌅 {t('balcony')}</label>
                    <PropertyCountSelector
                      value={balcony}
                      onChange={setBalcony}
                      presets={BALCONY_PRESETS}
                      customMin={BALCONY_CUSTOM_MIN}
                      ariaLabel={t('balcony_count_custom') || t('balcony')}
                      theme={COUNT_THEME_ORANGE}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">🏠 {t('loggia')}</label>
                    <PropertyCountSelector
                      value={loggia}
                      onChange={setLoggia}
                      presets={BALCONY_PRESETS}
                      customMin={BALCONY_CUSTOM_MIN}
                      ariaLabel={t('loggia_count_custom') || t('loggia')}
                      theme={COUNT_THEME_PURPLE}
                    />
                  </div>
                </div>

                {/* სველი წერტილები */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">🚿 {t('bathroom_label')}</label>
                  <PropertyCountSelector
                    value={bathroom}
                    onChange={setBathroom}
                    presets={BATHROOM_PRESETS}
                    customMin={BATHROOM_CUSTOM_MIN}
                    ariaLabel={t('bathroom_count_custom') || t('bathroom_label')}
                    theme={COUNT_THEME_CYAN}
                  />
                </div>

                {/* კომფორტი */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">✨ {t('additional_comfort')}</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {[
                      { key: 'basement', label: t('amenity_basement'), icon: '🏚️', state: basement, setter: setBasement },
                      { key: 'elevator', label: t('amenity_elevator'), icon: '🛗', state: elevator, setter: setElevator },
                      { key: 'furniture', label: t('amenity_furniture'), icon: '🪑', state: furniture, setter: setFurniture },
                      { key: 'garage', label: t('amenity_garage'), icon: '🚗', state: garage, setter: setGarage },
                      { key: 'storage', label: t('amenity_storage'), icon: '📦', state: storage, setter: setStorage },
                      { key: 'airConditioner', label: t('amenity_airConditioner'), icon: '❄️', state: airConditioner, setter: setAirConditioner },
                      { key: 'fireplace', label: t('amenity_fireplace'), icon: '🔥', state: fireplace, setter: setFireplace },
                      { key: 'pool', label: t('amenity_pool'), icon: '🏊', state: pool, setter: setPool },
                      { key: 'garden', label: t('amenity_garden'), icon: '🌳', state: garden, setter: setGarden },
                      { key: 'terrace', label: t('terrace'), icon: '🏞️', state: terrace, setter: setTerrace },
                      { key: 'security', label: t('amenity_security'), icon: '🔒', state: security, setter: setSecurity },
                      { key: 'isolatedKitchen', label: t('amenity_isolatedKitchen'), icon: '🍳', state: isolatedKitchen, setter: setIsolatedKitchen },
                      { key: 'heatingCooling', label: t('amenity_heatingCooling'), icon: '🌡️', state: heatingCooling, setter: setHeatingCooling },
                    ].map((item) => (
                      <button key={item.key} type="button" onClick={() => item.setter(!item.state)}
                        className={`p-3 rounded-xl border-2 transition-all ${item.state ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                        <div className="text-2xl mb-1">{item.icon}</div>
                        <div className="text-xs font-medium">{item.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* კომუნიკაციები */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">⚡ {t('communications')}</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {[
                      { key: 'centralHeating', label: t('amenity_centralHeating'), icon: '🌡️', state: centralHeating, setter: setCentralHeating },
                      { key: 'naturalGas', label: t('amenity_naturalGas'), icon: '🔥', state: naturalGas, setter: setNaturalGas },
                      { key: 'internet', label: t('amenity_internet'), icon: '📶', state: internet, setter: setInternet },
                      { key: 'electricity', label: t('amenity_electricity'), icon: '💡', state: electricity, setter: setElectricity },
                      { key: 'water', label: t('amenity_water'), icon: '💧', state: water, setter: setWater },
                    ].map((item) => (
                      <button key={item.key} type="button" onClick={() => item.setter(!item.state)}
                        className={`p-3 rounded-xl border-2 transition-all ${item.state ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                        <div className="text-2xl mb-1">{item.icon}</div>
                        <div className="text-xs font-medium">{item.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={() => setCurrentStep(6)} className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  {t('next_step')}
                </button>
              </div>
            )}
          </div>

          {/* ეტაპი 6: ფოტოები */}
          <div className={`rounded-xl border-2 transition-all ${currentStep === 6 ? 'border-blue-500 shadow-lg' : isStep6Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}>
            <button onClick={() => setCurrentStep(prev => prev === 6 ? 0 : 6)} className="w-full text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isStep6Complete ? 'bg-green-500 text-white' : currentStep === 6 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  {isStep6Complete ? '✓' : '6'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">📷 {t('photos_step')}</h3>
                  <p className="text-sm text-slate-500">{t('manage_existing_photos')}</p>
                </div>
                {isStep6Complete && <span className="ml-auto text-green-600 font-medium">{existingPhotos.length} {t('photos_count')}</span>}
              </div>
            </button>
            {currentStep === 6 && (
              <div className="space-y-4 mt-4">
                {existingPhotos.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">📸 {existingPhotos.length} {t('photos_count')}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={addPhotosInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleAddMorePhotos(e.target.files)}
                      />
                      <button
                        type="button"
                        disabled={addingPhotos || existingPhotos.length >= MAX_PROPERTY_PHOTOS}
                        onClick={() => addPhotosInputRef.current?.click()}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          addingPhotos || existingPhotos.length >= MAX_PROPERTY_PHOTOS
                            ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {addingPhotos ? t('saving') : `+ ${t('add_new_photos')}`}
                      </button>
                      <div className="text-xs text-slate-500">
                        {t('choose_or_drop_photos')} ({existingPhotos.length}/{MAX_PROPERTY_PHOTOS})
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      💡 {t('click_main_photo')} · {t('photo_drag_reorder_hint')} · {t('photo_360_toggle_hint')}
                      {panoramaSaving ? ` (${t('saving')}…)` : ''}
                    </p>
                    <PhotoSortableGrid
                      className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3"
                      layoutKey={photoLayoutKey}
                      gridRef={photoGridRef}
                      pendingFlipRef={pendingFlipRef}
                      draggingFlipKey={draggingFlipKey}
                    >
                      {existingPhotos.map((photo, index) => {
                        const is360 = isPanoramaPhoto(photo, panoramaPhotos);
                        return (
                        <div
                          key={photo}
                          data-flip-key={photo}
                          {...getThumbDragProps(index)}
                          className={`relative group aspect-square cursor-grab active:cursor-grabbing ${
                            index === mainPhotoIndex ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                          } ${isDragging(index) ? 'z-20 scale-[1.03] opacity-90 ring-2 ring-amber-400 ring-offset-1' : ''}`}
                          onClick={() => setMainPhotoIndex(index)}
                        >
                          <span className="absolute left-1 top-1 z-10 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {index + 1}
                          </span>
                          <span
                            className="absolute bottom-1 right-1 z-10 rounded bg-black/40 px-1 text-[10px] text-white opacity-80"
                            aria-hidden
                          >
                            ⋮⋮
                          </span>
                          <img
                            src={resolveImageUrl(photo)}
                            alt={`${t('photo')} ${index + 1}`}
                            className={`pointer-events-none h-full w-full rounded-lg border border-slate-200 ${
                              is360 ? 'object-contain bg-slate-900' : 'object-cover'
                            }`}
                            draggable={false}
                          />
                          <div className="absolute right-1 top-1 z-10 flex flex-col items-end gap-0.5">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); togglePanoramaPhoto(photo); }}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white shadow transition-colors ${
                                is360 ? 'bg-blue-600' : 'bg-slate-600/90 hover:bg-slate-700'
                              }`}
                              title={t('photo_360_toggle')}
                            >
                              360°
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeletePhoto(index); }}
                              className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                            >
                              ✕
                            </button>
                          </div>
                          {index === mainPhotoIndex && (
                            <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
                              ⭐ {t('main_photo')}
                            </span>
                          )}
                        </div>
                      );
                      })}
                    </PhotoSortableGrid>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center">
                    <div className="text-5xl mb-3">📸</div>
                    <p className="text-slate-500">{t('no_photos')}</p>
                    <div className="mt-4 flex justify-center">
                      <input
                        ref={addPhotosInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleAddMorePhotos(e.target.files)}
                      />
                      <button
                        type="button"
                        disabled={addingPhotos}
                        onClick={() => addPhotosInputRef.current?.click()}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                          addingPhotos
                            ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {addingPhotos ? t('saving') : t('add_photos')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ეტაპი 7: პირადი ჩანაწერი */}
          <div className={`rounded-xl border-2 transition-all ${currentStep === 7 ? 'border-blue-500 shadow-lg' : isStep7Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}>
            <button 
              onClick={() => setCurrentStep(prev => prev === 7 ? 0 : 7)}
              className="w-full text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isStep7Complete ? 'bg-green-500 text-white' : currentStep === 7 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  {isStep7Complete ? '✓' : '7'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">🔒 {t('private_notes_header')}</h3>
                  <p className="text-sm text-slate-500">{t('private_notes_desc')}</p>
                </div>
              </div>
            </button>

            {currentStep === 7 && (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  ⚠️ {t('private_notes_warning')}
                </div>
                <textarea
                  value={privateNotes}
                  onChange={e => setPrivateNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('private_notes_placeholder')}
                  maxLength={5000}
                />
                <div className="text-xs text-slate-400 text-right">{privateNotes.length}/5000</div>
              </div>
            )}
          </div>

          {/* შეცდომა და შენახვის ღილაკი */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
              ⚠️ {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              className={`flex-1 py-4 rounded-xl text-lg font-bold transition-all ${
                completedSteps >= 4
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              }`}
              disabled={saving || completedSteps < 4}
              onClick={handleSave}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {t('saving')}
                </span>
              ) : (
                <span>💾 {t('save_changes')}</span>
              )}
            </button>
            <button
              className="px-6 py-4 rounded-xl text-lg font-medium border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              onClick={() => router.push(`/property/${id}`)}
            >
              {t('cancel')}
            </button>
          </div>
        </div>

        {/* მარჯვენა პანელი - პროგრესი */}
        <div className="lg:sticky lg:top-4 h-fit">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              📋 {t('edit_progress')}
            </h3>

            {/* პროგრეს ბარი */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600">{t('completed_label')}</span>
                <span className="font-bold text-blue-600">{completedSteps}/7</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                  style={{ width: `${(completedSteps / 7) * 100}%` }}
                />
              </div>
            </div>

            {/* ეტაპების სია */}
            <div className="space-y-3">
              {steps.map((step) => (
                <button
                  key={step.num}
                  onClick={() => setCurrentStep(step.num)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                    currentStep === step.num
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : step.complete
                      ? 'bg-green-50 border border-green-200 hover:bg-green-100'
                      : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step.complete ? 'bg-green-500 text-white' : currentStep === step.num ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'
                  }`}>
                    {step.complete ? '✓' : step.num}
                  </div>
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${step.complete ? 'text-green-700' : 'text-slate-700'}`}>
                      {step.icon} {step.title}
                    </div>
                  </div>
                  {step.complete && <span className="text-green-500">✅</span>}
                </button>
              ))}
            </div>

            {/* შეჯამება */}
            {completedSteps > 0 && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">📝 {t('filled_summary')}:</h4>
                <div className="space-y-2 text-sm">
                  {type && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>{PROPERTY_TYPES.find(pt => pt.value === type)?.icon}</span>
                      <span>{(() => { const pt = PROPERTY_TYPES.find(pt => pt.value === type); return pt ? t(pt.key) : ''; })()}</span>
                    </div>
                  )}
                  {dealType && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>{DEAL_TYPES.find(d => d.value === dealType)?.icon}</span>
                      <span>{(() => { const dt = DEAL_TYPES.find(d => d.value === dealType); return dt ? t(dt.key) : ''; })()}</span>
                    </div>
                  )}
                  {lat !== null && lng !== null && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>🗺️</span>
                      <span>{t('location_marked')}</span>
                    </div>
                  )}
                  {city && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>📍</span>
                      <span>{city}{tbilisiDistrict && `, ${tbilisiDistrict}`}</span>
                    </div>
                  )}
                  {price && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>💵</span>
                      <span>
                        {formatNumberForDisplay(price)} {priceCurrency === 'USD' ? '$' : '₾'}
                        {priceType === 'per_sqm' ? `/${t('filter_per_sqm')}` : ''}
                      </span>
                    </div>
                  )}
                  {houseSqm && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>🏠</span>
                      <span>
                        {t('house_area_detail')}: {formatNumberForDisplay(houseSqm)} {t('sqm_unit_short')}
                      </span>
                    </div>
                  )}
                  {sqm && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>📐</span>
                      <span>
                        {formatNumberForDisplay(sqm)} {t('sqm_unit_short')}
                      </span>
                    </div>
                  )}
                  {existingPhotos.length > 0 && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>📷</span>
                      <span>{existingPhotos.length} {t('photos_count')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
