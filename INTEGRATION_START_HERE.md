## 🚀 Démarrer avec l'Intégration Complète

Bienvenue! Cette page vous guide à travers l'intégration technique complète du projet Academia Election Hub.

### ⚡ Démarrage Rapide (5 min)

```bash
# 1. Installation
npm install

# 2. Vérifier la configuration
npm run type-check

# 3. Lancer les tests
npm run test

# 4. Démarrer le développement
npm run dev
```

### 📚 Documentation Essentielle

| Document | Lire si... |
|----------|-----------|
| [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) | Vous voulez comprendre **comment ça marche** |
| [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) | Vous préparez le **déploiement en production** |
| [INTEGRATION_SUMMARY.md](./INTEGRATION_SUMMARY.md) | Vous voulez un **résumé technique complet** |
| [supabase/functions/README.md](./supabase/functions/README.md) | Vous travaillez sur les **Edge Functions** |

### 🎯 What's New (Nouveautés)

#### 1. Modules Analytiques (`src/lib/`)

**Prédictions Électorales** (`predictions.ts`)
```typescript
import { predictFinalScore, calculateSMA } from '@/lib/predictions';

// Prédire le score final
const prediction = predictFinalScore(historical, current);
// { score_predit: 1050, confidence: 0.95, ... }
```

**Détection d'Anomalies** (`anomaly-advanced.ts`)
```typescript
import { detectAllAnomalies, evaluateOverallSeverity } from '@/lib/anomaly-advanced';

// Détecter les anomalies
const anomalies = detectAllAnomalies(participationData);
const severity = evaluateOverallSeverity(anomalies);
// 'critical' | 'high' | 'medium' | 'low' | 'none'
```

#### 2. Composants React (`src/components/dashboard/Charts.tsx`)

```typescript
import { 
  DashboardChart, 
  ParticipationChart, 
  AnomalyIndicator 
} from '@/components/dashboard/Charts';

// Afficher les résultats
<DashboardChart 
  data={votesData} 
  title="Résultats nationaux"
  chartType="bar"
/>

// Afficher l'évolution
<ParticipationChart data={timeSeriesData} />

// Afficher les alertes
<AnomalyIndicator anomalies={detectedAnomalies} />
```

#### 3. Service d'Intégration (`src/services/electionApiIntegration.ts`)

```typescript
import { electionApiService } from '@/services/electionApiIntegration';

// Traiter les résultats (déclenche automatiquement anomalies + prédictions)
const result = await electionApiService.processResults({
  election_id: 'xyz',
  results: [...],
  auto_detect_anomalies: true,
  auto_predict: true
});

// S'abonner aux changements en temps réel
electionApiService.subscribeToAnomalies(electionId, (anomaly) => {
  console.log('Nouvelle anomalie:', anomaly);
});
```

#### 4. Hooks React (`src/hooks/useElectionAnalytics.ts`)

```typescript
import { useElectionAnalytics, useElectionAlerts } from '@/hooks/useElectionAnalytics';

function Dashboard() {
  const {
    predictions,
    anomalies,
    processingStatus,
    overallSeverity,
    processResults,
    triggerPredictions
  } = useElectionAnalytics(electionId);

  const {
    alerts,
    criticalAlerts,
    createAlert
  } = useElectionAlerts(electionId);

  return (
    <div>
      {/* Votre interface */}
    </div>
  );
}
```

#### 5. Edge Functions Backend

**Prédictions**: `POST /functions/v1/predict-election-results`
```bash
curl -X POST https://your-project.supabase.co/functions/v1/predict-election-results \
  -H "Content-Type: application/json" \
  -d '{"election_id": "xyz"}'
```

**Anomalies**: `POST /functions/v1/detect-anomalies`
```bash
curl -X POST https://your-project.supabase.co/functions/v1/detect-anomalies \
  -H "Content-Type: application/json" \
  -d '{"election_id": "xyz", "method": "all"}'
```

### 🧪 Tests

```bash
# Exécuter tous les tests
npm run test

# Tests en mode watch
npm run test -- --watch

# Interface visuelle
npm run test:ui

# Couverture
npm run test -- --coverage
```

### 📦 Structure des Fichiers

```
src/
├── lib/
│   ├── predictions.ts              # 🆕 Prédictions électorales
│   ├── anomaly-advanced.ts         # 🆕 Détection d'anomalies avancée
│   └── utils.ts
├── components/
│   └── dashboard/
│       └── Charts.tsx              # 🆕 Composants visualisation
├── services/
│   └── electionApiIntegration.ts   # 🆕 Orchestration API
├── hooks/
│   └── useElectionAnalytics.ts     # 🆕 Hooks analytiques
├── pages/
│   └── ElectionAnalyticsDemoPage.tsx # 🆕 Page exemple
└── test/
    ├── predictions.test.ts          # 🆕 20 tests
    └── anomaly-advanced.test.ts    # 🆕 22 tests

supabase/
├── functions/
│   ├── predict-election-results/   # 🆕 Edge Function
│   ├── detect-anomalies/           # 🆕 Edge Function
│   └── process-results/            # 🆕 Edge Function
└── migrations/
    └── 20260606_rls_and_advanced_features.sql # 🆕 RLS + Functions
```

### 🚀 Déploiement

#### Développement Local
```bash
supabase start
npm run dev
# Accès: http://localhost:5173
```

#### Staging/Production
```bash
# Appliquer les migrations
supabase migration up

# Déployer les Edge Functions
supabase functions deploy

# Build l'application
npm run build

# Preview
npm run preview
```

Voir [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) pour la procédure complète.

### 🔐 Sécurité

- ✅ RLS sur toutes les tables
- ✅ Rôles utilisateur: admin, moderator, observer, user
- ✅ Fonction `has_role()` pour les vérifications
- ✅ Authentification Supabase intégrée

### 📊 Algorithmes Implémentés

#### Prédiction Électorale
- **Moyenne Mobile Simple (SMA)**: Lisse les données bruitées
- **Régression Linéaire**: Projette les résultats finaux
- **Hybride**: Combine SMA + régression pour plus de précision

#### Détection d'Anomalies
- **Z-score** (±2.5σ): Détecte les écarts significatifs
- **IQR** (1.5 × IQR): Identifie les valeurs aberrantes
- **Règles Métier**: Voix > inscrits, taux participation hors limites
- **Moyenne Mobile**: Détecte les changements de tendance

### 📈 Performance

| Opération | Temps |
|-----------|-------|
| Prédiction | < 500ms |
| Anomalies | < 300ms |
| Traitement résultats | < 2s |
| Query DB | < 100ms |

### 🐛 Dépannage

**Problème**: Tests échouent  
**Solution**: Vérifier que Supabase est bien démarré
```bash
supabase status
supabase start
```

**Problème**: Edge Functions retournent 500  
**Solution**: Vérifier les logs
```bash
supabase functions logs
```

**Problème**: Anomalies non détectées  
**Solution**: Vérifier qu'au moins 3-4 bureaux ont des données

### 📞 Support

- **Documentation**: [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- **Déploiement**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **Edge Functions**: [supabase/functions/README.md](./supabase/functions/README.md)
- **Page Exemple**: [src/pages/ElectionAnalyticsDemoPage.tsx](./src/pages/ElectionAnalyticsDemoPage.tsx)

### ✨ Prochain Pas

1. **Lire**: [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
2. **Tester**: `npm run test`
3. **Déployer**: Suivre [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
4. **Explorer**: Voir [src/pages/ElectionAnalyticsDemoPage.tsx](./src/pages/ElectionAnalyticsDemoPage.tsx)

---

**Version**: 1.0.0  
**Date**: 6 juin 2026  
**Status**: ✅ Production Ready
