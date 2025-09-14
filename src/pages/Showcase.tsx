import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Play, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

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
    technologies: ["React", "Node.js", "AWS", "AI/ML"],
    color: "from-green-500 to-blue-600"
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
    technologies: ["Next.js", "TypeScript", "PostgreSQL", "Real-time"],
    color: "from-blue-500 to-purple-600"
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
    technologies: ["Python", "TensorFlow", "React", "GPT-4"],
    color: "from-purple-500 to-pink-600"
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
    technologies: ["IoT", "React", "MongoDB", "Analytics"],
    color: "from-orange-500 to-red-600"
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

  const project = showcaseProjects[currentProject];

  return (
    <div className="min-h-screen overflow-hidden">
      <Navigation />
      
      {/* Main Showcase Container */}
      <div className="relative h-screen flex">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img
            src={project.image}
            alt={project.title}
            className={`w-full h-full object-cover transition-all duration-1000 ${
              isTransitioning ? "scale-110 blur-sm" : "scale-100 blur-0"
            }`}
          />
          <div className={`absolute inset-0 bg-gradient-to-r ${project.color} opacity-80`} />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex items-center w-full">
          <div className="container mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              
              {/* Project Info */}
              <div className="text-white">
                <div className="flex items-center gap-4 mb-6">
                  <Badge className="bg-white/20 text-white border-white/30">
                    {project.category}
                  </Badge>
                  <div className="text-sm opacity-80">
                    Project {currentProject + 1} of {showcaseProjects.length}
                  </div>
                </div>

                <h1 className={`text-4xl md:text-6xl font-bold mb-6 transition-all duration-600 ${
                  isTransitioning ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0"
                }`}>
                  {project.title}
                </h1>

                <p className={`text-xl mb-8 leading-relaxed opacity-90 transition-all duration-600 delay-100 ${
                  isTransitioning ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0"  
                }`}>
                  {project.description}
                </p>

                {/* Metrics */}
                <div className={`grid grid-cols-3 gap-6 mb-8 transition-all duration-600 delay-200 ${
                  isTransitioning ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0"
                }`}>
                  {project.metrics.map((metric, index) => (
                    <div key={index} className="text-center">
                      <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                        {metric.value}
                      </div>
                      <div className="text-sm opacity-80">{metric.label}</div>
                    </div>
                  ))}
                </div>

                {/* Technologies */}
                <div className={`flex flex-wrap gap-3 mb-8 transition-all duration-600 delay-300 ${
                  isTransitioning ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0"
                }`}>
                  {project.technologies.map((tech) => (
                    <Badge key={tech} variant="outline" className="bg-white/10 text-white border-white/30">
                      {tech}
                    </Badge>
                  ))}
                </div>

                {/* CTAs */}
                <div className={`flex flex-col sm:flex-row gap-4 transition-all duration-600 delay-400 ${
                  isTransitioning ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0"
                }`}>
                  <Link to={`/work/${project.id}`}>
                    <Button className="bg-white text-foreground hover:bg-white/90 px-8 py-4">
                      View Case Study
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Button variant="ghost" className="text-white border-white hover:bg-white/10 px-8 py-4">
                    <ExternalLink className="mr-2 h-5 w-5" />
                    Live Demo
                  </Button>
                </div>
              </div>

              {/* Navigation Panel */}
              <div className="hidden lg:block">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                  <h3 className="text-white text-xl font-semibold mb-6">
                    Featured Projects
                  </h3>
                  
                  <div className="space-y-4">
                    {showcaseProjects.map((proj, index) => (
                      <button
                        key={proj.id}
                        onClick={() => {
                          if (index !== currentProject && !isTransitioning) {
                            setIsTransitioning(true);
                            setCurrentProject(index);
                            setTimeout(() => setIsTransitioning(false), 600);
                          }
                        }}
                        className={`w-full text-left p-4 rounded-lg transition-all duration-300 ${
                          index === currentProject
                            ? "bg-white/20 text-white"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <div className="font-medium mb-1">{proj.title}</div>
                        <div className="text-xs opacity-80">{proj.category}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Controls */}
        <button
          onClick={prevProject}
          disabled={isTransitioning}
          className="absolute left-6 top-1/2 -translate-y-1/2 z-20 p-4 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all duration-200 disabled:opacity-50"
          aria-label="Previous project"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>

        <button
          onClick={nextProject}
          disabled={isTransitioning}
          className="absolute right-6 top-1/2 -translate-y-1/2 z-20 p-4 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all duration-200 disabled:opacity-50"
          aria-label="Next project"
        >
          <ArrowRight className="h-6 w-6" />
        </button>

        {/* Progress Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-3">
          {showcaseProjects.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (index !== currentProject && !isTransitioning) {
                  setIsTransitioning(true);
                  setCurrentProject(index);
                  setTimeout(() => setIsTransitioning(false), 600);
                }
              }}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentProject
                  ? "bg-white scale-125"  
                  : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Go to project ${index + 1}`}
            />
          ))}
        </div>

        {/* Keyboard Hint */}
        <div className="absolute bottom-8 right-8 z-20 text-white/60 text-sm">
          Use ← → keys to navigate
        </div>
      </div>

      {/* Exit to Home */}
      <Link
        to="/"
        className="fixed top-6 right-6 z-50 glass text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200"
      >
        Exit Showcase
      </Link>
    </div>
  );
};

export default Showcase;