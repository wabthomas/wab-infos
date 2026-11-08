import fs from 'node:fs';
const file = 'apps/redaction/src/lib/redaction/rh/notifications.ts';
let text = fs.readFileSync(file, 'utf8');

// Corps in-app alignés sur les textes choisis (2, 6, 8).
text = text.replace(
  "    case 'remuneration':\n    case 'retrait':\n      return 'Une information RH a été mise à jour.';",
  "    case 'remuneration':\n      return 'Votre rémunération a été validée. Ouvrez Mon espace RH pour la consulter.';\n    case 'retrait':\n      return 'Votre retrait a été traité. Ouvrez Mon espace RH pour le détail.';",
);
text = text.replace(
  "    case 'historical':\n      return 'Votre ancien paiement a été traité.';",
  "    case 'historical':\n      return 'Ouvrez Mon espace RH pour consulter votre ancien paiement.';",
);

// Titres des notifications push.
text = text.replace("    remuneration: 'Rémunération mise à jour',", "    remuneration: 'Salaire disponible',");
text = text.replace("    retrait: 'Demande de retrait mise à jour',", "    retrait: 'Retrait traité',");
text = text.replace("    historical: 'Ancien paiement traité',", "    historical: 'Paiement historique réglé',");

// Destination directe de chaque notification de paiement.
text = text.replace(
  "          : type === 'historical'\n            ? '/mon-rh/paiements-anciens'\n            : '/mon-rh/notifications';",
  "          : type === 'historical'\n            ? '/mon-rh/paiements-anciens'\n            : type === 'remuneration'\n              ? '/mon-rh/remunerations'\n              : type === 'retrait'\n                ? '/mon-rh/retraits'\n                : '/mon-rh/notifications';",
);

// Alerte gestionnaire : nouvelle demande de retrait (10).
text = text.replace(
  "    retrait: {\n      title: 'Nouvelle demande de retrait',\n      body: 'Une demande de retrait attend votre traitement.',\n      url: '/rh/retraits',\n    },",
  "    retrait: {\n      title: 'Nouvelle demande de retrait',\n      body: 'Un collaborateur a demandé un retrait. Ouvrez RH → Retraits.',\n      url: '/rh/retraits',\n    },",
);

fs.writeFileSync(file, text, 'utf8');
console.log(JSON.stringify({
  salary: text.includes("remuneration: 'Salaire disponible'"),
  withdrawal: text.includes("retrait: 'Retrait traité'"),
  historical: text.includes("historical: 'Paiement historique réglé'"),
  manager: text.includes("Un collaborateur a demandé un retrait. Ouvrez RH → Retraits."),
  directUrl: text.includes("'/mon-rh/remunerations'"),
}));
