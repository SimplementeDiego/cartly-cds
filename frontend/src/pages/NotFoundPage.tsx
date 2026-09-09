import { Button, Container, Paper, Typography } from '@mui/material';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import { Link as RouterLink } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 7, md: 11 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 6 }, textAlign: 'center', overflow: 'hidden' }}>
        <ExploreOutlinedIcon color="primary" sx={{ fontSize: { xs: 50, sm: 58 }, mb: 2 }} />
        <Typography variant="overline" color="primary" fontWeight={800}>Error 404</Typography>
        <Typography component="h1" variant="h3" sx={{ mt: .5, fontSize: { xs: '1.8rem', sm: '3rem' }, lineHeight: 1.15 }}>Esta página no existe</Typography>
        <Typography color="text.secondary" sx={{ mt: 2, mb: 3, overflowWrap: 'anywhere' }}>Puede que el enlace haya cambiado o que la dirección no sea correcta.</Typography>
        <Button component={RouterLink} to="/" variant="contained" sx={{ width: { xs: '100%', sm: 'auto' } }}>Volver a la tienda</Button>
      </Paper>
    </Container>
  );
}
