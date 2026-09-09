import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { Box, IconButton } from '@mui/material';
import type { Product } from '../types';
import { ProductCard } from './ProductCard';

interface ProductCarouselProps {
  products: Product[];
  ariaLabel?: string;
}

export function ProductCarousel({ products, ariaLabel = 'Productos destacados' }: ProductCarouselProps) {
  const carouselId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  const updateControls = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const maximumScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const threshold = 4;

    setCanScrollBack(viewport.scrollLeft > threshold);
    setCanScrollForward(viewport.scrollLeft < maximumScroll - threshold);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const animationFrame = window.requestAnimationFrame(updateControls);
    viewport.addEventListener('scroll', updateControls, { passive: true });
    window.addEventListener('resize', updateControls);

    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateControls);
    resizeObserver?.observe(viewport);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      viewport.removeEventListener('scroll', updateControls);
      window.removeEventListener('resize', updateControls);
      resizeObserver?.disconnect();
    };
  }, [products.length, updateControls]);

  const scroll = (direction: -1 | 1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const firstSlide = viewport.firstElementChild as HTMLElement | null;
    const computedStyle = window.getComputedStyle(viewport);
    const gap = Number.parseFloat(computedStyle.columnGap || computedStyle.gap) || 0;
    const distance = (firstSlide?.getBoundingClientRect().width ?? viewport.clientWidth) + gap;

    viewport.scrollBy({ left: direction * distance, behavior: 'smooth' });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    scroll(event.key === 'ArrowLeft' ? -1 : 1);
  };

  if (products.length === 0) return null;

  return (
    <Box component="section" aria-label={ariaLabel} sx={{ minWidth: 0, position: 'relative' }}>
      <Box
        ref={viewportRef}
        id={carouselId}
        tabIndex={0}
        role="region"
        aria-roledescription="carrusel"
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
        sx={{
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: {
            xs: 'calc(100% - 18px)',
            sm: 'calc((100% - 16px) / 2)',
            md: 'calc((100% - 48px) / 3)',
          },
          columnGap: { xs: 1.25, sm: 2, md: 3 },
          overflowX: 'auto',
          overscrollBehaviorInline: 'contain',
          scrollBehavior: 'smooth',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          py: { xs: .5, sm: 1 },
          px: { sm: .5 },
          '&::-webkit-scrollbar': { display: 'none' },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 4,
            borderRadius: 1,
          },
        }}
      >
        {products.map((product, index) => (
          <Box
            key={product.id}
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${index + 1} de ${products.length}`}
            sx={{ minWidth: 0, scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
          >
            <ProductCard product={product} variant="compact" />
          </Box>
        ))}
      </Box>

      <IconButton
        aria-label="Ver productos anteriores"
        aria-controls={carouselId}
        disabled={!canScrollBack}
        onClick={() => scroll(-1)}
        size="small"
        sx={{
          display: { xs: 'none', sm: 'inline-flex' },
          position: 'absolute',
          zIndex: 2,
          top: '50%',
          left: 10,
          transform: 'translateY(-50%)',
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: 3,
          opacity: canScrollBack ? 1 : 0,
          pointerEvents: canScrollBack ? 'auto' : 'none',
          '&:hover': { bgcolor: 'background.paper' },
        }}
      >
        <ArrowBackRoundedIcon />
      </IconButton>
      <IconButton
        aria-label="Ver productos siguientes"
        aria-controls={carouselId}
        disabled={!canScrollForward}
        onClick={() => scroll(1)}
        size="small"
        sx={{
          display: { xs: 'none', sm: 'inline-flex' },
          position: 'absolute',
          zIndex: 2,
          top: '50%',
          right: 10,
          transform: 'translateY(-50%)',
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: 3,
          opacity: canScrollForward ? 1 : 0,
          pointerEvents: canScrollForward ? 'auto' : 'none',
          '&:hover': { bgcolor: 'background.paper' },
        }}
      >
        <ArrowForwardRoundedIcon />
      </IconButton>
    </Box>
  );
}
