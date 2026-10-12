import { prisma } from '@/lib/prisma';
import { json, jsonError } from '@/lib/http';

export const dynamic = 'force-dynamic';

// Also hit daily by the Vercel cron in vercel.json so the free Supabase project stays active.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return json({ ok: true, database: 'up', time: new Date().toISOString() });
  } catch (err) {
    console.error('[health]', err);
    return jsonError(503, 'Database is not reachable.', { ok: false, database: 'down' });
  }
}
