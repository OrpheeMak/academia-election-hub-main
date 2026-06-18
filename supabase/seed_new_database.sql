-- ============================================================================
-- Seed de donnees simulees pour une nouvelle base Supabase
-- Academia Election Hub - React + Supabase
-- A executer apres la creation du schema principal.
-- ============================================================================

DO $$
DECLARE
  v_election_id UUID;
  v_province RECORD;
  v_circonscription_id UUID;
  v_bureau_id UUID;
  v_candidat RECORD;
  v_inscrits INT;
  v_participation NUMERIC;
  v_voix INT;
  i INT;
  j INT;
BEGIN
  -- Election principale
  INSERT INTO elections (nom, type, date_election, statut, description)
  VALUES (
    'Presidentielle RDC 2026 - Simulation',
    'présidentielle',
    '2026-05-15',
    'en_cours',
    'Donnees simulees pour prototype academique'
  )
  RETURNING id INTO v_election_id;

  -- Provinces RDC avec coordonnees approximatives
  INSERT INTO provinces (nom, code, nombre_inscrits, nombre_bureaux, latitude, longitude, region, centroid_lat, centroid_lng, election_id)
  VALUES
    ('Kinshasa', 'KIN', 8500000, 12000, -4.4419, 15.2663, 'Ouest', -4.4419, 15.2663, v_election_id),
    ('Kongo-Central', 'KCO', 2800000, 4200, -5.2761, 14.6985, 'Ouest', -5.2761, 14.6985, v_election_id),
    ('Kwango', 'KWA', 1400000, 2100, -6.4500, 17.3500, 'Ouest', -6.4500, 17.3500, v_election_id),
    ('Kwilu', 'KWI', 2200000, 3300, -5.0386, 18.8167, 'Ouest', -5.0386, 18.8167, v_election_id),
    ('Mai-Ndombe', 'MND', 1100000, 1700, -2.6469, 18.2833, 'Ouest', -2.6469, 18.2833, v_election_id),
    ('Kasai', 'KAS', 1200000, 1800, -5.4500, 20.4167, 'Centre', -5.4500, 20.4167, v_election_id),
    ('Kasai-Central', 'KCE', 1800000, 2700, -5.8956, 22.4156, 'Centre', -5.8956, 22.4156, v_election_id),
    ('Kasai-Oriental', 'KOR', 3600000, 5500, -6.1364, 23.5910, 'Centre', -6.1364, 23.5910, v_election_id),
    ('Lomami', 'LOM', 1000000, 1500, -7.3000, 24.5000, 'Centre', -7.3000, 24.5000, v_election_id),
    ('Sankuru', 'SAN', 950000, 1450, -3.6500, 23.0833, 'Centre', -3.6500, 23.0833, v_election_id),
    ('Maniema', 'MAN', 900000, 1400, -3.0667, 26.0500, 'Est', -3.0667, 26.0500, v_election_id),
    ('Sud-Kivu', 'SKI', 3800000, 5800, -2.5000, 28.8500, 'Est', -2.5000, 28.8500, v_election_id),
    ('Nord-Kivu', 'NKI', 4200000, 6500, -1.6800, 29.2300, 'Est', -1.6800, 29.2300, v_election_id),
    ('Ituri', 'ITU', 2100000, 3200, 1.6580, 30.1500, 'Nord-Est', 1.6580, 30.1500, v_election_id),
    ('Haut-Uele', 'HUE', 1300000, 2000, 3.5000, 28.0000, 'Nord-Est', 3.5000, 28.0000, v_election_id),
    ('Bas-Uele', 'BUE', 1000000, 1500, 3.0000, 24.5000, 'Nord', 3.0000, 24.5000, v_election_id),
    ('Tshopo', 'TSH', 2500000, 3800, 0.5167, 25.1833, 'Nord', 0.5167, 25.1833, v_election_id),
    ('Tshuapa', 'TSP', 800000, 1200, -0.3000, 21.5000, 'Nord-Ouest', -0.3000, 21.5000, v_election_id),
    ('Mongala', 'MON', 850000, 1300, 2.0000, 21.5000, 'Nord-Ouest', 2.0000, 21.5000, v_election_id),
    ('Nord-Ubangi', 'NUB', 1900000, 2900, 4.0000, 21.0000, 'Nord-Ouest', 4.0000, 21.0000, v_election_id),
    ('Sud-Ubangi', 'SUB', 1700000, 2600, 2.5000, 18.5000, 'Nord-Ouest', 2.5000, 18.5000, v_election_id),
    ('Equateur', 'EQU', 2200000, 3400, 0.0500, 18.2600, 'Ouest', 0.0500, 18.2600, v_election_id),
    ('Tanganyika', 'TAN', 1100000, 1700, -5.9167, 28.9667, 'Sud-Est', -5.9167, 28.9667, v_election_id),
    ('Haut-Lomami', 'HLO', 1600000, 2400, -9.0000, 26.0000, 'Sud-Est', -9.0000, 26.0000, v_election_id),
    ('Lualaba', 'LUA', 1300000, 2000, -10.7167, 25.4667, 'Sud-Est', -10.7167, 25.4667, v_election_id),
    ('Haut-Katanga', 'HKA', 2000000, 3000, -11.6647, 27.4794, 'Sud-Est', -11.6647, 27.4794, v_election_id);

  -- Candidats fictifs
  INSERT INTO candidats (nom, parti_politique, couleur_chart, election_id)
  VALUES
    ('Candidat Alpha', 'Parti A', '#e74c3c', v_election_id),
    ('Candidat Beta', 'Parti B', '#3498db', v_election_id),
    ('Candidat Gamma', 'Parti C', '#2ecc71', v_election_id),
    ('Candidat Delta', 'Parti D', '#f39c12', v_election_id),
    ('Candidat Epsilon', 'Parti E', '#8b5cf6', v_election_id);

  -- Circonscriptions, bureaux et resultats partiels
  FOR v_province IN SELECT * FROM provinces WHERE election_id = v_election_id LOOP
    FOR i IN 1..2 LOOP
      INSERT INTO circonscriptions (nom, province_id, nombre_bureaux, nombre_inscrits)
      VALUES (
        v_province.nom || ' - Circonscription ' || i,
        v_province.id,
        5,
        floor(v_province.nombre_inscrits / 2)
      )
      RETURNING id INTO v_circonscription_id;

      FOR j IN 1..5 LOOP
        v_inscrits := 800 + floor(random() * 1200)::INT;

        INSERT INTO bureaux_vote (nom, circonscription_id, province_id, nombre_inscrits, latitude, longitude, statut)
        VALUES (
          'BV-' || v_province.code || '-' || i || '-' || j,
          v_circonscription_id,
          v_province.id,
          v_inscrits,
          v_province.latitude + (random() - 0.5) / 10,
          v_province.longitude + (random() - 0.5) / 10,
          'ouvert'
        )
        RETURNING id INTO v_bureau_id;

        v_participation := round((45 + random() * 40)::numeric, 2);
        IF random() < 0.05 THEN
          v_participation := round((95 + random() * 4)::numeric, 2);
        END IF;

        FOR v_candidat IN SELECT * FROM candidats WHERE election_id = v_election_id LOOP
          v_voix := floor((v_inscrits * v_participation / 100) * (0.08 + random() * 0.28))::INT;

          INSERT INTO resultats_partiels (
            election_id,
            province_id,
            circonscription_id,
            bureau_id,
            candidat_id,
            voix,
            inscrits,
            taux_participation,
            is_anomalie
          )
          VALUES (
            v_election_id,
            v_province.id,
            v_circonscription_id,
            v_bureau_id,
            v_candidat.id,
            v_voix,
            v_inscrits,
            v_participation,
            false
          );
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;

  -- Predictions par province/candidat
  INSERT INTO predictions (election_id, province_id, candidat_id, score_predit, intervalle_bas, intervalle_haut, confidence, model_version)
  SELECT
    v_election_id,
    p.id,
    c.id,
    round((15 + random() * 35)::numeric, 2),
    round((10 + random() * 20)::numeric, 2),
    round((35 + random() * 25)::numeric, 2),
    round((70 + random() * 25)::numeric, 2),
    'simulation-v1'
  FROM provinces p
  CROSS JOIN candidats c
  WHERE p.election_id = v_election_id
    AND c.election_id = v_election_id;

  -- Anomalies sur les resultats dont la participation est tres haute
  INSERT INTO anomalies (election_id, resultat_id, province_id, bureau_id, type, methode, gravite, score, description, details, status)
  SELECT
    rp.election_id,
    rp.id,
    rp.province_id,
    rp.bureau_id,
    'participation_anomaly',
    'zscore',
    'critique',
    rp.taux_participation,
    'Participation anormalement elevee dans un bureau de vote',
    jsonb_build_object('taux_participation', rp.taux_participation, 'inscrits', rp.inscrits, 'voix', rp.voix),
    'detected'
  FROM resultats_partiels rp
  WHERE rp.election_id = v_election_id
    AND rp.taux_participation >= 95;

  -- Alertes liees aux anomalies critiques
  INSERT INTO alertes (election_id, type, titre, description, severite, est_lue)
  SELECT
    v_election_id,
    'anomaly',
    'Anomalie critique detectee',
    'Un bureau presente un taux de participation superieur ou egal a 95%.',
    'critical',
    false
  FROM anomalies a
  WHERE a.election_id = v_election_id
  LIMIT 20;
END $$;
