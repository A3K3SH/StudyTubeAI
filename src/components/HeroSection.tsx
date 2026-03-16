import { Link } from "react-router-dom";
import { ArrowRight, Play, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-background">
      <div className="absolute inset-0 mesh-gradient" />

      <div className="container relative mx-auto px-4 py-28 md:py-36">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6"
            >
              <span className="text-foreground">Turn Any YouTube Lecture Into </span>
              <span className="gradient-text">Exam-Ready Notes</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-base md:text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed"
            >
              Paste any YouTube lecture URL and get beautifully-structured study notes, key definitions, summaries, and quiz questions — powered by AI.
            </motion.p>

            {/* Inline URL input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-5"
            >
              <Link to="/generate" className="block">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2 p-2 sm:pl-5 rounded-2xl sm:rounded-full bg-card border border-border shadow-sm max-w-lg hover:shadow-md transition-shadow">
                  <span className="text-muted-foreground/50 text-sm flex-1 truncate font-mono px-3 sm:px-0 py-2 sm:py-0">
                    https://youtube.com/watch?v=...
                  </span>
                  <Button
                    size="sm"
                    className="gradient-bg text-primary-foreground border-0 shrink-0 rounded-full font-semibold px-5 py-5 w-full sm:w-auto"
                  >
                    Generate My Study Notes
                    <ArrowRight className="ml-1.5 w-4 h-4" />
                  </Button>
                </div>
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-sm text-muted-foreground"
            >
              Free · No signup required · 30-sec results
            </motion.p>
          </div>

          {/* Right - floating notes mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            {/* Main notes card */}
            <div className="notes-card p-6 max-w-sm ml-auto mr-8 rotate-[-2deg]">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-display font-bold text-lg text-foreground">Photosynthesis Explained</h3>
              </div>
              <div className="mb-4">
                <h4 className="font-semibold text-sm text-foreground mb-2">Summary</h4>
                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                  <li>Photosynthesis is the process used by plants to convert light energy into chemical energy.</li>
                  <li>Chloroplast in the cells provide a structure for light and carbon reactions.</li>
                  <li>The process includes the light-dependent and light-independent stages.</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground mb-2">Key Points</h4>
                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                  <li>Sunlight provides energy for photosynthesis reactions.</li>
                  <li>CO₂ and water are the primary ingredients.</li>
                </ul>
              </div>
            </div>

            {/* Floating download button */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-4 -right-2"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                <Download className="w-6 h-6 text-primary-foreground" />
              </div>
            </motion.div>

            {/* Small floating card */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-6 -left-4"
            >
              <div className="notes-card p-4 max-w-[200px] rotate-[3deg]">
                <div className="flex items-center gap-1.5 mb-2">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-foreground">Photosynthesis Explained</span>
                </div>
                <div className="mb-2">
                  <span className="text-[10px] font-semibold text-foreground">Summary</span>
                  <div className="space-y-1 mt-1">
                    <div className="h-1.5 bg-muted rounded-full w-full" />
                    <div className="h-1.5 bg-muted rounded-full w-4/5" />
                    <div className="h-1.5 bg-muted rounded-full w-3/4" />
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-accent">1 Quiz</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
