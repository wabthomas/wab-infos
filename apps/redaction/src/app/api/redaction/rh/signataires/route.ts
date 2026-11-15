import { requireRhPermission } from '@/lib/redaction/rh/authorization';
import { detectSignatureImage, createSignatory, listSignatories, updateSignatory, validateSignatoryInput } from '@/lib/redaction/rh/signatories';
import { json, handleError, readBody, validOrigin } from '@/lib/redaction/rh/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRhPermission('access_manage');
    return json({ signatories: await listSignatories() });
  } catch (error) { return handleError(error); }
}

export async function POST(request: Request) {
  try {
    await requireRhPermission('access_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let form: FormData;
    try { form = await request.formData(); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const input = validateSignatoryInput({
      fullName: form.get('fullName'),
      title: form.get('title'),
      active: form.get('active') !== 'false',
      isDefault: form.get('isDefault') === 'true',
    });
    if (!input) return json({ error: 'Nom et fonction du signataire requis.' }, 400);
    const file = form.get('signature');
    let signature: { bytes: Buffer; mime: string } | null = null;
    if (file instanceof File && file.size > 0) {
      if (file.size > 1_500_000) return json({ error: 'Signature trop lourde (1,5 Mo maximum).' }, 400);
      const bytes = Buffer.from(await file.arrayBuffer());
      const mime = detectSignatureImage(bytes);
      if (!mime) return json({ error: 'Signature : PNG, JPG ou WebP attendu.' }, 415);
      signature = { bytes, mime };
    }
    return json({ signatory: await createSignatory({ ...input, signature }) }, 201);
  } catch (error) { return handleError(error); }
}

export async function PATCH(request: Request) {
  try {
    await requireRhPermission('access_manage');
    if (!validOrigin(request)) return json({ error: 'Origine non autorisée.' }, 403);
    let body: unknown;
    try { body = await readBody(request); } catch { return json({ error: 'Requête invalide.' }, 400); }
    const value = body as Record<string, unknown>;
    const input = validateSignatoryInput(value);
    if (!input || typeof value.id !== 'string' || !Number.isSafeInteger(value.version) || Number(value.version) < 1) {
      return json({ error: 'Signataire invalide.' }, 400);
    }
    const signatory = await updateSignatory(value.id, Number(value.version), input);
    if (!signatory) return json({ error: 'Signataire introuvable ou modifié entre-temps.' }, 409);
    return json({ signatory });
  } catch (error) { return handleError(error); }
}
