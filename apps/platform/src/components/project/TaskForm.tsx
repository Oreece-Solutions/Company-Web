import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@company-web/shared/ui';
import { Task } from '@/types/project';
import { useHq } from '@/contexts/HqContext';
import { SelectField } from '@/components/crm/SelectField';

const PRIORITIES: { value: Task['priority']; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().optional(),
  contractorId: z.string().optional(),
  brief: z.string().optional(),
  definitionOfDone: z.string().optional(),
  accessNotes: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  initialData?: Task;
  onSubmit: (data: TaskFormData) => void;
  onCancel: () => void;
}

export function TaskForm({ initialData, onSubmit, onCancel }: TaskFormProps) {
  const { contractors } = useHq();
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      priority: initialData?.priority || 'medium',
      dueDate: initialData?.dueDate || '',
      contractorId: initialData?.contractorId || '',
      brief: initialData?.brief || '',
      definitionOfDone: initialData?.definitionOfDone || '',
      accessNotes: initialData?.accessNotes || '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="title">Task *</Label>
        <Input id="title" {...register('title')} className="mt-1.5" placeholder="Design homepage mockup" />
        {errors.title && <p className="mt-1 text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register('description')} className="mt-1.5" rows={2} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="priority" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label htmlFor="dueDate">Due Date</Label>
          <Input id="dueDate" type="date" {...register('dueDate')} className="mt-1.5" />
        </div>
      </div>

      <div>
        <Label htmlFor="contractorId">Contractor</Label>
        <Controller
          control={control}
          name="contractorId"
          render={({ field }) => (
            <SelectField
              id="contractorId"
              className="mt-1.5"
              value={field.value}
              onChange={field.onChange}
              noneLabel="Not assigned to a contractor"
              options={contractors.filter((c) => c.active || c.id === field.value).map((c) => ({ value: c.id, label: c.name }))}
            />
          )}
        />
      </div>

      {watch('contractorId') && (
        <div className="space-y-4 rounded-lg border border-border p-3">
          <p className="text-sm font-medium">Contractor brief</p>
          <div>
            <Label htmlFor="brief">Objective, context and deliverables</Label>
            <Textarea id="brief" {...register('brief')} className="mt-1.5" rows={4}
              placeholder={'Objective: …\nWhy it matters: …\nDeliverables: …\nDependencies: …\nHandover: pull request to …'} />
          </div>
          <div>
            <Label htmlFor="definitionOfDone">Definition of done</Label>
            <Textarea id="definitionOfDone" {...register('definitionOfDone')} className="mt-1.5" rows={2}
              placeholder="Works on mobile and desktop, no console errors, no placeholder content…" />
          </div>
          <div>
            <Label htmlFor="accessNotes">Access given (least privilege)</Label>
            <Input id="accessNotes" {...register('accessNotes')} className="mt-1.5" placeholder="GitHub write on branch feat/x only. No passwords here." />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-accent hover:bg-accent/90">
          {initialData ? 'Update Task' : 'Add Task'}
        </Button>
      </div>
    </form>
  );
}
