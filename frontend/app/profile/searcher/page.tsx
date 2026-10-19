'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** მაძებრის აგენტების სია ახლა პროფილის გვერდზეა */
export default function SearcherAgentsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/profile');
  }, [router]);
  return <div className="text-sm text-slate-500">Loading…</div>;
}
