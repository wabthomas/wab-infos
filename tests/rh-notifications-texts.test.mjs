import assert from 'node:assert/strict';
import test from 'node:test';
import { rhNotificationPush, rhManagerPush } from '../apps/redaction/src/lib/redaction/rh/notifications.ts';

test('notifications paiement choisies', () => {
  assert.deepEqual(rhNotificationPush('remuneration'), {
    title: 'Salaire disponible',
    body: 'Votre rémunération a été validée. Ouvrez Mon espace RH pour la consulter.',
    url: '/mon-rh/remunerations',
  });
  assert.equal(rhNotificationPush('retrait').title, 'Retrait traité');
  assert.equal(rhNotificationPush('historical').title, 'Paiement historique réglé');
});

test('notifications absence et prestation approuvées/refusées', () => {
  assert.equal(rhNotificationPush('absence_approved').title, 'Congé approuvé');
  assert.equal(rhNotificationPush('absence_rejected').title, 'Congé refusé');
  assert.equal(rhNotificationPush('prestation_approved').title, 'Prestation validée');
  assert.equal(rhNotificationPush('prestation_rejected').title, 'Prestation refusée');
});

test('nouvelles notifications RH', () => {
  assert.equal(rhNotificationPush('document_available').title, 'Document RH disponible');
  assert.equal(rhNotificationPush('dispute_created').title, 'Contestation déposée');
  assert.equal(rhNotificationPush('attendance_correction_requested').title, 'Correction de pointage demandée');
  assert.equal(rhManagerPush('contract').title, 'Contrat signé à approuver');
  assert.equal(rhManagerPush('document').title, 'Document déposé');
});
