/** Every persisted record carries a stable id and audit timestamps (epoch ms). */
export interface BaseRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
}

/** Records that can be produced by "Load Sample Data" carry this flag so they
 * can be told apart from, and cleared independently of, real user data. */
export interface Sampleable {
  isSample?: boolean;
}

export type ActiveStatus = 'active' | 'archived';
