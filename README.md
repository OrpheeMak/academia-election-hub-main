# Tableau Électoral RDC — Prototype académique

Prototype React + Supabase pour la **visualisation des prédictions électorales** et la **détection d'anomalies statistiques** en République Démocratique du Congo.

> Outil pédagogique sur **données simulées**. Aucun lien avec un système électoral officiel.

## Architecture

- **Frontend** : React 18 + Vite + TypeScript + Tailwind + shadcn/ui
- **Cartographie** : react-leaflet (carte recentrée sur la RDC)
- **Graphiques** : Recharts
- **Données / API** : Supabase (PostgreSQL + REST auto-générée + RLS + Edge Functions)
- **Cache** : React Query + persistance `localStorage` (24 h) — adaptée aux réseaux intermittents
- **Lazy-loading** : `React.lazy` sur la carte, les graphiques et les cartes lourdes

## Modèle de données

| Table | Description |
| --- | --- |
| `provinces` | 26 provinces de la RDC + centroïdes |
| `circonscriptions` | Découpage administratif |
| `bureaux_vote` | Bureaux et nombre d'inscrits |
| `elections` | Type, date, libellé |
| `candidats` | Candidats par élection |
| `resultats` | Voix par bureau / candidat |
| `participation` | Votants / inscrits / taux par bureau |
| `predictions` | Score prédit + intervalle de confiance |
| `anomalies` | Détections enregistrées (méthode + score + détails JSONB) |
| `user_roles` | Rôles applicatifs (admin / moderator / user) |

Vue agrégée : `v_participation_province` (taux et totaux par province, en `security_invoker`).

## Sécurité (RLS)

- **Lecture publique** sur toutes les tables métier (prototype académique).
- **Écriture restreinte aux administrateurs** via `user_roles` + fonction `has_role(uuid, app_role)` `SECURITY DEFINER` (évite la récursion RLS).
- L'authentification Supabase est disponible mais non bloquante.

## Détection d'anomalies (interprétable)

Implémentée côté client dans `src/lib/anomalies.ts` :

- **Z-score** : `|z| ≥ 2.5` sur le taux de participation
- **Écart interquartile (IQR)** : valeurs hors `[Q1 − 1.5·IQR, Q3 + 1.5·IQR]`
- **Moyenne mobile** : utilitaire pour séries temporelles

Chaque alerte expose la méthode et la raison (μ, σ, Q1, Q3 ou seuil) pour la transparence.

## Optimisations RDC (faible bande passante)

- Cache local 24 h (React Query persisté) → consultation hors-ligne des dernières données.
- Requêtes paginées et agrégations côté serveur (vue SQL).
- Découpage `Suspense` + `lazy` (la carte Leaflet ne charge que si nécessaire).
- Layout **mobile-first** : grilles en colonne sous 1024 px, KPIs en 2×2 sur mobile.
- Police système (Inter) chargée en `preconnect`, palette HSL via tokens Tailwind.

## Démarrage

```bash
bun install
bun run dev
```

Supabase est connecté via les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.

## Étapes futures

- Authentification (email + Google) + rôle admin pour ingestion CSV / JSON
- Edge Function pour recalcul périodique des prédictions
- Export CSV / PDF des tableaux et alertes
- Service worker offline-first
# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/b2d737d4-2506-4841-97a8-6aa249be18f0

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/b2d737d4-2506-4841-97a8-6aa249be18f0) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/b2d737d4-2506-4841-97a8-6aa249be18f0) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
