'use client';

import { ConversationEmptyState } from '@/components/ai-elements/conversation';
import { usePromptInputController } from '@/components/ai-elements/prompt-input';
import { focusComposer } from '@/components/draft/focus-composer';
import { Button } from '@/components/ui/button';
import { EXAMPLE_MESSAGES } from '@/lib/example-messages';

/**
 * What a first visit sees: one line of instruction and two made-up examples. An
 * example only fills the composer. It's never sent for the artist, so they see
 * what redaction does to it and choose whether to send.
 */
export function ChatEmptyState() {
  const { textInput } = usePromptInputController();

  function fill(text: string): void {
    textInput.setInput(text);
    focusComposer();
  }

  return (
    <ConversationEmptyState>
      <div className="flex max-w-sm flex-col items-center gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Paste the client&rsquo;s message</h3>
          <p className="text-sm text-muted-foreground">
            Or describe the commission in your own words. Klaro checks the
            message for scam patterns, then talks through what&rsquo;s missing.
          </p>
        </div>

        <div className="flex w-full flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Try an example. It&rsquo;s made up, and nothing is sent until you press send.
          </p>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            {EXAMPLE_MESSAGES.map((example) => (
              <Button
                className="h-11 sm:h-8"
                key={example.id}
                onClick={() => fill(example.text)}
                size="default"
                type="button"
                variant="outline"
              >
                {example.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </ConversationEmptyState>
  );
}
