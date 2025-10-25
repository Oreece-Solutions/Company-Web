import { Navigation, Hero, ProjectCard, TechGrid, BackToTop } from "@company-web/features";
import { Badge, Button } from "@company-web/shared/ui";
import { Link } from "react-router-dom";
import { ArrowRight, Star, Users, Award } from "lucide-react";

// Mock data for projects
const featuredProjects = [
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

const services = [
  {
    icon: "💻",
    title: "Web Development",
    description: "Full-stack web applications built with modern frameworks and best practices."
  },
  {
    icon: "📱",
    title: "Mobile Development", 
    description: "Native and cross-platform mobile apps that deliver exceptional user experiences."
  },
  {
    icon: "☁️",
    title: "Cloud Solutions",
    description: "Scalable cloud infrastructure and DevOps solutions for modern businesses."
  }
];

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <Hero />

      {/* Clients Section */}
      <section className="py-16 bg-surface/30">
        <div className="container mx-auto px-6">
          <p className="text-center text-muted-foreground mb-8">
            Trusted by innovative companies worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
            {["TechCorp", "InnovateAI", "GreenEnergy", "HealthPlus", "EduTech", "CloudScale"].map((client) => (
              <div key={client} className="text-lg font-semibold">
                {client}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4">Our Services</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What We Do Best
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From concept to deployment, we deliver end-to-end digital solutions 
              that drive business growth and user satisfaction.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div
                key={service.title}
                className="card-elevated p-8 text-center group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-200">
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section className="py-20 bg-surface/50">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-16">
            <div>
              <Badge className="mb-4">Featured Work</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Projects We're Proud Of
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Explore our latest work and see how we've helped businesses 
                transform their digital presence.
              </p>
            </div>
            <Link to="/work" className="hidden md:block">
              <Button variant="ghost" className="btn-ghost">
                View All Projects
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProjects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                className={`card-elevated group overflow-hidden`}
              />
            ))}
          </div>

          <div className="text-center mt-12 md:hidden">
            <Link to="/work">
              <Button className="btn-hero">
                View All Projects
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <TechGrid />

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4">Client Success</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What Our Clients Say
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Don't just take our word for it. Here's what our clients 
              have to say about working with us.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "Oreece transformed our digital presence completely. The results exceeded our expectations.",
                author: "Sarah Johnson",
                role: "CEO, TechCorp",
                rating: 5
              },
              {
                quote: "Professional, innovative, and delivered on time. Couldn't ask for a better partner.",
                author: "Michael Chen",
                role: "CTO, InnovateAI", 
                rating: 5
              },
              {
                quote: "The team's attention to detail and technical expertise is unmatched.",
                author: "Emily Rodriguez",
                role: "Product Manager, HealthPlus",
                rating: 5
              }
            ].map((testimonial, index) => (
              <div key={index} className="card-elevated p-8">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                  ))}
                </div>
                <blockquote className="text-lg mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </blockquote>
                <div className="flex items-center">
                  <div>
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Your Next Project?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Let's discuss how we can help you achieve your digital goals 
            and transform your business.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/contact">
              <Button className="bg-white text-primary hover:bg-white/90 px-8 py-4 text-lg font-semibold">
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/work">
              <Button variant="ghost" className="text-white border-white hover:bg-white/10 px-8 py-4 text-lg">
                View Our Work
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-foreground text-background">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-bold mb-4">Oreece</h3>
              <p className="text-background/80 max-w-md">
                Building exceptional digital experiences that drive growth 
                and deliver measurable results for forward-thinking businesses.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-background/80">
                <li><Link to="/services" className="hover:text-background transition-colors">Web Development</Link></li>
                <li><Link to="/services" className="hover:text-background transition-colors">Mobile Apps</Link></li>
                <li><Link to="/services" className="hover:text-background transition-colors">Cloud Solutions</Link></li>
                <li><Link to="/services" className="hover:text-background transition-colors">Consulting</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-background/80">
                <li><Link to="/about" className="hover:text-background transition-colors">About</Link></li>
                <li><Link to="/work" className="hover:text-background transition-colors">Work</Link></li>
                <li><Link to="/contact" className="hover:text-background transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-background/20 pt-8 text-center text-background/60">
            <p>&copy; 2024 Oreece. All rights reserved.</p>
          </div>
        </div>
      </footer>
      
      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
};

export default Index;