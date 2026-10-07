import { NextRequest, NextResponse } from 'next/server';
import {
  getAlias,
  getAliasByUser,
  saveAlias,
  type AliasRecord,
} from '@/lib/server/store';

export const dynamic = 'force-dynamic';

const ALIAS_RE = /^[a-z0-9][a-z0-9._-]{2,24}$/;

export async function GET(req: NextRequest) {
  const alias = req.nextUrl.searchParams.get('alias');
  if (alias) {
    const record = await getAlias(alias);
    if (!record) {
      return NextResponse.json({ error: 'alias_not_found' }, { status: 404 });
    }
    // Only what the sender needs to see — never the raw account id.
    return NextResponse.json({ alias: record.alias, displayName: record.displayName });
  }
  const user = req.nextUrl.searchParams.get('user');
  if (user) {
    const mine = await getAliasByUser(user);
    return NextResponse.json(mine ?? null);
  }
  return NextResponse.json({ error: 'missing_param' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId ?? '').slice(0, 80);
  const alias = String(body.alias ?? '').trim().toLowerCase().slice(0, 30);
  const displayName = String(body.displayName ?? '').slice(0, 60) || 'Usuario';

  if (!userId) return NextResponse.json({ error: 'missing_user' }, { status: 400 });
  if (!ALIAS_RE.test(alias)) {
    return NextResponse.json({ error: 'invalid_alias' }, { status: 400 });
  }

  const taken = await getAlias(alias);
  if (taken && taken.userId !== userId) {
    return NextResponse.json({ error: 'alias_taken' }, { status: 409 });
  }

  const record: AliasRecord = { alias, userId, displayName };
  await saveAlias(record);
  return NextResponse.json(record, { status: 201 });
}
