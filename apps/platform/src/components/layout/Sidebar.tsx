import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, FileText, Users, FolderKanban, Settings, Building2, ChevronLeft, ChevronRight, LogOut, KanbanSquare, FileSignature, CalendarClock, Sun, Radar, HardHat, Server, Megaphone, Tags, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useSales } from '@/contexts/SalesContext';
import { useHq } from '@/contexts/HqContext';
import { cn } from '@company-web/shared/utils';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@company-web/shared/ui';
// Grouped the way the week runs: today's list, finding work, winning it,
// delivering it, getting paid, then the Friday review.
const sections: { label?: string; items: { name: string; href: string; icon: typeof LayoutDashboard }[] }[] = [
  { items: [{ name: 'Today', href: '/', icon: Sun }] },
  {
    label: 'Sales',
    items: [
      { name: 'Lead Finder', href: '/leads', icon: Radar },
      { name: 'Pipeline', href: '/pipeline', icon: KanbanSquare },
      { name: 'Clients', href: '/clients', icon: Users },
      { name: 'Follow-ups', href: '/follow-ups', icon: CalendarClock },
      { name: 'Quotes', href: '/quotes', icon: FileSignature },
    ],
  },
  {
    label: 'Delivery',
    items: [
      { name: 'Projects', href: '/projects', icon: FolderKanban },
      { name: 'Contractors', href: '/contractors', icon: HardHat },
      { name: 'Systems', href: '/systems', icon: Server },
      { name: 'Social', href: '/social', icon: Megaphone },
    ],
  },
  {
    label: 'Money',
    items: [
      { name: 'Invoices', href: '/invoices', icon: FileText },
      { name: 'Services', href: '/services', icon: Tags },
    ],
  },
  {
    label: 'Review',
    items: [
      { name: 'Weekly review', href: '/review', icon: ClipboardCheck },
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];
interface SidebarProps {
  className?: string;
}
export function Sidebar({
  className
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    signOut,
    user
  } = useAuth();
  // Phones start with the icon rail so the page keeps most of the width.
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const { followUps } = useSales();
  const today = format(new Date(), 'yyyy-MM-dd');
  // Badge: my follow-ups due today or overdue.
  const dueCount = followUps.filter(f => !f.completedAt && f.assignedTo === user?.id && f.dueDate <= today).length;
  // Badge: prospects whose next action is due (the rest of Today is on the page).
  const { prospects } = useHq();
  const todayCount = prospects.filter(p => p.nextActionDate && p.nextActionDate <= today && !['converted', 'disqualified'].includes(p.stage)).length;
  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };
  return <motion.aside initial={false} animate={{
    width: collapsed ? 80 : 260
  }} transition={{
    duration: 0.2,
    ease: 'easeInOut'
  }} className={cn('fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border flex flex-col', className)}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          {!collapsed && <motion.span initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} exit={{
          opacity: 0
        }} className="text-lg font-semibold text-sidebar-foreground whitespace-nowrap">
              OREECE   
            </motion.span>}
        </Link>
        <button onClick={() => setCollapsed(!collapsed)} className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {sections.map((section, i) => <div key={section.label ?? i} className="space-y-1">
            {section.label && !collapsed && <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {section.label}
              </p>}
            {section.items.map(item => {
          const isActive = location.pathname === item.href || item.href !== '/' && location.pathname.startsWith(item.href)
            || item.href === '/pipeline' && location.pathname.startsWith('/deals');
          const badge = item.href === '/follow-ups' ? dueCount : item.href === '/' ? todayCount : 0;
          return <Link key={item.name} to={item.href} title={collapsed ? item.name : undefined} className={cn('group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200', isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground')}>
                <span className="relative shrink-0">
                  <item.icon className={cn('h-5 w-5', isActive ? '' : 'group-hover:scale-110 transition-transform')} />
                  {badge > 0 && collapsed && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-destructive" />}
                </span>
                {!collapsed && <motion.span initial={{
              opacity: 0
            }} animate={{
              opacity: 1
            }} className="whitespace-nowrap">
                    {item.name}
                  </motion.span>}
                {badge > 0 && !collapsed && <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold leading-none text-destructive-foreground">
                    {badge}
                  </span>}
              </Link>;
        })}
          </div>)}
      </nav>

      {/* Footer with Logout */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {!collapsed && user?.email && <motion.p initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} className="text-xs text-sidebar-foreground/60 truncate px-1">
            {user.email}
          </motion.p>}
        <Button variant="ghost" onClick={handleLogout} className={cn('w-full justify-start gap-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground', collapsed && 'justify-center px-0')}>
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </motion.aside>;
}