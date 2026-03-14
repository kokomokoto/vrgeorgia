'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getAgent, getAgentProperties, getAgentReviews, addAgentReview, Agent, AgentReview, Property, resolveImageUrl } from '@/lib/api';
import { PropertyCard } from '@/components/PropertyCard';

export default function AgentProfilePage() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const agentId = params.id as string;
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [reviews, setReviews] = useState<AgentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewScore, setReviewScore] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAgentData();
  }, [agentId]);

  async function loadAgentData() {
    try {
      setLoading(true);
      const [agentData, propsData, reviewsData] = await Promise.all([
        getAgent(agentId),
        getAgentProperties(agentId),
        getAgentReviews(agentId)
      ]);
      setAgent(agentData);
      setProperties(propsData.properties);
      setReviews(reviewsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addAgentReview(agentId, reviewScore, reviewText);
      setShowReviewForm(false);
      setReviewText('');
      setReviewScore(5);
      // Reload reviews
      const reviewsData = await getAgentReviews(agentId);
      setReviews(reviewsData);
      // Reload agent to get updated rating
      const agentData = await getAgent(agentId);
      setAgent(agentData);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function StarRating({ rating, interactive = false, onSelect }: { rating: number; interactive?: boolean; onSelect?: (r: number) => void }) {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onSelect?.(star)}
            className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}
          >
            <svg
              className={`w-5 h-5 ${star <= rating ? 'text-yellow-400' : 'text-slate-300'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
        {!interactive && <span className="ml-2 text-slate-600">({rating.toFixed(1)})</span>}
      </div>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !agent) {
    return (
      <main className="min-h-screen bg-slate-50 py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error || 'Agent not found'}</div>
        </div>
      </main>
    );
  }

  const currentLang = i18n.language as keyof typeof agent.bio;
  const bio = agent.bio[currentLang] || agent.bio.en || agent.bio.ka;

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl px-4">
        {/* Agent Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Photo */}
            <div className="w-32 h-32 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 mx-auto md:mx-0">
              {agent.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={resolveImageUrl(agent.photo)} 
                  alt={agent.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            
            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{agent.name}</h1>
                {agent.verified && (
                  <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              
              {agent.company && (
                <p className="text-slate-500 mt-1">{agent.company}</p>
              )}
              
              <div className="mt-3 flex items-center justify-center md:justify-start gap-4">
                <StarRating rating={agent.avgRating} />
                <span className="text-sm text-slate-500">{agent.totalReviews} {t('reviews')}</span>
              </div>
              
              {/* Contact */}
              <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-4">
                <a 
                  href={`tel:${agent.phone}`} 
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {agent.phone}
                </a>
                <a 
                  href={`mailto:${agent.email}`} 
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {agent.email}
                </a>
              </div>
              
              {/* Specializations & Experience */}
              <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-2">
                {agent.specializations.map(spec => (
                  <span key={spec} className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                    {t(spec)}
                  </span>
                ))}
                {agent.experience > 0 && (
                  <span className="text-sm bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                    {agent.experience} {t('yearsExperience')}
                  </span>
                )}
              </div>
              
              {/* Languages */}
              {agent.languages.length > 0 && (
                <div className="mt-3 flex items-center justify-center md:justify-start gap-2 text-sm text-slate-500">
                  <span>{t('languages')}:</span>
                  {agent.languages.map(lang => (
                    <span key={lang} className="uppercase">{lang}</span>
                  ))}
                </div>
              )}
              
              {/* Areas */}
              {agent.areas.length > 0 && (
                <div className="mt-2 text-sm text-slate-500">
                  <span>{t('areas')}: {agent.areas.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Bio */}
          {bio && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h3 className="text-lg font-semibold mb-2">{t('about')}</h3>
              <p className="text-slate-600 whitespace-pre-line">{bio}</p>
            </div>
          )}
        </div>
        
        {/* Properties */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">{t('agentProperties')}</h2>
          {properties.length === 0 ? (
            <p className="text-slate-500">{t('noProperties')}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map(prop => (
                <PropertyCard key={prop._id} p={prop} />
              ))}
            </div>
          )}
        </div>
        
        {/* Reviews */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">{t('reviews')}</h2>
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showReviewForm ? t('cancel') : t('writeReview')}
            </button>
          </div>
          
          {/* Review Form */}
          {showReviewForm && (
            <form onSubmit={handleSubmitReview} className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('yourRating')}</label>
                <StarRating rating={reviewScore} interactive onSelect={setReviewScore} />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('yourReview')}</label>
                <textarea
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('reviewPlaceholder')}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? '...' : t('submitReview')}
              </button>
            </form>
          )}
          
          {/* Reviews List */}
          {reviews.length === 0 ? (
            <p className="text-slate-500">{t('noReviews')}</p>
          ) : (
            <div className="space-y-4">
              {reviews.map(review => (
                <div key={review._id} className="bg-white rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-sm">
                        {review.user.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="font-medium text-slate-900">{review.user.username || 'User'}</span>
                    </div>
                    <span className="text-sm text-slate-500">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <StarRating rating={review.score} />
                  {review.review && (
                    <p className="mt-2 text-slate-600">{review.review}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
