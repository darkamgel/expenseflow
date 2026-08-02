import { withRepositoryErrorHandling } from './errors';
import { supabase } from '../supabase/client';
import { getCurrentUserId } from '../supabase/auth';

class MetadataRepository {
  async get(key: string): Promise<string | undefined> {
    return withRepositoryErrorHandling(async () => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase.from('metadata').select('value').eq('user_id', userId).eq('key', key).maybeSingle();
      if (error) throw error;
      return (data as { value: string } | null)?.value;
    }, 'load metadata');
  }

  async set(key: string, value: string): Promise<void> {
    return withRepositoryErrorHandling(async () => {
      const userId = await getCurrentUserId();
      const { error } = await supabase
        .from('metadata')
        .upsert({ user_id: userId, key, value, updated_at: Date.now() }, { onConflict: 'user_id,key' });
      if (error) throw error;
    }, 'save metadata');
  }
}

export const metadataRepository = new MetadataRepository();
