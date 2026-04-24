import { useCallback, useEffect, useRef, useState } from "react";

const ENABLED_KEY = "lyra-voice-enabled";
const PRIMER_KEY = "lyra-voice-primer-shown";

/**
 * useLyraVoice — Web Speech API wrapper for Lyra's text-to-speech.
 *
 * - Default OFF. User toggles on in Lyra header or Settings.
 * - Persists preference in localStorage so the toggle is sticky across sessions.
 * - Picks the warmest available female voice on the device.
 * - Strips markdown before reading so the user doesn't hear "asterisk asterisk bold".
 * - Exposes a `firstTimePrimerPending` flag so the chat can show the
 *   one-time "tap the speaker to listen" hint after the first response.
 */
export const useLyraVoice = () => {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(ENABLED_KEY) === "true";
  });
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Detect support + select the warmest available female voice once voices load
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      // Preference order: high-quality female voices known across major browsers
      const preferred = [
        /samantha/i, // macOS/iOS — warm
        /victoria/i,
        /karen/i,
        /serena/i,
        /allison/i,
        /ava/i,
        /tessa/i,
        /moira/i,
        /female/i,
      ];
      let chosen: SpeechSynthesisVoice | null = null;
      for (const re of preferred) {
        const match = voices.find((v) => re.test(v.name) && v.lang.startsWith("en"));
        if (match) {
          chosen = match;
          break;
        }
      }
      // Fallback: any English voice
      if (!chosen) {
        chosen = voices.find((v) => v.lang.startsWith("en")) ?? voices[0] ?? null;
      }
      voiceRef.current = chosen;
    };

    pickVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
  }, []);

  // Stop any active speech if the user disables voice mid-utterance
  useEffect(() => {
    if (!enabled && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, [enabled]);

  // Stop on page unload
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ENABLED_KEY, value ? "true" : "false");
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  /**
   * Strip markdown so TTS doesn't read syntax characters aloud.
   */
  const cleanForSpeech = (text: string): string => {
    return text
      .replace(/```[\s\S]*?```/g, "")            // code blocks
      .replace(/`([^`]+)`/g, "$1")               // inline code
      .replace(/!\[[^\]]*\]\([^)]+\)/g, "")      // images
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")   // links — keep label
      .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1") // bold/italic
      .replace(/^#{1,6}\s+/gm, "")               // headings
      .replace(/^>\s+/gm, "")                    // blockquotes
      .replace(/^[-*+]\s+/gm, "")                // list bullets
      .replace(/✦|✧|⋆|·/g, " ")                  // decorative glyphs
      .replace(/\s{2,}/g, " ")
      .trim();
  };

  /**
   * Speak a piece of text. Always cancels any in-flight speech first
   * so consecutive calls don't queue and overrun.
   */
  const speak = useCallback(
    (text: string) => {
      if (!enabled || !supported) return;
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

      const cleaned = cleanForSpeech(text);
      if (!cleaned) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.rate = 0.9;
      utterance.pitch = 0.95;
      utterance.volume = 1;
      if (voiceRef.current) utterance.voice = voiceRef.current;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [enabled, supported],
  );

  /**
   * Whether the first-time speaker-icon hint should be shown.
   * The chat should call `dismissPrimer()` once it's been displayed.
   */
  const firstTimePrimerPending =
    supported &&
    !enabled &&
    typeof window !== "undefined" &&
    window.localStorage.getItem(PRIMER_KEY) !== "true";

  const dismissPrimer = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PRIMER_KEY, "true");
    }
  }, []);

  return {
    enabled,
    setEnabled,
    speak,
    stop,
    speaking,
    supported,
    firstTimePrimerPending,
    dismissPrimer,
  };
};