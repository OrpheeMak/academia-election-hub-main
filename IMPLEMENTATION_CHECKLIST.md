# 📋 IMPLEMENTATION CHECKLIST

---

## 🎯 PHASE 1: CODE CLEANUP (Immediate - 30 min)

### Step 1: Delete Redundant Files
```
[ ] rm src/components/dashboard/HeaderAdvanced.tsx
[ ] rm src/components/dashboard/FilterBarAdvanced.tsx
[ ] rm src/components/dashboard/KPICardAdvanced.tsx
[ ] rm src/components/premium/KPIStat.tsx
[ ] rm src/hooks/useAnomalyDetection.ts
```

### Step 2: Update Imports (Search & Replace)
**Files to check** (Run Find & Replace):
```
[ ] src/pages/DashboardPage.tsx
    - HeaderAdvanced → Header
    - FilterBarAdvanced → FiltersBar
    
[ ] src/components/dashboard/AnomaliesCard.tsx
    - useAnomalyDetection → useAnomalies
    
[ ] src/pages/HomePage.tsx
    - Any old imports check
    
[ ] src/components/premium/ElectionChart.tsx
    - KPIStat → Use KpiCards
```

### Step 3: Test & Verify
```bash
[ ] npm run dev          # Start dev server
[ ] npm run build        # Build for production
[ ] npm run lint         # Check for errors
[ ] npm run test         # Run tests (if any)
```

### Step 4: Git Commit
```bash
[ ] git add .
[ ] git commit -m "refactor: consolidate components and hooks, remove duplication"
[ ] git push
```

---

## 🎨 PHASE 2: ANIMATIONS VERIFICATION (10 min)

### Visual Checks
```
[ ] Header slides in from top (on page load)
[ ] KPI cards appear in cascade (with delay)
[ ] Filter bar smooth transitions
[ ] Alert badges bounce
[ ] Hover effects on cards (lift + glow)
[ ] Dark mode animations work
[ ] Mobile responsive animations OK
```

### Browser Testing
```
[ ] Chrome/Chromium
[ ] Firefox
[ ] Safari
[ ] Mobile browsers (iOS Safari, Chrome Mobile)
```

### Accessibility
```
[ ] prefers-reduced-motion: Works (no animations)
[ ] Keyboard navigation: OK
[ ] Screen reader: OK
```

**DevTools Console Check**:
```javascript
document.querySelectorAll('[class*="animate"]').length
// Should return: 20+
```

---

## 🏗️ PHASE 3: BACKEND SETUP (1-2 weeks)

### 3.1 Supabase Project Setup
```
[ ] Create Supabase project (if not exists)
[ ] Get project URL & API key
[ ] Store in .env.local
    VITE_SUPABASE_URL=...
    VITE_SUPABASE_ANON_KEY=...
```

### 3.2 Database Creation
**Execute in Supabase SQL Editor:**
```sql
[ ] CREATE TABLE provinces (...)
[ ] CREATE TABLE resultats_partiels (...)
[ ] CREATE TABLE anomalies (...)
[ ] CREATE TABLE predictions (...)
[ ] CREATE TABLE simulation_logs (...)
[ ] CREATE indexes on all tables
[ ] Create materialized views
[ ] Enable Row Level Security (RLS)
```

**Reference**: `ARCHITECTURE_PLAN.md` → "Tables Principales"

### 3.3 Edge Functions
```
[ ] Install Supabase CLI: supabase-cli@latest
[ ] Create function: supabase functions new simulate
[ ] Create function: supabase functions new detect-anomalies
[ ] Create function: supabase functions new get-predictions
[ ] Create function: supabase functions new export-report
[ ] Deploy: supabase functions deploy
[ ] Test each endpoint
```

**Reference**: `ARCHITECTURE_PLAN.md` → "Edge Functions (API Endpoints)"

### 3.4 Real-time Setup
```
[ ] Enable Realtime in Supabase Dashboard
[ ] Subscribe to 'anomalies' channel
[ ] Subscribe to 'predictions' channel
[ ] Test WebSocket connections
[ ] Handle reconnections gracefully
```

**Reference**: `ARCHITECTURE_PLAN.md` → "Real-time Updates (WebSocket)"

### 3.5 Authentication & RLS
```
[ ] Setup Auth in Supabase (optional)
[ ] Create RLS policies for tables
[ ] Test role-based access
[ ] Verify data isolation
```

**Reference**: `ARCHITECTURE_PLAN.md` → "Authentification & RLS"

---

## 🤖 PHASE 4: ML MODEL TRAINING (2-4 weeks)

### 4.1 Environment Setup
```bash
[ ] pip install pandas numpy scikit-learn tensorflow
[ ] pip install joblib matplotlib
[ ] Create Python venv: python -m venv venv
[ ] Activate: source venv/bin/activate (or .\venv\Scripts\activate on Windows)
```

### 4.2 Dataset Preparation
```python
[ ] Collect historical election data (2011, 2016, 2023)
[ ] Collect simulation data
[ ] Total observations: 50+
[ ] Features prepared: 30-50
[ ] Handle missing values
[ ] Normalize/scale data
[ ] Train/test split (80/20)
```

**Reference**: `ARCHITECTURE_PLAN.md` → "Données d'Entraînement"

### 4.3 Model Training
```python
[ ] Prepare data with preprocessing
[ ] Train LSTM model
[ ] Train Random Forest model
[ ] Train Gradient Boosting model
[ ] Create weighted ensemble
[ ] Save all models
```

**Reference**: `ARCHITECTURE_PLAN.md` → "Pipeline ML"

### 4.4 Model Evaluation
```python
[ ] Evaluate on test set
[ ] Calculate metrics:
    - [ ] MAE < 2% ✓
    - [ ] RMSE < 3% ✓
    - [ ] R² > 0.85 ✓
    - [ ] MAPE < 5% ✓
[ ] Run backtesting
[ ] Document results
```

**Reference**: `ARCHITECTURE_PLAN.md` → "Évaluation & Métriques"

### 4.5 Model Deployment
```
[ ] Save models to ./models/
[ ] Create model API wrapper
[ ] Deploy to Edge Functions or separate service
[ ] Setup model versioning
[ ] Configure A/B testing
```

**Reference**: `ARCHITECTURE_PLAN.md` → "Déploiement & Monitoring"

---

## 📝 PHASE 5: INSTRUCTIONS & PROMPTS (1 week)

### 5.1 System Prompt
```
[ ] Copy System Prompt from ARCHITECTURE_PLAN.md
[ ] Customize for your use case
[ ] Test with sample data
[ ] Document any modifications
```

**Reference**: `ARCHITECTURE_PLAN.md` → "Système de Prompts pour l'IA"

### 5.2 User Templates
```
[ ] Template 1: Analyse Anomalies
    - [ ] Test with sample anomaly
    - [ ] Verify output format
    
[ ] Template 2: Prédiction Résultats
    - [ ] Test with sample results
    - [ ] Check confidence metrics
    
[ ] Template 3: Génération Rapport
    - [ ] Test report generation
    - [ ] Verify formatting
```

**Reference**: `ARCHITECTURE_PLAN.md` → "User Instruction Templates"

### 5.3 Validation Rules
```typescript
[ ] Implement PARTICIPATION rules
[ ] Implement VOIX_VS_INSCRITS rules
[ ] Implement CHANGE_RATE rules
[ ] Implement CONSISTENCY rules
[ ] Test all validation scenarios
```

**Reference**: `ARCHITECTURE_PLAN.md` → "Règles de Validation"

### 5.4 Feedback Loop
```
[ ] Setup feedback collection
[ ] Track prediction accuracy
[ ] Log user corrections
[ ] Update model metrics
[ ] Schedule weekly retraining
```

**Reference**: `ARCHITECTURE_PLAN.md` → "Feedback Loop"

---

## 📊 PHASE 6: DOCUMENTATION & TESTING (3 days)

### 6.1 API Documentation
```
[ ] Create Swagger/OpenAPI spec
[ ] Document all endpoints
[ ] Document request/response formats
[ ] Document error codes
[ ] Test all documented examples
```

### 6.2 ML Model Documentation
```
[ ] Document model architecture
[ ] Document training data
[ ] Document feature engineering
[ ] Document evaluation metrics
[ ] Document deployment process
[ ] Create model card
```

### 6.3 Deployment Guide
```
[ ] Create deployment checklist
[ ] Document rollback procedure
[ ] Create monitoring dashboard
[ ] Create alerting rules
[ ] Document incident response
```

### 6.4 Comprehensive Testing
```
[ ] Unit tests for components
[ ] Integration tests for APIs
[ ] Performance tests (animations, API response)
[ ] Load tests (concurrent users)
[ ] Security tests (authentication, RLS)
[ ] UAT (User Acceptance Testing)
```

### 6.5 Performance Optimization
```
[ ] Measure bundle size
[ ] Measure API response times
[ ] Measure model inference time
[ ] Optimize if needed
[ ] Create performance baselines
```

### 6.6 Final Quality Assurance
```
[ ] Code review
[ ] Security audit
[ ] Accessibility audit
[ ] Cross-browser testing
[ ] Mobile device testing
[ ] Stress testing
```

---

## 🚀 PHASE 7: PRODUCTION DEPLOYMENT (2-3 days)

### 7.1 Pre-deployment
```
[ ] Final code review
[ ] Final security scan
[ ] Final performance check
[ ] Create deployment runbook
[ ] Brief support team
```

### 7.2 Deployment
```
[ ] Deploy backend (Supabase)
[ ] Deploy Edge Functions
[ ] Deploy ML model API
[ ] Update environment variables
[ ] Test in staging
[ ] Backup data
```

### 7.3 Post-deployment
```
[ ] Verify all services running
[ ] Monitor error logs
[ ] Monitor performance metrics
[ ] Verify real-time features
[ ] Test end-to-end workflows
[ ] Get stakeholder sign-off
```

### 7.4 Go-Live
```
[ ] Gradual rollout (10% users first)
[ ] Monitor for issues
[ ] Increase to 50%
[ ] Monitor for issues
[ ] Full rollout (100%)
[ ] Maintain on-call support
```

---

## 📈 METRICS TO TRACK

### Code Quality Metrics
```
[ ] Code duplication: Before 45%, After < 20%
[ ] Bundle size: Before 100%, After 85%
[ ] Test coverage: Target 80%+
[ ] Linting errors: Target 0
```

### Performance Metrics
```
[ ] Page load time: < 2 seconds
[ ] API response time: < 500ms
[ ] Model inference time: < 1 second
[ ] Animation FPS: 60 (no jank)
```

### ML Model Metrics
```
[ ] MAE: < 2%
[ ] RMSE: < 3%
[ ] R²: > 0.85
[ ] Confidence: > 80%
```

### User Engagement
```
[ ] Page views: Measure
[ ] User sessions: Measure
[ ] Feature usage: Measure
[ ] Error rate: < 0.1%
```

---

## 🔍 TROUBLESHOOTING GUIDE

### Animations Not Showing
```
Check:
[ ] Browser supports CSS animations
[ ] No CSS overrides in parent elements
[ ] Check DevTools for animation rules
[ ] Console for JavaScript errors
```

### API Endpoints Not Working
```
Check:
[ ] Supabase project is active
[ ] Edge Functions deployed
[ ] Environment variables correct
[ ] CORS enabled if needed
[ ] Check function logs
```

### ML Model Not Predicting Correctly
```
Check:
[ ] Model metrics on test set
[ ] Input features match training features
[ ] Data preprocessing applied
[ ] Model version correct
[ ] Check inference logs
```

### Real-time Updates Not Working
```
Check:
[ ] Real-time enabled in Supabase
[ ] Channel names correct
[ ] Event types correct
[ ] Network connection stable
[ ] Check browser network tab
```

---

## 📞 ESCALATION CONTACTS

```
[ ] Backend lead: ____________
[ ] Frontend lead: ____________
[ ] ML engineer: ____________
[ ] DevOps lead: ____________
[ ] Project manager: ____________
```

---

## ✅ SIGN-OFF

### Phase Completions
```
Phase 1 (Cleanup):     [ ] Completed by: __________ Date: __________
Phase 2 (Animations):  [ ] Completed by: __________ Date: __________
Phase 3 (Backend):     [ ] Completed by: __________ Date: __________
Phase 4 (ML Model):    [ ] Completed by: __________ Date: __________
Phase 5 (Instructions):[ ] Completed by: __________ Date: __________
Phase 6 (Testing):     [ ] Completed by: __________ Date: __________
Phase 7 (Deployment):  [ ] Completed by: __________ Date: __________
```

### Final Approval
```
[ ] Product Owner Approval
[ ] Technical Lead Approval
[ ] Security Review Approval
[ ] Operations Approval
[ ] Ready for Production: ✅ YES / ❌ NO
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-05-30  
**Print Date**: __________  
**Checked By**: __________
