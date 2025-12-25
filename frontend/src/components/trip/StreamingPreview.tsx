import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Sparkles } from 'lucide-react';

interface StreamingPreviewProps {
  content: string;
  progress: number;
  isStreaming: boolean;
}

export const StreamingPreview = ({ content, progress, isStreaming }: StreamingPreviewProps) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const contentRef = useRef(content);
  const rafRef = useRef<number>();
  const lastUpdateRef = useRef(0);

  // Throttle updates with requestAnimationFrame for smooth rendering
  useEffect(() => {
    contentRef.current = content;

    const updateContent = (timestamp: number) => {
      // Throttle to ~30fps for smooth typing effect
      if (timestamp - lastUpdateRef.current < 33) {
        rafRef.current = requestAnimationFrame(updateContent);
        return;
      }

      lastUpdateRef.current = timestamp;

      setDisplayedContent(prev => {
        const target = contentRef.current;
        if (prev === target) {
          setIsTyping(false);
          return prev;
        }

        setIsTyping(true);

        // Add characters progressively (simulate typing)
        if (prev.length < target.length) {
          // Add 5-10 characters at a time for faster typing
          const charsToAdd = Math.min(8, target.length - prev.length);
          return target.slice(0, prev.length + charsToAdd);
        }

        return target;
      });

      if (isStreaming || contentRef.current !== displayedContent) {
        rafRef.current = requestAnimationFrame(updateContent);
      }
    };

    rafRef.current = requestAnimationFrame(updateContent);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [content, isStreaming, displayedContent]);

  // Try to extract readable parts from JSON for better preview
  const formatContent = (rawContent: string): string => {
    if (!rawContent) return '';

    try {
      // Try to parse and extract meaningful content
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Extract key information for preview
        const preview: string[] = [];

        if (parsed.title) {
          preview.push(`📍 ${parsed.title}`);
        }

        if (parsed.description) {
          preview.push(`\n${parsed.description}`);
        }

        if (parsed.whyVisit) {
          preview.push(`\n\n✨ Pourquoi visiter ?\n${parsed.whyVisit}`);
        }

        if (parsed.days && Array.isArray(parsed.days)) {
          preview.push(`\n\n📅 Itinéraire (${parsed.days.length} jours) :`);
          parsed.days.slice(0, 2).forEach((day: any) => {
            if (day.dayNumber && day.theme) {
              preview.push(`\nJour ${day.dayNumber}: ${day.theme}`);
            }
          });
          if (parsed.days.length > 2) {
            preview.push(`\n... et ${parsed.days.length - 2} autres jours`);
          }
        }

        if (parsed.totalBudget) {
          preview.push(`\n\n💰 Budget estimé : ${parsed.totalBudget}€`);
        }

        return preview.join('');
      }
    } catch (e) {
      // If parsing fails, show raw content (truncated)
    }

    // Fallback: show first 500 chars of raw content
    return rawContent.slice(0, 500) + (rawContent.length > 500 ? '...' : '');
  };

  const formattedContent = formatContent(displayedContent);

  return (
    <Card className="overflow-hidden shadow-lg border-2 border-primary/30 bg-gradient-to-br from-background via-primary/5 to-background">
      <CardContent className="p-0">
        {/* Header with animated icon */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/20 px-6 py-4 border-b border-primary/20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Zap className={`h-6 w-6 text-primary ${isTyping ? 'animate-pulse' : ''}`} />
              {isTyping && (
                <Sparkles className="h-3 w-3 text-primary absolute -top-1 -right-1 animate-ping" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">
                Génération en temps réel
              </h3>
              <p className="text-xs text-muted-foreground">
                {isTyping ? 'L\'assistant écrit...' : 'Traitement en cours...'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-primary">{progress}%</div>
              <div className="text-xs text-muted-foreground">
                {displayedContent.length} caractères
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-1 bg-muted/30 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/60 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        </div>

        {/* Content area with typing effect */}
        <div className="p-6 max-h-[500px] overflow-y-auto">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {formattedContent}
              {isTyping && (
                <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
              )}
            </div>
          </div>

          {/* Show raw JSON toggle for debugging (optional) */}
          {displayedContent && !isTyping && (
            <details className="mt-4 text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground transition-colors">
                Voir le JSON brut (debug)
              </summary>
              <pre className="mt-2 p-3 bg-muted/50 rounded text-[10px] overflow-x-auto">
                {displayedContent}
              </pre>
            </details>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
