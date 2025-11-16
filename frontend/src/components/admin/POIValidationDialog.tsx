import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, CheckCircle, XCircle, Shield, AlertCircle, Globe, Mail, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { normalizeOpeningHoursForForm } from '@/utils/poiFormNormalization';
import { formatOpeningHours } from '@/utils/openingHoursUtils';
import type { OpeningHoursData } from '@/types/opening-hours';
import { adminPoiService, AdminPoi, POIStatus } from '@/services/adminPoiService';

type POI = AdminPoi;

interface DetailedPOI extends POI {
  opening_hours_text?: string;
  opening_hours_structured?: OpeningHoursData | null;
  opening_hours_formatted?: string;
}

interface POIValidationDialogProps {
  poi: POI | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: () => void;
}

const statusConfig = {
  draft: { label: 'Brouillon', color: 'secondary', icon: Clock },
  pending_validation: { label: 'En attente', color: 'warning', icon: Clock },
  under_review: { label: 'En cours de révision', color: 'info', icon: AlertCircle },
  approved: { label: 'Approuvé', color: 'success', icon: CheckCircle },
  rejected: { label: 'Rejeté', color: 'destructive', icon: XCircle },
  blocked: { label: 'Bloqué', color: 'destructive', icon: Shield }
};

const rejectionReasons = [
  "Informations incomplètes",
  "Images de mauvaise qualité",
  "Localisation incorrecte",
  "Description inappropriée",
  "Contenu spam ou publicitaire",
  "Violation des conditions d'utilisation",
  "Autre (préciser dans le message)"
];

function toArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim());
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function renderBadgeList(items?: string[] | null, placeholder = 'Non renseigné'): React.ReactNode {
  if (!items || items.length === 0) {
    return <span className="text-sm text-muted-foreground">{placeholder}</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item} variant="outline" className="text-xs">
          {item}
        </Badge>
      ))}
    </div>
  );
}

function renderBooleanBadge(value?: boolean | null): React.ReactNode {
  if (value === undefined || value === null) {
    return <span className="text-sm text-muted-foreground">Non renseigné</span>;
  }

  return (
    <Badge variant={value ? 'default' : 'secondary'} className="text-xs">
      {value ? 'Oui' : 'Non'}
    </Badge>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/10 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value?: React.ReactNode }) {
  const isEmpty =
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim().length === 0);

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm leading-relaxed">
        {isEmpty ? <span className="text-muted-foreground">Non renseigné</span> : value}
      </div>
    </div>
  );
}

function formatUrl(url: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `https://${url}`;
}

export function POIValidationDialog({ poi, isOpen, onClose, onStatusUpdate }: POIValidationDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<POIStatus | ''>('');
  const [reason, setReason] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailedPoi, setDetailedPoi] = useState<DetailedPOI | null>(null);
  const { toast } = useToast();

  const handleStatusUpdate = async () => {
    if (!poi || !selectedStatus || selectedStatus === poi.status_enum) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un nouveau statut",
        variant: "destructive"
      });
      return;
    }

    if ((selectedStatus === 'rejected' || selectedStatus === 'blocked') && !reason) {
      toast({
        title: "Justification requise",
        description: "Veuillez fournir une raison pour le rejet ou blocage",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await adminPoiService.moderate(poi.id, {
        status: selectedStatus,
        reason: reason || undefined,
        admin_message: adminMessage || undefined,
      });

      toast({
        title: "Statut mis à jour",
        description: `Le POI a été ${statusConfig[selectedStatus].label.toLowerCase()}`,
      });

      onStatusUpdate();
      onClose();
      
      // Reset form
      setSelectedStatus('');
      setReason('');
      setAdminMessage('');
    } catch (error) {
      console.error('Error updating POI status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut du POI",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!poi || !isOpen) {
      setDetailedPoi(null);
      setDetailsError(null);
      setIsDetailsLoading(false);
      return;
    }

    // Reset form controls when switching POI
    setSelectedStatus('');
    setReason('');
    setAdminMessage('');

    let isCancelled = false;

    const loadDetails = async () => {
      setIsDetailsLoading(true);
      setDetailsError(null);

      try {
        const data = await adminPoiService.get(poi.id);
        const { openingHoursText, openingHoursStructured } = normalizeOpeningHoursForForm(
          data.opening_hours_structured,
          data.opening_hours
        );

        const openingHoursFormatted = openingHoursStructured
          ? formatOpeningHours(openingHoursStructured, 'detailed')
          : openingHoursText || poi.opening_hours || '';

        const details: DetailedPOI = {
          ...data,
          categories: toArray(data.metadata?.categories ?? data.tags),
          tags: toArray(data.tags as string[] | undefined),
          amenities: toArray(data.amenities),
          special_features: toArray(data.metadata?.special_features),
          target_audience: toArray(data.metadata?.target_audience),
          cuisine_types: toArray(data.metadata?.cuisine_types ?? data.cuisine_types),
          dietary_restrictions_supported: toArray(
            data.metadata?.dietary_restrictions_supported ?? data.dietary_restrictions_supported
          ),
          restaurant_categories: toArray(data.metadata?.restaurant_categories ?? data.restaurant_categories),
          accommodation_types: toArray(data.metadata?.accommodation_types ?? data.accommodation_types),
          accommodation_amenities: toArray(
            data.metadata?.accommodation_amenities ?? data.accommodation_amenities
          ),
          accommodation_locations: toArray(
            data.metadata?.accommodation_locations ?? data.accommodation_locations
          ),
          accommodation_accessibility: toArray(
            data.metadata?.accommodation_accessibility ?? data.accommodation_accessibility
          ),
          accommodation_security: toArray(
            data.metadata?.accommodation_security ?? data.accommodation_security
          ),
          accommodation_ambiance: toArray(
            data.metadata?.accommodation_ambiance ?? data.accommodation_ambiance
          ),
          activity_categories: toArray(data.metadata?.activity_categories ?? data.activity_categories),
          activity_interests: toArray(data.metadata?.activity_interests ?? data.activity_interests),
          activity_avoidances: toArray(data.metadata?.activity_avoidances ?? data.activity_avoidances),
          media_images: data.media?.map((m) => m.external_url || m.file || '').filter(Boolean) ?? [],
          media_videos: toArray(data.metadata?.media_videos),
          opening_hours: openingHoursText || poi.opening_hours || null,
          opening_hours_structured: openingHoursStructured,
          opening_hours_formatted: openingHoursFormatted,
        };

        if (!isCancelled) {
          setDetailedPoi(details);
        }
      } catch (error) {
        console.error('Error loading detailed POI information:', error);
        if (!isCancelled) {
          setDetailedPoi(null);
          setDetailsError('Impossible de charger les informations détaillées du POI');
        }
      } finally {
        if (!isCancelled) {
          setIsDetailsLoading(false);
        }
      }
    };

    loadDetails();

    return () => {
      isCancelled = true;
    };
  }, [poi, isOpen]);

  if (!poi) return null;

  const StatusIcon = statusConfig[poi.status_enum].icon;

  const info = detailedPoi ?? poi;
  const categories = toArray(info?.categories);
  const tags = toArray(info?.tags);
  const amenities = toArray(info?.amenities);
  const specialFeatures = toArray(info?.special_features);
  const targetAudience = toArray(info?.target_audience);
  const cuisineTypes = toArray(info?.cuisine_types);
  const dietaryRestrictions = toArray(info?.dietary_restrictions_supported);
  const restaurantCategories = toArray(info?.restaurant_categories);
  const accommodationTypes = toArray(info?.accommodation_types);
  const accommodationAmenities = toArray(info?.accommodation_amenities);
  const accommodationLocations = toArray(info?.accommodation_locations);
  const accommodationAccessibility = toArray(info?.accommodation_accessibility);
  const accommodationSecurity = toArray(info?.accommodation_security);
  const accommodationAmbiance = toArray(info?.accommodation_ambiance);
  const activityCategories = toArray(info?.activity_categories);
  const activityInterests = toArray(info?.activity_interests);
  const activityAvoidances = toArray(info?.activity_avoidances);
  const mediaImages =
    info?.media?.map((m) => m.external_url || m.file || '').filter(Boolean) ??
    info?.media_images ??
    info?.images ??
    [];
  const mediaVideos = toArray(info?.media_videos);
  const owner = detailedPoi?.owner_detail ?? poi.owner_detail ?? null;
  const partner = detailedPoi?.partner_detail ?? poi.partner_detail ?? null;

  const openingHoursDisplay = detailedPoi?.opening_hours_formatted
    || (typeof info?.opening_hours === 'string' ? info.opening_hours : '')
    || '';

  const createdAt = info?.created_at ? new Date(info.created_at).toLocaleString('fr-FR') : null;
  const updatedAt = info?.updated_at ? new Date(info.updated_at).toLocaleString('fr-FR') : null;
  const validationScore = info?.validation_score;
  const submissionCount = info?.submission_count;
  const latitude = typeof info?.latitude === 'number' ? info.latitude : null;
  const longitude = typeof info?.longitude === 'number' ? info.longitude : null;
  const contactPhone = info?.contact_phone;
  const contactEmail = info?.contact_email;
  const websiteUrl = info?.website_url ? formatUrl(info.website_url) : null;
  const priceRange = info?.price_range;
  const budgetLevel = info?.budget_level_id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            Validation du POI: {poi.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Statut actuel:</span>
            <Badge variant={statusConfig[poi.status_enum].color as any}>
              {statusConfig[poi.status_enum].label}
            </Badge>
          </div>

          {isDetailsLoading ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Chargement des informations détaillées...
              </p>
            </div>
          ) : detailsError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {detailsError}
            </div>
          ) : (
            <div className="space-y-4">
              <DetailSection title="Informations générales">
                <InfoField
                  label="Description"
                  value={info?.description ? (
                    <p className="whitespace-pre-line text-sm text-muted-foreground">
                      {info.description}
                    </p>
                  ) : null}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoField label="Catégories" value={renderBadgeList(categories)} />
                  <InfoField label="Tags" value={renderBadgeList(tags)} />
                  <InfoField
                    label="Score de validation"
                    value={
                      validationScore !== null && validationScore !== undefined ? (
                        <Badge variant="outline" className="w-fit text-xs">
                          {validationScore}
                        </Badge>
                      ) : null
                    }
                  />
                  <InfoField
                    label="Nombre de soumissions"
                    value={
                      submissionCount !== null && submissionCount !== undefined
                        ? submissionCount.toString()
                        : null
                    }
                  />
                  <InfoField label="Créé le" value={createdAt} />
                  <InfoField label="Mis à jour le" value={updatedAt} />
                </div>
              </DetailSection>

              <div className="grid gap-4 md:grid-cols-2">
                <DetailSection title="Localisation">
                  <InfoField label="Adresse" value={info?.address} />
                  <InfoField label="Ville" value={info?.city_name} />
                  <InfoField label="Pays" value={info?.country_name} />
                  <InfoField
                    label="Coordonnées"
                    value={
                      latitude !== null && longitude !== null
                        ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
                        : null
                    }
                  />
                </DetailSection>

                <DetailSection title="Contact & site">
                  <InfoField label="Téléphone" value={contactPhone} />
                  <InfoField
                    label="Email"
                    value={
                      contactEmail ? (
                        <a
                          href={`mailto:${contactEmail}`}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Mail className="h-3 w-3" />
                          {contactEmail}
                        </a>
                      ) : null
                    }
                  />
                  <InfoField
                    label="Site web"
                    value={
                      websiteUrl ? (
                        <a
                          href={websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Globe className="h-3 w-3" />
                          Visiter le site
                        </a>
                      ) : null
                    }
                  />
                  <InfoField
                    label="Tarif & budget"
                    value={
                      priceRange || budgetLevel ? (
                        <div className="flex flex-col gap-1">
                          {priceRange && <span className="text-sm">{priceRange}</span>}
                          {budgetLevel && (
                            <Badge variant="outline" className="w-fit text-xs uppercase">
                              {budgetLevel}
                            </Badge>
                          )}
                        </div>
                      ) : null
                    }
                  />
                </DetailSection>
              </div>

              <DetailSection title="Horaires d'ouverture">
                <InfoField
                  label="Horaires"
                  value={
                    openingHoursDisplay
                      ? (
                          <pre className="whitespace-pre-wrap rounded-md bg-muted/60 p-3 text-xs font-mono text-muted-foreground">
                            {openingHoursDisplay}
                          </pre>
                        )
                      : null
                  }
                />
              </DetailSection>

              <div className="grid gap-4 md:grid-cols-2">
                <DetailSection title="Accessibilité">
                  <InfoField label="Accès PMR" value={renderBooleanBadge(info?.is_wheelchair_accessible)} />
                  <InfoField label="Parking accessible" value={renderBooleanBadge(info?.has_accessible_parking)} />
                  <InfoField label="Toilettes accessibles" value={renderBooleanBadge(info?.has_accessible_restrooms)} />
                  <InfoField label="Audioguide" value={renderBooleanBadge(info?.has_audio_guide)} />
                  <InfoField label="Langue des signes" value={renderBooleanBadge(info?.has_sign_language_support)} />
                </DetailSection>
                <DetailSection title="Services & audiences">
                  <InfoField label="Équipements" value={renderBadgeList(amenities)} />
                  <InfoField label="Public cible" value={renderBadgeList(targetAudience)} />
                  <InfoField label="Caractéristiques" value={renderBadgeList(specialFeatures)} />
                </DetailSection>
              </div>

              {info?.is_restaurant && (
                <DetailSection title="Informations restaurant">
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoField
                      label="Types de cuisine"
                      value={renderBadgeList(cuisineTypes, 'Aucune cuisine renseignée')}
                    />
                    <InfoField
                      label="Régimes proposés"
                      value={renderBadgeList(dietaryRestrictions, 'Aucun régime spécifique')}
                    />
                    <InfoField label="Catégories" value={renderBadgeList(restaurantCategories)} />
                    <InfoField
                      label="Niveau d'aventure culinaire"
                      value={info?.culinary_adventure_level_id ?? null}
                    />
                  </div>
                </DetailSection>
              )}

              {info?.is_accommodation && (
                <DetailSection title="Informations hébergement">
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoField label="Types d'hébergement" value={renderBadgeList(accommodationTypes)} />
                    <InfoField label="Services & commodités" value={renderBadgeList(accommodationAmenities)} />
                    <InfoField label="Situation" value={renderBadgeList(accommodationLocations)} />
                    <InfoField label="Accessibilité" value={renderBadgeList(accommodationAccessibility)} />
                    <InfoField label="Sécurité" value={renderBadgeList(accommodationSecurity)} />
                    <InfoField label="Ambiance" value={renderBadgeList(accommodationAmbiance)} />
                  </div>
                </DetailSection>
              )}

              {info?.is_activity && (
                <DetailSection title="Informations activité">
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoField label="Catégories" value={renderBadgeList(activityCategories)} />
                    <InfoField label="Centres d'intérêt" value={renderBadgeList(activityInterests)} />
                    <InfoField label="À éviter" value={renderBadgeList(activityAvoidances)} />
                    <InfoField
                      label="Intensité"
                      value={info?.activity_intensity_level || info?.activity_intensity_level_id || null}
                    />
                    <InfoField
                      label="Âge minimum"
                      value={
                        info?.min_age !== null && info?.min_age !== undefined
                          ? `${info.min_age} ans`
                          : null
                      }
                    />
                    <InfoField
                      label="Âge maximum"
                      value={
                        info?.max_age !== null && info?.max_age !== undefined
                          ? `${info.max_age} ans`
                          : null
                      }
                    />
                    <InfoField
                      label="Durée"
                      value={info?.duration_hours ? `${info.duration_hours} h` : null}
                    />
                    <InfoField
                      label="Participants max."
                      value={info?.max_participants ? `${info.max_participants}` : null}
                    />
                  </div>
                </DetailSection>
              )}

              <DetailSection title="Médias">
                {mediaImages && mediaImages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {mediaImages.slice(0, 6).map((image, index) => (
                      <img
                        key={`${image}-${index}`}
                        src={image}
                        alt={`POI média ${index + 1}`}
                        className="h-24 w-full rounded object-cover"
                      />
                    ))}
                    {mediaImages.length > 6 && (
                      <Badge variant="outline" className="col-span-full text-center text-xs text-muted-foreground">
                        +{mediaImages.length - 6} autres images
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Aucune image fournie</span>
                )}
                {mediaVideos.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {mediaVideos.map((video, index) => (
                      <a
                        key={`${video}-${index}`}
                        href={formatUrl(video)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        🎬 {video}
                      </a>
                    ))}
                  </div>
                )}
              </DetailSection>

              <DetailSection title="Propriétaire & partenaire">
                <div className="grid gap-4 md:grid-cols-2">
                  <InfoField
                    label="Propriétaire"
                    value={owner ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {[
                            owner.profile?.first_name,
                            owner.profile?.last_name,
                          ].filter(Boolean).join(' ') || owner.display_name || 'Non renseigné'}
                        </p>
                        {owner.email && (
                          <a href={`mailto:${owner.email}`} className="text-sm text-primary hover:underline">
                            {owner.email}
                          </a>
                        )}
                      </div>
                    ) : null}
                  />
                  <InfoField
                    label="Partenaire"
                    value={partner ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{partner.company_name}</p>
                        {partner.status && (
                          <Badge variant="outline" className="w-fit text-xs uppercase">{partner.status}</Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">POI soumis directement par un utilisateur</span>
                    )}
                  />
                </div>
              </DetailSection>

              {(info.rejection_reason || info.blocked_reason) && (
                <DetailSection title="Historique des décisions">
                  {info.rejection_reason && (
                    <InfoField
                      label="Raison du rejet précédent"
                      value={<span className="text-sm text-destructive">{info.rejection_reason}</span>}
                    />
                  )}
                  {info.blocked_reason && (
                    <InfoField
                      label="Raison du blocage"
                      value={<span className="text-sm text-destructive">{info.blocked_reason}</span>}
                    />
                  )}
                </DetailSection>
              )}
            </div>
          )}

          {/* Status Update Form */}
          <div className="border-t pt-4 space-y-4">
            <div>
              <Label htmlFor="status">Nouveau statut</Label>
              <Select value={selectedStatus} onValueChange={(value: POIStatus) => setSelectedStatus(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="under_review">Mettre en cours de révision</SelectItem>
                  <SelectItem value="approved">Approuver</SelectItem>
                  <SelectItem value="rejected">Rejeter</SelectItem>
                  <SelectItem value="blocked">Bloquer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(selectedStatus === 'rejected' || selectedStatus === 'blocked') && (
              <div>
                <Label htmlFor="reason">
                  Raison du {selectedStatus === 'rejected' ? 'rejet' : 'blocage'} *
                </Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une raison" />
                  </SelectTrigger>
                  <SelectContent>
                    {rejectionReasons.map((reasonOption) => (
                      <SelectItem key={reasonOption} value={reasonOption}>
                        {reasonOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="message">Message pour le partenaire (optionnel)</Label>
              <Textarea
                id="message"
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                placeholder="Ajouter un message explicatif..."
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button onClick={handleStatusUpdate} disabled={isLoading}>
                {isLoading ? 'Mise à jour...' : 'Mettre à jour'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
