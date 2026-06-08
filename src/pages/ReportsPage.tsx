// src/pages/ReportsPage.tsx
// Page de Rapports : Génération et visualisation de rapports détaillés

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { backendOrchestrator, AnomalyReport } from '@/services/backendOrchestrator';

interface Report {
  id: string;
  type: string;
  title: string;
  description: string;
  generated_at: Date;
  status: 'generating' | 'ready' | 'downloading';
  pages?: number;
}

export function ReportsPage() {
  const [election, setElection] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<AnomalyReport[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const electionRes = await backendOrchestrator.getCurrentElection();
      if (electionRes.success && electionRes.data) {
        setElection(electionRes.data);

        // Récupérer les anomalies
        const anomaliesRes = await backendOrchestrator.getAnomalies(electionRes.data.id, {
          limit: 100,
        });
        if (anomaliesRes.success) {
          setAnomalies(anomaliesRes.data || []);
        }

        // Générer la liste des rapports disponibles
        generateReportsList(electionRes.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReportsList = (electionData: any) => {
    const reportsList: Report[] = [
      {
        id: '1',
        type: 'executive_summary',
        title: 'Résumé Exécutif',
        description: 'Vue d\'ensemble complète de l\'élection',
        generated_at: new Date(),
        status: 'ready',
        pages: 5,
      },
      {
        id: '2',
        type: 'anomalies',
        title: 'Rapport d\'Anomalies',
        description: 'Détail de toutes les anomalies détectées',
        generated_at: new Date(),
        status: 'ready',
        pages: 12,
      },
      {
        id: '3',
        type: 'provinces',
        title: 'Résultats par Province',
        description: 'Ventilation détaillée par province',
        generated_at: new Date(),
        status: 'ready',
        pages: 30,
      },
      {
        id: '4',
        type: 'candidates',
        title: 'Classement des Candidats',
        description: 'Résultats et classement des candidats',
        generated_at: new Date(),
        status: 'ready',
        pages: 8,
      },
    ];

    setReports(reportsList);
  };

  const downloadReport = async (reportId: string, reportType: string) => {
    try {
      // Simuler le téléchargement
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, status: 'downloading' } : r
        )
      );

      // Créer un document fictif
      const content = `
# Rapport: ${reportType}
Date: ${new Date().toLocaleDateString('fr-FR')}
Élection: ${election?.nom}

## Contenu
- Données complètes
- Analyses statistiques
- Visualisations
- Recommandations

Généré automatiquement par Election Hub
      `;

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_${reportType}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, status: 'ready' } : r
        )
      );
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Chargement des rapports...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-slate-50">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold mb-8">📄 Rapports</h1>

          <Tabs defaultValue="available" className="mb-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="available">Rapports Disponibles</TabsTrigger>
              <TabsTrigger value="anomalies">Anomalies Détectées</TabsTrigger>
            </TabsList>

            <TabsContent value="available">
              <div className="space-y-4">
                {reports.map((report) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <FileText className="w-5 h-5 text-blue-600" />
                              <h3 className="text-lg font-semibold">{report.title}</h3>
                              {report.status === 'ready' && (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              )}
                            </div>
                            <p className="text-sm text-slate-600 mb-2">{report.description}</p>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {report.generated_at.toLocaleTimeString('fr-FR')}
                              </span>
                              <span>{report.pages} pages</span>
                            </div>
                          </div>
                          <Button
                            onClick={() => downloadReport(report.id, report.type)}
                            disabled={report.status !== 'ready'}
                            className="gap-2"
                          >
                            <Download className="w-4 h-4" />
                            {report.status === 'downloading' ? 'Téléchargement...' : 'Télécharger'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="anomalies">
              <div className="space-y-3">
                {anomalies.length > 0 ? (
                  anomalies.map((anomaly) => (
                    <motion.div
                      key={anomaly.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <Card className={
                        anomaly.severite === 'critique'
                          ? 'border-red-300 bg-red-50'
                          : anomaly.severite === 'moyenne'
                          ? 'border-yellow-300 bg-yellow-50'
                          : 'border-blue-300 bg-blue-50'
                      }>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold">{anomaly.type}</h3>
                              <p className="text-sm text-slate-600 mt-1">{anomaly.description}</p>
                              <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                                <span>{anomaly.location.province}</span>
                                <span>{anomaly.timestamp.toLocaleTimeString('fr-FR')}</span>
                                <span className="font-semibold text-red-600">
                                  Sévérité: {anomaly.severite}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                anomaly.severite === 'critique'
                                  ? 'bg-red-200 text-red-800'
                                  : anomaly.severite === 'moyenne'
                                  ? 'bg-yellow-200 text-yellow-800'
                                  : 'bg-blue-200 text-blue-800'
                              }`}
                            >
                              {anomaly.status}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center text-slate-600">
                      Aucune anomalie détectée
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
