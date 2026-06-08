# 🗄️ SUPABASE SQL SCRIPTS - Copy & Paste Ready

**Pour copier-coller directement dans Supabase SQL Editor**

---

## 📋 Instructions d'Exécution

1. Aller à: https://app.supabase.com → Votre Project
2. Menu latéral: **SQL Editor**
3. Cliquer: **+ New Query**
4. **Copier-coller** chaque script en entier
5. Cliquer: **Run** (ou Ctrl+Enter)
6. **Attendre**: ✅ "Success"
7. Passer au script suivant

---

## ✅ SCRIPT 1: CREATE TABLE provinces

```sql
CREATE TABLE provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(255) NOT NULL,
  code VARCHAR(10) UNIQUE NOT NULL,
  population INTEGER,
  inscrits_total INTEGER,
  centre_lat DECIMAL(10, 7),
  centre_lng DECIMAL(10, 7),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_provinces_code ON provinces(code);
CREATE INDEX idx_provinces_nom ON provinces(nom);

COMMENT ON TABLE provinces IS 'Provinces de la RDC avec données géographiques et électorales';
```

**Résultat Attendu**: ✅ "Success - 2 statements executed"

---

## ✅ SCRIPT 2: CREATE TABLE resultats_partiels

```sql
CREATE TABLE resultats_partiels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id UUID REFERENCES provinces(id) ON DELETE CASCADE,
  circonscription_id UUID,
  candidat_id UUID,
  voix INTEGER NOT NULL DEFAULT 0,
  inscrits INTEGER NOT NULL,
  taux_participation DECIMAL(5, 2) DEFAULT 0,
  timestamp_saisie TIMESTAMP DEFAULT NOW(),
  is_anomalie BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_resultats_province ON resultats_partiels(province_id);
CREATE INDEX idx_resultats_timestamp ON resultats_partiels(timestamp_saisie);
CREATE INDEX idx_resultats_anomalie ON resultats_partiels(is_anomalie);
CREATE INDEX idx_resultats_candidat ON resultats_partiels(candidat_id);

COMMENT ON TABLE resultats_partiels IS 'Résultats partiels électoraux avec anomalies détectées';
```

**Résultat Attendu**: ✅ "Success - 5 statements executed"

---

## ✅ SCRIPT 3: CREATE TABLE anomalies

```sql
CREATE TABLE anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resultat_id UUID REFERENCES resultats_partiels(id) ON DELETE CASCADE,
  province_id UUID REFERENCES provinces(id) ON DELETE CASCADE,
  type_anomalie VARCHAR(100) NOT NULL,
  gravite VARCHAR(20) NOT NULL DEFAULT 'faible',
  description TEXT,
  valeur_observee DECIMAL(10, 2),
  valeur_attendue DECIMAL(10, 2),
  z_score DECIMAL(5, 2),
  est_lue BOOLEAN DEFAULT FALSE,
  timestamp_detection TIMESTAMP DEFAULT NOW(),
  timestamp_validation TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CHECK (gravite IN ('faible', 'moyenne', 'critique'))
);

CREATE INDEX idx_anomalies_province ON anomalies(province_id);
CREATE INDEX idx_anomalies_gravite ON anomalies(gravite);
CREATE INDEX idx_anomalies_est_lue ON anomalies(est_lue);
CREATE INDEX idx_anomalies_type ON anomalies(type_anomalie);
CREATE INDEX idx_anomalies_timestamp ON anomalies(timestamp_detection);

COMMENT ON TABLE anomalies IS 'Anomalies détectées avec type, sévérité et statistiques';
```

**Résultat Attendu**: ✅ "Success - 6 statements executed"

---

## ✅ SCRIPT 4: CREATE TABLE predictions

```sql
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id UUID REFERENCES provinces(id) ON DELETE CASCADE,
  model_version VARCHAR(50) NOT NULL,
  participation_predite DECIMAL(5, 2),
  voix_predites JSONB,
  confiance DECIMAL(3, 2) NOT NULL,
  timestamp_prediction TIMESTAMP DEFAULT NOW(),
  timestamp_validation TIMESTAMP,
  is_accurate BOOLEAN,
  mape DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_predictions_province ON predictions(province_id);
CREATE INDEX idx_predictions_model ON predictions(model_version);
CREATE INDEX idx_predictions_timestamp ON predictions(timestamp_prediction);

COMMENT ON TABLE predictions IS 'Prédictions du modèle ML avec accuracy tracking';
```

**Résultat Attendu**: ✅ "Success - 4 statements executed"

---

## ✅ SCRIPT 5: CREATE TABLE simulation_logs

```sql
CREATE TABLE simulation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id VARCHAR(50) NOT NULL,
  province_id UUID REFERENCES provinces(id) ON DELETE CASCADE,
  step INTEGER NOT NULL,
  state JSONB NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_simulation_logs_simulation ON simulation_logs(simulation_id);
CREATE INDEX idx_simulation_logs_province ON simulation_logs(province_id);
CREATE INDEX idx_simulation_logs_timestamp ON simulation_logs(timestamp);

COMMENT ON TABLE simulation_logs IS 'Logs de simulation temps réel - Stockage d''état complet';
```

**Résultat Attendu**: ✅ "Success - 4 statements executed"

---

## ✅ SCRIPT 6: Enable RLS & Create Policies

```sql
-- Enable RLS on all tables
ALTER TABLE provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultats_partiels ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_logs ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read on provinces"
  ON provinces FOR SELECT USING (true);

CREATE POLICY "Allow public read on resultats_partiels"
  ON resultats_partiels FOR SELECT USING (true);

CREATE POLICY "Allow public read on predictions"
  ON predictions FOR SELECT USING (true);

CREATE POLICY "Allow public read on anomalies"
  ON anomalies FOR SELECT USING (true);

-- Authenticated insert
CREATE POLICY "Allow authenticated insert on resultats_partiels"
  ON resultats_partiels FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert on anomalies"
  ON anomalies FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert on predictions"
  ON predictions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

**Résultat Attendu**: ✅ "Success - 12 statements executed"

---

## ✅ SCRIPT 7: INSERT Data - Provinces (19 provinces de RDC)

```sql
INSERT INTO provinces (nom, code, population, inscrits_total, centre_lat, centre_lng) VALUES
('Kasai Central', 'KC', 2500000, 1800000, -4.2634, 22.6499),
('Kasai', 'KS', 3000000, 2100000, -4.9383, 20.5882),
('Kasai Oriental', 'KO', 1800000, 1200000, -5.8721, 23.7676),
('Kinshasa', 'KIN', 12000000, 8500000, -4.3276, 15.3136),
('Kongo Central', 'KC_C', 2000000, 1400000, -5.0256, 13.1242),
('Lualaba', 'LUA', 2500000, 1800000, -11.6639, 26.8489),
('Maniema', 'MAN', 1200000, 850000, -2.7591, 25.7183),
('Mongala', 'MON', 900000, 600000, 1.6543, 22.3467),
('Nord-Kivu', 'NK', 3500000, 2400000, -1.2921, 29.2197),
('Nord-Ubangi', 'NU', 600000, 400000, 2.7534, 22.7234),
('Katanga', 'KAT', 8000000, 5500000, -10.0, 27.0),
('Sud-Kivu', 'SK', 2800000, 1900000, -2.8084, 28.8347),
('Sud-Ubangi', 'SU', 500000, 350000, 1.0234, 21.4567),
('Tshopo', 'TSH', 2200000, 1600000, 0.6280, 24.7622),
('Tshuapa', 'TSA', 800000, 550000, 0.6419, 22.3762),
('Haut-Katanga', 'HK', 1500000, 1000000, -9.8, 27.5),
('Ituri', 'ITU', 2000000, 1400000, 1.5, 30.5),
('Kasai-Occidental', 'KOC', 900000, 600000, -5.9, 21.3),
('Bas-Kasai', 'BK', 700000, 500000, -6.5, 19.8);
```

**Résultat Attendu**: ✅ "Success - 19 rows inserted"

---

## ✅ SCRIPT 8: Vérifier les Tables (Bonus - Inspection)

```sql
-- Voir toutes les tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Résultat attendu:
-- anomalies
-- predictions
-- provinces
-- resultats_partiels
-- simulation_logs
```

**Résultat Attendu**: ✅ "5 rows" (5 tables)

---

## 🔍 VERIFICATION CHECKLIST

Après exécution de tous les scripts:

```
[✓] SCRIPT 1: provinces créée
[✓] SCRIPT 2: resultats_partiels créée
[✓] SCRIPT 3: anomalies créée
[✓] SCRIPT 4: predictions créée
[✓] SCRIPT 5: simulation_logs créée
[✓] SCRIPT 6: RLS activé + Policies
[✓] SCRIPT 7: 19 provinces insérées
[✓] SCRIPT 8: 5 tables existantes

✅ ALL TABLES CREATED & POPULATED
```

---

## 📋 Vérifier dans l'UI Supabase

1. **Table Editor**:
   - Menu latéral: Table Editor
   - Vous devriez voir 5 tables:
     ```
     ✅ provinces (19 rows)
     ✅ resultats_partiels (0 rows - empty)
     ✅ anomalies (0 rows - empty)
     ✅ predictions (0 rows - empty)
     ✅ simulation_logs (0 rows - empty)
     ```

2. **SQL Editor - Voir les données**:
   ```sql
   SELECT id, nom, code, inscrits_total 
   FROM provinces 
   LIMIT 5;
   ```
   
   Résultat:
   ```
   | id | nom | code | inscrits_total |
   |----|-----|------|----------------|
   | ... | Kasai Central | KC | 1800000 |
   | ... | Kasai | KS | 2100000 |
   ...
   ```

---

## 🧪 Test de Connexion Depuis React

Créer un fichier: `src/pages/TestSupabase.tsx`

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabase';

export default function TestSupabase() {
  const [provinces, setProvinces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const test = async () => {
      try {
        console.log('🔄 Connecting to Supabase...');
        
        const { data, error: err } = await supabase
          .from('provinces')
          .select('*')
          .limit(5);

        if (err) throw err;

        console.log('✅ Connected! Data:', data);
        setProvinces(data);
      } catch (err: any) {
        console.error('❌ Error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    test();
  }, []);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Supabase Connection Test</h1>
      
      {loading && (
        <div className="text-blue-600">⏳ Connecting...</div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          ❌ Error: {error}
        </div>
      )}

      {provinces.length > 0 && (
        <div className="bg-green-100 border border-green-400 p-4 rounded">
          <h2 className="text-xl font-bold text-green-700 mb-4">
            ✅ Connected! Got {provinces.length} provinces
          </h2>
          <div className="space-y-2">
            {provinces.map((p) => (
              <div key={p.id} className="bg-white p-3 rounded border">
                <strong>{p.nom}</strong> ({p.code}) - {p.inscrits_total?.toLocaleString()} inscrits
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Pour tester**:
```bash
npm run dev
# Puis visiter: http://localhost:5173/test-supabase
```

---

## 🚀 Prochaines Étapes Après Setup

### Étape 1: Real-time (Enable dans Dashboard)
```
1. Supabase Dashboard → Settings → Real-time
2. Toggle ON pour:
   - anomalies
   - predictions
   - simulation_logs
3. Save
```

### Étape 2: Edge Functions (Créer API)
```bash
# CLI
supabase functions new simulate
supabase functions new detect-anomalies
supabase functions new export-report
```

### Étape 3: Authentication (Optionnel)
```
1. Dashboard → Authentication → Providers
2. Enable "Email" ou GitHub
3. Configure redirects
```

---

## 📚 SQL Cheat Sheet

### Insérer une anomalie
```sql
INSERT INTO anomalies (
  resultat_id, 
  province_id, 
  type_anomalie, 
  gravite, 
  z_score
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '660e8400-e29b-41d4-a716-446655440000',
  'zscore_participation',
  'critique',
  3.2
);
```

### Récupérer anomalies critiques
```sql
SELECT id, type_anomalie, gravite, timestamp_detection
FROM anomalies
WHERE gravite = 'critique'
ORDER BY timestamp_detection DESC;
```

### Compter anomalies par province
```sql
SELECT 
  p.nom,
  COUNT(a.id) as anomalies_count
FROM anomalies a
JOIN provinces p ON a.province_id = p.id
GROUP BY p.id, p.nom
ORDER BY anomalies_count DESC;
```

### Récupérer prédictions avec confiance > 80%
```sql
SELECT id, province_id, participation_predite, confiance
FROM predictions
WHERE confiance > 0.80
ORDER BY timestamp_prediction DESC;
```

---

## ⚠️ Points Importants

1. **Ne JAMAIS** partager `SUPABASE_SERVICE_ROLE_KEY`
2. **Garder** `VITE_SUPABASE_ANON_KEY` dans `.env.local`
3. **RLS** est activé pour sécurité
4. **Indexes** améliorent les performances
5. **JSONB** pour données flexibles (voix_predites)

---

## 🆘 Si Erreur: "row-level security policy"

```
Error: new row violates row-level security policy

Solution:
1. Vérifier que vous êtes authentifié (si INSERT)
2. Vérifier que la policy existe:
   SELECT * FROM pg_policies;
3. Recréer la policy si manquante
```

---

**Status**: ✅ All SQL Scripts Ready  
**Total Scripts**: 8  
**Execution Time**: ~5-10 minutes  
**Next**: Edge Functions Setup
