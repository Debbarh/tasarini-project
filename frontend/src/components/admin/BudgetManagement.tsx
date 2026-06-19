import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Wallet, DollarSign, Percent, Globe, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { budgetService, BudgetLevel, BudgetCurrency, BudgetFlexibilityOption } from "@/services/budgetService";
import { getLocalizedLabel, getLocalizedName } from "@/utils/multilingualHelpers";
import { useTranslation } from "react-i18next";
import IconPicker from "@/components/admin/IconPicker";
import { TaxonomyIcon } from "@/lib/taxonomyIcon";

type LanguageOption = { code: string; label: string; required?: boolean };

const ADDITIONAL_LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'es', label: 'Espagnol' },
  { code: 'de', label: 'Allemand' },
  { code: 'it', label: 'Italien' },
  { code: 'pt', label: 'Portugais' },
  { code: 'ru', label: 'Russe' },
  { code: 'ja', label: 'Japonais' },
  { code: 'zh', label: 'Chinois' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabe' },
];

const LABEL_LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'fr', label: 'Français', required: true },
  { code: 'en', label: 'Anglais' },
  ...ADDITIONAL_LANGUAGE_OPTIONS,
];

const DESCRIPTION_LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'Anglais' },
  ...ADDITIONAL_LANGUAGE_OPTIONS,
];

const BudgetManagement = () => {
  const { i18n } = useTranslation();
  const [budgetLevels, setBudgetLevels] = useState<BudgetLevel[]>([]);
  const [currencies, setCurrencies] = useState<BudgetCurrency[]>([]);
  const [flexibilityOptions, setFlexibilityOptions] = useState<BudgetFlexibilityOption[]>([]);
  const [editingLevel, setEditingLevel] = useState<BudgetLevel | null>(null);
  const [editingCurrency, setEditingCurrency] = useState<BudgetCurrency | null>(null);
  const [editingFlexibility, setEditingFlexibility] = useState<BudgetFlexibilityOption | null>(null);
  const [isLevelDialogOpen, setIsLevelDialogOpen] = useState(false);
  const [isCurrencyDialogOpen, setIsCurrencyDialogOpen] = useState(false);
  const [isFlexibilityDialogOpen, setIsFlexibilityDialogOpen] = useState(false);
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [levelsData, currenciesData, flexData] = await Promise.all([
        budgetService.listLevels(),
        budgetService.listCurrencies(),
        budgetService.listFlexOptions(),
      ]);

      // Handle both array and paginated response formats
      const levelsArray = Array.isArray(levelsData)
        ? levelsData
        : (levelsData as any)?.results || [];
      const currenciesArray = Array.isArray(currenciesData)
        ? currenciesData
        : (currenciesData as any)?.results || [];
      const flexArray = Array.isArray(flexData)
        ? flexData
        : (flexData as any)?.results || [];

      setBudgetLevels(levelsArray);
      setCurrencies(currenciesArray);
      setFlexibilityOptions(flexArray);
    } catch (error) {
      console.error('Error fetching budget data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du budget",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fonctions pour les niveaux de budget
  const handleSaveLevel = async (level: Partial<BudgetLevel>) => {
    try {
      if (editingLevel) {
        await budgetService.updateLevel(editingLevel.id, level);
        toast({ title: "Succès", description: "Niveau de budget mis à jour" });
      } else {
        await budgetService.createLevel({
          ...level,
          default_daily_amount: level.default_daily_amount ?? 100,
          is_active: level.is_active ?? true,
          display_order: level.display_order ?? 0,
        });
        toast({ title: "Succès", description: "Niveau de budget créé" });
      }

      await fetchData();
      setEditingLevel(null);
      setIsLevelDialogOpen(false);
    } catch (error) {
      console.error('Error saving level:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le niveau de budget",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLevel = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce niveau de budget ?")) return;

    try {
      await budgetService.deleteLevel(id);
      toast({ title: "Succès", description: "Niveau de budget supprimé" });
      await fetchData();
    } catch (error) {
      console.error('Error deleting level:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le niveau de budget",
        variant: "destructive",
      });
    }
  };

  // Fonctions pour les devises
  const handleSaveCurrency = async (currency: Partial<BudgetCurrency>) => {
    const payload = {
      code: currency.code?.trim().toUpperCase() || '',
      name_fr: currency.name_fr?.trim() || '',
      name_en: currency.name_en?.trim() || '',
      symbol: currency.symbol?.trim() || '€',
      is_active: currency.is_active ?? true,
      is_default: currency.is_default ?? false,
      display_order: currency.display_order ?? 0,
    };

    if (payload.code.length < 3) {
      toast({
        title: "Code de devise invalide",
        description: "Le code ISO doit contenir au moins 3 caractères.",
        variant: "destructive",
      });
      return;
    }

    if (!payload.name_fr) {
      toast({
        title: "Nom manquant",
        description: "Le nom français est obligatoire pour enregistrer la devise.",
        variant: "destructive",
      });
      return;
    }

    if (!payload.symbol) {
      toast({
        title: "Symbole manquant",
        description: "Veuillez renseigner un symbole (€, $, etc.).",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingCurrency) {
        await budgetService.updateCurrency(editingCurrency.id, payload);
        toast({ title: "Succès", description: "Devise mise à jour" });
      } else {
        await budgetService.createCurrency(payload);
        toast({ title: "Succès", description: "Devise créée" });
      }

      await fetchData();
      setEditingCurrency(null);
      setIsCurrencyDialogOpen(false);
    } catch (error) {
      console.error('Error saving currency:', error);
      toast({
        title: "Erreur",
        description: (error as any)?.detail || (error as any)?.message || "Impossible de sauvegarder la devise",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCurrency = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette devise ?")) return;

    try {
      await budgetService.deleteCurrency(id);
      toast({ title: "Succès", description: "Devise supprimée" });
      await fetchData();
    } catch (error) {
      console.error('Error deleting currency:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la devise",
        variant: "destructive",
      });
    }
  };

  // Fonctions pour la flexibilité
  const handleSaveFlexibility = async (flexibility: Partial<BudgetFlexibilityOption>) => {
    try {
      if (editingFlexibility) {
        await budgetService.updateFlexOption(editingFlexibility.id, flexibility);
        toast({ title: "Succès", description: "Option de flexibilité mise à jour" });
      } else {
        await budgetService.createFlexOption({
          ...flexibility,
          percentage_variation: flexibility.percentage_variation ?? 0,
          is_active: flexibility.is_active ?? true,
          is_default: flexibility.is_default ?? false,
          display_order: flexibility.display_order ?? 0,
        });
        toast({ title: "Succès", description: "Option de flexibilité créée" });
      }

      await fetchData();
      setEditingFlexibility(null);
      setIsFlexibilityDialogOpen(false);
    } catch (error) {
      console.error('Error saving flexibility:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'option de flexibilité",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFlexibility = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette option de flexibilité ?")) return;

    try {
      await budgetService.deleteFlexOption(id);
      toast({ title: "Succès", description: "Option de flexibilité supprimée" });
      await fetchData();
    } catch (error) {
      console.error('Error deleting flexibility:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'option de flexibilité",
        variant: "destructive",
      });
    }
  };

  const handleTranslateLevel = async (levelId: number) => {
    try {
      const result = await budgetService.translateLevel(levelId);

      // Update the editing state with translated values
      setEditingLevel(result.budget_level);

      toast({
        title: <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Traduction réussie</span>,
        description: `${result.message} dans les langues: ${result.languages.join(", ")}`,
      });
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de traduire le niveau de budget",
        variant: "destructive",
      });
    }
  };

  const handleTranslateCurrency = async (currencyId: number) => {
    try {
      const result = await budgetService.translateCurrency(currencyId);

      // Update the editing state with translated values
      setEditingCurrency(result.budget_currency);

      toast({
        title: <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Traduction réussie</span>,
        description: `${result.message} dans les langues: ${result.languages.join(", ")}`,
      });
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de traduire la devise",
        variant: "destructive",
      });
    }
  };

  const handleTranslateFlexibility = async (flexibilityId: number) => {
    try {
      const result = await budgetService.translateFlexOption(flexibilityId);

      // Update the editing state with translated values
      setEditingFlexibility(result.budget_flexibility_option);

      toast({
        title: <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Traduction réussie</span>,
        description: `${result.message} dans les langues: ${result.languages.join(", ")}`,
      });
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de traduire l'option de flexibilité",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="levels">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="levels">Niveaux de budget</TabsTrigger>
          <TabsTrigger value="currencies">Devises</TabsTrigger>
          <TabsTrigger value="flexibility">Flexibilité</TabsTrigger>
        </TabsList>

        {/* Niveaux de budget */}
        <TabsContent value="levels">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Niveaux de budget
                </div>
                <Dialog open={isLevelDialogOpen} onOpenChange={setIsLevelDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingLevel(null)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter un niveau
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl w-[90vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingLevel ? 'Modifier le niveau' : 'Nouveau niveau de budget'}
                      </DialogTitle>
                      <DialogDescription>
                        Définissez les montants journaliers, les labels et le statut d'activation de ce niveau.
                      </DialogDescription>
                    </DialogHeader>

                    {editingLevel && (
                      <div className="border rounded-lg p-3 bg-blue-50 mb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Traduction automatique</p>
                            <p className="text-xs text-gray-600 mt-1">
                              Remplir automatiquement les champs de traduction vides via LibreTranslate
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleTranslateLevel(editingLevel.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Globe className="w-4 h-4 mr-1" />
                            Traduire
                          </Button>
                        </div>
                      </div>
                    )}

                    <BudgetLevelForm
                      level={editingLevel}
                      onSave={handleSaveLevel}
                      onCancel={() => setIsLevelDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Icône</TableHead>
                    <TableHead>Emoji</TableHead>
                    <TableHead>Montant par défaut</TableHead>
                    <TableHead>Gamme</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetLevels.map((level) => (
                    <TableRow key={level.id}>
                      <TableCell className="font-mono">{level.code}</TableCell>
                      <TableCell>{getLocalizedLabel(level, i18n.language) || level.label_fr}</TableCell>
                      <TableCell>
                        <TaxonomyIcon iconName={level.icon_name} code={level.code} className="h-5 w-5" />
                      </TableCell>
                      <TableCell className="text-lg">{level.icon_emoji}</TableCell>
                      <TableCell>{level.default_daily_amount}€</TableCell>
                      <TableCell>
                        {level.min_daily_amount && level.max_daily_amount 
                          ? `${level.min_daily_amount}€ - ${level.max_daily_amount}€`
                          : level.min_daily_amount 
                          ? `> ${level.min_daily_amount}€`
                          : level.max_daily_amount 
                          ? `< ${level.max_daily_amount}€`
                          : 'Illimité'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={level.is_active ? "default" : "secondary"}>
                          {level.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingLevel(level);
                              setIsLevelDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteLevel(level.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Devises */}
        <TabsContent value="currencies">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Devises
                </div>
                <Dialog open={isCurrencyDialogOpen} onOpenChange={setIsCurrencyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingCurrency(null)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter une devise
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl w-[90vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingCurrency ? 'Modifier la devise' : 'Nouvelle devise'}
                      </DialogTitle>
                      <DialogDescription>
                        Fournissez un code ISO, un nom et un symbole avant de définir les options de statut.
                      </DialogDescription>
                    </DialogHeader>

                    {editingCurrency && (
                      <div className="border rounded-lg p-3 bg-blue-50 mb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Traduction automatique</p>
                            <p className="text-xs text-gray-600 mt-1">
                              Remplir automatiquement les champs de traduction vides via LibreTranslate
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleTranslateCurrency(editingCurrency.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Globe className="w-4 h-4 mr-1" />
                            Traduire
                          </Button>
                        </div>
                      </div>
                    )}

                    <BudgetCurrencyForm
                      currency={editingCurrency}
                      onSave={handleSaveCurrency}
                      onCancel={() => setIsCurrencyDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Symbole</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Par défaut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currencies.map((currency) => (
                    <TableRow key={currency.id}>
                      <TableCell className="font-mono">{currency.code}</TableCell>
                      <TableCell>{getLocalizedName(currency, i18n.language) || currency.name_fr}</TableCell>
                      <TableCell className="text-lg">{currency.symbol}</TableCell>
                      <TableCell>
                        <Badge variant={currency.is_active ? "default" : "secondary"}>
                          {currency.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {currency.is_default && (
                          <Badge variant="outline">Par défaut</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingCurrency(currency);
                              setIsCurrencyDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCurrency(currency.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flexibilité */}
        <TabsContent value="flexibility">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className="w-5 h-5" />
                  Options de flexibilité
                </div>
                <Dialog open={isFlexibilityDialogOpen} onOpenChange={setIsFlexibilityDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingFlexibility(null)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter une option
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl w-[90vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingFlexibility ? 'Modifier l\'option' : 'Nouvelle option de flexibilité'}
                      </DialogTitle>
                      <DialogDescription>
                        Paramétrez la variation autorisée ainsi que les labels pour cette option de flexibilité.
                      </DialogDescription>
                    </DialogHeader>

                    {editingFlexibility && (
                      <div className="border rounded-lg p-3 bg-blue-50 mb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Traduction automatique</p>
                            <p className="text-xs text-gray-600 mt-1">
                              Remplir automatiquement les champs de traduction vides via LibreTranslate
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleTranslateFlexibility(editingFlexibility.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Globe className="w-4 h-4 mr-1" />
                            Traduire
                          </Button>
                        </div>
                      </div>
                    )}

                    <BudgetFlexibilityForm
                      flexibility={editingFlexibility}
                      onSave={handleSaveFlexibility}
                      onCancel={() => setIsFlexibilityDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Variation (%)</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Par défaut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flexibilityOptions.map((option) => (
                    <TableRow key={option.id}>
                      <TableCell className="font-mono">{option.code}</TableCell>
                      <TableCell>{getLocalizedLabel(option, i18n.language) || option.label_fr}</TableCell>
                      <TableCell>±{option.percentage_variation}%</TableCell>
                      <TableCell>
                        <Badge variant={option.is_active ? "default" : "secondary"}>
                          {option.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {option.is_default && (
                          <Badge variant="outline">Par défaut</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingFlexibility(option);
                              setIsFlexibilityDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteFlexibility(option.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Formulaire pour les niveaux de budget
const BudgetLevelForm = ({ 
  level, 
  onSave, 
  onCancel 
}: { 
  level: BudgetLevel | null; 
  onSave: (level: Partial<BudgetLevel>) => void;
  onCancel: () => void;
}) => {
  const createState = () => ({
    code: level?.code || '',
    label_fr: level?.label_fr || '',
    label_en: level?.label_en || '',
    label_es: level?.label_es || '',
    label_de: level?.label_de || '',
    label_it: level?.label_it || '',
    label_pt: level?.label_pt || '',
    label_ru: level?.label_ru || '',
    label_ja: level?.label_ja || '',
    label_zh: level?.label_zh || '',
    label_hi: level?.label_hi || '',
    label_ar: level?.label_ar || '',
    description_fr: level?.description_fr || '',
    description_en: level?.description_en || '',
    description_es: level?.description_es || '',
    description_de: level?.description_de || '',
    description_it: level?.description_it || '',
    description_pt: level?.description_pt || '',
    description_ru: level?.description_ru || '',
    description_ja: level?.description_ja || '',
    description_zh: level?.description_zh || '',
    description_hi: level?.description_hi || '',
    description_ar: level?.description_ar || '',
    icon_emoji: level?.icon_emoji || '',
    icon_name: level?.icon_name || '',
    min_daily_amount: level?.min_daily_amount ?? null,
    max_daily_amount: level?.max_daily_amount ?? null,
    default_daily_amount: level?.default_daily_amount ?? 100,
    is_active: level?.is_active ?? true,
    display_order: level?.display_order ?? 0
  });
  type LevelFormState = ReturnType<typeof createState>;
  const [formData, setFormData] = useState<LevelFormState>(createState());

  useEffect(() => {
    setFormData(createState());
  }, [level]);

  const updateField = <K extends keyof LevelFormState>(field: K, value: LevelFormState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Code (identifiant)</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="ex: standard"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="icon_emoji">Emoji (legacy)</Label>
          <Input
            id="icon_emoji"
            value={formData.icon_emoji}
            onChange={(e) => setFormData({ ...formData, icon_emoji: e.target.value })}
            placeholder="💳"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Icône SVG</Label>
        <IconPicker value={formData.icon_name} onChange={(name) => updateField('icon_name', name)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="label_fr">Label français</Label>
          <Input
            id="label_fr"
            value={formData.label_fr}
            onChange={(e) => setFormData({ ...formData, label_fr: e.target.value })}
            placeholder="Standard"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="label_en">Label anglais</Label>
          <Input
            id="label_en"
            value={formData.label_en}
            onChange={(e) => updateField('label_en', e.target.value)}
            placeholder="Standard"
          />
        </div>
      </div>
      <TranslationFieldGrid
        title="Labels (toutes langues)"
        description="Ajoutez les intitulés pour les langues supportées."
        languages={LABEL_LANGUAGE_OPTIONS}
        valueGetter={(code) => formData[`label_${code}` as keyof LevelFormState] as string || ""}
        onChange={(code, value) => {
          const field = `label_${code}` as keyof LevelFormState;
          updateField(field, value as LevelFormState[typeof field]);
        }}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="description_fr">Description française</Label>
          <Textarea
            id="description_fr"
            value={formData.description_fr}
            onChange={(e) => updateField('description_fr', e.target.value)}
            placeholder="Hôtels 3⭐, restaurants variés"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description_en">Description anglaise</Label>
          <Textarea
            id="description_en"
            value={formData.description_en}
            onChange={(e) => updateField('description_en', e.target.value)}
            placeholder="3⭐ hotels, various restaurants"
          />
        </div>
      </div>
      <TranslationFieldGrid
        title="Descriptions (toutes langues)"
        description="Décrivez ce niveau dans chaque langue utilisée."
        languages={DESCRIPTION_LANGUAGE_OPTIONS}
        textarea
        valueGetter={(code) => formData[`description_${code}` as keyof LevelFormState] as string || ""}
        onChange={(code, value) => {
          const field = `description_${code}` as keyof LevelFormState;
          updateField(field, value as LevelFormState[typeof field]);
        }}
      />

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="min_daily_amount">Montant min/jour (€)</Label>
          <Input
            id="min_daily_amount"
            type="number"
            value={formData.min_daily_amount || ''}
            onChange={(e) => updateField('min_daily_amount', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_daily_amount">Montant max/jour (€)</Label>
          <Input
            id="max_daily_amount"
            type="number"
            value={formData.max_daily_amount || ''}
            onChange={(e) => updateField('max_daily_amount', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="150"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="default_daily_amount">Montant par défaut (€)</Label>
          <Input
            id="default_daily_amount"
            type="number"
            required
            value={formData.default_daily_amount}
            onChange={(e) => updateField('default_daily_amount', parseFloat(e.target.value) || 100)}
            placeholder="100"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="display_order">Ordre d'affichage</Label>
          <Input
            id="display_order"
            type="number"
            value={formData.display_order}
            onChange={(e) => updateField('display_order', parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => updateField('is_active', checked)}
          />
          <Label htmlFor="is_active">Actif</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button onClick={() => onSave(formData)}>
          Sauvegarder
        </Button>
      </div>
    </div>
  );
};

// Formulaire pour les devises
const BudgetCurrencyForm = ({ 
  currency, 
  onSave, 
  onCancel 
}: { 
  currency: BudgetCurrency | null; 
  onSave: (currency: Partial<BudgetCurrency>) => void;
  onCancel: () => void;
}) => {
  const buildState = () => ({
    code: currency?.code || '',
    name_fr: currency?.name_fr || '',
    name_en: currency?.name_en || '',
    name_es: currency?.name_es || '',
    name_de: currency?.name_de || '',
    name_it: currency?.name_it || '',
    name_pt: currency?.name_pt || '',
    name_ru: currency?.name_ru || '',
    name_ja: currency?.name_ja || '',
    name_zh: currency?.name_zh || '',
    name_hi: currency?.name_hi || '',
    name_ar: currency?.name_ar || '',
    symbol: currency?.symbol || '€',
    is_active: currency?.is_active ?? true,
    is_default: currency?.is_default ?? false,
    display_order: currency?.display_order ?? 0,
  });
  type CurrencyFormState = ReturnType<typeof buildState>;
  const [formData, setFormData] = useState<CurrencyFormState>(buildState());

  useEffect(() => {
    setFormData(buildState());
  }, [currency]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="currency_code">Code (ISO)</Label>
          <Input
            id="currency_code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="EUR"
            maxLength={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="symbol">Symbole</Label>
          <Input
            id="symbol"
            value={formData.symbol}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
            placeholder="€"
          />
        </div>
      </div>
      <TranslationFieldGrid
        title="Noms supplémentaires"
        description="Saisissez le nom de la devise pour les autres langues."
        languages={ADDITIONAL_LANGUAGE_OPTIONS}
        valueGetter={(code) => formData[`name_${code}` as keyof CurrencyFormState] as string || ""}
        onChange={(code, value) => {
          const field = `name_${code}` as keyof CurrencyFormState;
          setFormData((prev) => ({ ...prev, [field]: value as CurrencyFormState[typeof field] }));
        }}
      />
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name_fr">Nom français</Label>
          <Input
            id="name_fr"
            value={formData.name_fr}
            onChange={(e) => setFormData({ ...formData, name_fr: e.target.value })}
            placeholder="Euro"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name_en">Nom anglais</Label>
          <Input
            id="name_en"
            value={formData.name_en}
            onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
            placeholder="Euro"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="currency_display_order">Ordre d'affichage</Label>
          <Input
            id="currency_display_order"
            type="number"
            value={formData.display_order}
            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="currency_is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label htmlFor="currency_is_active">Actif</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="currency_is_default"
            checked={formData.is_default}
            onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
          />
          <Label htmlFor="currency_is_default">Par défaut</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button onClick={() => onSave(formData)}>
          Sauvegarder
        </Button>
      </div>
    </div>
  );
};

// Formulaire pour la flexibilité
const BudgetFlexibilityForm = ({ 
  flexibility, 
  onSave, 
  onCancel 
}: { 
  flexibility: BudgetFlexibilityOption | null; 
  onSave: (flexibility: Partial<BudgetFlexibilityOption>) => void;
  onCancel: () => void;
}) => {
  const createState = () => ({
    code: flexibility?.code || '',
    label_fr: flexibility?.label_fr || '',
    label_en: flexibility?.label_en || '',
    label_es: flexibility?.label_es || '',
    label_de: flexibility?.label_de || '',
    label_it: flexibility?.label_it || '',
    label_pt: flexibility?.label_pt || '',
    label_ru: flexibility?.label_ru || '',
    label_ja: flexibility?.label_ja || '',
    label_zh: flexibility?.label_zh || '',
    label_hi: flexibility?.label_hi || '',
    label_ar: flexibility?.label_ar || '',
    description_fr: flexibility?.description_fr || '',
    description_en: flexibility?.description_en || '',
    description_es: flexibility?.description_es || '',
    description_de: flexibility?.description_de || '',
    description_it: flexibility?.description_it || '',
    description_pt: flexibility?.description_pt || '',
    description_ru: flexibility?.description_ru || '',
    description_ja: flexibility?.description_ja || '',
    description_zh: flexibility?.description_zh || '',
    description_hi: flexibility?.description_hi || '',
    description_ar: flexibility?.description_ar || '',
    percentage_variation: flexibility?.percentage_variation ?? 0,
    is_active: flexibility?.is_active ?? true,
    is_default: flexibility?.is_default ?? false,
    display_order: flexibility?.display_order ?? 0,
  });
  type FlexFormState = ReturnType<typeof createState>;
  const [formData, setFormData] = useState<FlexFormState>(createState());

  useEffect(() => {
    setFormData(createState());
  }, [flexibility]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="flexibility_code">Code (identifiant)</Label>
          <Input
            id="flexibility_code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="ex: flexible"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="percentage_variation">Variation (%)</Label>
          <Input
            id="percentage_variation"
            type="number"
            min="0"
            max="100"
            value={formData.percentage_variation}
            onChange={(e) => setFormData({ ...formData, percentage_variation: parseInt(e.target.value) || 0 })}
            placeholder="20"
          />
        </div>
      </div>
      <TranslationFieldGrid
        title="Labels (toutes langues)"
        description="Complétez les traductions de cette option."
        languages={LABEL_LANGUAGE_OPTIONS}
        valueGetter={(code) => formData[`label_${code}` as keyof FlexFormState] as string || ""}
        onChange={(code, value) => {
          const field = `label_${code}` as keyof FlexFormState;
          setFormData((prev) => ({ ...prev, [field]: value as FlexFormState[typeof field] }));
        }}
      />
      <TranslationFieldGrid
        title="Descriptions (toutes langues)"
        description="Ajoutez une description localisée de l'option."
        languages={DESCRIPTION_LANGUAGE_OPTIONS}
        textarea
        valueGetter={(code) => formData[`description_${code}` as keyof FlexFormState] as string || ""}
        onChange={(code, value) => {
          const field = `description_${code}` as keyof FlexFormState;
          setFormData((prev) => ({ ...prev, [field]: value as FlexFormState[typeof field] }));
        }}
      />

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="flexibility_display_order">Ordre d'affichage</Label>
          <Input
            id="flexibility_display_order"
            type="number"
            value={formData.display_order}
            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="flexibility_is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label htmlFor="flexibility_is_active">Actif</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="flexibility_is_default"
            checked={formData.is_default}
            onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
          />
          <Label htmlFor="flexibility_is_default">Par défaut</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button onClick={() => onSave(formData)}>
          Sauvegarder
        </Button>
      </div>
    </div>
  );
};

interface TranslationFieldGridProps {
  title: string;
  description?: string;
  languages: ReadonlyArray<LanguageOption>;
  valueGetter: (code: string) => string;
  onChange: (code: string, value: string) => void;
  textarea?: boolean;
}

const TranslationFieldGrid = ({
  title,
  description,
  languages,
  valueGetter,
  onChange,
  textarea = false,
}: TranslationFieldGridProps) => (
  <div className="rounded-lg border p-3 space-y-3">
    <div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {languages.map(({ code, label, required }) => (
        <div key={code} className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
            {label}
            {required && <span className="text-destructive">*</span>}
          </Label>
          {textarea ? (
            <Textarea
              value={valueGetter(code)}
              required={required}
              onChange={(e) => onChange(code, e.target.value)}
            />
          ) : (
            <Input
              value={valueGetter(code)}
              required={required}
              onChange={(e) => onChange(code, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  </div>
);


export default BudgetManagement;
