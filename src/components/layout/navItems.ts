export interface NavItem {
  to: string;
  label: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/transactions', label: 'Transactions', icon: '🧾' },
  { to: '/expenses/new', label: 'Add Expense', icon: '➕' },
  { to: '/budgets', label: 'Budgets', icon: '🎯' },
  { to: '/wallet', label: 'Wallet', icon: '💳' },
  { to: '/reports', label: 'Reports', icon: '📈' },
  { to: '/recurring', label: 'Recurring', icon: '🔁' },
  { to: '/income', label: 'Income', icon: '💰' },
  { to: '/backup', label: 'Backup', icon: '🗄️' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

/** Subset shown in the mobile bottom bar; the rest live behind the "More" sheet. */
export const MOBILE_PRIMARY_ITEMS: NavItem[] = [
  NAV_ITEMS[0],
  NAV_ITEMS[1],
  NAV_ITEMS[2],
  NAV_ITEMS[3],
];
