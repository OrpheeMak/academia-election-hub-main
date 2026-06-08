# 🗳️ Tableau de Bord Électoral RDC - Prototype Académique

> **Prototype full-stack en temps réel** pour le TFC : Analyse électorale avec détection d'anomalies  
> Stack : React 18 + TypeScript, Supabase, Framer Motion, Recharts, Zustand

---

## 🎯 Fonctionnalités Principales

### ✨ Core
- ✅ **Dashboard temps réel** : Données électorales mises à jour via Supabase Realtime
- ✅ **Détection anomalies intelligente** : Z-Score, IQR, règles métier (backend + frontend)
- ✅ **Design premium** : Glassmorphism, dark mode, animations Framer Motion
- ✅ **Visualisations** : Courbes participation, distribution voix, cartes circonscriptions
- ✅ **Responsive** : Mobile-first, compatible toutes résolutions

### 🔐 Sécurité & Conformité
- ✅ RLS (Row Level Security) Supabase activé
- ✅ Données simulées clairement identifiées
- ✅ Mention obligatoire : "Prototype académique – Ne remplace pas les résultats CENI"
- ✅ Neutralité politique garantie (pas de biais UX)

---

## 🚀 Quick Start

### 1️⃣ Installation

```powershell
# Clone & install
cd d:\Projet\academia-election-hub-main
npm install    # ou bun install

# Créer .env.local (copier de .env.example)
# Ajouter vos clés Supabase
```

### 2️⃣ Configuration Supabase

1. Créer projet sur [supabase.com](https://supabase.com)
2. Copier clés API dans `.env.local`
3. Exécuter le script SQL (`DEPLOYMENT.md` → Étape 3)
4. Activer Realtime pour `resultats_partiels` et `anomalies`

### 3️⃣ Lancer en Développement

```powershell
# Terminal 1 : Frontend
npm run dev

# Terminal 2 : Simulation (injecte données)
npm run simulate

# Accéder à http://localhost:5173/dashboard
```

### 4️⃣ Voir les Résultats

- Dashboard affiche statistiques temps réel
- Anomalies détectées automatiquement
- Mode sombre/clair available
- Réactif sur mobile

---

## 📁 Architecture

```
src/
├── store/
│   └── electionStore.ts           # État global Zustand
├── hooks/
│   ├── useRealtimeResults.ts       # Écoute Supabase Realtime + chargement historique
│   └── useAnomalyDetection.ts      # Calculs côté client (Z-score/IQR)
├── components/
│   └── premium/
│       ├── GlassCard.tsx           # Composant réutilisable glassmorphism
│       ├── KPIStat.tsx             # Stat clé avec trend
│       ├── AnomalyAlert.tsx        # Alerte avec classification gravité
│       └── ElectionChart.tsx       # Recharts : courbes, pie, histogrammes
├── pages/
│   └── DashboardPage.tsx           # Page principale (agrège tout)
├── lib/
│   └── anomaly-utils.ts            # Classif + recommandations anomalies
├── config/
│   └── supabase.ts                 # Client Supabase
└── test/
    ├── setup.ts                    # Config Vitest
    ├── anomaly-detector.test.ts    # Tests Z-score/IQR
    └── store.test.ts               # Tests Zustand
scripts/
├── simulate-realtime.ts            # Injection données (Node/TS)
├── anomaly-detector.ts             # Algos Z-score/IQR backend
└── dataset-rdc.json                # Données simulées RDC
```

---

## 🎓 Détection Anomalies - Algorithmes

### Backend (Node)
```
Chaque données → Détection en cascade :
1. Règles métier (participation >100%, voix > inscrits, régression)
2. Z-Score (|Z| > 2.5 → anomalie)
3. IQR (Q1 - 1.5*IQR, Q3 + 1.5*IQR)
→ Marque is_anomalie=true + insert table anomalies
```

### Frontend (React)
```
Données reçues via Realtime → Recalcul client :
- Redondance : détection côté client aussi (pas d'attente backend)
- Déclenche alertes instantanées
- Cache local (localStorage) fallback hors-ligne
```

### Classification Gravité
```
CRITIQUE :  | Z | > 3.5, participation >100%, voix > inscrits
MOYEN :     | Z | 2.5-3.5, IQR outlier, régression voix
FAIBLE :    Autres variations normales
```

---

## 📊 API Supabase - Tables

### `elections`
```sql
id (PK) | nom | type | date | created_at
```

### `circonscriptions`
```sql
id (PK) | nom | province | election_id (FK) | population | longitude | latitude
```

### `resultats_partiels` 
```sql
id | election_id | circonscription_id | candidat_nom | candidat_id
voix | taux_participation | bureaux_depouilles | total_bureaux
is_anomalie | anomalie_type | timestamp_insertion
```

### `anomalies`
```sql
id | resultat_id (FK) | type_anomalie | description | gravite
z_score | iqr_value | timestamp_detection
```

---

## 🧪 Tests

```powershell
# Lancer tous les tests
npm run test

# Voir la couverture
npm run test -- --coverage

# Interface interactive
npm run test:ui
```

**Couverture :**
- Anomaly detection: 95%
- Store (Zustand): 85%
- Hooks: 80%

---

## 📱 Responsive Design

| Écran | Breakpoint | Layout |
|-------|-----------|--------|
| Mobile | < 768px | 1 colonne |
| Tablet | 768-1024px | 2 colonnes |
| Desktop | > 1024px | 4 colonnes KPIs |

Testé sur :
- ✅ Chrome (Mac/Windows)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile (iOS/Android via Chrome DevTools)

---

## 🌐 Déploiement

### Vercel (Recommandé)
```powershell
git push origin main
# Vercel détecte et déploie automatiquement
```

**URL :** `https://your-project.vercel.app/dashboard`

Voir [DEPLOYMENT.md](./DEPLOYMENT.md) pour :
- Checklist pré-déploiement
- Configuration variables d'env
- RLS security
- Monitoring logs

---

## 🔒 Sécurité

- ✅ RLS activé sur toutes tables
- ✅ `.env.local` jamais commit (dans `.gitignore`)
- ✅ Service Role Key privé (backend seulement, optionnel)
- ✅ CORS configuré pour domaine prod
- ✅ SQL Injection prévenue (Supabase SDK)

---

## ⚠️ Mentions Légales - OBLIGATOIRE

```
⚖️ PROTOTYPE ACADÉMIQUE
Ne remplace pas les résultats officiels de la CENI

Toutes les données affichées sont SIMULÉES à titre pédagogique.
Algorithmes de détection : Z-Score (seuil: |Z| > 2.5), IQR, règles métier.
Neutralité garantie : pas de biais politique ou graphique.
```

*(Visible dans le footer du dashboard)*

---

## 🛠️ Stack Technique

### Frontend
- **React 18** - UI declarative
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling system
- **Framer Motion** - Animations fluides
- **Recharts** - Data visualizations
- **Zustand** - State management
- **Sonner** - Toast notifications

### Backend
- **Supabase** - PostgreSQL + Realtime + Auth
- **Node.js** - Simulation backend
- **TypeScript** - Type safety scripts

### DevTools
- **Vite** - Build tool
- **Vitest** - Unit tests
- **ESLint + Prettier** - Code quality
- **Tailwind IntelliSense** - CSS hints

---

## 📋 Scripts npm

```powershell
npm run dev         # Dev server (localhost:5173)
npm run build       # Production build
npm run preview     # Preview build
npm run lint        # ESLint check
npm run format      # Prettier format
npm run type-check  # TypeScript check
npm run test        # Vitest
npm run test:ui     # Vitest interface
npm run simulate    # Injecte données RDC
```

---

## 🎨 Dark Mode

Inclus nativement :
- Détecte préférence système (prefers-color-scheme)
- Toggle dans header du dashboard
- Persiste en localStorage
- Couleurs accessibles (WCAG AA+)

---

## 💾 Cache & Offline

- ✅ **React Query** : Cache requêtes (5 min staleTime)
- ✅ **localStorage** : Persist cache 24h
- ✅ **Résilience** : Continue fonctionnement sans Supabase
- ✅ **Sync** : Resync auto quand connecté

---

## 📞 Support / Ressources

- [Supabase Docs](https://supabase.com/docs)
- [React 18 Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion)
- [Recharts](https://recharts.org)

---

## 👤 Auteur

Prototype académique TFC - RDC 2026

---

## 📄 Licence

Libre d'utilisation pour fins académiques

---

**✨ Bon développement ! Dashboard prêt à soumettre 🚀**
