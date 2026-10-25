import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@company-web/shared/ui';

interface State {
  error: Error | null;
}

// One broken screen should not blank the whole app: show what happened and
// let the user go back or reload. Nothing is lost; data lives in the database.
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Screen crashed:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-card">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-warning" />
          <h1 className="text-lg font-semibold">This screen hit a problem</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your data is safe. Go back to Today or reload the page. If it keeps happening, note what you clicked.
          </p>
          <p className="mt-3 break-words rounded-md bg-muted p-2 text-left font-mono text-xs text-muted-foreground">{this.state.error.message}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" onClick={() => { this.setState({ error: null }); window.location.assign('/'); }}>Go to Today</Button>
            <Button className="bg-accent hover:bg-accent/90" onClick={() => window.location.reload()}>Reload</Button>
          </div>
        </div>
      </div>
    );
  }
}
