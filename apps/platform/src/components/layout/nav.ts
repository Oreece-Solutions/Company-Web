import { LayoutDashboard, FileText, Users, FolderKanban, Settings, KanbanSquare, FileSignature, Sun, Radar, HardHat, Server, Tags, ClipboardCheck, History, Target, BookOpen, GraduationCap } from 'lucide-react';
import { Access } from '@/lib/access';

// Grouped the way the week runs: today's list, finding work, winning it,
// delivering it, getting paid, then the Friday review. Each item lists who it
// is for, so people only see the screens their role can use.
export type NavItem = { name: string; href: string; icon: typeof LayoutDashboard; need?: Access };
export const sections: { label?: string; items: NavItem[] }[] = [
  { items: [{ name: 'My work', href: '/', icon: Sun }] },
  {
    label: 'Sales',
    items: [
      { name: 'Sales desk', href: '/sales', icon: Target, need: 'sell' },
      { name: 'Lead Finder', href: '/leads', icon: Radar, need: 'sell' },
      { name: 'Pipeline', href: '/pipeline', icon: KanbanSquare, need: 'sell' },
      { name: 'Clients', href: '/clients', icon: Users, need: 'bill' },
      { name: 'Quotes', href: '/quotes', icon: FileSignature, need: 'sell' },
      { name: 'Playbook', href: '/playbook', icon: BookOpen, need: 'sell' },
    ],
  },
  {
    label: 'Delivery',
    items: [
      { name: 'Projects', href: '/projects', icon: FolderKanban, need: 'sell' },
      { name: 'Contractors', href: '/contractors', icon: HardHat, need: 'sell' },
      { name: 'Systems', href: '/systems', icon: Server, need: 'sell' },
    ],
  },
  {
    label: 'Money',
    items: [
      { name: 'Invoices', href: '/invoices', icon: FileText, need: 'bill' },
      { name: 'Services', href: '/services', icon: Tags },
    ],
  },
  {
    label: 'Review',
    items: [
      { name: 'Weekly review', href: '/review', icon: ClipboardCheck, need: 'sell' },
      { name: 'Onboarding', href: '/onboarding', icon: GraduationCap, need: 'sell' },
      { name: 'Audit trail', href: '/audit', icon: History, need: 'admin' },
      { name: 'Settings', href: '/settings', icon: Settings, need: 'admin' },
    ],
  },
];
