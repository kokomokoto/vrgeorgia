'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { createProperty, getMe } from '@/lib/api';
import { detectPanoramaFromFile } from '@/lib/panorama';
import { useAuth } from '@/components/AuthProvider';
import { MapView } from '@/components/MapView';
import { CityCombobox } from '@/components/CityCombobox';
import AddressSearch from '@/components/AddressSearch';
import { reverseGeocodeLabel } from '@/lib/reverseGeocode';
import { splitStreetFromFullAddress } from '@/lib/propertyDisplay';
import TbilisiDistrictSelector, { CITIES_WITH_DISTRICTS } from '@/components/TbilisiDistrictSelector';
import { PropertyRoomsBedroomsSelectors } from '@/components/PropertyRoomsBedroomsSelectors';
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

export default function UploadPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();

  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => setHydrated(true), []);

  // მაკლერის პროფილი — დეფოლტად საკონტაქტო ტელ/ელფოსტა (რედაქტირებადი)
  React.useEffect(() => {
    if (!hydrated || !user || user.role !== 'agent') return;
    let cancelled = false;
    const apply = (email: string, phone: string) => {
      if (cancelled) return;
      setContactEmail((prev) => (prev.trim() === '' ? email : prev));
      setContactPhone((prev) => (prev.trim() === '' ? phone : prev));
    };
    getMe()
      .then(({ user: me }) => apply(me.email || '', me.phone || ''))
      .catch(() => apply(user.email || '', user.phone || ''));
    return () => {
      cancelled = true;
    };
  }, [hydrated, user]);

  // ეტაპი
  const [currentStep, setCurrentStep] = React.useState(1);

  // ფორმის მონაცემები
  const [title, setTitle] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [priceCurrency, setPriceCurrency] = React.useState<'USD' | 'GEL'>('USD');
  const [priceType, setPriceType] = React.useState<'total' | 'per_sqm'>('total');
  const [city, setCity] = React.useState('');
  const [street, setStreet] = React.useState('');
  const [region, setRegion] = React.useState('');
  const [tbilisiDistrict, setTbilisiDistrict] = React.useState('');
  const [tbilisiSubdistricts, setTbilisiSubdistricts] = React.useState<string[]>([]);
  const [sqm, setSqm] = React.useState('');
  const [type, setType] = React.useState('');
  const [dealType, setDealType] = React.useState('');
  const [exteriorLink, setExteriorLink] = React.useState('');
  const [interiorLink, setInteriorLink] = React.useState('');
  const [contactPhone, setContactPhone] = React.useState('');
  const [contactEmail, setContactEmail] = React.useState('');
  const [lat, setLat] = React.useState<number | null>(null);
  const [lng, setLng] = React.useState<number | null>(null);
  const [addressMapFill, setAddressMapFill] = React.useState({ key: 0, text: '' });
  const MAX_PHOTOS = 12;
  const [photoFiles, setPhotoFiles] = React.useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = React.useState<string[]>([]);
  const [mainPhotoIndex, setMainPhotoIndex] = React.useState<number>(0);
  const [cadastralCode, setCadastralCode] = React.useState('');
  const [cadastralHidden, setCadastralHidden] = React.useState(false);

  // დეტალური ინფორმაცია
  const [roomCount, setRoomCount] = React.useState<number | null>(null);
  const [bedroomCount, setBedroomCount] = React.useState<number | null>(null);
  const [floor, setFloor] = React.useState('');
  const [totalFloors, setTotalFloors] = React.useState('');
  const [constructionYear, setConstructionYear] = React.useState('');
  const [renovationYear, setRenovationYear] = React.useState('');
  const [renovationStatus, setRenovationStatus] = React.useState('');
  const [buildingProject, setBuildingProject] = React.useState('');
  const [balcony, setBalcony] = React.useState<number>(0);
  const [loggia, setLoggia] = React.useState<number>(0);
  const [bathroom, setBathroom] = React.useState<number>(0);
  const [basement, setBasement] = React.useState(false);
  const [elevator, setElevator] = React.useState(false);
  const [furniture, setFurniture] = React.useState(false);
  const [garage, setGarage] = React.useState(false);
  const [centralHeating, setCentralHeating] = React.useState(false);
  const [naturalGas, setNaturalGas] = React.useState(false);
  const [storage, setStorage] = React.useState(false);
  const [internet, setInternet] = React.useState(false);
  const [electricity, setElectricity] = React.useState(false);
  const [water, setWater] = React.useState(false);
  const [security, setSecurity] = React.useState(false);
  const [airConditioner, setAirConditioner] = React.useState(false);
  const [fireplace, setFireplace] = React.useState(false);
  const [pool, setPool] = React.useState(false);
  const [garden, setGarden] = React.useState(false);
  const [terrace, setTerrace] = React.useState(false);
  const [isolatedKitchen, setIsolatedKitchen] = React.useState(false);
  const [heatingCooling, setHeatingCooling] = React.useState(false);

  // პირადი ჩანაწერი
  const [privateNotes, setPrivateNotes] = React.useState('');

  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (photoFiles.length === 0) {
      setPhotoPreviews([]);
      return;
    }
    let cancelled = false;
    Promise.all(
      photoFiles.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onloadend = () => resolve(r.result as string);
            r.onerror = () => reject(new Error('read'));
            r.readAsDataURL(file);
          })
      )
    ).then((urls) => {
      if (!cancelled) setPhotoPreviews(urls);
    });
    return () => {
      cancelled = true;
    };
  }, [photoFiles]);

  // ეტაპების შემოწმება
  const isStep1Complete = type !== '';
  const isStep2Complete = dealType !== '';
  const isStep3Complete = city !== '' && (city.toLowerCase() !== 'თბილისი' ? region !== '' : true);
  const isStep4Complete = lat !== null && lng !== null;
  const isStep5Complete = title !== '' && price !== '' && sqm !== '';
  // Step 6 მწვანდება თუ რამე შეავსო, მაგრამ არასავალდებულოა
  const isStep6Filled = roomCount !== null || bedroomCount !== null || floor !== '' || balcony > 0 || loggia > 0 || bathroom > 0 || 
    constructionYear !== '' || renovationYear !== '' || renovationStatus !== '' ||
    basement || elevator || furniture || garage || centralHeating || naturalGas || internet || electricity || water || terrace;
  const isStep6Complete = isStep6Filled; // ვიზუალურად მწვანე თუ რამე შეავსო
  const isStep7Complete = photoFiles.length > 0;
  const isStep8Complete = privateNotes.trim() !== '';

  // მთლიანი პროგრესი
  const completedSteps = [isStep1Complete, isStep2Complete, isStep3Complete, isStep4Complete, isStep5Complete, isStep6Complete, isStep7Complete, isStep8Complete].filter(Boolean).length;

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
        <p className="text-slate-600">{t('auth_required_desc')}</p>
      </div>
    );
  }

  const previewProps: Property[] =
    lat !== null && lng !== null
      ? [
          {
            _id: 'new',
            title: title || t('new_property'),
            desc: desc || '',
            price: Number(price || 0),
            city,
            region,
            location: { lat, lng },
            type: type as any || 'apartment',
            dealType: dealType as any || 'sale',
            photos: [],
            exteriorLink,
            interiorLink,
            contact: { phone: contactPhone, email: contactEmail }
          }
        ]
      : [];

  // ეტაპების კონფიგურაცია
  const steps = [
    { num: 1, title: t('property_type_select'), icon: '🏠', complete: isStep1Complete },
    { num: 2, title: t('deal_type_select'), icon: '💼', complete: isStep2Complete },
    { num: 3, title: t('location_step'), icon: '📍', complete: isStep3Complete },
    { num: 4, title: t('map_marking'), icon: '🗺️', complete: isStep4Complete },
    { num: 5, title: t('details_step'), icon: '📝', complete: isStep5Complete },
    { num: 6, title: t('detailed_info_step'), icon: '🔧', complete: isStep6Complete },
    { num: 7, title: t('photos_step'), icon: '📷', complete: isStep7Complete },
    { num: 8, title: t('private_notes'), icon: '🔒', complete: isStep8Complete },
  ];

  const handlePhotoSelect = (files: FileList | null) => {
    if (!files?.length) return;
    const incoming = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (incoming.length === 0) return;
    setPhotoFiles((prev) => [...prev, ...incoming].slice(0, MAX_PHOTOS));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files?.length) handlePhotoSelect(e.dataTransfer.files);
  };

  // ფოტოს წაშლა
  const removePhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    if (index === mainPhotoIndex) {
      setMainPhotoIndex(0);
    } else if (index < mainPhotoIndex) {
      setMainPhotoIndex((prev) => prev - 1);
    }
  };

  // მთავარი ფოტოს არჩევა
  const setAsMainPhoto = (index: number) => {
    setMainPhotoIndex(index);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      // ტოკენის შემოწმება
      const token = window.localStorage.getItem('token');
      if (!token) {
        throw new Error(t('auth_required'));
      }
      
      if (lat === null || lng === null) throw new Error(t('choose_location_map'));
      if (!type) throw new Error(t('choose_property_type'));
      if (!dealType) throw new Error(t('choose_deal_type'));
      
      const form = new FormData();
      form.set('title', title);
      form.set('desc', desc);
      form.set('price', price);
      form.set('priceCurrency', priceCurrency);
      form.set('priceType', priceType);
      form.set('city', city);
      form.set(
        'street',
        street.trim() || splitStreetFromFullAddress(addressMapFill.text, city)
      );
      form.set('region', region);
      form.set('tbilisiDistrict', tbilisiDistrict);
      form.set('tbilisiSubdistricts', JSON.stringify(tbilisiSubdistricts));
      form.set('sqm', sqm);
      form.set('rooms', String(roomCount || 0));
      form.set('bedrooms', String(bedroomCount || 0));
      form.set('type', type);
      form.set('dealType', dealType);
      form.set('lat', String(lat));
      form.set('lng', String(lng));
      form.set('exteriorLink', exteriorLink);
      form.set('interiorLink', interiorLink);
      form.set('contactPhone', contactPhone);
      form.set('contactEmail', contactEmail);
      form.set('cadastralCode', cadastralCode);
      form.set('cadastralHidden', cadastralHidden ? 'true' : 'false');
      
      // დეტალური ინფორმაცია
      form.set('floor', floor);
      form.set('totalFloors', totalFloors);
      form.set('constructionYear', constructionYear);
      form.set('renovationYear', renovationYear);
      if (renovationStatus) form.set('renovationStatus', renovationStatus);
      if (buildingProject) form.set('buildingProject', buildingProject);
      form.set('balcony', String(balcony));
      form.set('loggia', String(loggia));
      form.set('bathroom', String(bathroom));
      
      // ობიექტი amenities-სთვის
      const amenities = {
        basement,
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
        heatingCooling
      };
      form.set('amenities', JSON.stringify(amenities));
      form.set('privateNotes', privateNotes);
      
      if (photoFiles.length > 0) {
        const photoArray = [...photoFiles];
        const ordered = [
          photoArray[mainPhotoIndex],
          ...photoArray.filter((_, i) => i !== mainPhotoIndex),
        ];
        const panoramaFlags = await Promise.all(ordered.map((f) => detectPanoramaFromFile(f)));
        form.set('panoramaFlags', JSON.stringify(panoramaFlags));
        ordered.forEach((f) => form.append('photos', f));
      }

      const res = await createProperty(form);
      router.push(`/property/${res.property._id}`);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'string'
            ? e
            : JSON.stringify(e);
      setError(msg?.trim() ? msg.trim() : t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-w-0">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <span className="text-3xl">🏠</span>
          {t('add_property')}
        </h1>
        <p className="text-slate-600 mt-1">{t('fill_info_desc')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* მთავარი ფორმა */}
        <div className="space-y-4">
          {/* ეტაპი 1: ქონების ტიპი */}
          <div className={`rounded-xl border-2 transition-all ${currentStep === 1 ? 'border-blue-500 shadow-lg' : isStep1Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}>
            <button 
              onClick={() => setCurrentStep(prev => prev === 1 ? 0 : 1)}
              className="w-full text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isStep1Complete ? 'bg-green-500 text-white' : currentStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  {isStep1Complete ? '✓' : '1'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">🏠 {t('property_type_select')}</h3>
                  <p className="text-sm text-slate-500">{t('what_selling')}</p>
                </div>
                {isStep1Complete && <span className="ml-auto text-green-600 font-medium">{PROPERTY_TYPES.find(pt => pt.value === type) ? t(PROPERTY_TYPES.find(pt => pt.value === type)!.key) : ''}</span>}
              </div>
            </button>
            
            {currentStep === 1 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {PROPERTY_TYPES.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      if (type === item.value) {
                        setType('');
                      } else {
                        setType(item.value);
                        setCurrentStep(2);
                      }
                    }}
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
            )}
          </div>

          {/* ეტაპი 2: გარიგების ტიპი */}
          <div className={`rounded-xl border-2 transition-all ${currentStep === 2 ? 'border-blue-500 shadow-lg' : isStep2Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}>
            <button 
              onClick={() => setCurrentStep(prev => prev === 2 ? 0 : 2)}
              className="w-full text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isStep2Complete ? 'bg-green-500 text-white' : currentStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  {isStep2Complete ? '✓' : '2'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">💼 {t('deal_type_select')}</h3>
                  <p className="text-sm text-slate-500">{t('what_deal')}</p>
                </div>
                {isStep2Complete && <span className="ml-auto text-green-600 font-medium">{DEAL_TYPES.find(d => d.value === dealType) ? t(DEAL_TYPES.find(d => d.value === dealType)!.key) : ''}</span>}
              </div>
            </button>
            
            {currentStep === 2 && (
              <div className="grid grid-cols-5 gap-3 mt-4">
                {DEAL_TYPES.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      if (dealType === item.value) {
                        setDealType('');
                      } else {
                        setDealType(item.value);
                        setCurrentStep(3);
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
            )}
          </div>

          {/* ეტაპი 3: მდებარეობა */}
          <div className={`rounded-xl border-2 transition-all ${currentStep === 3 ? 'border-blue-500 shadow-lg' : isStep3Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}>
            <button 
              onClick={() => setCurrentStep(prev => prev === 3 ? 0 : 3)}
              className="w-full text-left"
            >
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">🏙️ {t('city')}</label>
                    <CityCombobox 
                      value={city} 
                      onChange={(newCity) => {
                        setCity(newCity);
                        // ავტომატურად შევარჩიოთ რეგიონი ქალაქიდან
                        const autoRegion = CITY_TO_REGION[newCity];
                        if (autoRegion) {
                          setRegion(autoRegion);
                        }
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
                      <label className="block text-sm font-medium text-slate-700 mb-2">🗺️ {t('region')}</label>
                      <select 
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
                        value={region} 
                        onChange={(e) => setRegion(e.target.value)}
                      >
                        <option value="">{t('filter_choose')} {t('region')}</option>
                        {GEORGIAN_REGIONS.map((r) => (
                          <option key={r.value} value={r.value}>{t(r.key)}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-end">
                      <div className="w-full rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-blue-700">
                        📍 {t('region')}: {t('region_tbilisi')}
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
                  <button 
                    onClick={() => setCurrentStep(4)}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    {t('next_step')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ეტაპი 4: რუკა */}
          <div className={`rounded-xl border-2 transition-all ${currentStep === 4 ? 'border-blue-500 shadow-lg' : isStep4Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}>
            <button 
              onClick={() => setCurrentStep(prev => prev === 4 ? 0 : 4)}
              className="w-full text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isStep4Complete ? 'bg-green-500 text-white' : currentStep === 4 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  {isStep4Complete ? '✓' : '4'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">🗺️ {t('map_marking')}</h3>
                  <p className="text-sm text-slate-500">{t('specify_exact_location')}</p>
                </div>
                {isStep4Complete && <span className="ml-auto text-green-600 font-medium">📍 {t('marked_on_map')}</span>}
              </div>
            </button>
            
            {currentStep === 4 && (
              <div className="space-y-4 mt-4">
                {/* საკადასტრო კოდი */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <label className="block text-sm font-medium text-slate-700 mb-2">📋 {t('cadastral_code')} <span className="text-slate-400 text-xs">({t('cadastral_optional')})</span></label>
                  <input 
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder={t('cadastral_example')}
                    value={cadastralCode}
                    onChange={(e) => setCadastralCode(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-2">{t('cadastral_info')}</p>
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
                  <div className="text-sm text-blue-700">
                    {t('map_hint')}
                  </div>
                </div>

                {lat !== null && lng !== null && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <span className="text-green-700 text-sm">
                      ✅ {t('coordinates_label')}: {lat.toFixed(5)}, {lng.toFixed(5)}
                    </span>
                  </div>
                )}

                {isStep4Complete && (
                  <button 
                    onClick={() => setCurrentStep(5)}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    {t('next_step')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ეტაპი 5: დეტალები */}
          <div className={`rounded-xl border-2 transition-all ${currentStep === 5 ? 'border-blue-500 shadow-lg' : isStep5Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}>
            <button 
              onClick={() => setCurrentStep(prev => prev === 5 ? 0 : 5)}
              className="w-full text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isStep5Complete ? 'bg-green-500 text-white' : currentStep === 5 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  {isStep5Complete ? '✓' : '5'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">📝 {t('details_step')}</h3>
                  <p className="text-sm text-slate-500">{t('details_desc')}</p>
                </div>
                {isStep5Complete && <span className="ml-auto text-green-600 font-medium">{price} {priceCurrency === 'USD' ? '$' : '₾'}{priceType === 'per_sqm' ? `/${t('filter_per_sqm')}` : ''} • {sqm} {t('sqm_unit_short')}</span>}
              </div>
            </button>
            
            {currentStep === 5 && (
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
                      <input 
                        type="number"
                        className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
                        placeholder="0" 
                        value={price} 
                        onChange={(e) => setPrice(e.target.value)} 
                      />
                      <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setPriceCurrency('USD')}
                          className={`px-4 py-3 font-medium transition-colors ${
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
                          className={`px-4 py-3 font-medium transition-colors ${
                            priceCurrency === 'GEL' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          ₾
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setPriceType('total')}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                          priceType === 'total'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {t('total_price')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriceType('per_sqm')}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                          priceType === 'per_sqm'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {t('price_per_sqm')}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">📐 {t('area_sqm')}</label>
                    <input 
                      type="number" 
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
                      placeholder="0" 
                      value={sqm} 
                      onChange={(e) => setSqm(e.target.value)} 
                    />
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

                <div className="pt-2 border-t">
                  <p className="text-sm text-slate-500 mb-2">🔮 3D ({t('cadastral_optional')})</p>
                  <p className="text-xs text-slate-400 mb-3">
                    YouTube, Matterport, Kuula, Supersplat
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      className="rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder={t('exterior_3d')}
                      value={exteriorLink}
                      onChange={(e) => setExteriorLink(e.target.value)}
                    />
                    <input
                      className="rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder={t('interior_3d')}
                      value={interiorLink}
                      onChange={(e) => setInteriorLink(e.target.value)}
                    />
                  </div>
                </div>

                {isStep5Complete && (
                  <button 
                    onClick={() => setCurrentStep(6)}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    {t('next_step')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ეტაპი 6: დეტალური ინფორმაცია */}
          <div className={`rounded-xl border-2 transition-all ${currentStep === 6 ? 'border-blue-500 shadow-lg' : isStep6Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}>
            <button 
              onClick={() => setCurrentStep(prev => prev === 6 ? 0 : 6)}
              className="w-full text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isStep6Complete ? 'bg-green-500 text-white' : currentStep === 6 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  {isStep6Complete ? '✓' : '6'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">🔧 {t('detailed_info_header')}</h3>
                  <p className="text-sm text-slate-500">{t('detailed_info_desc')}</p>
                </div>
                {roomCount !== null && (
                  <span className="ml-auto text-green-600 font-medium">
                    {(roomCount >= 6 ? '6+' : roomCount)} {t('rooms_short')}
                    {bedroomCount !== null ? `, ${bedroomCount >= 6 ? '6+' : bedroomCount} ${t('bedrooms_short')}` : ''}
                  </span>
                )}
              </div>
            </button>
            
            {currentStep === 6 && (
              <div className="space-y-6 mt-4">
                <PropertyRoomsBedroomsSelectors
                  roomCount={roomCount}
                  setRoomCount={setRoomCount}
                  bedroomCount={bedroomCount}
                  setBedroomCount={setBedroomCount}
                />

                {/* სართული (ბინის შემთხვევაში) */}
                {type === 'apartment' && (
                  <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">🏠 {t('building_project_label')}</label>
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
                    <label className="block text-sm font-medium text-slate-700 mb-3">🏢 {t('floor_label')}</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">{t('which_floor')}</label>
                        <input
                          type="number"
                          min="1"
                          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          placeholder={t('floor_example')}
                          value={floor}
                          onChange={(e) => setFloor(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">{t('total_floors')}</label>
                        <input
                          type="number"
                          min="1"
                          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          placeholder={t('total_floors_example')}
                          value={totalFloors}
                          onChange={(e) => setTotalFloors(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">📅 აშენების/რემონტის წლები</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">აშენების წელი</label>
                        <input
                          type="number"
                          min="1800"
                          max="2100"
                          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          placeholder="მაგ: 2008"
                          value={constructionYear}
                          onChange={(e) => setConstructionYear(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">რემონტის წელი</label>
                        <input
                          type="number"
                          min="1800"
                          max="2100"
                          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          placeholder="მაგ: 2021"
                          value={renovationYear}
                          onChange={(e) => setRenovationYear(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">🧱 რემონტი</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'green_frame', label: 'მწვანე კარკასი' },
                        { value: 'white_frame', label: 'თეთრი კარკასი' },
                        { value: 'black_frame', label: 'შავი კარკასი' },
                        { value: 'renovated', label: 'გარემონტებული' },
                        { value: 'to_renovate', label: 'გასარემონტებელი' },
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
                )}

                {/* აივანი და ლოჯია */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">🌅 {t('balcony')}</label>
                    <div className="flex gap-2">
                      {[0, 1, 2, 3].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setBalcony(num)}
                          className={`w-12 h-12 rounded-xl border-2 font-bold transition-all ${
                            balcony === num
                              ? 'border-orange-500 bg-orange-500 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300'
                          }`}
                        >
                          {num === 0 ? '—' : num}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">🏠 {t('loggia')}</label>
                    <div className="flex gap-2">
                      {[0, 1, 2, 3].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setLoggia(num)}
                          className={`w-12 h-12 rounded-xl border-2 font-bold transition-all ${
                            loggia === num
                              ? 'border-purple-500 bg-purple-500 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-purple-300'
                          }`}
                        >
                          {num === 0 ? '—' : num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* სველი წერტილები */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">🚿 {t('bathroom_label')}</label>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setBathroom(num)}
                        className={`w-12 h-12 rounded-xl border-2 font-bold transition-all ${
                          bathroom === num
                            ? 'border-cyan-500 bg-cyan-500 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300'
                        }`}
                      >
                        {num === 0 ? '—' : num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* დამატებითი კომფორტი */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">✨ დამატებითი კომფორტი</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {[
                      { key: 'basement', label: 'სარდაფი', icon: '🏚️', state: basement, setter: setBasement },
                      { key: 'elevator', label: 'ლიფტი', icon: '🛗', state: elevator, setter: setElevator },
                      { key: 'furniture', label: 'ავეჯი', icon: '🪑', state: furniture, setter: setFurniture },
                      { key: 'garage', label: 'ავტოფარეხი', icon: '🚗', state: garage, setter: setGarage },
                      { key: 'storage', label: 'სათავსო', icon: '📦', state: storage, setter: setStorage },
                      { key: 'airConditioner', label: 'კონდიციონერი', icon: '❄️', state: airConditioner, setter: setAirConditioner },
                      { key: 'fireplace', label: 'ბუხარი', icon: '🔥', state: fireplace, setter: setFireplace },
                      { key: 'pool', label: 'აუზი', icon: '🏊', state: pool, setter: setPool },
                      { key: 'garden', label: 'ბაღი/ეზო', icon: '🌳', state: garden, setter: setGarden },
                      { key: 'terrace', label: 'ტერასა', icon: '🏞️', state: terrace, setter: setTerrace },
                      { key: 'security', label: 'დაცვა', icon: '🔒', state: security, setter: setSecurity },
                      { key: 'isolatedKitchen', label: 'იზოლ. სამზარეულო', icon: '🍳', state: isolatedKitchen, setter: setIsolatedKitchen },
                      { key: 'heatingCooling', label: 'გათბობა/გაგრილება', icon: '🌡️', state: heatingCooling, setter: setHeatingCooling },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => item.setter(!item.state)}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          item.state
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
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
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => item.setter(!item.state)}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          item.state
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{item.icon}</div>
                        <div className="text-xs font-medium">{item.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* შემდეგი ეტაპი - ყოველთვის ხელმისაწვდომია რადგან Step 6 არასავალდებულოა */}
                <button 
                  onClick={() => setCurrentStep(7)}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  {t('next_step')}
                </button>
              </div>
            )}
          </div>

          {/* ეტაპი 7: ფოტოები */}
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
                  <h3 className="text-lg font-semibold text-slate-800">📷 {t('photos_step')}</h3>
                  <p className="text-sm text-slate-500">{t('photos_desc')}</p>
                </div>
                {isStep7Complete && <span className="ml-auto text-green-600 font-medium">{photoFiles.length} {t('photos_count')}</span>}
              </div>
            </button>
            
            {currentStep === 7 && (
              <div className="space-y-4 mt-4">
                {photoFiles.length === 0 ? (
                  <div
                    className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <div className="text-5xl mb-3">📸</div>
                    <p className="text-slate-600 mb-4">{t('choose_or_drop_photos')}</p>
                    <input
                      className="hidden"
                      id="photo-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        handlePhotoSelect(e.target.files);
                        e.target.value = '';
                      }}
                    />
                    <label
                      htmlFor="photo-upload"
                      className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium cursor-pointer hover:bg-blue-700 transition-colors"
                    >
                      {t('choose_photos')}
                    </label>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-sm font-medium text-slate-700">
                          ✅ {t('selected_photos', { count: photoPreviews.length })}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoFiles([]);
                            setMainPhotoIndex(0);
                          }}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          {t('delete_all')}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">💡 {t('click_main_photo')}</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {photoPreviews.map((preview, index) => (
                          <div
                            key={index}
                            className={`relative group aspect-square cursor-pointer ${index === mainPhotoIndex ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                            onClick={() => setAsMainPhoto(index)}
                          >
                            <img
                              src={preview}
                              alt={`${t('photo')} ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg border border-slate-200"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removePhoto(index);
                              }}
                              className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            >
                              ✕
                            </button>
                            {index === mainPhotoIndex && (
                              <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
                                ⭐ {t('main_photo')}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {photoFiles.length < MAX_PHOTOS && (
                      <div
                        className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      >
                        <p className="text-sm text-slate-600 text-left">{t('add_new_photos')}</p>
                        <div className="flex flex-wrap items-center gap-2 justify-end">
                          <input
                            className="hidden"
                            id="photo-upload-more"
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => {
                              handlePhotoSelect(e.target.files);
                              e.target.value = '';
                            }}
                          />
                          <label
                            htmlFor="photo-upload-more"
                            className="inline-block px-5 py-2.5 bg-white border-2 border-blue-500 text-blue-700 rounded-lg font-medium cursor-pointer hover:bg-blue-50 transition-colors text-sm"
                          >
                            + {t('choose_photos')}
                          </label>
                          <span className="text-xs text-slate-400">
                            ({photoFiles.length}/{MAX_PHOTOS})
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ეტაპი 8: პირადი ჩანაწერი */}
          <div className={`rounded-xl border-2 transition-all ${currentStep === 8 ? 'border-blue-500 shadow-lg' : isStep8Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}>
            <button 
              onClick={() => setCurrentStep(prev => prev === 8 ? 0 : 8)}
              className="w-full text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isStep8Complete ? 'bg-green-500 text-white' : currentStep === 8 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  {isStep8Complete ? '✓' : '8'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">🔒 {t('private_notes_header')}</h3>
                  <p className="text-sm text-slate-500">{t('private_notes_desc')}</p>
                </div>
              </div>
            </button>

            {currentStep === 8 && (
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

          {/* შეცდომა და გამოქვეყნების ღილაკი */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
              ⚠️ {error}
            </div>
          )}

          <button
            className={`w-full py-4 rounded-xl text-lg font-bold transition-all ${
              completedSteps >= 6
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
            disabled={loading || completedSteps < 6}
            onClick={handleSubmit}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {t('loading')}
              </span>
            ) : (
              <span>🚀 {t('publish')}</span>
            )}
          </button>
        </div>

        {/* მარჯვენა პანელი - პროგრესი */}
        <div className="lg:sticky lg:top-4 h-fit">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              📋 {t('progress_label')}
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
                    step.complete
                      ? 'bg-green-500 text-white'
                      : currentStep === step.num
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-300 text-slate-600'
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

            {/* შევსებული მონაცემების შეჯამება */}
            {completedSteps > 0 && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">📝 შევსებული:</h4>
                <div className="space-y-2 text-sm">
                  {type && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>{PROPERTY_TYPES.find(t => t.value === type)?.icon}</span>
                      <span>{t(PROPERTY_TYPES.find((item) => item.value === type)?.key || '')}</span>
                    </div>
                  )}
                  {dealType && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>{DEAL_TYPES.find(d => d.value === dealType)?.icon}</span>
                      <span>{t(DEAL_TYPES.find((item) => item.value === dealType)?.key || '')}</span>
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
                      <span>{price} {priceCurrency === 'USD' ? '$' : '₾'}</span>
                    </div>
                  )}
                  {sqm && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>📐</span>
                      <span>{sqm} კვ.მ</span>
                    </div>
                  )}
                  {lat !== null && lng !== null && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>🗺️</span>
                      <span>მდებარეობა მონიშნულია</span>
                    </div>
                  )}
                  {photoFiles.length > 0 && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>📷</span>
                      <span>{photoFiles.length} ფოტო</span>
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
