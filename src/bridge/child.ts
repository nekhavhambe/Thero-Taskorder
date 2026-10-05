import { CallOptions, connect, WindowMessenger } from 'penpal';
import type { Connection, Methods, RemoteProxy } from 'penpal';
import type { IntacctFunctionResult } from '../services/intacct';
import { hasSession } from '../services/intacct/utils/session';

/** Methods the parent page exposes to the iframed app. */
export interface ParentBridgeApi extends Methods {
  request(fnBody: string): Promise<{ text: string; status: string | null }>;
  /** Fill the parent page form with values and submit it there. */
  submitForm(params: {
    values: Record<string, string>;
  }): Promise<{ text: string }>;
}

/** Resolves the connected parent API (handshakes first if needed). */
export function getParentApi(): Promise<RemoteProxy<ParentBridgeApi>> {
  return getConnection().promise;
}

let connection: Connection<ParentBridgeApi> | null = null;

function getConnection(): Connection<ParentBridgeApi> {
  if (!connection) {
    const messenger = new WindowMessenger({
      remoteWindow: window.parent,
      allowedOrigins: ['*'],
    });
    connection = connect<ParentBridgeApi>({ messenger, methods: {}, timeout: 10000 });
  }
  return connection;
}

/** True when this page runs inside another page's iframe. */
export function isEmbedded(): boolean {
  try {
    return window.parent !== window;
  } catch {
    return true; // Sandboxed opaque origin — treat as embedded.
  }
}

/**
 * Runs one Intacct `<function>` body through the parent (which owns the
 * session) and rehydrates the `Document` locally. Use when `hasSession()`
 * is false — i.e. this page runs iframed without its own session.
 */
export async function intacctViaBridge(body: string): Promise<IntacctFunctionResult> {
  try {
    const parent = await getConnection().promise;
    const res = await parent.request(body, new CallOptions({ timeout: 15000 }));
    const text = res?.text ?? '';
    const xml = new DOMParser().parseFromString(text, 'text/xml');
    return {
      text,
      xml,
      status: res?.status ?? undefined,
    };
  } catch (err) {
    // Drop the dead connection so the next call re-handshakes from scratch.
    connection?.destroy();
    connection = null;
    throw err;
  }
}

export interface InstalledBridgeChild {
  /** Stop bridging and release the connection. */
  uninstall(): void;
}

/**
 * Child-side bootstrap for the iframed app. No-op (returns null) unless
 * embedded without its own session. Warms up the parent connection so the
 * first bridged call doesn't pay the handshake cost.
 *
 * Call once at startup (e.g. in main.tsx).
 */
/** Bump on every deploy so the iframe can prove which bundle it runs. */
export const BUILD_ID = 'preload-fix-1';

export function installBridgeChild(): InstalledBridgeChild | null {
  if (typeof window === 'undefined' || !isEmbedded()) {
    return null;
  }
  if (hasSession()) {
    return null; // Own session — no bridge needed.
  }

  getConnection().promise.catch(() => {
    // Handshake failures surface on the first call; nothing to do here.
  });

  let uninstalled = false;
  return {
    uninstall() {
      if (uninstalled) return;
      uninstalled = true;
      connection?.destroy();
      connection = null;
    },
  };
}
