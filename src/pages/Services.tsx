import Navigation from "@/components/Navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Code2, 
  Smartphone, 
  Cloud, 
  Palette, 
  Database, 
  Shield,
  ArrowRight,
  CheckCircle
} from "lucide-react";

const Services = () => {
  const services = [
    {
      icon: <Code2 className="h-12 w-12" />,
      title: "Web Development",
      description: "Custom web applications built with modern frameworks and best practices for scalability and performance.",
      features: [
        "React, Next.js, Vue.js development",
        "Progressive Web Apps (PWAs)",
        "E-commerce platforms",
        "Content Management Systems",
        "API development & integration"
      ],
      technologies: ["React", "Next.js", "TypeScript", "Node.js", "Python"],
      startingPrice: "$15,000"
    },
    {
      icon: <Smartphone className="h-12 w-12" />,
      title: "Mobile Development",
      description: "Native and cross-platform mobile applications that deliver exceptional user experiences across all devices.",
      features: [
        "iOS & Android native apps",
        "React Native & Flutter",
        "Mobile-first design",
        "App Store optimization",
        "Push notifications & analytics"
      ],
      technologies: ["React Native", "Flutter", "Swift", "Kotlin", "Firebase"],
      startingPrice: "$25,000"
    },
    {
      icon: <Cloud className="h-12 w-12" />,
      title: "Cloud Solutions",
      description: "Scalable cloud infrastructure and DevOps solutions to power your applications and optimize performance.",
      features: [
        "AWS, Google Cloud, Azure setup",
        "Containerization with Docker",
        "CI/CD pipeline automation",
        "Database optimization",
        "Monitoring & analytics"
      ],
      technologies: ["AWS", "Docker", "Kubernetes", "Terraform", "MongoDB"],
      startingPrice: "$10,000"
    },
    {
      icon: <Palette className="h-12 w-12" />,
      title: "UI/UX Design",
      description: "User-centered design that combines beautiful aesthetics with intuitive functionality and conversion optimization.",
      features: [
        "User research & personas",
        "Wireframing & prototyping",
        "Design systems & style guides",
        "Usability testing",
        "Conversion optimization"
      ],
      technologies: ["Figma", "Adobe XD", "Sketch", "InVision", "Principle"],
      startingPrice: "$8,000"
    },
    {
      icon: <Database className="h-12 w-12" />,
      title: "Data & Analytics",
      description: "Transform your data into actionable insights with custom dashboards, reporting, and machine learning solutions.",
      features: [
        "Custom analytics dashboards",
        "Business intelligence reporting",
        "Machine learning models",
        "Data pipeline automation",
        "Performance monitoring"
      ],
      technologies: ["Python", "TensorFlow", "Tableau", "PostgreSQL", "BigQuery"],
      startingPrice: "$20,000"
    },
    {
      icon: <Shield className="h-12 w-12" />,
      title: "Security & Compliance",
      description: "Comprehensive security audits, implementation, and compliance solutions to protect your digital assets.",
      features: [
        "Security audits & assessments",
        "GDPR & CCPA compliance",
        "Penetration testing",
        "Data encryption & protection",
        "Security training & consulting"
      ],
      technologies: ["OWASP", "SSL/TLS", "OAuth", "JWT", "Encryption"],
      startingPrice: "$12,000"
    }
  ];

  const processSteps = [
    {
      step: "01",
      title: "Discovery",
      description: "We start by understanding your business goals, target audience, and technical requirements through detailed consultations."
    },
    {
      step: "02", 
      title: "Strategy",
      description: "We develop a comprehensive strategy and roadmap, including technology stack recommendations and project timeline."
    },
    {
      step: "03",
      title: "Design",
      description: "Our design team creates user-centered interfaces and experiences that align with your brand and objectives."
    },
    {
      step: "04",
      title: "Development",
      description: "We build your solution using agile methodologies with regular check-ins and progress updates."
    },
    {
      step: "05",
      title: "Testing",
      description: "Comprehensive testing ensures your solution works flawlessly across all devices and scenarios."
    },
    {
      step: "06",
      title: "Launch",
      description: "We handle deployment, monitoring, and provide ongoing support to ensure continued success."
    }
  ];

  return (
    <div className="min-h-screen">
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

          <div className="grid lg:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <div key={index} className="card-elevated p-8 group">
                <div className="flex items-start mb-6">
                  <div className="text-primary mr-6 transform group-hover:scale-110 transition-transform duration-200">
                    {service.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-3">{service.title}</h3>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      {service.description}
                    </p>
                    <div className="text-sm text-primary font-semibold mb-6">
                      Starting from {service.startingPrice}
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-3">What's Included:</h4>
                  <ul className="space-y-2">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Technologies */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {service.technologies.map((tech) => (
                    <Badge key={tech} variant="outline" className="text-xs">
                      {tech}
                    </Badge>
                  ))}
                </div>

                {/* CTA */}
                <Link to="/contact">
                  <Button variant="ghost" className="btn-ghost w-full">
                    Learn More
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-surface/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Process</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We follow a proven methodology that ensures successful project 
              delivery from concept to launch.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {processSteps.map((step, index) => (
              <div key={index} className="text-center group">
                <div className="relative mb-6">
                  <div className="w-20 h-20 mx-auto bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold text-xl mb-4 group-hover:scale-110 transition-transform duration-200">
                    {step.step}
                  </div>
                  {index < processSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 bg-border transform -translate-x-1/2" />
                  )}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4">Why Choose Oreece</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Experience That Delivers Results
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                With over 5 years of experience and 50+ successful projects, 
                we have the expertise and track record to bring your vision to life.
              </p>
              
              <div className="space-y-4">
                {[
                  "Proven track record with 98% client satisfaction",
                  "Agile development with regular communication",
                  "Modern technology stack and best practices",
                  "Ongoing support and maintenance available",
                  "Transparent pricing with no hidden costs"
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary mr-3" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {[
                { number: "50+", label: "Projects Completed" },
                { number: "98%", label: "Client Satisfaction" },
                { number: "5+", label: "Years Experience" },
                { number: "24/7", label: "Support Available" }
              ].map((stat, index) => (
                <div key={index} className="flex items-center p-6 card-elevated">
                  <div className="text-3xl font-bold text-primary mr-6">
                    {stat.number}
                  </div>
                  <div>
                    <div className="font-semibold">{stat.label}</div>
                    <div className="text-sm text-muted-foreground">
                      Trusted by businesses worldwide
                    </div>
                  </div>
                </div>
              ))}
            </div>
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