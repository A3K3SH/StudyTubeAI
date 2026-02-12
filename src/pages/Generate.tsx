import { useState, useEffect } from "react";
import { ArrowRight, Loader2, AlertCircle, Youtube, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NotesPreview, { type StudyNotes } from "@/components/NotesPreview";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { auth } from "@/integrations/firebase/client";

const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[\w-]+/;

const Generate = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<StudyNotes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notesRemaining, setNotesRemaining] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<'free' | 'pro' | 'team'>('free');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
        // Fetch user tier from Firestore
        const fetchUserTier = async () => {
          try {
            const { getDoc, doc } = await import('firebase/firestore');
            const { db } = await import('@/integrations/firebase/client');
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              setUserTier((userDoc.data().tier as any) || 'free');
            }
          } catch (error) {
            console.log('Could not fetch user tier:', error);
          }
        };
        fetchUserTier();
      } else {
        setUserId(null);
        setUserTier('free');
        setNotesRemaining(null);
      }
    });
    return unsubscribe;
  }, []);

  const handleGenerate = async () => {
    if (!url.trim()) {
      setError("Please enter a YouTube URL.");
      return;
    }
    if (!YOUTUBE_REGEX.test(url.trim())) {
      setError("Please enter a valid YouTube video URL.");
      return;
    }

    setError(null);
    setLoading(true);
    setNotes(null);

    try {
      // Call backend API
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/api/generate-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim(), userId: userId }),
      });

      // Update remaining notes from response header
      const remaining = response.headers.get('X-Notes-Remaining');
      if (remaining !== null) {
        if (remaining === 'unlimited') {
          setNotesRemaining(null); // null means unlimited
        } else {
          setNotesRemaining(parseInt(remaining));
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate notes');
      }

      const data = await response.json();
      
      if (!data?.notes) {
        throw new Error('No notes were generated. Please try again.');
      }

      setNotes(data.notes);
      toast.success("Notes generated successfully!");
    } catch (err: any) {
      const msg = err?.message || "Failed to generate notes. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              Generate Notes
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
              Generate <span className="gradient-text">Study Notes</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Paste a YouTube lecture URL below and let AI create your study material.
            </p>
          </motion.div>

          {/* Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 md:p-8 mb-10"
          >
            {notesRemaining !== null && userTier === 'free' && (
              <div className="mb-4 flex items-center gap-2 text-sm bg-primary/10 text-primary px-3 py-2 rounded-lg w-fit">
                <Zap className="w-4 h-4" />
                <span className="font-medium">{notesRemaining} of 1 note remaining today</span>
              </div>
            )}
            {userTier !== 'free' && (
              <div className="mb-4 flex items-center gap-2 text-sm bg-green-500/10 text-green-600 px-3 py-2 rounded-lg w-fit">
                <Zap className="w-4 h-4" />
                <span className="font-medium">Unlimited notes • {userTier.charAt(0).toUpperCase() + userTier.slice(1)} tier</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-destructive" />
                <Input
                  placeholder="https://youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  className="pl-12 h-14 text-base bg-card border-border rounded-xl font-mono text-sm"
                  disabled={loading}
                />
              </div>
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="gradient-bg text-primary-foreground border-0 h-14 px-8 font-semibold shrink-0 rounded-xl shadow-sm hover:shadow-md transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 mt-4 text-destructive text-sm bg-destructive/10 px-4 py-3 rounded-xl"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Loading State */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card p-16 text-center"
              >
                <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
                </div>
                <h3 className="font-display font-bold text-xl mb-3">
                  Generating Your Notes...
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  Fetching transcript and analyzing content. This may take 30–60 seconds.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notes */}
          {notes && !loading && <NotesPreview notes={notes} videoUrl={url} />}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Generate;
