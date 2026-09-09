import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Box, Breadcrumbs, Button, Container, Link, Paper, Stack, Typography } from '@mui/material';
import AddShoppingCartRoundedIcon from '@mui/icons-material/AddShoppingCartRounded';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, getErrorMessage } from '../lib/api';
import { useCurrency } from '../currency/CurrencyProvider';
import { ProductImage } from '../components/ProductImage';
import { ErrorState, PageLoader } from '../components/AsyncStates';
import { useAuth } from '../auth/AuthProvider';
import { useFeedback } from '../components/FeedbackProvider';
import { queryClient } from '../lib/queryClient';
import { QuantityControl } from '../components/QuantityControl';
import { ProductRatingSummary } from '../components/ProductRatingSummary';

export function ProductDetailPage() {
  const { id = '' } = useParams();
  const [quantity, setQuantity] = useState(1);
  const { formatMoney } = useCurrency();
  const { isAuthenticated } = useAuth();
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const location = useLocation();
  const productQuery = useQuery({ queryKey: ['product', id], queryFn: () => api.products.detail(id), enabled: Boolean(id) });
  const addToCart = useMutation({
    mutationFn: () => api.cart.add(id, quantity),
    onSuccess: (cart) => {
      queryClient.setQueryData(['cart'], cart);
      notify(`${quantity} ${quantity === 1 ? 'unidad agregada' : 'unidades agregadas'} al carrito.`);
    },
    onError: (error) => notify(getErrorMessage(error), 'error'),
  });

  const handleAdd = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location, message: 'Ingresá para agregar productos al carrito.' } });
      return;
    }
    addToCart.mutate();
  };

  if (productQuery.isLoading) return <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 } }}><PageLoader /></Container>;
  if (productQuery.isError || !productQuery.data) return <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 } }}><ErrorState message={getErrorMessage(productQuery.error, 'El producto no existe o ya no está disponible.')} onRetry={() => productQuery.refetch()} /></Container>;
  const product = productQuery.data;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4, md: 7 } }}>
      <Breadcrumbs sx={{ mb: { xs: 2, sm: 3 }, '& .MuiBreadcrumbs-ol': { rowGap: .5 }, '& .MuiBreadcrumbs-li': { minWidth: 0, maxWidth: '100%' } }}>
        <Link component={RouterLink} to="/products" underline="hover" color="inherit" sx={{ whiteSpace: 'nowrap' }}>Explorar productos</Link>
        <Link component={RouterLink} to={`/products?category=${encodeURIComponent(product.category.slug)}`} underline="hover" color="inherit" sx={{ overflowWrap: 'anywhere' }}>{product.category.name}</Link>
        <Typography color="text.primary" noWrap title={product.name}>{product.name}</Typography>
      </Breadcrumbs>
      <Paper variant="outlined" sx={{ overflow: 'hidden', minWidth: 0 }}>
        <Box sx={{ display: 'grid', minWidth: 0, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.05fr) minmax(0, .95fr)' } }}>
          <ProductImage src={product.imageUrl} alt={product.name} categorySlug={product.category.slug} height={{ xs: 'min(88vw, 360px)', sm: 460, md: 560 } as never} />
          <Stack spacing={{ xs: 2.5, sm: 3 }} sx={{ p: { xs: 2.5, sm: 4, md: 5 }, minWidth: 0, justifyContent: 'center' }}>
            <Box>
              <Typography variant="overline" color="primary" fontWeight={800}>{product.category.name}</Typography>
              <Typography component="h1" variant="h2" sx={{ fontSize: { xs: '1.85rem', sm: '2.4rem', md: '3rem' }, lineHeight: 1.08, mt: .5, overflowWrap: 'anywhere' }}>{product.name}</Typography>
              <Typography variant="h4" color="primary.dark" sx={{ mt: 2, fontSize: { xs: '1.75rem', sm: '2.125rem' }, overflowWrap: 'anywhere' }}>{formatMoney(product.priceCents)}</Typography>
              {product.ratingAverage != null && (product.ratingCount ?? 0) > 0 && (
                <Box sx={{ mt: 1 }}>
                  <ProductRatingSummary average={product.ratingAverage} count={product.ratingCount ?? 0} variant="full" />
                </Box>
              )}
            </Box>
            <Typography color="text.secondary" sx={{ fontSize: { xs: '1rem', sm: '1.05rem' }, lineHeight: { xs: 1.65, sm: 1.75 }, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{product.description}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ '& > .MuiPaper-root': { width: { xs: '100%', sm: 'auto' } } }}>
              <QuantityControl value={quantity} onChange={setQuantity} />
              <Button data-testid="add-to-cart" size="large" fullWidth variant="contained" startIcon={<AddShoppingCartRoundedIcon />} onClick={handleAdd} disabled={addToCart.isPending}>
                {addToCart.isPending ? 'Agregando…' : 'Agregar al carrito'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}
