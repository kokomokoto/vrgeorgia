"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { Tour } from "@/lib/types";
import { tourFetch } from "@/lib/tourApi";

function HomePageContent() {
  const searchParams = useSearchParams();
  const fromVrGeorgia = searchParams.get("from") === "vrgeorgia";
  const vrGeorgiaBooted = useRef(false);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await tourFetch("/api/tours");
      if (!res.ok) throw new Error("Failed to load tours");
      setTours(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error loading tours");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createTourForVrGeorgia = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/tours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "VR Georgia listing tour" }),
      });
      if (!res.ok) throw new Error("Failed to create tour");
      const tour = await res.json();
      window.location.replace(`/tours/${tour.id}/edit?embed=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error creating tour");
      setCreating(false);
    }
  }, []);

  useEffect(() => {
    if (!fromVrGeorgia || vrGeorgiaBooted.current) return;
    vrGeorgiaBooted.current = true;
    void createTourForVrGeorgia();
  }, [fromVrGeorgia, createTourForVrGeorgia]);

  async function createTour() {
    setCreating(true);
    setError(null);
    try {
      const res = await tourFetch("/api/tours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Tour ${tours.length + 1}` }),
      });
      if (!res.ok) throw new Error("Failed to create tour");
      const tour = await res.json();
      window.location.href = `/tours/${tour.id}/edit`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error creating tour");
      setCreating(false);
    }
  }

  async function deleteTour(id: string) {
    if (!confirm("Delete this tour and all its scenes?")) return;
    const res = await tourFetch(`/api/tours/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (fromVrGeorgia && creating) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-12">
        <p className="text-lg font-medium text-zinc-200">360° ტურის ასაწყობი იტვირთება…</p>
        {error && (
          <p className="mt-3 rounded-lg bg-red-950/50 px-4 py-2 text-sm text-red-300">{error}</p>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">360 Tour Builder</h1>
        <p className="mt-2 text-zinc-400">
          Create equirectangular virtual tours locally. Edit freely; publish when
          ready.
        </p>
      </header>

      <button
        type="button"
        onClick={createTour}
        disabled={creating}
        className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {creating ? "Creating…" : "+ New tour"}
      </button>

      {error && (
        <p className="mt-4 rounded-lg bg-red-950/50 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-zinc-300">Your tours</h2>
        {loading && <p className="text-zinc-500">Loading…</p>}
        {!loading && tours.length === 0 && (
          <p className="text-zinc-500">No tours yet. Create one to get started.</p>
        )}
        <ul className="space-y-3">
          {tours.map((tour) => (
            <li
              key={tour.id}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3"
            >
              <div>
                <Link
                  href={`/tours/${tour.id}/edit`}
                  className="font-medium text-white hover:text-blue-400"
                >
                  {tour.title}
                </Link>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Updated {new Date(tour.updated_at).toLocaleString()}
                  {tour.published_at && (
                    <span className="ml-2 text-green-500">
                      · Published {new Date(tour.published_at).toLocaleString()}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                {tour.published_at && (
                  <Link
                    href={`/v/${tour.id}`}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
                  >
                    View live
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => deleteTour(tour.id)}
                  className="rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-red-950/50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-12">
          <p className="text-zinc-400">Loading…</p>
        </main>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
