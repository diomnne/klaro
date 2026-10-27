import { useEffect } from 'react';

/** The CSS variable the chat panel sizes itself from. */
export const VISUAL_VIEWPORT_VAR = '--vvh';

/**
 * Keeps `--vvh` equal to the height of the visible area. On a phone the on-screen
 * keyboard shrinks the visual viewport but not the layout viewport, so `vh`
 * and `dvh` units leave the composer underneath the keyboard. Sizing from this
 * keeps it above. Until the first update (and without `visualViewport`) the CSS
 * falls back to `100dvh`.
 */
export function useVisualViewportHeight(): void {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;

    function update(): void {
      root.style.setProperty(
        VISUAL_VIEWPORT_VAR,
        `${Math.round(viewport?.height ?? window.innerHeight)}px`,
      );
    }

    update();

    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      root.style.removeProperty(VISUAL_VIEWPORT_VAR);
    };
  }, []);
}
