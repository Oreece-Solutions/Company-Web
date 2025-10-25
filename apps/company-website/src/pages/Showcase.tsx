import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Github, Play, ArrowLeft, ArrowRight, Calendar, Clock, Users, Star, TrendingUp } from "lucide-react";
import { Button, Badge, Card, CardContent } from "@company-web/shared/ui";
import { Navigation, BackToTop, AnimatedSection } from "@company-web/features";
import { useScrollAnimation } from "@company-web/shared/utils";

const showcaseProjects = [
  {
    id: "1",
    title: "EcoCommerce Platform",
    description: "A sustainable e-commerce platform that revolutionized online shopping with AI-powered recommendations and carbon-neutral delivery.",
    image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&h=800&fit=crop",
    category: "E-commerce",
    metrics: [
      { label: "Conversion Rate", value: "+45%" },
      { label: "Page Load Time", value: "0.8s" },
      { label: "User Satisfaction", value: "98%" }
    ],
    technologies: ["React", "Node.js", "AWS", "AI/ML", "TypeScript", "GraphQL"],
    gradient: "linear-gradient(135deg, #10b981, #3b82f6)"
  },
  {
    id: "2", 
    title: "HealthTech Dashboard",
    description: "Real-time patient monitoring system that transformed healthcare delivery with predictive analytics and seamless clinical workflows.",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=1200&h=800&fit=crop",
    category: "Healthcare",
    metrics: [
      { label: "Time Saved", value: "30%" },
      { label: "Patient Outcomes", value: "+25%" },
      { label: "Clinical Efficiency", value: "2.5x" }
    ],
    technologies: ["Next.js", "TypeScript", "PostgreSQL", "Real-time", "WebSocket", "Docker"],
    gradient: "linear-gradient(135deg, #3b82f6, #8b5cf6)"
  },
  {
    id: "3",
    title: "AI Content Platform", 
    description: "Machine learning-powered content creation platform that generates high-quality, personalized content at unprecedented scale.",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&h=800&fit=crop",
    category: "AI/ML",
    metrics: [
      { label: "Content Quality", value: "94%" },
      { label: "Generation Speed", value: "10x" },
      { label: "Cost Reduction", value: "80%" }
    ],
    technologies: ["Python", "TensorFlow", "React", "GPT-4", "Kubernetes", "Redis"],
    gradient: "linear-gradient(135deg, #8b5cf6, #ec4899)"
  },
  {
    id: "4",
    title: "Smart City Dashboard",
    description: "IoT-powered city management ecosystem that optimizes urban infrastructure and creates sustainable smart cities of the future.",
    image: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1f?w=1200&h=800&fit=crop",
    category: "Smart City",
    metrics: [
      { label: "Energy Saved", value: "25%" },
      { label: "Traffic Optimization", value: "+40%" },
      { label: "Citizen Satisfaction", value: "92%" }
    ],
    technologies: ["IoT", "React", "MongoDB", "Analytics", "MQTT", "Grafana"],
    gradient: "linear-gradient(135deg, #f97316, #ef4444)"
  }
];

const Showcase = () => {
  const [currentProject, setCurrentProject] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const nextProject = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentProject((prev) => (prev + 1) % showcaseProjects.length);
    setTimeout(() => setIsTransitioning(false), 600);
  };

  const prevProject = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentProject((prev) => (prev - 1 + showcaseProjects.length) % showcaseProjects.length);
    setTimeout(() => setIsTransitioning(false), 600);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextProject();
      if (e.key === "ArrowLeft") prevProject();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTransitioning]);

  const currentProjectData = showcaseProjects[currentProject];
  const { ref: showcaseRef, isVisible } = useScrollAnimation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-secondary">
      <Navigation />
      
      {/* Modern Showcase Layout */}
      <div className="pt-20">
        {/* Hero Section */}
        <AnimatedSection className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Dynamic Background */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
            style={{
              backgroundImage: `url(${currentProjectData.image})`,
              filter: 'brightness(0.2) blur(2px)',
            }}
          />
          
          {/* Gradient Overlay */}
          <div 
            className="absolute inset-0 opacity-90 transition-all duration-1000"
            style={{
              background: `${currentProjectData.gradient}, rgba(0,0,0,0.8)`
            }}
          />
          
          {/* Main Content Container */}
          <div className="relative z-10 container mx-auto px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              
              {/* Left Column - Project Info */}
              <div className="text-white space-y-8">
                <AnimatedSection animation="fadeLeft" delay={200}>
                  <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-6 transition-all duration-500 ${
                    isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                  }`} style={{
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    <Star className="w-4 h-4 mr-2" />
                    {currentProjectData.category}
                  </div>
                </AnimatedSection>

                <AnimatedSection animation="fadeLeft" delay={400}>
                  <h1 className={`text-4xl lg:text-6xl font-bold mb-6 leading-tight transition-all duration-500 ${
                    isTransitioning ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
                  }`}>
                    {currentProjectData.title}
                  </h1>
                </AnimatedSection>

                <AnimatedSection animation="fadeLeft" delay={600}>
                  <p className={`text-lg lg:text-xl text-white/90 mb-8 leading-relaxed transition-all duration-500 ${
                    isTransitioning ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
                  }`}>
                    {currentProjectData.description}
                  </p>
                </AnimatedSection>

                {/* Enhanced Metrics Grid */}
                <AnimatedSection animation="fadeLeft" delay={800}>
                  <div className={`grid grid-cols-2 lg:grid-cols-3 gap-6 mb-8 transition-all duration-500 ${
                    isTransitioning ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
                  }`}>
                    {currentProjectData.metrics.map((metric, index) => (
                      <Card key={index} className="bg-white/10 backdrop-blur-lg border-white/20 text-center p-4">
                        <CardContent className="p-0">
                          <div className="flex items-center justify-center mb-2">
                            {index === 0 && <TrendingUp className="w-5 h-5 text-white/70" />}
                            {index === 1 && <Users className="w-5 h-5 text-white/70" />}
                            {index === 2 && <Clock className="w-5 h-5 text-white/70" />}
                          </div>
                          <div className="text-2xl font-bold text-white">{metric.value}</div>
                          <div className="text-white/70 text-sm">{metric.label}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AnimatedSection>

                {/* Action Buttons */}
                <AnimatedSection animation="fadeLeft" delay={1000}>
                  <div className={`flex flex-wrap gap-4 transition-all duration-500 ${
                    isTransitioning ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
                  }`}>
                    <Button size="lg" className="bg-white text-black hover:bg-white/90 rounded-2xl px-8 py-4 font-semibold">
                      <ExternalLink className="mr-2 h-5 w-5" />
                      View Case Study
                    </Button>
                    <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-2xl px-8 py-4 font-semibold">
                      <Play className="mr-2 h-5 w-5" />
                      Live Demo
                    </Button>
                  </div>
                </AnimatedSection>
              </div>

              {/* Right Column - Project Visual */}
              <AnimatedSection animation="fadeRight" delay={600} className="relative">
                <div className="relative">
                  {/* Project Image */}
                  <div className={`relative rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 ${
                    isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                  }`}>
                    <img 
                      src={currentProjectData.image} 
                      alt={currentProjectData.title}
                      className="w-full h-[400px] lg:h-[500px] object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>

                  {/* Floating Tech Stack */}
                  <div className="absolute -bottom-6 left-6 right-6">
                    <Card className="bg-white/95 backdrop-blur-lg border-0 shadow-xl">
                      <CardContent className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {currentProjectData.technologies.slice(0, 6).map((tech, index) => (
                            <Badge key={index} variant="secondary" className="bg-surface text-foreground">
                              {tech}
                            </Badge>
                          ))}
                          {currentProjectData.technologies.length > 6 && (
                            <Badge variant="secondary" className="bg-surface text-foreground">
                              +{currentProjectData.technologies.length - 6} more
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </AnimatedSection>

        {/* Project Navigation Section */}
        <AnimatedSection className="py-16 bg-surface/50">
          <div className="container mx-auto px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-center mb-12">Explore More Projects</h2>
            
            {/* Project Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {showcaseProjects.map((project, index) => (
                <AnimatedSection key={index} delay={index * 100}>
                  <Card 
                    className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                      index === currentProject ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setCurrentProject(index)}
                  >
                    <CardContent className="p-0">
                      <div className="relative h-48 overflow-hidden rounded-t-lg">
                        <img 
                          src={project.image} 
                          alt={project.title}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <Badge 
                          className="absolute top-4 left-4 text-white border-0"
                          style={{ background: project.gradient }}
                        >
                          {project.category}
                        </Badge>
                      </div>
                      <div className="p-6">
                        <h3 className="font-semibold text-lg mb-2">{project.title}</h3>
                        <p className="text-muted-foreground text-sm line-clamp-2">
                          {project.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </AnimatedSection>
              ))}
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-center space-x-8">
              <Button
                onClick={prevProject}
                variant="outline"
                size="lg"
                className="rounded-full p-4"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              
              {/* Progress Indicators */}
              <div className="flex space-x-2">
                {showcaseProjects.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentProject(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentProject
                        ? 'bg-primary scale-125'
                        : 'bg-muted hover:bg-muted-foreground/50'
                    }`}
                  />
                ))}
              </div>
              
              <Button
                onClick={nextProject}
                variant="outline"
                size="lg"
                className="rounded-full p-4"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>

            {/* Keyboard Navigation Hint */}
            <div className="text-center mt-8">
              <div className="inline-flex items-center space-x-2 text-muted-foreground text-sm bg-surface rounded-full px-4 py-2">
                <ArrowLeft className="h-4 w-4" />
                <ArrowRight className="h-4 w-4" />
                <span>Use arrow keys for navigation</span>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Exit Section */}
        <div className="fixed top-24 right-6 z-50">
          <Button
            onClick={() => window.history.back()}
            variant="ghost"
            className="bg-background/80 backdrop-blur-lg border border-border/50 rounded-2xl"
          >
            Exit Showcase
          </Button>
        </div>
      </div>
      
      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
};

export default Showcase;