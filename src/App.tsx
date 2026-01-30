import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { GeolocationProvider } from "@/contexts/GeolocationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { FloatingChatBubble } from "@/components/chat/FloatingChatBubble";
import Index from "./pages/Index";
import DiagnosePage from "./pages/DiagnosePage";
import HarvestPage from "./pages/HarvestPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import TipsPage from "./pages/TipsPage";
import AuthPage from "./pages/AuthPage";
import AdminLayout from "./components/admin/AdminLayout";
import RequireAdmin from "./components/admin/RequireAdmin";
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
import AdminLearningPage from "./pages/admin/AdminLearningPage";
import AssistantPage from "./pages/AssistantPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();


// Register Service Worker (production only)
// In previews/dev, an old SW can cache stale JS chunks and cause React hook runtime errors.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    // Disable SW in dev/preview
    if (!import.meta.env.PROD) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));

        // Clear caches so old bundles can't be served
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map((n) => caches.delete(n)));
        }

        console.log('AgroCamer SW disabled (non-production)');
      } catch (e) {
        console.log('AgroCamer SW disable failed:', e);
      }
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('AgroCamer SW registered:', registration.scope);
    } catch (error) {
      console.log('AgroCamer SW registration failed:', error);
    }
  });
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <GeolocationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Auth Route - Public */}
                <Route path="/auth" element={<AuthPage />} />
                
                {/* Protected User Routes */}
                <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
                <Route path="/diagnose" element={<RequireAuth><DiagnosePage /></RequireAuth>} />
                <Route path="/harvest" element={<RequireAuth><HarvestPage /></RequireAuth>} />
                <Route path="/history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
                <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
                <Route path="/tips" element={<RequireAuth><TipsPage /></RequireAuth>} />
                <Route path="/assistant" element={<RequireAuth><AssistantPage /></RequireAuth>} />
                
                {/* Protected Admin Routes */}
                <Route path="/admin" element={
                  <RequireAdmin>
                    <AdminLayout />
                  </RequireAdmin>
                }>
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
                  <Route path="learning" element={<AdminLearningPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                </Route>
                
                {/* Catch all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              
              {/* Floating Chat Bubble - Always visible */}
              <FloatingChatBubble />
            </BrowserRouter>
          </TooltipProvider>
        </GeolocationProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
