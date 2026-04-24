// 30 shadow work prompts — rotated by day of year so the same prompt
// shows for every user on the same day. Hard-coded per spec.

export const SHADOW_PROMPTS: string[] = [
  "What pattern in my relationships am I ready to stop repeating today?",
  "What do I need from a partner that I have not been willing to ask for?",
  "What story about love did I inherit that no longer belongs to me?",
  "What would I do differently if I truly believed I was worthy of great love?",
  "Which version of myself shows up when I feel unsafe in a relationship?",
  "What am I most afraid a partner will discover about me?",
  "What does receiving love feel like in my body — and why?",
  "Who taught me what love looks like — and was that a healthy example?",
  "What do I reach for when I feel disconnected from someone I love?",
  "What would I stop tolerating if I loved myself the way I want to be loved?",
  "What feeling am I avoiding by staying busy in my relationships?",
  "Where in my love life am I still living by someone else's rules?",
  "What does my inner child need to feel safe enough to love freely?",
  "What would change if I stopped trying to earn love and simply received it?",
  "What am I grieving in my romantic life that I have not fully allowed myself to feel?",
  "What do I pretend not to need — and why?",
  "How does my relationship with myself reflect in my relationships with others?",
  "What would love feel like if I removed all conditions from it?",
  "What part of me do I hide when I start to feel close to someone?",
  "What did I decide about love the last time my heart was broken?",
  "What boundary have I been afraid to hold — and what is that fear protecting?",
  "How do I behave when I am trying to be loved versus when I feel loved?",
  "What would my relationships look like if I stopped needing to be chosen first?",
  "What am I waiting for before I allow myself to fully commit?",
  "How does the love I give differ from the love I allow myself to receive?",
  "What quality in a partner am I still waiting for permission to want?",
  "What version of love am I holding onto that has already ended?",
  "What does my Moon sign tell me about what I need but rarely ask for?",
  "What would I say to a dear friend who was experiencing my current love situation?",
  "What would I release from my heart tonight if the full moon asked me to?",
];

export const getDailyPromptIndex = (date: Date = new Date()): number => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return dayOfYear % SHADOW_PROMPTS.length;
};

export const getDailyPrompt = (date: Date = new Date()): string =>
  SHADOW_PROMPTS[getDailyPromptIndex(date)];