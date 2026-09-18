import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Plus, Edit, Trash2, Calendar, DollarSign } from 'lucide-react';
import { useAppStore } from '@/contexts/StoreContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@company-web/shared/ui';
import { ProjectForm } from '@/components/project/ProjectForm';
import { ProjectStatusBadge } from '@/components/project/ProjectStatusBadge';
import { TaskForm } from '@/components/project/TaskForm';
import { Task, TASK_STATUSES, TASK_STATUS_LABELS } from '@/types/project';

const PRIORITY_STYLES: Record<Task['priority'], string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-warning/10 text-warning',
  high: 'bg-destructive/10 text-destructive',
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getProject,
    updateProject,
    deleteProject,
    getClient,
    getTasksForProject,
    addTask,
    updateTask,
    deleteTask,
  } = useAppStore();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const project = id ? getProject(id) : undefined;
  const tasks = id ? getTasksForProject(id) : [];
  const client = project?.clientId ? getClient(project.clientId) : undefined;

  if (!project || !id) {
    return (
      <AppLayout>
        <PageHeader title="Project not found" />
        <Link to="/projects" className="text-accent hover:underline">Back to Projects</Link>
      </AppLayout>
    );
  }

  const handleAddTask = (data: Parameters<typeof addTask>[1]) => {
    addTask(id, data);
    setIsAddTaskOpen(false);
  };

  const handleUpdateTask = (data: Partial<Task>) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
      setEditingTask(null);
    }
  };

  const handleDeleteProject = () => {
    deleteProject(id);
    navigate('/projects');
  };

  return (
    <AppLayout>
      <Link to="/projects" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      <PageHeader
        title={project.name}
        description={client ? `Client: ${client.name}` : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Edit Project</DialogTitle>
                  <DialogDescription>Update the project's details.</DialogDescription>
                </DialogHeader>
                <ProjectForm
                  initialData={project}
                  onSubmit={(data) => { updateProject(id, data); setIsEditOpen(false); }}
                  onCancel={() => setIsEditOpen(false)}
                />
              </DialogContent>
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Delete">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Project</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {project.name}? This also deletes its tasks. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />

      {/* Project summary */}
      <div className="mb-8 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card">
        <ProjectStatusBadge status={project.status} />
        {project.dueDate && (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Due {format(new Date(project.dueDate), 'MMM d, yyyy')}
          </span>
        )}
        {project.budget !== undefined && (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            {project.budget.toLocaleString()}
          </span>
        )}
        {project.description && (
          <p className="w-full text-sm text-muted-foreground">{project.description}</p>
        )}
      </div>

      {/* Task board */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 bg-accent hover:bg-accent/90">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Task</DialogTitle>
              <DialogDescription>Add a task to this project.</DialogDescription>
            </DialogHeader>
            <TaskForm onSubmit={handleAddTask} onCancel={() => setIsAddTaskOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {TASK_STATUSES.map((status) => {
          const columnTasks = tasks.filter((t) => t.status === status);
          return (
            <div key={status} className="rounded-xl border border-border bg-card shadow-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold">{TASK_STATUS_LABELS[status]}</h3>
                <span className="text-xs text-muted-foreground">{columnTasks.length}</span>
              </div>
              <div className="space-y-2 p-3">
                {columnTasks.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">No tasks</p>
                ) : (
                  columnTasks.map((task) => (
                    <div key={task.id} className="group rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          className="text-left text-sm font-medium hover:underline"
                          onClick={() => setEditingTask(task)}
                        >
                          {task.title}
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                          title="Delete task"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={PRIORITY_STYLES[task.priority]}>
                          {task.priority}
                        </Badge>
                        {task.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(task.dueDate), 'MMM d')}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex gap-1">
                        {TASK_STATUSES.filter((s) => s !== status).map((s) => (
                          <button
                            key={s}
                            onClick={() => updateTask(task.id, { status: s })}
                            className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground hover:bg-muted/70"
                          >
                            → {TASK_STATUS_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingTask && (
        <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>Update the task's details.</DialogDescription>
            </DialogHeader>
            <TaskForm
              initialData={editingTask}
              onSubmit={handleUpdateTask}
              onCancel={() => setEditingTask(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
