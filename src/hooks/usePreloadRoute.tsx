import { useEffect } from 'react';

// Preload critical routes for faster navigation
export const usePreloadRoute = (routes: string[]) => {
  useEffect(() => {
    const preloadRoute = (route: string) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = route;
      document.head.appendChild(link);
    };

    routes.forEach(preloadRoute);

    return () => {
      // Cleanup prefetch links
      document.querySelectorAll('link[rel="prefetch"]').forEach(link => {
        if (routes.includes((link as HTMLLinkElement).href)) {
          link.remove();
        }
      });
    };
  }, [routes]);
};