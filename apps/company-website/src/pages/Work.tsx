import { useState } from "react";
import { Navigation, BackToTop, ProjectCard } from "@company-web/features";
import { Badge, Button, Input } from "@company-web/shared/ui";
import { Link } from "react-router-dom";
import { Search, Filter, ArrowRight } from "lucide-react";

const Work = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const projects = [
    {
      id: "1",
      title: "EcoCommerce Platform",
      description: "A sustainable e-commerce platform that increased conversion rates by 45% through innovative UX and performance optimization.",
      image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop",
      tags: ["React", "Node.js", "AWS"],
      category: "E-commerce",
      slug: "ecocommerce-platform",
      metrics: [
        { label: "Conversion Rate", value: "+45%" },
        { label: "Page Speed", value: "0.8s" }
      ]
    },
    {
      id: "2",
      title: "HealthTech Dashboard",
      description: "Real-time patient monitoring dashboard that streamlined clinical workflows and improved patient outcomes.",
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&h=600&fit=crop",
      tags: ["Next.js", "TypeScript", "PostgreSQL"],
      category: "Healthcare",
      slug: "healthtech-dashboard",
      metrics: [
        { label: "Time Saved", value: "30%" },
        { label: "Users", value: "2.5K+" }
      ]
    },
    {
      id: "3",
      title: "FinTech Mobile App",
      description: "Secure banking application with biometric authentication and real-time transaction processing.",
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop",
      tags: ["React Native", "Python", "Blockchain"],
      category: "Finance",
      slug: "fintech-mobile-app",
      metrics: [
        { label: "Security Score", value: "99.9%" },
        { label: "Downloads", value: "100K+" }
      ]
    },
    {
      id: "4",
      title: "AI Content Platform",
      description: "Machine learning-powered content creation platform that generates high-quality content at scale.",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop",
      tags: ["Python", "TensorFlow", "React"],
      category: "AI/ML",
      slug: "ai-content-platform",
      metrics: [
        { label: "Content Quality", value: "94%" },
        { label: "Speed Increase", value: "10x" }
      ]
    },
    {
      id: "5",
      title: "Smart City Dashboard",
      description: "IoT-powered city management system that optimizes traffic flow and reduces energy consumption.",
      image: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1f?w=800&h=600&fit=crop",
      tags: ["IoT", "React", "MongoDB"],
      category: "Smart City",
      slug: "smart-city-dashboard",
      metrics: [
        { label: "Energy Saved", value: "25%" },
        { label: "Traffic Flow", value: "+40%" }
      ]
    },
    {
      id: "6",
      title: "EdTech Learning Platform",
      description: "Interactive learning platform with personalized curricula and real-time progress tracking.",
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop",
      tags: ["Vue.js", "Node.js", "MySQL"],
      category: "Education",
      slug: "edtech-learning-platform",
      metrics: [
        { label: "Student Engagement", value: "+65%" },
        { label: "Completion Rate", value: "89%" }
      ]
    }
  ];

  const categories = ["All", ...Array.from(new Set(projects.map(p => p.category)))];

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "All" || project.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen animate-page-enter">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-gradient-to-br from-background via-surface to-surface/50 overflow-hidden">
            {/* Animated Background Pattern */}
      <div className="absolute inset-0 grid-pattern opacity-30 animate-pulse" />
      
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/6 w-64 h-64 bg-primary/5 rounded-full animate-float-slow" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-accent/8 rounded-full animate-float-medium" />
      </div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4">Our Work</Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Projects We're
              <span className="block bg-gradient-primary bg-clip-text text-transparent">
                Proud Of
              </span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed mb-8">
              Explore our portfolio of successful projects that have helped 
              businesses transform their digital presence and achieve their goals.
            </p>
          </div>
        </div>
      </section>

      {/* Filters & Search */}
      <section className="py-12 bg-surface/30">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
            
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category ? "bg-primary text-primary-foreground" : ""}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold mb-2">No projects found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your search terms or category filters.
              </p>
              <Button 
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("All");
                }}
                variant="outline"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    {filteredProjects.length} Project{filteredProjects.length !== 1 ? 's' : ''}
                    {selectedCategory !== "All" && (
                      <span className="text-muted-foreground"> in {selectedCategory}</span>
                    )}
                  </h2>
                  <p className="text-muted-foreground">
                    Showcasing our best work across different industries
                  </p>
                </div>
                <Link to="/showcase" className="hidden md:block">
                  <Button variant="ghost" className="btn-ghost">
                    View Showcase
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProjects.map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    className={`animate-card-stack animate-card-stack-${(index % 6) + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-surface/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Results That Speak for Themselves
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our projects consistently deliver measurable results and positive 
              impact for our clients' businesses.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: "50+", label: "Projects Completed", description: "Across various industries" },
              { number: "98%", label: "Client Satisfaction", description: "Based on project reviews" },
              { number: "2.5M+", label: "Users Impacted", description: "By our digital solutions" },
              { number: "150%", label: "Avg ROI Increase", description: "For our client projects" }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  {stat.number}
                </div>
                <div className="font-semibold mb-1">{stat.label}</div>
                <div className="text-sm text-muted-foreground">{stat.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Your Project?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join our growing list of satisfied clients and let's create 
            something amazing together.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/contact">
              <Button className="bg-white text-primary hover:bg-white/90 px-8 py-4 text-lg font-semibold">
                Start Your Project
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/services">
              <Button variant="ghost" className="text-white border-white hover:bg-white/10 px-8 py-4 text-lg">
                View Services
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-foreground text-background">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Oreece</h3>
            <p className="text-background/80 max-w-md mx-auto">
              Building exceptional digital experiences that drive growth 
              and deliver measurable results.
            </p>
          </div>
          <div className="border-t border-background/20 mt-8 pt-8 text-center text-background/60">
            <p>&copy; 2024 Oreece. All rights reserved.</p>
          </div>
        </div>
      </footer>
      
      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
};

export default Work;