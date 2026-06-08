-- ============================================================================
-- SCHEMA COMPLET ACADEMIA ELECTION HUB
-- Base de données pour RDC Electoral Dashboard
-- Prototype académique - Données simulées
-- ============================================================================

-- 1. TABLE DES ÉLECTIONS
CREATE TABLE IF NOT EXISTS elections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  type TEXT CHECK (type IN ('présidentielle', 'législative', 'locale', 'référendum')),
  date_election DATE NOT NULL,
  date_creation TIMESTAMP DEFAULT NOW(),
  statut TEXT CHECK (statut IN ('prévue', 'en_cours', 'terminée', 'annulée')) DEFAULT 'prévue',
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. TABLE DES PROVINCES/CIRCONSCRIPTIONS
CREATE TABLE IF NOT EXISTS provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  nombre_inscrits INTEGER CHECK (nombre_inscrits >= 0),
  nombre_bureaux INTEGER CHECK (nombre_bureaux >= 0),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  region TEXT,
  election_id UUID REFERENCES elections(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. TABLE DES CANDIDATS
CREATE TABLE IF NOT EXISTS candidats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  parti_politique TEXT,
  couleur_chart TEXT,
  logo_url TEXT,
  election_id UUID REFERENCES elections(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(nom, election_id)
);

-- 4. TABLE DES BUREAUX DE VOTE
CREATE TABLE IF NOT EXISTS bureaux_vote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  province_id UUID REFERENCES provinces(id) ON DELETE CASCADE,
  nombre_inscrits INTEGER CHECK (nombre_inscrits >= 0),
  statut TEXT CHECK (statut IN ('ouvert', 'ferme', 'probleme_technique', 'non_ouvert')) DEFAULT 'ouvert',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. TABLE DES RÉSULTATS PARTIELS (TEMPS RÉEL)
CREATE TABLE IF NOT EXISTS resultats_partiels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP DEFAULT NOW(),
  province_id UUID REFERENCES provinces(id) ON DELETE CASCADE,
  candidat_id UUID REFERENCES candidats(id) ON DELETE CASCADE,
  voix INTEGER NOT NULL CHECK (voix >= 0),
  bureaux_depouilles INTEGER NOT NULL CHECK (bureaux_depouilles >= 0),
  total_bureaux INTEGER NOT NULL CHECK (total_bureaux >= 0),
  taux_participation DECIMAL(5,2) CHECK (taux_participation BETWEEN 0 AND 100),
  pourcentage_voix DECIMAL(5,2),
  is_anomalie BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. TABLE DES ANOMALIES DÉTECTÉES
CREATE TABLE IF NOT EXISTS anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resultat_id UUID REFERENCES resultats_partiels(id) ON DELETE CASCADE,
  province_id UUID REFERENCES provinces(id) ON DELETE CASCADE,
  type_anomalie TEXT CHECK (type_anomalie IN ('zscore', 'iqr', 'participation_incoherente', 'voix_superieures_inscrits', 'ecart_significatif')),
  description TEXT NOT NULL,
  gravite TEXT CHECK (gravite IN ('faible', 'moyenne', 'critique')) NOT NULL,
  valeur_detectee DECIMAL(10,2),
  seuil_declenchement DECIMAL(10,2),
  timestamp_detection TIMESTAMP DEFAULT NOW(),
  est_lue BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. TABLE DE CONFIGURATION DES SEUILS D'ANOMALIES
CREATE TABLE IF NOT EXISTS config_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parametre TEXT UNIQUE NOT NULL,
  valeur_seuil DECIMAL(10,2) NOT NULL,
  description TEXT,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. TABLE DES ALERTES/NOTIFICATIONS
CREATE TABLE IF NOT EXISTS alertes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anomalie_id UUID REFERENCES anomalies(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('info', 'warning', 'error', 'success')),
  est_lue BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 9. TABLE DES EXPORTS/TÉLÉCHARGEMENTS
CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  format TEXT CHECK (format IN ('pdf', 'csv', 'xlsx', 'json')),
  url_fichier TEXT,
  taille_octets INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- CRÉATION DES INDEXES POUR OPTIMISER LES PERFORMANCES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_resultats_timestamp ON resultats_partiels(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_resultats_province ON resultats_partiels(province_id);
CREATE INDEX IF NOT EXISTS idx_resultats_candidat ON resultats_partiels(candidat_id);
ALTER TABLE anomalies
ADD COLUMN IF NOT EXISTS gravite VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_anomalies_gravite ON anomalies(gravite);
CREATE INDEX IF NOT EXISTS idx_anomalies_timestamp ON anomalies(timestamp_detection DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_province ON anomalies(province_id);
CREATE INDEX IF NOT EXISTS idx_alertes_lue ON alertes(est_lue);
CREATE INDEX IF NOT EXISTS idx_provinces_election ON provinces(election_id);
CREATE INDEX IF NOT EXISTS idx_candidats_election ON candidats(election_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - POUR PROTOTYPE ACADÉMIQUE AVEC ACCÈS PUBLIC
-- ============================================================================

ALTER TABLE elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidats ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultats_partiels ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE bureaux_vote ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertes ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- Politiques de lecture publique (prototype académique)
CREATE POLICY "Lecture publique élections" ON elections FOR SELECT USING (true);
CREATE POLICY "Lecture publique provinces" ON provinces FOR SELECT USING (true);
CREATE POLICY "Lecture publique candidats" ON candidats FOR SELECT USING (true);
CREATE POLICY "Lecture publique résultats" ON resultats_partiels FOR SELECT USING (true);
CREATE POLICY "Lecture publique anomalies" ON anomalies FOR SELECT USING (true);
CREATE POLICY "Lecture publique bureaux" ON bureaux_vote FOR SELECT USING (true);
CREATE POLICY "Lecture publique alertes" ON alertes FOR SELECT USING (true);
CREATE POLICY "Lecture publique config" ON config_anomalies FOR SELECT USING (true);
CREATE POLICY "Lecture publique exports" ON exports FOR SELECT USING (true);

-- ============================================================================
-- DONNÉES D'INITIALISATION
-- ============================================================================

-- Insérer une élection test
INSERT INTO elections (nom, type, date_election, statut, description)
VALUES (
  'Présidentielle RDC 2023',
  'présidentielle',
  '2023-12-20',
  'en_cours',
  'Prototype académique - Données simulées'
) ON CONFLICT DO NOTHING;

-- Insérer les 26 provinces de la RDC
INSERT INTO provinces (nom, code, nombre_inscrits, nombre_bureaux, latitude, longitude, region, election_id)
SELECT 
  p.nom, p.code, p.nombre_inscrits, p.nombre_bureaux, p.latitude, p.longitude, p.region,
  (SELECT id FROM elections WHERE nom = 'Présidentielle RDC 2023' LIMIT 1)
FROM (
  VALUES
  ('Kinshasa', 'KIN', 8500000, 12000, -4.3276, 15.3136, 'Ouest'),
  ('Nord-Kivu', 'NK', 4200000, 6500, -1.2520, 29.2333, 'Est'),
  ('Sud-Kivu', 'SK', 3800000, 5800, -2.4833, 28.7500, 'Est'),
  ('Katanga', 'KAT', 5100000, 7800, -8.5000, 27.0000, 'Sud-Est'),
  ('Kasaï-Oriental', 'KO', 3600000, 5500, -5.9500, 23.6500, 'Centre'),
  ('Kasaï-Occidental', 'KOC', 2800000, 4200, -6.1333, 20.8333, 'Centre'),
  ('Tshopo', 'TSH', 2500000, 3800, 1.6333, 25.1833, 'Nord'),
  ('Ituri', 'ITU', 2100000, 3200, 1.3333, 30.5333, 'Nord-Est'),
  ('Nord-Ubangi', 'NU', 1900000, 2900, 3.3333, 24.8333, 'Nord'),
  ('Sud-Ubangi', 'SU', 1700000, 2600, 2.5000, 22.3333, 'Nord-Ouest'),
  ('Équateur', 'EQU', 2200000, 3400, 2.5000, 20.0000, 'Ouest'),
  ('Bas-Fleuve', 'BF', 1400000, 2100, -2.5000, 13.3333, 'Ouest'),
  ('Kasai Central', 'KC', 1800000, 2700, -5.9000, 21.8000, 'Centre'),
  ('Haut-Katanga', 'HK', 2000000, 3000, -10.3333, 28.7500, 'Sud-Est'),
  ('Haut-Lomami', 'HL', 1600000, 2400, -8.8333, 26.4167, 'Sud-Est'),
  ('Lualaba', 'LUA', 1300000, 2000, -10.9333, 26.0500, 'Sud-Est'),
  ('Tanganyika', 'TAN', 1100000, 1700, -8.5000, 29.5000, 'Sud-Est'),
  ('Maniyema', 'MAN', 900000, 1400, -3.0000, 24.0000, 'Est-Centre'),
  ('Maniema', 'MAM', 850000, 1300, -3.1667, 24.3333, 'Est-Centre'),
  ('Kasai', 'KAS', 1200000, 1800, -5.5000, 20.0000, 'Centre'),
  ('Lomami', 'LOA', 1000000, 1500, -4.0000, 23.0000, 'Est-Centre'),
  ('Kasai Nord', 'KN', 950000, 1450, -5.7000, 21.5000, 'Centre'),
  ('Tshuapa', 'TSU', 800000, 1200, 1.0000, 20.5000, 'Ouest'),
  ('Kasai Sud', 'KS', 750000, 1150, -6.0000, 20.0000, 'Centre'),
  ('Cuvette', 'CUV', 700000, 1050, -0.5000, 22.0000, 'Ouest'),
  ('Cuvette-Ouest', 'CUO', 650000, 1000, -0.5000, 19.5000, 'Ouest')
) AS p(nom, code, nombre_inscrits, nombre_bureaux, latitude, longitude, region)
ON CONFLICT (code) DO NOTHING;

-- Insérer les candidats
INSERT INTO candidats (nom, parti_politique, couleur_chart, election_id)
SELECT 
  c.nom, c.parti_politique, c.couleur_chart,
  (SELECT id FROM elections WHERE nom = 'Présidentielle RDC 2023' LIMIT 1)
FROM (
  VALUES
  ('Félix Tshisekedi', 'UDPS', '#3B82F6'),
  ('Moïse Katumbi', 'Ensemble', '#EF4444'),
  ('Martin Fayulu', 'ECID', '#10B981'),
  ('Vital Kamerhe', 'CEC', '#F59E0B'),
  ('Jeanine Mabunda', 'PPRD', '#8B5CF6')
) AS c(nom, parti_politique, couleur_chart)
ON CONFLICT (nom, election_id) DO NOTHING;

-- Configuration des seuils d'anomalies
INSERT INTO config_anomalies (parametre, valeur_seuil, description, actif)
VALUES
  ('zscore_seuil', 2.5, 'Seuil Z-score pour détection anomalies', true),
  ('participation_min', 10.0, 'Taux de participation minimum acceptable', true),
  ('participation_max', 100.0, 'Taux de participation maximum', true),
  ('iqr_coefficient', 1.5, 'Coefficient pour calcul IQR', true),
  ('voix_max_par_bureau', 5000, 'Voix maximales par bureau de vote', true),
  ('difference_participation_critique', 50.0, 'Différence critique de participation entre provinces (%)', true)
ON CONFLICT (parametre) DO NOTHING;

-- ============================================================================
-- ACTIVER LE REALTIME SUR LES TABLES CRITIQUES
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE resultats_partiels;
ALTER PUBLICATION supabase_realtime ADD TABLE anomalies;
ALTER PUBLICATION supabase_realtime ADD TABLE alertes;

-- ============================================================================
-- FONCTIONS ET TRIGGERS POUR LOGIQUE MÉTIER
-- ============================================================================

-- Fonction pour créer automatiquement une alerte quand une anomalie critique est détectée
CREATE OR REPLACE FUNCTION create_alerte_from_anomalie()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.gravite = 'critique' THEN
    INSERT INTO alertes (anomalie_id, titre, message, type, est_lue)
    VALUES (
      NEW.id,
      'Anomalie Critique Détectée',
      'Une anomalie critique a été détectée : ' || NEW.description,
      'error',
      false
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour créer automatiquement les alertes
CREATE TRIGGER IF NOT EXISTS trigger_create_alerte
  AFTER INSERT ON anomalies
  FOR EACH ROW
  EXECUTE FUNCTION create_alerte_from_anomalie();
