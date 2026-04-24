---
name: Lyra cosmic guide
description: Stellara's personal AI guide chat, streaming via cosmic-guide edge function, persisted in guide_conversations + guide_messages tables
type: feature
---
Lyra is Stellara's personal AI cosmic guide. Streaming chat at /guide using the `cosmic-guide` edge function (Lovable AI Gateway, model google/gemini-3-flash-preview). System prompt is grounded in the user's profile (sun/moon/rising, Human Design type/authority/profile, life path, personal year, gene keys life purpose).

Persistence: `guide_conversations` (id, user_id, title, last_message_at) and `guide_messages` (conversation_id, user_id, role, content). Both have RLS scoped to auth.uid(). A trigger bumps last_message_at on insert.

UI: ChatGPT-style with sidebar of threads (desktop) / overlay drawer (mobile), markdown rendering via react-markdown + remark-gfm, streaming dot indicator, starter prompts on empty state. Tone: warm, mystical-but-grounded "wise best friend".

Nav: Lyra appears in desktop nav (Wand2 icon) and replaces Inner World in the 5-tab mobile bottom bar (Inner World moved to mobile hamburger). Always-on access for all users — no premium gate yet.
