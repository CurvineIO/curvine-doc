'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { HomepageIcon } from '@/components/homepage-icons';

export interface ScenarioSlide {
  /** Gif path under /img (mirrored from the Docusaurus `static/` tree). */
  src: string;
  title: string;
  description: string;
}

const SCROLL_STEP_RATIO = 0.85;

/**
 * Horizontal scenario gallery for the "Why Choose Curvine" section: the six
 * use-case gifs (960×540) are laid out in a snap-scrolling row, with prev/next
 * buttons and dots. Scroll-snap + `overflow-x: auto` keeps it touch-friendly;
 * the buttons just nudge the same scroll container.
 */
export function ScenarioGallery({ slides }: { slides: ScenarioSlide[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    setCanPrev(scrollLeft > 4);
    setCanNext(scrollLeft < scrollWidth - clientWidth - 4);
    const step = track.querySelector<HTMLElement>('[data-gallery-item]');
    const itemWidth = step ? step.offsetWidth + 22 : 1; // card + column gap
    setActiveIndex(Math.min(slides.length - 1, Math.round(scrollLeft / itemWidth)));
  }, [slides.length]);

  useEffect(() => {
    updateState();
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener('scroll', updateState, { passive: true });
    window.addEventListener('resize', updateState);
    return () => {
      track.removeEventListener('scroll', updateState);
      window.removeEventListener('resize', updateState);
    };
  }, [updateState]);

  const scrollBy = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * track.clientWidth * SCROLL_STEP_RATIO,
      behavior: 'smooth',
    });
  };

  const scrollToIndex = (index: number) => {
    const track = trackRef.current;
    const item = track?.querySelectorAll<HTMLElement>('[data-gallery-item]')[index];
    if (item) item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  };

  return (
    <div className="scenario-gallery">
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
          onClick={() => scrollBy(-1)}
          disabled={!canPrev}
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
              onClick={() => scrollToIndex(index)}
            />
          ))}
        </div>
        <button
          type="button"
          className="gallery-arrow"
          onClick={() => scrollBy(1)}
          disabled={!canNext}
          aria-label="Next"
        >
          <HomepageIcon name="arrowRight" className="gallery-arrow-icon" />
        </button>
      </div>
    </div>
  );
}
