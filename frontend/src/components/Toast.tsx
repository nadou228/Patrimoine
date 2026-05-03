import React from "react";
import { ToastMessage } from "../contexts/ToastContext";

type ToastViewportProps = {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
};

const TYPE_LABELS: Record<ToastMessage["type"], string> = {
  success: "Succes",
  error: "Erreur",
  warning: "Attention",
  info: "Info",
};

export default function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <div className="toast-content">
            <span className="toast-kicker">{TYPE_LABELS[toast.type]}</span>
            <strong>{toast.title}</strong>
            {toast.message ? <p>{toast.message}</p> : null}
          </div>
          <button type="button" onClick={() => onDismiss(toast.id)} aria-label="Fermer la notification">
            x
          </button>
          <span className="toast-progress" />
        </div>
      ))}
    </div>
  );
}
