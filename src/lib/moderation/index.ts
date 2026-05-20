/**
 * Content moderation adapter.
 *
 * Vendor-agnostic interface. Tomorrow we pick Hive / OpenAI / Rekognition and
 * swap the `activeModerator` export below. No call site needs to change.
 *
 * Decision deferred to operator (vendor memo in /mnt/documents/MODERATION_VENDOR_MEMO.md).
 * Until then, `placeholderModerator` returns `flagged=false` for everything — so
 * Report and Block continue to populate the moderation_queue with the raw content
 * for human review, but no automated takedowns occur.
 */

export type ModerationContentType =
  | "text"
  | "image"
  | "audio";

export interface ModerationInput {
  type: ModerationContentType;
  /** Raw text, or a public/signed URL for image / audio. */
  content: string;
  /** Optional context (e.g. message id, user id) for the queue row. */
  meta?: Record<string, unknown>;
}

export interface ModerationResult {
  flagged: boolean;
  /** Map of category → confidence (0..1). Vendor-specific keys. */
  categories: Record<string, number>;
  /** Single aggregate score 0..1, vendor-defined. */
  score: number;
  /** Name of the vendor that produced this result. */
  provider: string;
  /** Raw vendor response, persisted to moderation_queue.ai_categories.raw. */
  raw?: unknown;
}

export interface ModerationAdapter {
  name: string;
  moderate(input: ModerationInput): Promise<ModerationResult>;
}

/**
 * Placeholder that never flags anything. Production replacement is a one-line
 * swap of `activeModerator` below. Keeps the queue populated for human review.
 */
export const placeholderModerator: ModerationAdapter = {
  name: "placeholder",
  async moderate(_input: ModerationInput): Promise<ModerationResult> {
    return {
      flagged: false,
      categories: {},
      score: 0,
      provider: "placeholder",
    };
  },
};

/**
 * Single swap point. Replace with hiveModerator / openAIModerator / rekognitionModerator
 * once the vendor is picked. Call sites only ever reference `activeModerator`.
 */
export const activeModerator: ModerationAdapter = placeholderModerator;

/**
 * Convenience wrapper used by ReportDialog / chat send paths.
 * Never throws — moderation failures degrade gracefully and let the
 * underlying user action proceed (the queue row is still written).
 */
export async function moderateContent(input: ModerationInput): Promise<ModerationResult> {
  try {
    return await activeModerator.moderate(input);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[moderation] adapter failed, falling back to unflagged", err);
    return {
      flagged: false,
      categories: {},
      score: 0,
      provider: `${activeModerator.name}:error`,
    };
  }
}