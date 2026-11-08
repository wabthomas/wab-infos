import { rhNotificationPush, rhManagerPush, rhNotificationMessage } from '../apps/redaction/src/lib/redaction/rh/notifications.ts';
for (const type of ['remuneration','retrait','historical']) console.log(type, JSON.stringify(rhNotificationPush(type)));
console.log('manager retrait', JSON.stringify(rhManagerPush('retrait')));
console.log('in-app retrait', rhNotificationMessage('retrait'));
