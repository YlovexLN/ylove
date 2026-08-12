export interface Project {
  title: string;
  description: string;
  image?: string;
  tags: string[];
  url?: string;
  github?: string;
}

export const projects: Project[] = [
  {
    title: "Portfolio Platform",
    description:
      "A modern portfolio platform built with Astro and React, featuring a modular component system and dark theme.",
    tags: ["Astro", "React", "TailwindCSS"],
    url: "#",
    github: "#",
  },
  {
    title: "E-Commerce Dashboard",
    description:
      "Real-time analytics dashboard for e-commerce platforms with interactive charts and data visualization.",
    tags: ["Next.js", "D3.js", "PostgreSQL"],
    url: "#",
    github: "#",
  },
  {
    title: "AI Chat Interface",
    description:
      "Intelligent chat interface with streaming responses, markdown rendering, and conversation history.",
    tags: ["React", "WebSocket", "OpenAI"],
    url: "#",
    github: "#",
  },
  {
    title: "Task Management App",
    description:
      "Collaborative task management tool with drag-and-drop boards, real-time updates, and team features.",
    tags: ["Vue.js", "Socket.io", "MongoDB"],
    url: "#",
    github: "#",
  },
];
