# 🎨 Pistes d'Amélioration - Page Profil Utilisateur

**Date:** 12 novembre 2025
**Fichier analysé:** `frontend/src/pages/Profile.tsx`
**Status actuel:** Basique (prénom, nom, email uniquement)

---

## 📊 Analyse de l'existant

### ✅ Ce qui existe déjà
- Prénom et nom de l'utilisateur
- Email (non modifiable)
- 4 onglets (Profil, Points d'intérêt, Itinéraires, Notifications)
- Points d'intérêt touristiques (complet)
- Itinéraires sauvegardés (complet)
- Notifications (composant séparé)

### ❌ Ce qui manque

#### 1. **Photo de profil / Avatar** ⚠️ PRIORITÉ HAUTE
- Aucun affichage d'avatar
- Aucun upload d'image
- Pas de preview

#### 2. **Informations personnelles complètes**
- Numéro de téléphone (`phone_number` existe dans le modèle mais non affiché)
- Biographie (`bio` existe mais non affichée)
- Date de naissance (RGPD - existe mais non affichée)
- Langue préférée (`preferred_language`)
- Préférences diverses

#### 3. **Informations statistiques**
- Nombre de points d'intérêt créés
- Nombre d'itinéraires sauvegardés
- Nombre de favoris
- Date d'inscription
- Dernière connexion

#### 4. **Sécurité et compte**
- Changement de mot de passe
- Authentification à deux facteurs (2FA) - le champ existe dans le backend!
- Sessions actives
- Historique de connexion

#### 5. **RGPD et confidentialité**
- Télécharger mes données
- Gérer mes consentements
- Supprimer mon compte
- Voir l'historique des consentements

#### 6. **Préférences utilisateur**
- Thème (clair/sombre)
- Langue de l'interface
- Devise préférée
- Notifications push
- Préférences de voyage (déjà dans behavior_profile mais non exploité)

---

## 🎯 Plan d'Amélioration Détaillé

### PHASE 1: Photo de Profil (1-2h) ⭐ PRIORITÉ HAUTE

#### Backend - Gérer l'upload d'images

**Fichier:** `backend/apps/accounts/serializers.py`

Ajouter un endpoint pour upload d'avatar:

```python
# backend/apps/accounts/views.py
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import uuid
import os

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_avatar(request):
    """Upload avatar image for user profile."""
    if 'avatar' not in request.FILES:
        return Response({'error': 'No avatar file provided'}, status=400)

    avatar_file = request.FILES['avatar']

    # Validate file size (max 5MB)
    if avatar_file.size > 5 * 1024 * 1024:
        return Response({'error': 'File size exceeds 5MB'}, status=400)

    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if avatar_file.content_type not in allowed_types:
        return Response({'error': 'Invalid file type. Allowed: JPG, PNG, GIF, WebP'}, status=400)

    # Generate unique filename
    ext = os.path.splitext(avatar_file.name)[1]
    filename = f"avatars/{request.user.public_id}/{uuid.uuid4()}{ext}"

    # Save file
    path = default_storage.save(filename, ContentFile(avatar_file.read()))
    avatar_url = default_storage.url(path)

    # Update user profile
    profile = request.user.profile
    profile.avatar_url = avatar_url
    profile.save()

    return Response({'avatar_url': avatar_url}, status=200)

# Ajouter à urls.py
path('accounts/upload-avatar/', upload_avatar, name='upload-avatar'),
```

#### Frontend - Composant Avatar Upload

**Nouveau composant:** `frontend/src/components/profile/AvatarUpload.tsx`

```tsx
import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/integrations/api/client';

interface AvatarUploadProps {
  currentAvatar?: string;
  userName: string;
  onAvatarChange: (newUrl: string) => void;
}

export const AvatarUpload = ({ currentAvatar, userName, onAvatarChange }: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image doit faire moins de 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Le fichier doit être une image');
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('http://localhost:8000/api/v1/accounts/upload-avatar/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      onAvatarChange(data.avatar_url);
      toast.success('Photo de profil mise à jour!');
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error(error.message || 'Erreur lors de l\'upload');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Supprimer votre photo de profil?')) return;

    try {
      await apiClient.patch('accounts/profile/', { avatar_url: '' });
      onAvatarChange('');
      setPreview(null);
      toast.success('Photo de profil supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getInitials = () => {
    return userName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
          <AvatarImage src={preview || currentAvatar} alt={userName} />
          <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-primary-glow text-white">
            {getInitials()}
          </AvatarFallback>
        </Avatar>

        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-0 right-0 rounded-full shadow-md"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Camera className="h-4 w-4" />
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Upload...' : 'Changer'}
        </Button>

        {(currentAvatar || preview) && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        JPG, PNG, GIF ou WebP. Max 5MB.
      </p>
    </div>
  );
};
```

**Modifier Profile.tsx:**

```tsx
// Ajouter l'import
import { AvatarUpload } from '@/components/profile/AvatarUpload';

// Dans le TabsContent "profile", avant le formulaire:
<CardContent>
  {/* Photo de profil */}
  <div className="flex justify-center mb-8">
    <AvatarUpload
      currentAvatar={profile?.avatar_url}
      userName={user?.display_name || 'Utilisateur'}
      onAvatarChange={(newUrl) => {
        // Rafraîchir le profil
        window.location.reload();
      }}
    />
  </div>

  <Separator className="my-6" />

  {/* Formulaire existant */}
  <form onSubmit={handleProfileUpdate}>
    ...
  </form>
</CardContent>
```

---

### PHASE 2: Informations Complètes (1h)

#### Ajouter les champs manquants dans Profile.tsx

```tsx
// Étendre profileForm
const [profileForm, setProfileForm] = useState({
  first_name: profile?.first_name || '',
  last_name: profile?.last_name || '',
  email: profile?.email || '',
  phone_number: profile?.phone_number || '',
  bio: profile?.bio || '',
  preferred_language: user?.preferred_language || 'fr',
});

// Dans le formulaire, après email:
<div className="space-y-2">
  <Label htmlFor="phone_number">Numéro de téléphone</Label>
  <Input
    id="phone_number"
    type="tel"
    placeholder="+33 6 12 34 56 78"
    value={profileForm.phone_number}
    onChange={(e) => setProfileForm(prev => ({ ...prev, phone_number: e.target.value }))}
    disabled={!isEditing}
  />
</div>

<div className="space-y-2">
  <Label htmlFor="bio">Biographie</Label>
  <Textarea
    id="bio"
    placeholder="Parlez-nous de vous et de vos passions de voyage..."
    value={profileForm.bio}
    onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
    disabled={!isEditing}
    rows={4}
    maxLength={500}
  />
  <p className="text-xs text-muted-foreground text-right">
    {profileForm.bio.length}/500 caractères
  </p>
</div>

<div className="space-y-2">
  <Label htmlFor="preferred_language">Langue préférée</Label>
  <Select
    value={profileForm.preferred_language}
    onValueChange={(value) => setProfileForm(prev => ({ ...prev, preferred_language: value }))}
    disabled={!isEditing}
  >
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="fr">Français</SelectItem>
      <SelectItem value="en">English</SelectItem>
      <SelectItem value="ar">العربية</SelectItem>
      <SelectItem value="de">Deutsch</SelectItem>
      <SelectItem value="es">Español</SelectItem>
      <SelectItem value="it">Italiano</SelectItem>
      <SelectItem value="pt">Português</SelectItem>
    </SelectContent>
  </Select>
</div>
```

---

### PHASE 3: Statistiques du Profil (30min)

**Ajouter en haut de la page, avant les onglets:**

```tsx
{/* Statistiques */}
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
  <Card>
    <CardContent className="pt-6">
      <div className="text-center">
        <MapPin className="w-8 h-8 mx-auto mb-2 text-primary" />
        <div className="text-2xl font-bold">{touristPoints.length}</div>
        <p className="text-sm text-muted-foreground">Points d'intérêt</p>
      </div>
    </CardContent>
  </Card>

  <Card>
    <CardContent className="pt-6">
      <div className="text-center">
        <Calendar className="w-8 h-8 mx-auto mb-2 text-primary" />
        <div className="text-2xl font-bold">{savedItineraries.length}</div>
        <p className="text-sm text-muted-foreground">Itinéraires</p>
      </div>
    </CardContent>
  </Card>

  <Card>
    <CardContent className="pt-6">
      <div className="text-center">
        <Heart className="w-8 h-8 mx-auto mb-2 text-red-500" />
        <div className="text-2xl font-bold">
          {savedItineraries.filter(i => i.is_favorite).length}
        </div>
        <p className="text-sm text-muted-foreground">Favoris</p>
      </div>
    </CardContent>
  </Card>

  <Card>
    <CardContent className="pt-6">
      <div className="text-center">
        <Clock className="w-8 h-8 mx-auto mb-2 text-primary" />
        <div className="text-sm font-medium">
          {new Date(user?.created_at || Date.now()).toLocaleDateString()}
        </div>
        <p className="text-sm text-muted-foreground">Membre depuis</p>
      </div>
    </CardContent>
  </Card>
</div>
```

---

### PHASE 4: Sécurité et Mot de Passe (2h)

#### Nouvel onglet "Sécurité"

**Ajouter dans TabsList:**

```tsx
<TabsList className="grid w-full grid-cols-5">
  <TabsTrigger value="profile">Profil</TabsTrigger>
  <TabsTrigger value="security">Sécurité</TabsTrigger>
  <TabsTrigger value="tourist-points">Points d'intérêt</TabsTrigger>
  <TabsTrigger value="saved-itineraries">Itinéraires</TabsTrigger>
  <TabsTrigger value="notifications">Notifications</TabsTrigger>
</TabsList>
```

**Nouveau composant:** `frontend/src/components/profile/SecuritySettings.tsx`

```tsx
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Shield, Key, Smartphone, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/integrations/api/client';

export const SecuritySettings = ({ user }: { user: any }) => {
  const [loading, setLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordForm.new_password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('accounts/change-password/', {
        old_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });

      toast.success('Mot de passe modifié avec succès');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error: any) {
      console.error('Password change error:', error);
      toast.error(error?.payload?.detail || 'Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle2FA = async (enabled: boolean) => {
    try {
      await apiClient.patch('accounts/profile/', {
        two_factor_enabled: enabled
      });
      toast.success(`Authentification à deux facteurs ${enabled ? 'activée' : 'désactivée'}`);
    } catch (error) {
      toast.error('Erreur lors de la modification');
    }
  };

  return (
    <div className="space-y-6">
      {/* Changement de mot de passe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Changer le mot de passe
          </CardTitle>
          <CardDescription>
            Assurez-vous d'utiliser un mot de passe fort et unique
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">Mot de passe actuel</Label>
              <Input
                id="current_password"
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">Nouveau mot de passe</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Au moins 8 caractères, incluant majuscules, minuscules, chiffres et caractères spéciaux
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmer le mot de passe</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                required
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Modification...' : 'Changer le mot de passe'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Authentification à deux facteurs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Authentification à deux facteurs (2FA)
          </CardTitle>
          <CardDescription>
            Ajoutez une couche de sécurité supplémentaire à votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="font-medium">Activer la 2FA</p>
              <p className="text-sm text-muted-foreground">
                Nécessite un code de vérification lors de la connexion
              </p>
            </div>
            <Switch
              checked={user?.two_factor_enabled || false}
              onCheckedChange={handleToggle2FA}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sessions actives */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Sessions actives
          </CardTitle>
          <CardDescription>
            Gérez les appareils connectés à votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Session actuelle</p>
                <p className="text-sm text-muted-foreground">Dernière activité: maintenant</p>
              </div>
              <Button variant="outline" size="sm">
                Cette session
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Aucune autre session active
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

**Ajouter dans Profile.tsx:**

```tsx
import { SecuritySettings } from '@/components/profile/SecuritySettings';

// Dans les TabsContent:
<TabsContent value="security" className="space-y-6">
  <SecuritySettings user={user} />
</TabsContent>
```

---

### PHASE 5: RGPD et Confidentialité (2-3h)

#### Nouvel onglet "Confidentialité"

**Nouveau composant:** `frontend/src/components/profile/PrivacySettings.tsx`

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Trash2, Shield, Eye, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/integrations/api/client';

export const PrivacySettings = ({ user }: { user: any }) => {
  const handleDownloadData = async () => {
    try {
      const data = await apiClient.get('accounts/export-data/');

      // Créer un fichier JSON et le télécharger
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tasarini-data-${new Date().toISOString()}.json`;
      a.click();

      toast.success('Vos données ont été téléchargées');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('⚠️ ATTENTION: Cette action est irréversible!\n\nÊtes-vous sûr de vouloir supprimer votre compte?\n\nToutes vos données seront supprimées dans 30 jours.')) {
      return;
    }

    if (!confirm('Dernière confirmation: Supprimer définitivement mon compte et toutes mes données?')) {
      return;
    }

    try {
      await apiClient.post('accounts/request-deletion/');
      toast.success('Demande de suppression enregistrée. Vous avez 30 jours pour annuler.');
      // Redirection vers page d'info
      window.location.href = '/account-deletion-requested';
    } catch (error) {
      toast.error('Erreur lors de la demande');
    }
  };

  return (
    <div className="space-y-6">
      {/* Mes données */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Télécharger mes données
          </CardTitle>
          <CardDescription>
            Conformément au RGPD, vous pouvez télécharger toutes vos données personnelles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDownloadData} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Télécharger mes données (JSON)
          </Button>
        </CardContent>
      </Card>

      {/* Consentements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Mes consentements
          </CardTitle>
          <CardDescription>
            Gérez vos consentements marketing et autres préférences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Marketing</p>
              <p className="text-sm text-muted-foreground">
                Recevoir des offres et nouveautés
              </p>
            </div>
            <Switch
              checked={user?.marketing_consent || false}
              onCheckedChange={async (checked) => {
                try {
                  await apiClient.patch('accounts/profile/', {
                    marketing_consent: checked,
                    marketing_consent_at: checked ? new Date().toISOString() : null
                  });
                  toast.success('Préférences mises à jour');
                } catch (error) {
                  toast.error('Erreur lors de la mise à jour');
                }
              }}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="mb-2"><strong>Historique:</strong></p>
            <ul className="space-y-1">
              <li>• CGU acceptées le: {new Date(user?.terms_accepted_at).toLocaleString()}</li>
              <li>• Politique acceptée le: {new Date(user?.privacy_policy_accepted_at).toLocaleString()}</li>
              {user?.marketing_consent_at && (
                <li>• Marketing accepté le: {new Date(user?.marketing_consent_at).toLocaleString()}</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Documents légaux */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents légaux
          </CardTitle>
          <CardDescription>
            Consultez nos documents juridiques
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" size="sm" asChild className="w-full justify-start">
            <a href="/legal/terms" target="_blank">
              <FileText className="w-4 h-4 mr-2" />
              Conditions Générales d'Utilisation
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild className="w-full justify-start">
            <a href="/legal/privacy" target="_blank">
              <Shield className="w-4 h-4 mr-2" />
              Politique de Confidentialité
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Suppression du compte */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Zone dangereuse
          </CardTitle>
          <CardDescription>
            Actions irréversibles sur votre compte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>Attention:</strong> La suppression de votre compte est définitive.
              Toutes vos données (profil, points d'intérêt, itinéraires) seront supprimées après 30 jours.
            </AlertDescription>
          </Alert>

          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer mon compte
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
```

---

## 🎨 Améliorations UI/UX Supplémentaires

### 1. Header de profil amélioré

```tsx
{/* Header avec avatar et stats */}
<Card className="mb-8">
  <CardContent className="pt-6">
    <div className="flex flex-col md:flex-row items-center gap-6">
      {/* Avatar */}
      <Avatar className="h-24 w-24">
        <AvatarImage src={profile?.avatar_url} />
        <AvatarFallback className="text-2xl">
          {user?.display_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Infos */}
      <div className="flex-1 text-center md:text-left">
        <h2 className="text-2xl font-bold">{user?.display_name}</h2>
        <p className="text-muted-foreground">{profile?.email}</p>
        {profile?.bio && (
          <p className="mt-2 text-sm max-w-2xl">{profile.bio}</p>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-col gap-2">
        {user?.email_verified && (
          <Badge variant="default">
            <Shield className="w-3 h-3 mr-1" />
            Email vérifié
          </Badge>
        )}
        {user?.two_factor_enabled && (
          <Badge variant="secondary">
            <Smartphone className="w-3 h-3 mr-1" />
            2FA activé
          </Badge>
        )}
      </div>
    </div>
  </CardContent>
</Card>
```

### 2. Thème clair/sombre

```tsx
import { useTheme } from '@/hooks/useTheme';

// Dans les préférences
<div className="flex items-center justify-between">
  <div>
    <p className="font-medium">Thème</p>
    <p className="text-sm text-muted-foreground">
      Choisissez votre thème préféré
    </p>
  </div>
  <Select value={theme} onValueChange={setTheme}>
    <SelectTrigger className="w-32">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="light">Clair</SelectItem>
      <SelectItem value="dark">Sombre</SelectItem>
      <SelectItem value="system">Système</SelectItem>
    </SelectContent>
  </Select>
</div>
```

---

## 📋 Checklist Complète d'Implémentation

### Phase 1: Photo de Profil ⭐ PRIORITÉ
- [ ] Backend: Endpoint upload avatar
- [ ] Backend: Validation fichier (taille, type)
- [ ] Backend: Stockage fichiers (local ou S3)
- [ ] Frontend: Composant AvatarUpload
- [ ] Frontend: Preview avant upload
- [ ] Frontend: Suppression avatar
- [ ] Test: Upload image 5MB
- [ ] Test: Types fichiers (JPG, PNG, GIF, WebP)

### Phase 2: Informations Complètes
- [ ] Ajouter téléphone
- [ ] Ajouter biographie (500 chars max)
- [ ] Ajouter langue préférée
- [ ] Validation format téléphone
- [ ] Compteur caractères bio

### Phase 3: Statistiques
- [ ] Carte Points d'intérêt
- [ ] Carte Itinéraires
- [ ] Carte Favoris
- [ ] Carte Date d'inscription
- [ ] Icônes colorées

### Phase 4: Sécurité
- [ ] Backend: Endpoint change-password
- [ ] Frontend: Formulaire changement MDP
- [ ] Validation complexité MDP
- [ ] Toggle 2FA
- [ ] Liste sessions actives
- [ ] Déconnexion autres sessions

### Phase 5: RGPD
- [ ] Backend: Export données (JSON)
- [ ] Frontend: Bouton télécharger données
- [ ] Gestion consentements marketing
- [ ] Historique consentements
- [ ] Liens vers documents légaux
- [ ] Suppression compte (30j délai)
- [ ] Page confirmation suppression

### Phase 6: UX
- [ ] Header profil avec avatar
- [ ] Badges (vérifié, 2FA, etc.)
- [ ] Sélecteur thème
- [ ] Animations smooth
- [ ] Responsive mobile

---

## ⏱️ Estimation Temps Total

| Phase | Temps | Priorité |
|-------|-------|----------|
| Photo de profil | 1-2h | ⭐⭐⭐ HAUTE |
| Infos complètes | 1h | ⭐⭐ MOYENNE |
| Statistiques | 30min | ⭐⭐ MOYENNE |
| Sécurité | 2h | ⭐⭐⭐ HAUTE |
| RGPD | 2-3h | ⭐⭐⭐ HAUTE |
| UX | 1h | ⭐ BASSE |

**Total:** 7.5 - 9.5 heures

---

## 🚀 Ordre d'Implémentation Recommandé

1. **Photo de profil** (Impact visuel immédiat)
2. **Informations complètes** (Bio, téléphone)
3. **Statistiques** (Quick win)
4. **Sécurité** (Changement MDP, 2FA)
5. **RGPD** (Export, suppression)
6. **UX Polish** (Thème, animations)

---

**Voulez-vous que je commence par implémenter la photo de profil?** 🎨
