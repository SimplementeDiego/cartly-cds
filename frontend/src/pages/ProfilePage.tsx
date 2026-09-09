import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { authQueryKey, useAuth } from '../auth/AuthProvider';
import { ErrorState, PageLoader } from '../components/AsyncStates';
import { useFeedback } from '../components/FeedbackProvider';
import { PageHeader } from '../components/PageHeader';
import { api, getErrorMessage } from '../lib/api';
import { queryClient } from '../lib/queryClient';
import type { ProfileInput, UserProfile } from '../types';

const profileSchema = z.object({
  displayName: z.string().trim().max(100, 'El nombre no puede superar 100 caracteres.'),
  phone: z.string().trim().max(30, 'El teléfono no puede superar 30 caracteres.'),
  address: z.string().trim().max(250, 'La dirección no puede superar 250 caracteres.'),
  city: z.string().trim().max(100, 'La ciudad no puede superar 100 caracteres.'),
  country: z.string().trim().max(100, 'El país no puede superar 100 caracteres.'),
});

type ProfileFields = z.infer<typeof profileSchema>;

function toFormValues(profile: UserProfile): ProfileFields {
  return {
    displayName: profile.displayName ?? '',
    phone: profile.phone ?? '',
    address: profile.address ?? '',
    city: profile.city ?? '',
    country: profile.country ?? '',
  };
}

function ProfileEditor({ profile }: { profile: UserProfile }) {
  const { notify } = useFeedback();
  // Mount only after the profile has loaded so an empty form cannot overwrite it.
  // Background refetches also leave any unsaved edits intact.
  const form = useForm<ProfileFields>({
    resolver: zodResolver(profileSchema),
    defaultValues: toFormValues(profile),
  });

  const saveProfile = useMutation({
    mutationFn: (values: ProfileFields) => {
      const input: ProfileInput = {
        displayName: values.displayName || null,
        phone: values.phone || null,
        address: values.address || null,
        city: values.city || null,
        country: values.country || null,
      };
      return api.users.updateProfile(input);
    },
    onSuccess: (saved) => {
      const session = queryClient.getQueryData<{ user: { id: string } | null }>(authQueryKey);
      if (session?.user?.id !== saved.id) return;
      form.reset(toFormValues(saved));
      queryClient.setQueryData(['profile', saved.id], saved);
      void queryClient.invalidateQueries({ queryKey: ['profile', saved.id] });
      void queryClient.invalidateQueries({ queryKey: authQueryKey });
      notify('Tu perfil se guardó correctamente.');
    },
  });

  const initials = profile.displayName?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toLocaleUpperCase('es') || profile.email.charAt(0).toLocaleUpperCase('es');
  const memberSince = profile.createdAt
    ? new Intl.DateTimeFormat('es-UY', { dateStyle: 'long' }).format(new Date(profile.createdAt))
    : null;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(240px, 1fr) minmax(0, 2fr)' }, gap: { xs: 2, md: 3 }, alignItems: 'start' }}>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 }, minWidth: 0 }}>
        <Stack spacing={2} alignItems="center" textAlign="center">
          <Avatar sx={{ width: 76, height: 76, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: 28, fontWeight: 700 }}>
            {initials}
          </Avatar>
          <Box sx={{ width: '100%', minWidth: 0 }}>
            <Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>{profile.displayName || profile.email}</Typography>
            {profile.displayName && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>{profile.email}</Typography>
            )}
          </Box>
          <Chip label={profile.role === 'ADMIN' ? 'Administrador' : 'Cliente'} color="primary" variant="outlined" size="small" />
          {memberSince && (
            <Typography variant="caption" color="text.secondary">Miembro desde el {memberSince}</Typography>
          )}
        </Stack>
      </Paper>

      <Paper
        component="form"
        variant="outlined"
        noValidate
        aria-busy={saveProfile.isPending}
        onSubmit={form.handleSubmit((values) => saveProfile.mutate(values))}
        sx={{ p: { xs: 2, sm: 3, lg: 4 }, minWidth: 0 }}
      >
        <Typography variant="h6" component="h2">Información personal</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
          Todos los campos son opcionales.
        </Typography>
        <Stack spacing={2.5}>
          {saveProfile.isError && <Alert severity="error">{getErrorMessage(saveProfile.error, 'No pudimos guardar tu perfil.')}</Alert>}
          <Box component="fieldset" disabled={saveProfile.isPending} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                label="Nombre y apellido"
                autoComplete="name"
                error={Boolean(form.formState.errors.displayName)}
                helperText={form.formState.errors.displayName?.message}
                slotProps={{ htmlInput: { maxLength: 100 } }}
                {...form.register('displayName')}
              />
              <TextField
                fullWidth
                label="Teléfono"
                type="tel"
                autoComplete="tel"
                error={Boolean(form.formState.errors.phone)}
                helperText={form.formState.errors.phone?.message}
                slotProps={{ htmlInput: { maxLength: 30 } }}
                {...form.register('phone')}
              />
              <TextField
                fullWidth
                label="Dirección"
                autoComplete="street-address"
                error={Boolean(form.formState.errors.address)}
                helperText={form.formState.errors.address?.message}
                slotProps={{ htmlInput: { maxLength: 250 } }}
                {...form.register('address')}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2.5 }}>
                <TextField
                  fullWidth
                  label="Ciudad"
                  autoComplete="address-level2"
                  error={Boolean(form.formState.errors.city)}
                  helperText={form.formState.errors.city?.message}
                  slotProps={{ htmlInput: { maxLength: 100 } }}
                  {...form.register('city')}
                />
                <TextField
                  fullWidth
                  label="País"
                  autoComplete="country-name"
                  error={Boolean(form.formState.errors.country)}
                  helperText={form.formState.errors.country?.message}
                  slotProps={{ htmlInput: { maxLength: 100 } }}
                  {...form.register('country')}
                />
              </Box>
            </Stack>
          </Box>
          <Divider />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap justifyContent="flex-end">
            <Button
              type="button"
              variant="outlined"
              disabled={!form.formState.isDirty || saveProfile.isPending}
              sx={{ order: { xs: 2, sm: 1 } }}
              onClick={() => {
                form.reset(toFormValues(profile));
                saveProfile.reset();
              }}
            >
              Cancelar cambios
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!form.formState.isDirty || saveProfile.isPending}
              startIcon={saveProfile.isPending ? <CircularProgress size={18} color="inherit" /> : <SaveOutlinedIcon />}
              sx={{ order: { xs: 1, sm: 2 } }}
            >
              {saveProfile.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: api.users.profile,
    enabled: Boolean(user),
  });

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4, md: 7 } }}>
      <PageHeader title="Mi perfil" />
      {profileQuery.isPending && <PageLoader />}
      {profileQuery.isError && <ErrorState message={getErrorMessage(profileQuery.error)} onRetry={() => profileQuery.refetch()} />}
      {profileQuery.data && <ProfileEditor key={profileQuery.data.id} profile={profileQuery.data} />}
    </Container>
  );
}
