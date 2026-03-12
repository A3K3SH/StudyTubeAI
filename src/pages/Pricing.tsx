import { Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { auth, db } from "@/integrations/firebase/client";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";

type UserTier = "free" | "pro" | "team";
type PaidPlanId = "pro";

type RazorpayOrderResponse = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  plan: {
    tier: PaidPlanId;
    label: string;
    durationDays: number;
  };
  prefill: {
    email: string;
    name: string;
  };
};

type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    email?: string;
    name?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
};

type RazorpayCheckoutInstance = {
  open: () => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

const loadRazorpayCheckout = async () => {
  if (window.Razorpay) {
    return true;
  }

  const existingScript = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`) as HTMLScriptElement | null;
  if (existingScript) {
    return new Promise<boolean>((resolve) => {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
    });
  }

  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const plans = [
  {
    name: "Free",
    price: "₹0",
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
    price: "₹299",
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
    price: "Custom",
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
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userTier, setUserTier] = useState<UserTier>("free");
  const [processingPlan, setProcessingPlan] = useState<PaidPlanId | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (!user) {
        setUserTier("free");
        return;
      }

      try {
        const userSnapshot = await getDoc(doc(db, "users", user.uid));
        setUserTier((userSnapshot.data()?.tier as UserTier) || "free");
      } catch {
        setUserTier("free");
      }
    });

    return () => unsubscribe();
  }, []);

  const verifyPayment = async (plan: PaidPlanId, paymentResponse: RazorpaySuccessResponse) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
    const idToken = await auth.currentUser?.getIdToken();

    const response = await fetch(`${backendUrl}/api/payments/razorpay/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({
        plan,
        ...paymentResponse,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Payment verification failed.");
    }
  };

  const startProCheckout = async () => {
    if (!currentUser) {
      navigate("/auth?next=/pricing");
      return;
    }

    if (userTier === "pro" || userTier === "team") {
      navigate("/generate");
      return;
    }

    setProcessingPlan("pro");

    try {
      const scriptLoaded = await loadRazorpayCheckout();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Razorpay checkout could not be loaded. Please disable blockers and retry.");
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
      const idToken = await currentUser.getIdToken();
      const orderResponse = await fetch(`${backendUrl}/api/payments/razorpay/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ plan: "pro" }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to start Razorpay checkout.");
      }

      const orderData = (await orderResponse.json()) as RazorpayOrderResponse;
      const checkout = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: orderData.name,
        description: orderData.description,
        order_id: orderData.orderId,
        prefill: orderData.prefill,
        theme: {
          color: "#0f766e",
        },
        modal: {
          ondismiss: () => setProcessingPlan(null),
        },
        handler: async (paymentResponse) => {
          setProcessingPlan("pro");

          try {
            await verifyPayment("pro", paymentResponse);
            setUserTier("pro");
            toast.success("Pro plan activated. Unlimited notes are now enabled.");
            navigate("/generate");
          } catch (error: any) {
            toast.error(error?.message || "Payment succeeded but verification failed. Contact support if this continues.");
          } finally {
            setProcessingPlan(null);
          }
        },
      });

      setProcessingPlan(null);
      checkout.open();
    } catch (error: any) {
      setProcessingPlan(null);
      toast.error(error?.message || "Failed to start Razorpay checkout.");
    }
  };

  const handleCta = (planName: string) => {
    if (planName === "Free") {
      navigate(currentUser ? "/generate" : "/auth?next=/generate");
      return;
    }

    if (planName === "Team") {
      toast.info("Team billing is still handled manually. Use Pro for self-serve checkout right now.");
      return;
    }

    void startProCheckout();
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
            {currentUser && userTier !== "free" && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-sm text-primary mt-4 font-medium"
              >
                Your current plan is {userTier.charAt(0).toUpperCase() + userTier.slice(1)}.
              </motion.p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              (() => {
                const normalizedName = plan.name.toLowerCase() as UserTier;
                const isCurrentPlan = normalizedName === userTier || (userTier === "team" && plan.name === "Pro");
                const isLoading = processingPlan === "pro" && plan.name === "Pro";

                return (
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
                  disabled={isLoading || isCurrentPlan}
                  className={`w-full font-semibold rounded-xl ${
                    plan.popular
                      ? "gradient-bg text-primary-foreground border-0 shadow-sm"
                      : "bg-muted hover:bg-muted/80 text-foreground border-border"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Starting Checkout...
                    </>
                  ) : isCurrentPlan ? (
                    userTier === "team" && plan.name === "Pro" ? "Included in Team" : "Current Plan"
                  ) : (
                    plan.cta
                  )}
                </Button>
              </motion.div>
                );
              })()
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
