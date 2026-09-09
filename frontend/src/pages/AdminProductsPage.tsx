import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { api, getErrorMessage } from '../lib/api';
import { formatMoney } from '../lib/format';
import { queryClient } from '../lib/queryClient';
import type { Product, ProductInput } from '../types';
import { EmptyState, ErrorState, PageLoader } from '../components/AsyncStates';
import { PageHeader } from '../components/PageHeader';
import { ProductImage } from '../components/ProductImage';
import { SalesOverviewPanel } from '../components/SalesOverviewPanel';
import { useFeedback } from '../components/FeedbackProvider';

const productSchema = z.object({
  name: z.string().trim().min(2, 'Ingresá un nombre de al menos 2 caracteres.').max(120, 'El nombre no puede superar 120 caracteres.'),
  description: z.string().trim().min(1, 'Ingresá una descripción.').max(2000, 'La descripción no puede superar 2000 caracteres.'),
  price: z.string().trim().regex(/^\d+(?:[.,]\d{1,2})?$/, 'Ingresá un precio válido con hasta 2 decimales.').refine((value) => Number(value.replace(',', '.')) > 0, 'El precio debe ser mayor a cero.'),
  categoryId: z.string().uuid('Seleccioná una categoría.'),
  isActive: z.boolean(),
});

type ProductFormFields = z.infer<typeof productSchema>;

const maxImageSize = 5 * 1024 * 1024;
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const generalCategoryId = '20000000-0000-4000-8000-000000000001';

function ProductDialog({ product, open, onClose }: { product: Product | null; open: boolean; onClose: () => void }) {
  const { notify } = useFeedback();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: api.products.categories, enabled: open });
  const form = useForm<ProductFormFields>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', description: '', price: '', categoryId: generalCategoryId, isActive: true },
  });

  useEffect(() => {
    form.reset(product ? {
      name: product.name,
      description: product.description,
      price: (product.priceCents / 100).toFixed(2),
      categoryId: product.categoryId,
      isActive: product.isActive,
    } : { name: '', description: '', price: '', categoryId: generalCategoryId, isActive: true });
    setFile(null);
    setFileError('');
  }, [form, product, open]);

  const saveProduct = useMutation({
    mutationFn: async (values: ProductFormFields) => {
      const input: ProductInput = {
        name: values.name.trim(),
        description: values.description.trim(),
        priceCents: Math.round(Number(values.price.replace(',', '.')) * 100),
        categoryId: values.categoryId,
        isActive: values.isActive,
      };
      const saved = product
        ? await api.admin.updateProduct(product.id, input)
        : await api.admin.createProduct(input);
      return file ? api.admin.uploadImage(saved.id, file) : saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (product) queryClient.invalidateQueries({ queryKey: ['product', product.id] });
      notify(product ? 'Producto actualizado.' : 'Producto creado.');
      onClose();
    },
  });

  const chooseFile = (selected?: File) => {
    setFileError('');
    if (!selected) return setFile(null);
    if (!allowedImageTypes.includes(selected.type)) {
      setFile(null);
      setFileError('Usá una imagen JPG, PNG o WebP.');
      return;
    }
    if (selected.size > maxImageSize) {
      setFile(null);
      setFileError('La imagen no puede superar 5 MB.');
      return;
    }
    setFile(selected);
  };

  return (
    <Dialog
      open={open}
      onClose={saveProduct.isPending ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="product-dialog-title"
      slotProps={{
        paper: {
          sx: {
            m: { xs: 1.5, sm: 2 },
            width: { xs: 'calc(100% - 24px)', sm: 'calc(100% - 32px)' },
            maxHeight: { xs: 'calc(100% - 24px)', sm: 'calc(100% - 32px)' },
            borderRadius: { xs: 2.5, sm: 3 },
          },
        },
      }}
    >
      <Box
        component="form"
        noValidate
        aria-busy={saveProduct.isPending}
        onSubmit={form.handleSubmit((values) => saveProduct.mutate(values))}
        sx={{ display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column' }}
      >
        <DialogTitle id="product-dialog-title" sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 2.5 } }}>
          {product ? 'Editar producto' : 'Nuevo producto'}
        </DialogTitle>
        <DialogContent dividers sx={{ minHeight: 0, px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 2.5 } }}>
          <Stack spacing={{ xs: 2, sm: 2.3 }}>
            {saveProduct.isError && <Alert severity="error">{getErrorMessage(saveProduct.error, 'No pudimos guardar el producto.')}</Alert>}
            <TextField autoFocus fullWidth label="Nombre" error={Boolean(form.formState.errors.name)} helperText={form.formState.errors.name?.message} {...form.register('name')} />
            <TextField fullWidth label="Descripción" multiline minRows={4} error={Boolean(form.formState.errors.description)} helperText={form.formState.errors.description?.message} {...form.register('description')} />
            <Controller
              name="categoryId"
              control={form.control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  select
                  fullWidth
                  label="Categoría"
                  disabled={categoriesQuery.isLoading || categoriesQuery.isError || saveProduct.isPending}
                  error={Boolean(fieldState.error) || categoriesQuery.isError}
                  helperText={fieldState.error?.message ?? (categoriesQuery.isLoading ? 'Cargando categorías…' : categoriesQuery.isError ? 'No pudimos cargar las categorías.' : 'Ayudá a encontrar este producto en el catálogo.')}
                >
                  {!categoriesQuery.data?.some((category) => category.id === field.value) && (
                    <MenuItem value={field.value}>{product?.category.name ?? 'General'}</MenuItem>
                  )}
                  {categoriesQuery.data?.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
                </TextField>
              )}
            />
            {categoriesQuery.isError && <Button onClick={() => categoriesQuery.refetch()} sx={{ alignSelf: 'flex-start' }}>Reintentar categorías</Button>}
            <TextField
              fullWidth
              label="Precio (USD)"
              inputMode="decimal"
              error={Boolean(form.formState.errors.price)}
              helperText={form.formState.errors.price?.message ?? 'Ingresá el precio en dólares, con hasta dos decimales.'}
              slotProps={{ input: { startAdornment: <InputAdornment position="start">US$</InputAdornment> } }}
              {...form.register('price')}
            />
            <Controller
              name="isActive"
              control={form.control}
              render={({ field }) => (
                <FormControlLabel
                  sx={{ m: 0, alignItems: 'flex-start', '& .MuiFormControlLabel-label': { pt: .9, lineHeight: 1.35 } }}
                  control={<Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                  label={field.value ? 'Producto activo y visible' : 'Producto inactivo y oculto'}
                />
              )}
            />
            <Box sx={{ minWidth: 0 }}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<ImageOutlinedIcon />}
                sx={{ width: { xs: '100%', sm: 'auto' }, minHeight: 44 }}
              >
                {file ? 'Cambiar imagen' : product?.imageUrl ? 'Reemplazar imagen' : 'Seleccionar imagen'}
                <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseFile(event.target.files?.[0])} />
              </Button>
              <Typography
                variant="caption"
                color={fileError ? 'error' : 'text.secondary'}
                display="block"
                sx={{ mt: 1, overflowWrap: 'anywhere' }}
              >
                {fileError || (file ? file.name : 'JPG, PNG o WebP. Máximo 5 MB.')}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions
          disableSpacing
          sx={{
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            alignItems: 'stretch',
            gap: 1,
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
          }}
        >
          <Button sx={{ minHeight: 44, width: { xs: '100%', sm: 'auto' } }} onClick={onClose} disabled={saveProduct.isPending}>Cancelar</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saveProduct.isPending || Boolean(fileError) || categoriesQuery.isLoading || categoriesQuery.isError || !categoriesQuery.data?.length}
            startIcon={saveProduct.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ minHeight: 44, width: { xs: '100%', sm: 'auto' }, whiteSpace: 'nowrap' }}
          >
            {saveProduct.isPending ? 'Guardando…' : product ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function DeleteProductDialog({
  product,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  product: Product | null;
  pending: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={Boolean(product)}
      onClose={pending ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby="delete-product-title"
      aria-describedby="delete-product-description"
      slotProps={{ paper: { sx: { borderRadius: { xs: 2.5, sm: 3 } } } }}
    >
      <DialogTitle id="delete-product-title">Eliminar producto</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography id="delete-product-description">
            ¿Seguro que querés eliminar <strong>{product?.name}</strong>? Esta acción no se puede deshacer.
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={pending}>Cancelar</Button>
        <Button
          color="error"
          variant="contained"
          onClick={onConfirm}
          disabled={pending}
          startIcon={pending ? <CircularProgress size={16} color="inherit" /> : <DeleteOutlineRoundedIcon />}
        >
          {pending ? 'Eliminando…' : 'Eliminar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function AdminProductsPage() {
  const { notify } = useFeedback();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [dialogProduct, setDialogProduct] = useState<Product | null | undefined>(undefined);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const productsQuery = useQuery({ queryKey: ['admin', 'products'], queryFn: api.admin.products });
  const salesQuery = useQuery({
    queryKey: ['admin', 'sales-overview'],
    queryFn: api.admin.salesOverview,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: api.products.categories });
  const setStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.admin.setProductStatus(id, isActive),
    onSuccess: (updated) => {
      queryClient.setQueryData<Product[]>(['admin', 'products'], (current) => current?.map((product) => product.id === updated.id ? updated : product));
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', updated.id] });
      notify(updated.isActive ? 'Producto activado.' : 'Producto desactivado.', 'info');
    },
    onError: (error) => notify(getErrorMessage(error, 'No pudimos cambiar el estado.'), 'error'),
  });
  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.admin.deleteProduct(id),
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Product[]>(['admin', 'products'], (current) => current?.filter((product) => product.id !== deletedId));
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', deletedId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'sales-overview'] });
      notify('Producto eliminado.');
      setProductToDelete(null);
    },
  });
  const filteredProducts = useMemo(() => {
    const value = search.trim().toLocaleLowerCase();
    return productsQuery.data?.filter((product) => product.name.toLocaleLowerCase().includes(value) && (!category || product.category.slug === category)) ?? [];
  }, [productsQuery.data, search, category]);
  const hasFilters = Boolean(search.trim() || category);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4, md: 7 } }}>
      <Box sx={{ mb: { xs: 3, sm: 4 } }}>
        <SalesOverviewPanel
          data={salesQuery.data}
          loading={salesQuery.isLoading}
          error={salesQuery.isError ? getErrorMessage(salesQuery.error, 'No pudimos cargar el resumen de ventas.') : undefined}
          onRetry={() => { void salesQuery.refetch(); }}
        />
      </Box>
      <PageHeader
        eyebrow="Administración"
        title="Productos"
        titleComponent="h2"
        action={(
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => setDialogProduct(null)}
            sx={{ width: { xs: '100%', sm: 'auto' }, minHeight: 44, whiteSpace: 'nowrap' }}
          >
            Nuevo producto
          </Button>
        )}
      />
      <Alert severity="info" sx={{ mb: { xs: 2, sm: 3 } }}>
        Los precios de los productos se cargan y gestionan en USD. Las cifras de ventas también se muestran en USD. UYU es solo una conversión visual para clientes, por eso no modifica los importes del panel administrativo.
      </Alert>
      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, mb: { xs: 2, sm: 3 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar en el catálogo completo"
            slotProps={{
              htmlInput: { 'aria-label': 'Buscar productos administrables' },
              input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment> },
            }}
          />
          <TextField select fullWidth label="Categoría" value={category} onChange={(event) => setCategory(event.target.value)} disabled={categoriesQuery.isLoading || categoriesQuery.isError} sx={{ maxWidth: { sm: 250 }, flexShrink: 0 }}>
            <MenuItem value="">Todas las categorías</MenuItem>
            {categoriesQuery.data?.map((item) => <MenuItem key={item.id} value={item.slug}>{item.name}</MenuItem>)}
          </TextField>
        </Stack>
        {categoriesQuery.isError && <Alert severity="warning" sx={{ mt: 2 }} action={<Button color="inherit" size="small" onClick={() => categoriesQuery.refetch()}>Reintentar</Button>}>No pudimos cargar las categorías.</Alert>}
        {hasFilters && <Button size="small" onClick={() => { setSearch(''); setCategory(''); }} sx={{ mt: 1.5 }}>Limpiar filtros</Button>}
      </Paper>

      {productsQuery.isLoading && <PageLoader />}
      {productsQuery.isError && <ErrorState message={getErrorMessage(productsQuery.error)} onRetry={() => productsQuery.refetch()} />}
      {productsQuery.data && filteredProducts.length === 0 && (
        <EmptyState title={hasFilters ? 'No hay coincidencias' : 'El catálogo está vacío'} description={hasFilters ? 'Probá con otro nombre o categoría.' : 'Creá el primer producto para empezar.'} action={!hasFilters ? <Button variant="contained" onClick={() => setDialogProduct(null)}>Crear producto</Button> : undefined} />
      )}
      {filteredProducts.length > 0 && (
        <Stack spacing={{ xs: 1.25, sm: 1.5 }}>
          {filteredProducts.map((product) => (
            <Paper
              key={product.id}
              variant="outlined"
              sx={{
                p: { xs: 1.5, sm: 2 },
                overflow: 'hidden',
                bgcolor: product.isActive ? 'background.paper' : 'action.hover',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  minWidth: 0,
                  flexDirection: { xs: 'column', md: 'row' },
                  alignItems: { md: 'center' },
                  gap: { xs: 1.5, md: 2 },
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    width: '100%',
                    minWidth: 0,
                    flex: 1,
                    gridTemplateColumns: {
                      xs: '64px minmax(0, 1fr) auto',
                      sm: '80px minmax(0, 1fr) 88px',
                    },
                    gap: { xs: 1.25, sm: 2 },
                    alignItems: 'center',
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: 64, sm: 80 },
                      height: { xs: 64, sm: 80 },
                      borderRadius: 1.5,
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    <ProductImage src={product.imageUrl} alt={product.name} categorySlug={product.category.slug} height="100%" />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="primary" fontWeight={700} sx={{ display: 'block', mb: .5, overflowWrap: 'anywhere' }}>{product.category.name}</Typography>
                    <Typography
                      fontWeight={750}
                      sx={{
                        minWidth: 0,
                        display: '-webkit-box',
                        overflow: 'hidden',
                        overflowWrap: 'anywhere',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                      }}
                    >
                      {product.name}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: .4,
                        display: '-webkit-box',
                        overflow: 'hidden',
                        overflowWrap: 'anywhere',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                      }}
                    >
                      {product.description}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>
                    <Chip
                      label={product.isActive ? 'Activo' : 'Inactivo'}
                      color={product.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    width: { xs: '100%', md: 'auto' },
                    minWidth: 0,
                    gridTemplateColumns: {
                      xs: 'minmax(0, 1fr) auto',
                      sm: 'auto minmax(120px, auto) auto',
                      md: '120px 140px auto',
                    },
                    gridTemplateRows: { xs: 'auto auto', sm: 'auto' },
                    alignItems: 'center',
                    columnGap: { xs: 1, sm: 2 },
                    rowGap: .5,
                    pt: { xs: 1.5, md: 0 },
                    borderTop: { xs: 1, md: 0 },
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    fontWeight={800}
                    sx={{ gridColumn: 1, gridRow: 1, whiteSpace: 'nowrap' }}
                  >
                    {formatMoney(product.priceCents)}
                  </Typography>
                  <FormControlLabel
                    sx={{
                      minWidth: 0,
                      gridColumn: { xs: 1, sm: 2 },
                      gridRow: { xs: 2, sm: 1 },
                      m: 0,
                      '& .MuiFormControlLabel-label': { whiteSpace: 'nowrap' },
                    }}
                    control={(
                      <Switch
                        checked={product.isActive}
                        disabled={setStatus.isPending}
                        onChange={(_, isActive) => setStatus.mutate({ id: product.id, isActive })}
                        slotProps={{ input: { 'aria-label': `${product.isActive ? 'Desactivar' : 'Activar'} ${product.name}` } }}
                      />
                    )}
                    label={product.isActive ? 'Visible' : 'Oculto'}
                  />
                  <Stack
                    direction="row"
                    spacing={.75}
                    sx={{
                      gridColumn: { xs: 2, sm: 3 },
                      gridRow: { xs: '1 / span 2', sm: 1 },
                      justifyContent: 'flex-end',
                    }}
                  >
                    <Tooltip title="Editar producto">
                      <IconButton
                        color="primary"
                        aria-label={`Editar ${product.name}`}
                        onClick={() => setDialogProduct(product)}
                        sx={{ border: 1, borderColor: 'divider' }}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar producto">
                      <IconButton
                        color="error"
                        aria-label={`Eliminar ${product.name}`}
                        onClick={() => {
                          deleteProduct.reset();
                          setProductToDelete(product);
                        }}
                        sx={{ border: 1, borderColor: 'divider' }}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              </Box>
            </Paper>
          ))}
        </Stack>
      )}
      <ProductDialog product={dialogProduct ?? null} open={dialogProduct !== undefined} onClose={() => setDialogProduct(undefined)} />
      <DeleteProductDialog
        product={productToDelete}
        pending={deleteProduct.isPending}
        error={deleteProduct.isError ? getErrorMessage(deleteProduct.error, 'No pudimos eliminar el producto.') : undefined}
        onClose={() => {
          deleteProduct.reset();
          setProductToDelete(null);
        }}
        onConfirm={() => {
          if (productToDelete) deleteProduct.mutate(productToDelete.id);
        }}
      />
    </Container>
  );
}
