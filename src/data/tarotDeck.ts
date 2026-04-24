import theStar from "@/assets/tarot/the-star.jpg";
import theMoon from "@/assets/tarot/the-moon.jpg";
import theSun from "@/assets/tarot/the-sun.jpg";
import theLovers from "@/assets/tarot/the-lovers.jpg";
import theHighPriestess from "@/assets/tarot/the-high-priestess.jpg";
import theFool from "@/assets/tarot/the-fool.jpg";

export interface TarotCard {
  id: string;
  name: string;
  image: string;
  meaning: string;
}

/**
 * Stellara's hero Major Arcana — six cards rotated daily by date.
 * Each meaning is two short, warm Lyra-voice lines, max ~140 chars.
 */
export const TAROT_DECK: TarotCard[] = [
  {
    id: "the-star",
    name: "The Star",
    image: theStar,
    meaning: "Hope, renewal, and cosmic trust. You are exactly where you're meant to be.",
  },
  {
    id: "the-moon",
    name: "The Moon",
    image: theMoon,
    meaning: "Trust your intuition tonight. What feels uncertain is asking to be felt, not solved.",
  },
  {
    id: "the-sun",
    name: "The Sun",
    image: theSun,
    meaning: "Joy is the receipt for being aligned. Let yourself be seen today.",
  },
  {
    id: "the-lovers",
    name: "The Lovers",
    image: theLovers,
    meaning: "An invitation to choose with your whole heart. Pay attention to who lights you up.",
  },
  {
    id: "the-high-priestess",
    name: "The High Priestess",
    image: theHighPriestess,
    meaning: "Your knowing arrives quietly today. Listen before you act.",
  },
  {
    id: "the-fool",
    name: "The Fool",
    image: theFool,
    meaning: "A new beginning whispers. Step forward — the cosmos walks with you.",
  },
];

/** Deterministic daily card based on YYYY-MM-DD so a user sees the same card all day. */
export const getDailyTarotCard = (date: Date = new Date()): TarotCard => {
  const key = date.toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % TAROT_DECK.length;
  return TAROT_DECK[idx];
};