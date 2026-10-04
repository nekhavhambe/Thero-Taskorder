import { connect, WindowMessenger } from 'penpal';
import { intacct } from '../services/intacct';
import { describeIntacctBody } from '../services/intacct/utils/debug';
import { session } from '../services/intacct/utils/session';

export interface ParentBridgeHandle {
  destroy(): void;
}


export function initParentBridge(iframeId = 'intacct'): ParentBridgeHandle {
  alert('initParentBridge---' + session());
  const iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
  if (!iframe) throw new Error(`Parent bridge: no iframe found with id "${iframeId}".`);
  const remoteWindow = iframe.contentWindow;
  if (!remoteWindow) throw new Error('Parent bridge: iframe has no contentWindow yet.');

  const messenger = new WindowMessenger({ remoteWindow, allowedOrigins: ['*'] });
  const connection = connect({
    messenger,
    methods: {
      async request(fnBody: string) {
        alert(`[parent] request ${describeIntacctBody(String(fnBody ?? ''))}`);
        try {
          const { text, status } = await intacct(String(fnBody ?? ''));
          alert(`[parent] response status=${status ?? '?'} chars=${text.length}`);
          return { text, status: status ?? null };
        } catch (err) {
          alert(`[parent] FAILED: ${(err as Error).message}`);
          throw err;
        }
      },
    },
  });
  connection.promise.then(
    () => alert('[parent] bridge CONNECTED to child'),
    (err) => alert(`[parent] bridge CONNECT FAILED: ${(err as Error).message}`),
  );

  return { destroy: () => connection.destroy() };
}
