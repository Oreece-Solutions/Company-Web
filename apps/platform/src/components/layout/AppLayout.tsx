import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { cn } from '@company-web/shared/utils';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(260);

  useEffect(() => {
    const handleResize = () => {
      const sidebar = document.querySelector('aside');
      if (sidebar) {
        setSidebarWidth(sidebar.offsetWidth);
      }
    };

    // Observe sidebar width changes
    const resizeObserver = new ResizeObserver(handleResize);
    const sidebar = document.querySelector('aside');
    if (sidebar) {
      resizeObserver.observe(sidebar);
    }

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main
        className="transition-all duration-200 ease-in-out"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
