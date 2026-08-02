import { createFakeSupabaseClient } from '../../tests/fakeSupabase';

// Auto-loaded by `vi.mock('../supabase/client')` in tests (Vitest resolves a
// __mocks__ sibling when no factory is given), so repository/service tests
// exercise real code against an in-memory fake instead of a live database.
export const supabase = createFakeSupabaseClient();

export function isSupabaseConfigured(): boolean {
  return true;
}

export function __resetFakeSupabase(): void {
  (supabase as unknown as { __reset: () => void }).__reset();
}
