import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { profile } from "@/data/profile";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faEnvelope, faPaperPlane } from "@fortawesome/free-solid-svg-icons";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <section id="contact" className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="mb-16">
          <span className="text-gold text-sm font-mono tracking-widest uppercase">
            / Contact
          </span>
          <h2 className="text-3xl md:text-4xl font-display mt-2">
            Let&apos;s Connect
          </h2>
          <div className="w-12 h-0.5 bg-gold/50 mt-4 section-divider" />
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Left: Social Info */}
          <div className="space-y-8">
            <p className="text-text-secondary leading-relaxed">
              Have a project in mind or just want to say hi? I&apos;m always
              open to new opportunities and interesting conversations.
            </p>

            <div className="space-y-4">
              {profile.socials.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 group"
                >
                  <div className="w-10 h-10 rounded-lg border border-border-default bg-bg-card flex items-center justify-center group-hover:border-gold/30 group-hover:bg-gold/[0.05] transition-all duration-200">
                    {social.icon === "github" && (
                      <FontAwesomeIcon icon={faGithub} className="h-4 w-4 text-text-secondary group-hover:text-gold transition-colors" />
                    )}
                    {social.icon === "twitter" && (
                      <svg
                        className="h-4 w-4 text-text-secondary group-hover:text-gold transition-colors"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    )}
                    {social.icon === "linkedin" && (
                      <svg
                        className="h-4 w-4 text-text-secondary group-hover:text-gold transition-colors"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    )}
                    {social.icon === "mail" && (
                      <FontAwesomeIcon icon={faEnvelope} className="h-4 w-4 text-text-secondary group-hover:text-gold transition-colors" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary group-hover:text-gold transition-colors">
                      {social.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {social.url.replace("https://", "")}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Right: Contact Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-xl border border-border-default bg-bg-card p-6"
          >
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1.5">
                Name
              </label>
              <Input id="name" placeholder="Your name" required />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1.5">
                Email
              </label>
              <Input id="email" type="email" placeholder="your@email.com" required />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-text-primary mb-1.5">
                Message
              </label>
              <Textarea id="message" placeholder="What's on your mind?" required />
            </div>
            <Button type="submit" variant="gold" className="w-full">
              {submitted ? (
                "Message Sent! ✓"
              ) : (
                <>
                  Send Message
                  <FontAwesomeIcon icon={faPaperPlane} className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
