/**
 * Tiny module-level toast bus — no provider, no deps. Mutations update the UI
 * optimistically and, on failure, roll back and `toast.error(...)` so the worker
 * always feels an instant response and only hears about the rare server error.
 */

export type ToastTone = 'error' | 'success' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

type Listener = (item: ToastItem) => void;

let listeners: Listener[] = [];
let seq = 0;

export function subscribeToast(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

function emit(message: string, tone: ToastTone) {
  const item: ToastItem = { id: ++seq, message, tone };
  listeners.forEach((l) => l(item));
}

export const toast = {
  error: (message: string) => emit(message, 'error'),
  success: (message: string) => emit(message, 'success'),
  info: (message: string) => emit(message, 'info'),
};
