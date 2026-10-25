export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type ProjectHealth = 'on_track' | 'at_risk' | 'blocked';

export interface Project {
  id: string;
  clientId?: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  dueDate?: string;
  budget?: number;
  health: ProjectHealth;
  nextMilestone?: string;
  waitingOnClient?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string;
  dueDate?: string;
  contractorId?: string;
  brief?: string;
  definitionOfDone?: string;
  accessNotes?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
};

export const PROJECT_HEALTH_LABELS: Record<ProjectHealth, string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  blocked: 'Blocked',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];
