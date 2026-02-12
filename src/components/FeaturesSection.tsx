import { Brain, Download, FileText, Lightbulb, MessageSquareQuote, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Notes",
    description: "Advanced AI analyzes lecture content and generates clean, structured study notes automatically.",
  },
  {
    icon: Lightbulb,
    title: "Key Definitions",
    description: "Extracts and highlights important terms and definitions for quick reference.",
  },
  {
    icon: FileText,
    title: "Smart Summaries",
    description: "Get concise summaries of long lectures, perfect for quick review sessions.",
  },
  {
    icon: MessageSquareQuote,
    title: "Quiz Questions",
    description: "Auto-generated quiz questions to test your understanding of the material.",
  },
  {
    icon: Download,
    title: "PDF Export",
    description: "Download beautifully formatted PDF notes that are printer-friendly and easy to share.",
  },
  {
    icon: BookOpen,
    title: "Any Subject",
    description: "Works with any YouTube educational content — from science to history to programming.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
      <div className="container relative mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-3xl md:text-4xl font-extrabold mb-4 tracking-tight text-foreground"
          >
            Everything You Need to{" "}
            <span className="gradient-text">Study Smarter</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-base"
          >
            Paste a YouTube link and let AI do the heavy lifting. Focus on learning, not note-taking.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="glass-card p-6 group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-bold text-base mb-1.5 text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
