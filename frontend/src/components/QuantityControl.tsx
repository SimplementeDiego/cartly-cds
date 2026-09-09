import { IconButton, Paper, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';

export function QuantityControl({ value, onChange, disabled = false, label = 'Cantidad' }: { value: number; onChange: (value: number) => void; disabled?: boolean; label?: string }) {
  return (
    <Paper variant="outlined" sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 132, maxWidth: '100%', height: 46, borderRadius: 2.5, overflow: 'hidden', flexShrink: 0 }}>
      <IconButton size="small" aria-label={`Reducir ${label.toLowerCase()}`} onClick={() => onChange(Math.max(1, value - 1))} disabled={disabled || value <= 1} sx={{ borderRadius: 0, height: '100%', px: 1.2 }}><RemoveRoundedIcon fontSize="small" /></IconButton>
      <Typography aria-label={`${label}: ${value}`} fontWeight={750}>{value}</Typography>
      <IconButton size="small" aria-label={`Aumentar ${label.toLowerCase()}`} onClick={() => onChange(Math.min(99, value + 1))} disabled={disabled || value >= 99} sx={{ borderRadius: 0, height: '100%', px: 1.2 }}><AddRoundedIcon fontSize="small" /></IconButton>
    </Paper>
  );
}
