import { lazy, Suspense } from "react";
import { Toaster, ShadcnToaster, TooltipProvider } from "@company-web/shared/ui";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { StoreProvider } from "@/contexts/StoreContext";
import { SalesProvider } from "@/contexts/SalesContext";
import { HqProvider } from "@/contexts/HqContext";
import { SalesDeptProvider } from "@/contexts/SalesDeptContext";
import { MoneyProvider } from "@/contexts/MoneyContext";
import { DeliveryProvider } from "@/contexts/DeliveryContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { CommandPalette } from "@/components/layout/CommandPalette";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import TodayPage from "./pages/TodayPage";

// Screens load when first opened, so the app starts fast.
const InvoicesPage = lazy(() => import("./pages/InvoicesPage"));
const InvoiceFormPage = lazy(() => import("./pages/InvoiceFormPage"));
const InvoiceViewPage = lazy(() => import("./pages/InvoiceViewPage"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ClientDetailPage = lazy(() => import("./pages/ClientDetailPage"));
const PipelinePage = lazy(() => import("./pages/PipelinePage"));
const DealDetailPage = lazy(() => import("./pages/DealDetailPage"));
const QuotesPage = lazy(() => import("./pages/QuotesPage"));
const QuoteFormPage = lazy(() => import("./pages/QuoteFormPage"));
const QuoteViewPage = lazy(() => import("./pages/QuoteViewPage"));
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
const MoneyPage = lazy(() => import("./pages/MoneyPage"));
const RetainersPage = lazy(() => import("./pages/RetainersPage"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const TimesheetPage = lazy(() => import("./pages/TimesheetPage"));
const HiringPage = lazy(() => import("./pages/HiringPage"));

const queryClient = new QueryClient();

// Old addresses for screens that were merged, so bookmarks keep working.
function DealsRedirect() {
  const [params] = useSearchParams();
  const stage = params.get("stage");
  return <Navigate to={`/pipeline?view=list${stage ? `&stage=${stage}` : ""}`} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <StoreProvider>
        <SalesProvider>
          <HqProvider>
          <SalesDeptProvider>
          <MoneyProvider>
          <DeliveryProvider>
          <TooltipProvider>
            <Toaster />
            <ShadcnToaster />
            <BrowserRouter>
              <ErrorBoundary>
              <CommandPalette />
              <Suspense fallback={<div className="min-h-screen bg-background" />}>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/" element={<ProtectedRoute><TodayPage /></ProtectedRoute>} />
                <Route path="/dashboard" element={<Navigate to="/" replace />} />
                <Route path="/leads" element={<ProtectedRoute need="sell"><LeadsPage /></ProtectedRoute>} />
                <Route path="/sales" element={<ProtectedRoute need="sell"><SalesDeskPage /></ProtectedRoute>} />
                <Route path="/playbook" element={<ProtectedRoute need="sell"><PlaybookPage /></ProtectedRoute>} />
                <Route path="/onboarding" element={<ProtectedRoute need="sell"><OnboardingPage /></ProtectedRoute>} />
                <Route path="/services" element={<ProtectedRoute><ServicesPage /></ProtectedRoute>} />
                <Route path="/review" element={<ProtectedRoute need="sell"><WeeklyReviewPage /></ProtectedRoute>} />
                <Route path="/contractors" element={<ProtectedRoute need="sell"><ContractorsPage /></ProtectedRoute>} />
                <Route path="/systems" element={<ProtectedRoute need="sell"><SystemsPage /></ProtectedRoute>} />
                <Route path="/social" element={<ProtectedRoute need="admin"><SocialPage /></ProtectedRoute>} />
                <Route path="/audit" element={<ProtectedRoute need="admin"><AuditPage /></ProtectedRoute>} />
                <Route path="/support" element={<ProtectedRoute need="sell"><SupportPage /></ProtectedRoute>} />
                <Route path="/timesheet" element={<ProtectedRoute need="sell"><TimesheetPage /></ProtectedRoute>} />
                <Route path="/hiring" element={<ProtectedRoute need="admin"><HiringPage /></ProtectedRoute>} />
                <Route path="/money" element={<ProtectedRoute need="bill"><MoneyPage /></ProtectedRoute>} />
                <Route path="/retainers" element={<ProtectedRoute need="bill"><RetainersPage /></ProtectedRoute>} />
                <Route path="/expenses" element={<ProtectedRoute need="bill"><ExpensesPage /></ProtectedRoute>} />
                <Route path="/invoices" element={<ProtectedRoute need="bill"><InvoicesPage /></ProtectedRoute>} />
                <Route path="/invoices/new" element={<ProtectedRoute need="bill"><InvoiceFormPage /></ProtectedRoute>} />
                <Route path="/invoices/:id" element={<ProtectedRoute need="bill"><InvoiceViewPage /></ProtectedRoute>} />
                <Route path="/invoices/:id/edit" element={<ProtectedRoute need="bill"><InvoiceFormPage /></ProtectedRoute>} />
                <Route path="/clients" element={<ProtectedRoute need="bill"><ClientsPage /></ProtectedRoute>} />
                <Route path="/clients/:id" element={<ProtectedRoute need="bill"><ClientDetailPage /></ProtectedRoute>} />
                <Route path="/pipeline" element={<ProtectedRoute need="sell"><PipelinePage /></ProtectedRoute>} />
                <Route path="/deals" element={<DealsRedirect />} />
                <Route path="/deals/:id" element={<ProtectedRoute need="sell"><DealDetailPage /></ProtectedRoute>} />
                <Route path="/quotes" element={<ProtectedRoute need="sell"><QuotesPage /></ProtectedRoute>} />
                <Route path="/quotes/new" element={<ProtectedRoute need="sell"><QuoteFormPage /></ProtectedRoute>} />
                <Route path="/quotes/:id" element={<ProtectedRoute need="sell"><QuoteViewPage /></ProtectedRoute>} />
                <Route path="/quotes/:id/edit" element={<ProtectedRoute need="sell"><QuoteFormPage /></ProtectedRoute>} />
                <Route path="/follow-ups" element={<Navigate to="/" replace />} />
                <Route path="/projects" element={<ProtectedRoute need="sell"><ProjectsPage /></ProtectedRoute>} />
                <Route path="/projects/:id" element={<ProtectedRoute need="sell"><ProjectDetailPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute need="admin"><SettingsPage /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
          </DeliveryProvider>
          </MoneyProvider>
          </SalesDeptProvider>
          </HqProvider>
        </SalesProvider>
      </StoreProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
