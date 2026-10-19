'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** ძველი ადმინ URL — რედაქტირება ახლა /services გვერდზეა */
export default function AdminServicesContentRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/services');
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 text-gray-600">
      გადამისამართება მომსახურებების გვერდზე...
    </div>
  );
}
