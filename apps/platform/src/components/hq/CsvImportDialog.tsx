import { useState } from 'react';
import { Upload } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@company-web/shared/ui';
import { parseCsv } from '@/lib/csv';

export type ParsedRow<T> = { ok: true; label: string; data: T } | { ok: false; label: string; error: string };

interface CsvImportDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  parseRow: (row: Record<string, string>) => ParsedRow<T>;
  // Returns an error message, or null when the row was saved.
  saveRow: (data: T) => Promise<string | null>;
  onDone?: () => void;
}

// Upload a CSV, preview what will be imported, then save row by row and show
// which rows failed and why. Nothing is saved before "Import" is pressed.
export function CsvImportDialog<T>({ open, onOpenChange, title, description, parseRow, saveRow, onDone }: CsvImportDialogProps<T>) {
  const [rows, setRows] = useState<ParsedRow<T>[]>([]);
  const [results, setResults] = useState<Record<number, string | null>>({});
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');

  const reset = () => {
    setRows([]);
    setResults({});
    setFileName('');
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    reset();
    setFileName(file.name);
    setRows(parseCsv(await file.text()).map(parseRow));
  };

  const runImport = async () => {
    setBusy(true);
    const out: Record<number, string | null> = {};
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.ok) continue;
      out[i] = await saveRow(r.data);
      setResults({ ...out });
    }
    setBusy(false);
    onDone?.();
  };

  const ready = rows.filter((r) => r.ok).length;
  const imported = Object.values(results).filter((v) => v === null).length;
  const finished = Object.keys(results).length > 0 && !busy;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border p-4 text-sm hover:bg-muted/40">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span>{fileName || 'Choose a .csv file'}</span>
          <input id="csv-file" type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>

        {rows.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {finished
                ? `Imported ${imported} of ${ready} rows.`
                : `${ready} of ${rows.length} rows ready to import.`}
            </p>
            <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border text-sm">
              {rows.map((r, i) => {
                const result = results[i];
                const error = 'error' in r ? r.error : result ?? undefined;
                return (
                  <li key={i} className="flex items-start justify-between gap-3 px-3 py-2">
                    <span className="font-medium">{r.label || `Row ${i + 2}`}</span>
                    <span className={error ? 'text-right text-destructive' : result === null ? 'text-success' : 'text-muted-foreground'}>
                      {error ? error : result === null ? 'Imported' : r.ok ? 'Ready' : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{finished ? 'Close' : 'Cancel'}</Button>
          {!finished && (
            <Button onClick={runImport} disabled={busy || ready === 0} className="bg-accent hover:bg-accent/90">
              {busy ? 'Importing…' : `Import ${ready} rows`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
