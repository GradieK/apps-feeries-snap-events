# CLAUDE.md — Moments Events by Bless Events

## Vue d'ensemble

**Moments Events** (anciennement Féerie Snap Events) est une application web premium de collecte de vœux multimédias pour événements (mariages, galas, anniversaires). Elle est intégrée à la plateforme **Bless Events** (`https://www.bless-events.com`) dont elle est le module "Voeux". Les clients Bless Events qui souscrivent à l'option Voeux y accèdent via SSO (magic link).

- **Production** : `https://moment-events.vercel.app`
- **Plateforme parente** : `https://www.bless-events.com`
- **Supabase project ref** : `zlxwinvnfqlnncqantwq`

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 (`@vitejs/plugin-react-swc`) |
| Styles | Tailwind CSS 3 + shadcn/ui (Radix UI) |
| Backend | Supabase (Auth + PostgreSQL + Storage + Edge Functions) |
| Routing | React Router DOM v6 |
| State | useState / useEffect (pas de Zustand ni Redux) |
| HTTP/Data | @tanstack/react-query (configuré dans App.tsx) |
| PDF | Supabase Edge Function `generate-pdf` (pdf-lib) |
| Vidéo | Supabase Edge Function `trigger-video` (provider externe) |
| QR Code | `react-qr-code` + `html2canvas` pour export PNG |
| ZIP export | `jszip` |
| Compression images | `browser-image-compression` |

---

## Commandes de développement

```bash
npm run dev        # Serveur local sur http://localhost:8080
npm run build      # Build de production
npm run preview    # Prévisualiser le build
npm run lint       # ESLint
```

Le port de dev est **8080** (configuré dans `vite.config.ts`).

---

## Structure des fichiers clés

```
src/
├── App.tsx                    # Routeur principal — toutes les routes ici
├── main.tsx                   # Point d'entrée React
├── index.css                  # Variables CSS globales (palette dark & gold)
├── App.css                    # Styles globaux (.logo-moments)
├── pages/
│   ├── Home.tsx               # Page d'accueil invité (saisie prénom)
│   ├── Voeux.tsx              # Page de soumission des vœux (texte/audio/photo)
│   ├── Admin.tsx              # Page admin d'un événement (liste + export des vœux)
│   ├── AdminDashboard.tsx     # Dashboard créateur (liste événements, SSO Bless Events)
│   ├── QRCode.tsx             # Page génération QR code (impression + export PNG)
│   ├── Index.tsx              # Fallback inutilisé
│   └── NotFound.tsx           # 404
├── hooks/
│   ├── useAuth.ts             # Auth Supabase (getUser + onAuthStateChange)
│   ├── useEvent.ts            # Chargement event par slug depuis Supabase
│   ├── useWishUpload.ts       # Upload vœu (texte/audio/image) dans Supabase Storage + DB
│   ├── useGeneration.ts       # Génération PDF / Vidéo via Edge Functions
│   └── useAudioRecorder.ts    # Enregistrement audio navigateur (MediaRecorder API)
├── components/
│   ├── GenerationPanel.tsx    # UI génération PDF + Vidéo (dans Admin.tsx)
│   └── ui/                    # Composants shadcn/ui (ne pas modifier manuellement)
└── integrations/supabase/
    ├── client.ts              # createClient Supabase (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
    └── types.ts               # Types générés (events, wishes, generation_jobs)

supabase/
├── functions/
│   ├── sso-token/             # Génère un magic link SSO pour Bless Events
│   ├── provision-bless-event/ # Crée un événement depuis Bless Events
│   ├── event-stats/           # Stats vœux d'un événement (pour Bless Events)
│   ├── generate-pdf/          # Génère l'album PDF souvenir (pdf-lib)
│   ├── trigger-video/         # Lance la génération vidéo (provider externe)
│   ├── check-video-status/    # Vérifie le statut d'un job vidéo
│   └── video-webhook/         # Webhook appelé par le provider vidéo
├── migrations/
│   └── 20240620000000_bless_integration.sql  # Colonnes bless_event_id + source sur events
└── config.toml
```

---

## Routes de l'application

| Route | Composant | Description |
|---|---|---|
| `/` | `Home` | Page d'accueil générique (sans slug) |
| `/dashboard` | `AdminDashboard` | Dashboard créateur / SSO Bless Events |
| `/:slug` | `Home` | Page d'accueil invité pour un événement |
| `/:slug/voeux` | `Voeux` | Soumission des vœux par les invités |
| `/:slug/admin` | `Admin` | Gestion des vœux d'un événement |
| `/:slug/qr-codes` | `QRCodePage` | QR code imprimable pour l'événement |
| `*` | `NotFound` | 404 |

**Note importante** : Le QR code affiché dans la salle pointe vers `/:slug` (sans `/voeux`). La page Home redirige ensuite vers `/:slug/voeux` après saisie du prénom.

---

## Base de données Supabase

### Table `events`

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT | Nom de l'événement |
| `client_name` | TEXT | Nom du client/couple |
| `event_date` | TEXT | Date au format ISO |
| `slug` | TEXT UNIQUE | URL-friendly, généré à la création |
| `owner_id` | UUID | FK → auth.users (propriétaire) |
| `status` | TEXT | `'draft'` ou `'published'` |
| `bless_event_id` | UUID UNIQUE | ID de l'événement côté Bless Events (nullable) |
| `source` | TEXT | `'direct'` ou `'bless_events'` (défaut: `'direct'`) |
| `created_at` | TIMESTAMPTZ | |

### Table `wishes`

| Colonne | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `event_id` | UUID | FK → events |
| `guest_name` | TEXT | Prénom de l'invité |
| `table_number` | INTEGER | Numéro de table (nullable) |
| `type` | TEXT | `'text'` / `'audio'` / `'image'` / `'video'` |
| `content` | TEXT | Contenu texte (pour type text) |
| `file_url` | TEXT | URL publique Supabase Storage |
| `filename` | TEXT | Nom du fichier original |
| `mime_type` | TEXT | MIME type du fichier |
| `file_size` | INTEGER | Taille en octets |
| `created_at` | TIMESTAMPTZ | |

### Table `generation_jobs`

Suit les jobs de génération PDF/vidéo. Colonnes: `id`, `event_id`, `type` (`'pdf'`/`'video'`), `status`, `output_url`, `provider_id`, `error_message`, `created_at`, `updated_at`.

### Supabase Storage (buckets)

- `audio-wishes` — fichiers audio des vœux
- `media-wishes` — images et vidéos des vœux

Structure des fichiers dans les buckets : `{event_id}/table_{table_number}/{guest_name}_{timestamp}.{ext}`

---

## Variables d'environnement

Fichier `.env` à la racine (ne pas committer) :

```env
VITE_SUPABASE_URL=https://zlxwinvnfqlnncqantwq.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

**Aucune autre variable côté frontend.** Le secret partagé avec Bless Events est stocké uniquement dans les Supabase Secrets (côté Edge Functions).

---

## Intégration Bless Events

### Principe

Bless Events est une plateforme séparée. L'intégration se fait via 3 Edge Functions sécurisées par un **secret partagé** (`BLESS_SHARED_SECRET`) — pas de JWT Supabase.

### Secret partagé

```
rcdiYBWra2q6nhaxrblPzgFsK8VSeakp0H73cvGqU777IgadO98lKjMlEJjipCtx
```

- Côté Voeux Festifs : stocké dans **Supabase Secrets** sous `BLESS_SHARED_SECRET`
- Côté Bless Events : stocké dans `.env` sous `VITE_VOEUX_SHARED_SECRET`

### Les 3 Edge Functions d'intégration

#### 1. `provision-bless-event` — Créer un événement

```
POST https://zlxwinvnfqlnncqantwq.supabase.co/functions/v1/provision-bless-event
Authorization: Bearer <BLESS_SHARED_SECRET>
Content-Type: application/json

{
  "bless_event_id": "uuid-de-l-event-bless",
  "event_name": "Mariage Dupont",
  "client_name": "Jean & Marie Dupont",
  "event_date": "2026-09-15",
  "owner_email": "organisateur@email.com"
}
```

Réponse : `{ slug, guest_url, admin_url, voeux_event_id, already_exists? }`

Idempotent : si l'événement existe déjà (`bless_event_id` déjà présent), retourne les infos sans recréer.

#### 2. `sso-token` — Générer un magic link SSO

```
POST https://zlxwinvnfqlnncqantwq.supabase.co/functions/v1/sso-token
Authorization: Bearer <BLESS_SHARED_SECRET>
Content-Type: application/json

// Pour un admin Bless Events :
{ "email": "admin@bless-events.com", "role": "admin" }

// Pour un organisateur :
{ "email": "org@email.com", "role": "organizer", "bless_event_id": "uuid" }
```

Réponse : `{ magic_link_url, redirect_to, expires_at }`

Le magic link connecte l'utilisateur directement sur `/dashboard` sans mot de passe. Il expire après 1 heure.

#### 3. `event-stats` — Statistiques des vœux

```
GET https://zlxwinvnfqlnncqantwq.supabase.co/functions/v1/event-stats?bless_event_id=uuid
Authorization: Bearer <BLESS_SHARED_SECRET>
```

Réponse : `{ total, by_type, last_wish_at, slug, provisioned, admin_url }`

### Déploiement des Edge Functions

**CRITIQUE** : Toujours déployer avec `--no-verify-jwt`. Sans ce flag, Supabase intercepte le header `Authorization` et rejette le secret partagé (il attend un JWT).

```bash
supabase functions deploy sso-token --no-verify-jwt --project-ref zlxwinvnfqlnncqantwq
supabase functions deploy provision-bless-event --no-verify-jwt --project-ref zlxwinvnfqlnncqantwq
supabase functions deploy event-stats --no-verify-jwt --project-ref zlxwinvnfqlnncqantwq
supabase functions deploy generate-pdf --no-verify-jwt --project-ref zlxwinvnfqlnncqantwq
```

Note : `verify_jwt = false` dans `config.toml` ne s'applique qu'au **dev local**, pas à la production. Toujours passer `--no-verify-jwt` au déploiement.

### Variables Supabase Secrets (Edge Functions)

À configurer dans le dashboard Supabase → Settings → Edge Functions → Secrets :

| Clé | Valeur |
|---|---|
| `BLESS_SHARED_SECRET` | `rcdiYBWra2q6nhaxrblPzgFsK8VSeakp0H73cvGqU777IgadO98lKjMlEJjipCtx` |
| `VOEUX_BASE_URL` | `https://moment-events.vercel.app` (sans slash final) |

---

## Système de rôles (AdminDashboard)

Le rôle est stocké dans `app_metadata.bless_role` de l'utilisateur Supabase Auth. Il est injecté par `sso-token` lors de la connexion SSO.

| Valeur `bless_role` | Profil | Accès dans le dashboard |
|---|---|---|
| `undefined` | Utilisateur direct Voeux Festifs | Ses propres événements + formulaire de création |
| `'organizer'` | Organisateur Bless Events | Uniquement son événement (lien invité + QR + gestion vœux), sans formulaire création |
| `'admin'` | Admin Bless Events | TOUS les événements `source='bless_events'`, sans formulaire création |

```typescript
// Logique dans AdminDashboard.tsx
const blessRole = (user as any)?.app_metadata?.bless_role as "admin" | "organizer" | undefined;
const isBlessAdmin = blessRole === "admin";
const isBlessUser = blessRole === "admin" || blessRole === "organizer";
```

Bless Events peut avoir **plusieurs comptes admin** (pas de hardcoding d'email).

---

## Configuration Supabase Auth (dashboard)

Dans Supabase → Authentication → URL Configuration du projet `zlxwinvnfqlnncqantwq` :

- **Site URL** : `https://moment-events.vercel.app`
- **Redirect URLs** : ajouter `https://moment-events.vercel.app/*`

Sans cette config, les magic links SSO redirigent vers `localhost:3000`.

---

## Edge Functions — note TypeScript

Les Edge Functions Deno utilisent des imports URL (`https://esm.sh/...`) et le global `Deno`. VS Code signale des erreurs TypeScript car il utilise le compilateur Node.js. Ces erreurs sont **des faux positifs** et n'affectent pas le déploiement.

Chaque Edge Function commence par `// @ts-nocheck` pour supprimer ces erreurs dans l'IDE.

---

## Identité visuelle

- **Marque** : Moments Events by Bless Events
- **Palette** : Noir pur (`#000000`) + Or métallique (`#D4AF37` / gradient `#BF953F → #FCF6BA → #B38728`)
- **Logo** : `public/logo.png` (fond noir, logo doré)
- **Favicon** : `public/logo bless Events.ico`
- **CSS class logo** : `.logo-moments` (dans `src/App.css`)
- **Police** : System default + `font-serif` pour les éléments premium

---

## Flux utilisateur complet

### Côté invité
1. Invité scanne le QR code affiché dans la salle → `/:slug`
2. Saisit son prénom → redirigé vers `/:slug/voeux`
3. Choisit le type de vœu (texte / audio / photo) et soumet
4. Le vœu est enregistré en DB + fichier dans Supabase Storage

### Côté organisateur (via Bless Events)
1. Bless Events appelle `provision-bless-event` à l'activation de l'option
2. L'organisateur clique "Gérer les vœux" → Bless Events appelle `sso-token` avec `role: 'organizer'`
3. Magic link → connexion directe sur `/dashboard`
4. Voit son événement avec : lien invité, QR code (imprimable), gestion des vœux

### Côté admin Bless Events
1. Admin clique "Console Voeux Festifs" → Bless Events appelle `sso-token` avec `role: 'admin'`
2. Magic link → connexion directe sur `/dashboard`
3. Voit TOUS les événements Bless Events avec badge bleu "Bless Events"

---

## Points d'attention / pièges connus

1. **`--no-verify-jwt` obligatoire** au déploiement des Edge Functions — voir section déploiement
2. **`bless_event_id` doit être un UUID valide** — pas une string arbitraire (la colonne est de type UUID)
3. **`provision-bless-event` doit être appelé AVANT `sso-token`** pour un organisateur — sinon 404
4. **Le QR code pointe vers `/:slug`** (pas `/:slug/voeux`) — la Home page fait la redirection après prénom
5. **Pas de QR codes sur les pages d'invitation** — le QR code est un affichage physique le jour J
6. **Les types Supabase** (`src/integrations/supabase/types.ts`) sont générés automatiquement — ne pas modifier manuellement, régénérer avec `supabase gen types typescript`
7. **`types.ts` est encodé en UTF-16** dans ce projet — lecture via l'IDE uniquement, ne pas éditer manuellement
