import { skillCategories } from "@/data/skills";

export default function Skills() {
  return (
    <section id="skills" className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="mb-16">
          <span className="text-gold text-sm font-mono tracking-widest uppercase">
            / Skills
          </span>
          <h2 className="text-3xl md:text-4xl font-display mt-2">
            What I Know
          </h2>
          <div className="w-12 h-0.5 bg-gold/50 mt-4 section-divider" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {skillCategories.map((category, catIndex) => (
            <div
              key={category.category}
              className="rounded-xl border border-border-default bg-bg-card p-6 transition-all duration-300 hover:border-border-hover hover:bg-bg-card-hover"
              style={{
                animation: `slide-up 0.6s ease-out ${0.1 * catIndex}s forwards`,
                opacity: 0,
              }}
            >
              <h3 className="text-sm font-mono text-gold tracking-wider uppercase mb-4">
                {category.category}
              </h3>
              <div className="flex flex-wrap gap-2">
                {category.skills.map((skill) => (
                  <span
                    key={skill.name}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border border-border-default bg-white/[0.03] text-text-secondary hover:border-gold/30 hover:text-gold hover:bg-gold/[0.05] transition-all duration-200 cursor-default"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
