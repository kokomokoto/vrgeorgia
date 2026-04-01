'use client';

import React, { useState, useRef, useEffect } from 'react';

// პოპულარული ქალაქების სია
const POPULAR_CITIES = [
  'თბილისი',
  'ბათუმი',
  'ქუთაისი',
  'რუსთავი',
  'გორი',
  'ზუგდიდი',
  'ფოთი',
  'თელავი',
  'ახალციხე',
  'მცხეთა',
  'ოზურგეთი',
  'მარნეული',
  'კასპი',
  'ზესტაფონი',
  'ხაშური',
  'სამტრედია',
  'სენაკი',
  'ქობულეთი',
  'წყალტუბო',
  'ბორჯომი',
  'საჩხერე',
  'ჭიათურა',
  'ტყიბული',
  'გურჯაანი',
  'საგარეჯო',
  'სიღნაღი',
  'დედოფლისწყარო',
  'ლაგოდეხი',
  'ბოლნისი',
  'გარდაბანი',
  'თეთრიწყარო',
  'დმანისი',
  'წალკა'
];

interface CityComboboxProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  anyLabel?: string;
}

export function CityCombobox({ value, onChange, label = 'ქალაქი', anyLabel = 'ყველა' }: CityComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ფილტრირებული სია — ცარიელი search = ყველა ქალაქი
  const filteredCities = search
    ? POPULAR_CITIES.filter(city => city.toLowerCase().includes(search.toLowerCase()))
    : POPULAR_CITIES;

  // click outside → დახურვა
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // dropdown გახსნისას input-ზე ფოკუსი
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // timeout რომ ბრაუზერმა მოასწროს render
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    setSearch('');
  };

  const handleSelect = (city: string) => {
    onChange(city);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim()) {
      if (filteredCities.length === 1) {
        handleSelect(filteredCities[0]);
      } else {
        handleSelect(search.trim());
      }
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
    }
  };

  const isActive = !!value;

  return (
    <div ref={containerRef} className="relative">
      {/* ღილაკი — FilterDropdown-ის იდენტური სტილი */}
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all ${
          isActive
            ? 'border-blue-400 bg-blue-50 text-blue-700'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
        }`}
      >
        <div className="text-left min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">{label}</div>
          <div className={`truncate font-medium ${isActive ? 'text-blue-700' : 'text-slate-800'}`}>
            {value || anyLabel}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isActive && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => { if (e.key === 'Enter') handleClear(e as unknown as React.MouseEvent); }}
              className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
            >
              ✕
            </span>
          )}
          <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* ჩამოშლადი პანელი */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg min-w-[260px] overflow-hidden">
          {/* საძიებო input */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                className="w-full rounded-md border border-slate-200 pl-8 pr-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                placeholder="ჩაწერეთ ქალაქი..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
              />
            </div>
          </div>

          {/* ქალაქების სია */}
          <div className="max-h-52 overflow-y-auto">
            {filteredCities.length > 0 ? (
              filteredCities.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => handleSelect(city)}
                  className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                    value === city
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {value === city && <span className="mr-1.5">✓</span>}
                  {city}
                </button>
              ))
            ) : search.trim() ? (
              <div className="px-3 py-4 text-center">
                <div className="text-sm text-slate-500 mb-2">ვერ მოიძებნა</div>
                <button
                  type="button"
                  onClick={() => handleSelect(search.trim())}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  გამოიყენე &ldquo;{search.trim()}&rdquo;
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
