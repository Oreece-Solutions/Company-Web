import { AppRole } from '@/contexts/AuthContext';

// Who a screen is for. Mirrors the database helpers (is_team_member, can_sell,
// can_bill, is_admin); the database still enforces every rule, this only
// keeps people from opening screens they can't use.
export type Access = 'team' | 'sell' | 'bill' | 'admin';

export function hasAccess(roles: AppRole[] | null, need: Access = 'team'): boolean {
  if (!roles || roles.length === 0) return false;
  if (roles.includes('admin')) return true;
  switch (need) {
    case 'team': return true;
    case 'sell': return roles.includes('staff');
    case 'bill': return roles.includes('staff') || roles.includes('accountant');
    case 'admin': return false;
  }
}
