'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** ძველი ადმინ URL — რედაქტირება ახლა /about გვერდზეა */
export default function AdminAboutContentRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/about');
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 text-gray-600">
      გადამისამართება About გვერდზე...
    </div>
  );
}
