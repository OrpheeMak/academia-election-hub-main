// components/Map/RDCMap.tsx
// Composant carte RDC avec Leaflet et contrôles interactifs

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, ZoomIn, ZoomOut, Maximize2, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RDCMapProps {
  onProvinceClick?: (provinceCode: string) => void;
  highlightedProvince?: string;
  data?: any[];
}

export const RDCMap: React.FC<RDCMapProps> = ({
  onProvinceClick,
  highlightedProvince,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'chart'>('map');

  // Centre et limites de la RDC
  const RDC_CENTER: [number, number] = [-4.0383, 21.7587];
  const RDC_BOUNDS: [[number, number], [number, number]] = [
    [-13.5, 12.0],
    [5.5, 31.5],
  ];

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialiser la carte
    map.current = L.map(mapContainer.current, {
      center: RDC_CENTER,
      zoom: 6,
      minZoom: 5,
      maxZoom: 10,
      maxBounds: RDC_BOUNDS,
      maxBoundsViscosity: 1.0,
    });

    // Ajouter les tuiles OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current);

    // Charger les provinces GeoJSON
    loadProvincesGeoJSON();

    // Nettoyer
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const loadProvincesGeoJSON = async () => {
    try {
      const response = await fetch('/data/rdc_provinces.geojson');
      const geoData = await response.json();

      if (!map.current) return;

      L.geoJSON(geoData, {
        pointToLayer: (feature, latlng) => {
          const isHighlighted = highlightedProvince === feature.properties.code;

          const marker = L.circleMarker(latlng, {
            radius: isHighlighted ? 12 : 8,
            fillColor: isHighlighted ? '#DC2626' : '#3B82F6',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          });

          // Popup
          const popupContent = `
            <div class="p-2">
              <h3 class="font-bold">${feature.properties.nom}</h3>
              <p class="text-sm">Code: ${feature.properties.code}</p>
              <p class="text-sm">Inscrits: ${feature.properties.nombre_inscrits?.toLocaleString()}</p>
              <p class="text-sm">Participation: ${feature.properties.taux_participation}%</p>
            </div>
          `;

          marker.bindPopup(popupContent);

          marker.on('click', () => {
            if (onProvinceClick) {
              onProvinceClick(feature.properties.code);
            }
          });

          return marker;
        },
        onEachFeature: (feature, layer) => {
          layer.on({
            mouseover: () => {
              if (layer instanceof L.CircleMarker) {
                layer.setRadius(10).setStyle({ fillOpacity: 1 });
              }
            },
            mouseout: () => {
              if (layer instanceof L.CircleMarker) {
                const isHighlighted = highlightedProvince === feature.properties.code;
                layer.setRadius(isHighlighted ? 12 : 8).setStyle({
                  fillOpacity: 0.8,
                });
              }
            },
          });
        },
      }).addTo(map.current);
    } catch (error) {
      console.error('Erreur lors du chargement du GeoJSON:', error);
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (!map.current) return;
    const zoom = map.current.getZoom();
    if (direction === 'in') {
      map.current.setZoom(Math.min(zoom + 1, 10));
    } else {
      map.current.setZoom(Math.max(zoom - 1, 5));
    }
  };

  const handleFullscreen = async () => {
    if (!mapContainer.current) return;

    if (!isFullscreen) {
      if (mapContainer.current.requestFullscreen) {
        await mapContainer.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    }

    // Redimensionner la carte après fullscreen
    setTimeout(() => {
      if (map.current) {
        map.current.invalidateSize();
      }
    }, 100);
  };

  if (viewMode === 'chart') {
    return (
      <div className="w-full h-full bg-card rounded-lg border border-border p-6 flex flex-col items-center justify-center">
        <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">Vue graphique à implémenter</p>
        <Button
          onClick={() => setViewMode('map')}
          variant="outline"
          size="sm"
        >
          Retour à la carte
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-card rounded-lg border border-border overflow-hidden">
      {/* Conteneur de la carte */}
      <div
        ref={mapContainer}
        className="w-full h-full"
        style={{ minHeight: '500px' }}
      />

      {/* Contrôles */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <Button
          onClick={() => handleZoom('in')}
          variant="outline"
          size="icon"
          className="bg-white"
          title="Zoom avant"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>

        <Button
          onClick={() => handleZoom('out')}
          variant="outline"
          size="icon"
          className="bg-white"
          title="Zoom arrière"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>

        <Button
          onClick={handleFullscreen}
          variant="outline"
          size="icon"
          className="bg-white"
          title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
        >
          <Maximize2 className="w-4 h-4" />
        </Button>

        <Button
          onClick={() => setViewMode(viewMode === 'map' ? 'chart' : 'map')}
          variant="outline"
          size="icon"
          className="bg-white"
          title="Changer la vue"
        >
          <BarChart3 className="w-4 h-4" />
        </Button>
      </div>

      {/* Légende */}
      <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg border border-border shadow-lg text-sm">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-electoral-primary" />
          <span className="font-semibold">Provinces RDC</span>
        </div>
        <p className="text-muted-foreground text-xs">
          Cliquez sur une province pour plus de détails
        </p>
      </div>
    </div>
  );
};
