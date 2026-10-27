/** The id of the chat composer's textarea, so other parts of the page can send the artist there. */
export const COMPOSER_ID = 'draft-composer';

/** Moves focus to the composer, if it's on the page. */
export function focusComposer(): void {
  document.getElementById(COMPOSER_ID)?.focus();
}
