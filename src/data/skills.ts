export interface Skill {
  name: string;
  level?: number;
}

export interface SkillCategory {
  category: string;
  skills: Skill[];
}

export const skillCategories: SkillCategory[] = [
  {
    category: "Frontend",
    skills: [
      { name: "React", level: 5 },
      { name: "TypeScript", level: 5 },
      { name: "Next.js", level: 4 },
      { name: "TailwindCSS", level: 5 },
      { name: "Vue.js", level: 3 },
    ],
  },
  {
    category: "Backend",
    skills: [
      { name: "Node.js", level: 4 },
      { name: "Python", level: 4 },
      { name: "PostgreSQL", level: 3 },
      { name: "Redis", level: 3 },
    ],
  },
  {
    category: "Tools",
    skills: [
      { name: "Git", level: 5 },
      { name: "Docker", level: 4 },
      { name: "AWS", level: 3 },
      { name: "Linux", level: 4 },
    ],
  },
  {
    category: "Design",
    skills: [
      { name: "Figma", level: 4 },
      { name: "UI/UX", level: 4 },
    ],
  },
];
