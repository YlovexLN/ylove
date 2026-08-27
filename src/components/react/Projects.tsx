import { projects } from "@/data/projects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";

export default function Projects() {
  return (
    <section id="projects" className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="mb-16">
          <span className="text-gold text-sm font-mono tracking-widest uppercase">
            / Projects
          </span>
          <h2 className="text-3xl md:text-4xl font-display mt-2">
            Things I&apos;ve Built
          </h2>
          <div className="w-12 h-0.5 bg-gold/50 mt-4 section-divider" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {projects.map((project, index) => (
            <div
              key={project.title}
              className="group rounded-xl border border-border-default bg-bg-card p-6 transition-all duration-300 hover:border-gold/20 hover:bg-bg-card-hover hover:shadow-[0_0_30px_rgba(52,211,153,0.05)]"
              style={{
                animation: `slide-up 0.6s ease-out ${0.1 * index}s forwards`,
                opacity: 0,
              }}
            >
              {/* Project Image Placeholder */}
              <div className="w-full h-40 rounded-lg bg-linear-to-br from-white/3 to-white/8 border border-border-default mb-4 flex items-center justify-center overflow-hidden">
                <div className="text-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-300">
                  {"</>"}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-gold transition-colors duration-200">
                {project.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-text-secondary leading-relaxed mb-4 line-clamp-2">
                {project.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {project.tags.map((tag) => (
                  <Badge key={tag} variant="default" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Links */}
              <div className="flex items-center gap-3">
                {project.url && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={project.url} target="_blank" rel="noopener noreferrer">
                      <FontAwesomeIcon icon={faExternalLinkAlt} className="h-3.5 w-3.5 mr-1.5" />
                      Live
                    </a>
                  </Button>
                )}
                {project.github && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={project.github} target="_blank" rel="noopener noreferrer">
                      <FontAwesomeIcon icon={faGithub} className="h-3.5 w-3.5 mr-1.5" />
                      Code
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
