import { getHealth } from '@/lib/health';

export const dynamic = 'force-dynamic';

export function GET(): Response {
  // Always 200: the payload's `status` field carries the verdict, so a
  // degraded config still returns a body a monitor can read.
  return Response.json(getHealth(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
