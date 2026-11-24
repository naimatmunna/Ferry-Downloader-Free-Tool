import { create } from 'zustand';

let seq = 0;

/** Transient notifications, announced through an aria-live region. */
export const useToasts = create((set, get) => ({
  toasts: [],
  push({ title, body = null, tone = 'info', action = null, timeout = 6000 }) {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, title, body, tone, action }] }));
    if (timeout) setTimeout(() => get().dismiss(id), timeout);
    return id;
  },
  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

export const toast = (opts) => useToasts.getState().push(opts);
