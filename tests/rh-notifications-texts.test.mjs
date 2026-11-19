import assert from 'node:assert/strict';
import test from 'node:test';
import { rhNotificationPush, rhManagerPush } from '../apps/redaction/src/lib/redaction/rh/notifications.ts';

test('notifications paiement : titre, sujet et action contextualisés', () => {
  assert.deepEqual(rhNotificationPush('remuneration'), {
    title: 'Votre rémunération est disponible',
    subject: 'Votre rémunération est disponible',
    body: 'Votre rémunération a été validée. Consultez le détail dans votre espace RH.',
    ctaLabel: 'Voir ma rémunération',
    url: '/mon-rh/remunerations',
    audience: 'employee',
  });
  assert.equal(rhNotificationPush('retrait').title, 'Votre retrait a été traité');
  assert.equal(rhNotificationPush('retrait').ctaLabel, 'Voir mon retrait');
  assert.equal(rhNotificationPush('historical').title, 'Votre paiement historique est disponible');
});

test('notifications absence et prestation approuvées/refusées', () => {
  assert.equal(rhNotificationPush('absence_approved').title, 'Votre demande de congé est approuvée');
  assert.equal(rhNotificationPush('absence_rejected').title, 'Votre demande de congé n’a pas été approuvée');
  assert.equal(rhNotificationPush('prestation').title, 'Votre déclaration a bien été enregistrée');
  assert.equal(rhNotificationPush('prestation_approved').title, 'Votre prestation est validée');
  assert.equal(rhNotificationPush('prestation_rejected').title, 'Votre déclaration n’a pas été validée');
});

test('nouvelles notifications RH', () => {
  assert.equal(rhNotificationPush('document_available').title, 'Un nouveau document est disponible');
  assert.equal(rhNotificationPush('dispute_created').title, 'Votre contestation a été enregistrée');
  assert.equal(rhNotificationPush('attendance_correction_requested').title, 'Votre correction de pointage est enregistrée');
  assert.equal(rhNotificationPush('service_card').ctaLabel, 'Voir ma carte');
});

test('gestionnaire : le contrat signé demande une validation, sans contresens', () => {
  const message = rhManagerPush('contract');
  assert.equal(message.title, 'Un contrat attend votre validation');
  assert.equal(message.subject, 'Contrat à valider');
  assert.equal(message.body, 'Un collaborateur a signé son contrat. Votre approbation est nécessaire pour le finaliser.');
  assert.equal(message.ctaLabel, 'Ouvrir les contrats à valider');
  assert.equal(message.audience, 'manager');
  assert.equal(message.url, '/rh/contrats');
  assert.doesNotMatch(message.body, /Ouvrir Mon espace RH/);
});

test('gestionnaire : documents et demandes avec actions dédiées', () => {
  assert.equal(rhManagerPush('document').title, 'Un collaborateur a déposé un document');
  assert.equal(rhManagerPush('document').ctaLabel, 'Ouvrir les documents');
  assert.equal(rhManagerPush('absence').ctaLabel, 'Traiter la demande');
  assert.equal(rhManagerPush('retrait').ctaLabel, 'Ouvrir les retraits');
});
