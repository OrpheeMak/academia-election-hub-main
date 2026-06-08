## Proposition technique — Plateforme de visualisation électorale RDC

### Vue d'ensemble
Évolution du dashboard actuel (France/localhost:8000) vers un prototype académique adapté à la RDC, avec backend Lovable Cloud (Supabase managé) et frontend React optimisé pour mobile/faible bande passante.

### 1. Backend — Lovable Cloud (Supabase)

**Activation Lovable Cloud** (PostgreSQL + Auth + API REST/Realtime managés, sans compte externe).

**Schéma de base de données :**
```
provinces        (id, nom, code, geom_centroid_lat/lng)
circonscriptions (id, province_id, nom, type)
bureaux_vote     (id, circonscription_id, nom, inscrits)
elections        (id, type [presidentielle|legislative|provinciale], date, libelle)
candidats        (id, election_id, nom, parti)
resultats        (id, bureau_id, candidat_id, voix, created_at)
participation    (id, bureau_id, votants, inscrits, taux)
anomalies        (id, bureau_id, type, score, methode [zscore|iqr|moyenne_mobile], detectee_le, details jsonb)
predictions      (id, election_id, province_id, candidat_id, score_predit, intervalle_confiance, generee_le)
```

**RLS :** lecture publique sur données simulées ; écriture restreinte (admin via `user_roles` table dédiée + fonction `has_role` security definer). Auth Supabase prête mais non bloquante pour le prototype.

**Données :** seed avec données simulées RDC (26 provinces, élections présidentielle/législative fictives) via script d'insertion JSON/CSV.

### 2. Frontend — React adaptations RDC

**Refonte des données et libellés :**
- Carte Leaflet recentrée sur la RDC (lat -4, lng 23.6, zoom 5), marqueurs sur les 26 provinces
- Libellés, candidats, partis simulés contextualisés RDC
- Suppression des appels `localhost:8000` → remplacement par client Supabase + React Query

**Visualisations (Recharts, déjà installé) :**
- Courbes de tendance (évolution participation par heure)
- Histogrammes (résultats par candidat/province)
- Carte choroplèthe Leaflet (taux de participation par province, échelle de couleurs)
- Cartes d'indicateurs clés (KPI : participation nationale, écart top 2, bureaux dépouillés)

**Filtres :**
- Sélecteurs : type d'élection, province, circonscription, période
- Agrégation dynamique (national / provincial / circonscription)
- État partagé via Context API + URL params

**Détection d'anomalies (côté client, interprétable) :**
- Z-score sur taux de participation par bureau
- Écart interquartile (IQR) sur ratio voix/inscrits
- Moyenne mobile sur évolution temporelle
- Affichage : badge "Alerte", panneau latéral détaillant la méthode et le seuil franchi (interprétabilité)

**Optimisations RDC (faible bande passante / mobile) :**
- Mobile-first : refonte du layout en stack vertical < 768px, navigation simplifiée
- React Query avec `staleTime` long + cache persistant (`localStorage` via persister)
- Pagination/agrégations côté serveur (vues SQL ou RPC) pour réduire payloads
- Lazy-loading des composants lourds (Leaflet, Recharts) via `React.lazy`
- Service worker simple pour mise en cache offline des dernières données vues
- Skeleton loaders légers, pas d'animations coûteuses
- Compression des réponses API (géré par Supabase)

### 3. Sécurité
- RLS activé sur toutes les tables
- Pas de SQL brut côté client
- Table `user_roles` séparée + `has_role()` security definer (évite récursion RLS)
- Auth Supabase optionnelle (email/password) — configurable plus tard

### 4. Découpage en lots livrables

1. **Lot 1 — Backend & données** : activer Cloud, créer schéma + RLS + seed RDC
2. **Lot 2 — Refonte carte & données** : Leaflet RDC, suppression localhost:8000, client Supabase
3. **Lot 3 — Filtres & agrégations** : Context API, sélecteurs, vues agrégées
4. **Lot 4 — Anomalies interprétables** : module Z-score/IQR/moyenne mobile + UI explicative
5. **Lot 5 — Optimisations RDC** : mobile-first, cache persistant, lazy-loading, offline basique
6. **Lot 6 — Documentation** : README technique (schéma, algos, déploiement)

### Question avant de commencer
Le prototype actuel pointe vers `localhost:8000`. Je propose de **tout migrer vers Lovable Cloud** (plus aucun backend externe à lancer). Confirmez-vous ? Et souhaitez-vous que je démarre par le **Lot 1 (backend + seed RDC)** ou préférez-vous un ordre différent ?
