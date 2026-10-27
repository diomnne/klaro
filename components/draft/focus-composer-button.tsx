'use client';

import { focusComposer } from '@/components/draft/focus-composer';
import { Button } from '@/components/ui/button';

/** The empty panels' one action: sends the artist to the composer to paste a message. */
export function FocusComposerButton() {
  return (
    <Button
      className="h-11 self-start sm:h-8"
      onClick={focusComposer}
      size="default"
      type="button"
      variant="outline"
    >
      Paste a message
    </Button>
  );
}
