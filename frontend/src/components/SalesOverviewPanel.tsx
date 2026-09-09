import {
  Alert,
  Box,
  Button,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { formatMoney } from '../lib/format';
import type { SalesOverview } from '../types';

interface SalesOverviewPanelProps {
  data?: SalesOverview;
  loading: boolean;
  error?: string;
  onRetry: () => void;
}

const integerFormatter = new Intl.NumberFormat('es-UY');

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        minWidth: 0,
        alignItems: 'center',
        gap: 1.5,
        p: { xs: 1.5, sm: 2 },
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: alpha(theme.palette.primary.main, 0.035),
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          display: 'grid',
          width: 40,
          height: 40,
          flexShrink: 0,
          placeItems: 'center',
          borderRadius: 1.5,
          color: 'primary.main',
          bgcolor: alpha(theme.palette.primary.main, 0.1),
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={800} sx={{ overflowWrap: 'anywhere' }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

function LoadingState() {
  return (
    <Box
      role="status"
      aria-label="Cargando estadísticas de ventas"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
        gap: 1.5,
      }}
    >
      {[0, 1, 2].map((item) => (
        <Skeleton key={item} variant="rounded" height={78} />
      ))}
    </Box>
  );
}

export function SalesOverviewPanel({ data, loading, error, onRetry }: SalesOverviewPanelProps) {
  const theme = useTheme();

  return (
    <Paper
      component="section"
      aria-labelledby="sales-overview-title"
      aria-busy={loading}
      variant="outlined"
      sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <Box
          aria-hidden="true"
          sx={{
            display: 'grid',
            width: 42,
            height: 42,
            flexShrink: 0,
            placeItems: 'center',
            borderRadius: 1.5,
            color: 'primary.main',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
          }}
        >
          <BarChartRoundedIcon />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            id="sales-overview-title"
            component="h1"
            variant="h5"
            fontWeight={800}
            sx={{ fontSize: { xs: '1.15rem', sm: '1.5rem' }, lineHeight: 1.2, whiteSpace: 'nowrap' }}
          >
            Resumen de ventas
          </Typography>
        </Box>
      </Stack>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <Alert
          severity="error"
          action={<Button color="inherit" size="small" onClick={onRetry}>Reintentar</Button>}
        >
          {error}
        </Alert>
      ) : data ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
            gap: 1.5,
          }}
        >
          <MetricCard
            label="Unidades vendidas"
            value={integerFormatter.format(data.totalUnitsSold)}
            icon={<Inventory2OutlinedIcon fontSize="small" />}
          />
          <MetricCard
            label="Órdenes pagadas"
            value={integerFormatter.format(data.totalOrders)}
            icon={<ReceiptLongOutlinedIcon fontSize="small" />}
          />
          <MetricCard
            label="Ingresos"
            value={formatMoney(data.totalRevenueCents)}
            icon={<PaymentsOutlinedIcon fontSize="small" />}
          />
        </Box>
      ) : null}
    </Paper>
  );
}
