import { NextResponse } from 'next/server';
import { researchArticleProposal } from '@/lib/ai/research-draft';
import { RedactionAuthError, requireRedactionUser } from '@/lib/redaction/strapi-editor';

export async function POST(request: Request) {
  try {
    await requireRedactionUser();
    const body = (await request.json()) as {
      topic?: string;
      url?: string;
      /** false = remplir l’éditeur sans créer d’entrée Strapi */
      persist?: boolean;
    };

    const topic = body.topic?.trim() || '';
    const url = body.url?.trim() || '';
    if (!topic && !url) {
      return NextResponse.json({ error: 'Sujet ou lien requis' }, { status: 400 });
    }

    const persist = body.persist !== false;
    const result = await researchArticleProposal({ topic, url, persist });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RedactionAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Rédaction IA impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
