import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { alpha } from '@mui/material/styles';
import {
  Alert,
  Box,
  Button,
  Container,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api, getErrorMessage } from '../lib/api';
import { clearPrivateQueries, queryClient } from '../lib/queryClient';
import { authQueryKey } from '../auth/AuthProvider';
import { useFeedback } from '../components/FeedbackProvider';

const emailField = z.string().trim().min(1, 'Ingresá tu correo electrónico.').email('Ingresá un correo electrónico válido.');
const passwordField = z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').max(128, 'La contraseña es demasiado larga.');
const loginSchema = z.object({ email: emailField, password: passwordField });
const registerSchema = z.object({ email: emailField, password: passwordField, confirmPassword: z.string().min(1, 'Confirmá tu contraseña.') }).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Las contraseñas no coinciden.' });

type LoginFields = z.infer<typeof loginSchema>;
type RegisterFields = z.infer<typeof registerSchema>;

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2.5, sm: 4, md: 7 } }}>
      <Paper variant="outlined" sx={{ overflow: 'hidden', maxWidth: 980, mx: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '.85fr 1.15fr' } }}>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'space-between', bgcolor: (theme) => alpha(theme.palette.primary.main, .07), color: 'text.primary', p: 6, minHeight: 610, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', bgcolor: (theme) => alpha(theme.palette.secondary.main, .08), right: -120, bottom: -100 }} />
            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ position: 'relative' }}>
              <Box sx={{ width: 38, height: 38, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 2, display: 'grid', placeItems: 'center' }}><ShoppingBagOutlinedIcon /></Box>
              <Typography variant="h5" fontWeight={850}>Cartly</Typography>
            </Stack>
            <Box sx={{ position: 'relative' }}>
              <Typography variant="h3" sx={{ mb: 2 }}>Tu próxima compra, sin complicaciones.</Typography>
              <Typography sx={{ color: 'text.secondary', lineHeight: 1.7 }}>Una cuenta te permite guardar tu carrito, personalizar tu perfil y consultar todas tus órdenes cuando quieras.</Typography>
            </Box>
            <Stack spacing={1.4} sx={{ position: 'relative' }}>
              <Stack direction="row" spacing={1.2}><VerifiedUserOutlinedIcon color="secondary" /><Typography variant="body2">Sesión protegida y pago seguro</Typography></Stack>
              <Stack direction="row" spacing={1.2}><LockOutlinedIcon color="secondary" /><Typography variant="body2">Tus datos de acceso están protegidos</Typography></Stack>
            </Stack>
          </Box>
          <Box sx={{ p: { xs: 2.5, sm: 5, md: 7 }, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: 'flex', md: 'none' }, mb: 3, color: 'primary.main' }}>
              <Box sx={{ width: 34, height: 34, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 2, display: 'grid', placeItems: 'center', flexShrink: 0 }}><ShoppingBagOutlinedIcon fontSize="small" /></Box>
              <Typography variant="h6" color="text.primary" fontWeight={850}>Cartly</Typography>
            </Stack>
            <Typography component="h1" variant="h3" sx={{ fontSize: { xs: '1.8rem', sm: '2rem', md: '2.5rem' }, lineHeight: 1.15, overflowWrap: 'anywhere' }}>{title}</Typography>
            <Typography color="text.secondary" sx={{ mt: 1, mb: { xs: 3, sm: 4 }, overflowWrap: 'anywhere' }}>{subtitle}</Typography>
            {children}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}

function PasswordInput({ label, error, helperText, registration, ...field }: { label: string; error?: boolean; helperText?: string; registration?: boolean } & React.ComponentProps<typeof TextField>) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...field}
      fullWidth
      label={label}
      type={visible ? 'text' : 'password'}
      error={error}
      helperText={helperText}
      autoComplete={registration ? 'new-password' : 'current-password'}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton edge="end" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setVisible((current) => !current)}>
                {visible ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { notify } = useFeedback();
  const state = location.state as { from?: { pathname?: string; search?: string }; message?: string } | null;
  const form = useForm<LoginFields>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const login = useMutation({
    mutationFn: api.auth.login,
    onSuccess: async (response) => {
      await clearPrivateQueries();
      queryClient.setQueryData(authQueryKey, response);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      notify('¡Qué bueno verte de nuevo!');
      const destination = state?.from?.pathname ? `${state.from.pathname}${state.from.search ?? ''}` : '/';
      navigate(destination, { replace: true });
    },
  });

  return (
    <AuthLayout title="Ingresá a tu cuenta" subtitle="Usá tu correo y contraseña para continuar.">
      <Box component="form" noValidate onSubmit={form.handleSubmit((values) => login.mutate(values))}>
        <Stack spacing={{ xs: 2, sm: 2.2 }}>
          {state?.message && <Alert severity="info" sx={{ '& .MuiAlert-message': { overflowWrap: 'anywhere' } }}>{state.message}</Alert>}
          {login.isError && <Alert severity="error" sx={{ '& .MuiAlert-message': { overflowWrap: 'anywhere' } }}>{getErrorMessage(login.error, 'No pudimos iniciar sesión.')}</Alert>}
          <TextField
            fullWidth
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            autoFocus
            error={Boolean(form.formState.errors.email)}
            helperText={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <PasswordInput label="Contraseña" error={Boolean(form.formState.errors.password)} helperText={form.formState.errors.password?.message} {...form.register('password')} />
          <Button type="submit" variant="contained" size="large" fullWidth disabled={login.isPending}>{login.isPending ? 'Ingresando…' : 'Ingresar'}</Button>
          <Typography textAlign="center" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
            ¿Todavía no tenés cuenta? <Link component={RouterLink} to="/register" fontWeight={700}>Crear cuenta</Link>
          </Typography>
        </Stack>
      </Box>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { notify } = useFeedback();
  const form = useForm<RegisterFields>({ resolver: zodResolver(registerSchema), defaultValues: { email: '', password: '', confirmPassword: '' } });
  const registerMutation = useMutation({
    mutationFn: ({ email, password }: RegisterFields) => api.auth.register({ email, password }),
    onSuccess: async (response) => {
      await clearPrivateQueries();
      queryClient.setQueryData(authQueryKey, response);
      notify('Tu cuenta fue creada correctamente.');
      navigate('/', { replace: true });
    },
  });

  return (
    <AuthLayout title="Creá tu cuenta" subtitle="Te lleva menos de un minuto.">
      <Box component="form" noValidate onSubmit={form.handleSubmit((values) => registerMutation.mutate(values))}>
        <Stack spacing={{ xs: 2, sm: 2.2 }}>
          {registerMutation.isError && <Alert severity="error" sx={{ '& .MuiAlert-message': { overflowWrap: 'anywhere' } }}>{getErrorMessage(registerMutation.error, 'No pudimos crear tu cuenta.')}</Alert>}
          <TextField
            fullWidth
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            autoFocus
            error={Boolean(form.formState.errors.email)}
            helperText={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <PasswordInput registration label="Contraseña" error={Boolean(form.formState.errors.password)} helperText={form.formState.errors.password?.message ?? 'Usá al menos 8 caracteres.'} {...form.register('password')} />
          <PasswordInput registration label="Confirmar contraseña" error={Boolean(form.formState.errors.confirmPassword)} helperText={form.formState.errors.confirmPassword?.message} {...form.register('confirmPassword')} />
          <Button type="submit" variant="contained" size="large" fullWidth disabled={registerMutation.isPending}>{registerMutation.isPending ? 'Creando cuenta…' : 'Crear cuenta'}</Button>
          <Typography variant="caption" color="text.secondary" textAlign="center">Al crear una cuenta aceptás usar Cartly exclusivamente bajo sus condiciones de compra.</Typography>
          <Typography textAlign="center" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
            ¿Ya tenés cuenta? <Link component={RouterLink} to="/login" fontWeight={700}>Ingresar</Link>
          </Typography>
        </Stack>
      </Box>
    </AuthLayout>
  );
}
