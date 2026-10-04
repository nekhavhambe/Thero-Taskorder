declare global {
  interface Window {
    _sess?: string;
  }
}

export function session(): string {
  const id = window._sess;
  if (!id) {
    throw new Error('Missing Intacct session: window._sess is not set.');
  }
  return id;
}

export function hasSession(): boolean {
  return !!window._sess;
}