import { cn } from '@/lib/utils';

/** One grey bar. Static under reduced motion. */
function Bar({ className }: { className: string }) {
  return (
    <div
      className={cn(
        'h-3 rounded-full bg-muted motion-safe:animate-pulse',
        className,
      )}
    />
  );
}

/**
 * Stands in for the transcript while the saved conversation is read from the
 * browser: a user bubble, then a reply with a card's worth of lines. Roughly the
 * shape of a real exchange, so the swap doesn't move anything around it.
 */
export function ChatSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6" role="status">
      <span className="sr-only">Loading your saved draft…</span>

      <div className="ml-auto flex w-[75%] flex-col gap-2 rounded-bubble bg-muted/50 p-4">
        <Bar className="w-full" />
        <Bar className="w-5/6" />
        <Bar className="w-2/3" />
      </div>

      <div className="flex w-[90%] flex-col gap-3 border-l-2 border-border pl-4">
        <div className="flex flex-col gap-2 rounded-sheet border border-border p-4">
          <Bar className="w-1/2" />
          <Bar className="w-full" />
          <Bar className="w-5/6" />
        </div>
        <Bar className="w-full" />
        <Bar className="w-3/4" />
      </div>
    </div>
  );
}
