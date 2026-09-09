import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';

export function PageLoader({ cards = false }: { cards?: boolean }) {
  if (cards) {
    return (
      <Box aria-label="Cargando productos" role="status" sx={{ display: 'grid', gap: { xs: 2, md: 2.5 }, gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' } }}>
        {Array.from({ length: 6 }, (_, index) => (
          <Paper key={index} variant="outlined" sx={{ overflow: 'hidden' }}>
            <Skeleton variant="rectangular" sx={{ height: { xs: 210, sm: 230 } }} />
            <Stack spacing={1.2} sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Skeleton width="65%" height={30} />
              <Skeleton width="100%" />
              <Skeleton width="85%" />
              <Skeleton width="35%" height={34} />
            </Stack>
          </Paper>
        ))}
      </Box>
    );
  }
  return <Box role="status" aria-label="Cargando" sx={{ minHeight: { xs: 220, sm: 280 }, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;
}

export function ErrorState({ message = 'No pudimos cargar esta información.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <Paper variant="outlined" sx={{ py: { xs: 5, sm: 7 }, px: { xs: 2, sm: 3 }, textAlign: 'center', overflow: 'hidden' }}>
      <ErrorOutlineRoundedIcon color="error" sx={{ fontSize: 46, mb: 1.5 }} />
      <Typography variant="h6" gutterBottom>Algo no salió bien</Typography>
      <Typography color="text.secondary" sx={{ mb: onRetry ? 2.5 : 0, overflowWrap: 'anywhere' }}>{message}</Typography>
      {onRetry && <Button variant="outlined" onClick={onRetry} sx={{ width: { xs: '100%', sm: 'auto' } }}>Volver a intentar</Button>}
    </Paper>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ py: { xs: 5, sm: 6, md: 9 }, px: { xs: 2, sm: 3 }, textAlign: 'center', overflow: 'hidden' }}>
      <Inventory2OutlinedIcon color="primary" sx={{ fontSize: 50, mb: 1.5, opacity: .8 }} />
      <Typography variant="h5" gutterBottom>{title}</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 480, mx: 'auto', mb: action ? 3 : 0, overflowWrap: 'anywhere' }}>{description}</Typography>
      {action && <Box sx={{ '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } } }}>{action}</Box>}
    </Paper>
  );
}
