import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiClient } from "@/integrations/api/client";

interface TravelRequest {
  id?: string;
  session_id: string;
  user_country?: string | null;
  user_city?: string | null;
  user_region?: string | null;
  user_neighborhood?: string | null;
  user_language?: string | null;
  destinations?: any;
  trip_duration?: number | null;
  travel_group_type?: string | null;
  travel_group_size?: number | null;
  budget_level?: string | null;
  budget_amount?: number | null;
  budget_currency?: string | null;
  completion_status: string;
  step_completed: string;
  created_at: string;
  culinary_preferences?: any;
  accommodation_preferences?: any;
  activity_preferences?: any;
  ai_generated_itinerary?: any;
  ai_provider_used?: string | null;
  used_ai: boolean;
}

const TripRequestsOverview = () => {
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<TravelRequest | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<TravelRequest[]>("analytics/travel/", { days: "90" });
      // Handle both array and paginated response formats
      const requestsArray = Array.isArray(data)
        ? data
        : (data as any)?.results || [];
      setRequests(requestsArray);
    } catch (err) {
      console.error("Error fetching travel requests", err);
      setError("Impossible de charger les demandes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const formatDestinations = (entry: TravelRequest) => {
    if (!entry.destinations) return "—";
    let parsed: any[] = [];
    try {
      parsed = Array.isArray(entry.destinations) ? entry.destinations : JSON.parse(entry.destinations);
    } catch {
      return "—";
    }
    if (!parsed.length) return "—";
    return parsed
      .map((dest) => `${dest.city || dest.country || "—"}${dest.duration ? ` (${dest.duration}j)` : ""}`)
      .join(", ");
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Demandes récentes</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
          {loading ? "Chargement..." : "Rafraîchir"}
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive mb-3">{error}</p>}
        {loading && requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chargement des demandes...</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune demande enregistrée pour le moment.</p>
        ) : (
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead>Langue</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Groupe</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Destinations</TableHead>
                  <TableHead>IA</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id ?? request.session_id}>
                    <TableCell className="whitespace-nowrap">{formatDate(request.created_at)}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{request.user_country || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {request.user_city || "—"}
                        {request.user_neighborhood ? ` • ${request.user_neighborhood}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>{request.user_language || "—"}</TableCell>
                    <TableCell>
                      {request.trip_duration ?? "—"}
                      {request.trip_duration ? " j" : ""}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{request.travel_group_type || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {request.travel_group_size ? `${request.travel_group_size} pers.` : "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{request.budget_level || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {request.budget_amount ? `${request.budget_amount} ${request.budget_currency || ""}` : "—"}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-sm">
                      <p className="text-xs text-muted-foreground line-clamp-3">{formatDestinations(request)}</p>
                    </TableCell>
                    <TableCell>
                      {request.used_ai ? (
                        <div>
                          <Badge variant="default" className="bg-green-500">
                            Oui
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {request.ai_provider_used || "—"}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="secondary">Non</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={request.completion_status === "completed" ? "default" : "secondary"}>
                        {request.completion_status}
                      </Badge>
                      <div className="text-xs text-muted-foreground">{request.step_completed}</div>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                        Voir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground mt-3">Total demandes : {requests.length}</p>
          </ScrollArea>
        )}
      </CardContent>
      <RequestDetailsDialog
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </Card>
  );
};

export default TripRequestsOverview;

const parseJSONField = (value: any) => {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

interface RequestDetailsDialogProps {
  request: TravelRequest | null;
  onClose: () => void;
}

const RequestDetailsDialog = ({ request, onClose }: RequestDetailsDialogProps) => {
  if (!request) return null;

  const destinations = parseJSONField(request.destinations) || [];
  const culinary = parseJSONField(request.culinary_preferences);
  const accommodation = parseJSONField(request.accommodation_preferences);
  const activities = parseJSONField(request.activity_preferences);

  return (
    <Dialog open={Boolean(request)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails de la demande</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <section>
            <h4 className="font-semibold">Infos utilisateur</h4>
            <div className="grid grid-cols-2 gap-3">
              <p><span className="text-muted-foreground">Pays:</span> {request.user_country || "—"}</p>
              <p><span className="text-muted-foreground">Ville:</span> {request.user_city || "—"}</p>
              <p><span className="text-muted-foreground">Quartier:</span> {request.user_neighborhood || "—"}</p>
              <p><span className="text-muted-foreground">Langue:</span> {request.user_language || "—"}</p>
            </div>
          </section>

          <section>
            <h4 className="font-semibold">Itinéraire</h4>
            {destinations.length === 0 ? (
              <p className="text-muted-foreground">Aucune destination renseignée.</p>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ville</TableHead>
                      <TableHead>Pays</TableHead>
                      <TableHead>Durée</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {destinations.map((dest: any, idx: number) => (
                      <TableRow key={`${dest.city}-${idx}`}>
                        <TableCell>{dest.city || "—"}</TableCell>
                        <TableCell>{dest.country || "—"}</TableCell>
                        <TableCell>{dest.duration ? `${dest.duration} jours` : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          <section className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold">Groupe de voyage</h4>
              <p><span className="text-muted-foreground">Type:</span> {request.travel_group_type || "—"}</p>
              <p><span className="text-muted-foreground">Taille:</span> {request.travel_group_size || "—"}</p>
            </div>
            <div>
              <h4 className="font-semibold">Budget</h4>
              <p><span className="text-muted-foreground">Niveau:</span> {request.budget_level || "—"}</p>
              <p><span className="text-muted-foreground">Montant:</span> {request.budget_amount ? `${request.budget_amount} ${request.budget_currency || ""}` : "—"}</p>
            </div>
          </section>

          <section>
            <h4 className="font-semibold">Préférences culinaires</h4>
            {culinary ? (
              <div className="grid grid-cols-2 gap-3">
                <p><span className="text-muted-foreground">Restrictions:</span> {culinary.dietaryRestrictions?.join(", ") || "—"}</p>
                <p><span className="text-muted-foreground">Cuisines:</span> {culinary.cuisineTypes?.join(", ") || "—"}</p>
                <p><span className="text-muted-foreground">Catégories:</span> {culinary.restaurantCategories?.join(", ") || "—"}</p>
                <p><span className="text-muted-foreground">Aventure:</span> {culinary.foodAdventure || "—"}</p>
                <p><span className="text-muted-foreground">Consommation alcool:</span> {culinary.alcoholConsumption ? "Oui" : "Non"}</p>
              </div>
            ) : <p className="text-muted-foreground">—</p>}
          </section>

          <section>
            <h4 className="font-semibold">Hébergement</h4>
            {accommodation ? (
              <div className="grid grid-cols-2 gap-3">
                <p><span className="text-muted-foreground">Type:</span> {accommodation.type?.join(", ") || "—"}</p>
                <p><span className="text-muted-foreground">Commodités:</span> {accommodation.amenities?.join(", ") || "—"}</p>
                <p><span className="text-muted-foreground">Emplacement:</span> {accommodation.location?.join(", ") || "—"}</p>
                <p><span className="text-muted-foreground">Accessibilité:</span> {accommodation.accessibility?.join(", ") || "—"}</p>
                <p><span className="text-muted-foreground">Sécurité:</span> {accommodation.security?.join(", ") || "—"}</p>
                <p><span className="text-muted-foreground">Ambiance:</span> {accommodation.ambiance?.join(", ") || "—"}</p>
              </div>
            ) : <p className="text-muted-foreground">—</p>}
          </section>

          <section>
            <h4 className="font-semibold">Activités</h4>
            {activities ? (
              <div className="grid grid-cols-2 gap-3">
                <p><span className="text-muted-foreground">Catégories:</span> {activities.categories?.join(", ") || "—"}</p>
                <p><span className="text-muted-foreground">Intensité:</span> {activities.intensity || "—"}</p>
                <p><span className="text-muted-foreground">Intérêts:</span> {activities.interests?.join(", ") || "—"}</p>
                <p><span className="text-muted-foreground">À éviter:</span> {activities.avoidances?.join(", ") || "—"}</p>
              </div>
            ) : <p className="text-muted-foreground">—</p>}
          </section>

          {/* AI-Generated Itinerary Section */}
          <section className="border-t pt-4">
            <h4 className="font-semibold text-base mb-2">Itinéraire généré par l'IA</h4>
            {request.used_ai && request.ai_generated_itinerary ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500">
                    Généré par IA
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Provider: {request.ai_provider_used || "—"}
                  </span>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                  {parseJSONField(request.ai_generated_itinerary) ? (
                    <>
                      <div>
                        <p className="font-medium">
                          {parseJSONField(request.ai_generated_itinerary).title || "Itinéraire"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {parseJSONField(request.ai_generated_itinerary).description || "—"}
                        </p>
                      </div>

                      {parseJSONField(request.ai_generated_itinerary).days && (
                        <div>
                          <p className="text-sm font-medium mb-2">
                            Nombre de jours: {parseJSONField(request.ai_generated_itinerary).days.length}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Budget total: {parseJSONField(request.ai_generated_itinerary).totalBudget || "—"} €
                          </p>
                        </div>
                      )}

                      <details className="cursor-pointer">
                        <summary className="text-sm font-medium hover:underline">
                          Voir l'itinéraire complet (JSON)
                        </summary>
                        <pre className="mt-2 p-3 bg-background rounded text-xs overflow-x-auto">
                          {JSON.stringify(parseJSONField(request.ai_generated_itinerary), null, 2)}
                        </pre>
                      </details>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Format d'itinéraire invalide</p>
                  )}
                </div>
              </div>
            ) : request.used_ai === false ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Programme statique</Badge>
                <span className="text-sm text-muted-foreground">
                  L'itinéraire a été généré via le système de fallback
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Pas encore d'itinéraire généré pour cette demande.
              </p>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};
