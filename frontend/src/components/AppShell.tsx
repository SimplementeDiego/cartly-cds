import { useEffect, useState } from 'react';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth, authQueryKey } from '../auth/AuthProvider';
import { api, getErrorMessage } from '../lib/api';
import { clearPrivateQueries, queryClient } from '../lib/queryClient';
import { useCurrency } from '../currency/CurrencyProvider';
import { useFeedback } from './FeedbackProvider';

const navItems = [
  { label: 'Inicio', to: '/', icon: <HomeRoundedIcon /> },
  { label: 'Explorar productos', to: '/products', icon: <ShoppingBagOutlinedIcon /> },
  { label: 'Mis órdenes', to: '/orders', auth: true, icon: <ReceiptLongOutlinedIcon /> },
  { label: 'Mi perfil', to: '/profile', auth: true, icon: <PersonOutlineRoundedIcon /> },
];

const appBarToolbarHeight = { xs: 64, sm: 68, lg: 76 } as const;

export function AppShell() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: api.cart.get,
    enabled: isAuthenticated,
    staleTime: 15_000,
  });

  const logout = useMutation({
    mutationFn: api.auth.logout,
    onSuccess: async () => {
      queryClient.setQueryData(authQueryKey, { user: null });
      await clearPrivateQueries();
      setAccountAnchor(null);
      notify('Sesión cerrada correctamente.');
      navigate('/');
    },
    onError: (error) => notify(getErrorMessage(error, 'No pudimos cerrar la sesión.'), 'error'),
  });

  const itemCount = cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
  const accountName = user?.displayName?.trim() || user?.email || '';
  const initials = user?.displayName?.trim()
    ? user.displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
    : user?.email.slice(0, 1).toUpperCase();
  const isCurrent = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const navigation = (
    <List component="nav" aria-label="Navegación principal" sx={{ px: 1.5, py: 1.5 }}>
      {navItems.filter((item) => !item.auth || isAuthenticated).map((item) => (
        <ListItemButton
          key={item.to}
          component={RouterLink}
          to={item.to}
          selected={isCurrent(item.to)}
          aria-current={isCurrent(item.to) ? 'page' : undefined}
          onClick={() => setDrawerOpen(false)}
          sx={{ borderRadius: 2, mb: .5, minHeight: 48 }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItemButton>
      ))}
      {isAuthenticated && (
        <ListItemButton
          component={RouterLink}
          to="/cart"
          selected={isCurrent('/cart')}
          aria-current={isCurrent('/cart') ? 'page' : undefined}
          onClick={() => setDrawerOpen(false)}
          sx={{ borderRadius: 2, mb: .5, minHeight: 48 }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Badge badgeContent={itemCount} color="secondary" max={99}>
              <ShoppingCartOutlinedIcon />
            </Badge>
          </ListItemIcon>
          <ListItemText primary="Carrito" />
        </ListItemButton>
      )}
      {isAdmin && (
        <ListItemButton
          component={RouterLink}
          to="/admin/products"
          selected={isCurrent('/admin')}
          aria-current={isCurrent('/admin') ? 'page' : undefined}
          onClick={() => setDrawerOpen(false)}
          sx={{ borderRadius: 2, minHeight: 48 }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}><AdminPanelSettingsOutlinedIcon /></ListItemIcon>
          <ListItemText primary="Administración" />
        </ListItemButton>
      )}
    </List>
  );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box component="a" href="#contenido" sx={{ position: 'fixed', top: -80, left: 12, zIndex: 2000, bgcolor: 'primary.main', color: 'white', px: 2, py: 1, borderRadius: 1, '&:focus': { top: 12 } }}>
        Saltar al contenido
      </Box>
      <AppBar
        position="fixed"
        className="mui-fixed"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: (theme) => alpha(theme.palette.background.paper, .95), backdropFilter: 'blur(14px)' }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 1, sm: 2, lg: 3 } }}>
          <Toolbar disableGutters sx={{ minHeight: appBarToolbarHeight, gap: { xs: .5, sm: 1 } }}>
            <IconButton
              aria-label="Abrir menú de navegación"
              aria-controls={drawerOpen ? 'mobile-navigation' : undefined}
              aria-expanded={drawerOpen ? 'true' : undefined}
              onClick={() => setDrawerOpen(true)}
              sx={{ display: { lg: 'none' }, flexShrink: 0 }}
            >
              <MenuRoundedIcon />
            </IconButton>
            <Box
              component={RouterLink}
              to="/"
              aria-label="Cartly, inicio"
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: { lg: 3 }, minWidth: 0, flexShrink: 0 }}
            >
              <Box sx={{ width: { xs: 34, sm: 38 }, height: { xs: 34, sm: 38 }, borderRadius: '12px 12px 12px 4px', display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: 'white', flexShrink: 0 }}>
                <ShoppingBagOutlinedIcon fontSize="small" />
              </Box>
              <Typography variant="h5" fontWeight={850} letterSpacing="-.04em" sx={{ display: { xs: 'none', sm: 'block' } }}>Cartly</Typography>
            </Box>

            <Stack component="nav" aria-label="Navegación principal" direction="row" spacing={.25} sx={{ display: { xs: 'none', lg: 'flex' }, flex: 1, minWidth: 0 }}>
              {navItems.filter((item) => !item.auth || isAuthenticated).map((item) => (
                <Button
                  key={item.to}
                  component={RouterLink}
                  to={item.to}
                  color={isCurrent(item.to) ? 'primary' : 'inherit'}
                  aria-current={isCurrent(item.to) ? 'page' : undefined}
                  sx={{ whiteSpace: 'nowrap', px: 1.5 }}
                >
                  {item.label}
                </Button>
              ))}
              {isAdmin && (
                <Button
                  component={RouterLink}
                  to="/admin/products"
                  color={isCurrent('/admin') ? 'primary' : 'inherit'}
                  aria-current={isCurrent('/admin') ? 'page' : undefined}
                  startIcon={<AdminPanelSettingsOutlinedIcon />}
                  sx={{ whiteSpace: 'nowrap', px: 1.5 }}
                >
                  Administración
                </Button>
              )}
            </Stack>

            <Box sx={{ flex: { xs: 1, lg: 0 }, minWidth: 0 }} />
            <Select
              value={currency}
              onChange={(event) => setCurrency(event.target.value as typeof currency)}
              renderValue={(value) => value}
              size="small"
              inputProps={{ 'aria-label': 'Moneda' }}
              sx={{
                height: { xs: 36, sm: 40 },
                minWidth: { xs: 66, sm: 76 },
                mr: { xs: 0, sm: .5 },
                flexShrink: 0,
                fontSize: { xs: '.78rem', sm: '.875rem' },
                fontWeight: 750,
                '& .MuiSelect-select': {
                  py: .75,
                  pl: { xs: 1, sm: 1.25 },
                  pr: '26px !important',
                },
                '& .MuiSelect-icon': { right: 2 },
              }}
            >
              <MenuItem value="USD">USD · Dólares estadounidenses</MenuItem>
              <MenuItem value="UYU">UYU · Pesos uruguayos</MenuItem>
            </Select>
            {isAuthenticated ? (
              <Stack direction="row" spacing={{ xs: 0, sm: .5 }} alignItems="center" sx={{ flexShrink: 0 }}>
                <Tooltip title="Carrito">
                  <IconButton component={RouterLink} to="/cart" aria-label={`Carrito, ${itemCount} productos`} color={isCurrent('/cart') ? 'primary' : 'default'}>
                    <Badge badgeContent={itemCount} color="secondary" max={99}><ShoppingCartOutlinedIcon /></Badge>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Cuenta">
                  <IconButton id="user-menu" data-testid="user-menu" aria-label="Abrir menú de cuenta" aria-controls={accountAnchor ? 'account-menu' : undefined} aria-haspopup="true" aria-expanded={accountAnchor ? 'true' : undefined} onClick={(event) => setAccountAnchor(event.currentTarget)}>
                    <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14, fontWeight: 800 }}>{initials}</Avatar>
                  </IconButton>
                </Tooltip>
                <Menu id="account-menu" anchorEl={accountAnchor} open={Boolean(accountAnchor)} onClose={() => setAccountAnchor(null)} MenuListProps={{ 'aria-labelledby': 'user-menu' }}>
                  <Box sx={{ px: 2, py: 1, maxWidth: 260 }}>
                    <Typography variant="caption" color="text.secondary">Sesión iniciada como</Typography>
                    <Typography variant="body2" fontWeight={700} noWrap>{accountName}</Typography>
                    {user?.displayName && <Typography variant="caption" color="text.secondary" display="block" noWrap>{user.email}</Typography>}
                  </Box>
                  <Divider />
                  <MenuItem component={RouterLink} to="/profile" onClick={() => setAccountAnchor(null)}><PersonOutlineRoundedIcon fontSize="small" sx={{ mr: 1.5 }} />Mi perfil</MenuItem>
                  <MenuItem component={RouterLink} to="/orders" onClick={() => setAccountAnchor(null)}><ReceiptLongOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} />Mis órdenes</MenuItem>
                  {isAdmin && <MenuItem component={RouterLink} to="/admin/products" onClick={() => setAccountAnchor(null)}><AdminPanelSettingsOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} />Administración</MenuItem>}
                  <Divider />
                  <MenuItem data-testid="logout-button" onClick={() => logout.mutate()} disabled={logout.isPending}><LogoutRoundedIcon fontSize="small" sx={{ mr: 1.5 }} />Cerrar sesión</MenuItem>
                </Menu>
              </Stack>
            ) : (
              <Button
                component={RouterLink}
                to="/login"
                variant="contained"
                startIcon={<PersonOutlineRoundedIcon />}
                sx={{
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  px: { xs: 1, sm: 2 },
                  fontSize: { xs: '.78rem', sm: '.875rem' },
                  '& .MuiButton-startIcon': { display: { xs: 'none', sm: 'inherit' } },
                }}
              >
                Iniciar sesión
              </Button>
            )}
          </Toolbar>
        </Container>
      </AppBar>
      <Toolbar aria-hidden="true" disableGutters sx={{ minHeight: appBarToolbarHeight, flexShrink: 0 }} />

      <Drawer
        id="mobile-navigation"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: 'min(88vw, 320px)',
            maxWidth: '100%',
            pb: 'env(safe-area-inset-bottom)',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: 'white' }}><ShoppingBagOutlinedIcon fontSize="small" /></Box>
          <Typography variant="h5" fontWeight={850}>Cartly</Typography>
          <IconButton aria-label="Cerrar menú de navegación" onClick={() => setDrawerOpen(false)} sx={{ ml: 'auto' }}>
            <CloseRoundedIcon />
          </IconButton>
        </Box>
        <Divider />
        {navigation}
        {isAuthenticated ? (
          <Box sx={{ p: 2, mt: 'auto', borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">Sesión iniciada como</Typography>
            <Typography variant="body2" fontWeight={700} noWrap sx={{ mb: 1.5 }}>{accountName}</Typography>
            <Button
              fullWidth
              color="inherit"
              startIcon={<LogoutRoundedIcon />}
              onClick={() => {
                setDrawerOpen(false);
                logout.mutate();
              }}
              disabled={logout.isPending}
            >
              Cerrar sesión
            </Button>
          </Box>
        ) : (
          <Stack spacing={1} sx={{ p: 2, mt: 'auto' }}>
            <Button fullWidth variant="contained" component={RouterLink} to="/login" onClick={() => setDrawerOpen(false)}>Iniciar sesión</Button>
            <Button fullWidth component={RouterLink} to="/register" onClick={() => setDrawerOpen(false)}>Crear cuenta</Button>
          </Stack>
        )}
      </Drawer>

      <Box id="contenido" component="main" sx={{ flex: 1 }}>
        <Outlet />
      </Box>
      <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 4 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: .5, sm: 2 }, justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
          <Typography fontWeight={800}>Cartly</Typography>
          <Typography variant="body2" color="text.secondary">Compras simples, precios claros.</Typography>
        </Container>
      </Box>
    </Box>
  );
}
