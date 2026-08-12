import { profile } from "@/data/profile";

export default function About() {
  return (
    <section id="about" className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="mb-16">
          <span className="text-gold text-sm font-mono tracking-widest uppercase">
            / About
          </span>
          <h2 className="text-3xl md:text-4xl font-display mt-2">
            Who I Am
          </h2>
          <div className="w-12 h-0.5 bg-gold/50 mt-4 section-divider" />
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Bio Text */}
          <div className="space-y-5">
            <p className="text-text-secondary leading-relaxed text-base">
              {profile.bio}
            </p>
            <p className="text-text-secondary leading-relaxed text-base">
              I believe in writing clean, maintainable code and creating
              interfaces that are both beautiful and functional. Every project
              is an opportunity to push boundaries and learn something new.
            </p>
            <p className="text-text-secondary leading-relaxed text-base">
              When I&apos;m not coding, you&apos;ll find me exploring new
              technologies, contributing to open source, or writing about my
              experiences in tech.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4">
            {profile.stats.map((stat, index) => (
              <div
                key={stat.label}
                className="group rounded-xl border border-border-default bg-bg-card p-5 transition-all duration-300 hover:border-gold/20 hover:bg-bg-card-hover"
                style={{
                  animation: `slide-up 0.6s ease-out ${0.2 + index * 0.1}s forwards`,
                  opacity: 0,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary text-sm">{stat.label}</span>
                  <span className="text-3xl font-display gradient-gold">
                    {stat.value}
                  </span>
                </div>
                <div className="mt-3 h-px bg-linear-to-r from-gold/20 to-transparent" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
