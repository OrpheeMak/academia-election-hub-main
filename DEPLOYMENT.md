# 🚀 Guide Déploiement - Dashboard Électoral RDC

## 📋 Checklist Pré-Déploiement

Avant de soumettre votre TFC, valider :

### ✅ Tests & Validation Code
- [ ] `npm run lint` : 0 erreur ESLint
- [ ] `npm run type-check` : 0 erreur TypeScript
- [ ] `npm run test` : Tous les tests passent
- [ ] Couverture tests > 70%

### ✅ Configuration Supabase
- [ ] Projet Supabase créé et accessible
- [ ] Tables créées (elections, circonscriptions, resultats_partiels, anomalies)
- [ ] RLS activé et testé
- [ ] Realtime activé pour resultats_partiels et anomalies
- [ ] Clés API stockées dans `.env.local` (jamais commit)

### ✅ Données Électorales
- [ ] Script simulation lancé au moins une fois : `npm run simulate`
- [ ] Données de test présentes en BD
- [ ] Anomalies détectées et visibles
- [ ] Filtres fonctionnels

### ✅ Interface & UX
- [ ] Dashboard accessible via `/dashboard`
- [ ] Mode sombre/clair fonctionne
- [ ] Responsive design validé sur mobile (Ctrl+Shift+M)
- [ ] Connexion Realtime affichée (🟢/🔴)
- [ ] Aucune erreur console (`F12`)

### ✅ Conformité Académique
- [ ] Mention "Prototype académique" visible dans UI
- [ ] Données clairement identifiées comme simulées
- [ ] Neutralité politique vérifiée (pas de biais graphique)
- [ ] Documentation mise à jour

### ✅ Performance
- [ ] Lighthouse score > 80
- [ ] Aucun Memory Leak (DevTools > Memory)
- [ ] Load time < 3s sur 4G (Throttling)

---

## 🌐 Déploiement Frontend (Vercel)

### Étape 1 : Préparation GitHub

```powershell
# Commit final
git add .
git commit -m "feat: tableau de bord électoral RDC - TFC complet"
git push origin main
```

### Étape 2 : Déploiement Vercel

1. Accéder à [vercel.com](https://vercel.com)
2. Connecter votre repo GitHub
3. Configurer variables d'environnement :
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-public-key
   ```
4. Build command : `npm run build`
5. Output directory : `dist`
6. Déployer

**URL finale :** `https://your-project.vercel.app/dashboard`

### Étape 3 : Netlify Alternative

```powershell
# Installer Netlify CLI
npm install -g netlify-cli

# Déployer
netlify deploy --prod --dir=dist
```

---

## 🏗️ Déploiement Backend (Optionnel - Edge Functions Supabase)

### Deployment du Script Simulation

Si vous voulez que la simulation s'exécute automatiquement :

```powershell
# Créer une Edge Function Supabase
supabase functions new simulate-election

# Copier src/scripts/simulate-realtime.ts dans la fonction
# Modifier pour exécution serverless (remove file I/O)

# Déployer
supabase functions deploy simulate-election
```

**Scheduler (cron) :**
- Allez dans Supabase Dashboard → Webhooks
- URL : `https://your-project.supabase.co/functions/v1/simulate-election`
- Intervalle : Toutes les heures

---

## 🔒 Sécurité - Checklist Production

- [ ] RLS activé sur TOUTES les tables
- [ ] Service Role Key JAMAIS publié (commits, logs, etc.)
- [ ] `.env.local` dans `.gitignore`
- [ ] CORS configuré pour domaine production seulement
- [ ] Rate limiting activé sur Supabase
- [ ] Realtime restreint (authentification si données sensibles)
- [ ] SQL Injection impossible (Supabase JS SDK la prévient)

**Configuration Supabase Dashboard → Settings → API :**
```
SQL_POOL_MODE=true
MAX_CONNECTIONS=25
SHARED_PRELOAD_LIBRARIES=pg_stat_statements,pg_cron
```

---

## 📊 Monitoring & Logs

### Supabase Dashboard
- Monitor onglet : CPU, RAM, Query performance
- Logs SQL : onglet Logs
- Realtime stats : onglet Realtime

### Vercel Observability
- Analytics : Traffic, response time
- Deployment logs : Build errors, warnings
- Error tracking : Frontend errors détectés

### Local Debugging
```powershell
# Logs Supabase
supabase logs tail

# Build stats
npm run build -- --report

# Performance profiling
npm run dev -- --profile
```

---

## 🎓 Documentation Académique Requise

Inclure dans votre dossier TFC :

### 1. **README.md - Vue d'Ensemble**
```markdown
# Tableau de Bord Électoral RDC - Prototype Académique

## Technologies
- Frontend: React 18, TypeScript, Tailwind, Framer Motion
- Backend: Supabase (PostgreSQL, Realtime, Auth)
- Visualisations: Recharts, Leaflet
- Tests: Vitest, React Testing Library

## Installation
\`\`\`bash
npm install
npm run dev
\`\`\`

## Scripts Principaux
- `npm run simulate` : Injecte données électorales simulées
- `npm run build` : Build production
- `npm run test` : Tests unitaires

## Fonctionnalités Clés
- ✅ Temps réel (Supabase Realtime)
- ✅ Détection anomalies (Z-score/IQR)
- ✅ Responsive design
- ✅ Dark mode
- ✅ Neutre politique

## Données
Toutes les données affichées sont **simulées** à titre pédagogique.
Ce prototype ne remplace pas les résultats officiels de la CENI.
```

### 2. **ARCHITECTURE.md - Design System**
```markdown
# Architecture

## Modules
- `/src/store` : Zustand (état global)
- `/src/hooks` : Realtime, anomalies, côté client
- `/src/components/premium` : UI avancée (Framer Motion)
- `/src/pages` : Routes principales
- `/scripts` : Simulation backend (Node/TS)

## Flux de Données
1. Simulation Node injecte dans Supabase
2. Supabase Realtime notifie le frontend
3. Store Zustand centralise l'état
4. Composants React s'abonnent aux changements
5. Anomalies détectées côté backend ET frontend (redondance)
```

### 3. **TESTING.md - Couverture Tests**
```markdown
# Tests

## Exécution
\`\`\`bash
npm run test           # Tous les tests
npm run test:ui        # Interface Vitest
\`\`\`

## Coverage
- Anomaly detection algorithms: 95%
- Store (Zustand): 85%
- Hooks: 80%

## Examples
- test/anomaly-detector.test.ts : Tests Z-score/IQR
- test/store.test.ts : Store mutations et sélecteurs
```

---

## 📝 Mention Légale Requise (dans UI)

```html
<!-- À ajouter dans le footer (fait dans DashboardPage.tsx) -->
<footer>
  ⚖️ <strong>Prototype Académique</strong> – Ne remplace pas les résultats 
  officiels de la CENI
  
  Données simulées | Détection anomalies : Z-Score/IQR | Neutralité garantie
</footer>
```

---

## 🔧 Troubleshooting Déploiement

### Erreur : "VITE_SUPABASE_URL not defined"
```bash
# Vérifier .env.local en local
cat .env.local

# Vérifier variables dans Vercel Dashboard
Settings → Environment Variables
```

### Erreur : "Realtime not working"
```bash
# Vérifier Supabase Dashboard
Database → Replication
# S'assurer que resultats_partiels et anomalies sont activées
```

### Performance lente
```bash
# Vérifier Supabase status
https://status.supabase.com

# Lazy load les visualisations
React.lazy(() => import('@/components/premium/ElectionChart'))
```

---

## 🎯 Mesures de Succès

Votre déploiement est réussi si :

1. ✅ Dashboard accessible sans erreurs
2. ✅ Données Realtime se mettent à jour automatiquement
3. ✅ Anomalies détectées correctement
4. ✅ Responsive sur mobile
5. ✅ Mentions académiques présentes
6. ✅ Tous les tests passent
7. ✅ Performance acceptable (< 3s load)

---

## 📞 Support & Ressources

- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Vercel Docs**: https://vercel.com/docs

---

**Bon déploiement ! 🚀**
