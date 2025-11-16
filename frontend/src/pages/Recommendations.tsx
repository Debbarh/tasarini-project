import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const Recommendations = () => {
  return (
    <main className="container mx-auto px-4 py-8 animate-fade-in">
      <Helmet>
        <title>Recommendations | Voyage AI</title>
        <meta name="description" content="Recevez des recommandations intelligentes basées sur vos préférences et inspirations." />
        <link rel="canonical" href="/recommend" />
      </Helmet>

      <h1 className="mb-6 text-3xl font-semibold">Recommendations</h1>
      <p className="mb-8 max-w-2xl text-muted-foreground">Un moteur affine des programmes et activités à partir de vos choix de planification et de vos inspirations.</p>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Programme suggéré</CardTitle>
            <CardDescription>Un mix équilibré sur 3 jours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="list-disc pl-5">
              <li>Jour 1: balade guidée et spots panoramiques</li>
              <li>Jour 2: gastronomie locale et musée incontournable</li>
              <li>Jour 3: temps libre, plage ou parc naturel</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activités recommandées</CardTitle>
            <CardDescription>Basées sur vos centres d'intérêt</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="list-disc pl-5">
              <li>Cours de cuisine locale (petit groupe)</li>
              <li>Randonnée douce au lever du soleil</li>
              <li>Quartier d'artisans et cafés indépendants</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Recommendations;
