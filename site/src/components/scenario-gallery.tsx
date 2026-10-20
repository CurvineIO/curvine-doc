'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { HomepageIcon } from '@/components/homepage-icons';

export interface ScenarioSlide {
  /** Gif path under /img (mirrored from the Docusaurus `static/` tree). */
  src: string;
  title: string;
  description: string;
}

const AUTOPLAY_INTERVAL_MS = 5000;
/** How long autoplay stays suspended after a manual interaction. */
const USER_PAUSE_MS = 8000;

/**
 * Horizontal scenario gallery for the "Why Choose Curvine" section: the six
 * use-case gifs (960×540) are laid out in a snap-scrolling row.
 *
 * Navigation always scrolls to an exact snap point (a card's offset) —
 * `scrollBy` + `scroll-snap-type: x mandatory` makes Chromium cancel the
 * smooth scroll and snap back, which is why arrows must not use it.
 *
 * Autoplay advances one card every few seconds; it is suspended while the
 * gallery is off-screen, hovered/focused, after user interaction, when the
 * tab is hidden, and for `prefers-reduced-motion` users.
 */
export function ScenarioGallery({ slides }: { slides: ScenarioSlide[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const hoverPauseRef = useRef(false);
  const userPauseUntilRef = useRef(0);

  /** Card offsets relative to the track's scroll origin. */
  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return [] as { left: number }[];
    const els = Array.from(track.querySelectorAll<HTMLElement>('[data-gallery-item]'));
    const origin = els[0]?.offsetLeft ?? 0;
    return els.map((el) => ({ left: el.offsetLeft - origin }));
  }, []);

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const setActive = useCallback((index: number) => {
    activeIndexRef.current = index;
    setActiveIndex(index);
  }, []);

  const scrollToIndex = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const items = measure();
      if (!items.length) return;
      const count = items.length;
      const next = ((index % count) + count) % count;
      track.scrollTo({
        left: items[next].left,
        // Exact snap positions keep `mandatory` snap happy with smooth scrolling.
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
      setActive(next);
    },
    [measure, setActive],
  );

  /** Derive the active card from the current scroll position (user drags). */
  const syncFromScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const items = measure();
    if (!items.length) return;
    let nearest = 0;
    let best = Infinity;
    items.forEach((item, i) => {
      const d = Math.abs(item.left - track.scrollLeft);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    // Pin the last card once the track is scrolled to its end.
    if (track.scrollLeft >= track.scrollWidth - track.clientWidth - 4) {
      nearest = items.length - 1;
    }
    setActive(nearest);
  }, [measure, setActive]);

  // Keep the dots in sync while the user drags/scrolls the track.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => syncFromScroll();
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, [syncFromScroll]);

  // Autoplay: advance one card per tick while visible and not interrupted.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let inView = true;
    const io = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.35 },
    );
    io.observe(track);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const timer = window.setInterval(() => {
      if (
        !inView ||
        document.hidden ||
        reducedMotion.matches ||
        hoverPauseRef.current ||
        Date.now() < userPauseUntilRef.current
      ) {
        return;
      }
      const items = measure();
      if (!items.length) return;
      const atEnd = activeIndexRef.current >= items.length - 1;
      scrollToIndex(atEnd ? 0 : activeIndexRef.current + 1);
    }, AUTOPLAY_INTERVAL_MS);

    return () => {
      io.disconnect();
      window.clearInterval(timer);
    };
  }, [measure, scrollToIndex]);

  const markUserInteraction = () => {
    userPauseUntilRef.current = Date.now() + USER_PAUSE_MS;
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- container only suspends autoplay
    <div
      className="scenario-gallery"
      onMouseEnter={() => {
        hoverPauseRef.current = true;
      }}
      onMouseLeave={() => {
        hoverPauseRef.current = false;
      }}
      onFocus={() => {
        hoverPauseRef.current = true;
      }}
      onBlur={() => {
        hoverPauseRef.current = false;
      }}
      onPointerDown={() => markUserInteraction()}
      onWheel={() => markUserInteraction()}
    >
      <div className="gallery-viewport">
        <div className="gallery-track" ref={trackRef}>
          {slides.map((slide) => (
            <figure className="gallery-card" key={slide.src} data-gallery-item>
              <div className="gallery-media">
                {/* eslint-disable-next-line @next/next/no-img-element -- static export, unoptimized images */}
                <img src={slide.src} alt={slide.title} loading="lazy" draggable={false} />
              </div>
              <figcaption className="gallery-caption">
                <h3>{slide.title}</h3>
                <p>{slide.description}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      <div className="gallery-controls">
        <button
          type="button"
          className="gallery-arrow"
          onClick={() => scrollToIndex(activeIndexRef.current - 1)}
          aria-label="Previous"
        >
          <HomepageIcon name="arrowRight" className="gallery-arrow-icon flipped" />
        </button>
        <div className="gallery-dots" role="tablist">
          {slides.map((slide, index) => (
            <button
              type="button"
              key={slide.src}
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={slide.title}
              className={index === activeIndex ? 'gallery-dot active' : 'gallery-dot'}
              onClick={() => {
                markUserInteraction();
                scrollToIndex(index);
              }}
            />
          ))}
        </div>
        <button
          type="button"
          className="gallery-arrow"
          onClick={() => scrollToIndex(activeIndexRef.current + 1)}
          aria-label="Next"
        >
          <HomepageIcon name="arrowRight" className="gallery-arrow-icon" />
        </button>
      </div>
    </div>
  );
}
