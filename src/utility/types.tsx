export type Interaction = {
  id: string;
  type: "note" | "email" | "meeting" | "system";
  timestamp: string; // ISO
  content: string;
  meta?: Record<string, any>;
};

export type Stage = "New" | "Contacted" | "Qualified" | "Meeting" | "Won" | "Lost";


export type Lead = {
  id: string;
  name: string;
  title?: string;
  company: string;
  email?: string;
  website?: string;
  industry?: string;
  size?: number; // employees
  revenue?: number; // $M
  techStack?: string[];
  location?: string;
  score: number; // 0..100
  stage: Stage;
  interactions: Interaction[];
};