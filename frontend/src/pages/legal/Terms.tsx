import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Terms() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLanguage = i18n.language || 'fr';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary-glow/5">
      <Helmet>
        <title>{t('legal.terms.title')} - TASARINI</title>
        <meta name="description" content={t('legal.terms.description')} />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">
              {t('legal.terms.title')}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {t('legal.lastUpdate')}: 12 novembre 2025
            </p>
          </CardHeader>

          <CardContent className="prose dark:prose-invert max-w-none space-y-6">
            {currentLanguage === 'fr' ? (
              <>
                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">1. Objet et champ d'application</h2>
                  <p>
                    Les présentes Conditions Générales d'Utilisation (ci-après "CGU") régissent l'utilisation
                    de la plateforme TASARINI (ci-après "la Plateforme"), accessible à l'adresse{" "}
                    <a href="https://tasarini.com" className="text-primary">tasarini.com</a>.
                  </p>
                  <p>
                    En accédant et en utilisant la Plateforme, vous acceptez sans réserve les présentes CGU.
                    Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser la Plateforme.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">2. Définitions</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Utilisateur</strong> : Toute personne accédant à la Plateforme</li>
                    <li><strong>Partenaire</strong> : Professionnel du tourisme proposant des services</li>
                    <li><strong>Services</strong> : Ensemble des fonctionnalités proposées par TASARINI</li>
                    <li><strong>Contenu</strong> : Informations, textes, images, vidéos publiés sur la Plateforme</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">3. Inscription et compte utilisateur</h2>
                  <h3 className="text-xl font-semibold mt-4 mb-2">3.1 Création de compte</h3>
                  <p>
                    L'utilisation de certains services nécessite la création d'un compte. Vous devez :
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Avoir au moins 13 ans (conformément au RGPD)</li>
                    <li>Fournir des informations exactes et à jour</li>
                    <li>Maintenir la confidentialité de vos identifiants</li>
                    <li>Accepter notre Politique de Confidentialité</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">3.2 Responsabilité du compte</h3>
                  <p>
                    Vous êtes responsable de toutes les activités effectuées depuis votre compte.
                    En cas d'utilisation non autorisée, vous devez nous en informer immédiatement.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">4. Services proposés</h2>
                  <p>
                    TASARINI propose une plateforme de découverte et de réservation de destinations touristiques :
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Recherche et consultation de points d'intérêt</li>
                    <li>Réservation de services touristiques</li>
                    <li>Gestion de profil et préférences</li>
                    <li>Système de recommandations personnalisées</li>
                  </ul>
                  <p className="mt-4">
                    Nous nous réservons le droit de modifier, suspendre ou interrompre tout ou partie
                    des Services à tout moment, sans préavis.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">5. Utilisation de la Plateforme</h2>
                  <h3 className="text-xl font-semibold mt-4 mb-2">5.1 Utilisation autorisée</h3>
                  <p>Vous vous engagez à utiliser la Plateforme conformément aux lois en vigueur et aux présentes CGU.</p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">5.2 Utilisations interdites</h3>
                  <p>Il est strictement interdit de :</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Utiliser la Plateforme à des fins illégales ou frauduleuses</li>
                    <li>Porter atteinte aux droits de propriété intellectuelle</li>
                    <li>Diffuser des contenus illicites, diffamatoires ou offensants</li>
                    <li>Tenter d'accéder de manière non autorisée aux systèmes</li>
                    <li>Utiliser des robots, scripts ou outils automatisés</li>
                    <li>Collecter des données personnelles d'autres utilisateurs</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">6. Propriété intellectuelle</h2>
                  <p>
                    Tous les éléments de la Plateforme (textes, images, logos, bases de données, logiciels)
                    sont protégés par le droit de la propriété intellectuelle.
                  </p>
                  <p>
                    Toute reproduction, représentation, modification ou exploitation non autorisée
                    constitue une contrefaçon sanctionnée par le Code de la propriété intellectuelle.
                  </p>
                  <p>
                    Les marques, logos et signes distinctifs sont la propriété exclusive de TASARINI
                    ou de ses partenaires.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">7. Responsabilités</h2>
                  <h3 className="text-xl font-semibold mt-4 mb-2">7.1 Responsabilité de TASARINI</h3>
                  <p>
                    TASARINI s'efforce d'assurer la disponibilité et la fiabilité de la Plateforme,
                    mais ne peut garantir un accès ininterrompu. Nous ne sommes pas responsables :
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Des interruptions techniques ou de maintenance</li>
                    <li>Des contenus publiés par les utilisateurs ou partenaires</li>
                    <li>Des dommages indirects résultant de l'utilisation</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">7.2 Responsabilité de l'Utilisateur</h3>
                  <p>
                    Vous êtes seul responsable de l'utilisation que vous faites de la Plateforme
                    et des contenus que vous publiez.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">8. Protection des données personnelles</h2>
                  <p>
                    Le traitement de vos données personnelles est régi par notre{" "}
                    <a href="/legal/privacy" className="text-primary underline">
                      Politique de Confidentialité
                    </a>
                    , conforme au Règlement Général sur la Protection des Données (RGPD).
                  </p>
                  <p>
                    Vous disposez d'un droit d'accès, de rectification, d'effacement et d'opposition
                    sur vos données personnelles.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">9. Résiliation</h2>
                  <h3 className="text-xl font-semibold mt-4 mb-2">9.1 Par l'Utilisateur</h3>
                  <p>
                    Vous pouvez fermer votre compte à tout moment depuis les paramètres de votre profil.
                    La suppression de votre compte entraîne la suppression de vos données personnelles
                    conformément à notre politique de conservation.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">9.2 Par TASARINI</h3>
                  <p>
                    Nous nous réservons le droit de suspendre ou supprimer votre compte en cas de :
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Violation des présentes CGU</li>
                    <li>Utilisation frauduleuse ou abusive</li>
                    <li>Inactivité prolongée (plus de 2 ans)</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">10. Modifications des CGU</h2>
                  <p>
                    TASARINI se réserve le droit de modifier les présentes CGU à tout moment.
                    Les modifications prennent effet dès leur publication sur la Plateforme.
                  </p>
                  <p>
                    En cas de modification substantielle, vous serez informé par email ou notification.
                    La poursuite de l'utilisation après modification vaut acceptation des nouvelles CGU.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">11. Droit applicable et juridiction</h2>
                  <p>
                    Les présentes CGU sont régies par le droit français.
                  </p>
                  <p>
                    En cas de litige, les parties s'efforceront de trouver une solution amiable.
                    À défaut, les tribunaux français seront seuls compétents.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">12. Contact</h2>
                  <p>
                    Pour toute question concernant ces CGU, vous pouvez nous contacter :
                  </p>
                  <ul className="list-none space-y-2">
                    <li><strong>Email</strong> : legal@tasarini.com</li>
                    <li><strong>Adresse</strong> : TASARINI, [Adresse à compléter]</li>
                  </ul>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">1. Purpose and Scope</h2>
                  <p>
                    These Terms of Service (hereinafter "Terms") govern the use of the TASARINI platform
                    (hereinafter "the Platform"), accessible at{" "}
                    <a href="https://tasarini.com" className="text-primary">tasarini.com</a>.
                  </p>
                  <p>
                    By accessing and using the Platform, you accept these Terms without reservation.
                    If you do not accept these terms, please do not use the Platform.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">2. Definitions</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>User</strong>: Any person accessing the Platform</li>
                    <li><strong>Partner</strong>: Tourism professional offering services</li>
                    <li><strong>Services</strong>: All features offered by TASARINI</li>
                    <li><strong>Content</strong>: Information, texts, images, videos published on the Platform</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">3. Registration and User Account</h2>
                  <h3 className="text-xl font-semibold mt-4 mb-2">3.1 Account Creation</h3>
                  <p>
                    Using certain services requires creating an account. You must:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Be at least 13 years old (in accordance with GDPR)</li>
                    <li>Provide accurate and up-to-date information</li>
                    <li>Maintain the confidentiality of your credentials</li>
                    <li>Accept our Privacy Policy</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">3.2 Account Responsibility</h3>
                  <p>
                    You are responsible for all activities performed from your account.
                    In case of unauthorized use, you must inform us immediately.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">4. Services Offered</h2>
                  <p>
                    TASARINI offers a platform for discovering and booking tourist destinations:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Search and view points of interest</li>
                    <li>Booking tourist services</li>
                    <li>Profile and preferences management</li>
                    <li>Personalized recommendation system</li>
                  </ul>
                  <p className="mt-4">
                    We reserve the right to modify, suspend or discontinue all or part of the Services
                    at any time, without notice.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">5. Use of the Platform</h2>
                  <h3 className="text-xl font-semibold mt-4 mb-2">5.1 Authorized Use</h3>
                  <p>You agree to use the Platform in accordance with applicable laws and these Terms.</p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">5.2 Prohibited Uses</h3>
                  <p>It is strictly forbidden to:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Use the Platform for illegal or fraudulent purposes</li>
                    <li>Infringe intellectual property rights</li>
                    <li>Distribute illegal, defamatory or offensive content</li>
                    <li>Attempt unauthorized access to systems</li>
                    <li>Use robots, scripts or automated tools</li>
                    <li>Collect personal data from other users</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">6. Intellectual Property</h2>
                  <p>
                    All elements of the Platform (texts, images, logos, databases, software)
                    are protected by intellectual property law.
                  </p>
                  <p>
                    Any unauthorized reproduction, representation, modification or exploitation
                    constitutes infringement sanctioned by intellectual property law.
                  </p>
                  <p>
                    Trademarks, logos and distinctive signs are the exclusive property of TASARINI
                    or its partners.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">7. Responsibilities</h2>
                  <h3 className="text-xl font-semibold mt-4 mb-2">7.1 TASARINI's Responsibility</h3>
                  <p>
                    TASARINI strives to ensure the availability and reliability of the Platform,
                    but cannot guarantee uninterrupted access. We are not responsible for:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Technical interruptions or maintenance</li>
                    <li>Content published by users or partners</li>
                    <li>Indirect damages resulting from use</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">7.2 User's Responsibility</h3>
                  <p>
                    You are solely responsible for your use of the Platform and the content you publish.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">8. Personal Data Protection</h2>
                  <p>
                    The processing of your personal data is governed by our{" "}
                    <a href="/legal/privacy" className="text-primary underline">
                      Privacy Policy
                    </a>
                    , in compliance with the General Data Protection Regulation (GDPR).
                  </p>
                  <p>
                    You have the right to access, rectify, delete and object to your personal data.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">9. Termination</h2>
                  <h3 className="text-xl font-semibold mt-4 mb-2">9.1 By the User</h3>
                  <p>
                    You can close your account at any time from your profile settings.
                    Deleting your account results in the deletion of your personal data
                    in accordance with our retention policy.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">9.2 By TASARINI</h3>
                  <p>
                    We reserve the right to suspend or delete your account in case of:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Violation of these Terms</li>
                    <li>Fraudulent or abusive use</li>
                    <li>Prolonged inactivity (more than 2 years)</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">10. Changes to Terms</h2>
                  <p>
                    TASARINI reserves the right to modify these Terms at any time.
                    Changes take effect upon publication on the Platform.
                  </p>
                  <p>
                    In case of substantial changes, you will be informed by email or notification.
                    Continued use after changes constitutes acceptance of the new Terms.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">11. Applicable Law and Jurisdiction</h2>
                  <p>
                    These Terms are governed by French law.
                  </p>
                  <p>
                    In case of dispute, the parties will endeavor to find an amicable solution.
                    Failing that, French courts will have sole jurisdiction.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">12. Contact</h2>
                  <p>
                    For any questions regarding these Terms, you can contact us:
                  </p>
                  <ul className="list-none space-y-2">
                    <li><strong>Email</strong>: legal@tasarini.com</li>
                    <li><strong>Address</strong>: TASARINI, [Address to be completed]</li>
                  </ul>
                </section>
              </>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>{t('legal.terms.footer')}</p>
        </div>
      </div>
    </div>
  );
}
