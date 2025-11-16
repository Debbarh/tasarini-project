import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/integrations/api/client';

export const PasswordChangeForm = () => {
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    label: string;
    color: string;
  }>({ score: 0, label: '', color: '' });

  // Validation de la force du mot de passe
  const checkPasswordStrength = (password: string) => {
    let score = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\\/]/.test(password),
    };

    if (checks.length) score++;
    if (checks.uppercase) score++;
    if (checks.lowercase) score++;
    if (checks.number) score++;
    if (checks.special) score++;

    let label = '';
    let color = '';

    if (score <= 2) {
      label = 'Faible';
      color = 'bg-red-500';
    } else if (score === 3) {
      label = 'Moyen';
      color = 'bg-orange-500';
    } else if (score === 4) {
      label = 'Bon';
      color = 'bg-yellow-500';
    } else {
      label = 'Fort';
      color = 'bg-green-500';
    }

    setPasswordStrength({ score, label, color });

    return checks;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setFormData({ ...formData, new_password: newPassword });
    if (newPassword) {
      checkPasswordStrength(newPassword);
    } else {
      setPasswordStrength({ score: 0, label: '', color: '' });
    }
  };

  const validatePassword = () => {
    const validationErrors: string[] = [];
    const checks = checkPasswordStrength(formData.new_password);

    if (!formData.current_password) {
      validationErrors.push('Le mot de passe actuel est requis');
    }

    if (!formData.new_password) {
      validationErrors.push('Le nouveau mot de passe est requis');
    } else {
      if (!checks.length) {
        validationErrors.push('Le mot de passe doit contenir au moins 8 caractères');
      }
      if (!checks.uppercase) {
        validationErrors.push('Le mot de passe doit contenir au moins une lettre majuscule');
      }
      if (!checks.lowercase) {
        validationErrors.push('Le mot de passe doit contenir au moins une lettre minuscule');
      }
      if (!checks.number) {
        validationErrors.push('Le mot de passe doit contenir au moins un chiffre');
      }
      if (!checks.special) {
        validationErrors.push('Le mot de passe doit contenir au moins un caractère spécial');
      }
    }

    if (formData.new_password !== formData.confirm_password) {
      validationErrors.push('Les mots de passe ne correspondent pas');
    }

    if (formData.current_password === formData.new_password) {
      validationErrors.push('Le nouveau mot de passe doit être différent de l\'ancien');
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) {
      return;
    }

    setLoading(true);
    setErrors([]);

    try {
      await apiClient.post('accounts/change-password/', {
        current_password: formData.current_password,
        new_password: formData.new_password,
      });

      toast.success('Mot de passe modifié avec succès !');

      // Réinitialiser le formulaire
      setFormData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setPasswordStrength({ score: 0, label: '', color: '' });
    } catch (error: any) {
      console.error('Password change error:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Erreur lors du changement de mot de passe';
      setErrors([errorMessage]);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <CardTitle>Changer le mot de passe</CardTitle>
        </div>
        <CardDescription>
          Assurez-vous d'utiliser un mot de passe fort et unique
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Mot de passe actuel */}
          <div className="space-y-2">
            <Label htmlFor="current_password">Mot de passe actuel</Label>
            <div className="relative">
              <Input
                id="current_password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={formData.current_password}
                onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
                placeholder="Entrez votre mot de passe actuel"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* Nouveau mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="new_password">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showNewPassword ? 'text' : 'password'}
                value={formData.new_password}
                onChange={handlePasswordChange}
                placeholder="Entrez votre nouveau mot de passe"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>

            {/* Indicateur de force du mot de passe */}
            {formData.new_password && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground min-w-[50px]">
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Le mot de passe doit contenir :</p>
                  <ul className="list-none space-y-0.5 ml-2">
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className={`h-3 w-3 ${formData.new_password.length >= 8 ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span>Au moins 8 caractères</span>
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className={`h-3 w-3 ${/[A-Z]/.test(formData.new_password) ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span>Une lettre majuscule</span>
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className={`h-3 w-3 ${/[a-z]/.test(formData.new_password) ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span>Une lettre minuscule</span>
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className={`h-3 w-3 ${/\d/.test(formData.new_password) ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span>Un chiffre</span>
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className={`h-3 w-3 ${/[!@#$%^&*(),.?":{}|<>\-_=+\[\]\\\/]/.test(formData.new_password) ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span>Un caractère spécial</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Confirmer le nouveau mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirmer le nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="confirm_password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                placeholder="Confirmez votre nouveau mot de passe"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Modification en cours...' : 'Changer le mot de passe'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
