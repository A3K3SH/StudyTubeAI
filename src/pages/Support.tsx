import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Mail, ChevronDown, ChevronUp, Zap, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const faqs = [
  {
    q: "How many notes can I generate per plan?",
    a: "Free plan: 1 note per day (resets at midnight UTC). Pro plan: Unlimited note generation (₹299/month). Team plan: Unlimited for up to 10 users (₹999/month). Upgrade anytime on the Pricing page.",
  },
  {
    q: "What types of YouTube videos work best?",
    a: "Any video with spoken content works — lectures, tutorials, podcasts, documentaries. Videos with auto-generated or manual captions produce the fastest results. For videos without captions, audio transcription is used automatically.",
  },
  {
    q: "How do I upgrade to Pro or Team?",
    a: "Go to the Pricing page and click on your desired plan. Complete the payment via Razorpay (Pro ₹299/month or Team ₹999/month). Your account is upgraded instantly after payment verification.",
  },
  {
    q: "My payment went through but I'm still on the free plan. What do I do?",
    a: "This can happen if the browser closed before payment confirmation reached our server. Please contact us with your Razorpay payment ID and email — we'll manually upgrade your account within a few hours.",
  },
  {
    q: "Can I download the generated notes?",
    a: "Yes. After notes are generated you can download them as a PDF directly from the Generate page. Works on all plans.",
  },
  {
    q: "Which languages are supported?",
    a: "Notes are generated in English. Video transcription supports 50+ spoken languages — the AI will summarise the content in English regardless of the video's language.",
  },
  {
    q: "Is my data private?",
    a: "We never store the video content or the generated notes on our servers beyond the time needed to produce them. Your account data (email, tier) is stored securely in Firebase. All plans have the same privacy protection.",
  },
  {
    q: "Can I cancel my Pro or Team subscription?",
    a: "Yes. Email us at the address below with your account email and we'll process the cancellation immediately. We offer a no-questions-asked refund within 7 days of your first purchase.",
  },
];

const FaqItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border border-border rounded-xl overflow-hidden"
      onClick={() => setOpen(!open)}
    >
      <button className="w-full flex items-center justify-between px-5 py-4 text-left gap-4 hover:bg-muted/40 transition-colors">
        <span className="font-medium text-foreground">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
          {a}
        </div>
      )}
    </div>
  );
};

const Support = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setSending(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
      const res = await fetch(`${backendUrl}/api/support/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Server error");
      setSent(true);
      toast.success("Message sent! We'll reply within 24 hours.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      // Fallback: open mail client
      const mailto = `mailto:aakashswain18@gmail.com?subject=${encodeURIComponent(
        form.subject || "Support Request"
      )}&body=${encodeURIComponent(
        `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`
      )}`;
      window.location.href = mailto;
      toast.info("Opening your mail client as a fallback.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-14 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-5">
            <MessageCircle className="w-4 h-4" />
            Support Center
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            How can we help?
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Browse the FAQ or send us a message — we typically reply within 24 hours.
          </p>
        </motion.div>
      </section>

      {/* Quick links */}
      <section className="pb-14 px-4">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="mailto:aakashswain18@gmail.com"
            className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">Email Support</p>
              <p className="text-sm text-muted-foreground">aakashswain18@gmail.com</p>
            </div>
          </a>
          <a
            href="/pricing"
            className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">Upgrade Plan</p>
              <p className="text-sm text-muted-foreground">Get unlimited note generation</p>
            </div>
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-display font-bold text-foreground mb-6">
            Frequently Asked Questions
          </h2>
          <div className="flex flex-col gap-3">
            {faqs.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Contact form */}
      <section className="pb-24 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-8">
            {sent ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Message received!</h3>
                <p className="text-muted-foreground">We'll get back to you at {form.email || "your email"} within 24 hours.</p>
                <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>
                  Send another message
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                  Contact Us
                </h2>
                <p className="text-muted-foreground mb-6 text-sm">
                  Can't find your answer above? Fill in the form and we'll respond within 24 hours.
                </p>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        Name <span className="text-destructive">*</span>
                      </label>
                      <Input
                        placeholder="Your name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        Email <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Subject
                    </label>
                    <Input
                      placeholder="e.g. Payment issue, Feature request…"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Message <span className="text-destructive">*</span>
                    </label>
                    <Textarea
                      placeholder="Describe your issue or question in detail…"
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={sending}>
                    {sending ? "Sending…" : "Send Message"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Support;
