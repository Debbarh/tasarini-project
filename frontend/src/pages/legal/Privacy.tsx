import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Privacy() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLanguage = i18n.language || 'fr';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary-glow/5">
      <Helmet>
        <title>{t('legal.privacy.title')} - TASARINI</title>
        <meta name="description" content={t('legal.privacy.description')} />
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
              {t('legal.privacy.title')}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {t('legal.lastUpdate')}: 12 novembre 2025 | Version 1.0
            </p>
          </CardHeader>

          <CardContent className="prose dark:prose-invert max-w-none space-y-6">
            {currentLanguage === 'fr' ? (
              <>
                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">1. Identité du responsable de traitement</h2>
                  <p>
                    Le responsable du traitement des données personnelles est :
                  </p>
                  <ul className="list-none space-y-2">
                    <li><strong>Nom</strong> : TASARINI</li>
                    <li><strong>Email</strong> : dpo@tasarini.com</li>
                    <li><strong>Adresse</strong> : [Adresse à compléter]</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">2. Données collectées</h2>
                  <h3 className="text-xl font-semibold mt-4 mb-2">2.1 Données d'inscription</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Obligatoires</strong> : Email, mot de passe, date de naissance</li>
                    <li><strong>Facultatives</strong> : Prénom, nom, photo de profil, numéro de téléphone</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">2.2 Données de navigation</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Adresse IP</li>
                    <li>Type de navigateur</li>
                    <li>Pages visitées</li>
                    <li>Durée de visite</li>
                    <li>Cookies et traceurs</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">2.3 Données d'utilisation</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Recherches effectuées</li>
                    <li>Réservations et favoris</li>
                    <li>Préférences de voyage</li>
                    <li>Interactions avec la plateforme</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">3. Finalités du traitement</h2>
                  <p>Vos données sont collectées pour les finalités suivantes :</p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">3.1 Gestion de votre compte</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Création et authentification du compte</li>
                    <li>Gestion de votre profil utilisateur</li>
                    <li>Communication relative à votre compte</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">3.2 Fourniture des services</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Traitement de vos réservations</li>
                    <li>Personnalisation des recommandations</li>
                    <li>Support client</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">3.3 Amélioration des services</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Analyse statistique de l'utilisation</li>
                    <li>Tests et développement de nouvelles fonctionnalités</li>
                    <li>Détection et prévention de la fraude</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">3.4 Marketing (avec votre consentement)</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Envoi d'offres promotionnelles</li>
                    <li>Newsletter</li>
                    <li>Enquêtes de satisfaction</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">4. Base légale du traitement</h2>
                  <p>
                    Conformément à l'article 6 du RGPD, le traitement de vos données repose sur :
                  </p>

                  <table className="w-full border-collapse border border-border mt-4">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border p-3 text-left">Finalité</th>
                        <th className="border border-border p-3 text-left">Base légale</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-border p-3">Gestion du compte</td>
                        <td className="border border-border p-3">Exécution du contrat (Art. 6.1.b)</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">Vérification de l'âge</td>
                        <td className="border border-border p-3">Obligation légale (Art. 6.1.c)</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">Marketing</td>
                        <td className="border border-border p-3">Consentement (Art. 6.1.a)</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">Amélioration des services</td>
                        <td className="border border-border p-3">Intérêt légitime (Art. 6.1.f)</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">Prévention de la fraude</td>
                        <td className="border border-border p-3">Intérêt légitime (Art. 6.1.f)</td>
                      </tr>
                    </tbody>
                  </table>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">5. Destinataires des données</h2>
                  <p>Vos données peuvent être transmises aux catégories de destinataires suivantes :</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Personnel autorisé de TASARINI</strong> : Équipes techniques, support client</li>
                    <li><strong>Partenaires touristiques</strong> : Pour le traitement de vos réservations</li>
                    <li><strong>Prestataires techniques</strong> : Hébergement (OVH, AWS), analytics, paiement</li>
                    <li><strong>Autorités légales</strong> : Sur réquisition judiciaire uniquement</li>
                  </ul>
                  <p className="mt-4">
                    Tous les prestataires sont soumis à des obligations strictes de confidentialité
                    et ne peuvent utiliser vos données que pour les finalités définies.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">6. Transferts internationaux</h2>
                  <p>
                    Vos données sont stockées dans l'Union Européenne. En cas de transfert hors UE,
                    nous nous assurons que des garanties appropriées sont en place :
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Clauses contractuelles types approuvées par la Commission européenne</li>
                    <li>Certification Privacy Shield (pour les États-Unis)</li>
                    <li>Décisions d'adéquation de la Commission européenne</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">7. Durée de conservation</h2>
                  <table className="w-full border-collapse border border-border mt-4">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border p-3 text-left">Type de données</th>
                        <th className="border border-border p-3 text-left">Durée de conservation</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-border p-3">Compte actif</td>
                        <td className="border border-border p-3">Pendant toute la durée du compte</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">Compte inactif</td>
                        <td className="border border-border p-3">2 ans après la dernière connexion</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">Données de réservation</td>
                        <td className="border border-border p-3">5 ans (obligation légale comptable)</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">Consentements</td>
                        <td className="border border-border p-3">3 ans après retrait du consentement</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">Cookies</td>
                        <td className="border border-border p-3">13 mois maximum</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="mt-4">
                    À l'expiration de ces durées, vos données sont supprimées ou anonymisées.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">8. Vos droits (Articles 15-22 RGPD)</h2>
                  <p>Conformément au RGPD, vous disposez des droits suivants :</p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">8.1 Droit d'accès (Art. 15)</h3>
                  <p>
                    Vous pouvez obtenir une copie de vos données personnelles et des informations
                    sur leur traitement.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">8.2 Droit de rectification (Art. 16)</h3>
                  <p>
                    Vous pouvez corriger ou compléter vos données inexactes ou incomplètes.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">8.3 Droit à l'effacement (Art. 17)</h3>
                  <p>
                    Vous pouvez demander la suppression de vos données dans certains cas
                    (retrait du consentement, données non nécessaires, opposition au traitement).
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">8.4 Droit à la limitation (Art. 18)</h3>
                  <p>
                    Vous pouvez demander la limitation du traitement dans certaines circonstances.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">8.5 Droit à la portabilité (Art. 20)</h3>
                  <p>
                    Vous pouvez recevoir vos données dans un format structuré et les transférer
                    à un autre responsable de traitement.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">8.6 Droit d'opposition (Art. 21)</h3>
                  <p>
                    Vous pouvez vous opposer au traitement de vos données pour des raisons tenant
                    à votre situation particulière.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">8.7 Retrait du consentement</h3>
                  <p>
                    Vous pouvez retirer votre consentement au marketing à tout moment depuis
                    les paramètres de votre compte.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">8.8 Directives post-mortem (Art. 85 Loi Informatique et Libertés)</h3>
                  <p>
                    Vous pouvez définir des directives relatives au sort de vos données après votre décès.
                  </p>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mt-4">
                    <p className="font-semibold">Comment exercer vos droits ?</p>
                    <p className="mt-2">
                      Envoyez votre demande à <strong>dpo@tasarini.com</strong> avec :
                    </p>
                    <ul className="list-disc pl-6 mt-2">
                      <li>Votre nom et prénom</li>
                      <li>Votre adresse email associée au compte</li>
                      <li>Une copie de votre pièce d'identité (si nécessaire)</li>
                      <li>La nature de votre demande</li>
                    </ul>
                    <p className="mt-2">
                      Nous répondrons dans un délai d'<strong>un mois</strong> maximum.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">9. Sécurité des données</h2>
                  <p>
                    Nous mettons en œuvre des mesures techniques et organisationnelles appropriées
                    pour garantir la sécurité de vos données (Art. 32 RGPD) :
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Chiffrement</strong> : SSL/TLS pour les communications, hashage des mots de passe</li>
                    <li><strong>Contrôle d'accès</strong> : Authentification forte, gestion des permissions</li>
                    <li><strong>Sauvegardes</strong> : Backups réguliers et sécurisés</li>
                    <li><strong>Surveillance</strong> : Détection des intrusions et incidents</li>
                    <li><strong>Sensibilisation</strong> : Formation du personnel aux bonnes pratiques</li>
                  </ul>
                  <p className="mt-4">
                    En cas de violation de données susceptible d'engendrer un risque pour vos droits,
                    nous vous en informerons conformément à la réglementation (Art. 33-34 RGPD).
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">10. Cookies et traceurs</h2>
                  <h3 className="text-xl font-semibold mt-4 mb-2">10.1 Types de cookies utilisés</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Cookies essentiels</strong> : Nécessaires au fonctionnement (session, authentification)</li>
                    <li><strong>Cookies de préférence</strong> : Mémorisent vos choix (langue, devise)</li>
                    <li><strong>Cookies analytiques</strong> : Mesurent l'audience et l'utilisation</li>
                    <li><strong>Cookies marketing</strong> : Personnalisent les publicités (avec consentement)</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">10.2 Gestion des cookies</h3>
                  <p>
                    Vous pouvez gérer vos préférences de cookies à tout moment via :
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Le bandeau de consentement lors de votre première visite</li>
                    <li>Les paramètres de votre navigateur</li>
                    <li>Les paramètres de votre compte TASARINI</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">11. Mineurs</h2>
                  <p>
                    Conformément à l'article 8 du RGPD, notre service est accessible aux personnes
                    de 13 ans et plus. Si vous avez moins de 16 ans, l'accord de vos parents ou
                    tuteurs légaux peut être requis selon votre pays de résidence.
                  </p>
                  <p>
                    Si nous découvrons qu'un enfant de moins de 13 ans a fourni des données personnelles,
                    nous supprimerons immédiatement ces informations.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">12. Modifications de la politique</h2>
                  <p>
                    Nous nous réservons le droit de modifier cette Politique de Confidentialité
                    pour refléter les évolutions légales ou de nos pratiques.
                  </p>
                  <p>
                    En cas de modification substantielle, vous serez informé par email ou notification
                    dans l'application au moins 30 jours avant l'entrée en vigueur.
                  </p>
                  <p>
                    La version en vigueur est toujours accessible sur notre site avec mention
                    du numéro de version et de la date de dernière mise à jour.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">13. Contact et réclamation</h2>
                  <h3 className="text-xl font-semibold mt-4 mb-2">13.1 Délégué à la Protection des Données (DPO)</h3>
                  <ul className="list-none space-y-2">
                    <li><strong>Email</strong> : dpo@tasarini.com</li>
                    <li><strong>Courrier</strong> : TASARINI - DPO, [Adresse à compléter]</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">13.2 Autorité de contrôle</h3>
                  <p>
                    Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire
                    une réclamation auprès de la CNIL :
                  </p>
                  <ul className="list-none space-y-2">
                    <li><strong>Commission Nationale de l'Informatique et des Libertés (CNIL)</strong></li>
                    <li>3 Place de Fontenoy, TSA 80715, 75334 PARIS CEDEX 07</li>
                    <li>Téléphone : 01 53 73 22 22</li>
                    <li>Site web : <a href="https://www.cnil.fr" className="text-primary underline">www.cnil.fr</a></li>
                  </ul>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">1. Data Controller Identity</h2>
                  <p>
                    The data controller is:
                  </p>
                  <ul className="list-none space-y-2">
                    <li><strong>Name</strong>: TASARINI</li>
                    <li><strong>Email</strong>: dpo@tasarini.com</li>
                    <li><strong>Address</strong>: [Address to be completed]</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">2. Data Collected</h2>
                  <h3 className="text-xl font-semibold mt-4 mb-2">2.1 Registration Data</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Required</strong>: Email, password, date of birth</li>
                    <li><strong>Optional</strong>: First name, last name, profile picture, phone number</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">2.2 Navigation Data</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>IP address</li>
                    <li>Browser type</li>
                    <li>Pages visited</li>
                    <li>Visit duration</li>
                    <li>Cookies and trackers</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">2.3 Usage Data</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Searches performed</li>
                    <li>Bookings and favorites</li>
                    <li>Travel preferences</li>
                    <li>Platform interactions</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">3. Processing Purposes</h2>
                  <p>Your data is collected for the following purposes:</p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">3.1 Account Management</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Account creation and authentication</li>
                    <li>User profile management</li>
                    <li>Account-related communication</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">3.2 Service Provision</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Processing your bookings</li>
                    <li>Personalizing recommendations</li>
                    <li>Customer support</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">3.3 Service Improvement</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Statistical analysis of usage</li>
                    <li>Testing and development of new features</li>
                    <li>Fraud detection and prevention</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">3.4 Marketing (with your consent)</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Sending promotional offers</li>
                    <li>Newsletter</li>
                    <li>Satisfaction surveys</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">4. Legal Basis for Processing</h2>
                  <p>
                    In accordance with Article 6 of the GDPR, the processing of your data is based on:
                  </p>

                  <table className="w-full border-collapse border border-border mt-4">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border p-3 text-left">Purpose</th>
                        <th className="border border-border p-3 text-left">Legal Basis</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-border p-3">Account management</td>
                        <td className="border border-border p-3">Contract performance (Art. 6.1.b)</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">Age verification</td>
                        <td className="border border-border p-3">Legal obligation (Art. 6.1.c)</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">Marketing</td>
                        <td className="border border-border p-3">Consent (Art. 6.1.a)</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">Service improvement</td>
                        <td className="border border-border p-3">Legitimate interest (Art. 6.1.f)</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">Fraud prevention</td>
                        <td className="border border-border p-3">Legitimate interest (Art. 6.1.f)</td>
                      </tr>
                    </tbody>
                  </table>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Recipients</h2>
                  <p>Your data may be transmitted to the following categories of recipients:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Authorized TASARINI staff</strong>: Technical teams, customer support</li>
                    <li><strong>Tourism partners</strong>: For processing your bookings</li>
                    <li><strong>Technical service providers</strong>: Hosting (OVH, AWS), analytics, payment</li>
                    <li><strong>Legal authorities</strong>: Upon legal request only</li>
                  </ul>
                  <p className="mt-4">
                    All service providers are subject to strict confidentiality obligations
                    and may only use your data for defined purposes.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">6. International Transfers</h2>
                  <p>
                    Your data is stored in the European Union. In case of transfer outside the EU,
                    we ensure that appropriate safeguards are in place:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Standard contractual clauses approved by the European Commission</li>
                    <li>Privacy Shield certification (for the United States)</li>
                    <li>European Commission adequacy decisions</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">7. Retention Period</h2>
                  <table className="w-full border-collapse border border-border mt-4">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border p-3 text-left">Data Type</th>
                        <th className="border border-border p-3 text-left">Retention Period</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-border p-3">Active account</td>
                        <td className="border border-border p-3">For the entire duration of the account</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">Inactive account</td>
                        <td className="border border-border p-3">2 years after last login</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">Booking data</td>
                        <td className="border border-border p-3">5 years (legal accounting obligation)</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">Consents</td>
                        <td className="border border-border p-3">3 years after consent withdrawal</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">Cookies</td>
                        <td className="border border-border p-3">13 months maximum</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="mt-4">
                    After these periods expire, your data is deleted or anonymized.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">8. Your Rights (Articles 15-22 GDPR)</h2>
                  <p>In accordance with GDPR, you have the following rights:</p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">8.1 Right of Access (Art. 15)</h3>
                  <p>
                    You can obtain a copy of your personal data and information about its processing.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">8.2 Right to Rectification (Art. 16)</h3>
                  <p>
                    You can correct or complete inaccurate or incomplete data.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">8.3 Right to Erasure (Art. 17)</h3>
                  <p>
                    You can request deletion of your data in certain cases
                    (consent withdrawal, unnecessary data, objection to processing).
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">8.4 Right to Restriction (Art. 18)</h3>
                  <p>
                    You can request restriction of processing in certain circumstances.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">8.5 Right to Portability (Art. 20)</h3>
                  <p>
                    You can receive your data in a structured format and transfer it
                    to another data controller.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">8.6 Right to Object (Art. 21)</h3>
                  <p>
                    You can object to the processing of your data for reasons relating
                    to your particular situation.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">8.7 Consent Withdrawal</h3>
                  <p>
                    You can withdraw your marketing consent at any time from
                    your account settings.
                  </p>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mt-4">
                    <p className="font-semibold">How to exercise your rights?</p>
                    <p className="mt-2">
                      Send your request to <strong>dpo@tasarini.com</strong> with:
                    </p>
                    <ul className="list-disc pl-6 mt-2">
                      <li>Your first and last name</li>
                      <li>Your email address associated with the account</li>
                      <li>A copy of your ID (if necessary)</li>
                      <li>The nature of your request</li>
                    </ul>
                    <p className="mt-2">
                      We will respond within a maximum of <strong>one month</strong>.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">9. Data Security</h2>
                  <p>
                    We implement appropriate technical and organizational measures
                    to ensure the security of your data (Art. 32 GDPR):
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Encryption</strong>: SSL/TLS for communications, password hashing</li>
                    <li><strong>Access control</strong>: Strong authentication, permission management</li>
                    <li><strong>Backups</strong>: Regular and secure backups</li>
                    <li><strong>Monitoring</strong>: Intrusion and incident detection</li>
                    <li><strong>Awareness</strong>: Staff training on best practices</li>
                  </ul>
                  <p className="mt-4">
                    In case of a data breach likely to pose a risk to your rights,
                    we will inform you in accordance with regulations (Art. 33-34 GDPR).
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">10. Cookies and Trackers</h2>
                  <h3 className="text-xl font-semibold mt-4 mb-2">10.1 Types of Cookies Used</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Essential cookies</strong>: Necessary for operation (session, authentication)</li>
                    <li><strong>Preference cookies</strong>: Remember your choices (language, currency)</li>
                    <li><strong>Analytics cookies</strong>: Measure audience and usage</li>
                    <li><strong>Marketing cookies</strong>: Personalize ads (with consent)</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">10.2 Cookie Management</h3>
                  <p>
                    You can manage your cookie preferences at any time via:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>The consent banner during your first visit</li>
                    <li>Your browser settings</li>
                    <li>Your TASARINI account settings</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">11. Minors</h2>
                  <p>
                    In accordance with Article 8 of GDPR, our service is accessible to people
                    aged 13 and over. If you are under 16, the consent of your parents or
                    legal guardians may be required depending on your country of residence.
                  </p>
                  <p>
                    If we discover that a child under 13 has provided personal data,
                    we will immediately delete this information.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">12. Policy Changes</h2>
                  <p>
                    We reserve the right to modify this Privacy Policy
                    to reflect legal developments or changes in our practices.
                  </p>
                  <p>
                    In case of substantial changes, you will be informed by email or notification
                    in the application at least 30 days before taking effect.
                  </p>
                  <p>
                    The current version is always accessible on our site with mention
                    of the version number and date of last update.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mt-8 mb-4">13. Contact and Complaint</h2>
                  <h3 className="text-xl font-semibold mt-4 mb-2">13.1 Data Protection Officer (DPO)</h3>
                  <ul className="list-none space-y-2">
                    <li><strong>Email</strong>: dpo@tasarini.com</li>
                    <li><strong>Mail</strong>: TASARINI - DPO, [Address to be completed]</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">13.2 Supervisory Authority</h3>
                  <p>
                    If you believe your rights are not being respected, you can lodge
                    a complaint with CNIL:
                  </p>
                  <ul className="list-none space-y-2">
                    <li><strong>Commission Nationale de l'Informatique et des Libertés (CNIL)</strong></li>
                    <li>3 Place de Fontenoy, TSA 80715, 75334 PARIS CEDEX 07</li>
                    <li>Phone: 01 53 73 22 22</li>
                    <li>Website: <a href="https://www.cnil.fr" className="text-primary underline">www.cnil.fr</a></li>
                  </ul>
                </section>
              </>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>{t('legal.privacy.footer')}</p>
        </div>
      </div>
    </div>
  );
}
