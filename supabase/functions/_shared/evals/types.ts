// Shared eval types for assess-job.

export type Scorer = "code" | "heuristic" | "llm_judge" | "human";

export interface Score {
  scorer: Scorer;
  name: string;
  value?: number;
  passed?: boolean;
  detail?: Record<string, unknown>;
}

export interface AssessOutput {
  company?: string | null;
  role_title?: string | null;
  fit_score?: number;
  fit_label?: string;
  fit_summary?: string;
  job_decoder?: Record<string, unknown>;
  requirements?: Array<{
    requirement: string;
    evidence: string;
    match_strength: "Strong" | "Partial" | "Gap" | string;
  }>;
  screening_risks?: string[];
  action_items?: Array<{
    title: string;
    detail: string;
    priority: "High" | "Medium" | "Low" | string;
    effort: "Quick" | "Medium" | "Deep" | string;
    addresses: string;
  }>;
  company_intel?: Record<string, unknown> | null;
}

export interface AssessContext {
  profile: Record<string, unknown> & {
    skills?: string[];
    languages?: Array<{ name?: string; proficiency?: string }>;
    preferences?: Record<string, unknown> & {
      deal_breakers?: string[] | string;
    };
  };
  jobDescription: string;
}
