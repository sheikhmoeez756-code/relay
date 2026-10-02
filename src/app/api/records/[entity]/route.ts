import { authorize, checkOrigin, errorResponse, HttpError } from '@/lib/security';
import { isEntity } from '@/lib/validation';
import { listRecords, mutateRecord } from '@/lib/records';
type Context = { params: Promise<{ entity: string }> };
export async function GET(req: Request, ctx: Context) {
  try {
    const { entity } = await ctx.params;
    if (!isEntity(entity)) throw new HttpError(404, 'Not found');
    return Response.json(
      await listRecords(
        await authorize(entity),
        entity,
        Object.fromEntries(new URL(req.url).searchParams),
      ),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(req: Request, ctx: Context) {
  try {
    checkOrigin(req);
    const { entity } = await ctx.params;
    if (!isEntity(entity)) throw new HttpError(404, 'Not found');
    return Response.json(
      await mutateRecord(await authorize(entity, 'create'), entity, 'create', await req.json()),
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
