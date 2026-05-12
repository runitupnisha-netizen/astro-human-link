import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Check, X, MessageSquareQuote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PROMPT_OPTIONS = [
  // Free text
  "About me...",

  // Light & fun
  "My simple pleasures are…",
  "A random fact I love is…",
  "Two truths and a lie…",
  "My most irrational fear is…",
  "I geek out about…",
  "My biggest date fail was…",
  "I go crazy for…",
  "On weekends you'll find me…",
  "A perfect Sunday looks like…",

  // Intentional & deeper
  "The hallmark of a good relationship is…",
  "I'm looking for someone who…",
  "The way to my heart is…",
  "Green flags I look for…",
  "My love language is…",
  "I'll fall for you if…",
  "The best way to ask me out is…",
  "I'm convinced that…",

  // Soulful & reflective
  "Something that changed my perspective on life…",
  "A moment I felt truly aligned was…",
  "The kind of energy I want to build with someone…",
  "What I've learned about love so far…",
  "I feel most like myself when…",
  "A belief I hold that most people don't…",
  "The deeper side of me that people don't always see…",
];

const FREE_TEXT_PROMPT = "About me...";

interface Prompt {
  question: string | null;
  answer: string | null;
}

interface BioPromptsProps {
  userId: string;
  editable?: boolean;
  onSaved?: () => void | Promise<void>;
}

const BioPrompts = ({ userId, editable = false, onSaved }: BioPromptsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<Prompt[]>([
    { question: null, answer: null },
    { question: null, answer: null },
    { question: null, answer: null },
  ]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempQuestion, setTempQuestion] = useState("");
  const [tempAnswer, setTempAnswer] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrompts();
  }, [userId]);

  const loadPrompts = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("bio_prompt_1, bio_prompt_1_answer, bio_prompt_2, bio_prompt_2_answer, bio_prompt_3, bio_prompt_3_answer")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      setPrompts([
        { question: data.bio_prompt_1, answer: data.bio_prompt_1_answer },
        { question: data.bio_prompt_2, answer: data.bio_prompt_2_answer },
        { question: data.bio_prompt_3, answer: data.bio_prompt_3_answer },
      ]);
    }
    setLoading(false);
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setTempQuestion(prompts[index].question || "");
    setTempAnswer(prompts[index].answer || "");
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setTempQuestion("");
    setTempAnswer("");
  };

  const savePrompt = async (index: number) => {
    if (!tempQuestion || !tempAnswer.trim()) {
      toast({ title: "Please select a prompt and write your answer", variant: "destructive" });
      return;
    }

    const updateData: Record<string, string | null> = {};
    updateData[`bio_prompt_${index + 1}`] = tempQuestion;
    updateData[`bio_prompt_${index + 1}_answer`] = tempAnswer.trim();

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Failed to save", variant: "destructive" });
      return;
    }

    const newPrompts = [...prompts];
    newPrompts[index] = { question: tempQuestion, answer: tempAnswer.trim() };
    setPrompts(newPrompts);
    setEditingIndex(null);
    toast({ title: "Prompt saved ✨" });
    await onSaved?.();
  };

  if (loading) return null;

  const hasAnyPrompt = prompts.some((p) => p.question && p.answer);
  if (!editable && !hasAnyPrompt) return null;

  return (
    <div className="space-y-3">
      {prompts.map((prompt, index) => (
        <AnimatePresence key={index} mode="wait">
          {editingIndex === index ? (
            <motion.div
              key="editing"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              <Card className="bg-card/70 backdrop-blur-sm border-primary/30">
                <CardContent className="p-4 space-y-3">
                  <Select value={tempQuestion} onValueChange={setTempQuestion}>
                    <SelectTrigger className="bg-muted/30 border-border/50">
                      <SelectValue placeholder="Choose a prompt or 'About me...' for free text" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROMPT_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={tempAnswer}
                    onChange={(e) => setTempAnswer(e.target.value)}
                    placeholder={tempQuestion === FREE_TEXT_PROMPT ? "Tell others about yourself in your own words..." : "Write your answer..."}
                    className="bg-muted/30 border-border/50 resize-none"
                    rows={3}
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{tempAnswer.length}/500</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={cancelEditing}><X className="w-4 h-4" /></Button>
                      <Button size="sm" onClick={() => savePrompt(index)} className="bg-primary/20 text-primary hover:bg-primary/30"><Check className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : prompt.question && prompt.answer ? (
            <motion.div
              key="display"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 backdrop-blur-sm border border-primary/25 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40 transition-all duration-200 group">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                    <MessageSquareQuote className="w-3 h-3" />
                    {prompt.question}
                  </p>
                  <p className="text-sm text-foreground/95 leading-relaxed">{prompt.answer}</p>
                  {editable && (
                    <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => startEditing(index)}>
                      <Edit className="w-3 h-3 mr-1" /> Edit
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : editable ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <button
                onClick={() => startEditing(index)}
                className="w-full p-4 rounded-xl border-2 border-dashed border-border/40 hover:border-primary/40 text-muted-foreground hover:text-primary transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Add a prompt
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      ))}
    </div>
  );
};

export default BioPrompts;
