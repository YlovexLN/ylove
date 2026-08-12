import { posts } from "@/data/posts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";

export default function Posts() {
  return (
    <section id="posts" className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="mb-16">
          <span className="text-gold text-sm font-mono tracking-widest uppercase">
            / Writing
          </span>
          <h2 className="text-3xl md:text-4xl font-display mt-2">
            Latest Posts
          </h2>
          <div className="w-12 h-0.5 bg-gold/50 mt-4 section-divider" />
        </div>

        <div className="space-y-4">
          {posts.map((post, index) => (
            <a
              key={post.title}
              href={post.url || "#"}
              className="group block rounded-xl border border-border-default bg-bg-card p-5 transition-all duration-300 hover:border-gold/20 hover:bg-bg-card-hover"
              style={{
                animation: `slide-up 0.6s ease-out ${0.1 * index}s forwards`,
                opacity: 0,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-text-muted font-mono">
                    {post.date}
                  </span>
                  <h3 className="text-base font-semibold text-text-primary mt-1 group-hover:text-gold transition-colors duration-200">
                    {post.title}
                  </h3>
                  <p className="text-sm text-text-secondary mt-1.5 line-clamp-2">
                    {post.summary}
                  </p>
                </div>
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-4 w-4 text-text-muted group-hover:text-gold transition-colors duration-200 mt-1 shrink-0" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
