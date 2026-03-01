// lib/notificationsBus.ts
type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeNotificationsChanged(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function notifyNotificationsChanged(): void {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      // no-op (não derruba o app por listener ruim)
    }
  }
}