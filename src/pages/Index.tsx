import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const Index = () => {
  return (
    <div className="min-h-screen bg-background scroll-smooth">
      <Navbar />
      <HeroSection />
      <section id="how-it-works">
        <HowItWorks />
      </section>
      <section id="features">
        <FeaturesSection />
      </section>

      {/* CTA */}
      <section id="cta" className="py-24 bg-background relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="container relative mx-auto px-4 text-center"
        >
          <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-foreground">
            Ready to Study{" "}
            <span className="gradient-text">Smarter</span>?
          </h2>
          <p className="text-muted-foreground text-base mb-8 max-w-md mx-auto">
            Join thousands of students who save hours every week with AI-generated study notes.
          </p>
          <Link to="/generate">
            <Button
              size="lg"
              className="gradient-bg text-primary-foreground border-0 text-base px-8 py-6 font-semibold rounded-full glow-primary hover:shadow-lg transition-shadow"
            >
              Start Generating Notes
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
