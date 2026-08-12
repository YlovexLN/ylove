export interface TimelineItem {
  date: string;
  title: string;
  subtitle: string;
  description: string;
  type: "work" | "education";
}

export const timelineItems: TimelineItem[] = [
  {
    date: "2024 - Present",
    title: "Senior Developer",
    subtitle: "Tech Company",
    description:
      "Leading frontend architecture and mentoring junior developers. Driving adoption of modern web standards and best practices.",
    type: "work",
  },
  {
    date: "2022 - 2024",
    title: "Full-Stack Developer",
    subtitle: "Startup Studio",
    description:
      "Built and shipped multiple web applications from concept to production. Worked across the entire stack.",
    type: "work",
  },
  {
    date: "2020 - 2022",
    title: "Junior Developer",
    subtitle: "Digital Agency",
    description:
      "Developed responsive websites and web applications for diverse clients. Gained expertise in React and Node.js.",
    type: "work",
  },
  {
    date: "2016 - 2020",
    title: "B.S. Computer Science",
    subtitle: "University",
    description:
      "Focused on software engineering, algorithms, and human-computer interaction. Dean's list recipient.",
    type: "education",
  },
];
