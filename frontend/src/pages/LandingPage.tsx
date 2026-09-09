import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Container,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { ErrorState } from '../components/AsyncStates';
import { ProductCarousel } from '../components/ProductCarousel';
import { api, getErrorMessage } from '../lib/api';

const categoryVisuals: Record<string, { image: string; description: string }> = {
  tecnologia: {
    image: '/categories/tecnologia.jpg',
    description: 'Audio, accesorios y tecnología para todos los días.',
  },
  hogar: {
    image: '/categories/hogar.jpg',
    description: 'Detalles funcionales para disfrutar más cada espacio.',
  },
  moda: {
    image: '/categories/moda.jpg',
    description: 'Accesorios versátiles para acompañar tu estilo.',
  },
  deporte: {
    image: '/categories/deporte.jpg',
    description: 'Equipamiento para moverte, entrenar y salir.',
  },
  oficina: {
    image: '/categories/oficina.jpg',
    description: 'Un espacio de trabajo más cómodo y ordenado.',
  },
  cocina: {
    image: '/categories/cocina.jpg',
    description: 'Esenciales prácticos para cocinar y compartir.',
  },
};

export function LandingPage() {
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: api.products.categories,
  });
  const selectionQuery = useQuery({
    queryKey: ['products', 'best-sellers'],
    queryFn: api.products.bestSellers,
    refetchOnMount: 'always',
  });

  const categories = categoriesQuery.data?.filter((category) => categoryVisuals[category.slug]) ?? [];
  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 2, sm: 3.5, md: 5 }, pb: { xs: 2.5, sm: 4, md: 6 } }}>
      <Box component="section" aria-labelledby="seleccion-title">
        <Button
          component={RouterLink}
          to="/products"
          variant="outlined"
          endIcon={<ArrowForwardRoundedIcon />}
          sx={{ width: { xs: '100%', sm: 'auto' }, mb: { xs: 1.5, sm: 2 }, minHeight: 40 }}
        >
          Explorar catálogo
        </Button>
        <Typography id="seleccion-title" component="h1" variant="h2" sx={{ mb: { xs: 1.75, sm: 2.5 }, fontSize: { xs: '1.75rem', sm: '2.15rem', md: '2.6rem' } }}>
          Más vendidos
        </Typography>

        {selectionQuery.isLoading && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2.5 }}>
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} variant="rounded" sx={{ display: { xs: item === 1 ? 'block' : 'none', sm: item <= 2 ? 'block' : 'none', md: 'block' }, height: { xs: 164, sm: 320 } }} />
            ))}
          </Box>
        )}
        {selectionQuery.isError && (
          <Box sx={{ mt: 2 }}>
            <ErrorState message={getErrorMessage(selectionQuery.error)} onRetry={() => selectionQuery.refetch()} />
          </Box>
        )}
        {selectionQuery.data && (
          <ProductCarousel
            products={selectionQuery.data.products}
            ariaLabel="Productos más vendidos"
          />
        )}
      </Box>

      <Box id="categorias" component="section" aria-labelledby="categorias-title" sx={{ pt: { xs: 3.5, sm: 5, md: 6 }, scrollMarginTop: 96 }}>
        <Typography variant="overline" color="primary.main" fontWeight={800} sx={{ display: { xs: 'none', sm: 'block' } }}>Comprá a tu manera</Typography>
        <Typography id="categorias-title" component="h2" variant="h2" sx={{ mb: { xs: 1.5, sm: 0 }, fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.75rem' } }}>
          Explorá por categoría
        </Typography>
        <Typography color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, mt: .75, mb: { sm: 2.5, md: 3 }, maxWidth: 650 }}>
          Entrá directamente a lo que te interesa. Cada categoría abre el catálogo con su filtro listo.
        </Typography>

        {categoriesQuery.isLoading && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' }, gap: { xs: 1, sm: 1.5, md: 2 }, width: '100%' }}>
            {[1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} variant="rounded" sx={{ height: { xs: 150, sm: 220, md: 245 } }} />)}
          </Box>
        )}
        {categoriesQuery.isError && (
          <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => categoriesQuery.refetch()}>Reintentar</Button>}>
            No pudimos cargar las categorías.
          </Alert>
        )}
        {categories.length > 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' }, gap: { xs: 1, sm: 1.5, md: 2 }, width: '100%' }}>
            {categories.map((category) => {
              const visual = categoryVisuals[category.slug];
              return (
                <Card key={category.id} variant="outlined" sx={{ overflow: 'hidden', minWidth: 0, transition: 'transform 180ms ease, box-shadow 180ms ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }}>
                  <CardActionArea component={RouterLink} to={`/products?category=${category.slug}`} aria-label={`Explorar productos de ${category.name}`} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', height: '100%' }}>
                    <Box sx={{ position: 'relative', aspectRatio: { xs: '4 / 3', sm: '16 / 9', md: '16 / 7' }, overflow: 'hidden' }}>
                      <Box component="img" src={visual.image} alt="" loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 280ms ease', '.MuiCardActionArea-root:hover &': { transform: 'scale(1.035)' } }} />
                    </Box>
                    <Box sx={{ p: { xs: 1, sm: 1.5, md: 2 } }}>
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={.5}>
                        <Typography component="h3" variant="h5" sx={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', minHeight: { xs: '2.4em', sm: 'auto' }, fontSize: { xs: '.875rem', sm: '1.1rem', md: '1.25rem' }, lineHeight: 1.2 }}>{category.name}</Typography>
                        <ArrowForwardRoundedIcon color="primary" sx={{ display: { xs: 'none', sm: 'block' }, flexShrink: 0, fontSize: { sm: 22, md: 24 } }} />
                      </Stack>
                      <Typography color="text.secondary" variant="body2" sx={{ display: { xs: 'none', sm: '-webkit-box' }, WebkitBoxOrient: 'vertical', WebkitLineClamp: 1, overflow: 'hidden', mt: .5 }}>{visual.description}</Typography>
                    </Box>
                  </CardActionArea>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>

    </Container>
  );
}
