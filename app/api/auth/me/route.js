import { prisma } from '@/lib/prisma';
import { json, route } from '@/lib/http';
import { publicUser, requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const { user, error } = await requireUser();
  if (error) return error;
  const pendingApprovals =
    user.role === 'MASTER' ? await prisma.user.count({ where: { status: 'PENDING' } }) : 0;
  return json({ user: publicUser(user), pendingApprovals });
});
