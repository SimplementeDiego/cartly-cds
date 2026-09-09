import { describe, expect, it } from 'vitest';
import {
  USD_UYU_RATE,
  convertDisplayCentsToUsdCents,
  convertUsdCentsToDisplayCents,
  formatUsdCents,
  resolveUsdUyuRate,
} from './currency';

describe('currency conversion', () => {
  it('usa 42 pesos por dolar cuando la configuracion no es valida', () => {
    expect(resolveUsdUyuRate(undefined)).toBe(42);
    expect(resolveUsdUyuRate('')).toBe(42);
    expect(resolveUsdUyuRate('-3')).toBe(42);
  });

  it('mantiene sin cambios los centavos cuando la moneda es USD', () => {
    expect(convertUsdCentsToDisplayCents(12_345, 'USD')).toBe(12_345);
    expect(convertDisplayCentsToUsdCents(12_345, 'USD')).toBe(12_345);
  });

  it('convierte centavos USD a centesimos UYU con la tasa configurada', () => {
    expect(convertUsdCentsToDisplayCents(12_345, 'UYU')).toBe(Math.round(12_345 * USD_UYU_RATE));
  });

  it('aplica los redondeos inclusivos correctos al convertir filtros a USD', () => {
    const displayCents = 100;
    const exactUsdCents = displayCents / USD_UYU_RATE;

    expect(convertDisplayCentsToUsdCents(displayCents, 'UYU', 'min')).toBe(Math.ceil(exactUsdCents));
    expect(convertDisplayCentsToUsdCents(displayCents, 'UYU', 'max')).toBe(Math.floor(exactUsdCents));
    expect(convertDisplayCentsToUsdCents(displayCents, 'UYU')).toBe(Math.round(exactUsdCents));
  });

  it('formatea el importe en la moneda seleccionada', () => {
    expect(formatUsdCents(100, 'UYU')).toContain(
      new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2 }).format(USD_UYU_RATE),
    );
  });
});
