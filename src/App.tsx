import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { GeolocationProvider } from "@/contexts/GeolocationContext";
import Index from "./pages/Index";
import DiagnosePage from "./pages/DiagnosePage";
import AssistantPage from "./pages/AssistantPage";
import HarvestPage from "./pages/HarvestPage";
import SettingsPage from "./pages/SettingsPage";
import TipsPage from "./pages/TipsPage";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminCropsPage from "./pages/admin/AdminCropsPage";
import AdminDiseasesPage from "./pages/admin/AdminDiseasesPage";
import AdminTreatmentsPage from "./pages/admin/AdminTreatmentsPage";
import AdminAIPage from "./pages/admin/AdminAIPage";
import AdminLanguagesPage from "./pages/admin/AdminLanguagesPage";
import AdminAlertsPage from "./pages/admin/AdminAlertsPage";
import AdminMarketPage from "./pages/admin/AdminMarketPage";
import AdminTipsPage from "./pages/admin/AdminTipsPage";
import AdminDatabasePage from "./pages/admin/AdminDatabasePage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
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
      <GeolocationProvider>
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
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="crops" element={<AdminCropsPage />} />
              <Route path="diseases" element={<AdminDiseasesPage />} />
              <Route path="treatments" element={<AdminTreatmentsPage />} />
              <Route path="ai" element={<AdminAIPage />} />
              <Route path="languages" element={<AdminLanguagesPage />} />
              <Route path="notifications" element={<AdminAlertsPage />} />
              <Route path="analytics" element={<AdminMarketPage />} />
              <Route path="content" element={<AdminTipsPage />} />
              <Route path="database" element={<AdminDatabasePage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
            
            {/* Catch all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </GeolocationProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
