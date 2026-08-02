import type { AppNotification } from '../types';
import { BaseRepository } from './baseRepository';
import { withRepositoryErrorHandling } from './errors';
import { getDatabase } from '../db/database';

// Note: dedupeKey is not a dedicated IDB index (notification volume is small
// enough that an in-memory scan is simpler than adding another compound index).

class NotificationRepository extends BaseRepository<AppNotification> {
  constructor() {
    super('notifications', 'notification');
  }

  async getRecentSorted(limit = 50): Promise<AppNotification[]> {
    const all = await this.getAll();
    return all.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  }

  async getUnreadCount(): Promise<number> {
    const all = await this.getAll();
    return all.filter((n) => !n.read).length;
  }

  async existsByDedupeKey(dedupeKey: string): Promise<boolean> {
    const all = await this.getAll();
    return all.some((n) => n.dedupeKey === dedupeKey);
  }

  async markRead(id: string): Promise<void> {
    await this.update(id, { read: true });
  }

  async markAllRead(): Promise<void> {
    return withRepositoryErrorHandling(async () => {
      const db = await getDatabase();
      const unread = await db.notifications.filter((n) => !n.read).toArray();
      await Promise.all(unread.map((n) => db.notifications.update(n.id, { read: true })));
    }, 'mark all notifications read');
  }
}

export const notificationRepository = new NotificationRepository();
