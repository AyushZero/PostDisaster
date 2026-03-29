import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // Auth is handled entirely client-side to avoid lock contention issues
  // with Supabase's auth token lock mechanism. Just pass through.
  return NextResponse.next({ request });
}
