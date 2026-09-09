import { useQuery } from '@tanstack/react-query';
import { alpha } from '@mui/material/styles';
import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { api, getErrorMessage } from '../lib/api';
import { formatDate, shortOrderId } from '../lib/format';
import { useCurrency } from '../currency/CurrencyProvider';
import { EmptyState, ErrorState, PageLoader } from '../components/AsyncStates';
import { PageHeader } from '../components/PageHeader';
import { OrderStatusChip } from '../components/OrderStatusChip';

export function OrdersPage() {
  const { formatMoney } = useCurrency();
  const ordersQuery = useQuery({ queryKey: ['orders'], queryFn: api.orders.list });

  const formatOrderDate = (value: string) => new Intl.DateTimeFormat('es-UY', {
    dateStyle: 'long',
  }).format(new Date(value));
  const formatOrderTime = (value: string) => new Intl.DateTimeFormat('es-UY', {
    timeStyle: 'short',
  }).format(new Date(value));

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4, md: 7 } }}>
      <PageHeader eyebrow="Tu historial" title="Mis órdenes" />
      {ordersQuery.isLoading && <PageLoader />}
      {ordersQuery.isError && <ErrorState message={getErrorMessage(ordersQuery.error)} onRetry={() => ordersQuery.refetch()} />}
      {ordersQuery.data?.length === 0 && <EmptyState title="Todavía no tenés órdenes" description="Cuando completes tu primera compra, vas a encontrarla acá." action={<Button component={RouterLink} to="/" variant="contained">Explorar productos</Button>} />}
      {ordersQuery.data && ordersQuery.data.length > 0 && (
        <Stack spacing={2}>
          {ordersQuery.data.map((order) => (
            <Paper key={order.id} variant="outlined" sx={{ p: { xs: 2, sm: 2.5, md: 3 }, minWidth: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0, width: { xs: '100%', sm: 'auto' } }}>
                  <Box sx={{ display: { xs: 'none', sm: 'grid' }, width: 48, height: 48, borderRadius: 2.5, placeItems: 'center', bgcolor: (theme) => alpha(theme.palette.primary.main, .08), color: 'primary.main' }}><ReceiptLongOutlinedIcon /></Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) auto',
                        columnGap: 1.2,
                        rowGap: 0.4,
                        alignItems: 'start',
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          minWidth: 0,
                          whiteSpace: 'nowrap',
                          fontSize: { xs: '1rem', sm: '1.25rem' },
                        }}
                      >
                        Orden #{shortOrderId(order.id)}
                      </Typography>
                      <Box sx={{ flexShrink: 0, alignSelf: 'start' }}>
                        <OrderStatusChip status={order.status} />
                      </Box>
                      <Box sx={{ gridColumn: '1 / -1', minWidth: 0 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                          {formatDate(order.createdAt)} · {order.items.reduce((sum, item) => sum + item.quantity, 0)} productos
                        </Typography>
                        <Stack spacing={0.15} sx={{ display: { xs: 'flex', sm: 'none' }, minWidth: 0 }}>
                          <Typography variant="body2" color="text.secondary">
                            {formatOrderDate(order.createdAt)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatOrderTime(order.createdAt)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {order.items.reduce((sum, item) => sum + item.quantity, 0)} productos
                          </Typography>
                        </Stack>
                      </Box>
                    </Box>
                  </Box>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, sm: 2.5 }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: 0 }}>
                  <Box><Typography variant="caption" color="text.secondary">Total</Typography><Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>{formatMoney(order.totalCents)}</Typography></Box>
                  <Button component={RouterLink} to={`/orders/${order.id}`} variant="outlined" endIcon={<ArrowForwardRoundedIcon />} sx={{ width: { xs: '100%', sm: 'auto' } }}>Ver detalle</Button>
                </Stack>
              </Box>
            </Paper>
          ))}
        </Stack>
      )}
    </Container>
  );
}
