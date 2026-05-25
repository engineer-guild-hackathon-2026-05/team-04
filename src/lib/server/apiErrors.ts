import 'server-only';

import { NextResponse } from 'next/server';
import type { ApiErrorResponse } from '@/lib/apiTypes';

export function apiError(status: number, code: string, error: string, details?: unknown) {
  return NextResponse.json({ error, code, ...(details === undefined ? {} : { details }) } satisfies ApiErrorResponse, { status });
}
