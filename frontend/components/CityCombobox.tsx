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
  placeholder?: string;
  className?: string;
}

export function CityCombobox({ value, onChange, placeholder = 'ქალაქი', className = '' }: CityComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ფილტრირებული სია
  const filteredCities = POPULAR_CITIES.filter(city => 
    city.toLowerCase().includes(search.toLowerCase())
  );

  // sync search with value
  useEffect(() => {
    setSearch(value);
  }, [value]);

  // click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (city: string) => {
    setSearch(city);
    onChange(city);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    onChange(val);
    setIsOpen(true);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        className={`w-full rounded-md border border-slate-200 px-3 py-2 text-sm ${className}`}
        placeholder={placeholder}
        value={search}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        autoComplete="off"
      />
      
      {isOpen && filteredCities.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg"
        >
          {filteredCities.map((city) => (
            <button
              key={city}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 focus:bg-slate-100"
              onClick={() => handleSelect(city)}
            >
              {city}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
