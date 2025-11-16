import React from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Moon, Sun, Monitor, Palette } from 'lucide-react';

export const AppearanceSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Apparence
        </CardTitle>
        <CardDescription>
          Personnalisez l'apparence de l'interface selon vos préférences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label className="text-base font-semibold">Thème de couleur</Label>
          <RadioGroup value={theme} onValueChange={setTheme}>
            <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background border">
                    <Sun className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">Clair</div>
                    <div className="text-sm text-muted-foreground">
                      Thème clair avec fond blanc
                    </div>
                  </div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="dark" id="dark" />
              <Label htmlFor="dark" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background border">
                    <Moon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">Sombre</div>
                    <div className="text-sm text-muted-foreground">
                      Thème sombre pour réduire la fatigue oculaire
                    </div>
                  </div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="system" id="system" />
              <Label htmlFor="system" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background border">
                    <Monitor className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">Système</div>
                    <div className="text-sm text-muted-foreground">
                      Utilise les paramètres de votre appareil
                    </div>
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="rounded-lg border p-4 bg-muted/50">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">ℹ️</div>
            <div className="text-sm text-muted-foreground">
              <strong>Astuce :</strong> Le mode sombre peut réduire la fatigue oculaire lors d'une utilisation prolongée,
              particulièrement dans des environnements peu éclairés.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
