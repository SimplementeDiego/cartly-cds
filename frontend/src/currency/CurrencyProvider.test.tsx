import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CurrencyProvider, CURRENCY_STORAGE_KEY, useCurrency } from './CurrencyProvider';

function CurrencyProbe() {
  const { currency, setCurrency, formatMoney } = useCurrency();
  return (
    <>
      <output aria-label="Moneda seleccionada">{currency}</output>
      <output aria-label="Importe">{formatMoney(100)}</output>
      <button type="button" onClick={() => setCurrency('UYU')}>Elegir UYU</button>
    </>
  );
}

describe('CurrencyProvider', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => cleanup());

  it('inicia en USD y persiste una nueva seleccion', () => {
    render(<CurrencyProvider><CurrencyProbe /></CurrencyProvider>);

    expect(screen.getByLabelText('Moneda seleccionada')).toHaveTextContent('USD');
    fireEvent.click(screen.getByRole('button', { name: 'Elegir UYU' }));
    expect(screen.getByLabelText('Moneda seleccionada')).toHaveTextContent('UYU');
    expect(window.localStorage.getItem(CURRENCY_STORAGE_KEY)).toBe('UYU');
  });

  it('recupera una seleccion persistida valida', () => {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, 'UYU');
    render(<CurrencyProvider><CurrencyProbe /></CurrencyProvider>);

    expect(screen.getByLabelText('Moneda seleccionada')).toHaveTextContent('UYU');
  });

  it('ignora valores persistidos que no estan soportados', () => {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, 'EUR');
    render(<CurrencyProvider><CurrencyProbe /></CurrencyProvider>);

    expect(screen.getByLabelText('Moneda seleccionada')).toHaveTextContent('USD');
  });
});
