'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/components/AuthProvider';
import { isAdminRole, isAgentRole } from '@/lib/userRoles';
import { getPropertyForEdit, updateProperty, discardPropertyEditDraft, resolveImageUrl } from '@/lib/api';
import { uploadPropertyPhotosInBatches } from '@/lib/propertyPhotoUpload';
import { detectPanoramaFlags, isPanoramaPhoto, normalizePhotoUrl } from '@/lib/panorama';
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
import { mergeParsedLocation, resolveLocationFromCoords, resolveLocationFromSearchPick } from '@/lib/mapLocationFromGeocode';
import { splitStreetFromFullAddress } from '@/lib/propertyDisplay';
import {
  applyConstructionYearChange,
  applyFloorChange,
  applyRenovationYearChange,
  getRenovationInputMin,
  validateDetailFields,
} from '@/lib/propertyDetailValidation';
import TbilisiDistrictSelector, { CITIES_WITH_DISTRICTS } from '@/components/TbilisiDistrictSelector';
import { PropertyRoomsBedroomsSelectors } from '@/components/PropertyRoomsBedroomsSelectors';
import { PropertyFloorFields } from '@/components/PropertyFloorFields';
import { PropertyLandStatusFields } from '@/components/PropertyLandStatusFields';
import { isLandType } from '@/lib/propertyTypeUi';
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
import { LinkedPriceInputs } from '@/components/LinkedPriceInputs';
import { formatNumberForDisplay } from '@/lib/formatNumberInput';
import type { Property } from '@/lib/types';
import { scheduleScrollFormStepIntoView } from '@/lib/scrollFormStep';

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
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const { user, profileLoaded } = useAuth();
  const isAdmin = profileLoaded && isAdminRole(user?.role);
  const id = params.id as string;

  const [hydrated, setHydrated] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyOwnerId, setPropertyOwnerId] = useState<string | null>(null);

  // ეტაპი
  const [currentStep, setCurrentStep] = useState(1);
  const stepCardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const scrollAfterStepChangeRef = useRef(false);

  const goToStep = useCallback((step: number) => {
    scrollAfterStepChangeRef.current = step >= 1;
    setCurrentStep(step);
  }, []);

  const toggleStep = useCallback((step: number) => {
    setCurrentStep((prev) => {
      if (prev === step) {
        scrollAfterStepChangeRef.current = false;
        return 0;
      }
      scrollAfterStepChangeRef.current = true;
      return step;
    });
  }, []);

  useLayoutEffect(() => {
    if (currentStep < 1 || !scrollAfterStepChangeRef.current) return;
    scrollAfterStepChangeRef.current = false;
    return scheduleScrollFormStepIntoView(stepCardRefs.current[currentStep]);
  }, [currentStep]);

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
  const [defaultMediaView, setDefaultMediaView] = useState<
    'exterior' | 'interior' | 'tour' | 'photos'
  >('exterior');
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
  const [photoUploadProgress, setPhotoUploadProgress] = useState({ done: 0, total: 0 });
  const addPhotosInputRef = useRef<HTMLInputElement | null>(null);

  // დეტალური ინფორმაცია
  const [roomCount, setRoomCount] = useState<number | null>(null);
  const [bedroomCount, setBedroomCount] = useState<number | null>(null);
  const [floor, setFloor] = useState('');
  const [totalFloors, setTotalFloors] = useState('');
  const [constructionYear, setConstructionYear] = useState('');
  const [renovationYear, setRenovationYear] = useState('');
  const [renovationStatus, setRenovationStatus] = useState('');
  const [buildingStatus, setBuildingStatus] = useState('');
  const [buildingProject, setBuildingProject] = useState('');
  const [landStatus, setLandStatus] = useState('');
  const [balcony, setBalcony] = useState<number>(0);
  const [loggia, setLoggia] = useState<number>(0);
  const [bathroom, setBathroom] = useState<number>(0);
  const [basement, setBasement] = useState(false);
  const [attic, setAttic] = useState(false);
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
  const [brokerListingMode, setBrokerListingMode] = useState<
    'public' | 'unlisted' | 'private' | 'sold'
  >('public');

  const [panoramaSaving, setPanoramaSaving] = useState(false);

  useEffect(() => setHydrated(true), []);

  // მონაცემების ჩატვირთვა
  useEffect(() => {
    if (!hydrated || !profileLoaded) return;
    if (!id) {
      setDataLoading(false);
      setError('განცხადების ID ვერ მოიძებნა');
      return;
    }
    if (!user) {
      setDataLoading(false);
      return;
    }

    let cancelled = false;
    setDataLoading(true);
    setError(null);

    getPropertyForEdit(id)
      .then((res) => {
        if (cancelled) return;
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
        setDefaultMediaView(
          p.defaultMediaView === 'interior' ||
            p.defaultMediaView === 'tour' ||
            p.defaultMediaView === 'photos' ||
            p.defaultMediaView === 'exterior'
            ? p.defaultMediaView
            : 'exterior'
        );
        setContactPhone(p.contact?.phone || '');
        setContactEmail(p.contact?.email || '');
        const loc = p.location;
        setLat(loc?.lat ?? null);
        setLng(loc?.lng ?? null);
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
        setBuildingStatus((p as any).buildingStatus || '');
        setBuildingProject((p as any).buildingProject || '');
        setLandStatus((p as any).landStatus || '');
        setBalcony((p as any).balcony || 0);
        setLoggia((p as any).loggia || 0);
        setBathroom((p as any).bathroom || 0);
        // amenities
        const am = (p as any).amenities || {};
        setBasement(!!am.basement);
        setAttic(!!am.attic);
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
        if (p.status === 'sold') {
          setBrokerListingMode('sold');
        } else {
          const vis = p.listingVisibility || 'public';
          setBrokerListingMode(
            vis === 'unlisted' || vis === 'private' || vis === 'public' ? vis : 'public'
          );
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, profileLoaded, id, user]);

  const photoGridRef = useRef<HTMLDivElement>(null);
  const pendingFlipRef = useRef<Map<string, DOMRect> | null>(null);
  const existingPhotosRef = useRef(existingPhotos);
  const panoramaPhotosRef = useRef(panoramaPhotos);
  const mainPhotoIndexRef = useRef(mainPhotoIndex);
  const photosPersistRef = useRef<Promise<void> | null>(null);
  const photoPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  existingPhotosRef.current = existingPhotos;
  panoramaPhotosRef.current = panoramaPhotos;
  mainPhotoIndexRef.current = mainPhotoIndex;

  const photoLayoutKey = existingPhotos.join('|');

  const cleanPanoramaList = (list: string[], photos: string[]) =>
    list.filter((u) => photos.some((p) => p === u || normalizePhotoUrl(p) === normalizePhotoUrl(u)));

  const runPersistPhotosDraft = useCallback(async () => {
    const nextPhotos = existingPhotosRef.current;
    const nextPanorama = cleanPanoramaList(panoramaPhotosRef.current, nextPhotos);
    const nextMain = mainPhotoIndexRef.current;

    const task = (async () => {
      const res = await updateProperty(
        id,
        {
          photos: nextPhotos,
          panoramaPhotos: nextPanorama,
          mainPhoto: nextMain,
        },
        { draft: true }
      );
      const p = res.property;
      const savedPhotos = p.photos || nextPhotos;
      const savedPanorama = (p as Property).panoramaPhotos || nextPanorama;
      const savedMain = (p as any).mainPhoto ?? nextMain;
      setExistingPhotos(savedPhotos);
      setPanoramaPhotos(savedPanorama);
      setMainPhotoIndex(savedMain);
      existingPhotosRef.current = savedPhotos;
      panoramaPhotosRef.current = savedPanorama;
      mainPhotoIndexRef.current = savedMain;
    })();

    photosPersistRef.current = task;
    try {
      await task;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error_save_failed'));
      throw err;
    } finally {
      if (photosPersistRef.current === task) photosPersistRef.current = null;
    }
  }, [id, t]);

  const schedulePersistPhotosDraft = useCallback(() => {
    if (photoPersistTimerRef.current) clearTimeout(photoPersistTimerRef.current);
    photoPersistTimerRef.current = setTimeout(() => {
      photoPersistTimerRef.current = null;
      void runPersistPhotosDraft();
    }, 300);
  }, [runPersistPhotosDraft]);

  const flushPersistPhotosDraft = useCallback(async () => {
    if (photoPersistTimerRef.current) {
      clearTimeout(photoPersistTimerRef.current);
      photoPersistTimerRef.current = null;
    }
    if (photosPersistRef.current) {
      await photosPersistRef.current;
    }
    await runPersistPhotosDraft();
  }, [runPersistPhotosDraft]);

  const handleDeletePhoto = (index: number) => {
    const removed = existingPhotosRef.current[index];
    const newPhotos = existingPhotosRef.current.filter((_, i) => i !== index);
    const newPanorama = removed
      ? panoramaPhotosRef.current.filter(
          (u) => u !== removed && normalizePhotoUrl(u) !== normalizePhotoUrl(removed)
        )
      : cleanPanoramaList(panoramaPhotosRef.current, newPhotos);
    const newMain = adjustMainIndexAfterRemoval(mainPhotoIndexRef.current, index);

    existingPhotosRef.current = newPhotos;
    panoramaPhotosRef.current = newPanorama;
    mainPhotoIndexRef.current = newMain;
    setExistingPhotos(newPhotos);
    setPanoramaPhotos(newPanorama);
    setMainPhotoIndex(newMain);
    schedulePersistPhotosDraft();
  };

  const handleDeleteAllPhotos = async () => {
    if (existingPhotosRef.current.length === 0) return;
    existingPhotosRef.current = [];
    panoramaPhotosRef.current = [];
    mainPhotoIndexRef.current = 0;
    setExistingPhotos([]);
    setPanoramaPhotos([]);
    setMainPhotoIndex(0);
    try {
      await flushPersistPhotosDraft();
    } catch {
      /* error already set */
    }
  };

  const persistPanoramaPhotos = async (next: string[]) => {
    const clean = cleanPanoramaList(next, existingPhotosRef.current);
    panoramaPhotosRef.current = clean;
    setPanoramaSaving(true);
    try {
      const res = await updateProperty(
        id,
        {
          photos: existingPhotosRef.current,
          panoramaPhotos: clean,
        } as any,
        { draft: true }
      );
      const savedPanorama = (res.property as Property).panoramaPhotos || clean;
      setPanoramaPhotos(savedPanorama);
      panoramaPhotosRef.current = savedPanorama;
    } finally {
      setPanoramaSaving(false);
    }
  };

  const handlePhotoReorder = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      if (photoGridRef.current) {
        pendingFlipRef.current = captureFlipPositions(photoGridRef.current);
      }
      setExistingPhotos((prev) => {
        const next = reorderArray(prev, from, to);
        setMainPhotoIndex((mi) => {
          const mainPhoto = prev[mi];
          const nextIndex = mainPhoto ? next.indexOf(mainPhoto) : 0;
          const newMain = nextIndex >= 0 ? nextIndex : 0;
          mainPhotoIndexRef.current = newMain;
          existingPhotosRef.current = next;
          schedulePersistPhotosDraft();
          return newMain;
        });
        return next;
      });
    },
    [schedulePersistPhotosDraft]
  );

  const { getThumbDragProps, isDragging, draggingIndex } = usePhotoDragReorder(handlePhotoReorder);
  const draggingFlipKey =
    draggingIndex !== null && existingPhotos[draggingIndex]
      ? existingPhotos[draggingIndex]
      : null;

  // ეტაპების შემოწმება (იგივე რიგი, რაც ატვირთვაში)
  const isStep1Complete = dealType !== '' && type !== '';
  const isStep2Complete = lat !== null && lng !== null;
  const isStep3Complete = city !== '' && (city.toLowerCase() !== 'თბილისი' ? region !== '' : true);

  const applyParsedLocation = useCallback((parsed: ReturnType<typeof mergeParsedLocation>) => {
    if (parsed.city) setCity(parsed.city);
    if (parsed.region) setRegion(parsed.region);
    if (parsed.street) setStreet(parsed.street);
    setTbilisiDistrict(parsed.tbilisiDistrict);
    setTbilisiSubdistricts(parsed.tbilisiSubdistricts);
    if (parsed.label) setAddressMapFill((s) => ({ key: s.key + 1, text: parsed.label }));
  }, []);
  const isStep4Complete = title !== '' && price !== '';
  const isLand = isLandType(type);
  const isStep5Filled = isLand
    ? landStatus !== '' ||
      naturalGas ||
      internet ||
      electricity ||
      water
    : roomCount !== null ||
      bedroomCount !== null ||
      floor !== '' ||
      balcony > 0 ||
      loggia > 0 ||
      bathroom > 0 ||
      constructionYear !== '' ||
      renovationYear !== '' ||
      renovationStatus !== '' ||
      buildingStatus !== '' ||
      basement ||
      attic ||
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
  const canSetListingVisibility = Boolean(
    user && (isAgentRole(user.role) || isAdminRole(user.role))
  );

  const completedSteps = [
    isStep1Complete,
    isStep2Complete,
    isStep3Complete,
    isStep4Complete,
    isStep5Complete,
    isStep6Complete,
    isStep7Complete,
  ].filter(Boolean).length;

  if (!hydrated || !profileLoaded) {
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
    try {
      await flushPersistPhotosDraft();
    } catch {
      return;
    }
    const remaining = MAX_PROPERTY_PHOTOS - existingPhotosRef.current.length;
    if (remaining <= 0) {
      setError(t('max_photos_reached', { max: MAX_PROPERTY_PHOTOS }));
      return;
    }
    const list = Array.from(files).slice(0, remaining);
    setAddingPhotos(true);
    setError(null);
    setPhotoUploadProgress({ done: 0, total: list.length });
    try {
      const panoramaFlags = await detectPanoramaFlags(list, (done, total) =>
        setPhotoUploadProgress({ done, total })
      );
      const items = list.map((file, index) => ({ id: `add-${Date.now()}-${index}`, file }));
      const res = await uploadPropertyPhotosInBatches(id, items, panoramaFlags, (p) =>
        setPhotoUploadProgress({ done: p.uploaded, total: p.total })
      , { draft: true });
      if (res.failures.length) {
        setError(res.failures.map((f) => `${f.name}: ${f.message}`).join('; '));
      }
      const savedPhotos = res.photos || [];
      const savedPanorama = res.panoramaPhotos || [];
      existingPhotosRef.current = savedPhotos;
      panoramaPhotosRef.current = savedPanorama;
      setExistingPhotos(savedPhotos);
      setPanoramaPhotos(savedPanorama);
      setMainPhotoIndex((prev) => {
        const nextLen = savedPhotos.length;
        const nextMain = prev >= nextLen ? Math.max(0, nextLen - 1) : prev;
        mainPhotoIndexRef.current = nextMain;
        return nextMain;
      });
      if (addPhotosInputRef.current) addPhotosInputRef.current.value = '';
    } catch (err: any) {
      setError(err.message || t('error_save_failed'));
    } finally {
      setAddingPhotos(false);
      setPhotoUploadProgress({ done: 0, total: 0 });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await flushPersistPhotosDraft();
      if (lat === null || lng === null) throw new Error(t('error_select_location'));
      if (!type) throw new Error(t('error_select_type'));
      if (!dealType) throw new Error(t('error_select_deal_type'));
      // cadastralCode არასავალდებულოა

      const detailError = isLandType(type)
        ? null
        : validateDetailFields(floor, totalFloors, constructionYear, renovationYear);
      if (detailError === 'floor_exceeds_total') throw new Error(t('error_floor_exceeds_total'));
      if (detailError === 'renovation_before_construction') {
        throw new Error(t('error_renovation_before_construction'));
      }

      const landListing = isLandType(type);
      const amenities = landListing
        ? {
            basement: false,
            attic: false,
            elevator: false,
            furniture: false,
            garage: false,
            centralHeating: false,
            naturalGas,
            storage: false,
            internet,
            electricity,
            water,
            security: false,
            airConditioner: false,
            fireplace: false,
            pool: false,
            garden: false,
            balcony: false,
            terrace: false,
            isolatedKitchen: false,
            heatingCooling: false,
          }
        : {
            basement,
            attic,
            elevator,
            furniture,
            garage,
            centralHeating,
            naturalGas,
            storage,
            internet,
            electricity,
            water,
            security,
            airConditioner,
            fireplace,
            pool,
            garden,
            balcony: balcony > 0,
            terrace,
            isolatedKitchen,
            heatingCooling,
          };

      const roomsPayload = landListing ? 0 : roomCount === null ? 0 : roomCount;
      const bedroomsPayload = landListing ? 0 : bedroomCount === null ? 0 : bedroomCount;

      await updateProperty(id, {
        title, desc,
        price: Number(price),
        priceCurrency, priceType,
        city, street: street.trim(), region,
        tbilisiDistrict, tbilisiSubdistricts,
        sqm: Number(sqm) || 0,
        houseSqm: landListing ? 0 : Number(houseSqm) || 0,
        rooms: roomsPayload,
        bedrooms: bedroomsPayload,
        type: type as any,
        dealType: dealType as any,
        exteriorLink, interiorLink, tourLink, defaultMediaView,
        contactPhone, contactEmail,
        location: { lat, lng },
        photos: existingPhotos,
        panoramaPhotos: cleanPanoramaList(panoramaPhotos, existingPhotos),
        mainPhoto: mainPhotoIndex,
        floor: landListing ? 0 : Number(floor) || 0,
        totalFloors: landListing ? 0 : Number(totalFloors) || 0,
        constructionYear: landListing ? null : constructionYear ? Number(constructionYear) : null,
        renovationYear: landListing ? null : renovationYear ? Number(renovationYear) : null,
        renovationStatus: landListing ? '' : renovationStatus,
        buildingStatus: landListing ? '' : buildingStatus,
        buildingProject: landListing ? '' : buildingProject,
        balcony: landListing ? 0 : balcony,
        loggia: landListing ? 0 : loggia,
        bathroom: landListing ? 0 : bathroom,
        ...(landListing ? { landStatus } : { landStatus: '' }),
        amenities,
        cadastralCode,
        cadastralHidden,
        privateNotes,
        ...(canSetListingVisibility
          ? { brokerListingMode: brokerListingMode || 'public' }
          : {}),
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
        {/* მთავარი ფორმა — ქვედა ადგილი, რომ ბოლო ეტაპებიც ჰედერთან ამოვიდეს */}
        <div className="space-y-4 pb-[45vh]">
          {/* ეტაპი 1: გარიგების და ქონების ტიპი */}
          <div
            ref={(el) => { stepCardRefs.current[1] = el; }}
            className={`scroll-mt-24 rounded-xl border-2 transition-all ${currentStep === 1 ? 'border-blue-500 shadow-lg' : isStep1Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}
          >
            <button onClick={() => toggleStep(1)} className="w-full text-left">
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
                    onClick={() => goToStep(2)}
                    className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    {t('next_step')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ეტაპი 2: რუკაზე მონიშვნა */}
          <div
            ref={(el) => { stepCardRefs.current[2] = el; }}
            className={`scroll-mt-24 rounded-xl border-2 transition-all ${currentStep === 2 ? 'border-blue-500 shadow-lg' : isStep2Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}
          >
            <button onClick={() => toggleStep(2)} className="w-full text-left">
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
                    onSelect={async (searchLat, searchLng, address, result) => {
                      setLat(searchLat);
                      setLng(searchLng);
                      let parsed = await resolveLocationFromSearchPick(
                        searchLat,
                        searchLng,
                        {
                          display_name: result?.display_name || address,
                          address: result?.address,
                        },
                        CITY_TO_REGION,
                        i18n.language,
                      );
                      if (!parsed.city && address) {
                        const parts = address.split(',').map((p) => p.trim());
                        if (parts.length > 1) parsed = { ...parsed, city: parts[parts.length - 1] };
                        if (!parsed.street) {
                          parsed = { ...parsed, street: splitStreetFromFullAddress(address, parsed.city) };
                        }
                        if (parsed.city) {
                          parsed = { ...parsed, region: CITY_TO_REGION[parsed.city] || parsed.region };
                        }
                      }
                      applyParsedLocation(parsed);
                    }}
                  />
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height: '350px' }}>
                  <MapView
                    properties={previewProps}
                    selectedLocation={lat !== null && lng !== null ? { lat, lng } : null}
                    center={lat !== null && lng !== null ? { lat, lng } : undefined}
                    zoom={lat !== null && lng !== null ? 17 : undefined}
                    districtZonesCity={city}
                    kutaisiZonesAutoFit={lat === null || lng === null}
                    tbilisiZonesAutoFit={lat === null || lng === null}
                    onPick={async (a, b) => {
                      setLat(a);
                      setLng(b);
                      const parsed = await resolveLocationFromCoords(a, b, CITY_TO_REGION, i18n.language);
                      if (parsed) applyParsedLocation(parsed);
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
                  <button onClick={() => goToStep(3)} className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    {t('next_step')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ეტაპი 3: მდებარეობა */}
          <div
            ref={(el) => { stepCardRefs.current[3] = el; }}
            className={`scroll-mt-24 rounded-xl border-2 transition-all ${currentStep === 3 ? 'border-blue-500 shadow-lg' : isStep3Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}
          >
            <button onClick={() => toggleStep(3)} className="w-full text-left">
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">🛣️ {t('card_street')}</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder={t('address_search_placeholder')}
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                  />
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
                  <button onClick={() => goToStep(4)} className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    {t('next_step')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ეტაპი 4: ძირითადი ინფორმაცია */}
          <div
            ref={(el) => { stepCardRefs.current[4] = el; }}
            className={`scroll-mt-24 rounded-xl border-2 transition-all ${currentStep === 4 ? 'border-blue-500 shadow-lg' : isStep4Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}
          >
            <button onClick={() => toggleStep(4)} className="w-full text-left">
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
                    {houseSqm && !isLand
                      ? ` • ${t('house_area_detail')}: ${formatNumberForDisplay(houseSqm)} ${t('sqm_unit_short')}`
                      : ''}
                    {sqm
                      ? ` • ${t('land_area_detail')}: ${formatNumberForDisplay(sqm)} ${t('sqm_unit_short')}`
                      : ''}
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
                <div className="space-y-4">
                  <LinkedPriceInputs
                    price={price}
                    priceType={priceType}
                    priceCurrency={priceCurrency}
                    areaSqm={
                      !isLand && Number(houseSqm) > 0
                        ? Number(houseSqm)
                        : Number(sqm) > 0
                          ? Number(sqm)
                          : 0
                    }
                    onPriceChange={setPrice}
                    onPriceTypeChange={setPriceType}
                    onCurrencyChange={setPriceCurrency}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    {!isLand && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        🏠 {t('house_sqm_label')}
                      </label>
                      <FormattedNumberInput
                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        placeholder="0"
                        value={houseSqm}
                        onChange={setHouseSqm}
                      />
                    </div>
                    )}
                    <div className={!isLand ? '' : 'col-span-2'}>
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
                  defaultMediaView={defaultMediaView}
                  onDefaultMediaViewChange={setDefaultMediaView}
                  hasPhotos={existingPhotos.length > 0}
                />
                {isStep4Complete && (
                  <button onClick={() => goToStep(5)} className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    {t('next_step')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ეტაპი 5: დეტალური ინფორმაცია */}
          <div
            ref={(el) => { stepCardRefs.current[5] = el; }}
            className={`scroll-mt-24 rounded-xl border-2 transition-all ${currentStep === 5 ? 'border-blue-500 shadow-lg' : isStep5Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}
          >
            <button onClick={() => toggleStep(5)} className="w-full text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isStep5Complete ? 'bg-green-500 text-white' : currentStep === 5 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  {isStep5Complete ? '✓' : '5'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">🔧 {t('detailed_info_header')}</h3>
                  <p className="text-sm text-slate-500">
                    {isLand ? t('land_details_desc') : t('detailed_info_desc')}
                  </p>
                </div>
                {isLand
                  ? landStatus !== '' && (
                      <span className="ml-auto text-green-600 font-medium">
                        {t(`land_status_${landStatus}`)}
                      </span>
                    )
                  : roomCount !== null && (
                  <span className="ml-auto text-green-600 font-medium">
                    {roomCount} {t('rooms_short')}
                    {bedroomCount !== null ? `, ${bedroomCount} ${t('bedrooms_short')}` : ''}
                  </span>
                )}
              </div>
            </button>
            {currentStep === 5 && (
              <div className="space-y-6 mt-4">
                {isLand ? (
                  <>
                    <PropertyLandStatusFields
                      landStatus={landStatus}
                      setLandStatus={setLandStatus}
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-3">⚡ {t('communications')}</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
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
                  </>
                ) : (
                <>
                <PropertyRoomsBedroomsSelectors
                  roomCount={roomCount}
                  setRoomCount={setRoomCount}
                  bedroomCount={bedroomCount}
                  setBedroomCount={setBedroomCount}
                />

                <>
                  <PropertyFloorFields
                    type={type}
                    floor={floor}
                    totalFloors={totalFloors}
                    setFloor={setFloor}
                    setTotalFloors={setTotalFloors}
                  />
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
                      🏗️ {t('building_status_label')}{' '}
                      <span className="font-normal text-slate-400">({t('cadastral_optional')})</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { value: 'newly_built', label: t('building_status_newly_built') },
                        { value: 'under_construction', label: t('building_status_under_construction') },
                        { value: 'old_built', label: t('building_status_old_built') },
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setBuildingStatus(buildingStatus === item.value ? '' : item.value)}
                          className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                            buildingStatus === item.value
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                          }`}
                        >
                          {item.label}
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
                      { key: 'attic', label: t('amenity_attic'), icon: '🏠', state: attic, setter: setAttic },
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
                </>
                )}

                <button onClick={() => goToStep(6)} className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  {t('next_step')}
                </button>
              </div>
            )}
          </div>

          {/* ეტაპი 6: ფოტოები */}
          <div
            ref={(el) => { stepCardRefs.current[6] = el; }}
            className={`scroll-mt-24 rounded-xl border-2 transition-all ${currentStep === 6 ? 'border-blue-500 shadow-lg' : isStep6Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}
          >
            <button onClick={() => toggleStep(6)} className="w-full text-left">
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
                <input
                  ref={addPhotosInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleAddMorePhotos(e.target.files)}
                />
                <div className="space-y-3">
                  {existingPhotos.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-700">
                        ✅ {t('selected_photos', { count: existingPhotos.length })}
                      </span>
                      <button
                        type="button"
                        onClick={handleDeleteAllPhotos}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        {t('delete_all')}
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-slate-500">
                    💡{' '}
                    {existingPhotos.length > 0
                      ? `${t('click_main_photo')} · ${t('photo_drag_reorder_hint')} · ${t('photo_360_toggle_hint')}${panoramaSaving ? ` (${t('saving')}…)` : ''}`
                      : t('photos_drop_zone_hint')}
                  </p>
                  {existingPhotos.length === 0 ? (
                    <div className="flex justify-center py-4">
                      <button
                        type="button"
                        disabled={addingPhotos}
                        onClick={() => addPhotosInputRef.current?.click()}
                        className={`flex aspect-square w-32 max-w-[40vw] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed transition-colors sm:w-36 ${
                          addingPhotos
                            ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-blue-400 hover:bg-blue-50/80 hover:text-blue-700'
                        }`}
                      >
                        <span className="text-2xl font-light leading-none">+</span>
                        <span className="max-w-[90%] px-1 text-center text-[10px] font-semibold leading-tight sm:text-xs">
                          {addingPhotos
                            ? photoUploadProgress.total > 0
                              ? t('photos_upload_progress', {
                                  done: photoUploadProgress.done,
                                  total: photoUploadProgress.total,
                                })
                              : t('saving')
                            : t('add_new_photos')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          0/{MAX_PROPERTY_PHOTOS}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <PhotoSortableGrid
                      className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3"
                      layoutKey={photoLayoutKey}
                      gridRef={photoGridRef}
                      pendingFlipRef={pendingFlipRef}
                      draggingFlipKey={draggingFlipKey}
                    >
                      {existingPhotos.length < MAX_PROPERTY_PHOTOS && (
                        <button
                          type="button"
                          data-flip-key="photo-add-slot"
                          disabled={addingPhotos}
                          onClick={() => addPhotosInputRef.current?.click()}
                          className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed transition-colors ${
                            addingPhotos
                              ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-blue-400 hover:bg-blue-50/80 hover:text-blue-700'
                          }`}
                        >
                          <span className="text-2xl font-light leading-none">+</span>
                          <span className="max-w-[90%] px-1 text-center text-[10px] font-semibold leading-tight sm:text-xs">
                            {addingPhotos
                              ? photoUploadProgress.total > 0
                                ? t('photos_upload_progress', {
                                    done: photoUploadProgress.done,
                                    total: photoUploadProgress.total,
                                  })
                                : t('saving')
                              : t('add_new_photos')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {existingPhotos.length}/{MAX_PROPERTY_PHOTOS}
                          </span>
                        </button>
                      )}
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
                            src={resolveImageUrl(photo, 'thumb', {
                              isPanorama: isPanoramaPhoto(photo, panoramaPhotos),
                            })}
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
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ეტაპი 7: პირადი ჩანაწერი */}
          <div
            ref={(el) => { stepCardRefs.current[7] = el; }}
            className={`scroll-mt-24 rounded-xl border-2 transition-all ${currentStep === 7 ? 'border-blue-500 shadow-lg' : isStep7Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}
          >
            <button 
              onClick={() => toggleStep(7)}
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
              onClick={async () => {
                try {
                  await discardPropertyEditDraft(id);
                } catch {
                  // draft discard failed — still navigate away
                }
                router.push(`/property/${id}`);
              }}
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
                  onClick={() => goToStep(step.num)}
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

            {canSetListingVisibility && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <label
                  htmlFor="edit-listing-visibility"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  👁️ {t('listingVisibilityLabel')}
                </label>
                <select
                  id="edit-listing-visibility"
                  value={brokerListingMode}
                  onChange={(e) =>
                    setBrokerListingMode(
                      e.target.value as 'public' | 'unlisted' | 'private' | 'sold'
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="public">{t('listingMode_public')}</option>
                  <option value="unlisted">{t('listingMode_unlisted')}</option>
                  <option value="private">{t('listingMode_private')}</option>
                  <option value="sold">{t('listingMode_sold')}</option>
                </select>
              </div>
            )}

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
                  {houseSqm && !isLand && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>🏠</span>
                      <span>
                        {t('house_area_detail')}: {formatNumberForDisplay(houseSqm)} {t('sqm_unit_short')}
                      </span>
                    </div>
                  )}
                  {isLand && landStatus !== '' && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>🌾</span>
                      <span>{t(`land_status_${landStatus}`)}</span>
                    </div>
                  )}
                  {sqm && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>📐</span>
                      <span>
                        {t('land_area_detail')}: {formatNumberForDisplay(sqm)} {t('sqm_unit_short')}
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
