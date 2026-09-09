import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import ChairOutlinedIcon from '@mui/icons-material/ChairOutlined';
import CheckroomRoundedIcon from '@mui/icons-material/CheckroomRounded';
import SportsBasketballOutlinedIcon from '@mui/icons-material/SportsBasketballOutlined';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import CoffeeOutlinedIcon from '@mui/icons-material/CoffeeOutlined';
import { useState } from 'react';

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

const categoryIcons = {
  tecnologia: HeadphonesRoundedIcon,
  hogar: ChairOutlinedIcon,
  moda: CheckroomRoundedIcon,
  deporte: SportsBasketballOutlinedIcon,
  oficina: EditNoteRoundedIcon,
  cocina: CoffeeOutlinedIcon,
};

function resolveImageUrl(src: string) {
  if (!/^https?:\/\//i.test(apiBaseUrl) || /^(?:https?:|data:|blob:)/i.test(src)) return src;
  try {
    return new URL(src, `${apiBaseUrl}/`).toString();
  } catch {
    return src;
  }
}

export function ProductImage({ src, alt, height = 230, categorySlug }: {
  src?: string | null;
  alt: string;
  height?: number | string | Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number | string>>;
  categorySlug?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const resolvedSrc = src ? resolveImageUrl(src) : null;
  const CategoryIcon = categoryIcons[categorySlug as keyof typeof categoryIcons] ?? Inventory2OutlinedIcon;

  if (resolvedSrc && resolvedSrc !== failedSrc) {
    return (
      <Box
        component="img"
        src={resolvedSrc}
        alt={alt}
        loading="lazy"
        onError={() => setFailedSrc(resolvedSrc)}
        sx={{ width: '100%', minWidth: 0, height, objectFit: 'cover', bgcolor: 'background.default' }}
      />
    );
  }
  return (
    <Box role="img" aria-label={`Sin imagen para ${alt}`} sx={{
      width: '100%', minWidth: 0, height, display: 'grid', placeItems: 'center',
      background: (theme) => `linear-gradient(140deg, ${alpha(theme.palette.primary.main, .09)}, ${alpha(theme.palette.secondary.main, .05)})`,
      color: 'primary.main',
    }}>
      <CategoryIcon sx={{ fontSize: 56, opacity: .65 }} />
    </Box>
  );
}
