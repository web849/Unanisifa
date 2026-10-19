"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; message: string; kind: ToastKind };

const ToastContext = createContext<((message: string, kind?: ToastKind) => void) | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // প্রভাইডারের বাইরে হলে চুপচাপ নো-অপ — পেজ ক্র্যাশ করবে না
    return (_message: string, _kind: ToastKind = "info") => undefined;
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const push = useCallback((message: string, kind: ToastKind = "info") => {
    counter.current += 1;
    const id = counter.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.kind}`}>
            {toast.kind === "success" ? (
              <CheckCircle2 aria-hidden="true" />
            ) : toast.kind === "error" ? (
              <AlertTriangle aria-hidden="true" />
            ) : (
              <Info aria-hidden="true" />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
