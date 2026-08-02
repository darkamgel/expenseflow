import { supabase } from './client';
import { RepositoryError } from '../repositories/errors';

export async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new RepositoryError('You must be signed in to do that.', error);
  }
  return data.user.id;
}
