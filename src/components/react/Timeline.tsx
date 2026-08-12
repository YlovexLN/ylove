import { timelineItems } from "@/data/timeline";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBriefcase, faGraduationCap } from "@fortawesome/free-solid-svg-icons";

export default function Timeline() {
  return (
    <section id="experience" className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="mb-16">
          <span className="text-gold text-sm font-mono tracking-widest uppercase">
            / Experience
          </span>
          <h2 className="text-3xl md:text-4xl font-display mt-2">
            Where I&apos;ve Been
          </h2>
          <div className="w-12 h-0.5 bg-gold/50 mt-4 section-divider" />
        </div>

        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border-default" />

          <div className="space-y-8">
            {timelineItems.map((item, index) => (
              <div
                key={`${item.date}-${item.title}`}
                className="relative pl-12"
                style={{
                  animation: `slide-up 0.6s ease-out ${0.1 * index}s forwards`,
                  opacity: 0,
                }}
              >
                {/* Dot */}
                <div
                  className={`absolute left-3 top-1 w-2.5 h-2.5 rounded-full border-2 ${
                    item.type === "work"
                      ? "border-gold bg-gold/20"
                      : "border-text-muted bg-bg-card"
                  }`}
                />

                {/* Content */}
                <div className="rounded-xl border border-border-default bg-bg-card p-5 transition-all duration-300 hover:border-border-hover hover:bg-bg-card-hover">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="text-base font-semibold text-text-primary">
                        {item.title}
                      </h3>
                      <p className="text-sm text-text-secondary">
                        {item.subtitle}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.type === "work" ? (
                        <FontAwesomeIcon icon={faBriefcase} className="h-3.5 w-3.5 text-gold" />
                      ) : (
                        <FontAwesomeIcon icon={faGraduationCap} className="h-3.5 w-3.5 text-text-muted" />
                      )}
                      <span className="text-xs text-text-muted font-mono">
                        {item.date}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
