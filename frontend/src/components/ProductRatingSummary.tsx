import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { Rating, Stack, Typography } from '@mui/material';

interface ProductRatingSummaryProps {
  average: number | null;
  count: number;
  variant?: 'compact' | 'full';
}

const averageFormatter = new Intl.NumberFormat('es-UY', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function ProductRatingSummary({
  average,
  count,
  variant = 'compact',
}: ProductRatingSummaryProps) {
  if (average === null || count <= 0) return null;

  const formattedAverage = averageFormatter.format(average);
  const accessibleLabel = `${formattedAverage} de 5, según ${count} ${count === 1 ? 'valoración' : 'valoraciones'}`;

  if (variant === 'compact') {
    return (
      <Stack
        role="img"
        direction="row"
        spacing={0.25}
        alignItems="center"
        aria-label={accessibleLabel}
        sx={{ flexShrink: 0, color: 'text.secondary' }}
      >
        <StarRoundedIcon aria-hidden="true" sx={{ color: 'warning.main', fontSize: 18 }} />
        <Typography variant="caption" fontWeight={750} sx={{ whiteSpace: 'nowrap' }}>
          {formattedAverage} ({count})
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
      <Rating
        value={average}
        precision={0.1}
        readOnly
        size="small"
        getLabelText={() => accessibleLabel}
      />
      <Typography aria-hidden="true" variant="body2" color="text.secondary" fontWeight={650}>
        {formattedAverage} · {count} {count === 1 ? 'valoración' : 'valoraciones'}
      </Typography>
    </Stack>
  );
}
