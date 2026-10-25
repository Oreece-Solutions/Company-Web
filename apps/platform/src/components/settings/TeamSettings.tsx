import { useCallback, useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@company-web/shared/data-access';
import { useAuth } from '@/contexts/AuthContext';
import { SelectField } from '@/components/crm/SelectField';

interface Member {
  user_id: string;
  full_name: string | null;
  email: string | null;
  roles: string[];
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin: everything, incl. deleting and team access' },
  { value: 'staff', label: 'Staff: sales and delivery; no deleting money records' },
  { value: 'accountant', label: 'Accountant: sees all; invoices and payments only' },
];

// Who can sign in and what they may do. New people sign up on the login page,
// then appear here with no access until an admin gives them a role.
export function TeamSettings() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [notAdmin, setNotAdmin] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('team_members');
    if (error) {
      setNotAdmin(true);
      return;
    }
    setMembers((data || []) as Member[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setRole = async (m: Member, role: string) => {
    const { error } = await supabase.rpc('set_member_role', { _user_id: m.user_id, _role: role || null });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(role ? `${m.full_name || m.email} is now ${role}` : `Access removed for ${m.full_name || m.email}`);
    load();
  };

  if (notAdmin) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="mb-1 flex items-center gap-2">
        <Users className="h-5 w-5 text-accent" />
        <h2 className="text-lg font-semibold">Team access</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        New people create an account on the sign-in page, then appear here with no access until you choose a role.
        The database enforces these limits, whichever screen someone uses.
      </p>
      {members === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <ul className="divide-y divide-border">
          {members.map((m) => (
            <li key={m.user_id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">{m.full_name || 'No name'}{m.user_id === user?.id && <span className="text-muted-foreground"> (you)</span>}</p>
                <p className="truncate text-sm text-muted-foreground">{m.email}</p>
              </div>
              <div className="w-full sm:w-96">
                <SelectField
                  id={`role-${m.user_id}`}
                  value={m.roles[0] || ''}
                  onChange={(v) => setRole(m, v)}
                  noneLabel="No access"
                  options={ROLE_OPTIONS}
                  disabled={m.user_id === user?.id}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
