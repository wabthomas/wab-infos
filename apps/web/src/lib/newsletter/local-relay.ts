import type SMTPTransport from 'nodemailer/lib/smtp-transport';

const HOSTING_SMTP_HOSTS = new Set(['mail.wab-infos.com', 'nodels64-eu.n0c.com']);

/**
 * Ces noms n'acceptent pas le SMTP public. Sur l'hébergement, Postfix écoute
 * en local. Pas de sonde réseau : un échec au redémarrage restait mémorisé
 * et bloquait ensuite tous les envois.
 */
export function usesHostingRelay(host: string | null | undefined): boolean {
  if (process.env.SMTP_RELAY === 'remote') return false;
  if (process.env.SMTP_RELAY === 'local') return true;
  return HOSTING_SMTP_HOSTS.has((host || '').trim().toLowerCase());
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
