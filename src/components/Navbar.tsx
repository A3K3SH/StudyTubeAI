import { Link, useLocation, useNavigate } from "react-router-dom";
import { Zap, Menu, X, Moon, Sun, LogOut, User } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { auth } from "@/integrations/firebase";
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark";
    }
    return false;
  });
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  const scrollToSection = (sectionId: string) => {
    setMobileOpen(false);
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navItems = [
    { label: "Home", action: () => { setMobileOpen(false); navigate("/"); window.scrollTo({ top: 0, behavior: "smooth" }); } },
    { label: "How It Works", action: () => scrollToSection("how-it-works") },
    { label: "Features", action: () => scrollToSection("features") },
    { label: "Pricing", action: () => { setMobileOpen(false); navigate("/pricing"); } },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-card/90 backdrop-blur-lg border-b border-border shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <span className="font-display font-bold text-lg text-foreground">
            StudyTube AI
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="text-sm font-medium px-4 py-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </button>
          ))}

          <button
            onClick={() => setDark(!dark)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-1"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user ? (
            <div className="flex items-center gap-2 ml-2">
              <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                {user.displayName || user.email}
              </span>
              <button
                onClick={async () => { await signOut(auth); }}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link to="/auth" className="ml-2">
              <Button size="sm" className="gradient-bg text-primary-foreground border-0 font-semibold rounded-full shadow-sm hover:shadow-md transition-all">
                Get Started
              </Button>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => setDark(!dark)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-border bg-card/95 backdrop-blur-lg"
          >
            <div className="flex flex-col gap-1 p-4">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="text-sm font-medium py-3 px-4 rounded-lg transition-colors text-muted-foreground hover:text-foreground text-left"
                >
                  {item.label}
                </button>
              ))}
              {user ? (
                <Button
                  variant="outline"
                  className="w-full mt-2 rounded-full"
                  onClick={async () => { await signOut(auth); setMobileOpen(false); }}
                >
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </Button>
              ) : (
                <Link to="/auth" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full gradient-bg text-primary-foreground border-0 mt-2 rounded-full">
                    Get Started
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
