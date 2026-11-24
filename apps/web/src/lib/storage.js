/**
 * localStorage that never throws (private mode, blocked storage, quota).
 * Falls back to memory so the app keeps working for the session.
 */
const memory = new Map();

function ls() {
  try {
    const s = window.localStorage;
    const probe = '__ferry_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

const backend = typeof window === 'undefined' ? null : ls();

export const storage = {
  available: Boolean(backend),
  get(key) {
    try {
      const raw = backend ? backend.getItem(key) : memory.get(key);
      return raw == null ? null : JSON.parse(raw);
    } catch {
      return null;
    }
  },
  set(key, value) {
    const raw = JSON.stringify(value);
    try {
      if (backend) backend.setItem(key, raw);
      else memory.set(key, raw);
    } catch {
      memory.set(key, raw);
    }
  },
  remove(key) {
    try {
      backend?.removeItem(key);
    } catch {
      /* ignore */
    }
    memory.delete(key);
  },
  /** Zustand `persist` storage adapter. */
  zustand: {
    getItem: (name) => {
      try {
        return backend ? backend.getItem(name) : memory.get(name) ?? null;
      } catch {
        return memory.get(name) ?? null;
      }
    },
    setItem: (name, value) => {
      try {
        if (backend) backend.setItem(name, value);
        else memory.set(name, value);
      } catch {
        memory.set(name, value);
      }
    },
    removeItem: (name) => {
      try {
        backend?.removeItem(name);
      } catch {
        /* ignore */
      }
      memory.delete(name);
    },
  },
  /** Approximate bytes used by Ferry keys. */
  usage() {
    if (!backend) return 0;
    let n = 0;
    try {
      for (let i = 0; i < backend.length; i += 1) {
        const k = backend.key(i);
        if (k?.startsWith('ferry:')) n += (k.length + (backend.getItem(k)?.length ?? 0)) * 2;
      }
    } catch {
      /* ignore */
    }
    return n;
  },
  clearAll() {
    if (!backend) return memory.clear();
    try {
      const keys = [];
      for (let i = 0; i < backend.length; i += 1) {
        const k = backend.key(i);
        if (k?.startsWith('ferry:')) keys.push(k);
      }
      keys.forEach((k) => backend.removeItem(k));
    } catch {
      /* ignore */
    }
  },
};
