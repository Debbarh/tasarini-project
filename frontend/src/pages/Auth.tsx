import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { ForgotPasswordDialog } from "@/components/auth/ForgotPasswordDialog";
import { Loader2, Mail, Lock, User, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Auth = () => {
  const { t } = useTranslation();
  const { user, userRoles, signIn, signUp, signInWithGoogle, signInWithFacebook, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [showPartnerMessage, setShowPartnerMessage] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  // Form states
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpPasswordConfirm, setSignUpPasswordConfirm] = useState("");
  const [signUpFirstName, setSignUpFirstName] = useState("");
  const [signUpLastName, setSignUpLastName] = useState("");

  // RGPD fields
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  useEffect(() => {
    // Check for partner-specific messages
    const message = searchParams.get('message');
    const isPartner = searchParams.get('partner');
    const poiPending = searchParams.get('poi');
    
    if (message === 'confirm-email' && isPartner === 'true') {
      setShowPartnerMessage(true);
    }
  }, [searchParams]);

  const redirectToParam = searchParams.get('redirectTo');
  const safeRedirect = redirectToParam && redirectToParam.startsWith('/') ? redirectToParam : null;

  // Redirect if already authenticated
  if (user && !loading) {
    let destination = safeRedirect || '/profile';

    if (userRoles.includes('admin')) {
      destination = '/admin';
    } else if (userRoles.includes('partner')) {
      destination = '/partner-center';
    }

    return <Navigate to={destination} replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await signIn(signInEmail, signInPassword);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation frontend
    if (signUpPassword !== signUpPasswordConfirm) {
      toast.error(t('auth.gdpr.passwordsDontMatch'));
      return;
    }

    if (!termsAccepted || !privacyAccepted) {
      toast.error(t('auth.gdpr.mustAcceptTerms'));
      return;
    }

    setIsLoading(true);

    try {
      await signUp(
        signUpEmail,
        signUpPassword,
        signUpFirstName,
        signUpLastName,
        'user',
        dateOfBirth,
        termsAccepted,
        privacyAccepted,
        '1.0',
        marketingConsent
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithFacebook();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary-glow/5 p-4">
      <Helmet>
        <title>{t('auth.title')} - TASARINI</title>
        <meta name="description" content={t('auth.subtitle')} />
      </Helmet>
      
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {t('auth.welcome')}
            <span className="block bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              TASARINI
            </span>
          </h1>
          <p className="text-muted-foreground">
            {t('auth.subtitle')}
          </p>
        </div>

        <Card className="shadow-elegant border-primary/10">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t('auth.title')}</CardTitle>
            <CardDescription>
              {showPartnerMessage ? (
                <div className="space-y-2">
                  <p className="text-green-600 dark:text-green-400 font-medium">
                    🎉 Inscription partenaire réussie !
                  </p>
                  <p className="text-sm">
                    Veuillez vérifier votre email et cliquer sur le lien de confirmation. 
                    Votre point d'intérêt sera automatiquement créé après confirmation.
                  </p>
                </div>
              ) : (
                t('auth.description')
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Social Sign In Buttons */}
            <div className="space-y-3 mb-6">
              <Button 
                onClick={handleGoogleSignIn}
                variant="outline" 
                className="w-full"
                disabled={isLoading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {t('auth.signInWithGoogle')}
              </Button>

              <Button 
                onClick={handleFacebookSignIn}
                variant="outline" 
                className="w-full"
                disabled={isLoading}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                {t('auth.signInWithFacebook')}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t('auth.or')}
                </span>
              </div>
            </div>

            <Tabs defaultValue="signin" className="w-full mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
                <TabsTrigger value="signup">{t('auth.signUp')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4 mt-6">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t('auth.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder={t('auth.emailPlaceholder')}
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">{t('auth.password')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type="password"
                        placeholder={t('auth.passwordPlaceholder')}
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                     </div>
                   </div>

                   <div className="flex justify-end">
                     <Button
                       type="button"
                       variant="link"
                       className="text-sm px-0 h-auto"
                       onClick={() => setShowForgotPassword(true)}
                     >
                       {t('auth.forgotPassword.link')}
                     </Button>
                   </div>
                   
                   <Button 
                     type="submit" 
                     className="w-full" 
                     disabled={isLoading}
                   >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('auth.signingIn')}
                      </>
                    ) : (
                      t('auth.signInButton')
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4 mt-6">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstname">{t('auth.firstName')}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-firstname"
                          type="text"
                          placeholder={t('auth.firstNamePlaceholder')}
                          value={signUpFirstName}
                          onChange={(e) => setSignUpFirstName(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-lastname">{t('auth.lastName')}</Label>
                      <Input
                        id="signup-lastname"
                        type="text"
                        placeholder={t('auth.lastNamePlaceholder')}
                        value={signUpLastName}
                        onChange={(e) => setSignUpLastName(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t('auth.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder={t('auth.emailPlaceholder')}
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">
                      {t('auth.password')} <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder={t('auth.passwordPlaceholder')}
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={8}
                      />
                    </div>
                  </div>

                  {/* Confirmation mot de passe */}
                  <div className="space-y-2">
                    <Label htmlFor="signup-password-confirm">
                      {t('auth.gdpr.confirmPassword')} <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password-confirm"
                        type="password"
                        placeholder={t('auth.gdpr.confirmPasswordPlaceholder')}
                        value={signUpPasswordConfirm}
                        onChange={(e) => setSignUpPasswordConfirm(e.target.value)}
                        className={`pl-10 ${
                          signUpPassword && signUpPasswordConfirm &&
                          signUpPassword !== signUpPasswordConfirm
                            ? 'border-red-500'
                            : ''
                        }`}
                        required
                      />
                    </div>
                    {signUpPassword && signUpPasswordConfirm &&
                     signUpPassword !== signUpPasswordConfirm && (
                      <p className="text-xs text-red-500">
                        {t('auth.gdpr.passwordsDontMatch')}
                      </p>
                    )}
                  </div>

                  {/* Date de naissance */}
                  <div className="space-y-2">
                    <Label htmlFor="signup-dob">
                      {t('auth.gdpr.dateOfBirth')} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="signup-dob"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 13))
                        .toISOString().split('T')[0]}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('auth.gdpr.dateOfBirthHelp')}
                    </p>
                  </div>

                  {/* Consentements RGPD */}
                  <div className="space-y-3 border-t pt-4 mt-4">
                    <p className="text-sm font-medium">{t('auth.gdpr.consents')}</p>

                    {/* CGU */}
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="terms"
                        checked={termsAccepted}
                        onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                        required
                      />
                      <label htmlFor="terms" className="text-sm leading-tight cursor-pointer flex-1">
                        {t('auth.gdpr.termsAccepted')}{' '}
                        <a
                          href="/legal/terms"
                          target="_blank"
                          className="text-primary underline hover:text-primary/80"
                        >
                          {t('auth.gdpr.termsLink')}
                        </a>{' '}
                        <span className="text-red-500">*</span>
                      </label>
                    </div>

                    {/* Politique de confidentialité */}
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="privacy"
                        checked={privacyAccepted}
                        onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
                        required
                      />
                      <label htmlFor="privacy" className="text-sm leading-tight cursor-pointer flex-1">
                        {t('auth.gdpr.privacyAccepted')}{' '}
                        <a
                          href="/legal/privacy"
                          target="_blank"
                          className="text-primary underline hover:text-primary/80"
                        >
                          {t('auth.gdpr.privacyLink')}
                        </a>{' '}
                        <span className="text-red-500">*</span>
                      </label>
                    </div>

                    {/* Marketing (opt-in) */}
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="marketing"
                        checked={marketingConsent}
                        onCheckedChange={(checked) => setMarketingConsent(checked === true)}
                      />
                      <label htmlFor="marketing" className="text-sm leading-tight cursor-pointer flex-1">
                        {t('auth.gdpr.marketingConsent')}
                      </label>
                    </div>

                    {/* Notice RGPD */}
                    <Alert className="mt-4">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {t('auth.gdpr.gdprNotice')}
                      </AlertDescription>
                    </Alert>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('auth.signingUp')}
                      </>
                    ) : (
                      t('auth.signUpButton')
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            {t('auth.termsText')}
          </p>
        </div>

        <ForgotPasswordDialog 
          open={showForgotPassword}
          onOpenChange={setShowForgotPassword}
        />
      </div>
    </main>
  );
};

export default Auth;
