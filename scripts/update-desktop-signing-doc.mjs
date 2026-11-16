import fs from 'node:fs';
const file = 'docs/redaction-windows.md';
let text = fs.readFileSync(file, 'utf8');
if (!text.includes('Signature Authenticode')) {
  text += `\n## Signature Authenticode\n\nSans certificat de signature de code, Windows affiche « Éditeur inconnu ». Pour signer les installateurs avec un certificat OV/EV reconnu, fournir le fichier PFX et son mot de passe au build :\n\n\`\`\`powershell\n$env:CSC_LINK = 'C:\\chemin\\certificat-code-signing.pfx'\n$env:CSC_KEY_PASSWORD = 'mot-de-passe-du-pfx'\nnpm run build:redaction:windows\n\`\`\`\n\nElectron-builder signe alors l’exécutable, le MSI, l’installateur NSIS et le désinstalleur. Vérifier avec :\n\n\`\`\`powershell\nGet-AuthenticodeSignature .\\apps\\redaction-desktop\\release\\Wab-Redaction-1.0.0-x64.exe\n\`\`\`\n\nUn certificat auto-signé produit une signature techniquement valide mais **non reconnue** : SmartScreen continue d’afficher un avertissement. Une signature reconnue nécessite un certificat délivré par une autorité de certification.\n`;
}
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('Signature Authenticode') ? 'DOC_OK' : 'MISS');
