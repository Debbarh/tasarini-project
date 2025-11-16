import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface OverviewTabProps {
  upcomingBookings: number;
}

export const OverviewTab = ({ upcomingBookings }: OverviewTabProps) => {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Revenus estimés</CardTitle>
          <CardDescription>Période glissante de 30 jours</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">—</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Connectez vos réservations pour afficher des projections.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Occupation moyenne</CardTitle>
          <CardDescription>Toutes chambres confondues</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">—</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Ajoutez vos réservations pour suivre votre taux d'occupation.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Prochains séjours</CardTitle>
          <CardDescription>Arrivées dans les 14 prochains jours</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{upcomingBookings}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Anticipez les arrivées et ajustez vos tarifs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewTab;
