import { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery } from "@tanstack/react-query";
import { electionApi } from "@/services/electionApi";
import { Loader2 } from "lucide-react";

const colorFor = (taux: number) =>
  taux > 80 ? "#1e3a8a" :
  taux > 70 ? "#1d4ed8" :
  taux > 60 ? "#3b82f6" :
  taux > 50 ? "#60a5fa" :
              "#bfdbfe";

const ElectionMap = () => {
  const { data = [], isLoading } = useQuery({
    queryKey: ["v_participation_province"],
    queryFn: electionApi.participationByProvince,
    staleTime: 1000 * 60 * 5,
  });

  const radiusFor = useMemo(() => {
    const max = Math.max(1, ...data.map((d) => d.inscrits_total));
    return (n: number) => 6 + Math.sqrt(n / max) * 16;
  }, [data]);

  return (
    <div className="bg-card rounded-lg shadow-md overflow-hidden border border-border h-full">
      <div className="p-4 bg-electoral-light/40 border-b border-border">
        <h2 className="text-base sm:text-lg font-semibold text-foreground">Carte de participation — RDC</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">Taille = inscrits, couleur = taux de participation</p>
      </div>
      <div className="h-[360px] sm:h-[420px] relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-[400]">
            <Loader2 className="w-6 h-6 animate-spin text-electoral-primary" />
          </div>
        )}
        <MapContainer
          center={[-2.88, 23.66]}
          zoom={5}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {data.map((p) => (
            <CircleMarker
              key={p.province_id}
              center={[p.centroid_lat, p.centroid_lng]}
              radius={radiusFor(p.inscrits_total)}
              pathOptions={{
                fillColor: colorFor(Number(p.taux_participation)),
                color: "#1e3a8a",
                weight: 1,
                fillOpacity: 0.75,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{p.province}</strong>
                  <br />
                  Participation : <b>{p.taux_participation}%</b>
                  <br />
                  Votants : {p.votants_total.toLocaleString("fr-FR")} / {p.inscrits_total.toLocaleString("fr-FR")}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <div className="p-3 bg-muted/40 border-t border-border flex flex-wrap gap-3 text-[11px] sm:text-xs">
        {[
          { c: "#1e3a8a", l: ">80%" },
          { c: "#1d4ed8", l: "70-80%" },
          { c: "#3b82f6", l: "60-70%" },
          { c: "#60a5fa", l: "50-60%" },
          { c: "#bfdbfe", l: "<50%" },
        ].map((x) => (
          <div key={x.l} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ background: x.c }} />
            <span>{x.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ElectionMap;