# Configuration des Edge Functions Supabase

Pour que les Edge Functions fonctionnent correctement, assurez-vous que chaque dossier contient les fichiers suivants:

## Structure requise

```
supabase/functions/
├── predict-election-results/
│   ├── index.ts          # Code TypeScript
│   └── deno.json         # Configuration Deno (si besoin)
├── detect-anomalies/
│   ├── index.ts
│   └── deno.json
└── process-results/
    ├── index.ts
    └── deno.json
```

## Fichier deno.json (optionnel)

Si vous avez besoin de dépendances spécifiques, créez un fichier `deno.json`:

```json
{
  "imports": {
    "std/": "https://deno.land/std@0.208.0/",
    "supabase-js": "https://esm.sh/@supabase/supabase-js@2.105.4"
  }
}
```

## Variables d'environnement requises

Déclarez ces secrets dans Supabase:

```bash
supabase secrets set SUPABASE_URL="your-project-url"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

## Déploiement

### Depuis la CLI

```bash
# Déployer une fonction spécifique
supabase functions deploy predict-election-results --no-verify-jwt

# Déployer toutes les functions
supabase functions deploy

# Vérifier le déploiement
supabase functions list
```

### Vérifier les logs

```bash
supabase functions logs predict-election-results --limit 50

# Suivi en temps réel
supabase functions logs predict-election-results --follow
```

## Test local

```bash
# Démarrer Supabase localement
supabase start

# Les Edge Functions sont disponibles à:
# http://127.0.0.1:54321/functions/v1/predict-election-results

# Tester avec curl
curl -X POST http://127.0.0.1:54321/functions/v1/predict-election-results \
  -H "Content-Type: application/json" \
  -d '{
    "election_id": "test-election-id",
    "province_id": "test-province"
  }'
```

## Dépannage

### Erreur: "Function not found"

1. Vérifier que le dossier existe
2. Vérifier que `index.ts` existe
3. Redéployer: `supabase functions deploy`

### Erreur: "SUPABASE_URL not configured"

```bash
supabase secrets set SUPABASE_URL="https://your-project.supabase.co"
supabase functions deploy
```

### Erreur: "Timeout"

- Réduire la complexity des requêtes
- Augmenter le timeout de la requête client
- Vérifier les logs: `supabase functions logs`

### Erreur: "Unauthorized"

- Vérifier que `SERVICE_ROLE_KEY` est configuré
- Vérifier les RLS policies
- Vérifier l'authentification Supabase
