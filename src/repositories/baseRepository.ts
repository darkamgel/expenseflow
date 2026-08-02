import { supabase } from '../supabase/client';
import { getCurrentUserId } from '../supabase/auth';
import { generateId } from '../utils/id';
import type { BaseRecord } from '../types';
import { withRepositoryErrorHandling } from './errors';

/**
 * Shared CRUD primitives so every repository talks to Supabase/Postgres the
 * same way: consistent ids/timestamps, and every failure funneled through
 * withRepositoryErrorHandling instead of leaking raw Postgrest errors to the
 * UI. Each concrete repository maps between the app's camelCase domain type
 * (T) and its table's snake_case row shape via toRecord()/toRow() — Row
 * shapes differ per table, so that mapping isn't generalized here.
 *
 * Row-level security (see supabase/migrations) is the real access-control
 * boundary: every table restricts reads/writes to `auth.uid() = user_id`,
 * so these methods never need to filter by user explicitly for reads.
 */
export abstract class BaseRepository<T extends BaseRecord, Row extends { id: string }> {
  protected readonly tableName: string;
  protected readonly label: string;

  constructor(tableName: string, label: string) {
    this.tableName = tableName;
    this.label = label;
  }

  protected abstract toRecord(row: Row): T;
  protected abstract toRow(record: T): Record<string, unknown>;

  // The Supabase client can't statically infer a literal table type from a
  // runtime string, so this (and every query built from it) is intentionally
  // untyped; correctness comes from the explicit toRecord()/toRow() mapping
  // in each subclass instead.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private table(): any {
    return supabase.from(this.tableName as never);
  }

  async getAll(): Promise<T[]> {
    return withRepositoryErrorHandling(async () => {
      const { data, error } = await this.table().select('*');
      if (error) throw error;
      return ((data ?? []) as Row[]).map((row) => this.toRecord(row));
    }, `load ${this.label}`);
  }

  async getById(id: string): Promise<T | undefined> {
    return withRepositoryErrorHandling(async () => {
      const { data, error } = await this.table().select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data ? this.toRecord(data as Row) : undefined;
    }, `load ${this.label}`);
  }

  async create(input: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    return withRepositoryErrorHandling(async () => {
      const now = Date.now();
      const record = { ...input, id: generateId(), createdAt: now, updatedAt: now } as unknown as T;
      const { data, error } = await this.table().insert(this.toRow(record)).select().single();
      if (error) throw error;
      return this.toRecord(data as Row);
    }, `create ${this.label}`);
  }

  /** Inserts/overwrites a fully-formed record as-is (used by import/restore and sample-data seeding). */
  async put(record: T): Promise<T> {
    return withRepositoryErrorHandling(async () => {
      const { data, error } = await this.table().upsert(this.toRow(record)).select().single();
      if (error) throw error;
      return this.toRecord(data as Row);
    }, `save ${this.label}`);
  }

  async update(id: string, changes: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T> {
    return withRepositoryErrorHandling(async () => {
      const existing = await this.getById(id);
      if (!existing) throw new Error(`${this.label} with id ${id} not found`);
      const updated = { ...existing, ...changes, updatedAt: Date.now() } as T;
      const { data, error } = await this.table().update(this.toRow(updated)).eq('id', id).select().single();
      if (error) throw error;
      return this.toRecord(data as Row);
    }, `update ${this.label}`);
  }

  async delete(id: string): Promise<void> {
    return withRepositoryErrorHandling(async () => {
      const { error } = await this.table().delete().eq('id', id);
      if (error) throw error;
    }, `delete ${this.label}`);
  }

  async bulkDelete(ids: string[]): Promise<void> {
    if (!ids.length) return;
    return withRepositoryErrorHandling(async () => {
      const { error } = await this.table().delete().in('id', ids);
      if (error) throw error;
    }, `delete ${this.label}`);
  }

  async count(): Promise<number> {
    return withRepositoryErrorHandling(async () => {
      const { count, error } = await this.table().select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    }, `count ${this.label}`);
  }

  async clear(): Promise<void> {
    return withRepositoryErrorHandling(async () => {
      const userId = await getCurrentUserId();
      const { error } = await this.table().delete().eq('user_id', userId);
      if (error) throw error;
    }, `clear ${this.label}`);
  }
}
