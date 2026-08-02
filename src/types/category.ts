import type { ActiveStatus, BaseRecord } from './common';

export interface Category extends BaseRecord {
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  status: ActiveStatus;
  sortOrder: number;
}
