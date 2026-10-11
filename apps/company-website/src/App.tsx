import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { useEffect } from 'react';
import {
  Toaster,
  ShadcnToaster,
  TooltipProvider,
} from '@company-web/shared/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initPerformanceOptimizations } from '@company-web/shared/utils';
import Index from './pages/Index';
import About from './pages/About';
import Services from './pages/Services';
import Work from './pages/Work';
import WorkDetail from './pages/WorkDetail';
import Industries from './pages/Industries';
import Trust from './pages/Trust';
import Privacy from './pages/Privacy';
import Careers from './pages/Careers';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import { LangProvider } from './site/i18n';

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) return el.scrollIntoView();
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
  },
});

const App = () => {
  useEffect(() => {
    initPerformanceOptimizations();
  }, []);

  return (
    <LangProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <ShadcnToaster />
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route
                path="/showcase"
                element={<Navigate to="/work" replace />}
              />
              <Route path="/about" element={<About />} />
              <Route path="/services" element={<Services />} />
              <Route path="/work" element={<Work />} />
              <Route path="/work/:slug" element={<WorkDetail />} />
              <Route path="/industries" element={<Industries />} />
              <Route path="/trust" element={<Trust />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/contact" element={<Contact />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </TooltipProvider>
      </QueryClientProvider>
    </LangProvider>
  );
};

export default App;
