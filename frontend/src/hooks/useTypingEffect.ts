import { useState, useEffect, useRef } from 'react';

interface UseTypingEffectOptions {
  speed?: number;  // chars per frame (default: 8)
  enabled?: boolean;  // can be disabled (default: true)
  delayMs?: number; // optional delay before typing starts
}

interface UseTypingEffectReturn {
  displayedText: string;
  isTyping: boolean;
  skipToEnd: () => void;
}

/**
 * Custom hook for creating a typing animation effect
 * Extracted from StreamingPreview for reusability
 *
 * @param targetText - The full text to display with typing effect
 * @param options - Configuration options for the typing effect
 * @returns Object containing displayed text, typing status, and skip function
 */
export const useTypingEffect = (
  targetText: string,
  options?: UseTypingEffectOptions
): UseTypingEffectReturn => {
  const { speed = 8, enabled = true, delayMs = 0 } = options || {};

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [shouldSkip, setShouldSkip] = useState(false);

  const rafRef = useRef<number>();
  const lastUpdateRef = useRef(0);
  const contentRef = useRef<string>(targetText ?? '');

  // Update content ref when targetText changes
  useEffect(() => {
    contentRef.current = targetText ?? '';
  }, [targetText]);

  // Skip to end function
  const skipToEnd = () => {
    setShouldSkip(true);
  };

  useEffect(() => {
    // If typing is disabled or should skip, show full text immediately
    if (!enabled || shouldSkip) {
      setDisplayedText(targetText);
      setIsTyping(false);
      return;
    }

    // If target text is empty, reset
    if (!targetText) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    setIsTyping(true);

    // Optional initial delay before starting typing
    let delayTimeout: ReturnType<typeof setTimeout> | null = null;

    const startAnimation = () => {
      const animate = (timestamp: number) => {
        // Throttle to ~30fps for smooth typing
        if (timestamp - lastUpdateRef.current < 33) {
          rafRef.current = requestAnimationFrame(animate);
          return;
        }

        lastUpdateRef.current = timestamp;

        setDisplayedText(prev => {
          const target = contentRef.current ?? '';

          // Check if we've reached the end
          if (prev === target || prev.length >= target.length) {
            setIsTyping(false);
            return target;
          }

          // Add characters progressively (simulate typing)
          const charsToAdd = Math.min(speed, target.length - prev.length);
          return target.slice(0, prev.length + charsToAdd);
        });

        // Continue animation if still typing
        if (contentRef.current && displayedText.length < contentRef.current.length) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    };

    if (delayMs > 0) {
      delayTimeout = setTimeout(startAnimation, delayMs);
    } else {
      startAnimation();
    }

    // Cleanup
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (delayTimeout) {
        clearTimeout(delayTimeout);
      }
    };
  }, [targetText, enabled, speed, shouldSkip, displayedText.length, delayMs]);

  return { displayedText, isTyping, skipToEnd };
};
