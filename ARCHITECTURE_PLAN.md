# 🏗️ Architecture & Plans Détaillés

## 📋 Table des matières
1. [Plan Backend](#plan-backend)
2. [Plan Instructions & Prompts](#plan-instructions--prompts)
3. [Plan Modèle ML pour Simulation Temps Réel](#plan-modèle-ml)

---

## 🖥️ Plan Backend

### 1. Architecture Générale

```
┌─────────────────────────────────────────┐
│         CLIENT (React/Vite)             │
├─────────────────────────────────────────┤
│ ├─ Dashboard (KPIs, Charts, Filters)    │
│ ├─ Simulation Page (Temps Réel)         │
│ └─ Anomaly Detection UI                 │
├─────────────────────────────────────────┤
│    Supabase Client SDK (Real-time)      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      SUPABASE (Backend as Service)      │
├──────────────────────────────────────────┤
│ 1. PostgreSQL Database                   │
│    ├─ provinces, circonscriptions       │
│    ├─ resultats_partiels               │
│    ├─ anomalies (détection)            │
│    ├─ predictions (ML)                 │
│    └─ simulation_logs                  │
│                                         │
│ 2. Real-time (WebSocket)               │
│    ├─ Broadcast anomalies              │
│    ├─ Push notifications               │
│    └─ Live results updates             │
│                                         │
│ 3. Edge Functions (API)                │
│    ├─ POST /simulate                   │
│    ├─ POST /detect-anomalies           │
│    ├─ GET /predictions                 │
│    └─ POST /export-report              │
│                                         │
│ 4. Auth & RLS (Row Level Security)     │
│    └─ Role-based access control        │
└──────────────────────────────────────────┘
```

### 2. Tables Principales

#### **provinces**
```sql
CREATE TABLE provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(255) NOT NULL,
  code VARCHAR(10) UNIQUE NOT NULL,
  population INT,
  inscrits_total INT,
  centre_lat DECIMAL(10, 7),
  centre_lng DECIMAL(10, 7),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_provinces_code ON provinces(code);
```

#### **resultats_partiels**
```sql
CREATE TABLE resultats_partiels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id UUID REFERENCES provinces(id),
  circonscription_id UUID,
  candidat_id UUID,
  voix INT NOT NULL DEFAULT 0,
  inscrits INT NOT NULL,
  taux_participation DECIMAL(5, 2),
  timestamp_saisie TIMESTAMP DEFAULT NOW(),
  is_anomalie BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_resultats_province ON resultats_partiels(province_id);
CREATE INDEX idx_resultats_timestamp ON resultats_partiels(timestamp_saisie);
CREATE INDEX idx_resultats_anomalie ON resultats_partiels(is_anomalie);
```

#### **anomalies**
```sql
CREATE TABLE anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resultat_id UUID REFERENCES resultats_partiels(id),
  province_id UUID REFERENCES provinces(id),
  type_anomalie VARCHAR(100) NOT NULL,
  gravite VARCHAR(20) CHECK (gravite IN ('faible', 'moyenne', 'critique')),
  description TEXT,
  valeur_observee DECIMAL(10, 2),
  valeur_attendue DECIMAL(10, 2),
  z_score DECIMAL(5, 2),
  est_lue BOOLEAN DEFAULT FALSE,
  timestamp_detection TIMESTAMP DEFAULT NOW(),
  timestamp_validation TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_anomalies_province ON anomalies(province_id);
CREATE INDEX idx_anomalies_gravite ON anomalies(gravite);
CREATE INDEX idx_anomalies_est_lue ON anomalies(est_lue);
```

#### **predictions**
```sql
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id UUID REFERENCES provinces(id),
  model_version VARCHAR(50),
  participation_predite DECIMAL(5, 2),
  voix_predites JSONB, -- {"candidat_id": voix, ...}
  confiance DECIMAL(3, 2), -- 0-1
  timestamp_prediction TIMESTAMP DEFAULT NOW(),
  timestamp_validation TIMESTAMP,
  is_accurate BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_predictions_province ON predictions(province_id);
CREATE INDEX idx_predictions_model ON predictions(model_version);
```

#### **simulation_logs**
```sql
CREATE TABLE simulation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id VARCHAR(50) UNIQUE,
  province_id UUID REFERENCES provinces(id),
  step INT, -- Étape de la simulation
  state JSONB, -- État complet de la simulation
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_simulation_logs_simulation ON simulation_logs(simulation_id);
```

### 3. Edge Functions (API Endpoints)

#### **POST /api/simulate** - Lancer une simulation
```typescript
// Request
{
  provinces: ["prov1", "prov2"],
  iterations: 100,
  modelVersion: "v1.2",
  parameters: {
    volatility: 0.05,
    seed: 12345
  }
}

// Response
{
  simulationId: "sim_12345",
  status: "running",
  progress: 0,
  estimatedTime: 300
}
```

#### **POST /api/detect-anomalies** - Détecter anomalies
```typescript
// Request
{
  resultat: {
    province_id: "prov1",
    voix: 5000,
    inscrits: 8000,
    taux_participation: 62.5
  },
  historique: [60, 58, 61, 59] // Données historiques
}

// Response
{
  anomalies: [
    {
      type: "zscore_participation",
      severity: "moyen",
      zScore: 2.8,
      description: "Participation écarte de 2.8σ"
    }
  ],
  flags: ["review_required"]
}
```

#### **GET /api/predictions/:provinceId** - Récupérer prédictions
```typescript
// Response
{
  predictions: [
    {
      participation_predite: 62.5,
      confiance: 0.92,
      timestamp: "2026-05-30T10:00:00Z"
    }
  ]
}
```

#### **POST /api/export-report** - Exporter rapport
```typescript
// Request
{
  format: "pdf", // pdf, csv, xlsx
  includeAnomalies: true,
  includePredictions: true
}

// Response: File stream
```

### 4. Real-time Updates (WebSocket)

```typescript
// Subscribe to anomalies
supabase
  .channel('anomalies')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'anomalies' },
    (payload) => {
      console.log('Nouvelle anomalie:', payload.new);
      // Trigger notification dans UI
    }
  )
  .subscribe();

// Subscribe to simulation progress
supabase
  .channel('simulation:sim_12345')
  .on('broadcast', { event: 'progress' }, (payload) => {
    console.log('Progress:', payload.data);
  })
  .subscribe();
```

### 5. Authentification & RLS

```sql
-- Policies
CREATE POLICY "Users can view own provinces"
  ON provinces FOR SELECT
  USING (true); -- Public read

CREATE POLICY "Admins can insert anomalies"
  ON anomalies FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view simulations"
  ON simulation_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);
```

### 6. Performance Optimization

#### Caching Strategy
```typescript
// Redis cache for expensive queries (via Supabase)
const CACHE_KEYS = {
  PARTICIPATION_BY_PROVINCE: 'participation:all',
  ANOMALIES_CRITICAL: 'anomalies:critical',
  PREDICTIONS_LATEST: 'predictions:latest'
};

// TTL
const CACHE_TTL = {
  SHORT: 60, // 1 min - real-time data
  MEDIUM: 300, // 5 min - results
  LONG: 3600 // 1 hour - historical
};
```

#### Database Optimization
```sql
-- Partitioning for large tables
CREATE TABLE resultats_partiels_2026 PARTITION OF resultats_partiels
  FOR VALUES FROM ('2026-01-01') TO ('2026-12-31');

-- Materialized views for aggregations
CREATE MATERIALIZED VIEW mv_participation_by_province AS
  SELECT 
    province_id,
    COUNT(*) as count,
    AVG(taux_participation) as avg_participation,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY taux_participation) as median
  FROM resultats_partiels
  GROUP BY province_id;

-- Refresh strategy
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_participation_by_province;
```

---

## 📝 Plan Instructions & Prompts

### 1. Système de Prompts pour l'IA

#### **System Prompt Principal**
```
Rôle: Analyste Électoral Expert RDC
Expertise: Détection d'anomalies électorales, analyse statistique, prédictions

Contexte:
- Données électorales RDC 2026 (simulation académique)
- Détection anomalies via Z-score, IQR, règles métier
- Prédictions temps réel basées sur données historiques

Responsabilités:
1. Analyser résultats partiels
2. Détecter patterns suspects
3. Générer alertes et rapports
4. Fournir insights actionnables

Contraintes:
- Éviter biais politiques
- Basé sur données, pas opinions
- Transparence méthodologie
```

#### **User Instruction Templates**

**Template 1: Analyse Anomalies**
```
Analyse ces résultats:
Province: {province}
Voix: {votes}
Inscrits: {registered}
Participation: {participation}%

Données historiques participation: {historical_data}

Questions à répondre:
1. Y a-t-il des anomalies statistiques?
2. Quelle est la sévérité?
3. Recommendations?

Format: JSON avec structure standardisée
```

**Template 2: Prédiction Résultats**
```
Prédis les résultats pour:
Province: {province}
Data d'entraînement: {training_data}
Données actuelles: {current_data}

Paramètres:
- Confiance souhaitée: 90%+
- Horizon: 24 heures
- Volatilité estimée: +/- 5%

Retourner:
- Prédiction participation
- Intervalle confiance
- Facteurs d'incertitude
```

**Template 3: Génération Rapport**
```
Génère un rapport exécutif sur:
Période: {date_range}
Anomalies détectées: {count}
Provinces concernées: {provinces}

Structure:
1. Résumé (3-5 lignes)
2. Anomalies critiques (avec contexte)
3. Tendances
4. Recommendations

Ton: Professionnel, neutre, data-driven
```

### 2. Règles de Validation

```typescript
const VALIDATION_RULES = {
  PARTICIPATION: {
    min: 0,
    max: 100.5, // Tolérance 0.5% au-delà
    warning: { above: 95, below: 30 }
  },
  VOIX_VS_INSCRITS: {
    maxRatio: 1.05, // Voix ne doivent pas dépasser 105% inscrits
    criticalRatio: 1.1
  },
  CHANGE_RATE: {
    maxIncrease: 1.5, // +50% max par heure
    maxDecrease: 0.95  // -5% min par heure
  },
  CONSISTENCY: {
    provinceMinData: 10, // Min 10 points pour analyse
    zScoreThreshold: 2.5,
    iqrThreshold: 1.5
  }
};
```

### 3. Feedback Loop

```typescript
interface FeedbackLoop {
  // Utilisateur valide/corrige prédictions
  validatePrediction(prediction_id, is_accurate, notes);
  
  // Système apprend et améliore
  updateModelAccuracy(accuracy_metric);
  
  // Anomalies confirmées améliorent détection
  markAnomalyAsConfirmed(anomaly_id, impact);
}

// Logging pour amélioration continue
const FEEDBACK_LOG = {
  timestamp: Date.now(),
  prediction_id: "pred_123",
  actual_vs_predicted: { participation: [62.5, 60.8] },
  accuracy: 0.97,
  user_feedback: "Confirmed, impactful"
};
```

---

## 🤖 Plan Modèle ML pour Simulation Temps Réel

### 1. Architecture du Modèle

```
┌─────────────────────────────────────┐
│    Input Features                   │
├─────────────────────────────────────┤
│ ├─ Participation (t-1, t-2, ...)   │
│ ├─ Voix par candidat historiques    │
│ ├─ Features temporels (heure, jour) │
│ ├─ Caractéristiques province        │
│ └─ Volatilité estimée               │
└──────────────┬──────────────────────┘
               │
        ┌──────▼──────┐
        │ Preprocessing│
        │ ├─ Normalize │
        │ ├─ Outliers  │
        │ └─ Fillna    │
        └──────┬───────┘
               │
    ┌──────────▼──────────┐
    │  Feature Engineering │
    ├──────────────────────┤
    │ ├─ Rolling averages  │
    │ ├─ Momentum          │
    │ ├─ Seasonality       │
    │ ├─ Lag features      │
    │ └─ Interaction terms │
    └──────────┬───────────┘
               │
    ┌──────────▼──────────────────┐
    │   Ensemble Model            │
    ├─────────────────────────────┤
    │ 1. LSTM (Séries temporelles)│
    │ 2. Random Forest            │
    │ 3. Gradient Boosting        │
    │ 4. Weighted Ensemble        │
    └──────────┬──────────────────┘
               │
        ┌──────▼──────┐
        │   Outputs   │
        ├─────────────┤
        │ ├─ Prédiction│
        │ ├─ Confiance │
        │ └─ Intervalle│
        └─────────────┘
```

### 2. Données d'Entraînement

#### **Dataset Characteristics**
```python
# Requierements
- Minimum: 50 élections / simulations
- Features: 30-50 variables
- Temporalité: 4+ années d'historique
- Granularité: Province-level, Heure-par-heure

# Structure
{
  "timestamp": "2026-05-30T10:00:00Z",
  "province_id": "prov_1",
  
  # Targets
  "participation": 62.5,
  "voix_candidat_a": 45000,
  "voix_candidat_b": 35000,
  
  # Features
  "participation_lag_1h": 60.2,
  "participation_lag_24h": 58.9,
  "participation_rolling_mean_7d": 59.5,
  "hour_of_day": 10,
  "day_of_week": 3,
  "is_weekend": False,
  "province_avg_participation": 61.2,
  "expected_volatility": 0.05,
  "population": 5000000,
  "voting_centers": 1200
}
```

#### **Data Collection Strategy**
```
Phase 1: Historical Data (Offline)
├─ RDC 2011, 2016, 2023 data
├─ Simulations académiques précédentes
└─ Total: ~1000+ observations

Phase 2: Real-time Data (Online)
├─ Collecte durant simulation
├─ Stockage dans simulation_logs
└─ Enrichissement quotidien

Phase 3: Augmentation (Synthetic)
├─ Perturbations aléatoires (±5%)
├─ Combinaisons historiques
└─ Extrapolations prudentes
```

### 3. Pipeline ML

```python
# training_pipeline.py

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, PolynomialFeatures
from sklearn.model_selection import TimeSeriesSplit
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
import joblib

class ElectionPredictionModel:
    def __init__(self):
        self.scaler = StandardScaler()
        self.lstm_model = None
        self.rf_model = None
        self.gb_model = None
        self.weights = [0.4, 0.3, 0.3]  # LSTM, RF, GB
    
    def prepare_data(self, df: pd.DataFrame):
        """Préparation données"""
        # Nettoyage
        df = df.dropna(subset=['participation', 'voix_total'])
        
        # Features énginering
        df['participation_change'] = df['participation'].diff()
        df['participation_ma_7'] = df['participation'].rolling(7).mean()
        df['volatility'] = df['participation'].rolling(7).std()
        
        # Normalization
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        df[numeric_cols] = self.scaler.fit_transform(df[numeric_cols])
        
        return df
    
    def train_lstm(self, X_train, y_train):
        """LSTM pour séries temporelles"""
        model = Sequential([
            LSTM(64, activation='relu', input_shape=(X_train.shape[1], 1)),
            Dense(32, activation='relu'),
            Dense(16, activation='relu'),
            Dense(1)
        ])
        
        model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        model.fit(X_train, y_train, epochs=50, batch_size=32, 
                  validation_split=0.2, verbose=0)
        
        self.lstm_model = model
        return model
    
    def train_ensemble(self, X_train, y_train):
        """Ensemble: RF + GB"""
        self.rf_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=15,
            min_samples_split=5,
            random_state=42
        ).fit(X_train, y_train)
        
        self.gb_model = GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        ).fit(X_train, y_train)
    
    def predict(self, X):
        """Prédiction avec ensemble"""
        predictions = {
            'lstm': self.lstm_model.predict(X),
            'rf': self.rf_model.predict(X),
            'gb': self.gb_model.predict(X)
        }
        
        # Weighted average
        ensemble_pred = (
            self.weights[0] * predictions['lstm'] +
            self.weights[1] * predictions['rf'] +
            self.weights[2] * predictions['gb']
        )
        
        return ensemble_pred
    
    def calculate_confidence(self, X):
        """Calcul confiance via variance"""
        preds = [
            self.lstm_model.predict(X).flatten(),
            self.rf_model.predict(X),
            self.gb_model.predict(X)
        ]
        
        variance = np.var(preds, axis=0)
        confidence = 1 - (variance / (variance + 1))
        
        return confidence
    
    def save(self, path: str):
        """Sauvegarde modèle"""
        joblib.dump({
            'lstm': self.lstm_model,
            'rf': self.rf_model,
            'gb': self.gb_model,
            'scaler': self.scaler,
            'weights': self.weights
        }, f'{path}/model.pkl')

# Usage
model = ElectionPredictionModel()
df = pd.read_csv('election_data.csv')
df = model.prepare_data(df)

X = df.drop(['participation', 'voix_total'], axis=1)
y = df['participation']

model.train_lstm(X, y)
model.train_ensemble(X, y)

pred = model.predict(X_test)
confidence = model.calculate_confidence(X_test)

model.save('./models')
```

### 4. Évaluation & Métriques

```python
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

class ModelEvaluator:
    def __init__(self):
        self.metrics_history = []
    
    def evaluate(self, y_true, y_pred):
        """Calcul métriques"""
        metrics = {
            'mse': mean_squared_error(y_true, y_pred),
            'rmse': np.sqrt(mean_squared_error(y_true, y_pred)),
            'mae': mean_absolute_error(y_true, y_pred),
            'mape': np.mean(np.abs((y_true - y_pred) / y_true)) * 100,
            'r2': r2_score(y_true, y_pred)
        }
        
        return metrics
    
    def backtest(self, df, model, window=100):
        """Backtesting sur données historiques"""
        results = []
        
        for i in range(len(df) - window):
            train_data = df.iloc[:i+window]
            test_data = df.iloc[i+window:i+window+1]
            
            model.train(train_data)
            pred = model.predict(test_data)
            
            results.append({
                'timestamp': test_data.index[0],
                'actual': test_data['participation'].values[0],
                'pred': pred[0],
                'error': abs(pred[0] - test_data['participation'].values[0])
            })
        
        return pd.DataFrame(results)

# Acceptance criteria
ACCEPTANCE_CRITERIA = {
    'mae': 2.0,        # ±2% erreur acceptable
    'rmse': 3.0,       # ±3% RMSE
    'r2': 0.85,        # 85% variance expliquée minimum
    'mape': 5.0,       # 5% MAPE maximum
    'confidence': 0.80 # 80% confiance minimum
}
```

### 5. Déploiement & Monitoring

```typescript
// Deployment strategy

interface ModelDeployment {
  // Versionning
  version: string; // v1.0.0
  created_at: Date;
  models: {
    lstm: Buffer;
    rf: Buffer;
    gb: Buffer;
  };
  
  // Performance baseline
  baseline_metrics: {
    mae: number;
    rmse: number;
    r2: number;
  };
  
  // Health checks
  healthCheck: () => Promise<boolean>;
  
  // A/B testing
  rolloutPercentage: number; // 0-100
}

// Monitoring
const MONITORING = {
  // Prediction drift
  trackPredictionDrift: (pred: number, confidence: number) => {
    if (confidence < 0.7) alert('LOW_CONFIDENCE');
  },
  
  // Model staleness
  checkModelAge: (lastTrained: Date) => {
    const days = (Date.now() - lastTrained.getTime()) / (1000 * 60 * 60 * 24);
    if (days > 7) triggerRetraining();
  },
  
  // Performance degradation
  trackAccuracy: (actual: number, predicted: number) => {
    const error = Math.abs(actual - predicted);
    if (error > ACCEPTANCE_CRITERIA.mae * 2) alert('DEGRADATION');
  }
};
```

### 6. Continuous Improvement

```
┌──────────────────────────────────┐
│   Simulation Temps Réel          │
└────────────────┬─────────────────┘
                 │
        ┌────────▼─────────┐
        │ Collecte Données │
        └────────┬─────────┘
                 │
      ┌──────────▼──────────┐
      │ Stockage Results   │
      │ simulation_logs    │
      └──────────┬─────────┘
                 │
      ┌──────────▼───────────┐
      │ Validation (Accuracy)│
      └──────────┬───────────┘
                 │
      ┌──────────▼──────────────┐
      │ Feedback Loop          │
      │ - User confirmation    │
      │ - Impact assessment    │
      └──────────┬─────────────┘
                 │
      ┌──────────▼──────────────────┐
      │ Model Retraining (Weekly)   │
      │ - New data: ~50 new obs     │
      │ - A/B test new version      │
      │ - Compare metrics           │
      └──────────┬──────────────────┘
                 │
      ┌──────────▼──────────┐
      │ Deployment          │
      │ (Gradual rollout)   │
      └─────────────────────┘
```

---

## 🔄 Résumé des Actions Prioritaires

### Phase 1: Immédiate (1-2 semaines)
- [ ] Compléter Edge Functions pour API /simulate
- [ ] Implémenter Real-time WebSocket
- [ ] Dataset collection & preprocessing
- [ ] LSTM model training

### Phase 2: Court terme (2-4 semaines)
- [ ] Ensemble model (RF + GB) training
- [ ] Backtesting & evaluation
- [ ] Model API deployment
- [ ] Monitoring setup

### Phase 3: Moyen terme (1-2 mois)
- [ ] A/B testing en production
- [ ] Feedback loop implementation
- [ ] Continuous retraining
- [ ] Documentation complète

---

**Document créé**: 2026-05-30  
**Version**: 1.0  
**Auteur**: Architecture Team
