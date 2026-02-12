import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { auth } from "@/integrations/firebase";
import { onAuthStateChanged } from "firebase/auth";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Bring maximum traffic and build trust.",
    features: [
      "1 note generation per day",
      "Basic AI summary & key points",
      "PDF download",
    ],
    cta: "Get Started",
    popular: false,
    valueLine: "",
  },
  {
    name: "Pro",
    price: "$2.99",
    period: "/month",
    description: "Cheaper than ChatGPT Plus — built for students.",
    features: [
      "Unlimited note generation",
      "Advanced AI notes + quiz questions",
      "Faster processing",
      "Study history saved",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    popular: true,
    valueLine: "Save 5+ hours of study time every week.",
  },
  {
    name: "Team",
    price: "$9.99",
    period: "/month",
    description: "For study groups, small classes & educators.",
    features: [
      "Up to 10 users",
      "Shared notes library",
      "Collaboration tools",
      "Analytics dashboard",
      "Everything in Pro",
    ],
    cta: "Contact Sales",
    popular: false,
    valueLine: "",
  },
];

const Pricing = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  const handleCta = (planName: string) => {
    if (planName === "Free") {
      navigate(isLoggedIn ? "/generate" : "/auth");
    } else {
      navigate(isLoggedIn ? "/generate" : "/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
            >
              Pricing
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-display text-4xl md:text-5xl font-extrabold mb-5 tracking-tight"
            >
              Simple, Transparent{" "}
              <span className="gradient-text">Pricing</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-muted-foreground text-lg"
            >
              Start free and upgrade when you need more power.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`glass-card p-8 relative ${
                  plan.popular
                    ? "border-primary/30 ring-1 ring-primary/10"
                    : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full gradient-bg text-primary-foreground text-xs font-bold flex items-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3 h-3" />
                    Most Popular
                  </div>
                )}
                <h3 className="font-display font-bold text-xl mb-1 tracking-tight">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="font-display text-5xl font-extrabold tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {plan.period}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm mb-8">
                  {plan.description}
                </p>
                <ul className="space-y-3.5 mb-8">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-3 text-sm"
                    >
                      <div className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                {plan.valueLine && (
                  <p className="text-xs text-primary font-medium mb-4 italic">
                    {plan.valueLine}
                  </p>
                )}
                <Button
                    onClick={() => handleCta(plan.name)}
                    className={`w-full font-semibold rounded-xl ${
                      plan.popular
                        ? "gradient-bg text-primary-foreground border-0 shadow-sm"
                        : "bg-muted hover:bg-muted/80 text-foreground border-border"
                    }`}
                  >
                    {plan.cta}
                  </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
