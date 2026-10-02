import { authorize, checkOrigin, errorResponse, HttpError } from '@/lib/security';
import { isEntity } from '@/lib/validation';
import { detailRecord, mutateRecord } from '@/lib/records';
type Context = { params: Promise<{ entity: string; id: string }> };
export async function GET(req: Request, ctx: Context) {
  try {
    const { entity, id } = await ctx.params;
    if (!isEntity(entity)) throw new HttpError(404, 'Not found');
    return Response.json(await detailRecord(await authorize(entity), entity, id));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PATCH(req: Request, ctx: Context) {
  try {
    checkOrigin(req);
    const { entity, id } = await ctx.params;
    if (!isEntity(entity)) throw new HttpError(404, 'Not found');
    return Response.json(
      await mutateRecord(await authorize(entity, 'update'), entity, 'update', await req.json(), id),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(req: Request, ctx: Context) {
  try {
    checkOrigin(req);
    const { entity, id } = await ctx.params;
    if (!isEntity(entity)) throw new HttpError(404, 'Not found');
    return Response.json(
      await mutateRecord(await authorize(entity, 'archive'), entity, 'archive', {}, id),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
