import { Badge } from "@/components/ui/badge";

const technologies = [
  { name: "React", icon: "⚛️", category: "Frontend" },
  { name: "TypeScript", icon: "📘", category: "Language" },
  { name: "Next.js", icon: "▲", category: "Framework" },
  { name: "Node.js", icon: "🟢", category: "Backend" },
  { name: "Python", icon: "🐍", category: "Language" },
  { name: "AWS", icon: "☁️", category: "Cloud" },
  { name: "PostgreSQL", icon: "🐘", category: "Database" },
  { name: "MongoDB", icon: "🍃", category: "Database" },
  { name: "Docker", icon: "🐳", category: "DevOps" },
  { name: "Kubernetes", icon: "⚙️", category: "DevOps" },
  { name: "GraphQL", icon: "🚀", category: "API" },
  { name: "TailwindCSS", icon: "💨", category: "Styling" }
];

const TechGrid = () => {
  return (
    <section className="py-20 bg-surface/50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built with Modern Technology
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We leverage cutting-edge technologies to build scalable, 
            performant solutions that stand the test of time.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {technologies.map((tech, index) => (
            <div
              key={tech.name}
              className="card-elevated p-6 text-center group hover:scale-105 transition-all duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="text-3xl mb-3 transform group-hover:scale-110 transition-transform duration-200">
                {tech.icon}
              </div>
              <h3 className="font-semibold text-sm mb-2">{tech.name}</h3>
              <Badge variant="outline" className="text-xs">
                {tech.category}
              </Badge>
            </div>
          ))}
        </div>

        {/* Call to action */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-6">
            Ready to bring your vision to life with the right technology stack?
          </p>
          <button className="btn-hero">
            Let's Discuss Your Project
          </button>
        </div>
      </div>
    </section>
  );
};

export default TechGrid;