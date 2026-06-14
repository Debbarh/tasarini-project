import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";
import { apiClient } from "@/integrations/api/client";

interface Testimonial {
  id: string;
  rating: number;
  comment: string;
  author: string;
  touristPoint: string;
  date: string;
}

/**
 * Section témoignages : affiche de VRAIS avis utilisateurs (TouristPointReview,
 * note >= 4). Se masque entièrement tant qu'aucun avis n'existe — aucun faux avis.
 */
export const Testimonials = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<Testimonial[]>([]);

  useEffect(() => {
    let active = true;
    apiClient
      .get<Testimonial[]>("poi/reviews/featured/")
      .then((data) => {
        if (active) setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">
            {t("home.testimonialsTitle")}
          </h2>
          <p className="text-muted-foreground">
            {t("home.testimonialsSubtitle")}
          </p>
        </div>
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {items.map((item) => (
            <Card key={item.id} className="border-primary/10 h-full">
              <CardContent className="p-5 flex flex-col gap-3 h-full">
                <div
                  className="flex items-center gap-1 text-warning"
                  aria-label={`${item.rating}/5`}
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < item.rating ? "fill-current" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground flex-1">
                  <Quote className="h-4 w-4 inline mr-1 text-primary/40" />
                  {item.comment}
                </p>
                <div className="flex items-center gap-3 pt-2 border-t">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary-glow text-white flex items-center justify-center text-sm font-semibold shrink-0">
                    {item.author.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{item.author}</div>
                    <div className="text-xs text-muted-foreground truncate">{item.touristPoint}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
