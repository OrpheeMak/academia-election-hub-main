import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { regionsService, type Region } from '../services/regionsService';
import { simulationsService, type ElectionResult } from '../services/simulationsService';
import { useSimulation } from '../contexts/SimulationContext';
import '../styles/SimulationPage.css';

export const SimulationPage: React.FC = () => {
  const { setLoading, setCurrentSimulation, setResults } = useSimulation();
  const [regions, setRegions] = useState<Region[]>([]);
  const [simulationResults, setSimulationResults] = useState<ElectionResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    loadRegions();
  }, []);

  const loadRegions = async () => {
    try {
      setLoading(true);
      const data = await regionsService.getAll();
      setRegions(data);
    } catch (error) {
      console.error('Erreur lors du chargement des régions:', error);
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = async () => {
    setIsRunning(true);
    setLoading(true);

    try {
      // Créer une simulation
      const simulation = await simulationsService.create({
        name: `Simulation ${new Date().toLocaleString('fr-FR')}`,
        data: { status: 'running' },
      });

      setCurrentSimulation(simulation);

      // Générer des résultats aléatoires pour chaque région
      const results: Omit<ElectionResult, 'id' | 'created_at'>[] = regions.map((region) => {
        const votes = Math.floor(Math.random() * 1000000);
        const totalVotes = regions.reduce((acc) => acc + Math.random() * 1000000, 0);
        const percentage = (votes / totalVotes) * 100;

        return {
          simulation_id: simulation.id,
          region_id: region.id,
          votes,
          percentage,
        };
      });

      // Sauvegarder les résultats
      const savedResults = await simulationsService.addResults(results);
      setSimulationResults(savedResults);
      setResults(savedResults);

      // Mettre à jour la simulation
      await simulationsService.create({
        name: `Simulation ${new Date().toLocaleString('fr-FR')}`,
        data: { status: 'completed', resultsCount: savedResults.length },
      });
    } catch (error) {
      console.error('Erreur lors de la simulation:', error);
    } finally {
      setIsRunning(false);
      setLoading(false);
    }
  };

  const getColorByPercentage = (percentage: number): string => {
    if (percentage > 40) return '#ef4444';
    if (percentage > 30) return '#f97316';
    if (percentage > 20) return '#eab308';
    return '#22c55e';
  };

  return (
    <div className="simulation-container">
      <div className="simulation-header">
        <h1>Simulation Électorale Rapide</h1>
        <p>Simulez les résultats électoraux sur la carte interactive</p>
      </div>

      <div className="controls">
        <Button
          onClick={runSimulation}
          disabled={isRunning}
          size="lg"
          className="run-button"
        >
          {isRunning ? 'Simulation en cours...' : 'Lancer la simulation'}
        </Button>
      </div>

      <div className="content">
        <Card className="map-card">
          <MapContainer
            center={[46.2276, 2.2137]}
            zoom={6}
            style={{ height: '600px', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {regions.map((region) => {
              const result = simulationResults.find((r) => r.region_id === region.id);
              const color = result ? getColorByPercentage(result.percentage) : '#999';

              return (
                <React.Fragment key={region.id}>
                  <Marker position={[region.latitude, region.longitude]}>
                    <Popup>
                      <div className="popup-content">
                        <h3>{region.name}</h3>
                        {result && (
                          <>
                            <p><strong>Votes:</strong> {result.votes.toLocaleString('fr-FR')}</p>
                            <p><strong>Pourcentage:</strong> {result.percentage.toFixed(2)}%</p>
                          </>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                  {result && (
                    <CircleMarker
                      center={[region.latitude, region.longitude]}
                      radius={Math.sqrt(result.percentage) * 2}
                      fillColor={color}
                      color={color}
                      weight={2}
                      opacity={0.7}
                      fillOpacity={0.6}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </MapContainer>
        </Card>

        {simulationResults.length > 0 && (
          <Card className="results-card">
            <h2>Résultats de la simulation</h2>
            <div className="results-table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Région</th>
                    <th>Votes</th>
                    <th>Pourcentage</th>
                  </tr>
                </thead>
                <tbody>
                  {simulationResults.map((result) => {
                    const region = regions.find((r) => r.id === result.region_id);
                    return (
                      <tr key={result.id}>
                        <td>{region?.name || 'N/A'}</td>
                        <td>{result.votes.toLocaleString('fr-FR')}</td>
                        <td>{result.percentage.toFixed(2)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
