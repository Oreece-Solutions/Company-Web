import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ArrowRight, Phone, ChevronRight } from "lucide-react";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Work", href: "/work" },
    { name: "About", href: "/about" },
    { name: "Services", href: "/services" },
    { name: "Careers", href: "/careers" },
    { name: "Contact", href: "/contact" },
  ];

  const isShowcase = location.pathname === "/showcase";

  return (
    <>
      {/* Desktop Boxed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 lg:px-8 pt-4 hidden lg:block">
        <div className={`max-w-7xl mx-auto rounded-2xl transition-all duration-500 ${
          isScrolled 
            ? 'bg-background/95 backdrop-blur-2xl border border-border/50 shadow-2xl shadow-primary/5' 
            : 'bg-background/90 backdrop-blur-xl border border-border/20 shadow-xl shadow-primary/3'
        }`}>
          <div className="flex items-center justify-between h-20 px-8">
            {/* Modern Logo */}
            <Link to="/" className="relative group">
              <div className="text-2xl font-bold bg-gradient-to-r from-primary to-brand-red-dark bg-clip-text text-transparent transition-all duration-300 group-hover:scale-105">
                Oreece
              </div>
              <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-brand-red-dark transition-all duration-300 group-hover:w-full"></div>
            </Link>

            {/* Modern Pill-Shaped Desktop Navigation */}
            <div className="flex items-center bg-white/95 backdrop-blur-xl rounded-full px-6 py-3 shadow-2xl shadow-primary/10 border border-white/20">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`relative px-5 py-2.5 rounded-full font-medium transition-all duration-300 group transform ${
                    location.pathname === item.href
                      ? "text-white bg-gradient-to-r from-primary to-brand-red-dark shadow-lg scale-105"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 hover:scale-105 active:scale-95"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Modern Desktop Actions */}
            <div className="flex items-center space-x-3">
              {!isShowcase && (
                <Link to="/showcase">
                  <Button variant="ghost" size="sm" className="font-medium rounded-2xl hover:bg-surface/50 transition-all duration-300 group border border-transparent hover:border-border/20">
                    Showcase
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              )}
              <Link to="/contact">
                <Button className="btn-hero rounded-2xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300">
                  <Phone className="h-4 w-4" />
                  Book a Call
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className={`lg:hidden fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-background/95 backdrop-blur-2xl border-b border-border/50 shadow-lg' 
          : 'bg-background/90 backdrop-blur-xl'
      }`}>
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Modern Logo */}
            <Link to="/" className="relative group">
              <div className="text-2xl font-bold bg-gradient-to-r from-primary to-brand-red-dark bg-clip-text text-transparent transition-all duration-300 group-hover:scale-105">
                Oreece
              </div>
              <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-brand-red-dark transition-all duration-300 group-hover:w-full"></div>
            </Link>

            {/* Mobile menu button */}
            <button
              className="relative p-3 rounded-2xl hover:bg-surface/50 transition-all duration-300 border border-transparent hover:border-border/20"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              <div className="relative w-6 h-6">
                <Menu className={`absolute inset-0 w-6 h-6 transition-all duration-300 ${isOpen ? 'opacity-0 rotate-180' : 'opacity-100 rotate-0'}`} />
                <X className={`absolute inset-0 w-6 h-6 transition-all duration-300 ${isOpen ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-180'}`} />
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Popup - Only on Mobile */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div 
            className="absolute top-20 right-4 left-4 bg-background/95 backdrop-blur-2xl border border-border/20 rounded-3xl overflow-hidden shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border/10">
                <div className="text-lg font-semibold text-foreground">Menu</div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl hover:bg-surface/50 transition-all duration-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Items */}
              <div className="p-6 space-y-2">
                {navItems.map((item, index) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center justify-between p-4 rounded-2xl font-medium transition-all duration-300 group animate-fade-in transform ${
                      location.pathname === item.href
                        ? "text-primary bg-primary/10 shadow-sm scale-105"
                        : "text-foreground/80 hover:text-foreground hover:bg-surface/50 hover:scale-105 active:scale-95"
                    }`}
                    onClick={() => setIsOpen(false)}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <span>{item.name}</span>
                    <ChevronRight className={`h-5 w-5 transition-all duration-300 ${
                      location.pathname === item.href ? 'text-primary' : 'text-foreground/40 group-hover:text-foreground/60'
                    } group-hover:translate-x-1`} />
                  </Link>
                ))}
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-border/10 space-y-3">
                {!isShowcase && (
                  <Link to="/showcase" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full justify-between rounded-2xl h-14 font-medium group hover:bg-surface/50">
                      <span>Showcase</span>
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                )}
                <Link to="/contact" onClick={() => setIsOpen(false)}>
                  <Button className="btn-hero w-full rounded-2xl h-14 flex items-center justify-center gap-3 font-semibold">
                    <Phone className="h-5 w-5" />
                    Book a Call
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;