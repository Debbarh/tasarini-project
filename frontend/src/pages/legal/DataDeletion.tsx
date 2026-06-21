import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CONTACT_EMAIL = "privacy@tasarini.com";

export default function DataDeletion() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary-glow/5">
      <Helmet>
        <title>{t('legal.dataDeletion.title', 'Suppression des données')} - TASARINI</title>
        <meta name="description" content={t('legal.dataDeletion.description', 'Comment demander la suppression de vos données personnelles sur Tasarini.')} />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back', 'Retour')}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold flex items-center gap-3">
              <Trash2 className="h-7 w-7 text-primary" />
              {t('legal.dataDeletion.title', 'Suppression des données')}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {t('legal.lastUpdate', 'Dernière mise à jour')}: 21 juin 2026 | Version 1.0
            </p>
          </CardHeader>

          <CardContent className="prose dark:prose-invert max-w-none space-y-6">
            <p>
              {t('legal.dataDeletion.intro',
                'Conformément au RGPD et aux règles des fournisseurs de connexion (dont Facebook), vous pouvez à tout moment demander la suppression des données personnelles associées à votre compte Tasarini, y compris si vous vous êtes inscrit·e via Facebook ou Google.')}
            </p>

            <h2 className="text-xl font-semibold">
              {t('legal.dataDeletion.option1Title', '1. Supprimer votre compte depuis l’application')}
            </h2>
            <p>
              {t('legal.dataDeletion.option1Body',
                'Connectez-vous à votre compte, ouvrez les paramètres de votre profil, puis choisissez « Supprimer mon compte ». La suppression est définitive et entraîne l’effacement de vos données personnelles.')}
            </p>

            <h2 className="text-xl font-semibold">
              {t('legal.dataDeletion.option2Title', '2. Demander la suppression par e-mail')}
            </h2>
            <p>
              {t('legal.dataDeletion.option2Body',
                'Si vous ne pouvez pas accéder à votre compte, envoyez une demande depuis l’adresse e-mail liée à votre compte à l’adresse ci-dessous, avec pour objet « Suppression de mes données ». Nous traitons les demandes sous 30 jours.')}
            </p>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <a href={`mailto:${CONTACT_EMAIL}?subject=Suppression%20de%20mes%20données`} className="text-primary underline">
                {CONTACT_EMAIL}
              </a>
            </p>

            <h2 className="text-xl font-semibold">
              {t('legal.dataDeletion.scopeTitle', 'Données supprimées')}
            </h2>
            <p>
              {t('legal.dataDeletion.scopeBody',
                'La suppression couvre : votre profil (nom, e-mail, identifiants de connexion sociale), vos itinéraires et favoris, vos avis et contributions, ainsi que les données de connexion associées. Certaines données peuvent être conservées de façon anonymisée ou pour une durée légale (par ex. obligations comptables/fiscales) lorsque la loi l’exige.')}
            </p>

            <h2 className="text-xl font-semibold">
              {t('legal.dataDeletion.facebookTitle', 'Connexion via Facebook')}
            </h2>
            <p>
              {t('legal.dataDeletion.facebookBody',
                'Si vous vous êtes connecté·e avec Facebook, vous pouvez aussi retirer l’accès de l’application depuis Facebook : Paramètres et confidentialité → Paramètres → Applications et sites web → Tasarini → Supprimer. Cela révoque l’accès ; pour effacer les données déjà enregistrées chez nous, utilisez l’une des deux méthodes ci-dessus.')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
