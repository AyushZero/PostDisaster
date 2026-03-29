import { createBrowserClient } from '@supabase/ssr';

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

const AUTH_LOCK_ERROR_SNIPPETS = [
  'was released because another request stole it',
  'was not released within',
] as const;

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Reuse one browser client instance so auth lock ownership stays stable.
  if (typeof window !== 'undefined') {
    if (!browserClient) {
      browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
    }

    return browserClient;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export function isSupabaseAuthLockError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return AUTH_LOCK_ERROR_SNIPPETS.some((snippet) => message.includes(snippet));
}

export async function withSupabaseAuthLockRetry<T>(
  operation: () => Promise<T>,
  retries = 1,
  delayMs = 120
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isSupabaseAuthLockError(error) || attempt === retries) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Supabase auth operation failed');
}
