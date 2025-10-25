import { Link } from "react-router-dom";
import { Button } from "@company-web/shared/ui";
import { ArrowRight, Play } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-32 lg:pt-28">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 grid-pattern opacity-30 animate-pulse" />
      
      {/* Dynamic Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-surface to-surface/50" />
      
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-accent/10 rounded-full animate-float-medium" />
        <div className="absolute top-1/3 right-1/3 w-48 h-48 bg-gradient-primary opacity-5 rounded-full animate-float-fast" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight animate-hero-title mb-6">
            <span className="block text-foreground">We Build</span>
            <span className="block bg-gradient-primary bg-clip-text text-transparent animate-hero-gradient mt-2">
              Exceptional
            </span>
            <span className="block mt-2 text-foreground">
              Digital Experiences
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto animate-hero-subtitle leading-relaxed px-4 mt-6">
          Helping Businesses Scale with Innovative IT & Digital Solutions.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 animate-hero-buttons mt-8 px-4">
            <Link to="/contact" className="w-full sm:w-auto">
              <Button className="btn-hero text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto transform hover:scale-105 transition-all duration-300 hover:shadow-glow">
                Start Your Project
                <ArrowRight className="ml-2 h-4 sm:h-5 w-4 sm:w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            
            <Link to="/showcase" className="w-full sm:w-auto">
              <Button variant="ghost" className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto btn-ghost transform hover:scale-105 transition-all duration-300">
                <Play className="mr-2 h-4 sm:h-5 w-4 sm:w-5 transition-transform group-hover:scale-110" />
                View Showcase
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 sm:gap-4 animate-hero-stats mt-12">
            <div className="text-center transform hover:scale-110 transition-all duration-300 cursor-pointer">
              <div className="text-3xl md:text-4xl font-bold text-primary animate-counter">30+</div>
              <div className="text-muted-foreground text-sm md:text-base">Projects Delivered</div>
            </div>
            <div className="text-center transform hover:scale-110 transition-all duration-300 cursor-pointer">
              <div className="text-3xl md:text-4xl font-bold text-primary animate-counter">98%</div>
              <div className="text-muted-foreground text-sm md:text-base">Client Satisfaction</div>
            </div>
            <div className="text-center transform hover:scale-110 transition-all duration-300 cursor-pointer">
              <div className="text-3xl md:text-4xl font-bold text-primary animate-counter">5+</div>
              <div className="text-muted-foreground text-sm md:text-base">Years Experience</div>
            </div>
          </div>
        </div>
      </div>


    </section>
  );
};

export { Hero };
export default Hero;