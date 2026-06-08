-- Migration: Complete RLS & Advanced Features
-- ============================================================================
-- Ajoute les politiques de sécurité, les rôles utilisateur et les fonctions avancées
-- ============================================================================

-- ============================================================================
-- 1. ROLE MANAGEMENT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  app_role VARCHAR(50) NOT NULL CHECK (app_role IN ('admin', 'moderator', 'observer', 'user')),
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, app_role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_app_role ON user_roles(app_role);

-- ============================================================================
-- 2. SECURITY FUNCTION: has_role
-- ============================================================================

CREATE OR REPLACE FUNCTION has_role(
  p_user_id UUID,
  p_app_role VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id
    AND app_role = p_app_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant public access to has_role function
GRANT EXECUTE ON FUNCTION has_role(UUID, VARCHAR) TO anon, authenticated;

-- ============================================================================
-- 3. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE circonscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bureaux_vote ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidats ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultats_partiels ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROVINCES: Public read, admin write
-- ============================================================================

CREATE POLICY "Provinces: Allow public read" ON provinces
FOR SELECT USING (true);

CREATE POLICY "Provinces: Allow admin write" ON provinces
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Provinces: Allow admin update" ON provinces
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin')
) WITH CHECK (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Provinces: Allow admin delete" ON provinces
FOR DELETE USING (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin')
);

-- ============================================================================
-- CIRCONSCRIPTIONS: Public read, admin write
-- ============================================================================

CREATE POLICY "Circonscriptions: Allow public read" ON circonscriptions
FOR SELECT USING (true);

CREATE POLICY "Circonscriptions: Allow admin write" ON circonscriptions
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Circonscriptions: Allow admin update" ON circonscriptions
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Circonscriptions: Allow admin delete" ON circonscriptions
FOR DELETE USING (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin')
);

-- ============================================================================
-- BUREAUX_VOTE: Public read, admin write
-- ============================================================================

CREATE POLICY "Bureaux vote: Allow public read" ON bureaux_vote
FOR SELECT USING (true);

CREATE POLICY "Bureaux vote: Allow admin write" ON bureaux_vote
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin')
);

-- ============================================================================
-- CANDIDATS: Public read, admin write
-- ============================================================================

CREATE POLICY "Candidats: Allow public read" ON candidats
FOR SELECT USING (true);

CREATE POLICY "Candidats: Allow admin write" ON candidats
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin')
);

-- ============================================================================
-- RESULTATS_PARTIELS: Public read (anonymized if needed), admin/moderator write
-- ============================================================================

CREATE POLICY "Résultats: Allow public read" ON resultats_partiels
FOR SELECT USING (true);

CREATE POLICY "Résultats: Allow moderator insert" ON resultats_partiels
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'moderator')
  )
);

CREATE POLICY "Résultats: Allow moderator update" ON resultats_partiels
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'moderator')
  )
);

-- ============================================================================
-- ANOMALIES: Public read, admin/moderator write
-- ============================================================================

CREATE POLICY "Anomalies: Allow public read" ON anomalies
FOR SELECT USING (true);

CREATE POLICY "Anomalies: Allow admin insert" ON anomalies
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Anomalies: Allow admin update" ON anomalies
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin')
);

-- ============================================================================
-- PREDICTIONS: Public read, admin write
-- ============================================================================

CREATE POLICY "Prédictions: Allow public read" ON predictions
FOR SELECT USING (true);

CREATE POLICY "Prédictions: Allow admin write" ON predictions
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin')
);

-- ============================================================================
-- ELECTIONS: Public read, admin write
-- ============================================================================

CREATE POLICY "Élections: Allow public read" ON elections
FOR SELECT USING (true);

CREATE POLICY "Élections: Allow admin write" ON elections
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin')
);

-- ============================================================================
-- USER_ROLES: Users can read own roles, admin can manage
-- ============================================================================

CREATE POLICY "User roles: Allow users read own" ON user_roles
FOR SELECT USING (
  auth.uid() = user_id OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "User roles: Allow admin write" ON user_roles
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin')
);

-- ============================================================================
-- 4. ADVANCED FUNCTIONS
-- ============================================================================

-- Fonction: Calculer l'IQR d'une province
CREATE OR REPLACE FUNCTION calculate_iqr_participation(
  p_province_id UUID
)
RETURNS TABLE (
  q1 DECIMAL,
  q2 DECIMAL,
  q3 DECIMAL,
  iqr DECIMAL,
  lower_bound DECIMAL,
  upper_bound DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH sorted_rates AS (
    SELECT taux_participation as rate
    FROM resultats_partiels
    WHERE province_id = p_province_id
    AND taux_participation IS NOT NULL
    ORDER BY taux_participation
  ),
  quartiles AS (
    SELECT
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY rate) as q1,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY rate) as q2,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY rate) as q3
    FROM sorted_rates
  )
  SELECT
    q1,
    q2,
    q3,
    q3 - q1 as iqr,
    q1 - 1.5 * (q3 - q1) as lower,
    q3 + 1.5 * (q3 - q1) as upper
  FROM quartiles;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Détecter anomalies de participation
CREATE OR REPLACE FUNCTION detect_participation_anomalies(
  p_election_id UUID
)
RETURNS TABLE (
  bureau_id UUID,
  province_id UUID,
  taux DECIMAL,
  severity VARCHAR,
  method VARCHAR,
  details JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH bureau_rates AS (
    SELECT 
      b.id,
      b.province_id,
      r.taux_participation,
      AVG(r.taux_participation) OVER (PARTITION BY r.province_id) as avg_rate,
      STDDEV(r.taux_participation) OVER (PARTITION BY r.province_id) as stddev_rate
    FROM resultats_partiels r
    JOIN bureaux_vote b ON r.bureau_id = b.id
    WHERE r.election_id = p_election_id
  )
  SELECT
    id,
    province_id,
    taux_participation,
    CASE 
      WHEN ABS((taux_participation - avg_rate) / NULLIF(stddev_rate, 0)) > 3 THEN 'critical'
      WHEN ABS((taux_participation - avg_rate) / NULLIF(stddev_rate, 0)) > 2.5 THEN 'high'
      ELSE 'medium'
    END,
    'zscore',
    jsonb_build_object(
      'zscore', ROUND(((taux_participation - avg_rate) / NULLIF(stddev_rate, 0))::numeric, 2),
      'avg', ROUND(avg_rate::numeric, 2),
      'stddev', ROUND(stddev_rate::numeric, 2)
    )
  FROM bureau_rates
  WHERE stddev_rate > 0
  AND ABS((taux_participation - avg_rate) / NULLIF(stddev_rate, 0)) >= 2.5;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Log automatique des anomalies détectées
CREATE OR REPLACE FUNCTION log_detected_anomalies()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_anomalie THEN
    INSERT INTO anomalies (
      election_id,
      resultat_id,
      province_id,
      bureau_id,
      type,
      methode,
      score,
      details,
      status
    ) VALUES (
      NEW.election_id,
      NEW.id,
      NEW.province_id,
      NEW.bureau_id,
      'participation_anomaly',
      'automatic_detection',
      0.5,
      jsonb_build_object('taux', NEW.taux_participation),
      'detected'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Détecter et log les anomalies automatiquement
CREATE TRIGGER tr_detect_anomalies
AFTER INSERT OR UPDATE ON resultats_partiels
FOR EACH ROW
EXECUTE FUNCTION log_detected_anomalies();

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON provinces TO anon, authenticated;
GRANT SELECT ON circonscriptions TO anon, authenticated;
GRANT SELECT ON bureaux_vote TO anon, authenticated;
GRANT SELECT ON candidats TO anon, authenticated;
GRANT SELECT ON resultats_partiels TO anon, authenticated;
GRANT SELECT ON anomalies TO anon, authenticated;
GRANT SELECT ON predictions TO anon, authenticated;
GRANT SELECT ON elections TO anon, authenticated;

GRANT EXECUTE ON FUNCTION calculate_iqr_participation(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION detect_participation_anomalies(UUID) TO anon, authenticated;
