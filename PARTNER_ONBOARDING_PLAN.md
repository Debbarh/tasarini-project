# Partner Onboarding Plan

## Phase A – Stabiliser l’expérience utilisateur
- Quick signup conserve les données business/localStorage via `partnerOnboardingStorage`.
- Step 3 se pré-remplit automatiquement et valide les champs requis avant envoi.
- Messages de succès/erreur explicites après chaque action.

## Phase B – Simplifier la transition Step 2
1. **Réponse backend enrichie**
   - Étendre `VerifyEmailView` pour retourner `auto_login_available` (True si le compte est actif après vérification) et `role`.
   - Ajouter `partner_profile_status` pour indiquer `draft` / `pending_review` / `approved`.
2. **Endpoint d’auto-login**
   - Créer `POST /api/auth/verify-email/complete/` qui prend le `token`, vérifie l’email si nécessaire, renvoie le couple JWT (`access`,`refresh`) + `user`.
   - Invalider le token pour éviter les réutilisations.
3. **UI VerifyEmail**
   - Si `auto_login_available` est vrai, essayer automatiquement l’endpoint `complete/` pour connecter l’utilisateur puis rediriger vers `/complete-partner-profile`.
   - Afficher un bouton “Continuer” qui relance l’auto-login ou, en cas d’échec, redirige vers `/auth?redirectTo=...`.
   - Ajouter un bouton “Renvoyer le lien” qui appelle `POST /api/auth/resend-verification/` si session active ou affiche des instructions sinon.
4. **Gestion d’état côté frontend**
   - Conserver le token de vérification dans `sessionStorage` le temps de la session pour retenter l’auto-login si le réseau échoue.
   - Journaliser les erreurs pour debugging (`console.warn` + toast dédié).
5. **Messaging**
   - Toast “Email vérifié, connexion en cours…” pendant l’appel auto-login.
   - Toast “Impossible de vous connecter automatiquement, veuillez vous identifier” si l’endpoint échoue.

## Prochaines étapes
- Implémenter l’extension backend (`auto_login_available`, nouveau endpoint).
- Adapter `VerifyEmail.tsx` pour consommer ces données.
- Tester les scénarios :
  1. Lien ouvert dans la même session (auto-login OK).
  2. Lien ouvert hors session (redirige vers auth → Step 3).
  3. Token invalide / expiré (message d’erreur + CTA renvoi).
