import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Lock, ShieldQuestion } from 'lucide-react';
import { Button } from '@company-web/shared/ui';
import { AppLayout } from '@/components/layout/AppLayout';
import { Access, hasAccess } from '@/lib/access';

interface ProtectedRouteProps {
  children: React.ReactNode;
  need?: Access;
}

export default function ProtectedRoute({ children, need = 'team' }: ProtectedRouteProps) {
  const { user, isLoading, roles, signOut } = useAuth();

  if (isLoading || (user && roles === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Signed up but not given a role yet: the database shows them nothing, so say why.
  if (!roles || roles.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-card">
          <ShieldQuestion className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Waiting for access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account ({user.email}) is set up. Ask the founder to give you a role in Settings → Team, then refresh this page.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>Refresh</Button>
            <Button variant="ghost" onClick={() => signOut()}>Sign out</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasAccess(roles, need)) {
    return (
      <AppLayout>
        <div className="mx-auto mt-16 max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-card">
          <Lock className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h1 className="text-lg font-semibold">This screen isn't part of your role</h1>
          <p className="mt-2 text-sm text-muted-foreground">If you need it, ask the founder to change your role in Settings → Team.</p>
          <Button asChild className="mt-6"><Link to="/">Back to My work</Link></Button>
        </div>
      </AppLayout>
    );
  }

  return <>{children}</>;
}
