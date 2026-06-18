# n8n-nodes-layerone

Nœuds communautaires [n8n](https://n8n.io) pour les API **LayerOne** :

- **DocX** — génération de documents Word/PDF et de factures électroniques **Factur-X** (réforme 2026) à partir de modèles, plus la gestion versionnée des modèles.
- **Sign** — signature électronique **eIDAS / PAdES** : envoi de PDF à signer, suivi du statut, vérification d'identité par SMS (OTP) et récupération des preuves juridiques.

Ce paquet contient deux nœuds (`DocX`, `Sign`) et deux credentials (`DocX API`, `Sign API`). Il **n'a aucune dépendance d'exécution** (exigence des nœuds vérifiés n8n) : tout passe par le moteur de requêtes déclaratif de n8n.

## Prérequis (compte LayerOne)

Les API LayerOne nécessitent une clé. Créez un compte gratuit sur **https://dev.layerone.fr** (20 documents/mois pour DocX, 10 signatures/mois pour Sign), puis générez une clé dans l'onglet « Clés API ». La clé est envoyée dans l'en-tête `X-API-Key`.

| Service | URL de base | Authentification |
| --- | --- | --- |
| DocX | `https://docx.layerone.fr` | en-tête `X-API-Key` |
| Sign | `https://sign.layerone.fr` | en-tête `X-API-Key` |

## Opérations

### DocX (11 opérations)

| Ressource | Opération | Méthode | Endpoint |
| --- | --- | --- | --- |
| Document | Render Document | POST | `/render-document` |
| Document | Render Factur-X Invoice | POST | `/render-facturx` |
| Template | Upload | POST | `/client/templates` |
| Template | Update | PUT | `/client/templates/{templateId}` |
| Template | Download | GET | `/client/templates/{templateId}` |
| Template | Delete | DELETE | `/client/templates/{templateId}` |
| Template | List | GET | `/client/templates` |
| Template Version | List Versions | GET | `/client/templates/{templateId}/versions` |
| Template Version | Download Version | GET | `/client/templates/{templateId}/versions/{versionId}` |
| Template Version | Restore Version | POST | `/client/templates/{templateId}/restore/{versionId}` |
| Account | Get Usage Stats | GET | `/usage-stats` |

- **Render Document / Factur-X** : corps `application/x-www-form-urlencoded` (`template_id`, `json_data`, `output_format`, `output_filename`). La réponse binaire (PDF/DOCX) est placée dans la propriété binaire `data` de l'item.
- **Upload / Update** : envoi multipart du fichier `.docx` lu depuis une propriété binaire de l'item d'entrée (champ « Input Binary Field », par défaut `data`).
- **Download / Download Version** : la réponse binaire est placée dans la propriété binaire `data`.

### Sign (9 opérations)

| Ressource | Opération | Méthode | Endpoint |
| --- | --- | --- | --- |
| Document | Send for Signature | POST | `/v1/documents/send` |
| Document | Detect Fields | POST | `/v1/documents/detect-fields` |
| Document | Get Status | GET | `/v1/documents/{documentId}` |
| Document | Get Audit Certificate | GET | `/v1/documents/{documentId}/audit` |
| Document | Validate Signature | GET | `/v1/documents/{documentId}/validate` |
| Document | Download Signed Document | GET | `/v1/documents/{documentId}/download` |
| Document | Cancel | DELETE | `/v1/documents/{documentId}` |
| OTP | Send OTP (SMS) | POST | `/v1/otp/request` |
| OTP | Verify OTP (SMS) | POST | `/v1/otp/verify` |

- **Send for Signature / Detect Fields** : le PDF est passé en base64 dans le corps JSON (`pdf_base64`). Le signataire est construit dans `signers[0]` (`name`, `email`, `role`, `phone`).
- **Download Signed Document** : renvoie le JSON LayerOne contenant `pdf_base64`, `title`, `size_bytes`.

## Test des credentials

- **DocX** : le test interroge `GET /usage-stats`. Une clé valide renvoie `200` ; une clé inconnue renvoie `401`, ce qui fait échouer le test.
- **Sign** : le test interroge `GET /v1/documents/n8n-credential-check`. L'authentification est vérifiée avant la recherche du document : une clé valide renvoie `404` (document inconnu, ignoré par le test) ; une clé invalide renvoie `401`/`403`, ce qui fait échouer le test.

---

## Installation dans n8n (utilisateur final)

Dans une instance n8n auto-hébergée : **Settings → Community Nodes → Install**, puis saisir `n8n-nodes-layerone`. (Disponible une fois le paquet publié sur npm — voir ci-dessous.)

---

## Développement local

```bash
# 1. Installer les dépendances de développement (aucune dépendance d'exécution)
npm install

# 2. Compiler le TypeScript + copier les icônes
npm run build

# 3. Vérifier le code avec le linter n8n
npm run lint

# 4. Tester dans une instance n8n locale
#    Lier le paquet puis le déclarer dans ~/.n8n/custom (cf. docs n8n) :
#    https://docs.n8n.io/integrations/creating-nodes/test/run-node-locally/
npm link
```

## Publication sur npm (propriétaire du compte)

> ⚠️ Ces étapes nécessitent des **comptes tiers** dont seul le propriétaire dispose. Voir la section « Ce qui requiert un compte tiers » plus bas.

La publication doit se faire **via GitHub Actions avec provenance** (exigence n8n depuis mai 2026 pour la vérification). Le workflow `.github/workflows/publish.yml` est déjà fourni.

1. **Créer le dépôt GitHub** et y pousser le contenu de `integrations/n8n/` (ce dossier devient la racine du dépôt npm).
2. **Créer un jeton npm** de type *Automation* (compte npm requis) et l'ajouter en **secret de dépôt GitHub** nommé `NPM_TOKEN` (Settings → Secrets and variables → Actions).
3. **Mettre à jour `package.json`** : champ `repository.url` (URL réelle du dépôt) et, si besoin, `author`.
4. **Créer une release GitHub** (un tag de version, ex. `v1.0.0`). La publication se déclenche automatiquement :
   - `npm ci` → `npm run build` → `npm run lint` → `npm publish --provenance --access public`.
   - La provenance est enregistrée par npm grâce à l'OIDC GitHub (`id-token: write` dans le workflow).
5. Vérifier sur https://www.npmjs.com/package/n8n-nodes-layerone que le paquet apparaît **avec le badge de provenance**.

## Soumission pour vérification n8n (Creator Portal)

Une fois le paquet publié sur npm avec provenance :

1. Aller sur le **n8n Creator Portal** (compte n8n / Creator Portal requis) : https://www.n8n.io/creators/ → soumettre le nœud communautaire.
2. n8n récupère le paquet depuis npm et lance ses vérifications automatiques (pas de dépendance d'exécution, structure conforme, README présent, credentials avec test, conventions UX).
3. Corriger les éventuels retours, republier (nouvelle release → nouvelle version), puis re-soumettre.

Référence officielle : https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/

---

## Ce qui requiert un compte tiers (à faire par le propriétaire)

| Action | Compte requis | Détail |
| --- | --- | --- |
| Héberger le code + lancer le workflow de publication | **GitHub** | Créer le dépôt, ajouter le secret `NPM_TOKEN`, créer les releases |
| Publier sur npm (avec provenance) | **npm** | Générer un jeton *Automation*. Le nom `n8n-nodes-layerone` doit être disponible sur npm |
| Soumettre pour vérification | **n8n Creator Portal** | Soumission + suivi des retours de vérification |

Le code de ce paquet est complet et autonome : aucune clé ni secret n'y est codé en dur. Les seules actions restantes sont la création des comptes/jetons ci-dessus et le déclenchement de la publication.
