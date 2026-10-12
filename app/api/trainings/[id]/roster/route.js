import { prisma } from '@/lib/prisma';
import { json, jsonError, route } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { loadTrainingForUser } from '@/lib/trainings';
import { parseRosterFile, RosterError } from '@/lib/roster';

export const runtime = 'nodejs';

// Upload (or replace) the expected-participants list. Used to mark Absent in the export.
export const POST = route(async (req, { params }) => {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const training = await loadTrainingForUser(user, id);
  if (!training) return jsonError(404, 'Training not found.');

  let entries;
  try {
    const form = await req.formData();
    entries = await parseRosterFile(form.get('file'));
  } catch (err) {
    if (err instanceof RosterError) return jsonError(400, err.message);
    throw err;
  }

  await prisma.$transaction([
    prisma.rosterEntry.deleteMany({ where: { trainingId: training.id } }),
    prisma.rosterEntry.createMany({
      data: entries.map((e) => ({ ...e, trainingId: training.id })),
      skipDuplicates: true,
    }),
  ]);

  return json({ ok: true, count: entries.length });
});

export const DELETE = route(async (_req, { params }) => {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const training = await loadTrainingForUser(user, id);
  if (!training) return jsonError(404, 'Training not found.');
  await prisma.rosterEntry.deleteMany({ where: { trainingId: training.id } });
  return json({ ok: true });
});
