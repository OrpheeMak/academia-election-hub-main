import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import { DashboardPage } from "./pages/DashboardPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { AdministrationPage } from "./pages/AdministrationPage";
import { MonitoringPage } from "./pages/MonitoringPage";
import { FiltersProvider } from "./contexts/FiltersContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24, // 24h pour persistance offline
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "rdc-electoral-cache",
});

function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
    >
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <FiltersProvider>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/monitoring" element={<MonitoringPage />} />
              <Route path="/statistics" element={<StatisticsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/administration" element={<AdministrationPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </FiltersProvider>
        </BrowserRouter>
      </TooltipProvider>
    </PersistQueryClientProvider>
  );
}

export default App;
