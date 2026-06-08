# 🚀 SUPABASE SETUP GUIDE - Liaison Complète du Projet

**Date**: 2026-05-31  
**Status**: ✅ Step-by-Step Guide  

---

## 📋 Table des matières
1. [Setup Supabase Account](#setup-supabase-account)
2. [Créer un Projet Supabase](#créer-un-projet-supabase)
3. [Lier le Projet Local](#lier-le-projet-local)
4. [Créer les Tables](#créer-les-tables)
5. [Configurer RLS & Authentification](#configurer-rls--authentification)
6. [Tester la Connexion](#tester-la-connexion)

---

## 🔐 STEP 1: Setup Supabase Account

### 1.1 Créer un compte Supabase
```
1. Aller à: https://supabase.com
2. Cliquer sur "Start your project"
3. S'authentifier avec:
   - GitHub (recommandé)
   - Google
   - Email
4. Confirmer l'email si nécessaire
```

### 1.2 Points clés
```
✅ Compte créé
✅ Email confirmé
✅ Prêt pour créer un projet
```

---

## 🏗️ STEP 2: Créer un Projet Supabase

### 2.1 Depuis le Dashboard Supabase
```
1. Aller à: https://app.supabase.com
2. Cliquer sur "New Project" (ou le + icon)
3. Sélectionner votre Organisation
4. Remplir les détails:
   - Project Name: "academia-election-hub"
   - Database Password: [GÉNÉRER UN BON PASSWORD]
   - Region: [Sélectionner le plus proche de votre région]
     Exemple: Europe (si vous êtes en Europe)
```

### 2.2 Configuration Recommandée
```
Project Name: academia-election-hub
Database: PostgreSQL
Region: Frankfurt (EU-Central)  ou votre région
Pricing Plan: Free (pour commencer)
```

### 2.3 Attendre le déploiement
```
⏳ Supabase déploie le serveur PostgreSQL
⏳ Création du projet (~2-3 minutes)
✅ Projet créé - Vous recevez un email de confirmation
```

### 2.4 Accéder au Dashboard du Projet
```
Après déploiement:
1. Vous êtes redirigé vers le Dashboard
2. URL: https://app.supabase.com/project/[PROJECT_ID]
3. Vous verrez le menu latéral avec:
   - SQL Editor
   - Table Editor
   - Auth
   - Storage
   - Real Time
   - Etc.
```

---

## 🔗 STEP 3: Lier le Projet Local

### 3.1 Récupérer les Credentials

**Dans le Dashboard Supabase**:
```
1. Aller à: Settings → API
2. Vous verrez:
   - Project URL
   - Anon Public Key
   - Service Role Secret Key (ne pas partager!)
3. Copier:
   - SUPABASE_URL = Project URL
   - SUPABASE_ANON_KEY = Anon Public Key
```

**Exemple** (NE PAS utiliser ces vrais credentials):
```
SUPABASE_URL=https://abc123defg.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3.2 Configurer le .env.local

**Fichier**: `d:\Projet\academia-election-hub-main\.env.local`

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE

# Backend (server-side only)
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

**Exemple complet**:
```env
# Supabase (Public - safe to share)
VITE_SUPABASE_URL=https://xyzabc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiYyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjI2MTAwMDAwLCJleHAiOjE5MzE2ODAwMDB9

# Backend only - NE PAS partager!
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiYyIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2MjYxMDAwMDAsImV4cCI6MTkzMTY4MDAwMH0
```

### 3.3 Vérifier dans le code existant

**Fichier**: `src/config/supabase.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

✅ **Déjà configuré correctement!**

---

## 📊 STEP 4: Créer les Tables

### 4.1 Accéder à l'SQL Editor

**Dans Supabase Dashboard**:
```
1. Menu latéral → SQL Editor
2. Cliquer sur "+ New Query"
3. Vous avez un éditeur SQL
```

### 4.2 Script Complet - Exécuter dans l'ordre

**Copier-coller chaque script un par un** dans SQL Editor et cliquer "Run"

#### TABLE 1: provinces
```sql
-- Table 1: Provinces de la RDC
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

-- Index
CREATE INDEX idx_provinces_code ON provinces(code);
CREATE INDEX idx_provinces_nom ON provinces(nom);

-- Comment
COMMENT ON TABLE provinces IS 'Provinces de la RDC avec données géographiques et électorales';
```

**Vérification**: Devrait voir ✅ "Success"

---

#### TABLE 2: resultats_partiels
```sql
-- Table 2: Résultats partiels par province/circonscription
CREATE TABLE resultats_partiels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id UUID REFERENCES provinces(id) ON DELETE CASCADE,
  circonscription_id UUID,
  candidat_id UUID,
  
  -- Données électorales
  voix INTEGER NOT NULL DEFAULT 0,
  inscrits INTEGER NOT NULL,
  taux_participation DECIMAL(5, 2) DEFAULT 0,
  
  -- Timestamps
  timestamp_saisie TIMESTAMP DEFAULT NOW(),
  is_anomalie BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_resultats_province ON resultats_partiels(province_id);
CREATE INDEX idx_resultats_timestamp ON resultats_partiels(timestamp_saisie);
CREATE INDEX idx_resultats_anomalie ON resultats_partiels(is_anomalie);
CREATE INDEX idx_resultats_candidat ON resultats_partiels(candidat_id);

-- Comment
COMMENT ON TABLE resultats_partiels IS 'Résultats partiels électoraux avec anomalies détectées';
```

**Vérification**: ✅ "Success"

---

#### TABLE 3: anomalies
```sql
-- Table 3: Anomalies détectées
CREATE TABLE anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resultat_id UUID REFERENCES resultats_partiels(id) ON DELETE CASCADE,
  province_id UUID REFERENCES provinces(id) ON DELETE CASCADE,
  
  -- Type et sévérité
  type_anomalie VARCHAR(100) NOT NULL,
  gravite VARCHAR(20) NOT NULL DEFAULT 'faible',
  CHECK (gravite IN ('faible', 'moyenne', 'critique')),
  
  -- Description et données
  description TEXT,
  valeur_observee DECIMAL(10, 2),
  valeur_attendue DECIMAL(10, 2),
  z_score DECIMAL(5, 2),
  
  -- Statut
  est_lue BOOLEAN DEFAULT FALSE,
  timestamp_detection TIMESTAMP DEFAULT NOW(),
  timestamp_validation TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_anomalies_province ON anomalies(province_id);
CREATE INDEX idx_anomalies_gravite ON anomalies(gravite);
CREATE INDEX idx_anomalies_est_lue ON anomalies(est_lue);
CREATE INDEX idx_anomalies_type ON anomalies(type_anomalie);
CREATE INDEX idx_anomalies_timestamp ON anomalies(timestamp_detection);

-- Comment
COMMENT ON TABLE anomalies IS 'Anomalies détectées avec type, sévérité et statistiques';
```

**Vérification**: ✅ "Success"

---

#### TABLE 4: predictions
```sql
-- Table 4: Prédictions ML
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id UUID REFERENCES provinces(id) ON DELETE CASCADE,
  
  -- Modèle
  model_version VARCHAR(50) NOT NULL,
  
  -- Prédictions
  participation_predite DECIMAL(5, 2),
  voix_predites JSONB, -- {"candidat_id": voix, ...}
  confiance DECIMAL(3, 2) NOT NULL, -- 0-1
  
  -- Timestamps
  timestamp_prediction TIMESTAMP DEFAULT NOW(),
  timestamp_validation TIMESTAMP,
  is_accurate BOOLEAN,
  mape DECIMAL(5, 2), -- Mean Absolute Percentage Error
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_predictions_province ON predictions(province_id);
CREATE INDEX idx_predictions_model ON predictions(model_version);
CREATE INDEX idx_predictions_timestamp ON predictions(timestamp_prediction);

-- Comment
COMMENT ON TABLE predictions IS 'Prédictions du modèle ML avec accuracy tracking';
```

**Vérification**: ✅ "Success"

---

#### TABLE 5: simulation_logs
```sql
-- Table 5: Logs de simulation temps réel
CREATE TABLE simulation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id VARCHAR(50) NOT NULL,
  province_id UUID REFERENCES provinces(id) ON DELETE CASCADE,
  
  -- État de la simulation
  step INTEGER NOT NULL,
  state JSONB NOT NULL, -- État complet de la simulation
  
  -- Timestamps
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_simulation_logs_simulation ON simulation_logs(simulation_id);
CREATE INDEX idx_simulation_logs_province ON simulation_logs(province_id);
CREATE INDEX idx_simulation_logs_timestamp ON simulation_logs(timestamp);

-- Comment
COMMENT ON TABLE simulation_logs IS 'Logs de simulation temps réel - Stockage d''état complet';
```

**Vérification**: ✅ "Success"

---

### 4.3 Vérifier les Tables Créées

**Dans Supabase Dashboard**:
```
1. Menu latéral → Table Editor
2. Vous devriez voir:
   ✅ provinces
   ✅ resultats_partiels
   ✅ anomalies
   ✅ predictions
   ✅ simulation_logs
```

---

## 🔒 STEP 5: Configurer RLS & Authentification

### 5.1 Enable Row Level Security (RLS)

**Pour chaque table, exécuter dans SQL Editor**:

```sql
-- Enable RLS on all tables
ALTER TABLE provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultats_partiels ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_logs ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view)
CREATE POLICY "Allow public read on provinces"
  ON provinces FOR SELECT USING (true);

CREATE POLICY "Allow public read on resultats_partiels"
  ON resultats_partiels FOR SELECT USING (true);

CREATE POLICY "Allow public read on predictions"
  ON predictions FOR SELECT USING (true);

CREATE POLICY "Allow public read on anomalies"
  ON anomalies FOR SELECT USING (true);

-- Authenticated can insert
CREATE POLICY "Allow authenticated insert on resultats_partiels"
  ON resultats_partiels FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert on anomalies"
  ON anomalies FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated insert on predictions"
  ON predictions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

**Vérification**: ✅ "Success"

### 5.2 Vérifier dans l'UI

```
1. Table Editor → Sélectionner une table
2. Cliquer sur l'onglet "Policies"
3. Vous devriez voir les policies créées
```

---

## 🌍 STEP 6: Insérer les Données Initiales (Provinces)

```sql
-- Insérer les provinces de la RDC
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

**Vérification**: 
```
Affiche: "19 rows inserted"
✅ Les provinces sont maintenant dans la DB
```

---

## 🧪 STEP 7: Tester la Connexion

### 7.1 Test Simple - React Component

**Créer fichier**: `src/pages/TestSupabase.tsx`

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabase';

export default function TestSupabase() {
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const { data, error } = await supabase
          .from('provinces')
          .select('*')
          .limit(5);

        if (error) throw error;
        
        setProvinces(data);
        console.log('✅ Supabase Connected!', data);
      } catch (err) {
        setError(err.message);
        console.error('❌ Supabase Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProvinces();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">Error: {error}</p>}
      
      {provinces.length > 0 && (
        <div>
          <p className="text-green-600 font-bold mb-4">✅ Connected!</p>
          <ul>
            {provinces.map(province => (
              <li key={province.id} className="mb-2">
                {province.nom} ({province.code})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### 7.2 Ajouter à Routes

**Fichier**: `src/App.tsx`

```typescript
import TestSupabase from "./pages/TestSupabase";

// Dans Routes:
<Route path="/test-supabase" element={<TestSupabase />} />
```

### 7.3 Tester dans le navigateur

```bash
# Start dev server
npm run dev

# Visiter:
http://localhost:5173/test-supabase

# Vous devriez voir:
✅ Connected!
- Kasai Central (KC)
- Kasai (KS)
- ... (les 19 provinces)
```

**Si ✅ Connecté**: Tout fonctionne!  
**Si ❌ Erreur**: Vérifier .env.local

---

## 🔄 STEP 8: Configurer Real-time

### 8.1 Enable Real-time en Dashboard

**Dans Supabase Dashboard**:
```
1. Settings → Real-time
2. Enable les tables:
   ✅ anomalies
   ✅ predictions
   ✅ simulation_logs
3. Save
```

### 8.2 Subscribe dans le Code

**Exemple - Anomalies Real-time**:

```typescript
import { useEffect } from 'react';
import { supabase } from '@/config/supabase';

export function useAnomaliesRealtime() {
  useEffect(() => {
    // Subscribe to anomalies changes
    const subscription = supabase
      .channel('anomalies')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // INSERT, UPDATE, DELETE, *
          schema: 'public',
          table: 'anomalies'
        },
        (payload) => {
          console.log('New anomaly detected:', payload.new);
          // Update UI here
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}
```

---

## 📝 STEP 9: Checkliste Finale

### ✅ Vérifier Chaque Étape

```
[x] Account Supabase créé
[x] Projet Supabase créé
[x] .env.local configuré (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
[x] 5 tables créées:
    [x] provinces
    [x] resultats_partiels
    [x] anomalies
    [x] predictions
    [x] simulation_logs
[x] Indexes créés sur toutes les tables
[x] RLS enabled sur les tables
[x] Policies créées
[x] Données de test insérées (19 provinces)
[x] Connection test réussi (/test-supabase)
[x] Real-time configuré
```

---

## 🐛 TROUBLESHOOTING

### Problème: Connection Error
```
Error: "Failed to connect to Supabase"

Solution:
1. Vérifier VITE_SUPABASE_URL dans .env.local
2. Vérifier VITE_SUPABASE_ANON_KEY
3. Redémarrer dev server: npm run dev
4. Clear browser cache (Ctrl+Shift+Delete)
```

### Problème: RLS Policy Issues
```
Error: "new row violates row-level security policy"

Solution:
1. Vérifier que RLS est bien configuré
2. Assurez-vous que la policy permet les lectures publiques
3. Pour les insertions, vérifier auth.role() = 'authenticated'
```

### Problème: Real-time Not Working
```
Error: "Subscriptions disabled"

Solution:
1. Dans Supabase Dashboard → Settings → Real-time
2. Activer Real-time pour les tables
3. Redémarrer l'application
```

### Problème: Table Not Found
```
Error: "relation "public.provinces" does not exist"

Solution:
1. Vérifier que les tables sont créées dans Table Editor
2. Exécuter les scripts SQL à nouveau
3. Vérifier qu'il n'y a pas d'erreur SQL
```

---

## 📚 Commandes Utiles

### Voir toutes les tables
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

### Voir la structure d'une table
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'provinces';
```

### Voir les indexes
```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename = 'provinces';
```

### Supprimer une table (danger!)
```sql
DROP TABLE IF EXISTS provinces CASCADE;
```

### Vider une table
```sql
TRUNCATE TABLE provinces CASCADE;
```

---

## 🎯 Prochaines Étapes

1. ✅ **Setup Supabase** (vous êtes ici)
2. **Créer Edge Functions** (pour API endpoints)
3. **Configurer Authentification** (Auth)
4. **Setup Realtime** (WebSocket)
5. **Déployer en Production**

---

## 📞 Resources

### Documentation Supabase Officielle
- https://supabase.com/docs

### Guides Rapides
- Getting Started: https://supabase.com/docs/guides/getting-started
- Database: https://supabase.com/docs/guides/database
- Real-time: https://supabase.com/docs/guides/realtime

### Client JS
- supabase-js: https://supabase.com/docs/reference/javascript/introduction

---

**Status**: ✅ SETUP COMPLETE  
**Next**: Edge Functions Setup  
**Time Invested**: ~30-45 min
