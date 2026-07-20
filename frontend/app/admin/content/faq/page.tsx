'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** ძველი ადმინ URL — რედაქტირება ახლა /faq გვერდზეა */
export default function AdminFaqContentRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/faq');
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 text-gray-600">
      გადამისამართება FAQ გვერდზე...
    </div>
  );
}
