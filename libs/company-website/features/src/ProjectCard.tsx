import { Link } from "react-router-dom";
import { Badge } from "@company-web/shared/ui";
import { ArrowRight, ExternalLink } from "lucide-react";

interface ProjectCardProps {
  project: {
    id: string;
    title: string;
    description: string;
    image: string;
    tags: string[];
    category: string;
    slug: string;
    metrics?: {
      label: string;
      value: string;
    }[];
  };
  className?: string;
}

const ProjectCard = ({ project, className = "" }: ProjectCardProps) => {
  return (
    <div className={`card-elevated group overflow-hidden ${className}`}>
      {/* Image */}
      <div className="relative aspect-video overflow-hidden bg-surface">
        <img
          src={project.image}
          alt={project.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Link
            to={`/work/${project.slug}`}
            className="btn-hero inline-flex items-center"
          >
            View Project
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Category & Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="secondary" className="text-xs font-medium">
            {project.category}
          </Badge>
          {project.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Title */}
        <Link to={`/work/${project.slug}`}>
          <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors duration-200">
            {project.title}
          </h3>
        </Link>

        {/* Description */}
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">
          {project.description}
        </p>

        {/* Metrics */}
        {project.metrics && project.metrics.length > 0 && (
          <div className="flex flex-wrap gap-4 mb-4 pt-3 border-t border-border/50">
            {project.metrics.slice(0, 2).map((metric, index) => (
              <div key={index} className="text-center">
                <div className="text-lg font-bold text-primary">{metric.value}</div>
                <div className="text-xs text-muted-foreground">{metric.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <Link
            to={`/work/${project.slug}`}
            className="text-primary font-medium text-sm hover:underline inline-flex items-center"
          >
            View Case Study
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
          
          <button className="p-2 hover:bg-surface rounded-lg transition-colors duration-200">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export { ProjectCard };
export default ProjectCard;