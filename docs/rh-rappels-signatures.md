# Rappels RH de fin de journée

Avant déploiement, sauvegarder la base RH, appliquer `docs/sql/rh-work-reminders.sql`, puis accorder au rôle applicatif uniquement `SELECT, INSERT` sur `redaction_rh.work_reminders`. Configurer `REDACTION_RH_REMINDERS_CRON_SECRET` avec au moins 32 caractères aléatoires. Aucun e-mail ou push n’est envoyé par le build.

Appeler quotidiennement, après l’heure de sortie configurée dans RH → Paramètres → Organisation (par défaut 18:00, heure de Kinshasa), l’endpoint interne :

```http
GET /api/redaction/rh/rappels/signatures
Authorization: Bearer <REDACTION_RH_REMINDERS_CRON_SECRET>
```

L’endpoint ne traite que les collaborateurs actifs et liés à un compte, ayant un pointage d’arrivée ce jour-là. Il rappelle la signature de sortie uniquement si l’heure de sortie manque, et la déclaration de prestation uniquement si aucune déclaration n’existe pour cette date. Les absences approuvées sont exclues. Une même personne reçoit au plus un rappel par type et par date, même si le cron est relancé. Les notifications restent génériques et ne contiennent ni motif ni données financières. L’e-mail et le push sont best-effort : les notifications RH, les abonnements push, Firebase et le relais e-mail doivent être configurés.

Ces alertes indiquent seulement qu’une donnée manque au système ; elles ne concluent pas que la personne a oublié ou qu’elle a travaillé. Vérifier les cas de télétravail, les horaires particuliers et les jours non planifiés avant d’activer le cron. Tester d’abord avec un compte RH contrôlé, une date de test et le secret de cron ; surveiller la réponse JSON et les journaux applicatifs sans consigner le secret.
