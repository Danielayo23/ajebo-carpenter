'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type HeroPayload = {
  images: string[];
};

export default function WelcomePage() {
  const [showWelcome, setShowWelcome] = useState(false);

  // slideshow state
  const [images, setImages] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // welcome overlay (unchanged)
  useEffect(() => {
    const hasSeenWelcome = sessionStorage.getItem('ajebo_welcome_seen');

    if (!hasSeenWelcome) {
      setShowWelcome(true);

      const timer = setTimeout(() => {
        setShowWelcome(false);
        sessionStorage.setItem('ajebo_welcome_seen', 'true');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  // fetch slideshow images
  useEffect(() => {
    let cancelled = false;

    async function loadHero() {
      try {
        const res = await fetch('/api/hero-slideshow', { cache: 'no-store' });
        const data = (await res.json()) as HeroPayload;

        const imgs = Array.isArray(data?.images) ? data.images.filter(Boolean) : [];

        if (cancelled) return;
        setImages(imgs);
        setActiveIndex(0);
        setLoaded(true);
      } catch {
        if (cancelled) return;
        setImages([]);
        setLoaded(true);
      }
    }

    loadHero();

    return () => {
      cancelled = true;
    };
  }, []);

  // rotate images every 6s (premium pacing)
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % images.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [images]);

  const fallbackBg = useMemo(
    () => 'linear-gradient(to bottom right, #f3f4f6, #e5e7eb)',
    []
  );

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Welcome Overlay */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white animate-fade-in">
          <div className="text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              <h1 className="text-5xl font-bold text-[#04209d]">Welcome!</h1>
              <span className="text-5xl animate-bounce">🎉</span>
            </div>

            <p className="text-lg text-gray-600">
              We have the best furniture at your service…
            </p>

            <div className="mt-8 flex justify-center gap-2">
              <span className="dot" />
              <span className="dot delay-100" />
              <span className="dot delay-200" />
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main
        className={`transition-opacity duration-500 ${
          showWelcome ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Hero Section */}
        <section className="relative flex min-h-screen items-center justify-center bg-gray-50">
          {/* Outer padding to create space from screen edges */}
          <div className="relative h-[88vh] w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            {/* Rounded hero container */}
            <div className="relative h-full w-full overflow-hidden rounded-3xl">
              {/* Slideshow background */}
              <div className="absolute inset-0">
                {images.length === 0 ? (
                  <div className="h-full w-full" style={{ backgroundImage: fallbackBg }} />
                ) : (
                  images.map((url, i) => {
                    const active = i === activeIndex;

                    return (
                      <div
                        key={`${url}-${i}`}
                        className={[
                          'absolute inset-0 bg-cover bg-center',
                          'transition-opacity duration-[1600ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                          active ? 'opacity-100' : 'opacity-0',
                        ].join(' ')}
                      >
                        <div
                          className={['h-full w-full bg-cover bg-center', active ? 'kenburns' : ''].join(' ')}
                          style={{ backgroundImage: `url(${url})` }}
                        />
                      </div>
                    );
                  })
                )}

                {/* readability overlays */}
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 backdrop-blur-[1px]" />
              </div>

              {/* CTA – pushed closer to bottom */}
              <div className="relative z-10 flex h-full items-end justify-center pb-10 sm:pb-12">
                <div className="rounded-xl bg-white/80 px-0 py-0 text-center backdrop-blur-md shadow-sm">
                  <Link
                    href="/categories"
                    className="inline-block  bg-[#04209d] px-10 py-4 text-lg font-semibold text-white transition hover:opacity-100"
                  >
                    Shop Collection →
                  </Link>
                </div>
              </div>

              {/* Scoped CSS */}
              <style jsx>{`
                @keyframes kenburns {
                  0% {
                    transform: scale(1) translate3d(0px, 0px, 0px);
                  }
                  100% {
                    transform: scale(1.06) translate3d(-10px, -6px, 0px);
                  }
                }
                .kenburns {
                  animation: kenburns 6.4s ease-in-out forwards;
                  will-change: transform;
                }
              `}</style>
            </div>
          </div>
        </section>

        {loaded ? null : null}
      </main>
    </div>
  );
}
