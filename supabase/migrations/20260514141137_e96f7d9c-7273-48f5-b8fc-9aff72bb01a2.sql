
-- Seed des 26 provinces de la RDC avec coordonnées approximatives
INSERT INTO public.provinces (nom, code, centroid_lat, centroid_lng) VALUES
('Kinshasa','KN',-4.4419,15.2663),
('Kongo-Central','KC',-5.2761,14.6985),
('Kwango','KG',-6.4500,17.3500),
('Kwilu','KW',-5.0386,18.8167),
('Mai-Ndombe','MN',-2.6469,18.2833),
('Kasaï','KS',-5.4500,20.4167),
('Kasaï-Central','KCE',-5.8956,22.4156),
('Kasaï-Oriental','KCO',-6.1364,23.5910),
('Lomami','LO',-7.3000,24.5000),
('Sankuru','SA',-3.6500,23.0833),
('Maniema','MA',-3.0667,26.0500),
('Sud-Kivu','SK',-2.5000,28.8500),
('Nord-Kivu','NK',-1.6800,29.2300),
('Ituri','IT',1.6580,30.1500),
('Haut-Uele','HU',3.5000,28.0000),
('Bas-Uele','BU',3.0000,24.5000),
('Tshopo','TS',0.5167,25.1833),
('Tshuapa','TU',-0.3000,21.5000),
('Mongala','MO',2.0000,21.5000),
('Nord-Ubangi','NU',4.0000,21.0000),
('Sud-Ubangi','SU',2.5000,18.5000),
('Équateur','EQ',0.0500,18.2600),
('Tanganyika','TA',-5.9167,28.9667),
('Haut-Lomami','HL',-9.0000,26.0000),
('Lualaba','LU',-10.7167,25.4667),
('Haut-Katanga','HK',-11.6647,27.4794);

-- Élection présidentielle simulée
INSERT INTO public.elections (id, type, date_election, libelle) VALUES
('00000000-0000-0000-0000-000000000001','presidentielle','2023-12-20','Présidentielle 2023 (simulée)');

-- Candidats fictifs
INSERT INTO public.candidats (election_id, nom, parti) VALUES
('00000000-0000-0000-0000-000000000001','Kabongo M.','UDC'),
('00000000-0000-0000-0000-000000000001','Mwamba L.','RDP'),
('00000000-0000-0000-0000-000000000001','Tshilenge A.','MNR'),
('00000000-0000-0000-0000-000000000001','Lumbala G.','APR'),
('00000000-0000-0000-0000-000000000001','Ngoy J.','FCN');

-- Génération des circonscriptions et bureaux puis participation et résultats
DO $$
DECLARE
  prov RECORD;
  circ_id UUID;
  bureau_id UUID;
  cand RECORD;
  i INT;
  j INT;
  inscrits_n INT;
  votants_n INT;
  base_share NUMERIC;
  voix_n INT;
  remaining INT;
BEGIN
  FOR prov IN SELECT id, nom FROM public.provinces LOOP
    -- 2 circonscriptions par province
    FOR i IN 1..2 LOOP
      INSERT INTO public.circonscriptions (province_id, nom, type)
      VALUES (prov.id, prov.nom || ' - Circonscription ' || i, 'territoriale')
      RETURNING id INTO circ_id;

      -- 5 bureaux par circonscription
      FOR j IN 1..5 LOOP
        inscrits_n := 800 + floor(random()*1200)::INT;
        INSERT INTO public.bureaux_vote (circonscription_id, nom, inscrits)
        VALUES (circ_id, 'BV-' || substring(prov.id::text,1,4) || '-' || i || '-' || j, inscrits_n)
        RETURNING id INTO bureau_id;

        -- Participation : 45% à 85% (avec quelques outliers)
        votants_n := floor(inscrits_n * (0.45 + random()*0.40))::INT;
        IF random() < 0.04 THEN
          votants_n := floor(inscrits_n * (0.96 + random()*0.04))::INT; -- anomalie
        END IF;

        INSERT INTO public.participation (bureau_id, election_id, votants, inscrits, taux)
        VALUES (
          bureau_id,
          '00000000-0000-0000-0000-000000000001',
          votants_n,
          inscrits_n,
          ROUND(votants_n::NUMERIC * 100.0 / NULLIF(inscrits_n,0), 2)
        );

        -- Distribution des voix entre candidats
        remaining := votants_n;
        FOR cand IN SELECT id FROM public.candidats WHERE election_id = '00000000-0000-0000-0000-000000000001' ORDER BY nom LOOP
          base_share := 0.10 + random()*0.40;
          voix_n := LEAST(remaining, floor(votants_n * base_share)::INT);
          remaining := remaining - voix_n;
          INSERT INTO public.resultats (bureau_id, candidat_id, voix)
          VALUES (bureau_id, cand.id, voix_n);
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Prédictions agrégées par province et candidat (basées sur les résultats actuels avec un léger bruit)
INSERT INTO public.predictions (election_id, province_id, candidat_id, score_predit, intervalle_bas, intervalle_haut)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  p.id,
  c.id,
  ROUND(LEAST(100, GREATEST(0, COALESCE(SUM(r.voix)::NUMERIC * 100.0 / NULLIF(SUM(part.votants),0), 0) + (random()*4 - 2)))::NUMERIC, 2),
  ROUND(GREATEST(0, COALESCE(SUM(r.voix)::NUMERIC * 100.0 / NULLIF(SUM(part.votants),0), 0) - 3)::NUMERIC, 2),
  ROUND(LEAST(100, COALESCE(SUM(r.voix)::NUMERIC * 100.0 / NULLIF(SUM(part.votants),0), 0) + 3)::NUMERIC, 2)
FROM public.provinces p
CROSS JOIN public.candidats c
LEFT JOIN public.circonscriptions ci ON ci.province_id = p.id
LEFT JOIN public.bureaux_vote bv ON bv.circonscription_id = ci.id
LEFT JOIN public.resultats r ON r.bureau_id = bv.id AND r.candidat_id = c.id
LEFT JOIN public.participation part ON part.bureau_id = bv.id
WHERE c.election_id = '00000000-0000-0000-0000-000000000001'
GROUP BY p.id, c.id;

-- Anomalies pré-calculées : bureaux dont la participation > 95%
INSERT INTO public.anomalies (bureau_id, province_id, type, methode, score, details)
SELECT
  bv.id,
  pr.id,
  'Participation anormalement élevée (>95%)',
  'zscore',
  ROUND(part.taux, 2),
  jsonb_build_object('taux', part.taux, 'inscrits', part.inscrits, 'votants', part.votants, 'seuil', 95)
FROM public.participation part
JOIN public.bureaux_vote bv ON bv.id = part.bureau_id
JOIN public.circonscriptions ci ON ci.id = bv.circonscription_id
JOIN public.provinces pr ON pr.id = ci.province_id
WHERE part.taux > 95;
