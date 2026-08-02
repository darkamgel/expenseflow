import type { AppNotification } from '../types';
import { BaseRepository } from './baseRepository';
import { withRepositoryErrorHandling } from './errors';
import { supabase } from '../supabase/client';
import type { Database } from '../supabase/database.types';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];

class NotificationRepository extends BaseRepository<AppNotification, NotificationRow> {
  constructor() {
    super('notifications', 'notification');
  }

  protected toRecord(row: NotificationRow): AppNotification {
    return {
      id: row.id,
      type: row.type as AppNotification['type'],
      title: row.title,
      message: row.message,
      read: row.read,
      dedupeKey: row.dedupe_key,
      relatedId: row.related_id ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  protected toRow(record: AppNotification): Record<string, unknown> {
    return {
      id: record.id,
      type: record.type,
      title: record.title,
      message: record.message,
      read: record.read,
      dedupe_key: record.dedupeKey,
      related_id: record.relatedId ?? null,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    };
  }

  async getRecentSorted(limit = 50): Promise<AppNotification[]> {
    return withRepositoryErrorHandling(async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((row) => this.toRecord(row as NotificationRow));
    }, 'load notifications');
  }

  async getUnreadCount(): Promise<number> {
    return withRepositoryErrorHandling(async () => {
      const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false);
      if (error) throw error;
      return count ?? 0;
    }, 'count unread notifications');
  }

  async existsByDedupeKey(dedupeKey: string): Promise<boolean> {
    return withRepositoryErrorHandling(async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('dedupe_key', dedupeKey);
      if (error) throw error;
      return (count ?? 0) > 0;
    }, 'check notification dedupe');
  }

  async markRead(id: string): Promise<void> {
    await this.update(id, { read: true });
  }

  async markAllRead(): Promise<void> {
    return withRepositoryErrorHandling(async () => {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false);
      if (error) throw error;
    }, 'mark all notifications read');
  }
}

export const notificationRepository = new NotificationRepository();
