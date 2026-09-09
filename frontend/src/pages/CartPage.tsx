import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { api, getErrorMessage } from '../lib/api';
import { useCurrency } from '../currency/CurrencyProvider';
import { queryClient } from '../lib/queryClient';
import { useFeedback } from '../components/FeedbackProvider';
import { EmptyState, ErrorState, PageLoader } from '../components/AsyncStates';
import { PageHeader } from '../components/PageHeader';
import { ProductImage } from '../components/ProductImage';
import { QuantityControl } from '../components/QuantityControl';

export function CartPage() {
  const { notify } = useFeedback();
  const { formatMoney } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const cartQuery = useQuery({ queryKey: ['cart'], queryFn: api.cart.get });
  useEffect(() => {
    if (searchParams.get('checkout') === 'cancelled') {
      notify('El pago fue cancelado. Tu carrito sigue guardado.', 'info');
      setSearchParams({}, { replace: true });
    }
  }, [notify, searchParams, setSearchParams]);

  const updateItem = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) => api.cart.update(productId, quantity),
    onSuccess: (cart) => queryClient.setQueryData(['cart'], cart),
    onError: (error) => notify(getErrorMessage(error, 'No pudimos cambiar la cantidad.'), 'error'),
  });
  const removeItem = useMutation({
    mutationFn: api.cart.remove,
    onSuccess: (cart) => {
      queryClient.setQueryData(['cart'], cart);
      notify('Producto eliminado del carrito.', 'info');
    },
    onError: (error) => notify(getErrorMessage(error, 'No pudimos eliminar el producto.'), 'error'),
  });
  const checkout = useMutation({
    mutationFn: api.payments.checkout,
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (error) => {
      notify(getErrorMessage(error, 'No pudimos iniciar el pago.'), 'error');
      cartQuery.refetch();
    },
  });

  if (cartQuery.isLoading) return <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 } }}><PageLoader /></Container>;
  if (cartQuery.isError || !cartQuery.data) return <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 } }}><ErrorState message={getErrorMessage(cartQuery.error)} onRetry={() => cartQuery.refetch()} /></Container>;
  const cart = cartQuery.data;
  const isChanging = updateItem.isPending || removeItem.isPending;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4, md: 7 } }}>
      <PageHeader eyebrow="Tu selección" title="Carrito" description={cart.items.length ? `${cart.items.reduce((sum, item) => sum + item.quantity, 0)} productos listos para continuar.` : 'Tus productos aparecerán acá.'} />
      {cart.items.length === 0 ? (
        <EmptyState title="Tu carrito está vacío" description="Explorá la tienda y agregá los productos que te gusten." action={<Button component={RouterLink} to="/" variant="contained">Ver productos</Button>} />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(320px, 360px)' }, gap: { xs: 2, md: 3 }, alignItems: 'start' }}>
          <Stack spacing={2}>
            {cart.items.map((item) => (
              <Paper data-testid="cart-item" key={item.productId} variant="outlined" sx={{ p: { xs: 1.5, sm: 2.5 }, minWidth: 0 }}>
                <Box sx={{ display: 'grid', minWidth: 0, gridTemplateColumns: { xs: '72px minmax(0, 1fr)', sm: '104px minmax(0, 1fr) auto' }, gap: { xs: 1.5, sm: 2.5 }, alignItems: 'center' }}>
                  <Box sx={{ borderRadius: 1.5, overflow: 'hidden', minWidth: 0, aspectRatio: '1 / 1' }}><ProductImage src={item.product.imageUrl} alt={item.product.name} height={{ xs: 72, sm: 104 } as never} /></Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography component={RouterLink} to={`/products/${item.productId}`} variant="h6" sx={{ display: 'inline-block', maxWidth: '100%', lineHeight: 1.3, overflowWrap: 'anywhere', '&:hover': { color: 'primary.main' } }}>{item.product.name}</Typography>
                    <Typography color="text.secondary" variant="body2" sx={{ mt: .5, overflowWrap: 'anywhere' }}>{formatMoney(item.product.priceCents)} por unidad</Typography>
                    <Box sx={{ display: { xs: 'block', sm: 'none' }, mt: 1.5 }}><QuantityControl label={`Cantidad de ${item.product.name}`} value={item.quantity} onChange={(quantity) => updateItem.mutate({ productId: item.productId, quantity })} disabled={isChanging} /></Box>
                  </Box>
                  <Stack alignItems={{ xs: 'center', sm: 'flex-end' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' }, gridColumn: { xs: '1 / -1', sm: 'auto' }, flexDirection: { xs: 'row', sm: 'column' }, justifyContent: { xs: 'space-between' }, minWidth: 0 }}>
                    <Typography variant="h6" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>{formatMoney(item.product.priceCents * item.quantity)}</Typography>
                    <Box sx={{ display: { xs: 'none', sm: 'block' } }}><QuantityControl label={`Cantidad de ${item.product.name}`} value={item.quantity} onChange={(quantity) => updateItem.mutate({ productId: item.productId, quantity })} disabled={isChanging} /></Box>
                    <IconButton aria-label={`Eliminar ${item.product.name} del carrito`} color="error" onClick={() => removeItem.mutate(item.productId)} disabled={isChanging} sx={{ flexShrink: 0 }}><DeleteOutlineRoundedIcon /></IconButton>
                  </Stack>
                </Box>
              </Paper>
            ))}
            <Button component={RouterLink} to="/" startIcon={<ArrowBackRoundedIcon />} sx={{ alignSelf: 'flex-start' }}>Seguir comprando</Button>
          </Stack>

          <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 }, position: { md: 'sticky' }, top: { md: 100 }, minWidth: 0 }}>
            <Typography variant="h5">Resumen</Typography>
            <Stack spacing={1.5} sx={{ mt: 3 }}>
              <Stack direction="row" justifyContent="space-between" spacing={2}><Typography color="text.secondary">Subtotal</Typography><Typography textAlign="right">{formatMoney(cart.subtotalCents)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between" spacing={2}><Typography color="text.secondary">Costos adicionales</Typography><Typography color="success.main" fontWeight={700} textAlign="right" sx={{ flexShrink: 0 }}>Sin costo</Typography></Stack>
              <Divider />
              <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}><Typography variant="h6">Total</Typography><Typography variant="h4" color="primary.dark" textAlign="right" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' }, overflowWrap: 'anywhere' }}>{formatMoney(cart.totalCents)}</Typography></Stack>
            </Stack>
            {checkout.isError && <Alert severity="error" sx={{ mt: 2 }}>{getErrorMessage(checkout.error)}</Alert>}
            <Button data-testid="checkout-button" fullWidth size="large" variant="contained" startIcon={<CreditCardRoundedIcon />} onClick={() => checkout.mutate()} disabled={checkout.isPending || isChanging} sx={{ mt: 3 }}>
              {checkout.isPending ? 'Preparando pago…' : 'Ir al pago seguro'}
            </Button>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mt: 2, color: 'text.secondary', textAlign: 'center' }}><LockOutlinedIcon sx={{ fontSize: 16, flexShrink: 0 }} /><Typography variant="caption">Pago procesado de forma segura por Stripe</Typography></Stack>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5, textAlign: 'center' }}>El servidor verificará nuevamente los precios antes de cobrar.</Typography>
          </Paper>
        </Box>
      )}
    </Container>
  );
}
