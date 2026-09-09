import { FormEvent, useEffect, useState } from 'react';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Alert,
  Box,
  Button,
  Container,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { EmptyState, ErrorState, PageLoader } from '../components/AsyncStates';
import { ProductCard } from '../components/ProductCard';
import { useCurrency } from '../currency/CurrencyProvider';
import {
  convertDisplayCentsToUsdCents,
  convertUsdCentsToDisplayCents,
  type CurrencyCode,
} from '../currency/currency';
import { api, getErrorMessage } from '../lib/api';

const PRICE_INPUT_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;
const MAX_PRICE_CENTS = 10_000_000;

function normalizePriceInput(value: string) {
  return value.trim().replace(',', '.');
}

function priceInputToDisplayCents(value: string) {
  const normalized = normalizePriceInput(value);
  if (!normalized || !PRICE_INPUT_PATTERN.test(normalized)) return undefined;
  const [units, decimals = ''] = normalized.split('.');
  return Number(units) * 100 + Number(decimals.padEnd(2, '0'));
}

function displayCentsToPriceInput(cents: number | undefined) {
  if (cents === undefined) return '';
  const units = Math.floor(cents / 100);
  const decimals = cents % 100;
  if (decimals === 0) return String(units);
  return `${units}.${String(decimals).padStart(2, '0').replace(/0$/, '')}`;
}

function readUsdPriceCents(
  searchParams: URLSearchParams,
  canonicalKey: 'minPriceCents' | 'maxPriceCents',
  legacyKey: 'minPrice' | 'maxPrice',
) {
  const canonicalValue = searchParams.get(canonicalKey);
  if (canonicalValue && /^\d+$/.test(canonicalValue)) {
    const cents = Number(canonicalValue);
    if (Number.isSafeInteger(cents) && cents <= MAX_PRICE_CENTS) return cents;
  }

  // Compatibilidad con URLs anteriores, cuyos montos decimales siempre eran USD.
  const legacyValue = searchParams.get(legacyKey) ?? '';
  const legacyCents = priceInputToDisplayCents(legacyValue);
  if (legacyCents !== undefined && legacyCents <= MAX_PRICE_CENTS) return legacyCents;
  return undefined;
}

function priceInputFromUsdCents(usdCents: number | undefined, currency: CurrencyCode) {
  if (usdCents === undefined) return '';
  return displayCentsToPriceInput(convertUsdCentsToDisplayCents(usdCents, currency));
}

function readExactPriceInput(
  storedCurrency: string,
  storedValue: string,
  usdCents: number | undefined,
  currency: CurrencyCode,
  boundary: 'min' | 'max',
) {
  const storedInput = normalizePriceInput(storedValue);
  const storedDisplayCents = priceInputToDisplayCents(storedInput);

  if (
    storedCurrency === currency &&
    usdCents !== undefined &&
    storedDisplayCents !== undefined &&
    convertDisplayCentsToUsdCents(storedDisplayCents, currency, boundary) === usdCents
  ) {
    return storedInput;
  }

  return priceInputFromUsdCents(usdCents, currency);
}

function formatMaximumPrice(currency: CurrencyCode) {
  const displayCents = convertUsdCentsToDisplayCents(MAX_PRICE_CENTS, currency);
  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(displayCents / 100);
}

function validatePriceInput(value: string, currency: CurrencyCode, boundary: 'min' | 'max') {
  const normalized = normalizePriceInput(value);
  if (!normalized) return undefined;
  if (!PRICE_INPUT_PATTERN.test(normalized)) {
    return 'Ingresá un monto válido con hasta 2 decimales.';
  }
  const displayCents = priceInputToDisplayCents(normalized);
  if (
    displayCents === undefined ||
    convertDisplayCentsToUsdCents(displayCents, currency, boundary) > MAX_PRICE_CENTS
  ) {
    return `El precio máximo permitido es ${formatMaximumPrice(currency)}.`;
  }
  return undefined;
}

export function CatalogPage() {
  const { currency } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? '';
  const minPriceCents = readUsdPriceCents(searchParams, 'minPriceCents', 'minPrice');
  const maxPriceCents = readUsdPriceCents(searchParams, 'maxPriceCents', 'maxPrice');
  const priceCurrency = searchParams.get('priceCurrency') ?? '';
  const minPriceDisplay = searchParams.get('minPriceDisplay') ?? '';
  const maxPriceDisplay = searchParams.get('maxPriceDisplay') ?? '';
  const [searchInput, setSearchInput] = useState(search);
  const [categoryInput, setCategoryInput] = useState(category);
  const [minPriceInput, setMinPriceInput] = useState(() => readExactPriceInput(
    priceCurrency,
    minPriceDisplay,
    minPriceCents,
    currency,
    'min',
  ));
  const [maxPriceInput, setMaxPriceInput] = useState(() => readExactPriceInput(
    priceCurrency,
    maxPriceDisplay,
    maxPriceCents,
    currency,
    'max',
  ));
  const [priceErrors, setPriceErrors] = useState<{ min?: string; max?: string }>({});
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: api.products.categories });
  const productsQuery = useQuery({
    queryKey: ['products', { search, category, minPriceCents, maxPriceCents }],
    queryFn: () => api.products.list({
      search,
      category,
      minPriceCents,
      maxPriceCents,
    }),
  });
  const publicCategories = categoriesQuery.data?.filter((item) => item.slug !== 'general') ?? [];
  const hasFilters = Boolean(
    search || category || minPriceCents !== undefined || maxPriceCents !== undefined,
  );

  useEffect(() => {
    setSearchInput(search);
    setCategoryInput(category);
    setMinPriceInput(readExactPriceInput(priceCurrency, minPriceDisplay, minPriceCents, currency, 'min'));
    setMaxPriceInput(readExactPriceInput(priceCurrency, maxPriceDisplay, maxPriceCents, currency, 'max'));
    setPriceErrors({});
  }, [search, category, minPriceCents, maxPriceCents, priceCurrency, minPriceDisplay, maxPriceDisplay, currency]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const nextSearch = searchInput.trim();
    const nextMinPrice = normalizePriceInput(minPriceInput);
    const nextMaxPrice = normalizePriceInput(maxPriceInput);
    const nextErrors: { min?: string; max?: string } = {
      min: validatePriceInput(nextMinPrice, currency, 'min'),
      max: validatePriceInput(nextMaxPrice, currency, 'max'),
    };
    const nextMinDisplayCents = priceInputToDisplayCents(nextMinPrice);
    const nextMaxDisplayCents = priceInputToDisplayCents(nextMaxPrice);
    const nextMinPriceCents = nextMinDisplayCents === undefined
      ? undefined
      : convertDisplayCentsToUsdCents(nextMinDisplayCents, currency, 'min');
    const nextMaxPriceCents = nextMaxDisplayCents === undefined
      ? undefined
      : convertDisplayCentsToUsdCents(nextMaxDisplayCents, currency, 'max');

    if (
      !nextErrors.min &&
      !nextErrors.max &&
      nextMinPriceCents !== undefined &&
      nextMaxPriceCents !== undefined &&
      nextMinPriceCents > nextMaxPriceCents
    ) {
      nextErrors.max = 'Debe ser igual o mayor que el precio mínimo.';
    }

    setPriceErrors(nextErrors);
    if (nextErrors.min || nextErrors.max) return;

    setSearchInput(nextSearch);
    setMinPriceInput(nextMinPrice);
    setMaxPriceInput(nextMaxPrice);

    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextSearch) next.set('search', nextSearch);
      else next.delete('search');
      if (categoryInput) next.set('category', categoryInput);
      else next.delete('category');
      if (nextMinPriceCents !== undefined) {
        next.set('minPriceCents', String(nextMinPriceCents));
        next.set('minPriceDisplay', nextMinPrice);
      } else {
        next.delete('minPriceCents');
        next.delete('minPriceDisplay');
      }
      if (nextMaxPriceCents !== undefined) {
        next.set('maxPriceCents', String(nextMaxPriceCents));
        next.set('maxPriceDisplay', nextMaxPrice);
      } else {
        next.delete('maxPriceCents');
        next.delete('maxPriceDisplay');
      }
      if (nextMinPriceCents !== undefined || nextMaxPriceCents !== undefined) {
        next.set('priceCurrency', currency);
      } else {
        next.delete('priceCurrency');
      }
      next.delete('minPrice');
      next.delete('maxPrice');
      return next;
    });
  };

  const clearSearch = () => {
    setSearchInput('');
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4, md: 5 } }}>
        <Typography component="h1" variant="h2" sx={{ mb: { xs: 1.75, sm: 2.5 }, fontSize: { xs: '1.75rem', sm: '2.15rem', md: '2.6rem' } }}>
          Explorar catálogo
        </Typography>
        <Paper component="section" aria-label="Filtros del catálogo" variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, mb: { xs: 1.5, sm: 2, md: 2.5 } }}>
          <Box
            component="form"
            role="search"
            onSubmit={submitSearch}
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(6, minmax(0, 1fr))',
                md: 'minmax(190px, 1.45fr) minmax(150px, 1fr) repeat(2, minmax(90px, .62fr)) auto',
              },
              gap: 1.5,
              alignItems: 'start',
            }}
          >
            <TextField
              fullWidth
              label="Buscar por nombre"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Ej.: auriculares"
              sx={{ gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'auto' } }}
              slotProps={{
                htmlInput: { 'aria-label': 'Buscar productos por nombre' },
                input: {
                  startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment>,
                  endAdornment: searchInput ? (
                    <InputAdornment position="end">
                      <IconButton
                        type="button"
                        size="small"
                        edge="end"
                        aria-label="Borrar búsqueda por nombre"
                        onClick={clearSearch}
                      >
                        <CloseRoundedIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                },
              }}
            />
            <TextField
              select
              fullWidth
              label="Categoría"
              value={categoryInput}
              onChange={(event) => setCategoryInput(event.target.value)}
              disabled={categoriesQuery.isLoading}
              sx={{ gridColumn: { xs: '1 / -1', sm: 'span 3', md: 'auto' } }}
              slotProps={{ select: { inputProps: { 'aria-label': 'Filtrar por categoría' } } }}
            >
              <MenuItem value="">Todas las categorías</MenuItem>
              {publicCategories.map((item) => <MenuItem key={item.id} value={item.slug}>{item.name}</MenuItem>)}
              {categoryInput && !publicCategories.some((item) => item.slug === categoryInput) && <MenuItem value={categoryInput} disabled>Categoría no disponible</MenuItem>}
            </TextField>
            <TextField
              fullWidth
              value={minPriceInput}
              onChange={(event) => {
                setMinPriceInput(event.target.value);
                setPriceErrors({});
              }}
              placeholder="Min"
              error={Boolean(priceErrors.min)}
              helperText={priceErrors.min}
              sx={{ gridColumn: { xs: 'span 1', sm: 'span 2', md: 'auto' } }}
              slotProps={{ htmlInput: { inputMode: 'decimal', 'aria-label': `Precio mínimo en ${currency}` } }}
            />
            <TextField
              fullWidth
              value={maxPriceInput}
              onChange={(event) => {
                setMaxPriceInput(event.target.value);
                setPriceErrors({});
              }}
              placeholder="Max"
              error={Boolean(priceErrors.max)}
              helperText={priceErrors.max}
              sx={{ gridColumn: { xs: 'span 1', sm: 'span 2', md: 'auto' } }}
              slotProps={{ htmlInput: { inputMode: 'decimal', 'aria-label': `Precio máximo en ${currency}` } }}
            />
            <Button
              type="submit"
              variant="contained"
              sx={{
                minHeight: 40,
                width: { xs: '100%', md: 'auto' },
                gridColumn: { xs: '1 / -1', sm: 'span 2', md: 'auto' },
              }}
            >
              Buscar
            </Button>
          </Box>
          {categoriesQuery.isError && (
            <Alert severity="warning" sx={{ mt: 2 }} action={<Button color="inherit" size="small" onClick={() => categoriesQuery.refetch()}>Reintentar</Button>}>
              No pudimos cargar las categorías.
            </Alert>
          )}
        </Paper>

        {productsQuery.isSuccess && (
          <Typography color="text.secondary" sx={{ mb: { xs: 1.5, sm: 2 } }} aria-live="polite">
            {productsQuery.data.length} {productsQuery.data.length === 1 ? 'producto' : 'productos'}
          </Typography>
        )}

        {productsQuery.isLoading && <PageLoader cards />}
        {productsQuery.isError && <ErrorState message={getErrorMessage(productsQuery.error)} onRetry={() => productsQuery.refetch()} />}
        {productsQuery.data?.length === 0 && (
          <EmptyState
            title="No encontramos productos"
            description={hasFilters ? 'Probá cambiando los filtros de búsqueda.' : 'Todavía no hay productos disponibles.'}
          />
        )}
        {productsQuery.data && productsQuery.data.length > 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: { xs: 2, md: 3 } }}>
            {productsQuery.data.map((product) => <ProductCard key={product.id} product={product} />)}
          </Box>
        )}
    </Container>
  );
}
