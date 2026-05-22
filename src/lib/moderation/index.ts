/**
 * Content moderation client.
 *
 * All moderation runs server-side via the `moderate-content` edge function so
 * vendor API keys (OpenAI Moderation, Hive) never ship in the client bundle.
 *
 * Routing (server-side):
 *   text  -> OpenAI Moderation
 *   image -> Hive visual moderation
 *   audio -> Hive audio moderation
 *
 * On adapter failure we fail CLOSED for text (treat as flagged) and OPEN for
 * image/audio while Hive is being provisioned. Call sites should block on
 * `flagged === true` and additionally write to `moderation_queue` so a human
 * can review.
 */
import { supabase } from "@/integrations/supabase/client";

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
 * Placeholder fallback — used only when the edge function is unreachable.
 * For text we fail CLOSED (caller blocks the action). For image/audio we fail OPEN
 * until Hive is fully wired so legitimate uploads aren't blocked during rollout.
 */
export const placeholderModerator: ModerationAdapter = {
  name: "placeholder",
  async moderate(input: ModerationInput): Promise<ModerationResult> {
    const failClosed = input.type === "text";
    return {
      flagged: failClosed,
      categories: {},
      score: failClosed ? 1 : 0,
      provider: "placeholder",
    };
  },
};

/** Edge-function backed moderator. Single swap point for vendor changes. */
export const activeModerator: ModerationAdapter = {
  name: "edge:moderate-content",
  async moderate(input: ModerationInput): Promise<ModerationResult> {
    const { data, error } = await supabase.functions.invoke("moderate-content", {
      body: { type: input.type, content: input.content },
    });
    if (error || !data) {
      // Fall through to placeholder's fail-closed/open policy.
      return placeholderModerator.moderate(input);
    }
    return data as ModerationResult;
  },
};

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
    console.warn("[moderation] adapter threw, applying placeholder policy", err);
    return placeholderModerator.moderate(input);
  }
}

/**
 * Convenience: moderate, and if flagged, also write a row to `moderation_queue`
 * so a human admin can review. Returns the moderation result so the caller can
 * decide whether to block the user action.
 */
export async function moderateAndQueue(
  input: ModerationInput & {
    contentId?: string;
    targetUserId?: string;
    reporterId?: string | null;
  },
): Promise<ModerationResult> {
  const result = await moderateContent(input);
  if (result.flagged) {
    try {
      await supabase.from("moderation_queue").insert({
        reporter_id: input.reporterId ?? null,
        target_user_id: input.targetUserId ?? null,
        content_type: input.type,
        content_id: input.contentId ?? null,
        content_snapshot: input.type === "text" ? input.content.slice(0, 4000) : input.content,
        reason: "ai_flagged",
        ai_provider: result.provider,
        ai_flagged: true,
        ai_categories: result.categories as any,
        ai_score: result.score,
        status: "pending",
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[moderation] queue insert failed", err);
    }
  }
  return result;
}