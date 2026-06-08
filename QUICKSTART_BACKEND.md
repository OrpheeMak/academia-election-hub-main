# ⚡ Guide de Démarrage Rapide - Election Hub RDC

## 🎯 Étapes pour Démarrer

### 1️⃣ Installation des Dépendances

```bash
# Installer les dépendances
npm install
# ou
bun install

# Vérifier l'installation
npm run build
```

### 2️⃣ Configuration Supabase

#### A. Variables d'Environnement

Créer `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### B. Créer les Migrations

```bash
# Naviguer au dossier Supabase
cd supabase

# Exécuter la migration complète
supabase db push

# Ou importer directement dans Supabase:
# 1. Aller dans Supabase Dashboard > SQL Editor
# 2. Copier le contenu de: supabase/migrations/20260602_complete_schema.sql
# 3. Exécuter
```

### 3️⃣ Initialisation du Système

#### Option A: Initialisation Automatique (Recommandé)

Dans `src/main.tsx`:
```typescript
import { initializeApplication } from '@/services/systemInitializer';

// Au démarrage
initializeApplication().then(() => {
  console.log('✅ Application initialisée');
}).catch((error) => {
  console.error('❌ Erreur d\'initialisation:', error);
});
```

#### Option B: Initialisation Manuelle

```typescript
import { systemInitializer } from '@/services/systemInitializer';

// Au démarrage du composant
useEffect(() => {
  systemInitializer.initialize();
  
  return () => {
    systemInitializer.shutdown();
  };
}, []);
```

### 4️⃣ Vérifier la Connexion

Aller à `http://localhost:5173/monitoring` et vérifier:
- ✅ Base de Données: Sain
- ✅ API: Sain  
- ✅ Temps Réel: Connecté

---

## 🚀 Lancer la Première Simulation

### 1. Créer une Élection

Via `/administration`:
1. Aller à l'onglet "Élections"
2. Remplir le formulaire
3. Cliquer "Créer Élection"

### 2. Lancer la Simulation

```typescript
import { systemInitializer } from '@/services/systemInitializer';

// Lancer la simulation
await systemInitializer.startSimulation({
  duration_seconds: 3600,      // 1 heure
  batch_interval_ms: 2000,     // Update tous les 2s
  anomaly_injection_rate: 0.05 // 5% d'anomalies
});
```

Ou via l'interface `/administration`:
1. Aller à l'onglet "Simulation"
2. Cliquer "Démarrer"
3. Observer les données en temps réel

### 3. Vérifier les Résultats

- **Dashboard** (`/dashboard`): Vue globale
- **Statistics** (`/statistics`): Analyse détaillée
- **Reports** (`/reports`): Rapports générés
- **Monitoring** (`/monitoring`): Santé du système

---

## 📊 Pages Disponibles

### Navigation

```
/                    → Page d'accueil
/dashboard          → Dashboard principal (données temps-réel)
/statistics         → Statistiques détaillées et graphiques
/reports            → Rapports et téléchargements
/administration     → Gestion du système et simulations
/monitoring         → Surveillance de la santé du système
/simulation         → Simulation avancée
```

### Qu'est-ce que chaque page fait?

| Page | Fonction |
|------|----------|
| **Dashboard** | Vue synthétique avec KPIs, cartes, anomalies |
| **Statistics** | Analyses détaillées, tendances, comparaisons |
| **Reports** | Génération et téléchargement de rapports |
| **Administration** | Créer élections, configurer simulations |
| **Monitoring** | Vérifier santé système, performances, alertes |

---

## 🎮 Utilisation des Services

### Backend Orchestrator

```typescript
import { backendOrchestrator } from '@/services/backendOrchestrator';

// Récupérer l'élection active
const election = await backendOrchestrator.getCurrentElection();

// Récupérer les stats
const stats = await backendOrchestrator.getGlobalStats(election.data.id);

// Récupérer les anomalies
const anomalies = await backendOrchestrator.getAnomalies(election.data.id);

// Récupérer les résultats d'une province
const resultats = await backendOrchestrator.getResultatsParProvince(provinceId);
```

### Voting Data Generator

```typescript
import { votingDataGenerator } from '@/services/votingDataGenerator';

// Générer un lot de votes
const batch = votingDataGenerator.generateVotingBatch(
  config,
  timeIndex,
  provinceIds,
  candidateIds
);

console.log('Votes:', batch.votes.length);
console.log('Anomalies:', batch.anomalies.length);
console.log('Stats:', batch.stats);

// Réinitialiser
votingDataGenerator.reset();
```

### Communication Rules

```typescript
import { communicationRulesEngine } from '@/services/communicationRules';

// Connecter
communicationRulesEngine.connect();

// Émettre un événement
await communicationRulesEngine.emitEvent(
  'result_received',
  votingData,
  electionId
);

// Obtenir les stats
const stats = communicationRulesEngine.getStats();

// Déconnecter
communicationRulesEngine.disconnect();
```

### Hooks React

```typescript
import { 
  useBackendIntegration,
  useRealtimeStats,
  useAnomaliesMonitoring,
  useCommunicationStatus
} from '@/hooks/useIntegration';

// Dans un composant
function MyComponent() {
  const { stats, isConnected } = useBackendIntegration();
  const { participationTrend } = useRealtimeStats(electionId);
  const { anomalies } = useAnomaliesMonitoring(electionId);
  const commStats = useCommunicationStatus();

  return (
    <div>
      {isConnected ? '✅ Connecté' : '❌ Déconnecté'}
      <p>Voix: {stats?.totalVoix}</p>
      <p>Participation: {stats?.participationMoyenne}%</p>
    </div>
  );
}
```

---

## 🐛 Dépannage

### Problème: "Aucune élection active"

**Solution:**
1. Aller à `/administration`
2. Créer une nouvelle élection
3. Remplir tous les champs
4. Cliquer "Créer"

### Problème: "Impossible de se connecter à Supabase"

**Vérifier:**
- [ ] Variables d'environnement correctes dans `.env.local`
- [ ] Projet Supabase créé et actif
- [ ] API Key correcte
- [ ] Migrations BD créées

```bash
# Vérifier les variables
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Réinitialiser les migrations
supabase db reset
```

### Problème: "Temps-réel déconnecté"

**Solution:**
1. Aller à `/monitoring`
2. Vérifier l'état: "Temps Réel"
3. Si "Déconnecté", attendre ou rafraîchir
4. Vérifier les erreurs console

```typescript
// Debug dans la console
import { communicationRulesEngine } from '@/services/communicationRules';
communicationRulesEngine.getStats();
```

---

## 📈 Workflow Typique

### 1. Démarrage

```bash
npm run dev
# L'application démarre à http://localhost:5173
```

### 2. Configuration

- Créer une élection via `/administration`
- Ajouter des provinces et candidats
- Configurer les simulations

### 3. Lancer la Simulation

```
/administration → Onglet "Simulation" → "Démarrer"
```

### 4. Monitorer en Temps Réel

```
/dashboard       → Vue générale
/statistics      → Analyse détaillée
/monitoring      → Santé du système
```

### 5. Générer des Rapports

```
/reports → Sélectionner rapport → Télécharger
```

### 6. Analyser les Résultats

```
/reports → Onglet "Anomalies Détectées"
```

---

## 🔐 Sécurité

### Row Level Security (RLS) Activé

Les tables sont protégées:
- Elections: Public (lecture), Authentifié (modification)
- Résultats: Public (lecture), Authentifié (insertion)
- Anomalies: Public (lecture)

### Authentification

Pour modifier les données:
1. S'authentifier auprès de Supabase
2. Les permissions sont vérifiées automatiquement
3. Les opérations non autorisées sont bloquées

---

## 📝 Logs et Debug

### Voir les Logs

Ouvrir la console du navigateur (F12):
```
🚀 Démarrage de l'initialisation du système...
📡 Système temps-réel connecté
🔄 Abonnements établis
✅ Système initialisé avec succès
```

### Activer le Debug Verbose

```typescript
// Dans le code
console.log = function(msg) {
  if (typeof msg === 'string') {
    // Ajouter custom logging
  }
  // Appel original
  console.debug(msg);
};
```

---

## ✅ Checklist Première Utilisation

- [ ] Installer les dépendances
- [ ] Configurer `.env.local`
- [ ] Créer les migrations BD
- [ ] Lancer `npm run dev`
- [ ] Accéder à `http://localhost:5173`
- [ ] Vérifier `/monitoring` (système sain)
- [ ] Créer une élection via `/administration`
- [ ] Lancer une simulation
- [ ] Vérifier les données sur `/dashboard`
- [ ] Générer un rapport sur `/reports`

---

## 🎓 Ressources

- **Backend Orchestrator**: `src/services/backendOrchestrator.ts`
- **Hooks**: `src/hooks/useIntegration.ts`
- **Guide complet**: `BACKEND_INTEGRATION_GUIDE.md`
- **Migrations BD**: `supabase/migrations/20260602_complete_schema.sql`

---

## 🚀 Prochaines Étapes

1. **Personnaliser les provinces** - Ajouter vos données RDC
2. **Configurer les candidats** - Ajouter les véritables candidats
3. **Ajuster les règles** - Adapter les anomalies détectées
4. **Intégrer auth** - Ajouter l'authentification Supabase
5. **Déployer** - Publier sur production

---

**Vous êtes prêt! 🎉 Commencez par `npm run dev`**
