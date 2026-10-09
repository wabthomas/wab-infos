import net from 'net';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

let probe: Promise<boolean> | null = null;

/**
 * Sur l'hébergement, mail.wab-infos.com pointe vers Cloudflare : les ports SMTP
 * n'y répondent pas. Postfix local (127.0.0.1:25) accepte le courrier du site.
 * Ne pas tester process.platform ici : le build tourne sous Windows et le
 * bundler supprimerait alors tout le relais du paquet serveur.
 */
export function localMailRelayAvailable(): Promise<boolean> {
  if (process.env.SMTP_RELAY === 'remote') {
    return Promise.resolve(false);
  }
  if (!probe) {
    probe = new Promise((resolve) => {
      let settled = false;
      const socket = net.connect({ host: '127.0.0.1', port: 25 });
      const finish = (value: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        socket.destroy();
        resolve(value);
      };
      const timer = setTimeout(() => finish(false), 800);
      socket.once('connect', () => finish(true));
      socket.once('error', () => finish(false));
    });
  }
  return probe;
}

export function localRelayTransportOptions(): SMTPTransport.Options {
  const options: SMTPTransport.Options = {
    name: 'wab-local-relay',
    host: '127.0.0.1',
    port: 25,
    secure: false,
    ignoreTLS: true,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  };
  return Object.assign(options, { family: 4 });
}
