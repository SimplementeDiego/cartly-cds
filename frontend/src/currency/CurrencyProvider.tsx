import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { formatUsdCents, isCurrencyCode, type CurrencyCode } from './currency';

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  formatMoney: (usdCents: number) => string;
}

export const CURRENCY_STORAGE_KEY = 'cartly.currency';

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

function readStoredCurrency(): CurrencyCode {
  if (typeof window === 'undefined') return 'USD';

  try {
    const storedCurrency = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    return isCurrencyCode(storedCurrency) ? storedCurrency : 'USD';
  } catch {
    return 'USD';
  }
}

export function CurrencyProvider({ children }: PropsWithChildren) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(readStoredCurrency);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    try {
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, code);
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
  }, []);

  useEffect(() => {
    const syncCurrency = (event: StorageEvent) => {
      if (event.key !== CURRENCY_STORAGE_KEY) return;
      setCurrencyState(isCurrencyCode(event.newValue) ? event.newValue : 'USD');
    };

    window.addEventListener('storage', syncCurrency);
    return () => window.removeEventListener('storage', syncCurrency);
  }, []);

  const formatMoney = useCallback(
    (usdCents: number) => formatUsdCents(usdCents, currency),
    [currency],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({ currency, setCurrency, formatMoney }),
    [currency, formatMoney, setCurrency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const value = useContext(CurrencyContext);
  if (!value) throw new Error('useCurrency debe utilizarse dentro de CurrencyProvider.');
  return value;
}
