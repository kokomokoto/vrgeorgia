'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="text-8xl mb-4">⚠️</div>
      <h1 className="text-4xl font-bold text-slate-900 mb-2">შეცდომა</h1>
      <p className="text-lg text-slate-600 mb-6">რაღაც არასწორად წავიდა</p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        ხელახლა ცდა
      </button>
    </div>
  );
}
