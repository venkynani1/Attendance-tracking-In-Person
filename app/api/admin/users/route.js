import { prisma } from '@/lib/prisma';
import { json, route } from '@/lib/http';
import { publicUser, requireMaster } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const { error } = await requireMaster();
  if (error) return error;
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  return json({ users: users.map(publicUser) });
});
