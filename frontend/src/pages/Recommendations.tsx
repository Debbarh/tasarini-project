import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const Recommendations = () => {
  const { t } = useTranslation();
  
  return (
    <main className="container mx-auto px-4 py-8 animate-fade-in">
      <Helmet>
        <title>{t('recommendations.pageTitle')} | Voyage AI</title>
        <meta name="description" content={t('recommendations.pageDescription')} />
        <link rel="canonical" href="/recommend" />
      </Helmet>

      <h1 className="mb-6 text-3xl font-semibold">{t('recommendations.pageTitle')}</h1>
      <p className="mb-8 max-w-2xl text-muted-foreground">{t('recommendations.subtitle')}</p>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('recommendations.suggestedProgram.title')}</CardTitle>
            <CardDescription>{t('recommendations.suggestedProgram.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="list-disc pl-5">
              <li>{t('recommendations.suggestedProgram.day1')}</li>
              <li>{t('recommendations.suggestedProgram.day2')}</li>
              <li>{t('recommendations.suggestedProgram.day3')}</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('recommendations.recommendedActivities.title')}</CardTitle>
            <CardDescription>{t('recommendations.recommendedActivities.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="list-disc pl-5">
              <li>{t('recommendations.recommendedActivities.activity1')}</li>
              <li>{t('recommendations.recommendedActivities.activity2')}</li>
              <li>{t('recommendations.recommendedActivities.activity3')}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Recommendations;
