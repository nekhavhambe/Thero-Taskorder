import { connect, WindowMessenger } from 'penpal';
import { intacct } from '../services/intacct';

export interface ParentBridgeHandle {
  destroy(): void;
}


export function initParentBridge(iframeId = 'intacct'): ParentBridgeHandle {
  const iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
  if (!iframe) throw new Error(`Parent bridge: no iframe found with id "${iframeId}".`);
  const remoteWindow = iframe.contentWindow;
  if (!remoteWindow) throw new Error('Parent bridge: iframe has no contentWindow yet.');

  const messenger = new WindowMessenger({ remoteWindow, allowedOrigins: ['*'] });
  const connection = connect({
    messenger,
    methods: {
      async request(fnBody: string) {
        const { text, status } = await intacct(String(fnBody ?? ''));
        return { text, status: status ?? null };
      },
    },
  });

  return { destroy: () => connection.destroy() };
}
