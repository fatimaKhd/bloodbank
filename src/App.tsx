import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";

// Import your pages and components
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Donate from "./pages/Donate";
import Request from "./pages/Request";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import DonorManagementPage from "./pages/DonorManagementPage";
import BloodRequestsPage from "./pages/BloodRequestsPage";
import NotificationHistoryPage from "./pages/NotificationHistoryPage";
import BloodDonationDashboard from "./pages/BloodDonationDashboard";
import { Chatbot } from "./components/Chatbot";

// Import the AuthProvider
import { AuthProvider } from './contexts/AuthProvider';

// Set up React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Scroll handler
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);

    if (hash) {
      setTimeout(() => {
        const element = document.getElementById(hash.substring(1));
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
    }
  }, [pathname, hash]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider> {/* Wrap your app in AuthProvider */}
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/donate" element={<Donate />} />
            <Route path="/request" element={<Request />} />
            <Route path="/about" element={<About />} />
            <Route path="/profile" element={<Profile />} />

            {/* Admin Pages */}
            <Route path="/dashboard/donors" element={<DonorManagementPage />} />
            <Route path="/dashboard/requests" element={<BloodRequestsPage />} />
            <Route path="/dashboard/inventory" element={<Dashboard />} />
            <Route path="/dashboard/analytics" element={<Dashboard />} />
            <Route path="/dashboard/notifications" element={<NotificationHistoryPage />} />

            {/* Footer Resource Routes */}
            <Route path="/guidelines" element={<About />} />
            <Route path="/blood-types" element={<About />} />
            <Route path="/health-info" element={<About />} />
            <Route path="/process" element={<Donate />} />
            <Route path="/research" element={<About />} />
            <Route path="/privacy" element={<About />} />
            <Route path="/terms" element={<About />} />
            <Route path="/cookies" element={<About />} />
            <Route path="/faqs" element={<About />} />

            {/* Custom Route */}
            <Route path="/blood-dashboard" element={<BloodDonationDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>

          <Chatbot />
        </BrowserRouter>
      </AuthProvider> {/* Close AuthProvider here */}
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
