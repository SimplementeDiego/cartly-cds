import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { api, getErrorMessage } from '../lib/api';
import { queryClient } from '../lib/queryClient';

const POLLING_TIMEOUT_MS = 60_000;

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') ?? '';
  const pollingStartedAt = useRef(Date.now());
  const [pollingTimedOut, setPollingTimedOut] = useState(false);

  useEffect(() => {
    pollingStartedAt.current = Date.now();
    setPollingTimedOut(false);
  }, [sessionId]);

  const checkout = useQuery({
    queryKey: ['checkout-status', sessionId],
    queryFn: () => api.payments.checkoutStatus(sessionId),
    enabled: Boolean(sessionId),
    retry: 1,
    refetchInterval: (query) => {
      if (query.state.data?.status !== 'PENDING' || pollingTimedOut) return false;
      return Date.now() - pollingStartedAt.current < POLLING_TIMEOUT_MS ? 2_500 : false;
    },
  });

  useEffect(() => {
    if (checkout.data?.status !== 'PENDING' || pollingTimedOut) return;
    const remaining = Math.max(
      POLLING_TIMEOUT_MS - (Date.now() - pollingStartedAt.current),
      0,
    );
    const timeout = window.setTimeout(() => setPollingTimedOut(true), remaining);
    return () => window.clearTimeout(timeout);
  }, [checkout.data?.status, pollingTimedOut, sessionId]);

  useEffect(() => {
    if (checkout.data?.status !== 'PAID') return;
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['cart'] }),
      queryClient.invalidateQueries({ queryKey: ['orders'] }),
      queryClient.invalidateQueries({ queryKey: ['products', 'best-sellers'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'sales-overview'] }),
    ]);
  }, [checkout.data?.status]);

  const isPaid = checkout.data?.status === 'PAID';
  const isExpired = checkout.data?.status === 'EXPIRED';
  const isFailed = checkout.data?.status === 'FAILED';
  const isUnsuccessful = isExpired || isFailed;
  const isPending = checkout.data?.status === 'PENDING';
  const orderId = checkout.data?.orderId;
  const hasInvalidReturn = !sessionId;
  const hasStatusError = checkout.isError;

  const title = isPaid
    ? 'Pago confirmado'
    : isFailed
      ? 'El pago no pudo completarse'
      : isExpired
        ? 'La sesión de pago expiró'
        : hasStatusError
          ? 'No pudimos confirmar el pago'
          : hasInvalidReturn
            ? 'Falta la sesión de pago'
            : 'Estamos confirmando tu pago';
  const description = isPaid
    ? 'La orden ya fue creada y actualizamos tu carrito de forma segura.'
    : isFailed
      ? 'Stripe informó que el pago falló. No se creó ninguna orden y tu carrito permanece disponible.'
      : isExpired
        ? 'Esta sesión ya no está disponible. No se creó ninguna orden y tu carrito permanece guardado.'
        : hasStatusError
          ? 'No se pudo consultar esta sesión. Podés reintentar sin repetir el pago.'
          : pollingTimedOut
            ? 'La confirmación está demorando más de lo habitual. Podés volver a consultar sin repetir el pago.'
            : hasInvalidReturn
              ? 'Abrí esta pantalla desde el enlace de retorno provisto por Stripe.'
              : 'Esperamos la confirmación firmada de Stripe antes de crear tu orden.';

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6, md: 10 } }}>
      <Paper variant="outlined" sx={{ textAlign: 'center', p: { xs: 3, sm: 6 }, minWidth: 0, overflow: 'hidden' }}>
        <Box
          sx={{
            width: { xs: 68, sm: 82 },
            height: { xs: 68, sm: 82 },
            borderRadius: '50%',
            bgcolor: isPaid
              ? 'success.main'
              : isUnsuccessful || hasInvalidReturn || hasStatusError
                ? 'error.main'
                : 'primary.main',
            color: 'white',
            display: 'grid',
            placeItems: 'center',
            mx: 'auto',
            mb: { xs: 2.5, sm: 3 },
          }}
        >
          {isPaid ? (
            <CheckCircleRoundedIcon sx={{ fontSize: { xs: 40, sm: 48 } }} />
          ) : isUnsuccessful || hasInvalidReturn || hasStatusError ? (
            <ErrorOutlineRoundedIcon sx={{ fontSize: { xs: 39, sm: 46 } }} />
          ) : (
            <HourglassTopRoundedIcon sx={{ fontSize: { xs: 36, sm: 42 } }} />
          )}
        </Box>

        <Typography
          component="h1"
          variant="h3"
          sx={{ fontSize: { xs: '1.75rem', sm: '2.5rem' }, lineHeight: 1.15, overflowWrap: 'anywhere' }}
        >
          {title}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 2, lineHeight: { xs: 1.6, sm: 1.7 }, overflowWrap: 'anywhere' }}>
          {description}
        </Typography>

        {(checkout.isLoading || (isPending && checkout.isFetching && !pollingTimedOut)) && (
          <Stack
            direction="row"
            spacing={1}
            justifyContent="center"
            alignItems="center"
            useFlexGap
            flexWrap="wrap"
            sx={{ mt: 2 }}
          >
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Validando con Stripe…
            </Typography>
          </Stack>
        )}

        {checkout.isError && (
          <Alert severity="error" sx={{ mt: 3, textAlign: 'left', '& .MuiAlert-message': { overflowWrap: 'anywhere' } }}>
            {getErrorMessage(
              checkout.error,
              'No pudimos consultar esta sesión de pago.',
            )}
          </Alert>
        )}

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          justifyContent="center"
          sx={{ mt: { xs: 3, sm: 4 }, '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } } }}
        >
          {isPaid && orderId ? (
            <Button
              component={RouterLink}
              to={`/orders/${orderId}`}
              variant="contained"
            >
              Ver orden
            </Button>
          ) : (
            <Button component={RouterLink} to="/orders" variant="contained">
              Ver mis órdenes
            </Button>
          )}
          {(pollingTimedOut || checkout.isError) && sessionId && (
            <Button
              variant="outlined"
              onClick={() => {
                pollingStartedAt.current = Date.now();
                setPollingTimedOut(false);
                void checkout.refetch();
              }}
            >
              Consultar de nuevo
            </Button>
          )}
          <Button component={RouterLink} to={isUnsuccessful ? '/cart' : '/'} variant="outlined">
            {isUnsuccessful ? 'Volver al carrito' : 'Volver a la tienda'}
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
