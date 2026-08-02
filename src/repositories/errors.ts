export class RepositoryError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'RepositoryError';
    this.cause = cause;
  }
}

/** Wraps a data-layer operation so any IndexedDB failure (quota exceeded, connection
 * closed, corrupted store, private-browsing restrictions, etc.) becomes a typed
 * error the UI can catch and render instead of letting the app crash. */
export async function withRepositoryErrorHandling<T>(operation: () => Promise<T>, context: string): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    if (err instanceof RepositoryError) throw err;
    throw new RepositoryError(`Failed to ${context}. Your data may be unavailable in this browsing session.`, err);
  }
}
