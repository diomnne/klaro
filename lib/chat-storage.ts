import type { UIMessage } from 'ai';

/** One key holds the whole draft conversation. */
export const CHAT_STORAGE_KEY = 'klaro-draft-chat';

/**
 * Reads the saved transcript.
 *
 * Every access is guarded: localStorage throws on access (not just on write) in
 * Safari private mode and wherever site data is blocked, and the stored JSON can
 * be stale or hand-edited. A draft we cannot restore is worth less than a page
 * that still loads, so every failure path returns null and the chat starts empty.
 */
export function loadMessages(): UIMessage[] | null {
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    // Shape-check rather than trust: a malformed array would otherwise crash
    // the transcript render on mount, after hydration.
    if (!Array.isArray(parsed)) {
      return null;
    }

    const messages = parsed.filter(
      (message): message is UIMessage =>
        typeof message === 'object' &&
        message !== null &&
        'role' in message &&
        'parts' in message &&
        Array.isArray((message as UIMessage).parts),
    );

    return messages.length > 0 ? messages : null;
  } catch {
    return null;
  }
}

/** Writes the transcript, silently giving up if storage is unavailable or full. */
export function saveMessages(messages: UIMessage[]): void {
  try {
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Quota exceeded or storage blocked — the conversation still works in memory.
  }
}

/** Clears the saved transcript. */
export function clearMessages(): void {
  try {
    window.localStorage.removeItem(CHAT_STORAGE_KEY);
  } catch {
    // Nothing to do if storage is unavailable.
  }
}
