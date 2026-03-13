'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { createProperty } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
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

// ქონების ტიპები იკონებით
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

// გარიგების ტიპები იკონებით
const DEAL_TYPES = [
  { value: 'sale', label: 'იყიდება', icon: '💰' },
  { value: 'rent', label: 'ქირავდება', icon: '🔑' },
  { value: 'mortgage', label: 'გირავდება', icon: '🏦' },
  { value: 'daily', label: 'დღიურად', icon: '📅' },
  { value: 'under_construction', label: 'მშენებარე', icon: '🔨' },
];

export default function UploadPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();

  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => setHydrated(true), []);

  // ეტაპი
  const [currentStep, setCurrentStep] = React.useState(1);

  // ფორმის მონაცემები
  const [title, setTitle] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [priceCurrency, setPriceCurrency] = React.useState<'USD' | 'GEL'>('USD');
  const [city, setCity] = React.useState('');
  const [region, setRegion] = React.useState('');
  const [tbilisiDistrict, setTbilisiDistrict] = React.useState('');
  const [tbilisiSubdistricts, setTbilisiSubdistricts] = React.useState<string[]>([]);
  const [sqm, setSqm] = React.useState('');
  const [type, setType] = React.useState('');
  const [dealType, setDealType] = React.useState('');
  const [exteriorLink, setExteriorLink] = React.useState('');
  const [interiorLink, setInteriorLink] = React.useState('');
  const [contactPhone, setContactPhone] = React.useState('');
  const [contactEmail, setContactEmail] = React.useState(user?.email || '');
  const [lat, setLat] = React.useState<number | null>(null);
  const [lng, setLng] = React.useState<number | null>(null);
  const [photos, setPhotos] = React.useState<FileList | null>(null);
  const [photoPreviews, setPhotoPreviews] = React.useState<string[]>([]);
  const [mainPhotoIndex, setMainPhotoIndex] = React.useState<number>(0);
  const [cadastralCode, setCadastralCode] = React.useState('');

  // დეტალური ინფორმაცია
  const [roomCount, setRoomCount] = React.useState<number | null>(null);
  const [floor, setFloor] = React.useState('');
  const [totalFloors, setTotalFloors] = React.useState('');
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

  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // ეტაპების შემოწმება
  const isStep1Complete = type !== '';
  const isStep2Complete = dealType !== '';
  const isStep3Complete = city !== '' && (city.toLowerCase() !== 'თბილისი' ? region !== '' : true);
  const isStep4Complete = lat !== null && lng !== null;
  const isStep5Complete = title !== '' && price !== '' && sqm !== '';
  // Step 6 მწვანდება თუ რამე შეავსო, მაგრამ არასავალდებულოა
  const isStep6Filled = roomCount !== null || floor !== '' || balcony > 0 || loggia > 0 || bathroom > 0 || 
    basement || elevator || furniture || garage || centralHeating || naturalGas || internet || electricity || water;
  const isStep6Complete = isStep6Filled; // ვიზუალურად მწვანე თუ რამე შეავსო
  const isStep7Complete = photos !== null && photos.length > 0;

  // მთლიანი პროგრესი
  const completedSteps = [isStep1Complete, isStep2Complete, isStep3Complete, isStep4Complete, isStep5Complete, isStep6Complete, isStep7Complete].filter(Boolean).length;

  if (!hydrated) {
    return <div className="flex items-center justify-center min-h-[400px] text-slate-500">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>;
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto mt-12 rounded-xl border border-slate-200 bg-white p-8 text-center">
        <div className="text-5xl mb-4">🔐</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">ავტორიზაცია საჭიროა</h2>
        <p className="text-slate-600">ქონების დასამატებლად გთხოვთ შეხვიდეთ ანგარიშში</p>
      </div>
    );
  }

  const previewProps: Property[] =
    lat !== null && lng !== null
      ? [
          {
            _id: 'new',
            title: title || 'ახალი ქონება',
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
    { num: 1, title: 'ქონების ტიპი', icon: '🏠', complete: isStep1Complete },
    { num: 2, title: 'გარიგების ტიპი', icon: '💼', complete: isStep2Complete },
    { num: 3, title: 'მდებარეობა', icon: '📍', complete: isStep3Complete },
    { num: 4, title: 'რუკაზე მონიშვნა', icon: '🗺️', complete: isStep4Complete },
    { num: 5, title: 'დეტალები', icon: '📝', complete: isStep5Complete },
    { num: 6, title: 'დეტალური ინფო', icon: '🔧', complete: isStep6Complete },
    { num: 7, title: 'ფოტოები', icon: '📷', complete: isStep7Complete },
  ];

  // ფოტოების არჩევისას პრევიუების გენერაცია
  const handlePhotoSelect = (files: FileList | null) => {
    setPhotos(files);
    if (files) {
      const previews: string[] = [];
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          previews.push(reader.result as string);
          if (previews.length === files.length) {
            setPhotoPreviews([...previews]);
          }
        };
        reader.readAsDataURL(file);
      });
    } else {
      setPhotoPreviews([]);
    }
  };

  // ფოტოს წაშლა
  const removePhoto = (index: number) => {
    if (!photos) return;
    const dt = new DataTransfer();
    Array.from(photos).forEach((file, i) => {
      if (i !== index) dt.items.add(file);
    });
    setPhotos(dt.files.length > 0 ? dt.files : null);
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
    // მთავარი ფოტოს ინდექსის განახლება
    if (index === mainPhotoIndex) {
      setMainPhotoIndex(0);
    } else if (index < mainPhotoIndex) {
      setMainPhotoIndex(prev => prev - 1);
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
        throw new Error('გთხოვთ გაიაროთ ავტორიზაცია თავიდან');
      }
      
      if (lat === null || lng === null) throw new Error('აირჩიეთ მდებარეობა რუკაზე');
      if (!type) throw new Error('აირჩიეთ ქონების ტიპი');
      if (!dealType) throw new Error('აირჩიეთ გარიგების ტიპი');
      
      const form = new FormData();
      form.set('title', title);
      form.set('desc', desc);
      form.set('price', price);
      form.set('priceCurrency', priceCurrency);
      form.set('city', city);
      form.set('region', region);
      form.set('tbilisiDistrict', tbilisiDistrict);
      form.set('tbilisiSubdistricts', JSON.stringify(tbilisiSubdistricts));
      form.set('sqm', sqm);
      form.set('rooms', String(roomCount || 0));
      form.set('type', type);
      form.set('dealType', dealType);
      form.set('lat', String(lat));
      form.set('lng', String(lng));
      form.set('exteriorLink', exteriorLink);
      form.set('interiorLink', interiorLink);
      form.set('contactPhone', contactPhone);
      form.set('contactEmail', contactEmail);
      form.set('cadastralCode', cadastralCode);
      
      // დეტალური ინფორმაცია
      form.set('floor', floor);
      form.set('totalFloors', totalFloors);
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
        garden
      };
      form.set('amenities', JSON.stringify(amenities));
      
      if (photos) {
        // მთავარი ფოტო პირველი იგზავნება
        const photoArray = Array.from(photos);
        // ჯერ მთავარი ფოტო
        form.append('photos', photoArray[mainPhotoIndex]);
        // შემდეგ დანარჩენი
        photoArray.forEach((f, i) => {
          if (i !== mainPhotoIndex) form.append('photos', f);
        });
      }

      const res = await createProperty(form);
      router.push(`/property/${res.property._id}`);
    } catch (e: any) {
      setError(e.message || 'შეცდომა');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <span className="text-3xl">🏠</span>
          ქონების დამატება
        </h1>
        <p className="text-slate-600 mt-1">შეავსეთ ინფორმაცია თქვენი ქონების შესახებ</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* მთავარი ფორმა */}
        <div className="space-y-4">
          {/* ეტაპი 1: ქონების ტიპი */}
          <div className={`rounded-xl border-2 transition-all ${currentStep === 1 ? 'border-blue-500 shadow-lg' : isStep1Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}>
            <button 
              onClick={() => setCurrentStep(1)}
              className="w-full text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isStep1Complete ? 'bg-green-500 text-white' : currentStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  {isStep1Complete ? '✓' : '1'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">🏠 ქონების ტიპი</h3>
                  <p className="text-sm text-slate-500">რას ყიდით ან აქირავებთ?</p>
                </div>
                {isStep1Complete && <span className="ml-auto text-green-600 font-medium">{PROPERTY_TYPES.find(t => t.value === type)?.label}</span>}
              </div>
            </button>
            
            {currentStep === 1 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {PROPERTY_TYPES.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setType(item.value);
                      setCurrentStep(2);
                    }}
                    className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                      type === item.value 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-3xl mb-2">{item.icon}</div>
                    <div className="font-medium text-slate-700">{item.label}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ეტაპი 2: გარიგების ტიპი */}
          <div className={`rounded-xl border-2 transition-all ${currentStep === 2 ? 'border-blue-500 shadow-lg' : isStep2Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}>
            <button 
              onClick={() => setCurrentStep(2)}
              className="w-full text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isStep2Complete ? 'bg-green-500 text-white' : currentStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  {isStep2Complete ? '✓' : '2'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">💼 გარიგების ტიპი</h3>
                  <p className="text-sm text-slate-500">როგორ გსურთ განთავსება?</p>
                </div>
                {isStep2Complete && <span className="ml-auto text-green-600 font-medium">{DEAL_TYPES.find(d => d.value === dealType)?.label}</span>}
              </div>
            </button>
            
            {currentStep === 2 && (
              <div className="grid grid-cols-5 gap-3 mt-4">
                {DEAL_TYPES.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setDealType(item.value);
                      setCurrentStep(3);
                    }}
                    className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                      dealType === item.value 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-3xl mb-2">{item.icon}</div>
                    <div className="font-medium text-slate-700 text-sm">{item.label}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ეტაპი 3: მდებარეობა */}
          <div className={`rounded-xl border-2 transition-all ${currentStep === 3 ? 'border-blue-500 shadow-lg' : isStep3Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}>
            <button 
              onClick={() => setCurrentStep(3)}
              className="w-full text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isStep3Complete ? 'bg-green-500 text-white' : currentStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  {isStep3Complete ? '✓' : '3'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">📍 მდებარეობა</h3>
                  <p className="text-sm text-slate-500">სად მდებარეობს ქონება?</p>
                </div>
                {isStep3Complete && <span className="ml-auto text-green-600 font-medium">{city}{tbilisiDistrict && `, ${tbilisiDistrict}`}</span>}
              </div>
            </button>
            
            {currentStep === 3 && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">🏙️ ქალაქი</label>
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
                      placeholder="აირჩიეთ ქალაქი" 
                    />
                  </div>
                  {city.toLowerCase() !== 'თბილისი' ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">🗺️ რეგიონი</label>
                      <select 
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
                        value={region} 
                        onChange={(e) => setRegion(e.target.value)}
                      >
                        <option value="">აირჩიეთ რეგიონი</option>
                        {GEORGIAN_REGIONS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-end">
                      <div className="w-full rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-blue-700">
                        📍 რეგიონი: თბილისი
                      </div>
                    </div>
                  )}
                </div>

                {city.toLowerCase() === 'თბილისი' && (
                  <TbilisiDistrictSelector
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
                    შემდეგი ეტაპი →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ეტაპი 4: რუკა */}
          <div className={`rounded-xl border-2 transition-all ${currentStep === 4 ? 'border-blue-500 shadow-lg' : isStep4Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}>
            <button 
              onClick={() => setCurrentStep(4)}
              className="w-full text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isStep4Complete ? 'bg-green-500 text-white' : currentStep === 4 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  {isStep4Complete ? '✓' : '4'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">🗺️ რუკაზე მონიშვნა</h3>
                  <p className="text-sm text-slate-500">მიუთითეთ ზუსტი ადგილმდებარეობა</p>
                </div>
                {isStep4Complete && <span className="ml-auto text-green-600 font-medium">📍 მონიშნულია</span>}
              </div>
            </button>
            
            {currentStep === 4 && (
              <div className="space-y-4 mt-4">
                {/* საკადასტრო კოდი */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <label className="block text-sm font-medium text-slate-700 mb-2">📋 საკადასტრო კოდი (არასავალდებულო)</label>
                  <input 
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="მაგ: 01.19.14.007.001"
                    value={cadastralCode}
                    onChange={(e) => setCadastralCode(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-2">საკადასტრო კოდი შეგიძლიათ იხილოთ საჯარო რეესტრის ვებგვერდზე</p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-medium text-slate-700 mb-2">🔍 მისამართის ძებნა</div>
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

                <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height: '350px' }}>
                  <MapView 
                    properties={previewProps} 
                    selectedLocation={lat !== null && lng !== null ? { lat, lng } : null}
                    center={lat !== null && lng !== null ? { lat, lng } : undefined}
                    zoom={lat !== null && lng !== null ? 17 : undefined}
                    onPick={(a, b) => {
                      setLat(a);
                      setLng(b);
                    }} 
                  />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <span className="text-2xl">💡</span>
                  <div className="text-sm text-blue-700">
                    ჯერ მოძებნეთ ქუჩა, შემდეგ რუკაზე დააკლიკეთ ზუსტი ადგილის მისათითებლად
                  </div>
                </div>

                {lat !== null && lng !== null && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <span className="text-green-700 text-sm">
                      ✅ კოორდინატები: {lat.toFixed(5)}, {lng.toFixed(5)}
                    </span>
                  </div>
                )}

                {isStep4Complete && (
                  <button 
                    onClick={() => setCurrentStep(5)}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    შემდეგი ეტაპი →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ეტაპი 5: დეტალები */}
          <div className={`rounded-xl border-2 transition-all ${currentStep === 5 ? 'border-blue-500 shadow-lg' : isStep5Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}>
            <button 
              onClick={() => setCurrentStep(5)}
              className="w-full text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isStep5Complete ? 'bg-green-500 text-white' : currentStep === 5 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  {isStep5Complete ? '✓' : '5'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">📝 დეტალები</h3>
                  <p className="text-sm text-slate-500">ქონების აღწერა და პარამეტრები</p>
                </div>
                {isStep5Complete && <span className="ml-auto text-green-600 font-medium">{price} {priceCurrency === 'USD' ? '$' : '₾'} • {sqm} კვ.მ</span>}
              </div>
            </button>
            
            {currentStep === 5 && (
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">✏️ სათაური</label>
                  <input 
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
                    placeholder="მაგ: 3-ოთახიანი ბინა ვაკეში" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">📄 აღწერა</label>
                  <textarea
                    className="w-full min-h-[120px] rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="დაწერეთ დეტალური აღწერა..."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">💵 ფასი</label>
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
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">📐 ფართობი (კვ.მ)</label>
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">� ტელეფონი</label>
                    <input 
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
                      placeholder="+995 ..." 
                      value={contactPhone} 
                      onChange={(e) => setContactPhone(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">📧 ელ-ფოსტა</label>
                    <input 
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" 
                      placeholder="email@example.com" 
                      value={contactEmail} 
                      onChange={(e) => setContactEmail(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-sm text-slate-500 mb-2">🔮 3D ტურის ბმულები (არასავალდებულო)</p>
                  <p className="text-xs text-slate-400 mb-3">
                    მხარდაჭერილია: YouTube, Matterport, Kuula, Supersplat და სხვა embed ლინკები
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      className="rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="ექსტერიერის 3D/ვიდეო ბმული"
                      value={exteriorLink}
                      onChange={(e) => setExteriorLink(e.target.value)}
                    />
                    <input
                      className="rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder="ინტერიერის 3D/ვიდეო ბმული"
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
                    შემდეგი ეტაპი →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ეტაპი 6: დეტალური ინფორმაცია */}
          <div className={`rounded-xl border-2 transition-all ${currentStep === 6 ? 'border-blue-500 shadow-lg' : isStep6Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}>
            <button 
              onClick={() => setCurrentStep(6)}
              className="w-full text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isStep6Complete ? 'bg-green-500 text-white' : currentStep === 6 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  {isStep6Complete ? '✓' : '6'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">🔧 დეტალური ინფორმაცია</h3>
                  <p className="text-sm text-slate-500">ოთახები, კომუნიკაციები და სხვა (არასავალდებულო)</p>
                </div>
                {roomCount !== null && <span className="ml-auto text-green-600 font-medium">{roomCount} ოთახი</span>}
              </div>
            </button>
            
            {currentStep === 6 && (
              <div className="space-y-6 mt-4">
                {/* ოთახების რაოდენობა */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">🚪 ოთახების რაოდენობა</label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setRoomCount(num)}
                        className={`w-12 h-12 rounded-xl border-2 font-bold text-lg transition-all hover:scale-105 ${
                          roomCount === num
                            ? 'border-blue-500 bg-blue-500 text-white shadow-md'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setRoomCount(10)}
                      className={`px-4 h-12 rounded-xl border-2 font-bold transition-all hover:scale-105 ${
                        roomCount === 10
                          ? 'border-blue-500 bg-blue-500 text-white shadow-md'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                      }`}
                    >
                      9+
                    </button>
                  </div>
                </div>

                {/* სართული (ბინის შემთხვევაში) */}
                {type === 'apartment' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">🏢 სართული</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">რომელ სართულზეა</label>
                        <input
                          type="number"
                          min="1"
                          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          placeholder="მაგ: 5"
                          value={floor}
                          onChange={(e) => setFloor(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">სულ სართულები</label>
                        <input
                          type="number"
                          min="1"
                          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          placeholder="მაგ: 12"
                          value={totalFloors}
                          onChange={(e) => setTotalFloors(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* აივანი და ლოჯია */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">🌅 აივანი</label>
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
                    <label className="block text-sm font-medium text-slate-700 mb-3">🏠 ლოჯია</label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-3">🚿 სველი წერტილები (სააბაზანო/ტუალეტი)</label>
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
                      { key: 'security', label: 'დაცვა', icon: '🔒', state: security, setter: setSecurity },
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
                  <label className="block text-sm font-medium text-slate-700 mb-3">⚡ კომუნიკაციები</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {[
                      { key: 'centralHeating', label: 'ცენტრ. გათბობა', icon: '🌡️', state: centralHeating, setter: setCentralHeating },
                      { key: 'naturalGas', label: 'ბუნებრივი აირი', icon: '🔥', state: naturalGas, setter: setNaturalGas },
                      { key: 'internet', label: 'ინტერნეტი', icon: '📶', state: internet, setter: setInternet },
                      { key: 'electricity', label: 'ელექტროობა', icon: '💡', state: electricity, setter: setElectricity },
                      { key: 'water', label: 'წყალი', icon: '💧', state: water, setter: setWater },
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
                  შემდეგი ეტაპი →
                </button>
              </div>
            )}
          </div>

          {/* ეტაპი 7: ფოტოები */}
          <div className={`rounded-xl border-2 transition-all ${currentStep === 7 ? 'border-blue-500 shadow-lg' : isStep7Complete ? 'border-green-300 bg-green-50/50' : 'border-slate-200'} bg-white p-5`}>
            <button 
              onClick={() => setCurrentStep(7)}
              className="w-full text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isStep7Complete ? 'bg-green-500 text-white' : currentStep === 7 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                  {isStep7Complete ? '✓' : '7'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">📷 ფოტოები</h3>
                  <p className="text-sm text-slate-500">ატვირთეთ ქონების ფოტოები</p>
                </div>
                {isStep7Complete && <span className="ml-auto text-green-600 font-medium">{photos?.length} ფოტო</span>}
              </div>
            </button>
            
            {currentStep === 7 && (
              <div className="space-y-4 mt-4">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                  <div className="text-5xl mb-3">📸</div>
                  <p className="text-slate-600 mb-4">აირჩიეთ ფოტოები ან ჩააგდეთ აქ</p>
                  <input 
                    className="hidden" 
                    id="photo-upload"
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={(e) => handlePhotoSelect(e.target.files)} 
                  />
                  <label 
                    htmlFor="photo-upload"
                    className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium cursor-pointer hover:bg-blue-700 transition-colors"
                  >
                    ფოტოების არჩევა
                  </label>
                </div>

                {/* ფოტოების პრევიუ გალერეა */}
                {photoPreviews.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">
                        ✅ არჩეულია {photoPreviews.length} ფოტო
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPhotos(null);
                          setPhotoPreviews([]);
                          setMainPhotoIndex(0);
                        }}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        ყველას წაშლა
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">💡 დააკლიკეთ ფოტოს მთავარ სურათად დასანიშნად</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {photoPreviews.map((preview, index) => (
                        <div 
                          key={index} 
                          className={`relative group aspect-square cursor-pointer ${index === mainPhotoIndex ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                          onClick={() => setAsMainPhoto(index)}
                        >
                          <img
                            src={preview}
                            alt={`ფოტო ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg border border-slate-200"
                          />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removePhoto(index); }}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            ✕
                          </button>
                          {index === mainPhotoIndex && (
                            <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
                              ⭐ მთავარი
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                იტვირთება...
              </span>
            ) : (
              <span>🚀 გამოქვეყნება</span>
            )}
          </button>
        </div>

        {/* მარჯვენა პანელი - პროგრესი */}
        <div className="lg:sticky lg:top-4 h-fit">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              📋 შევსების პროგრესი
            </h3>

            {/* პროგრეს ბარი */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600">შესრულებულია</span>
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
                      <span>{PROPERTY_TYPES.find(t => t.value === type)?.label}</span>
                    </div>
                  )}
                  {dealType && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>{DEAL_TYPES.find(d => d.value === dealType)?.icon}</span>
                      <span>{DEAL_TYPES.find(d => d.value === dealType)?.label}</span>
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
                  {photos && photos.length > 0 && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>📷</span>
                      <span>{photos.length} ფოტო</span>
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
