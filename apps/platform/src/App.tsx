import { Toaster, ShadcnToaster, TooltipProvider } from "@company-web/shared/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { StoreProvider } from "@/contexts/StoreContext";
import { SalesProvider } from "@/contexts/SalesContext";
import { HqProvider } from "@/contexts/HqContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import Index from "./pages/Index";
import InvoicesPage from "./pages/InvoicesPage";
import InvoiceFormPage from "./pages/InvoiceFormPage";
import InvoiceViewPage from "./pages/InvoiceViewPage";
import ClientsPage from "./pages/ClientsPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import SettingsPage from "./pages/SettingsPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import PipelinePage from "./pages/PipelinePage";
import DealsPage from "./pages/DealsPage";
import DealDetailPage from "./pages/DealDetailPage";
import QuotesPage from "./pages/QuotesPage";
import QuoteFormPage from "./pages/QuoteFormPage";
import QuoteViewPage from "./pages/QuoteViewPage";
import FollowUpsPage from "./pages/FollowUpsPage";
import NotFound from "./pages/NotFound";
import TodayPage from "./pages/TodayPage";
import LeadsPage from "./pages/LeadsPage";
import ServicesPage from "./pages/ServicesPage";
import WeeklyReviewPage from "./pages/WeeklyReviewPage";
import ContractorsPage from "./pages/ContractorsPage";
import SystemsPage from "./pages/SystemsPage";
import SocialPage from "./pages/SocialPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <StoreProvider>
        <SalesProvider>
          <HqProvider>
          <TooltipProvider>
            <Toaster />
            <ShadcnToaster />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/" element={<ProtectedRoute><TodayPage /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/leads" element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />
                <Route path="/services" element={<ProtectedRoute><ServicesPage /></ProtectedRoute>} />
                <Route path="/review" element={<ProtectedRoute><WeeklyReviewPage /></ProtectedRoute>} />
                <Route path="/contractors" element={<ProtectedRoute><ContractorsPage /></ProtectedRoute>} />
                <Route path="/systems" element={<ProtectedRoute><SystemsPage /></ProtectedRoute>} />
                <Route path="/social" element={<ProtectedRoute><SocialPage /></ProtectedRoute>} />
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
            </BrowserRouter>
          </TooltipProvider>
          </HqProvider>
        </SalesProvider>
      </StoreProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
