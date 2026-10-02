import { db } from '@/lib/db';
import { currentUser, errorResponse, HttpError } from '@/lib/security';
import { detailRecord } from '@/lib/records';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u = await currentUser();
    const { id } = await ctx.params;
    const file = await db.attachment.findFirst({ where: { id, companyId: u.companyId } });
    if (!file) throw new HttpError(404, 'File not found');
    const entity = file.ticketId ? 'tickets' : file.taskId ? 'tasks' : 'projects';
    await detailRecord(u, entity, (file.ticketId || file.taskId || file.projectId)!);
    const data = await readFile(path.join(process.cwd(), 'uploads', file.storageKey));
    return new Response(data, {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
