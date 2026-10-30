import { requireEditorialUser } from '@/lib/redaction/editorial-access';
import { NextResponse } from 'next/server';
import type { AiProviderName } from '@/lib/ai/providers';
import { getAiSettingsAdminView, saveAiSettings } from '@/lib/ai/stored-settings';
import { peekAiQuota } from '@/lib/ai/quotas';
import {
  isRedactionSuperAdmin,
  RedactionAuthError,
  requireRedactionUser,
} from '@/lib/redaction/strapi-editor';

async function requireAdmin() {
  const user = await requireEditorialUser();
  if (!isRedactionSuperAdmin(user)) {
    return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  }
  return null;
}

export async function GET() {
  try {
    const forbidden = await requireAdmin();
    if (forbidden) return forbidden;
    const settings = await getAiSettingsAdminView();
    return NextResponse.json({
      settings,
      quotas: {
        reformulate: peekAiQuota('reformulate', settings.dailyReformulateLimit),
        publish: peekAiQuota('publish', settings.dailyPublishLimit),
        research: peekAiQuota('research', settings.dailyResearchLimit),
      },
    });
  } catch (error) {
    if (error instanceof RedactionAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Lecture impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const forbidden = await requireAdmin();
    if (forbidden) return forbidden;

    const body = (await request.json()) as {
      enabled?: boolean;
      autoPublish?: boolean;
      providerChain?: string;
      seoMinScore?: number;
      maxSeoPasses?: number;
      maxPerRun?: number;
      dailyReformulateLimit?: number;
      dailyPublishLimit?: number;
      dailyResearchLimit?: number;
      timeoutMs?: number;
      providers?: Array<{
        name?: string;
        apiKey?: string;
        clearApiKey?: boolean;
        model?: string;
        baseUrl?: string;
        accountId?: string;
      }>;
    };

    const settings = await saveAiSettings({
      enabled: body.enabled !== false,
      autoPublish: body.autoPublish !== false,
      providerChain: body.providerChain?.trim() || 'none',
      seoMinScore: Number(body.seoMinScore) || 70,
      maxSeoPasses: Number(body.maxSeoPasses) || 2,
      maxPerRun: Number(body.maxPerRun) || 2,
      dailyReformulateLimit: Number(body.dailyReformulateLimit) || 40,
      dailyPublishLimit: Number(body.dailyPublishLimit) || 20,
      dailyResearchLimit: Number(body.dailyResearchLimit) || 10,
      timeoutMs: Number(body.timeoutMs) || 60_000,
      providers: (body.providers || [])
        .filter((row) => row.name)
        .map((row) => ({
          name: row.name as AiProviderName,
          apiKey: row.apiKey,
          clearApiKey: row.clearApiKey === true,
          model: row.model,
          baseUrl: row.baseUrl,
          accountId: row.accountId,
        })),
    });

    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof RedactionAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : 'Enregistrement impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
