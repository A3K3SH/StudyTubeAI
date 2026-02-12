import { motion } from "framer-motion";
import { Link2, Cpu, FileDown, ChevronRight } from "lucide-react";

const steps = [
  {
    icon: Link2,
    step: "01",
    title: "Paste YouTube Link",
    description: "Copy any YouTube lecture URL and paste it into StudyTube AI.",
    mockup: (
      <div className="notes-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded bg-destructive/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-destructive" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/></svg>
          </div>
          <span className="text-xs font-semibold text-foreground">YouTube</span>
        </div>
        <div className="bg-muted rounded-lg p-2">
          <span className="text-[11px] text-muted-foreground font-mono">youtube.com/watch?v=abc123</span>
        </div>
      </div>
    ),
  },
  {
    icon: Cpu,
    step: "02",
    title: "AI Generates Notes",
    description: "Our AI fetches the transcript, analyzes content, and creates structured notes.",
    mockup: (
      <div className="notes-card p-4">
        <div className="space-y-2">
          <div className="h-2 bg-primary/20 rounded-full w-full" />
          <div className="h-2 bg-primary/15 rounded-full w-4/5" />
          <div className="h-2 bg-primary/10 rounded-full w-3/5" />
          <div className="h-2 bg-primary/20 rounded-full w-full mt-3" />
          <div className="h-2 bg-primary/15 rounded-full w-2/3" />
        </div>
      </div>
    ),
  },
  {
    icon: FileDown,
    step: "03",
    title: "Download & Study",
    description: "Preview your notes online or download a beautifully formatted study PDF.",
    mockup: (
      <div className="notes-card p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-4 h-4 rounded bg-primary/10 flex items-center justify-center">
            <FileDown className="w-2.5 h-2.5 text-primary" />
          </div>
          <span className="text-[11px] font-bold gradient-text">Photosynthesis Explained</span>
        </div>
        <div className="space-y-1.5 mb-2">
          <span className="text-[10px] font-semibold text-foreground">Summary</span>
          <div className="h-1.5 bg-muted rounded-full w-full" />
          <div className="h-1.5 bg-muted rounded-full w-4/5" />
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <FileDown className="w-3 h-3" />
          Study Notes PDF
        </div>
      </div>
    ),
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="container relative mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-3xl md:text-4xl font-extrabold mb-4 tracking-tight text-foreground"
          >
            See It In Action
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-base"
          >
            From video lecture to study guide, in seconds.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto items-start">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="relative flex flex-col items-center"
            >
              <div className="w-full mb-4">
                {step.mockup}
              </div>

              {/* Arrow between steps */}
              {i < steps.length - 1 && (
                <div className="hidden md:flex absolute top-1/3 -right-6 z-10">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              )}

              <h3 className="font-display font-bold text-base text-foreground mb-1 text-center">
                {step.title}
              </h3>
              <p className="text-muted-foreground text-sm text-center max-w-xs">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
