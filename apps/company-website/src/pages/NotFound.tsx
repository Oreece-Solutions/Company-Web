import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Navigation, BackToTop } from "@company-web/features";
import { Button } from "@company-web/shared/ui";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface/50 relative overflow-hidden">
      <Navigation />
      
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 grid-pattern opacity-20 animate-pulse" />
      
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-primary/3 rounded-full animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-accent/5 rounded-full animate-float-medium" />
        <div className="absolute top-1/2 right-1/6 w-64 h-64 bg-gradient-primary opacity-3 rounded-full animate-float-fast" />
      </div>
      
      <div className="flex min-h-screen items-center justify-center relative z-10">
        <div className="text-center max-w-lg mx-auto px-6">
          <div className="mb-8 animate-bounce-in">
            <div className="text-8xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              404
            </div>
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold mb-4 text-foreground animate-slide-up">
            Oops! Page Not Found
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed animate-slide-up animate-stagger-1">
            The page you're looking for doesn't exist or has been moved. 
            Don't worry, let's get you back on track.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up animate-stagger-2">
            <Link to="/">
              <Button className="btn-hero px-8 py-4 text-lg font-semibold">
                <Home className="mr-2 h-5 w-5" />
                Back to Home
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
              className="px-8 py-4 text-lg font-medium"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Go Back
            </Button>
          </div>
          
          <div className="mt-12 text-sm text-muted-foreground animate-fade-in animate-stagger-3">
            <p>Error Path: <code className="bg-surface px-2 py-1 rounded text-foreground">{location.pathname}</code></p>
          </div>
        </div>
      </div>
      
      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
};

export default NotFound;
