# 🚀 Guide Complet d'Intégration Backend - Election Hub RDC

## 📋 Vue d'Ensemble

Ce guide explique comment utiliser l'intégration complète du backend pour **Election Hub RDC**. Le système est entièrement automatisé avec:

- ✅ **Backend Orchestrator** - Gestion centralisée de toutes les opérations
- ✅ **Voting Data Generator** - Génération de données électorales fictives réalistes
- ✅ **Communication Rules Engine** - Synchronisation temps-réel et règles de communication
- ✅ **System Initializer** - Initialisation et lifecycle management
- ✅ **Pages Annexes** - Statistiques, Rapports, Administration, Monitoring

---

## 🔧 Architecture Technique

### Services Principaux

```
┌─────────────────────────────────────────┐
│         React App (Frontend)            │
├─────────────────────────────────────────┤
│  Pages: Dashboard, Statistics, Reports  │
│  Components: Charts, Cards, Maps        │
│  Hooks: useBackendIntegration, etc      │
├─────────────────────────────────────────┤
│      Integration Layer (Services)       │
├────┬──────────────┬─────────┬──────────┤
│    │              │         │          │
│    ↓              ↓         ↓          ↓
│  Backend       Voting      Communication System
│  Orchestrator  Generator   Rules Engine   Initializer
└──────────────────────────────────────────┘
         │
         ↓
    ┌─────────────┐
    │  Supabase   │
    │  (Backend)  │
    └─────────────┘
```

### Flux de Données

```
Election Data
    ↓
[Backend Orchestrator]  ← Gère DB + API
    ↓
[Voting Data Generator] ← Crée données fictives
    ↓
[Communication Engine]  ← Diffuse updates
    ↓
[UI Components]         ← Affiche en temps-réel
```

---

## 🎯 Utilisation des Services

### 1. Backend Orchestrator

**Fichier:** `src/services/backendOrchestrator.ts`

Le service central qui gère **TOUS** les appels au backend.

#### Fonctions Principales:

```typescript
// Élections
await backendOrchestrator.getAllElections();
await backendOrchestrator.getCurrentElection();
await backendOrchestrator.createElection(data);

// Provinces
await backendOrchestrator.getProvincesByElection(electionId);
await backendOrchestrator.getProvinceStats(provinceId);

// Candidats
await backendOrchestrator.getCandidatsByElection(electionId);

// Résultats
await backendOrchestrator.getResultatsParProvince(provinceId);
await backendOrchestrator.insertResultat(votingFlowData);
await backendOrchestrator.getGlobalStats(electionId);

// Anomalies
await backendOrchestrator.getAnomalies(electionId, filters);
await backendOrchestrator.flagAnomaly(anomalyId, status);

// Temps-Réel
backendOrchestrator.subscribeToResults(electionId, callback);
backendOrchestrator.subscribeToAnomalies(electionId, callback);

// Simulations
await backendOrchestrator.startSimulation(config);
```

#### Exemple d'Utilisation:

```typescript
// Récupérer l'élection active
const electionRes = await backendOrchestrator.getCurrentElection();
if (electionRes.success && electionRes.data) {
  const election = electionRes.data;
  console.log('Élection active:', election.nom);

  // Récupérer les stats
  const statsRes = await backendOrchestrator.getGlobalStats(election.id);
  console.log('Total voix:', statsRes.data?.totalVoix);
}
```

---

### 2. Voting Data Generator

**Fichier:** `src/services/votingDataGenerator.ts`

Génère des flux de votes fictifs réalistes avec anomalies injectées.

#### Fonctions Principales:

```typescript
// Générer un lot de votes
const batch = votingDataGenerator.generateVotingBatch(
  config,           // Configuration de simulation
  timeIndex,        // Index temporel (0 à duration_seconds)
  provinces,        // IDs des provinces
  candidates        // IDs des candidats
);

// Batch contient:
// - votes: VotingFlowData[]
// - anomalies: VotingFlowData & { anomaly_type, anomaly_severity }[]
// - stats: { totalVotes, avgParticipation, anomalyCount, anomalyRate }

// Réinitialiser l'historique
votingDataGenerator.reset();
```

#### Patterns Simulés:

- **Participation:** Varie selon l'heure (matin faible, midi-après-midi élevé, soir)
- **Distribution des votes:** Réaliste avec 1-2 candidats dominants
- **Anomalies:** Types réalistes (participation anormale, concentration excessive, etc)

#### Exemple:

```typescript
const config: SimulationConfig = {
  election_id: 'uuid',
  duration_seconds: 3600,
  batch_interval_ms: 2000,
  anomaly_injection_rate: 0.05,
  participation_range: { min: 0.3, max: 0.9 }
};

const batch = votingDataGenerator.generateVotingBatch(
  config,
  timeIndex,
  provinceIds,
  candidateIds
);

// Insérer les votes dans la BD
for (const vote of batch.votes) {
  await backendOrchestrator.insertResultat(vote);
}
```

---

### 3. Communication Rules Engine

**Fichier:** `src/services/communicationRules.ts`

Gère les règles de communication et la synchronisation temps-réel.

#### Règles Intégrées:

| Événement | Fréquence | Priorité | Action |
|-----------|-----------|----------|--------|
| Anomalies | Immédiat | CRITIQUE | Notification push + broadcast |
| Résultats anormaux | Par lot (10) | HAUTE | Aggrégation + update dashboard |
| Participation | Throttle 5s | HAUTE | Broadcast mise à jour |
| Synchronisation | 30s | MOYENNE | Sync state global |
| Alertes critiques | Immédiat + retry | CRITIQUE | Notification + log |

#### Fonctions Principales:

```typescript
// Émettre un événement
await communicationRulesEngine.emitEvent(
  'event_name',
  data,
  electionId
);

// Ajouter une règle personnalisée
communicationRulesEngine.addRule({
  id: 'custom_rule',
  event: 'custom_event',
  priority: 'high',
  frequency: 'throttled',
  throttleMs: 5000,
  conditions: (data) => data.custom_field > threshold,
  action: async (data) => {
    // Votre logique
  }
});

// Obtenir les stats
const stats = communicationRulesEngine.getStats();
// { totalEvents, pendingEvents, failedEvents, queueSize, connectionStatus }

// Gérer la connexion
communicationRulesEngine.connect();
communicationRulesEngine.disconnect();
```

---

### 4. System Initializer

**Fichier:** `src/services/systemInitializer.ts`

Initialise et gère le lifecycle complet du système.

#### Utilisation:

```typescript
// Initialiser le système
const result = await systemInitializer.initialize();
if (result.success) {
  console.log('Système prêt:', result.config);
}

// Démarrer une simulation
await systemInitializer.startSimulation({
  duration_seconds: 3600,
  batch_interval_ms: 2000,
  anomaly_injection_rate: 0.05
});

// Obtenir le statut
const status = systemInitializer.getStatus();
console.log('Initialized:', status.initialized);

// Arrêter proprement
await systemInitializer.shutdown();
```

---

## 🪝 Hooks d'Intégration

**Fichier:** `src/hooks/useIntegration.ts`

Hooks React pour simplifier l'intégration.

### useBackendIntegration()

```typescript
const {
  initialized,
  error,
  electionId,
  isConnected,
  stats,
  reconnect,
  disconnect,
  updateStats
} = useBackendIntegration();

// Utilisation:
useEffect(() => {
  if (isConnected) {
    updateStats();
  }
}, [isConnected]);
```

### useAnomaliesMonitoring(electionId)

```typescript
const {
  anomalies,
  loading,
  loadAnomalies,
  resolveAnomaly,
  investigateAnomaly,
  dismissAsfalse
} = useAnomaliesMonitoring(electionId);
```

### useRealtimeStats(electionId)

```typescript
const {
  stats,
  participationTrend,
  loadStats
} = useRealtimeStats(electionId);
```

### useCommunicationStatus()

```typescript
const commStats = useCommunicationStatus();
// { totalEvents, pendingEvents, queueSize, ... }
```

---

## 📄 Pages Ajoutées

### 1. **Statistics** (`/statistics`)

Page d'analyse complète avec:
- KPIs globaux (voix, participation, anomalies)
- Tendances de participation
- Résultats par province
- Top candidats

### 2. **Reports** (`/reports`)

Page de génération de rapports:
- Résumé exécutif
- Rapport d'anomalies détaillé
- Résultats par province
- Classement des candidats
- Anomalies détectées

### 3. **Administration** (`/administration`)

Gestion complète du système:
- Création d'élections
- Configuration et gestion des simulations
- Statistiques de communication
- État des règles

### 4. **Monitoring** (`/monitoring`)

Surveillance du système:
- Santé du système (DB, API, Temps-réel)
- Métriques de performance
- Alertes système
- Disponibilité

---

## 🗄️ Base de Données

**Fichier:** `supabase/migrations/20260602_complete_schema.sql`

### Tables Principales:

- **elections** - Élections
- **provinces** - Provinces et régions
- **circonscriptions** - Circonscriptions électorales
- **bureaux_vote** - Bureaux de vote
- **candidats** - Candidats
- **resultats_partiels** - Résultats vote par vote
- **anomalies** - Anomalies détectées
- **predictions** - Prédictions ML
- **simulation_logs** - Logs de simulation
- **alertes** - Alertes système

### Vues:

- **v_participation_province** - Participation par province
- **v_top_candidates_province** - Top candidats par province
- **v_resultats_globaux** - Résultats agrégés globaux

### Fonctions:

- `detect_anomaly()` - Détecte et enregistre une anomalie
- `calculate_province_participation()` - Calcule la participation
- `get_top_candidates()` - Récupère les top N candidats

---

## 🎛️ Configuration

### Démarrage de l'Application:

```typescript
// Dans main.tsx ou App.tsx
import { initializeApplication, cleanupApplication } from '@/services/systemInitializer';

// Au démarrage
useEffect(() => {
  initializeApplication();
  
  return () => {
    cleanupApplication();
  };
}, []);
```

### Configuration de Simulation:

```typescript
const config: SimulationConfig = {
  election_id: 'your-election-id',
  duration_seconds: 3600,      // 1 heure
  batch_interval_ms: 2000,      // Update tous les 2s
  anomaly_injection_rate: 0.05, // 5% d'anomalies
  participation_range: {
    min: 0.30,  // 30%
    max: 0.90   // 90%
  }
};

await systemInitializer.startSimulation(config);
```

---

## 🚀 Quick Start

### 1. Initialiser le système:

```typescript
const result = await systemInitializer.initialize();
if (!result.success) {
  console.error('Erreur:', result.error);
}
```

### 2. Utiliser dans un composant:

```typescript
import { useBackendIntegration, useRealtimeStats } from '@/hooks/useIntegration';

export function MyComponent() {
  const { electionId, stats } = useBackendIntegration();
  const { participationTrend } = useRealtimeStats(electionId);

  return (
    <div>
      <p>Voix totales: {stats?.totalVoix}</p>
      <p>Participation: {stats?.participationMoyenne}%</p>
    </div>
  );
}
```

### 3. Naviguer vers les nouvelles pages:

```
/statistics   - Statistiques complètes
/reports      - Génération de rapports
/administration - Gestion du système
/monitoring   - Surveillance temps-réel
```

---

## 🔍 Debugging

### Logs:

```typescript
// Tous les événements sont loggés dans la console
// - 🚀 Initialisation
// 📊 Résultats
// ⚠️ Anomalies
// 📡 Broadcasting
// 🔄 Synchronisation
```

### Vérifier le statut:

```typescript
const status = systemInitializer.getStatus();
console.log('Initialized:', status.initialized);
console.log('Config:', status.config);
console.log('Subscriptions:', status.subscriptionsCount);
```

### Monitoring en temps-réel:

Accéder à `/monitoring` pour voir:
- Santé du système
- Performances
- Alertes
- Statistiques de communication

---

## ✅ Checklist Déploiement

- [ ] Créer les migrations BD via Supabase CLI
- [ ] Configurer les variables d'environnement
- [ ] Tester l'initialisation du système
- [ ] Vérifier les souscriptions temps-réel
- [ ] Valider les simulations
- [ ] Tester les pages annexes
- [ ] Vérifier les alertes
- [ ] Load testing du système

---

## 📞 Support & Ressources

- **Backend Orchestrator**: Gestion centralisée
- **Voting Data Generator**: Données fictives réalistes
- **Communication Rules**: Synchronisation temps-réel
- **System Initializer**: Lifecycle management
- **Hooks**: Intégration React facile
- **Pages**: UI complète et fonctionnelle

---

**✨ Système complètement automatisé et prêt pour la production!**
