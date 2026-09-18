import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Plus, Search, FolderKanban, Trash2 } from 'lucide-react';
import { useAppStore } from '@/contexts/StoreContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@company-web/shared/ui';
import { ProjectForm } from '@/components/project/ProjectForm';
import { ProjectStatusBadge } from '@/components/project/ProjectStatusBadge';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, clients, getClient, addProject, deleteProject, getTasksForProject } = useAppStore();
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    const searchLower = search.toLowerCase();
    return projects.filter((p) => {
      const client = p.clientId ? getClient(p.clientId) : undefined;
      return (
        p.name.toLowerCase().includes(searchLower) ||
        client?.name.toLowerCase().includes(searchLower)
      );
    });
  }, [projects, search, getClient]);

  const handleAdd = (data: Parameters<typeof addProject>[0]) => {
    addProject(data);
    setIsAddOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteProject(id);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Projects"
        description="Track delivery work for your clients"
        actions={
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent hover:bg-accent/90">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>New Project</DialogTitle>
                <DialogDescription>Set up a new project to track.</DialogDescription>
              </DialogHeader>
              <ProjectForm onSubmit={handleAdd} onCancel={() => setIsAddOpen(false)} />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
      >
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <FolderKanban className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No projects yet</h3>
            <p className="text-muted-foreground mb-4">
              {search ? 'No projects match your search' : 'Create your first project to get started'}
            </p>
            {!search && (
              <Button onClick={() => setIsAddOpen(true)} className="gap-2 bg-accent hover:bg-accent/90">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => {
                const client = project.clientId ? getClient(project.clientId) : undefined;
                const projectTasks = getTasksForProject(project.id);
                const doneCount = projectTasks.filter((t) => t.status === 'done').length;
                return (
                  <TableRow
                    key={project.id}
                    className="group cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell className="text-muted-foreground">{client?.name || '-'}</TableCell>
                    <TableCell><ProjectStatusBadge status={project.status} /></TableCell>
                    <TableCell className="text-muted-foreground">
                      {project.dueDate ? format(new Date(project.dueDate), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {doneCount}/{projectTasks.length}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Delete" onClick={(e) => e.stopPropagation()}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Project</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {project.name}? This also deletes its tasks. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(project.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </motion.div>
    </AppLayout>
  );
}
