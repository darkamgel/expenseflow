import type { Table } from 'dexie';
import { getDatabase, type ExpenseFlowDatabase } from '../db/database';
import { generateId } from '../utils/id';
import type { BaseRecord } from '../types';
import { withRepositoryErrorHandling } from './errors';

/** Shared CRUD primitives so every repository talks to IndexedDB the same
 * way: consistent ids/timestamps, and every failure funneled through
 * withRepositoryErrorHandling instead of leaking raw IDB exceptions to the UI. */
export abstract class BaseRepository<T extends BaseRecord> {
  private readonly tableName: keyof ExpenseFlowDatabase;
  private readonly label: string;

  constructor(tableName: keyof ExpenseFlowDatabase, label: string) {
    this.tableName = tableName;
    this.label = label;
  }

  protected async table(): Promise<Table<T, string>> {
    const db = await getDatabase();
    return db[this.tableName] as unknown as Table<T, string>;
  }

  async getAll(): Promise<T[]> {
    return withRepositoryErrorHandling(async () => (await this.table()).toArray(), `load ${this.label}`);
  }

  async getById(id: string): Promise<T | undefined> {
    return withRepositoryErrorHandling(async () => (await this.table()).get(id), `load ${this.label}`);
  }

  async create(input: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    return withRepositoryErrorHandling(async () => {
      const now = Date.now();
      const record = { ...input, id: generateId(), createdAt: now, updatedAt: now } as unknown as T;
      await (await this.table()).add(record);
      return record;
    }, `create ${this.label}`);
  }

  /** Inserts a fully-formed record as-is (used by import/restore and sample-data seeding). */
  async put(record: T): Promise<T> {
    return withRepositoryErrorHandling(async () => {
      await (await this.table()).put(record);
      return record;
    }, `save ${this.label}`);
  }

  async update(id: string, changes: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T> {
    return withRepositoryErrorHandling(async () => {
      const table = await this.table();
      const existing = await table.get(id);
      if (!existing) throw new Error(`${this.label} with id ${id} not found`);
      const updated = { ...existing, ...changes, updatedAt: Date.now() } as T;
      await table.put(updated);
      return updated;
    }, `update ${this.label}`);
  }

  async delete(id: string): Promise<void> {
    return withRepositoryErrorHandling(async () => {
      await (await this.table()).delete(id);
    }, `delete ${this.label}`);
  }

  async bulkDelete(ids: string[]): Promise<void> {
    return withRepositoryErrorHandling(async () => {
      await (await this.table()).bulkDelete(ids);
    }, `delete ${this.label}`);
  }

  async count(): Promise<number> {
    return withRepositoryErrorHandling(async () => (await this.table()).count(), `count ${this.label}`);
  }

  async clear(): Promise<void> {
    return withRepositoryErrorHandling(async () => {
      await (await this.table()).clear();
    }, `clear ${this.label}`);
  }
}
