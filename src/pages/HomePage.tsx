// pages/HomePage.tsx
// Page d'accueil complète avec tous les éléments interactifs

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { HeaderAdvanced } from '@/components/Dashboard/HeaderAdvanced';
import { FilterBarAdvanced } from '@/components/Dashboard/FilterBarAdvanced';
import { KPICardAdvanced, AnomalyBadge } from '@/components/Dashboard/KPICardAdvanced';
import { RDCMap } from '@/components/Map/RDCMap';
import { useProvinces, useProvinceWithStats } from '@/hooks/useProvinces';
import { useAnomalies, useAnomaliesNonLuesCount } from '@/hooks/useAnomalies';
import { useExport } from '@/hooks/useExport';
import {
  Users,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Modal,
  BarChart3,
  PieChart,
  LineChart,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const HomePage: React.FC = () => {
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string | undefined>();
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsType, setDetailsType] = useState<'kpi' | 'province'>('kpi');
  const { exportToCSV, exportToJSON } = useExport();

  // Hooks de données
  const { data: provinces = [], isLoading: provincesLoading } = useProvinces();
  const { data: selectedProvinceData } = useProvinceWithStats(selectedProvince || '');
  const { data: anomalies = [], isLoading: anomaliesLoading } = useAnomalies({
    limite: 10,
  });
  const anomaliesCount = useAnomaliesNonLuesCount();

  // Récupérer les statistiques globales
  const { data: stats } = useQuery({
    queryKey: ['election-stats'],
    queryFn: async () => {
      const [
        { data: resultats },
        { data: config },
      ] = await Promise.all([
        supabase
          .from('resultats_partiels')
          .select('voix, taux_participation, province_id')
          .limit(1000),
        supabase.from('config_anomalies').select('*'),
      ]);

      const totalVoix = resultats?.reduce((sum, r) => sum + r.voix, 0) || 0;
      const avgParticipation =
        resultats?.reduce((sum, r) => sum + (r.taux_participation || 0), 0) / (resultats?.length || 1) || 0;

      return {
        provinces: provinces.length,
        totalVoix,
        avgParticipation: Math.round(avgParticipation),
        anomalies: anomalies.length,
        config,
      };
    },
    staleTime: 1000 * 30,
  });

  // Fonctions de gestion
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simuler le rafraîchissement
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleDownloadReport = () => {
    const reportData = {
      date: new Date().toISOString(),
      provinces: provinces.length,
      totalVoix: stats?.totalVoix || 0,
      participation: stats?.avgParticipation || 0,
      anomalies: anomalies.length,
    };

    exportToJSON(
      [reportData],
      `rapport-electoral-${new Date().toISOString().split('T')[0]}.json`
    );
  };

  const handleKPIClick = (type: string) => {
    setDetailsType('kpi');
    setShowDetailsModal(true);
  };

  const handleProvinceClick = (provinceCode: string) => {
    setSelectedProvince(provinceCode);
    setDetailsType('province');
    setShowDetailsModal(true);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-slate-50">
      {/* Header */}
      <HeaderAdvanced
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        isRealtimeEnabled={isRealtimeEnabled}
        onRealtimeToggle={setIsRealtimeEnabled}
        onDownloadReport={handleDownloadReport}
        onHelpClick={() => setShowHelpModal(true)}
      />

      {/* Contenu principal */}
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Filtres */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <FilterBarAdvanced
            provinces={provinces}
            onFilterChange={(filters) => console.log('Filtres appliqués:', filters)}
            onReset={() => console.log('Filtres réinitialisés')}
          />
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <motion.div variants={itemVariants}>
            <KPICardAdvanced
              title="Provinces couvertes"
              value={stats?.provinces || 0}
              subtitle="Circonscriptions électorales"
              icon={<MapPin className="w-6 h-6" />}
              onClick={() => handleKPIClick('provinces')}
              trend={{ value: 100, positive: true }}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <KPICardAdvanced
              title="Inscrits total"
              value={`${((stats?.totalVoix || 0) / 1000000).toFixed(1)}M`}
              subtitle="Électeurs enregistrés"
              icon={<Users className="w-6 h-6" />}
              onClick={() => handleKPIClick('inscrits')}
              badge={{ label: 'En cours', color: 'green' }}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <KPICardAdvanced
              title="Participation"
              value={`${stats?.avgParticipation || 0}%`}
              subtitle="Moyenne nationale"
              icon={<TrendingUp className="w-6 h-6" />}
              onClick={() => handleKPIClick('participation')}
              trend={{ value: 12, positive: true }}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <KPICardAdvanced
              title="Anomalies"
              value={anomalies.length}
              subtitle="Détectées automatiquement"
              icon={<AlertTriangle className="w-6 h-6" />}
              onClick={() => handleKPIClick('anomalies')}
              badge={{
                label: `${(anomaliesCount.data || 0)} critique(s)`,
                color: 'red',
              }}
            />
          </motion.div>
        </motion.div>

        {/* Section Carte et Données */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
        >
          {/* Carte */}
          <div className="lg:col-span-2 bg-card rounded-lg border border-border overflow-hidden shadow-lg">
            <div style={{ height: '500px' }}>
              <RDCMap
                onProvinceClick={handleProvinceClick}
                highlightedProvince={selectedProvince}
              />
            </div>
          </div>

          {/* Panneau latéral - Anomalies */}
          <motion.div
            variants={itemVariants}
            className="bg-card rounded-lg border border-border p-6 shadow-lg flex flex-col"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Alertes récentes
            </h3>

            <div className="flex-1 space-y-3 overflow-y-auto">
              {anomaliesLoading ? (
                <p className="text-muted-foreground text-sm">Chargement...</p>
              ) : anomalies.length > 0 ? (
                anomalies.map((anomalie) => (
                  <div
                    key={anomalie.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      anomalie.gravite === 'critique'
                        ? 'bg-red-50 border-red-500'
                        : anomalie.gravite === 'moyenne'
                          ? 'bg-yellow-50 border-yellow-500'
                          : 'bg-blue-50 border-blue-500'
                    }`}
                  >
                    <p className="font-semibold text-sm text-foreground">
                      {anomalie.type_anomalie}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {anomalie.description}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">Aucune anomalie</p>
              )}
            </div>

            <Button
              onClick={() => handleKPIClick('anomalies')}
              variant="outline"
              className="w-full mt-4"
            >
              Voir toutes les anomalies
            </Button>
          </motion.div>
        </motion.div>

        {/* Graphiques */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            { icon: BarChart3, title: 'Résultats par candidat', color: 'blue' },
            { icon: LineChart, title: 'Évolution participation', color: 'green' },
            { icon: PieChart, title: 'Distribution provinces', color: 'purple' },
          ].map((chart, idx) => (
            <motion.div key={idx} variants={itemVariants}>
              <div className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-shadow cursor-pointer group">
                <div className="flex items-center justify-between mb-4">
                  <chart.icon className={`w-6 h-6 text-${chart.color}-600`} />
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                    Voir
                  </Button>
                </div>
                <p className="font-semibold text-foreground mb-2">{chart.title}</p>
                <div className="h-48 bg-gradient-to-br from-slate-100 to-slate-50 rounded flex items-center justify-center text-muted-foreground text-sm">
                  Graphique à implémenter
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Modal Détails */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {detailsType === 'province'
                ? selectedProvinceData?.nom
                : 'Détails des données'}
            </DialogTitle>
            <DialogDescription>
              Informations détaillées et statistiques
            </DialogDescription>
          </DialogHeader>

          {detailsType === 'province' && selectedProvinceData && (
            <Tabs defaultValue="stats" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="stats">Statistiques</TabsTrigger>
                <TabsTrigger value="results">Résultats</TabsTrigger>
                <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
              </TabsList>

              <TabsContent value="stats" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Inscrits</p>
                    <p className="text-2xl font-bold">
                      {selectedProvinceData.nombre_inscrits?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bureaux</p>
                    <p className="text-2xl font-bold">
                      {selectedProvinceData.nombre_bureaux}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Participation</p>
                    <p className="text-2xl font-bold">
                      {selectedProvinceData.taux_participation}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Anomalies</p>
                    <p className="text-2xl font-bold text-red-600">
                      {selectedProvinceData.anomalies_count}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="results">
                <p className="text-muted-foreground">
                  Résultats détaillés par candidat à implémenter
                </p>
              </TabsContent>

              <TabsContent value="anomalies">
                <p className="text-muted-foreground">
                  Liste des anomalies détectées à implémenter
                </p>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Aide */}
      <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aide et Documentation</DialogTitle>
            <DialogDescription>
              Guide d'utilisation du tableau de bord électoral
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">🗺️ Navigation sur la carte</h4>
              <p className="text-sm text-muted-foreground">
                Cliquez sur une province pour voir ses détails. Utilisez les boutons
                de contrôle pour zoomer et basculer vers le plein écran.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">📊 Filtres et données</h4>
              <p className="text-sm text-muted-foreground">
                Utilisez la barre de filtres pour affiner les résultats par province,
                type d'élection et niveau géographique.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">🔔 Alertes et anomalies</h4>
              <p className="text-sm text-muted-foreground">
                Les anomalies critiques s'affichent automatiquement. Cliquez sur le
                badge "Anomalies" pour voir la liste complète.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">📥 Exports et rapports</h4>
              <p className="text-sm text-muted-foreground">
                Utilisez le bouton "Rapport" pour télécharger les données en JSON, CSV
                ou PDF.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <p className="font-semibold text-blue-900 mb-1">ℹ️ Information</p>
              <p className="text-blue-800">
                Ce prototype académique utilise des données simulées. Aucune donnée
                réelle n'a été collectée.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomePage;
