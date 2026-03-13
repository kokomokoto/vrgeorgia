'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function MortgageCalculatorPage() {
  const { t } = useTranslation();
  
  const [price, setPrice] = useState<number>(100000);
  const [downPayment, setDownPayment] = useState<number>(20);
  const [interestRate, setInterestRate] = useState<number>(9.5);
  const [years, setYears] = useState<number>(15);
  const [currency, setCurrency] = useState<'USD' | 'GEL'>('USD');

  // Calculate monthly payment
  const loanAmount = price - (price * downPayment / 100);
  const monthlyRate = interestRate / 100 / 12;
  const numberOfPayments = years * 12;
  
  let monthlyPayment = 0;
  let totalPayment = 0;
  let totalInterest = 0;
  
  if (monthlyRate > 0 && numberOfPayments > 0) {
    monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
                     (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    totalPayment = monthlyPayment * numberOfPayments;
    totalInterest = totalPayment - loanAmount;
  }
  
  const currencySymbol = currency === 'GEL' ? '₾' : '$';
  
  const formatNumber = (num: number) => {
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-2xl px-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('mortgageCalculator')}</h1>
        
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {/* Currency Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                currency === 'USD' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrency('GEL')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                currency === 'GEL' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              GEL (₾)
            </button>
          </div>
          
          {/* Price */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('propertyPrice')} ({currencySymbol})
            </label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(Number(e.target.value))}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="range"
              min="10000"
              max="2000000"
              step="10000"
              value={price}
              onChange={e => setPrice(Number(e.target.value))}
              className="w-full mt-2"
            />
          </div>
          
          {/* Down Payment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('downPayment')} ({downPayment}% = {currencySymbol}{formatNumber(price * downPayment / 100)})
            </label>
            <input
              type="range"
              min="0"
              max="80"
              step="5"
              value={downPayment}
              onChange={e => setDownPayment(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0%</span>
              <span>40%</span>
              <span>80%</span>
            </div>
          </div>
          
          {/* Interest Rate */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('interestRate')} ({interestRate}%)
            </label>
            <input
              type="range"
              min="1"
              max="25"
              step="0.1"
              value={interestRate}
              onChange={e => setInterestRate(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>1%</span>
              <span>13%</span>
              <span>25%</span>
            </div>
          </div>
          
          {/* Loan Term */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('loanTerm')} ({years} {t('years')})
            </label>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={years}
              onChange={e => setYears(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>1</span>
              <span>15</span>
              <span>30</span>
            </div>
          </div>
          
          {/* Results */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-slate-600">{t('loanAmount')}</p>
                <p className="text-xl font-bold text-slate-900">{currencySymbol}{formatNumber(loanAmount)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-slate-600">{t('monthlyPayment')}</p>
                <p className="text-xl font-bold text-green-700">{currencySymbol}{formatNumber(monthlyPayment)}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-600">{t('totalPayment')}</p>
                <p className="text-lg font-semibold text-slate-900">{currencySymbol}{formatNumber(totalPayment)}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm text-slate-600">{t('totalInterest')}</p>
                <p className="text-lg font-semibold text-red-700">{currencySymbol}{formatNumber(totalInterest)}</p>
              </div>
            </div>
          </div>
          
          {/* Amortization Schedule Preview */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('paymentSchedule')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="pb-2">{t('year')}</th>
                    <th className="pb-2">{t('principal')}</th>
                    <th className="pb-2">{t('interest')}</th>
                    <th className="pb-2">{t('balance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.min(years, 5) }, (_, i) => {
                    const year = i + 1;
                    let balance = loanAmount;
                    let yearlyPrincipal = 0;
                    let yearlyInterest = 0;
                    
                    // Calculate through each month up to this year
                    for (let m = 1; m <= year * 12; m++) {
                      const interestPayment = balance * monthlyRate;
                      const principalPayment = monthlyPayment - interestPayment;
                      
                      if (m > (year - 1) * 12) {
                        yearlyPrincipal += principalPayment;
                        yearlyInterest += interestPayment;
                      }
                      
                      balance -= principalPayment;
                    }
                    
                    return (
                      <tr key={year} className="border-b border-slate-100">
                        <td className="py-2">{year}</td>
                        <td className="py-2">{currencySymbol}{formatNumber(yearlyPrincipal)}</td>
                        <td className="py-2">{currencySymbol}{formatNumber(yearlyInterest)}</td>
                        <td className="py-2">{currencySymbol}{formatNumber(Math.max(0, balance))}</td>
                      </tr>
                    );
                  })}
                  {years > 5 && (
                    <tr className="text-slate-400">
                      <td colSpan={4} className="py-2 text-center">... {years - 5} {t('moreYears')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Disclaimer */}
        <p className="mt-4 text-xs text-slate-500 text-center">
          {t('mortgageDisclaimer')}
        </p>
      </div>
    </main>
  );
}
