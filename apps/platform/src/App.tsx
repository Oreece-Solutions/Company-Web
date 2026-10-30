import { lazy, Suspense } from "react";
import { Toaster, ShadcnToaster, TooltipProvider } from "@company-web/shared/ui";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { StoreProvider } from "@/contexts/StoreContext";
import { SalesProvider } from "@/contexts/SalesContext";
import { HqProvider } from "@/contexts/HqContext";
import { SalesDeptProvider } from "@/contexts/SalesDeptContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import TodayPage from "./pages/TodayPage";

// Screens load when first opened, so the app starts fast.
const Index = lazy(() => import("./pages/Index"));
const InvoicesPage = lazy(() => import("./pages/InvoicesPage"));
const InvoiceFormPage = lazy(() => import("./pages/InvoiceFormPage"));
const InvoiceViewPage = lazy(() => import("./pages/InvoiceViewPage"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ClientDetailPage = lazy(() => import("./pages/ClientDetailPage"));
const PipelinePage = lazy(() => import("./pages/PipelinePage"));
const DealsPage = lazy(() => import("./pages/DealsPage"));
const DealDetailPage = lazy(() => import("./pages/DealDetailPage"));
const QuotesPage = lazy(() => import("./pages/QuotesPage"));
const QuoteFormPage = lazy(() => import("./pages/QuoteFormPage"));
const QuoteViewPage = lazy(() => import("./pages/QuoteViewPage"));
const FollowUpsPage = lazy(() => import("./pages/FollowUpsPage"));
const LeadsPage = lazy(() => import("./pages/LeadsPage"));
const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const WeeklyReviewPage = lazy(() => import("./pages/WeeklyReviewPage"));
const ContractorsPage = lazy(() => import("./pages/ContractorsPage"));
const SystemsPage = lazy(() => import("./pages/SystemsPage"));
const SocialPage = lazy(() => import("./pages/SocialPage"));
const AuditPage = lazy(() => import("./pages/AuditPage"));
const SalesDeskPage = lazy(() => import("./pages/SalesDeskPage"));
const PlaybookPage = lazy(() => import("./pages/PlaybookPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <StoreProvider>
        <SalesProvider>
          <HqProvider>
          <SalesDeptProvider>
          <TooltipProvider>
            <Toaster />
            <ShadcnToaster />
            <BrowserRouter>
              <ErrorBoundary>
              <Suspense fallback={<div className="min-h-screen bg-background" />}>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/" element={<ProtectedRoute><TodayPage /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/leads" element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />
                <Route path="/sales" element={<ProtectedRoute><SalesDeskPage /></ProtectedRoute>} />
                <Route path="/playbook" element={<ProtectedRoute><PlaybookPage /></ProtectedRoute>} />
                <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
                <Route path="/services" element={<ProtectedRoute><ServicesPage /></ProtectedRoute>} />
                <Route path="/review" element={<ProtectedRoute><WeeklyReviewPage /></ProtectedRoute>} />
                <Route path="/contractors" element={<ProtectedRoute><ContractorsPage /></ProtectedRoute>} />
                <Route path="/systems" element={<ProtectedRoute><SystemsPage /></ProtectedRoute>} />
                <Route path="/social" element={<ProtectedRoute><SocialPage /></ProtectedRoute>} />
                <Route path="/audit" element={<ProtectedRoute><AuditPage /></ProtectedRoute>} />
                <Route path="/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
                <Route path="/invoices/new" element={<ProtectedRoute><InvoiceFormPage /></ProtectedRoute>} />
                <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceViewPage /></ProtectedRoute>} />
                <Route path="/invoices/:id/edit" element={<ProtectedRoute><InvoiceFormPage /></ProtectedRoute>} />
                <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
                <Route path="/clients/:id" element={<ProtectedRoute><ClientDetailPage /></ProtectedRoute>} />
                <Route path="/pipeline" element={<ProtectedRoute><PipelinePage /></ProtectedRoute>} />
                <Route path="/deals" element={<ProtectedRoute><DealsPage /></ProtectedRoute>} />
                <Route path="/deals/:id" element={<ProtectedRoute><DealDetailPage /></ProtectedRoute>} />
                <Route path="/quotes" element={<ProtectedRoute><QuotesPage /></ProtectedRoute>} />
                <Route path="/quotes/new" element={<ProtectedRoute><QuoteFormPage /></ProtectedRoute>} />
                <Route path="/quotes/:id" element={<ProtectedRoute><QuoteViewPage /></ProtectedRoute>} />
                <Route path="/quotes/:id/edit" element={<ProtectedRoute><QuoteFormPage /></ProtectedRoute>} />
                <Route path="/follow-ups" element={<ProtectedRoute><FollowUpsPage /></ProtectedRoute>} />
                <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
                <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
          </SalesDeptProvider>
          </HqProvider>
        </SalesProvider>
      </StoreProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
