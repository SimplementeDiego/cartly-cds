import { Box, Typography } from '@mui/material';

export function PageHeader({ eyebrow, title, description, action, titleComponent = 'h1' }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode; titleComponent?: 'h1' | 'h2' }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', md: 'flex-end' },
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 2.5, md: 4 },
        mb: { xs: 3, sm: 4 },
        minWidth: 0,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        {eyebrow && <Typography variant="overline" color="primary" fontWeight={800} letterSpacing=".12em">{eyebrow}</Typography>}
        <Typography component={titleComponent} variant="h3" sx={{ fontSize: { xs: '1.85rem', sm: '2.2rem', md: '2.6rem' }, overflowWrap: 'anywhere' }}>{title}</Typography>
        {description && <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 680, overflowWrap: 'anywhere' }}>{description}</Typography>}
      </Box>
      {action && (
        <Box
          sx={{
            flexShrink: 0,
            width: { xs: '100%', md: 'auto' },
            '& > .MuiButton-root': { width: { xs: '100%', sm: 'auto' } },
          }}
        >
          {action}
        </Box>
      )}
    </Box>
  );
}
