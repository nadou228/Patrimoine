import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning" | "info";
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

type ConfirmState = ConfirmOptions & {
  open: boolean;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: React.PropsWithChildren) {
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const [state, setState] = useState<ConfirmState | null>(null);

  const close = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setState(null);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({
        open: true,
        confirmLabel: "Confirmer",
        cancelLabel: "Annuler",
        tone: "warning",
        ...options,
      });
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state?.open ? (
        <div className="confirm-overlay" role="presentation" onClick={() => close(false)}>
          <div
            className={`confirm-dialog confirm-${state.tone || "warning"}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="confirm-dialog-header">
              <span className="confirm-dialog-kicker">Confirmation</span>
              <h3 id="confirm-title">{state.title}</h3>
            </div>
            <p id="confirm-message">{state.message}</p>
            <div className="confirm-dialog-actions">
              <button type="button" className="btn-cancel-light" onClick={() => close(false)}>
                {state.cancelLabel}
              </button>
              <button type="button" className={`primary-premium ${state.tone === 'danger' ? 'danger' : ''}`} onClick={() => close(true)}>
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm doit etre utilise dans ConfirmProvider");
  }
  return context;
}
