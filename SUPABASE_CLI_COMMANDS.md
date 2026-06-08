# ⚡ SUPABASE QUICK START CLI - Commandes Directes

**Pour les utilisateurs avancés qui préfèrent les commandes CLI**

---

## 📌 Prerequisites

```bash
# Installer Supabase CLI
npm install -g supabase-cli
# Ou avec bun
bun install -g supabase-cli

# Vérifier
supabase --version
```

---

## 🚀 OPTION 1: Setup CLI Local (Avec Docker)

### Étape 1: Initialiser Supabase Localement
```bash
cd d:\Projet\academia-election-hub-main

# Initialiser projet Supabase
supabase init

# Résultat:
# ✅ Created supabase folder structure
```

### Étape 2: Démarrer Services Locaux (Docker requis)
```bash
# Démarrer Supabase localement
supabase start

# Résultat:
# Started supabase local development server
# API URL: http://127.0.0.1:54321
# DB Connection: postgresql://postgres:postgres@127.0.0.1:5432/postgres
# Dashboard: http://127.0.0.1:54323
```

### Étape 3: Exécuter les Migrations
```bash
# Créer les tables
supabase db pull

# Ou importer les scripts SQL
supabase db push
```

---

## 🌍 OPTION 2: Setup Cloud Supabase (Recommandé au Départ)

### Étape 1: Créer un Projet Cloud
```bash
# Authentifier avec Supabase
supabase login

# Résultat:
# ✅ Authentification réussie
```

### Étape 2: Lier à Votre Projet Supabase
```bash
# Récupérer ID du projet depuis: https://app.supabase.com/projects
# Format: abc123defg

# Lier le projet
supabase link --project-ref abc123defg

# Résultat:
# ✅ Linked to project
```

### Étape 3: Configurer Secrets
```bash
# Ajouter secrets pour production
supabase secrets set SUPABASE_URL=https://abc123defg.supabase.co
supabase secrets set SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

---

## 📊 Créer les Tables Directement

### Méthode 1: Via SQL Files (Recommandé)

```bash
# 1. Créer un dossier migrations
mkdir -p supabase/migrations

# 2. Créer fichier migration
# Fichier: supabase/migrations/20260531120000_init.sql

# 3. Copier tous les scripts SQL dans ce fichier

# 4. Exécuter
supabase db push
```

### Méthode 2: Direct CLI

```bash
# Exécuter des commandes SQL directement
psql postgresql://postgres:postgres@127.0.0.1:5432/postgres -c "
  CREATE TABLE provinces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL
  );
"
```

---

## 🔑 Récupérer les Credentials

### Via CLI
```bash
# Afficher les credentials du projet
supabase status

# Résultat:
# API URL: https://abc123defg.supabase.co
# Anon Key: eyJhbGciOiJIUzI1NiI...
# Service Role Key: eyJhbGciOiJIUzI1NiI...
```

### Copier dans .env.local
```bash
# Récupérer les values et mettre dans .env.local
VITE_SUPABASE_URL=https://abc123defg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiI...
```

---

## 🧪 Tester la Connexion CLI

```bash
# Utiliser psql pour tester la DB
psql $(supabase connection-string)

# Résultat:
# psql (13.10, server 13.8)
# Type "help" for help.
# postgres=>

# Tester une requête
SELECT COUNT(*) FROM provinces;

# Résultat:
# count
# -------
#    19
# (1 row)
```

---

## 📝 Créer une Migration

### Ajouter une Table via Migration

```bash
# Créer une nouvelle migration
supabase migration new add_new_table

# Résultat:
# ✅ Created migration: supabase/migrations/20260531_add_new_table.sql

# Éditer le fichier avec votre SQL:
# supabase/migrations/20260531_add_new_table.sql
```

### Appliquer la Migration
```bash
# Appliquer toutes les migrations
supabase db push

# Résultat:
# ✅ Applied migration 20260531_add_new_table
```

---

## 🚀 Déployer Edge Functions

### Créer une Function

```bash
# Créer une nouvelle Edge Function
supabase functions new simulate

# Résultat:
# ✅ Created function: supabase/functions/simulate/index.ts

# Le fichier est créé:
# supabase/functions/simulate/index.ts
```

### Éditer la Function

**Fichier**: `supabase/functions/simulate/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { provinces, iterations } = await req.json();

  // Your simulation logic
  const result = {
    simulationId: "sim_123",
    status: "running",
    progress: 0,
  };

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});
```

### Déployer la Function

```bash
# Déployer une function
supabase functions deploy simulate

# Résultat:
# ✅ Function deployed: https://abc123defg.supabase.co/functions/v1/simulate

# Ou toutes les functions
supabase functions deploy
```

### Tester la Function

```bash
# Depuis le terminal
curl -X POST https://abc123defg.supabase.co/functions/v1/simulate \
  -H "Content-Type: application/json" \
  -d '{"provinces":["prov1"], "iterations":100}'

# Ou depuis React:
const response = await fetch(
  `${supabaseUrl}/functions/v1/simulate`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provinces: ['prov1'], iterations: 100 })
  }
);
```

---

## 🔄 Logs des Functions

```bash
# Voir les logs d'une function
supabase functions logs simulate

# Résultat:
# 2026-05-31 12:00:00.123 [simulate] Starting simulation
# 2026-05-31 12:00:01.456 [simulate] Simulation complete
```

---

## 📚 Commandes Utiles

### Status du Projet
```bash
supabase status
```

### Voir les Tables
```bash
# Via CLI
supabase db tables

# Ou via psql
psql $(supabase connection-string) -c "
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public';
"
```

### Voir les Données
```bash
psql $(supabase connection-string) -c "
  SELECT id, nom, code FROM provinces LIMIT 5;
"
```

### Exporter les Données
```bash
# Exporter données en CSV
psql $(supabase connection-string) -c "
  COPY provinces TO STDOUT WITH CSV HEADER;
" > provinces.csv
```

### Importer les Données
```bash
# Importer données depuis CSV
psql $(supabase connection-string) -c "
  COPY provinces FROM STDIN WITH CSV HEADER;
" < provinces.csv
```

---

## 🛑 Arrêter Services Locaux

```bash
# Arrêter le dev server
supabase stop

# Résultat:
# ✅ Stopped Supabase
```

---

## 🗑️ Nettoyer & Réinitialiser

```bash
# Supprimer tous les services locaux
supabase stop --no-backup

# Résultat:
# ✅ Removed Supabase

# Réinitialiser
supabase start
```

---

## 📊 Configuration .env.local (Finale)

```env
# Supabase - Client Side (Public)
VITE_SUPABASE_URL=https://abc123defg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase - Server Side (Private - Ne pas partager!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optionnel - Project Reference
SUPABASE_PROJECT_REF=abc123defg
```

---

## ✅ Checklist Complète

### Setup Initial
```
[ ] npm install -g supabase-cli (ou bun)
[ ] supabase login
[ ] supabase link --project-ref abc123defg
[ ] Vérifier .env.local
[ ] npm run dev
```

### Tables & Data
```
[ ] Exécuter tous les SQL scripts (SUPABASE_SQL_SCRIPTS.md)
[ ] Vérifier 5 tables créées
[ ] Vérifier 19 provinces insérées
[ ] Test de connexion React (/test-supabase)
```

### Real-time
```
[ ] Dashboard Supabase → Settings → Real-time
[ ] Enable pour: anomalies, predictions, simulation_logs
[ ] Save
```

### Edge Functions
```
[ ] supabase functions new simulate
[ ] supabase functions new detect-anomalies
[ ] supabase functions deploy
[ ] Tester endpoints
```

---

## 🚀 Flow Complet en 5 Commandes

```bash
# 1. Installer CLI
npm install -g supabase-cli

# 2. Authentifier
supabase login

# 3. Lier au projet cloud
supabase link --project-ref abc123defg

# 4. Voir status
supabase status

# 5. Tester connexion
npm run dev
# Visiter: http://localhost:5173/test-supabase
```

---

## 📞 Troubleshooting CLI

### Error: "Supabase CLI not found"
```bash
# Réinstaller
npm install -g supabase-cli

# Ou avec bun
bun install -g supabase-cli
```

### Error: "Not authenticated"
```bash
# Authentifier
supabase login
```

### Error: "Project not linked"
```bash
# Lier le projet
supabase link --project-ref abc123defg
```

### Error: "Docker not running" (Local)
```bash
# Démarrer Docker puis:
supabase start
```

---

## 🎯 Prochaines Étapes

1. ✅ Exécuter toutes les commandes ci-dessus
2. ✅ Vérifier les tables dans Dashboard
3. ✅ Tester la connexion React
4. ✅ Créer Edge Functions
5. ✅ Déployer en production

---

**Status**: ✅ CLI Commands Ready  
**Duration**: ~20-30 min  
**Next**: Edge Functions Deep Dive
