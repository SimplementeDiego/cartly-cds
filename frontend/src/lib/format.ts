const fallbackCurrency = 'USD';

export function formatMoney(cents: number, currency = fallbackCurrency) {
  return new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-UY', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function shortOrderId(id: string) {
  return id.length > 10 ? id.slice(-8).toUpperCase() : id.toUpperCase();
}
