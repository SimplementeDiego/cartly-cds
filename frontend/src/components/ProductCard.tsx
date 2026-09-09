import { useMutation } from '@tanstack/react-query';
import { Button, Card, CardContent, CardMedia, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddShoppingCartRoundedIcon from '@mui/icons-material/AddShoppingCartRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import type { Product } from '../types';
import { useCurrency } from '../currency/CurrencyProvider';
import { api, getErrorMessage } from '../lib/api';
import { queryClient } from '../lib/queryClient';
import { useAuth } from '../auth/AuthProvider';
import { useFeedback } from './FeedbackProvider';
import { ProductImage } from './ProductImage';
import { ProductRatingSummary } from './ProductRatingSummary';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact';
}

export function ProductCard({ product, variant = 'default' }: ProductCardProps) {
  const compact = variant === 'compact';
  const { formatMoney } = useCurrency();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useFeedback();
  const addToCart = useMutation({
    mutationFn: () => api.cart.add(product.id, 1),
    onSuccess: (cart) => {
      queryClient.setQueryData(['cart'], cart);
      notify(`${product.name} se agregó al carrito.`);
    },
    onError: (error) => notify(getErrorMessage(error, 'No pudimos agregar el producto.'), 'error'),
  });

  const handleAdd = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location, message: 'Ingresá para agregar productos al carrito.' } });
      return;
    }
    addToCart.mutate();
  };

  return (
    <Card
      data-testid="product-card"
      variant="outlined"
      sx={{
        height: compact ? { xs: 148, sm: '100%' } : { xs: 'auto', sm: '100%' },
        minHeight: compact ? undefined : { xs: 116, sm: 0 },
        minWidth: 0,
        display: 'flex',
        flexDirection: { xs: 'row', sm: 'column' },
        overflow: 'hidden',
        transition: 'transform .2s ease, box-shadow .2s ease',
        '@media (hover: hover) and (pointer: fine)': {
          '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
        },
      }}
    >
      <CardMedia
        component="div"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          ...(compact && {
            width: { xs: 112, sm: '100%' },
            height: { xs: '100%', sm: 'auto' },
            flexShrink: 0,
          }),
          ...(!compact && {
            width: { xs: 96, sm: '100%' },
            height: { xs: 96, sm: 'auto' },
            m: { xs: 1, sm: 0 },
            borderRadius: { xs: 1.5, sm: 0 },
            alignSelf: { xs: 'center', sm: 'stretch' },
            flexShrink: 0,
          }),
        }}
      >
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          categorySlug={product.category.slug}
          height={compact ? { xs: '100%', sm: 148, md: 164 } : { xs: 96, sm: 230 }}
        />
        {!compact && (
          <Chip
            label="Disponible"
            size="small"
            sx={(theme) => ({
              position: 'absolute',
              display: { xs: 'none', sm: 'inline-flex' },
              top: { xs: 10, sm: 14 },
              left: { xs: 10, sm: 14 },
              bgcolor: alpha(theme.palette.background.paper, .94),
            })}
          />
        )}
      </CardMedia>
      <CardContent sx={{ p: compact ? { xs: 1.15, sm: 1.75 } : { xs: 1, sm: 2.5 }, '&:last-child': { pb: compact ? { xs: 1.15, sm: 1.75 } : { xs: 1, sm: 2.5 } }, display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <Typography component={RouterLink} to={`/products?category=${encodeURIComponent(product.category.slug)}`} variant="overline" color="primary" fontWeight={750} sx={{ alignSelf: 'flex-start', maxWidth: '100%', mb: compact ? .15 : { xs: .1, sm: .5 }, fontSize: compact ? { xs: '.62rem', sm: '.7rem' } : { xs: '.62rem', sm: undefined }, lineHeight: compact ? 1.25 : { xs: 1.2, sm: 1.6 }, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', '&:hover': { textDecoration: 'underline' } }}>{product.category.name}</Typography>
        <Typography
          component={RouterLink}
          to={`/products/${product.id}`}
          variant={compact ? 'subtitle1' : 'h6'}
          title={product.name}
          sx={{
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
            overflow: 'hidden',
            overflowWrap: 'anywhere',
            fontSize: compact ? { xs: '.86rem', sm: '1rem' } : { xs: '.9rem', sm: '1.25rem' },
            lineHeight: compact ? 1.22 : { xs: 1.2, sm: 1.3 },
            minHeight: compact ? '2.44em' : { xs: '2.4em', sm: '2.6em' },
            fontWeight: compact ? 750 : undefined,
            '&:hover': { color: 'primary.main' },
          }}
        >
          {product.name}
        </Typography>
        <Typography
          color="text.secondary"
          variant="body2"
          sx={{
            mt: compact ? .7 : { xs: 0, sm: .7 },
            mb: compact ? 1.25 : { xs: 0, sm: 2 },
            display: compact ? 'none' : { xs: 'none', sm: '-webkit-box' },
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: compact ? 1 : 2,
            overflow: 'hidden',
            minHeight: compact ? 0 : { xs: 0, sm: 40 },
          }}
        >
          {product.description}
        </Typography>
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          justifyContent="space-between"
          sx={{ mt: 'auto', mb: compact ? { xs: .6, sm: 1 } : { xs: .5, sm: 2 }, minWidth: 0 }}
        >
          <Typography
            variant={compact ? 'h6' : 'h5'}
            fontWeight={800}
            color="primary.dark"
            sx={{
              minWidth: 0,
              whiteSpace: compact ? 'nowrap' : undefined,
              fontSize: compact
                ? { xs: 'clamp(.82rem, 3.8vw, 1rem)', sm: '1.2rem' }
                : { xs: '1rem', sm: '1.5rem' },
              lineHeight: 1.2,
              overflowWrap: compact ? 'normal' : 'anywhere',
            }}
          >
            {formatMoney(product.priceCents)}
          </Typography>
          <ProductRatingSummary average={product.ratingAverage ?? null} count={product.ratingCount ?? 0} />
        </Stack>
        <Stack direction="row" spacing={compact ? .65 : 1} sx={{ minWidth: 0 }}>
          <Button
            aria-label={`Agregar ${product.name} al carrito`}
            data-testid="add-to-cart"
            variant="contained"
            size={compact ? 'small' : 'medium'}
            startIcon={<AddShoppingCartRoundedIcon />}
            onClick={handleAdd}
            disabled={addToCart.isPending}
            sx={{
              flex: 1,
              minWidth: 0,
              whiteSpace: 'nowrap',
              ...(compact && {
                minHeight: { xs: 30, sm: 34 },
                px: { xs: .75, sm: 1.25 },
                fontSize: { xs: '.72rem', sm: '.78rem' },
                '& .MuiButton-startIcon': { display: { xs: 'none', sm: 'inherit' } },
              }),
              ...(!compact && {
                minHeight: { xs: 30, sm: 36 },
                px: { xs: .75, sm: 2 },
                py: { xs: .25, sm: .75 },
                fontSize: { xs: '.72rem', sm: '.875rem' },
                '& .MuiButton-startIcon': { display: { xs: 'none', sm: 'inherit' } },
              }),
            }}
          >
            {addToCart.isPending ? 'Agregando…' : 'Agregar'}
          </Button>
          <Button component={RouterLink} to={`/products/${product.id}`} aria-label={`Ver detalle de ${product.name}`} variant="outlined" size={compact ? 'small' : 'medium'} sx={{ minWidth: compact ? { xs: 32, sm: 38 } : { xs: 32, sm: 42 }, minHeight: compact ? { xs: 30, sm: 34 } : { xs: 30, sm: 36 }, px: compact ? { xs: .35, sm: .75 } : { xs: .35, sm: 1 } }}><ArrowForwardRoundedIcon sx={{ fontSize: { xs: 18, sm: 24 } }} /></Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
