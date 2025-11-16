// Export principal pour tous les composants de migration POI
export { PartnerAdvancedPOIForm } from './PartnerAdvancedPOIForm';
export { PartnerSimplePOIForm } from './PartnerSimplePOIForm';
export { PartnerPOIEditForm } from './PartnerPOIEditForm';
export { UserPOIContributionForm } from './UserPOIContributionForm';
export { AdminPOIForm } from './AdminPOIForm';

/**
 * Guide de migration pour remplacer les anciens formulaires POI
 * 
 * ANCIENS FORMULAIRES → NOUVEAUX COMPOSANTS :
 * 
 * 1. POICreationForm.tsx → PartnerAdvancedPOIForm
 *    - Formulaire complexe pour partenaires avancés
 *    - Toutes les sections activées avec validation stricte
 * 
 * 2. TouristPointForm.tsx (partner) → PartnerSimplePOIForm  
 *    - Formulaire simplifié pour partenaires basiques
 *    - Sections essentielles seulement
 * 
 * 3. TouristPointForm.tsx (BeInspired/Profile) → UserPOIContributionForm
 *    - Formulaire basique pour contributions utilisateurs
 *    - Validation minimale, workflow d'approbation
 * 
 * 4. Formulaires admin → AdminPOIForm
 *    - Accès complet avec outils de validation et modération
 *    - Mode création et édition
 * 
 * UTILISATION :
 * 
 * import { PartnerAdvancedPOIForm } from '@/components/poi/migration';
 * 
 * <PartnerAdvancedPOIForm
 *   isOpen={showForm}
 *   onClose={() => setShowForm(false)}
 *   onSuccess={() => { handleSuccess(); setShowForm(false); }}
 * />
 * 
 * MIGRATION PROGRESSIVE :
 * 
 * Phase 4.1 - Remplacer POICreationForm par PartnerAdvancedPOIForm
 * Phase 4.2 - Remplacer TouristPointForm partner par PartnerSimplePOIForm
 * Phase 4.3 - Remplacer TouristPointForm users par UserPOIContributionForm
 * Phase 4.4 - Intégrer AdminPOIForm dans l'administration
 * Phase 4.5 - Nettoyer les anciens formulaires
 */