import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';

import Leads from './pages/Leads';
import Tasks from './pages/Tasks';
import Suggestions from './pages/Suggestions';
import Agenda from './pages/Agenda';
import SettingsPage from './pages/SettingsPage';
import LeadDetail from './pages/LeadDetail';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';

// Finances
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import Billing from './pages/Billing';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/Dashboard" replace />} />
        <Route path="/Dashboard" element={<Dashboard />} />

        {/* Comercial */}
        <Route path="/Leads" element={<Leads />} />
        <Route path="/Projects" element={<Projects />} />
        <Route path="/ProjectDetail" element={<ProjectDetail />} />
        <Route path="/Tasks" element={<Tasks />} />
        <Route path="/Suggestions" element={<Suggestions />} />
        <Route path="/Agenda" element={<Agenda />} />
        <Route path="/LeadDetail" element={<LeadDetail />} />

        {/* Finances 360 */}
        <Route path="/Clients" element={<Clients />} />
        <Route path="/ClientDetail" element={<ClientDetail />} />
        <Route path="/Invoices" element={<Invoices />} />
        <Route path="/InvoiceDetail" element={<InvoiceDetail />} />
        <Route path="/Billing" element={<Billing />} />

        {/* Sistema */}
        <Route path="/SettingsPage" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
