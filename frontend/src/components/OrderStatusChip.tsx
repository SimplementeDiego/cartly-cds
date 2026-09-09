import { Chip } from '@mui/material';
import type { OrderStatus } from '../types';

const statusMap: Record<OrderStatus, { label: string; color: 'warning' | 'success' | 'default' | 'info' }> = {
  PENDING: { label: 'Pendiente', color: 'warning' },
  PAID: { label: 'Pagada', color: 'success' },
  CANCELLED: { label: 'Cancelada', color: 'default' },
  REFUNDED: { label: 'Reembolsada', color: 'info' },
};

export function OrderStatusChip({ status }: { status: OrderStatus }) {
  const config = statusMap[status] ?? { label: status, color: 'default' as const };
  return <Chip label={config.label} color={config.color} size="small" sx={{ maxWidth: '100%' }} />;
}
