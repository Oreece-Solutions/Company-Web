import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, FileText, Users, Settings, Building2, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { cn } from '@company-web/shared/utils';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@company-web/shared/ui';
const navigation = [{
  name: 'Dashboard',
  href: '/',
  icon: LayoutDashboard
}, {
  name: 'Invoices',
  href: '/invoices',
  icon: FileText
}, {
  name: 'Clients',
  href: '/clients',
  icon: Users
}, {
  name: 'Settings',
  href: '/settings',
  icon: Settings
}];
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
  const [collapsed, setCollapsed] = useState(false);
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
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map(item => {
        const isActive = location.pathname === item.href || item.href !== '/' && location.pathname.startsWith(item.href);
        return <Link key={item.name} to={item.href} className={cn('group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200', isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground')}>
              <item.icon className={cn('h-5 w-5 shrink-0', isActive ? '' : 'group-hover:scale-110 transition-transform')} />
              {!collapsed && <motion.span initial={{
            opacity: 0
          }} animate={{
            opacity: 1
          }} className="whitespace-nowrap">
                  {item.name}
                </motion.span>}
            </Link>;
      })}
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