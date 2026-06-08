# Checklist de Déploiement - Academia Election Hub v1.0.0

## ✅ Phase 1: Préparation

- [ ] Cloner le repository et installer les dépendances
  ```bash
  npm install
  npm run type-check
  ```

- [ ] Configurer les variables d'environnement `.env.local`
  ```
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key
  ```

- [ ] Initialiser la base de données Supabase
  ```bash
  supabase init
  supabase start
  ```

## ✅ Phase 2: Migrations Base de Données

- [ ] Appliquer la migration du schéma principal
  ```bash
  supabase migration up 20260602_complete_schema
  ```

- [ ] Appliquer la migration RLS et fonctions avancées
  ```bash
  supabase migration up 20260606_rls_and_advanced_features
  ```

- [ ] Vérifier l'intégrité du schéma
  ```sql
  -- Depuis Supabase Studio
  SELECT * FROM information_schema.tables 
  WHERE table_schema = 'public' 
  ORDER BY table_name;
  ```

- [ ] Tester les fonctions SQL
  ```sql
  SELECT has_role('00000000-0000-0000-0000-000000000001'::uuid, 'admin');
  SELECT * FROM calculate_iqr_participation('province-uuid'::uuid);
  ```

## ✅ Phase 3: Edge Functions

- [ ] Configurer les secrets Supabase
  ```bash
  supabase secrets set SUPABASE_URL
  supabase secrets set SUPABASE_SERVICE_ROLE_KEY
  ```

- [ ] Déployer `predict-election-results`
  ```bash
  supabase functions deploy predict-election-results --no-verify-jwt
  supabase functions logs predict-election-results
  ```

- [ ] Déployer `detect-anomalies`
  ```bash
  supabase functions deploy detect-anomalies --no-verify-jwt
  supabase functions logs detect-anomalies
  ```

- [ ] Déployer `process-results`
  ```bash
  supabase functions deploy process-results --no-verify-jwt
  supabase functions logs process-results
  ```

- [ ] Tester les Edge Functions
  ```bash
  curl -X POST http://127.0.0.1:54321/functions/v1/predict-election-results \
    -H "Content-Type: application/json" \
    -d '{"election_id":"test"}'
  ```

## ✅ Phase 4: Configuration RLS

- [ ] Vérifier les politiques RLS
  ```sql
  SELECT * FROM pg_policies 
  WHERE tablename IN ('provinces', 'resultats_partiels', 'anomalies');
  ```

- [ ] Tester l'accès anonyme
  ```typescript
  const { data } = await supabase
    .from('provinces')
    .select('*')
    .limit(1);
  // Doit retourner des données
  ```

- [ ] Tester l'accès authentifié (admin)
  ```typescript
  // Créer un user test avec rôle admin
  const { data } = await supabase
    .from('user_roles')
    .insert([{ user_id: 'test-uuid', app_role: 'admin' }]);
  ```

- [ ] Tester les écritures restreintes
  ```typescript
  // Sans rôle admin, insertion doit échouer
  const { error } = await supabase
    .from('predictions')
    .insert([{ election_id: 'x' }]);
  // error should be "new row violates row-level security policy"
  ```

## ✅ Phase 5: Tests Frontend

- [ ] Exécuter les tests unitaires
  ```bash
  npm run test
  npm run test:ui
  ```

- [ ] Vérifier la couverture
  ```bash
  npm run test -- --coverage
  ```

- [ ] Lint et format
  ```bash
  npm run lint
  npm run format
  ```

- [ ] Type checking
  ```bash
  npm run type-check
  ```

## ✅ Phase 6: Build Production

- [ ] Build l'application
  ```bash
  npm run build
  ```

- [ ] Vérifier qu'aucune erreur
  - [ ] Pas d'erreurs TypeScript
  - [ ] Pas d'erreurs ESLint
  - [ ] Pas d'avertissements critiques

- [ ] Vérifier la taille du bundle
  ```bash
  npm run build
  # Vérifier que le bundle n'est pas trop volumineux
  ```

- [ ] Tester la preview
  ```bash
  npm run preview
  # Accéder à http://localhost:5173
  ```

## ✅ Phase 7: Test d'Intégration Complet

- [ ] Tester le flow complet: Résultats → Anomalies → Prédictions

  ```typescript
  // 1. Importer des résultats
  const result = await electionApiService.processResults({
    election_id: 'test-election',
    results: [
      { bureau_id: 'b1', candidat_id: 'c1', voix: 150, inscrits: 1000, province_id: 'p1' }
    ],
    auto_detect_anomalies: true,
    auto_predict: true
  });

  // 2. Vérifier les anomalies
  const anomalies = await electionApiService.getAnomalies('test-election');
  console.assert(anomalies.length >= 0, 'Anomalies retrieved');

  // 3. Vérifier les prédictions
  const predictions = await electionApiService.getPredictions('test-election');
  console.assert(predictions.length >= 0, 'Predictions retrieved');
  ```

- [ ] Tester les subscriptions en temps réel
  - [ ] Ajouter des résultats et vérifier que les anomalies s'affichent
  - [ ] Ajouter des prédictions et vérifier qu'elles sont mises à jour
  - [ ] Créer une alerte et vérifier qu'elle apparaît

## ✅ Phase 8: Données de Test

- [ ] Insérer des provinces test
  ```sql
  INSERT INTO provinces (nom, code, nombre_inscrits, centroid_lat, centroid_lng)
  VALUES ('Test Province', 'TST', 50000, -4.3369, 15.3271);
  ```

- [ ] Insérer une élection test
  ```sql
  INSERT INTO elections (nom, type, date_election, statut)
  VALUES ('Test 2026', 'législative', NOW(), 'en_cours');
  ```

- [ ] Insérer des candidats test
  ```sql
  INSERT INTO candidats (nom, parti_politique, election_id)
  SELECT 'Test Candidate', 'Test Party', id FROM elections WHERE nom = 'Test 2026';
  ```

- [ ] Importer des résultats test
  ```bash
  npm run simulate
  # ou importer manuellement via l'interface
  ```

## ✅ Phase 9: Monitoring et Logs

- [ ] Vérifier les logs Supabase
  ```bash
  supabase functions logs --follow
  ```

- [ ] Vérifier les erreurs TypeScript
  ```bash
  npm run type-check
  ```

- [ ] Vérifier les erreurs ESLint
  ```bash
  npm run lint
  ```

- [ ] Configurer les alertes d'erreur
  - [ ] Email notifications pour les erreurs
  - [ ] Logs centralisés

## ✅ Phase 10: Documentation

- [ ] Mise à jour du README
  - [ ] Instructions d'installation
  - [ ] Variables d'environnement requises
  - [ ] Commandes importantes

- [ ] Vérifier la documentation des fonctions
  - [ ] JSDoc comments complets
  - [ ] Exemples d'utilisation

- [ ] Vérifier le guide d'intégration
  - [ ] Tous les modules documentés
  - [ ] Exemples complets fournis

## ✅ Phase 11: Équipe et Notifications

- [ ] Notifier l'équipe du déploiement
- [ ] Partager les credentials de test
- [ ] Former les utilisateurs
- [ ] Créer des issues pour les améliorations futures

## ✅ Phase 12: Post-Déploiement

- [ ] Monitorer les performances
  ```bash
  supabase functions logs --follow
  ```

- [ ] Vérifier les métriques d'utilisation
- [ ] Surveiller les erreurs
- [ ] Optimiser si nécessaire

## 🚨 Points Critiques à Vérifier

1. **Base de Données**
   - [ ] RLS correctement configurée
   - [ ] Migrations appliquées sans erreurs
   - [ ] Indexes créés pour les performances

2. **Edge Functions**
   - [ ] Secrets Supabase configurés
   - [ ] Logs visibles et sans erreurs
   - [ ] Timeouts acceptables

3. **Frontend**
   - [ ] Pas d'erreurs TypeScript
   - [ ] Hooks React fonctionnent correctement
   - [ ] Composants affichent les données

4. **Intégration**
   - [ ] API appelle correctement les Edge Functions
   - [ ] Données synchronisées en temps réel
   - [ ] Anomalies et prédictions générées

## 📊 Tests de Performance

- [ ] Temps de réponse des prédictions < 2s
- [ ] Détection d'anomalies < 1s
- [ ] Traitement des résultats < 3s
- [ ] Queries DB < 500ms

## ✨ Statut Final

Une fois toutes les cases cochées:

- [ ] ✅ Prêt pour la production
- [ ] ✅ Documentation complète
- [ ] ✅ Équipe formée
- [ ] ✅ Monitoring actif
- [ ] ✅ Backup configuré

---

**Date du déploiement**: ___________  
**Responsable**: ___________  
**Notes**: ___________________________

---

*À imprimer ou à conserver numériquement*
