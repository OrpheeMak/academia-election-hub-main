# Guide d'Intégration Complète - Academia Election Hub

## 📋 Vue d'ensemble

Ce document décrit l'intégration complète de la documentation technique en code fonctionnel, incluant:
- **Modules analytiques**: Prédictions électorales et détection d'anomalies
- **Composants visuels**: Charts interactifs avec Recharts
- **Backend Supabase**: Edge Functions, RLS et migrations SQL
- **API d'intégration**: Service unifié pour orchestrer toutes les opérations
- **Tests**: Suite complète des modules analytiques

---

## 🏗️ Architecture

### Frontend (React + TypeScript)
```
src/
├── lib/
│   ├── predictions.ts           # SMA, régression linéaire, prédictions
│   ├── anomaly-advanced.ts      # Z-score, IQR, règles métier
│   └── utils.ts
├── components/
│   └── dashboard/
│       └── Charts.tsx           # DashboardChart, ParticipationChart, AnomalyIndicator
├── services/
│   └── electionApiIntegration.ts # Orchestration API + Edge Functions
├── hooks/
│   └── useElectionAnalytics.ts  # Hooks React pour analytics
└── test/
    ├── predictions.test.ts       # Tests SMA, régression, prédictions
    └── anomaly-advanced.test.ts # Tests anomalies
```

### Backend (Supabase)
```
supabase/
├── migrations/
│   ├── 20260602_complete_schema.sql          # Schéma principal
│   └── 20260606_rls_and_advanced_features.sql # RLS + Fonctions avancées
└── functions/
    ├── predict-election-results/index.ts    # Edge Function prédictions
    ├── detect-anomalies/index.ts            # Edge Function anomalies
    └── process-results/index.ts             # Edge Function traitement
```

---

## 📦 Modules Implémentés

### 1. Module de Prédiction (`src/lib/predictions.ts`)

**Fonctions principales:**

#### `calculateSMA(data, period)`
Calcule la Moyenne Mobile Simple (SMA) pour lisser les tendances.

```typescript
const data = [
  { timestamp: '2026-06-01', votes: 1000 },
  { timestamp: '2026-06-02', votes: 1100 },
  { timestamp: '2026-06-03', votes: 1050 },
];
const sma = calculateSMA(data, 2);
// Résultat: [NaN, 1050, 1075]
```

#### `linearRegression(data)`
Calcule la régression linéaire entre % bureaux dépouillés et votes.

```typescript
const data = [
  { x: 0.2, y: 200 },  // 20% bureaux, 200 voix
  { x: 0.4, y: 400 },  // 40% bureaux, 400 voix
  { x: 0.6, y: 600 },  // 60% bureaux, 600 voix
  { x: 0.8, y: 800 },  // 80% bureaux, 800 voix
];
const result = linearRegression(data);
// { slope: 1000, intercept: 0, r_squared: 1.0, predicted_total: 1000, ... }
```

#### `predictFinalScore(historical, current)`
Prédit le score final en combinant SMA et régression linéaire.

```typescript
const prediction = predictFinalScore([], currentData);
// {
//   candidat_id: '',
//   score_predit: 1050,
//   intervalle_bas: 945,
//   intervalle_haut: 1155,
//   confidence: 0.95,
//   methode: 'hybride'
// }
```

### 2. Module de Détection d'Anomalies (`src/lib/anomaly-advanced.ts`)

**Méthodes de détection:**

#### Z-score (±2.5σ)
Détecte les valeurs s'écartant de ±2.5 écarts-types de la moyenne.

#### IQR (Écart Interquartile)
Identifie les valeurs en dehors de `[Q1 - 1.5×IQR, Q3 + 1.5×IQR]`.

#### Règles Métier
- `checkParticipationRate()`: Vérifie 10% ≤ taux ≤ 95%
- `checkTotalVotes()`: Vérifie voix ≤ 1.05 × inscrits

#### Moyenne Mobile
Détecte les écarts significatifs par rapport à la SMA.

**Usage:**

```typescript
const anomalies = detectAllAnomalies(participationByBureau, config);

// Résultat: tableau d'Anomaly avec:
// - type: 'zscore' | 'iqr' | 'participation_rate' | 'total_votes' | 'moving_average'
// - severity: 'low' | 'medium' | 'high' | 'critical'
// - raison: description texte compréhensible
// - details: données brutes (zscore, q1, q3, etc.)
```

### 3. Composants de Visualisation (`src/components/dashboard/Charts.tsx`)

#### `<DashboardChart>`
Affiche la répartition des voix par candidat.

```typescript
<DashboardChart
  data={[
    { candidat: 'Alice', voix: 1500, pourcentage: 45.5 },
    { candidat: 'Bob', voix: 1200, pourcentage: 36.4 },
  ]}
  title="Résultats nationaux"
  chartType="bar" // ou 'line', 'pie'
  showPercentage={true}
/>
```

#### `<ParticipationChart>`
Affiche l'évolution du taux de participation dans le temps.

```typescript
<ParticipationChart
  data={[
    { timestamp: '2026-06-01T10:00:00Z', taux: 5.2 },
    { timestamp: '2026-06-01T12:00:00Z', taux: 15.8 },
  ]}
  title="Participation en temps réel"
  showTrend={true}
/>
```

#### `<AnomalyIndicator>`
Affiche les anomalies détectées avec sévérité visuelle.

```typescript
<AnomalyIndicator
  anomalies={detectedAnomalies}
  showDetails={true}
  maxVisible={5}
/>
```

---

## 🚀 Edge Functions (Backend)

### 1. `/functions/v1/predict-election-results`

Calcule les prédictions côté serveur avec accès aux données complètes.

**Request:**
```json
{
  "election_id": "uuid",
  "province_id": "uuid (optional)",
  "candidat_id": "uuid (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "predictions_count": 5,
  "predictions": [
    {
      "candidat_id": "uuid",
      "score_predit": 1050,
      "intervalle_bas": 945,
      "intervalle_haut": 1155,
      "confidence": 0.95,
      "method": "hybrid_sma_regression"
    }
  ]
}
```

### 2. `/functions/v1/detect-anomalies`

Détecte automatiquement les anomalies et les enregistre.

**Request:**
```json
{
  "election_id": "uuid",
  "province_id": "uuid (optional)",
  "method": "all" | "zscore" | "iqr" | "business_rule"
}
```

### 3. `/functions/v1/process-results`

Orchestre l'importation des résultats, calcul des taux et déclenchement des analyses.

**Request:**
```json
{
  "election_id": "uuid",
  "results": [
    {
      "bureau_id": "uuid",
      "candidat_id": "uuid",
      "voix": 150,
      "inscrits": 1000,
      "province_id": "uuid"
    }
  ],
  "auto_detect_anomalies": true,
  "auto_predict": true
}
```

---

## 📊 Service d'Intégration API

### `electionApiService`

Orchestrateur principal pour tous les appels API backend.

#### Principales méthodes:

```typescript
// Traiter les résultats (déclenche anomalies + prédictions)
const result = await electionApiService.processResults({
  election_id: 'xyz',
  results: [...],
  auto_detect_anomalies: true,
  auto_predict: true
});

// Prédictions
const predictions = await electionApiService.predictElectionResults({
  election_id: 'xyz',
  province_id: 'p1'
});

// Anomalies
const anomalies = await electionApiService.detectAnomalies({
  election_id: 'xyz',
  method: 'all'
});

// S'abonner aux changements en temps réel
electionApiService.subscribeToAnomalies(electionId, (anomaly) => {
  console.log('Nouvelle anomalie:', anomaly);
});
```

---

## 🎣 Hooks React

### `useElectionAnalytics(electionId)`

Orchestre l'état des prédictions, anomalies et traitement.

```typescript
const {
  predictions,
  anomalies,
  processingStatus,
  overallSeverity,
  predictionQuality,
  isLoading,
  error,
  processResults,
  triggerPredictions,
  triggerAnomalyDetection,
} = useElectionAnalytics(electionId);

// Utilisation
useEffect(() => {
  if (newResults) {
    processResults(newResults);
  }
}, [newResults]);
```

### `useElectionAlerts(electionId)`

Gère les alertes et notifications.

```typescript
const {
  alerts,
  criticalAlerts,
  unreadCount,
  markAsRead,
  createAlert,
} = useElectionAlerts(electionId);
```

---

## 🔐 Sécurité (RLS)

Toutes les tables ont des politiques Row Level Security (RLS):

| Table | Lecture | Écriture |
|-------|---------|----------|
| provinces | 🔓 Public | 👤 Admin |
| candidats | 🔓 Public | 👤 Admin |
| resultats_partiels | 🔓 Public | 👤 Moderator/Admin |
| anomalies | 🔓 Public | 👤 Admin |
| predictions | 🔓 Public | 👤 Admin |
| user_roles | 👤 Own/Admin | 👤 Admin |

**Fonction de vérification de rôle:**
```sql
SELECT has_role(user_id, 'admin');
SELECT has_role(user_id, 'moderator');
```

---

## 🧪 Tests

### Exécuter les tests:

```bash
# Tous les tests
npm run test

# Interface visuelle
npm run test:ui

# Watch mode
npm run test -- --watch
```

### Couverture:

- ✅ `calculateSMA()`: 4 tests
- ✅ `linearRegression()`: 3 tests
- ✅ `calculateZScore()`: 4 tests
- ✅ `calculateQuartiles()`: 2 tests
- ✅ `detectOutliers()`: 3 tests
- ✅ `detectZScoreAnomalies()`: 3 tests
- ✅ `detectIQRAnomalies()`: 3 tests
- ✅ `checkParticipationRate()`: 4 tests
- ✅ `checkTotalVotes()`: 3 tests
- ✅ `detectMovingAveragAnomalies()`: 2 tests
- ✅ `evaluateOverallSeverity()`: 4 tests

---

## 🚀 Déploiement

### 1. Appliquer les migrations Supabase

```bash
supabase migration up
# ou via la CLI: supabase db push
```

### 2. Déployer les Edge Functions

```bash
supabase functions deploy predict-election-results
supabase functions deploy detect-anomalies
supabase functions deploy process-results
```

### 3. Vérifier les permissions

```sql
-- Vérifier RLS
SELECT * FROM pg_policies WHERE tablename = 'resultats_partiels';

-- Vérifier les fonctions
SELECT proname FROM pg_proc WHERE proname LIKE 'calculate_%' OR proname LIKE 'detect_%';
```

### 4. Build frontend

```bash
npm run build
npm run preview
```

---

## 📝 Exemples d'utilisation

### Exemple 1: Traiter un lot de résultats

```typescript
async function importResults() {
  const results = [
    {
      bureau_id: 'bureau-001',
      candidat_id: 'candidat-001',
      voix: 150,
      inscrits: 1000,
      province_id: 'kinshasa'
    },
    // ... plus de résultats
  ];

  const result = await electionApiService.processResults({
    election_id: currentElectionId,
    results,
    auto_detect_anomalies: true,
    auto_predict: true
  });

  console.log(`✓ ${result.results_inserted} résultats importés`);
  console.log(`✓ ${result.anomalies.anomalies_count} anomalies détectées`);
  console.log(`✓ ${result.predictions.predictions_count} prédictions générées`);
}
```

### Exemple 2: Afficher les analyses dans un composant

```typescript
function ElectionDashboard() {
  const {
    predictions,
    anomalies,
    processingStatus,
    overallSeverity,
  } = useElectionAnalytics(electionId);

  return (
    <div className="space-y-6">
      <DashboardChart data={formatPredictions(predictions)} />
      <ParticipationChart data={formatParticipation(predictions)} />
      <AnomalyIndicator anomalies={anomalies} />
      
      <div className="alert">
        Sévérité globale: <span className={`severity-${overallSeverity}`}>
          {overallSeverity.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
```

### Exemple 3: S'abonner aux anomalies en temps réel

```typescript
useEffect(() => {
  const subscription = electionApiService.subscribeToAnomalies(
    electionId,
    (anomaly) => {
      console.log('🚨 Nouvelle anomalie détectée:', anomaly);
      
      // Créer une alerte si critique
      if (anomaly.gravite === 'critique') {
        electionApiService.createAlert(
          electionId,
          'anomaly',
          'Anomalie critique détectée',
          anomaly.description,
          'critical'
        );
      }
    }
  );

  return () => subscription.unsubscribe();
}, [electionId]);
```

---

## 🐛 Dépannage

### Problème: Edge Functions retournent 500

**Solution:**
```bash
# Vérifier les logs
supabase functions logs predict-election-results

# Vérifier les variables d'environnement
supabase secrets list
```

### Problème: Les anomalies ne sont pas détectées

**Vérifier:**
1. Les résultats ont `taux_participation` non null
2. Au moins 3-4 bureaux pour les calculs statistiques
3. Les seuils ne sont pas trop restrictifs: `detectZScoreAnomalies(data, 2.5)`

### Problème: Les prédictions sont nulles

**Vérifier:**
1. Au moins 2 points temporels
2. Les données `bureaux_depouilles` sont entre 0 et 1
3. Les valeurs de votes augmentent monotoniquement

---

## 📚 Références

- Prédictions: [Régression linéaire](https://en.wikipedia.org/wiki/Simple_linear_regression)
- Anomalies: [Z-score](https://en.wikipedia.org/wiki/Standard_score), [IQR](https://en.wikipedia.org/wiki/Interquartile_range)
- Recharts: [Documentation](https://recharts.org/)
- Supabase: [Documentation](https://supabase.com/docs)

---

## ✅ Checklist de déploiement

- [ ] Migrations Supabase appliquées
- [ ] Edge Functions déployées
- [ ] RLS configurée et testée
- [ ] Tests locaux réussis
- [ ] Build production sans erreurs
- [ ] Variables d'environnement configurées
- [ ] Logs Supabase vérifiés
- [ ] Alertes configurées
- [ ] Documentation mise à jour
- [ ] Équipe notifiée

---

**Dernière mise à jour**: 6 juin 2026  
**Version**: 1.0.0  
**Statut**: ✅ Prêt pour production
