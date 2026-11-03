import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/employee-id-card.tsx';
let text = fs.readFileSync(file, 'utf8');

const uploadFn = `  async function uploadAdminPhoto(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file || !adminPersonId) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 2_000_000) {
      setMessage('Choisissez une photo JPG, PNG ou WebP de 2 Mo maximum.');
      input.value = '';
      return;
    }
    const form = new FormData();
    form.set('photo', file);
    setSaving(true);
    setMessage('');
    try {
      const response = await fetchRedaction(\`/api/redaction/rh/collaborateurs/\${adminPersonId}/photo\`, { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Envoi impossible.');
      setPhoto(data.photo);
      setMessage('Photo enregistrée.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Envoi impossible.');
    } finally {
      setSaving(false);
      input.value = '';
    }
  }

`;
if (!text.includes('uploadAdminPhoto')) {
  text = text.replace('  const groups: FieldGroup[] = [', uploadFn + '  const groups: FieldGroup[] = [');
}

const adminButton = `      {adminPersonId && <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAdminPhoto} className="sr-only" />Photo du collaborateur</label>}`;
if (!text.includes('Photo du collaborateur')) {
  text = text.replace(
    '      <button type="button" onClick={printIdentityCard}',
    adminButton + '\n      <button type="button" onClick={printIdentityCard}',
  );
}
fs.writeFileSync(file, text, 'utf8');
console.log(text.includes('uploadAdminPhoto') && text.includes('Photo du collaborateur') ? 'WIRED' : 'MISSING');
