import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";

const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);

    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <>
      {isVisible && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full bg-primary/90 backdrop-blur-sm hover:bg-primary shadow-2xl hover:shadow-primary/25 transition-all duration-300 animate-bounce-in cursor-pointer group"
          size="icon"
        >
          <ChevronUp className="h-5 w-5 text-white transition-transform group-hover:scale-110 group-hover:-translate-y-0.5" />
        </Button>
      )}
    </>
  );
};

export default BackToTop;