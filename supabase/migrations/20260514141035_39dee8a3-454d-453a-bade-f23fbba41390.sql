
-- Enum des rôles applicatifs
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Table des rôles utilisateurs (séparée des profils)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Fonction security definer pour vérifier un rôle (évite la récursion RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Type d'élection
CREATE TYPE public.election_type AS ENUM ('presidentielle', 'legislative', 'provinciale');

-- Méthode de détection d'anomalie
CREATE TYPE public.anomaly_method AS ENUM ('zscore', 'iqr', 'moyenne_mobile');

-- Provinces de la RDC
CREATE TABLE public.provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  centroid_lat DOUBLE PRECISION NOT NULL,
  centroid_lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Circonscriptions
CREATE TABLE public.circonscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id UUID NOT NULL REFERENCES public.provinces(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'territoriale',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_circ_province ON public.circonscriptions(province_id);

-- Bureaux de vote
CREATE TABLE public.bureaux_vote (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circonscription_id UUID NOT NULL REFERENCES public.circonscriptions(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  inscrits INTEGER NOT NULL DEFAULT 0 CHECK (inscrits >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bv_circ ON public.bureaux_vote(circonscription_id);

-- Élections
CREATE TABLE public.elections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.election_type NOT NULL,
  date_election DATE NOT NULL,
  libelle TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Candidats
CREATE TABLE public.candidats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  parti TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cand_election ON public.candidats(election_id);

-- Résultats par bureau / candidat
CREATE TABLE public.resultats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bureau_id UUID NOT NULL REFERENCES public.bureaux_vote(id) ON DELETE CASCADE,
  candidat_id UUID NOT NULL REFERENCES public.candidats(id) ON DELETE CASCADE,
  voix INTEGER NOT NULL DEFAULT 0 CHECK (voix >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bureau_id, candidat_id)
);
CREATE INDEX idx_res_bureau ON public.resultats(bureau_id);
CREATE INDEX idx_res_candidat ON public.resultats(candidat_id);

-- Participation par bureau
CREATE TABLE public.participation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bureau_id UUID NOT NULL REFERENCES public.bureaux_vote(id) ON DELETE CASCADE,
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  votants INTEGER NOT NULL DEFAULT 0 CHECK (votants >= 0),
  inscrits INTEGER NOT NULL DEFAULT 0 CHECK (inscrits >= 0),
  taux NUMERIC(5,2) NOT NULL DEFAULT 0,
  releve_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bureau_id, election_id)
);
CREATE INDEX idx_part_bureau ON public.participation(bureau_id);

-- Prédictions IA
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  province_id UUID REFERENCES public.provinces(id) ON DELETE CASCADE,
  candidat_id UUID NOT NULL REFERENCES public.candidats(id) ON DELETE CASCADE,
  score_predit NUMERIC(5,2) NOT NULL,
  intervalle_bas NUMERIC(5,2),
  intervalle_haut NUMERIC(5,2),
  generee_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Anomalies détectées
CREATE TABLE public.anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bureau_id UUID REFERENCES public.bureaux_vote(id) ON DELETE CASCADE,
  province_id UUID REFERENCES public.provinces(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  methode public.anomaly_method NOT NULL,
  score NUMERIC NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  detectee_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_anom_province ON public.anomalies(province_id);

-- Activer RLS
ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circonscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bureaux_vote ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resultats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomalies ENABLE ROW LEVEL SECURITY;

-- Lecture publique (prototype académique sur données simulées)
CREATE POLICY "Public read provinces" ON public.provinces FOR SELECT USING (true);
CREATE POLICY "Public read circonscriptions" ON public.circonscriptions FOR SELECT USING (true);
CREATE POLICY "Public read bureaux" ON public.bureaux_vote FOR SELECT USING (true);
CREATE POLICY "Public read elections" ON public.elections FOR SELECT USING (true);
CREATE POLICY "Public read candidats" ON public.candidats FOR SELECT USING (true);
CREATE POLICY "Public read resultats" ON public.resultats FOR SELECT USING (true);
CREATE POLICY "Public read participation" ON public.participation FOR SELECT USING (true);
CREATE POLICY "Public read predictions" ON public.predictions FOR SELECT USING (true);
CREATE POLICY "Public read anomalies" ON public.anomalies FOR SELECT USING (true);

-- Écriture réservée aux admins
CREATE POLICY "Admin write provinces" ON public.provinces FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin write circonscriptions" ON public.circonscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin write bureaux" ON public.bureaux_vote FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin write elections" ON public.elections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin write candidats" ON public.candidats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin write resultats" ON public.resultats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin write participation" ON public.participation FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin write predictions" ON public.predictions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin write anomalies" ON public.anomalies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Vue agrégée par province (participation moyenne, votants totaux)
CREATE OR REPLACE VIEW public.v_participation_province AS
SELECT
  p.id AS province_id,
  p.nom AS province,
  p.centroid_lat,
  p.centroid_lng,
  COALESCE(SUM(part.votants), 0)::INTEGER AS votants_total,
  COALESCE(SUM(part.inscrits), 0)::INTEGER AS inscrits_total,
  CASE WHEN COALESCE(SUM(part.inscrits),0) = 0 THEN 0
       ELSE ROUND(SUM(part.votants)::NUMERIC * 100.0 / NULLIF(SUM(part.inscrits),0), 2)
  END AS taux_participation
FROM public.provinces p
LEFT JOIN public.circonscriptions c ON c.province_id = p.id
LEFT JOIN public.bureaux_vote bv ON bv.circonscription_id = c.id
LEFT JOIN public.participation part ON part.bureau_id = bv.id
GROUP BY p.id, p.nom, p.centroid_lat, p.centroid_lng;
