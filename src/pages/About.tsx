import Navigation from "@/components/Navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, Award, Target, Heart } from "lucide-react";

const About = () => {
  const team = [
    {
      name: "Alex Rodriguez",
      role: "Founder & CEO",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
      bio: "10+ years building digital products that matter"
    },
    {
      name: "Sarah Chen", 
      role: "CTO",
      image: "https://images.unsplash.com/photo-1494790108755-2616b332eb80?w=400&h=400&fit=crop&crop=face",
      bio: "Full-stack architect with expertise in scalable systems"
    },
    {
      name: "Marcus Johnson",
      role: "Lead Designer", 
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
      bio: "Creating beautiful, user-centered digital experiences"
    }
  ];

  const values = [
    {
      icon: <Target className="h-8 w-8" />,
      title: "Purpose-Driven",
      description: "Every project we take on has a clear purpose and measurable impact."
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Collaborative",
      description: "We work as an extension of your team, not just a vendor."
    },
    {
      icon: <Award className="h-8 w-8" />,
      title: "Excellence",
      description: "We deliver nothing less than exceptional quality in everything we do."
    },
    {
      icon: <Heart className="h-8 w-8" />,
      title: "Passionate",
      description: "We love what we do, and it shows in the work we deliver."
    }
  ];

  return (
    <div className="min-h-screen animate-page-enter">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-background via-surface to-surface/50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4">About Oreece</Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              We're Building the
              <span className="block bg-gradient-primary bg-clip-text text-transparent">
                Future of Digital
              </span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed mb-8">
              Founded in 2019, Oreece has grown from a small studio to a leading 
              digital agency, helping businesses transform their ideas into 
              powerful digital experiences that drive real results.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-surface/50">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: "50+", label: "Projects Delivered" },
              { number: "98%", label: "Client Satisfaction" },
              { number: "5+", label: "Years Experience" },
              { number: "25+", label: "Happy Clients" }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  {stat.number}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Our Story</h2>
            <div className="prose prose-lg mx-auto text-muted-foreground">
              <p className="text-xl leading-relaxed mb-6">
                Oreece was born from a simple belief: technology should solve real problems 
                and create meaningful impact. What started as a passion project between 
                three friends has evolved into a full-service digital agency trusted by 
                companies worldwide.
              </p>
              <p className="text-lg leading-relaxed mb-6">
                We've had the privilege of working with startups disrupting entire industries 
                and established enterprises modernizing their digital infrastructure. Each 
                project teaches us something new and pushes us to innovate further.
              </p>
              <p className="text-lg leading-relaxed">
                Today, we continue to be driven by the same passion that started it all: 
                creating digital experiences that not only look great but deliver real 
                business value and positive user outcomes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-surface/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Values</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              These principles guide everything we do and shape how we work 
              with our clients and each other.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className={`card-elevated p-8 text-center group animate-card-stack animate-card-stack-${index + 1} hover:scale-105 transition-all duration-300`}>
                <div className="text-primary mb-4 flex justify-center transform group-hover:scale-110 transition-transform duration-200">
                  {value.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Meet the Team</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The passionate individuals behind Oreece who make the magic happen 
              every single day.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-4xl mx-auto">
            {team.map((member, index) => (
              <div key={index} className={`text-center group animate-card-stack animate-card-stack-${index + 1}`}>
                <div className="relative mb-6">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-48 h-48 rounded-full mx-auto object-cover shadow-lg group-hover:shadow-xl transition-shadow duration-300"
                  />
                  <div className="absolute inset-0 rounded-full bg-gradient-primary opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                </div>
                <h3 className="text-xl font-bold mb-2">{member.name}</h3>
                <p className="text-primary font-medium mb-3">{member.role}</p>
                <p className="text-muted-foreground leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-primary text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Work Together?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Let's discuss your project and see how we can help you achieve 
            your digital goals.
          </p>
          <Link to="/contact">
            <Button className="bg-white text-primary hover:bg-white/90 px-8 py-4 text-lg font-semibold">
              Get in Touch
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-foreground text-background">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Oreece</h3>
            <p className="text-background/80 max-w-md mx-auto mb-8">
              Building exceptional digital experiences that drive growth 
              and deliver measurable results.
            </p>
            <div className="flex justify-center space-x-8">
              <Link to="/" className="text-background/80 hover:text-background transition-colors">Home</Link>
              <Link to="/work" className="text-background/80 hover:text-background transition-colors">Work</Link>
              <Link to="/services" className="text-background/80 hover:text-background transition-colors">Services</Link>
              <Link to="/contact" className="text-background/80 hover:text-background transition-colors">Contact</Link>
            </div>
          </div>
          <div className="border-t border-background/20 mt-8 pt-8 text-center text-background/60">
            <p>&copy; 2024 Oreece. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;