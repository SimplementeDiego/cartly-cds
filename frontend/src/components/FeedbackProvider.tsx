import { Alert, Snackbar } from '@mui/material';
import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';

type Severity = 'success' | 'error' | 'info' | 'warning';

interface FeedbackContextValue {
  notify: (message: string, severity?: Severity) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined);

export function FeedbackProvider({ children }: PropsWithChildren) {
  const [feedback, setFeedback] = useState<{ message: string; severity: Severity } | null>(null);
  const notify = useCallback((message: string, severity: Severity = 'success') => {
    setFeedback({ message, severity });
  }, []);
  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={4500}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          width: { xs: 'calc(100% - 24px)', sm: 'auto' },
          maxWidth: { sm: 560 },
          bottom: { xs: 12, sm: 24 },
        }}
      >
        <Alert
          variant="filled"
          severity={feedback?.severity ?? 'success'}
          onClose={() => setFeedback(null)}
          sx={{ width: '100%', minWidth: { sm: 320 }, alignItems: 'flex-start' }}
        >
          {feedback?.message}
        </Alert>
      </Snackbar>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const value = useContext(FeedbackContext);
  if (!value) throw new Error('useFeedback debe utilizarse dentro de FeedbackProvider.');
  return value;
}
