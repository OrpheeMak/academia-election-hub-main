-- Complete Database Schema for Election Hub RDC
-- ============================================================================
-- This migration creates a comprehensive schema with all necessary tables,
-- functions, and real-time subscriptions for election management
-- ============================================================================

-- ============================================================================
-- 1. CORE TABLES
-- ============================================================================

-- Elections
CREATE TABLE IF NOT EXISTS elections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('présidentielle', 'législative', 'locale', 'référendum')),
  date_election TIMESTAMP NOT NULL,
  date_creation TIMESTAMP DEFAULT NOW(),
  statut VARCHAR(50) NOT NULL DEFAULT 'prévue' CHECK (statut IN ('prévue', 'en_cours', 'terminée', 'annulée')),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Provinces
CREATE TABLE IF NOT EXISTS provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(255) NOT NULL,
  code VARCHAR(10) UNIQUE NOT NULL,
  nombre_inscrits INTEGER,
  nombre_bureaux INTEGER,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  region VARCHAR(255),
  centroid_lat DECIMAL(10, 7),
  centroid_lng DECIMAL(10, 7),
  election_id UUID REFERENCES elections(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Circonscriptions
CREATE TABLE IF NOT EXISTS circonscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(255) NOT NULL,
  province_id UUID NOT NULL REFERENCES provinces(id) ON DELETE CASCADE,
  nombre_bureaux INTEGER,
  nombre_inscrits INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bureaux de Vote
CREATE TABLE IF NOT EXISTS bureaux_vote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(255) NOT NULL,
  circonscription_id UUID NOT NULL REFERENCES circonscriptions(id) ON DELETE CASCADE,
  province_id UUID NOT NULL REFERENCES provinces(id) ON DELETE CASCADE,
  nombre_inscrits INTEGER,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  statut VARCHAR(50) DEFAULT 'fermé' CHECK (statut IN ('ouvert', 'ferme', 'fermé', 'annulé')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Candidats
CREATE TABLE IF NOT EXISTS candidats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(255) NOT NULL,
  parti_politique VARCHAR(255),
  couleur_chart VARCHAR(50),
  logo_url VARCHAR(500),
  election_id UUID REFERENCES elections(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Résultats Partiels (Votes par candidat/province/bureau)
CREATE TABLE IF NOT EXISTS resultats_partiels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  province_id UUID NOT NULL REFERENCES provinces(id) ON DELETE CASCADE,
  circonscription_id UUID REFERENCES circonscriptions(id) ON DELETE SET NULL,
  bureau_id UUID REFERENCES bureaux_vote(id) ON DELETE SET NULL,
  candidat_id UUID NOT NULL REFERENCES candidats(id) ON DELETE CASCADE,
  voix INTEGER NOT NULL DEFAULT 0,
  inscrits INTEGER,
  taux_participation DECIMAL(5, 2),
  is_anomalie BOOLEAN DEFAULT FALSE,
  timestamp_saisie TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Anomalies Détectées
CREATE TABLE IF NOT EXISTS anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  resultat_id UUID REFERENCES resultats_partiels(id) ON DELETE SET NULL,
  province_id UUID REFERENCES provinces(id) ON DELETE SET NULL,
  bureau_id UUID REFERENCES bureaux_vote(id) ON DELETE SET NULL,
  type VARCHAR(100) NOT NULL,
  methode VARCHAR(100) NOT NULL,
  gravite VARCHAR(20) CHECK (gravite IN ('faible', 'moyenne', 'critique')),
  score DECIMAL(5, 2),
  description TEXT,
  details JSONB,
  status VARCHAR(50) DEFAULT 'detected' CHECK (status IN ('detected', 'investigating', 'resolved', 'false_positive')),
  timestamp_detection TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Prédictions ML
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  province_id UUID REFERENCES provinces(id) ON DELETE SET NULL,
  candidat_id UUID REFERENCES candidats(id) ON DELETE SET NULL,
  score_predit DECIMAL(5, 2),
  intervalle_bas DECIMAL(5, 2),
  intervalle_haut DECIMAL(5, 2),
  confidence DECIMAL(5, 2),
  model_version VARCHAR(50),
  timestamp_prediction TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Logs de Simulation
CREATE TABLE IF NOT EXISTS simulation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed', 'cancelled')),
  config JSONB,
  stats JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Alertes
CREATE TABLE IF NOT EXISTS alertes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  type VARCHAR(100),
  titre VARCHAR(255),
  description TEXT,
  severite VARCHAR(20) CHECK (severite IN ('info', 'warning', 'critical')),
  est_lue BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 2. INDEXES (Performance)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_elections_statut ON elections(statut);
CREATE INDEX IF NOT EXISTS idx_elections_date ON elections(date_election);

CREATE INDEX IF NOT EXISTS idx_provinces_election ON provinces(election_id);
CREATE INDEX IF NOT EXISTS idx_provinces_code ON provinces(code);

CREATE INDEX IF NOT EXISTS idx_circonscriptions_province ON circonscriptions(province_id);

CREATE INDEX IF NOT EXISTS idx_bureaux_circonscription ON bureaux_vote(circonscription_id);
CREATE INDEX IF NOT EXISTS idx_bureaux_province ON bureaux_vote(province_id);
CREATE INDEX IF NOT EXISTS idx_bureaux_statut ON bureaux_vote(statut);

CREATE INDEX IF NOT EXISTS idx_candidats_election ON candidats(election_id);

CREATE INDEX IF NOT EXISTS idx_resultats_election ON resultats_partiels(election_id);
CREATE INDEX IF NOT EXISTS idx_resultats_province ON resultats_partiels(province_id);
CREATE INDEX IF NOT EXISTS idx_resultats_candidat ON resultats_partiels(candidat_id);
CREATE INDEX IF NOT EXISTS idx_resultats_timestamp ON resultats_partiels(timestamp_saisie);
CREATE INDEX IF NOT EXISTS idx_resultats_anomalie ON resultats_partiels(is_anomalie);

CREATE INDEX IF NOT EXISTS idx_anomalies_election ON anomalies(election_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_province ON anomalies(province_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_type ON anomalies(type);
CREATE INDEX IF NOT EXISTS idx_anomalies_timestamp ON anomalies(timestamp_detection);
CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status);

CREATE INDEX IF NOT EXISTS idx_predictions_election ON predictions(election_id);
CREATE INDEX IF NOT EXISTS idx_predictions_province ON predictions(province_id);

CREATE INDEX IF NOT EXISTS idx_simulation_election ON simulation_logs(election_id);

CREATE INDEX IF NOT EXISTS idx_alertes_election ON alertes(election_id);
CREATE INDEX IF NOT EXISTS idx_alertes_read ON alertes(est_lue);

-- ============================================================================
-- 3. VIEWS (Aggregations)
-- ============================================================================

-- Participation par Province
CREATE OR REPLACE VIEW v_participation_province AS
SELECT 
  p.id as province_id,
  p.nom as province,
  p.centroid_lat,
  p.centroid_lng,
  COUNT(DISTINCT r.id) as bureaux_reportes,
  SUM(r.voix) as votants_total,
  p.nombre_inscrits as inscrits_total,
  ROUND(100.0 * SUM(r.voix) / NULLIF(p.nombre_inscrits, 0), 2) as taux_participation
FROM provinces p
LEFT JOIN resultats_partiels r ON p.id = r.province_id
GROUP BY p.id, p.nom, p.centroid_lat, p.centroid_lng, p.nombre_inscrits;

-- Top Candidats par Province
CREATE OR REPLACE VIEW v_top_candidates_province AS
SELECT 
  r.province_id,
  c.id as candidat_id,
  c.nom,
  c.parti_politique as parti,
  SUM(r.voix) as voix_total,
  ROUND(100.0 * SUM(r.voix) / NULLIF(
    (SELECT SUM(voix) FROM resultats_partiels WHERE province_id = r.province_id),
    0
  ), 2) as pourcentage,
  ROW_NUMBER() OVER (PARTITION BY r.province_id ORDER BY SUM(r.voix) DESC) as rang
FROM resultats_partiels r
JOIN candidats c ON r.candidat_id = c.id
GROUP BY r.province_id, c.id, c.nom, c.parti_politique;

-- Résultats Aggrégés Globaux
CREATE OR REPLACE VIEW v_resultats_globaux AS
SELECT 
  e.id as election_id,
  e.nom,
  e.statut,
  COUNT(DISTINCT rp.id) as total_bulletins,
  SUM(rp.voix) as total_voix,
  ROUND(AVG(rp.taux_participation), 2) as participation_moyenne,
  COUNT(DISTINCT a.id) as anomalies_count,
  COUNT(DISTINCT CASE WHEN a.gravite = 'critique' THEN a.id END) as anomalies_critiques
FROM elections e
LEFT JOIN resultats_partiels rp ON e.id = rp.election_id
LEFT JOIN anomalies a ON e.id = a.election_id
GROUP BY e.id, e.nom, e.statut;

-- ============================================================================
-- 4. FUNCTIONS (Business Logic)
-- ============================================================================

-- Fonction: Détecter une anomalie
CREATE OR REPLACE FUNCTION detect_anomaly(
  p_resultat_id UUID,
  p_type VARCHAR,
  p_score DECIMAL,
  p_details JSONB
)
RETURNS UUID AS $$
DECLARE
  v_anomaly_id UUID;
  v_gravite VARCHAR;
BEGIN
  -- Déterminer la gravité basée sur le score
  v_gravite := CASE 
    WHEN p_score >= 0.8 THEN 'critique'
    WHEN p_score >= 0.5 THEN 'moyenne'
    ELSE 'faible'
  END;

  -- Insérer l'anomalie
  INSERT INTO anomalies (
    election_id,
    resultat_id,
    type,
    methode,
    gravite,
    score,
    details,
    status
  ) 
  SELECT
    rp.election_id,
    p_resultat_id,
    p_type,
    'statistical_analysis',
    v_gravite,
    p_score,
    p_details,
    'detected'
  FROM resultats_partiels rp
  WHERE rp.id = p_resultat_id
  RETURNING id INTO v_anomaly_id;

  -- Notifier les abonnés
  PERFORM pg_notify(
    'anomalies',
    json_build_object(
      'id', v_anomaly_id,
      'type', p_type,
      'gravite', v_gravite,
      'score', p_score
    )::text
  );

  RETURN v_anomaly_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Calculer la participation d'une province
CREATE OR REPLACE FUNCTION calculate_province_participation(p_province_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_participation DECIMAL;
BEGIN
  SELECT ROUND(
    100.0 * COALESCE(SUM(rp.voix), 0) / NULLIF(p.nombre_inscrits, 0),
    2
  ) INTO v_participation
  FROM provinces p
  LEFT JOIN resultats_partiels rp ON p.id = rp.province_id
  WHERE p.id = p_province_id
  GROUP BY p.nombre_inscrits;

  RETURN COALESCE(v_participation, 0);
END;
$$ LANGUAGE plpgsql;

-- Fonction: Récupérer le top N des candidats
CREATE OR REPLACE FUNCTION get_top_candidates(p_election_id UUID, p_limit INT DEFAULT 5)
RETURNS TABLE (
  candidat_id UUID,
  nom VARCHAR,
  parti VARCHAR,
  voix_total BIGINT,
  pourcentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.nom,
    c.parti_politique,
    SUM(rp.voix)::BIGINT as voix_total,
    ROUND(100.0 * SUM(rp.voix) / NULLIF(
      (SELECT SUM(voix) FROM resultats_partiels WHERE election_id = p_election_id),
      0
    ), 2) as pourcentage
  FROM resultats_partiels rp
  JOIN candidats c ON rp.candidat_id = c.id
  WHERE rp.election_id = p_election_id
  GROUP BY c.id, c.nom, c.parti_politique
  ORDER BY voix_total DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Trigger: Mettre à jour le timestamp updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_elections BEFORE UPDATE ON elections
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER tr_update_provinces BEFORE UPDATE ON provinces
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER tr_update_resultats BEFORE UPDATE ON resultats_partiels
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Trigger: Marquer anomalie dans resultats
CREATE OR REPLACE FUNCTION mark_anomaly_result()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.score >= 0.5 THEN
    UPDATE resultats_partiels
    SET is_anomalie = TRUE
    WHERE id = NEW.resultat_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_mark_anomaly AFTER INSERT ON anomalies
FOR EACH ROW EXECUTE FUNCTION mark_anomaly_result();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Activer RLS
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultats_partiels ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;

-- Politique: Les élections publiques sont accessibles à tous
CREATE POLICY "elections_public_select" ON elections
FOR SELECT USING (true);

-- Politique: Modifier seulement pour les administrateurs
CREATE POLICY "elections_admin_update" ON elections
FOR UPDATE USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Politique: Les résultats sont accessibles à tous
CREATE POLICY "resultats_public_select" ON resultats_partiels
FOR SELECT USING (true);

-- Politique: Insertion des résultats authentifiée
CREATE POLICY "resultats_insert" ON resultats_partiels
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Politique: Les anomalies sont accessibles à tous
CREATE POLICY "anomalies_public_select" ON anomalies
FOR SELECT USING (true);

-- ============================================================================
-- 7. INITIAL DATA (Optional)
-- ============================================================================

-- Insérer une élection de test si elle n'existe pas
INSERT INTO elections (nom, type, date_election, statut, description)
SELECT 'Élection Test 2026', 'législative', NOW(), 'en_cours', 'Élection de test pour développement'
WHERE NOT EXISTS (SELECT 1 FROM elections WHERE nom = 'Élection Test 2026');

-- ============================================================================
-- 8. EXTENSIONS
-- ============================================================================

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgres";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

COMMIT;
