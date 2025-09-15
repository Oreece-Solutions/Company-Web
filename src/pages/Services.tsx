import Navigation from "@/components/Navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Code, 
  Smartphone, 
  Palette, 
  Zap, 
  Globe, 
  Shield,
  ArrowRight,
  CheckCircle
} from "lucide-react";

const Services = () => {
  const services = [
    {
      icon: <Code className="h-12 w-12" />,
      title: "Web Development",
      description: "Custom websites and web applications built with modern technologies for optimal performance and user experience.",
      features: [
        "React & Next.js Applications",
        "Responsive Design",
        "Performance Optimization"
      ]
    },
    {
      icon: <Palette className="h-12 w-12" />,  
      title: "UI/UX Design",
      description: "Beautiful, intuitive designs that convert visitors into customers and provide exceptional user experiences.",
      features: [
        "User Research & Testing",
        "Wireframing & Prototyping", 
        "Design Systems"
      ]
    },
    {
      icon: <Smartphone className="h-12 w-12" />,
      title: "Mobile Development", 
      description: "Cross-platform mobile applications that work seamlessly across iOS and Android devices.",
      features: [
        "React Native Apps",
        "Progressive Web Apps",
        "App Store Optimization"
      ]
    },
    {
      icon: <Zap className="h-12 w-12" />,
      title: "Performance Optimization",
      description: "Speed up your existing applications and improve user experience with advanced optimization techniques.",
      features: [
        "Core Web Vitals",
        "Database Optimization", 
        "CDN Implementation"
      ]
    },
    {
      icon: <Globe className="h-12 w-12" />,
      title: "Digital Strategy",
      description: "Comprehensive digital strategies that align technology with your business goals and drive growth.",
      features: [
        "Technical Consulting",
        "Architecture Planning",
        "Technology Roadmaps"
      ]
    },
    {
      icon: <Shield className="h-12 w-12" />,
      title: "Maintenance & Support",
      description: "Ongoing maintenance, updates, and support to keep your applications running smoothly and securely.",
      features: [
        "Security Updates",
        "Performance Monitoring",
        "24/7 Support"
      ]
    }
  ];

  return (
    <div className="min-h-screen animate-page-enter">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-background via-surface to-surface/50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4">Our Services</Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Complete Digital
              <span className="block bg-gradient-primary bg-clip-text text-transparent">
                Solutions
              </span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed mb-8">
              From concept to deployment, we provide end-to-end digital services 
              that transform your ideas into powerful, scalable solutions.
            </p>
            <Link to="/contact">
              <Button className="btn-hero text-lg px-8 py-4">
                Start Your Project
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What We Do</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We offer comprehensive digital services designed to help your 
              business thrive in the digital age.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div key={index} className={`card-elevated p-8 animate-card-stack animate-card-stack-${index + 1} hover:scale-105 transition-all duration-300`}>
                <div className="w-16 h-16 bg-primary/10 rounded-lg mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <div className="text-primary">
                    {service.icon}
                  </div>
                </div>
                <h3 className="text-2xl font-semibold mb-4">{service.title}</h3>
                <p className="text-muted-foreground mb-6">
                  {service.description}
                </p>
                <ul className="space-y-2 text-sm">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Let's discuss your project requirements and create a custom 
            solution that drives real results for your business.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/contact">
              <Button className="bg-white text-primary hover:bg-white/90 px-8 py-4 text-lg font-semibold">
                Start Your Project
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
    </div>
  );
};

export default Services;