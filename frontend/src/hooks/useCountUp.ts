import { useState, useEffect, useRef } from 'react';

/**
 * Animates a number from 0 to `target` over `duration` ms using ease-out cubic.
 * Returns the formatted string at each animation frame.
 *
 * @param target   - Final numeric value to reach
 * @param duration - Animation duration in milliseconds (default 1400ms)
 * @param decimals - Number of decimal places in the returned string (default 0)
 */
export function useCountUp(
  target: number,
  duration = 1400,
  decimals = 0,
): string {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }

    // Reset on target change
    startRef.current = null;

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic: decelerates toward the target
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * target);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setValue(target); // snap to exact final value
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
}
