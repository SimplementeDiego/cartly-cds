import { useMutation, useQuery } from '@tanstack/react-query';
import { alpha } from '@mui/material/styles';
import { Box, Breadcrumbs, CircularProgress, Container, Divider, Link, Paper, Rating, Stack, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { api, getErrorMessage } from '../lib/api';
import { formatDate, shortOrderId } from '../lib/format';
import { useCurrency } from '../currency/CurrencyProvider';
import { ErrorState, PageLoader } from '../components/AsyncStates';
import { OrderStatusChip } from '../components/OrderStatusChip';
import { queryClient } from '../lib/queryClient';
import { useFeedback } from '../components/FeedbackProvider';
import type { OrderItem } from '../types';

const ratingLabels: Record<number, string> = {
  1: 'Muy malo',
  2: 'Malo',
  3: 'Bueno',
  4: 'Muy bueno',
  5: 'Excelente',
};

function OrderItemRating({ orderId, item }: { orderId: string; item: OrderItem }) {
  const { notify } = useFeedback();
  const mutation = useMutation({
    mutationFn: (rating: number) => api.orders.rateItem(orderId, item.id, rating),
    onSuccess: (order) => {
      queryClient.setQueryData(['orders', orderId], order);
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      if (item.productId) void queryClient.invalidateQueries({ queryKey: ['product', item.productId] });
      notify(item.rating === null ? 'Gracias por valorar tu compra.' : 'Calificación actualizada.');
    },
    onError: (error) => notify(getErrorMessage(error, 'No pudimos guardar la calificación.'), 'error'),
  });
  const value = mutation.isPending ? mutation.variables : item.rating;

  return (
    <Stack
      role="group"
      aria-label={`Tu calificación de ${item.productName}`}
      direction="row"
      spacing={1}
      useFlexGap
      flexWrap="wrap"
      alignItems="center"
      sx={{ mt: 1 }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={650}>
        Tu calificación
      </Typography>
      <Rating
        name={`rating-${item.id}`}
        value={value}
        disabled={mutation.isPending}
        emptyLabelText="Sin calificación"
        getLabelText={(rating) => `${rating} ${rating === 1 ? 'estrella' : 'estrellas'}: ${ratingLabels[rating]}`}
        onChange={(_, rating) => {
          if (rating !== null && rating !== item.rating) mutation.mutate(rating);
        }}
      />
      {mutation.isPending && <CircularProgress size={16} aria-label="Guardando calificación" />}
    </Stack>
  );
}

export function OrderDetailPage() {
  const { id = '' } = useParams();
  const { formatMoney } = useCurrency();
  const orderQuery = useQuery({ queryKey: ['orders', id], queryFn: () => api.orders.detail(id), enabled: Boolean(id) });

  if (orderQuery.isLoading) return <Container maxWidth="md" sx={{ py: { xs: 4, md: 7 } }}><PageLoader /></Container>;
  if (orderQuery.isError || !orderQuery.data) return <Container maxWidth="md" sx={{ py: { xs: 4, md: 7 } }}><ErrorState message={getErrorMessage(orderQuery.error, 'No encontramos esta orden o no tenés permiso para verla.')} /></Container>;
  const order = orderQuery.data;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4, md: 7 } }}>
      <Breadcrumbs sx={{ mb: { xs: 2, sm: 3 } }}>
        <Link
          component={RouterLink}
          to="/orders"
          underline="hover"
          color="inherit"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
        >
          <ArrowBackRoundedIcon fontSize="small" />
          Mis órdenes
        </Link>
        <Typography color="text.primary" sx={{ overflowWrap: 'anywhere' }}>
          #{shortOrderId(order.id)}
        </Typography>
      </Breadcrumbs>
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box sx={{ p: { xs: 2.5, sm: 4 }, bgcolor: (theme) => alpha(theme.palette.primary.main, .07), color: 'text.primary' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
            <Box>
              <Typography variant="overline" color="primary.main">Detalle de compra</Typography>
              <Typography component="h1" variant="h4" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' }, overflowWrap: 'anywhere' }}>Orden #{shortOrderId(order.id)}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: .7 }}>{formatDate(order.createdAt)}</Typography>
            </Box>
            <OrderStatusChip status={order.status} />
          </Stack>
        </Box>
        <Box sx={{ p: { xs: 2.5, sm: 4 }, minWidth: 0 }}>
          <Typography variant="h6" sx={{ mb: 2.5 }}>Productos</Typography>
          <Stack divider={<Divider flexItem />} spacing={2.5}>
            {order.items.map((item, index) => (
              <Box key={item.id ?? `${item.productId}-${index}`} sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) auto' }, gap: { xs: 1, sm: 2 }, minWidth: 0 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={750} sx={{ overflowWrap: 'anywhere' }}>{item.productName}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.quantity} × {formatMoney(item.unitPriceCents)}</Typography>
                  <OrderItemRating orderId={order.id} item={item} />
                </Box>
                <Typography fontWeight={750} sx={{ textAlign: { xs: 'right', sm: 'left' }, overflowWrap: 'anywhere' }}>{formatMoney(item.totalCents)}</Typography>
              </Box>
            ))}
          </Stack>
          <Divider sx={{ my: 3 }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'baseline' }} spacing={1}><Typography variant="h6">Total pagado</Typography><Typography variant="h4" color="primary.dark" sx={{ textAlign: 'right', fontSize: { xs: '1.85rem', sm: '2.125rem' }, overflowWrap: 'anywhere' }}>{formatMoney(order.totalCents)}</Typography></Stack>
        </Box>
      </Paper>
    </Container>
  );
}
