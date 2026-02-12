import { BookOpen, Download, Lightbulb, List, MessageSquareQuote, FileText, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { generatePDF } from "@/lib/pdfGenerator";
import { useState } from "react";

export interface StudyNotes {
  title: string;
  summary: string;
  keyPoints: string[];
  definitions: { term: string; definition: string }[];
  notes: string[];
  quizQuestions: { question: string; options: string[]; answer: string }[];
}

interface NotesPreviewProps {
  notes: StudyNotes;
  videoUrl: string;
}

const SectionCard = ({
  icon: Icon,
  title,
  iconColor,
  children,
  delay = 0,
}: {
  icon: any;
  title: string;
  iconColor: string;
  children: React.ReactNode;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="glass-card card-shine p-7"
  >
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-10 h-10 rounded-xl ${iconColor} flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-display font-bold text-lg tracking-tight">{title}</h3>
    </div>
    {children}
  </motion.div>
);

const NotesPreview = ({ notes, videoUrl }: NotesPreviewProps) => {
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());

  const handleDownload = () => {
    generatePDF(notes, videoUrl);
  };

  const toggleAnswer = (index: number) => {
    setRevealedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
          {notes.title}
        </h2>
        <Button
          onClick={handleDownload}
          className="gradient-bg text-primary-foreground border-0 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform shrink-0"
        >
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* Summary */}
      <SectionCard icon={FileText} title="Summary" iconColor="bg-primary/10 text-primary" delay={0.05}>
        <p className="text-muted-foreground leading-relaxed">{notes.summary}</p>
      </SectionCard>

      {/* Key Points */}
      <SectionCard icon={List} title="Key Points" iconColor="bg-secondary/10 text-secondary" delay={0.1}>
        <ul className="space-y-3">
          {notes.keyPoints.map((point, i) => (
            <li key={i} className="flex items-start gap-3 text-muted-foreground">
              <span className="w-6 h-6 rounded-lg bg-secondary/10 text-secondary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="leading-relaxed">{point}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Study Notes */}
      <SectionCard icon={BookOpen} title="Study Notes" iconColor="bg-primary/10 text-primary" delay={0.15}>
        <ul className="space-y-3">
          {notes.notes.map((note, i) => (
            <li key={i} className="flex items-start gap-3 text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2.5 shrink-0" />
              <span className="leading-relaxed">{note}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Definitions */}
      {notes.definitions.length > 0 && (
        <SectionCard icon={Lightbulb} title="Key Definitions" iconColor="bg-accent/10 text-accent" delay={0.2}>
          <div className="space-y-3">
            {notes.definitions.map((def, i) => (
              <div key={i} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <span className="font-bold text-foreground">{def.term}</span>
                <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{def.definition}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Quiz */}
      {notes.quizQuestions.length > 0 && (
        <SectionCard icon={MessageSquareQuote} title="Quiz Questions" iconColor="bg-secondary/10 text-secondary" delay={0.25}>
          <div className="space-y-5">
            {notes.quizQuestions.map((q, i) => (
              <div key={i} className="p-5 rounded-xl bg-muted/30 border border-border/50">
                <p className="font-semibold mb-3">
                  <span className="text-primary font-mono text-sm mr-2">Q{i + 1}.</span>
                  {q.question}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {q.options.map((opt, j) => (
                    <div
                      key={j}
                      className={`text-sm px-4 py-2.5 rounded-xl border transition-colors ${
                        revealedAnswers.has(i) && opt === q.answer
                          ? "border-primary/50 bg-primary/10 text-primary font-medium"
                          : "border-border/50 text-muted-foreground"
                      }`}
                    >
                      <span className="font-mono text-xs mr-2 opacity-50">{String.fromCharCode(65 + j)}.</span>
                      {opt}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => toggleAnswer(i)}
                  className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
                >
                  {revealedAnswers.has(i) ? "Hide Answer" : "Show Answer"}
                  <ChevronDown className={`w-3 h-3 transition-transform ${revealedAnswers.has(i) ? "rotate-180" : ""}`} />
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <div className="flex justify-center pt-6 pb-4">
        <Button
          onClick={handleDownload}
          size="lg"
          className="gradient-bg text-primary-foreground border-0 rounded-2xl font-bold px-10 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
        >
          <Download className="w-5 h-5 mr-2" />
          Download Complete PDF
        </Button>
      </div>
    </motion.div>
  );
};

export default NotesPreview;
