import { readFile } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const path = join(process.cwd(), 'public', 'downloads', 'apk-version.json');
    const body = await readFile(path, 'utf8');
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Manifeste APK introuvable' }, { status: 404 });
  }
}
