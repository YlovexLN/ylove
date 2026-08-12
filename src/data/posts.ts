export interface Post {
  date: string;
  title: string;
  summary: string;
  url?: string;
}

export const posts: Post[] = [
  {
    date: "2025-12-15",
    title: "Building with Astro and React",
    summary:
      "How I built this portfolio using Astro's islands architecture and React components for interactivity.",
    url: "#",
  },
  {
    date: "2025-11-20",
    title: "Pure Black Design System",
    summary:
      "A deep dive into creating a cohesive dark theme with proper contrast, hierarchy, and accent colors.",
    url: "#",
  },
  {
    date: "2025-10-08",
    title: "Optimizing Web Performance",
    summary:
      "Techniques for achieving perfect Lighthouse scores with modern static site generation.",
    url: "#",
  },
];
