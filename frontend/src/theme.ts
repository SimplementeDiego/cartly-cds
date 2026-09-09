import { alpha, createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#4f46e5', dark: '#3730a3', light: '#818cf8', contrastText: '#ffffff' },
    secondary: { main: '#c24160', dark: '#9f2948', light: '#eb8ba1', contrastText: '#ffffff' },
    background: { default: '#f7f8fc', paper: '#ffffff' },
    text: { primary: '#1e2340', secondary: '#606981' },
    divider: '#e1e5f0',
    success: { main: '#2563eb' },
    error: { main: '#c43651' },
    warning: { main: '#a65e00' },
    info: { main: '#2563eb' },
  },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.045em' },
    h2: { fontWeight: 780, letterSpacing: '-0.035em' },
    h3: { fontWeight: 750, letterSpacing: '-0.025em' },
    h4: { fontWeight: 730, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.015em' },
    h6: { fontWeight: 700 },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  shape: { borderRadius: 14 },
  shadows: [
    'none',
    '0 1px 2px rgba(30,35,64,.05)',
    '0 3px 10px rgba(30,35,64,.07)',
    '0 8px 24px rgba(30,35,64,.08)',
    '0 12px 34px rgba(30,35,64,.10)',
    ...Array(20).fill('0 16px 40px rgba(30,35,64,.12)'),
  ] as never,
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        '::selection': { backgroundColor: alpha(theme.palette.primary.main, 0.18) },
      }),
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10, minHeight: 42, paddingInline: 18 },
        containedPrimary: ({ theme }) => ({ boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.18)}` }),
      },
    },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 10,
          background: theme.palette.background.paper,
          '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.12)}` },
        }),
      },
    },
    MuiCard: { styleOverrides: { root: { borderRadius: 18 } } },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 18 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 650 } } },
    MuiDialog: {
      styleOverrides: {
        paper: {
          '@media (max-width: 599.95px)': {
            margin: 16,
            width: 'calc(100% - 32px)',
            maxHeight: 'calc(100% - 32px)',
          },
        },
      },
    },
  },
});
