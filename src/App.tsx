import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import DiagnosePage from "./pages/DiagnosePage";
import AssistantPage from "./pages/AssistantPage";
import HarvestPage from "./pages/HarvestPage";
import SettingsPage from "./pages/SettingsPage";
import TipsPage from "./pages/TipsPage";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('AgroCamer SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('AgroCamer SW registration failed:', error);
      });
  });
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* User Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/diagnose" element={<DiagnosePage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/harvest" element={<HarvestPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/tips" element={<TipsPage />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminDashboard />} />
              <Route path="crops" element={<AdminDashboard />} />
              <Route path="diseases" element={<AdminDashboard />} />
              <Route path="treatments" element={<AdminDashboard />} />
              <Route path="ai" element={<AdminDashboard />} />
              <Route path="languages" element={<AdminDashboard />} />
              <Route path="notifications" element={<AdminDashboard />} />
              <Route path="analytics" element={<AdminDashboard />} />
              <Route path="content" element={<AdminDashboard />} />
              <Route path="database" element={<AdminDashboard />} />
              <Route path="settings" element={<AdminDashboard />} />
            </Route>
            
            {/* Catch all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
