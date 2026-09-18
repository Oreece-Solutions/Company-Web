-- Projects & tasks, linked to clients and (optionally) invoices

CREATE TYPE public.project_status AS ENUM ('planning', 'active', 'on_hold', 'completed');
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status public.project_status NOT NULL DEFAULT 'planning',
  start_date DATE,
  due_date DATE,
  budget DECIMAL(12,2),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view projects" ON public.projects
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert projects" ON public.projects
  FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can update projects" ON public.projects
  FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can delete projects" ON public.projects
  FOR DELETE USING (public.is_team_member(auth.uid()));

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status public.task_status NOT NULL DEFAULT 'todo',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  assignee UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view tasks" ON public.tasks
  FOR SELECT USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can insert tasks" ON public.tasks
  FOR INSERT WITH CHECK (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can update tasks" ON public.tasks
  FOR UPDATE USING (public.is_team_member(auth.uid()));
CREATE POLICY "Team members can delete tasks" ON public.tasks
  FOR DELETE USING (public.is_team_member(auth.uid()));

ALTER TABLE public.invoices
  ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
