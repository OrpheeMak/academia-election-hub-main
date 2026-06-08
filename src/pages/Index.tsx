import { lazy, Suspense } from "react";
import Header from "@/components/dashboard/Header";
import FiltersBar from "@/components/dashboard/FiltersBar";
import KpiCards from "@/components/dashboard/KpiCards";
import { Loader2 } from "lucide-react";

const ElectionMap = lazy(() => import("@/components/dashboard/ElectionMap"));
const ResultsChart = lazy(() => import("@/components/dashboard/ResultsChart"));
const PredictionCard = lazy(() => import("@/components/dashboard/PredictionCard"));
const AnomaliesCard = lazy(() => import("@/components/dashboard/AnomaliesCard"));

const Fallback = ({ h = "h-[360px]" }: { h?: string }) => (
  <div className={`bg-card rounded-lg border border-border ${h} flex items-center justify-center`}>
    <Loader2 className="w-6 h-6 animate-spin text-electoral-primary" />
  </div>
);

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20 sm:pt-24 pb-8 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
          <FiltersBar />
          <KpiCards />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Suspense fallback={<Fallback h="h-[480px]" />}>
              <ElectionMap />
            </Suspense>
            <Suspense fallback={<Fallback h="h-[480px]" />}>
              <ResultsChart />
            </Suspense>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Suspense fallback={<Fallback />}>
              <PredictionCard />
            </Suspense>
            <Suspense fallback={<Fallback />}>
              <AnomaliesCard />
            </Suspense>
          </div>
        </main>
      </div>
  );
};

export default Index;
