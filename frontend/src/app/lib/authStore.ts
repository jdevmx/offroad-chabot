export type Session = {
  token: string;
  uid: string;
  displayName: string;
};

type Listener = (session: Session | null) => void;

let session: Session | null = null;
const listeners = new Set<Listener>();

function persist(s: Session | null): void {
  if (typeof window === 'undefined') return;
  if (s) {
    localStorage.setItem('auth_session', JSON.stringify(s));
  } else {
    localStorage.removeItem('auth_session');
  }
}

function notify(): void {
  listeners.forEach((l) => l(session));
}

export function getSession(): Session | null {
  return session;
}

export function getToken(): string | null {
  return session?.token ?? null;
}

export function setSession(s: Session): void {
  session = s;
  persist(s);
  notify();
}

export function clearSession(): void {
  session = null;
  persist(null);
  notify();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('auth_session');
  if (stored) {
    try {
      session = JSON.parse(stored) as Session;
    } catch {
      // ignore malformed data
    }
  }
}
