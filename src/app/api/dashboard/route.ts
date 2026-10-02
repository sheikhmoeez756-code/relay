import { authorize, errorResponse } from '@/lib/security';
import { dashboard } from '@/lib/dashboard';
import { z } from 'zod';
export async function GET(req: Request) {
  try {
    const days = z.coerce
      .number()
      .int()
      .min(7)
      .max(365)
      .parse(new URL(req.url).searchParams.get('days') || 30);
    return Response.json(await dashboard(await authorize('dashboard'), days));
  } catch (e) {
    return errorResponse(e);
  }
}
