import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { authTokenStorage } from "@/integrations/api/client";

/**
 * Retour OAuth social. Le backend redirige ici avec les jetons dans le fragment :
 *   /auth/social-callback#access=...&refresh=...&redirect_to=/...
 * On stocke les jetons puis on recharge l'app sur la destination → AuthProvider
 * réhydrate l'utilisateur à partir du token présent. En cas d'erreur → /auth.
 */
const SocialAuthCallback = () => {
  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const access = params.get("access");
    const refresh = params.get("refresh");
    const redirectTo = params.get("redirect_to") || "/";

    if (access && refresh) {
      authTokenStorage.setTokens({ access, refresh });
      // Rechargement complet : AuthProvider relit le token au montage.
      window.location.replace(redirectTo.startsWith("/") ? redirectTo : "/");
    } else {
      window.location.replace("/auth?error=social_login_failed");
    }
  }, []);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p>Connexion en cours…</p>
    </div>
  );
};

export default SocialAuthCallback;
