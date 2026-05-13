export type Preferences = {
  company_sizes: string[];          // e.g. ["Startup (<50)", "Scale-up (50-500)"]
  locations: string[];              // cities / regions / "Remote-EU"
  work_arrangement: string[];       // ["Remote", "Hybrid", "On-site"]
  travel_willingness: string;       // "None" | "Occasional (<25%)" | "Frequent (25-50%)" | "Heavy (>50%)"
  industries_preferred: string[];
  industries_avoid: string[];
  role_types: string[];             // ["IC", "Manager", "Director", "Exec"]
  compensation_min: string;         // free text e.g. "€90k base"
  deal_breakers: string[];
  motivations: string[];            // what they want from the next role
  notes: string;                    // free-form anything-else
};

export const emptyPreferences = (): Preferences => ({
  company_sizes: [],
  locations: [],
  work_arrangement: [],
  travel_willingness: "",
  industries_preferred: [],
  industries_avoid: [],
  role_types: [],
  compensation_min: "",
  deal_breakers: [],
  motivations: [],
  notes: "",
});

export const COMPANY_SIZES = ["Startup (<50)", "Scale-up (50-500)", "Mid-size (500-5k)", "Enterprise (5k+)"];
export const WORK_ARRANGEMENTS = ["Remote", "Hybrid", "On-site"];
export const TRAVEL_OPTIONS = ["None", "Occasional (<25%)", "Frequent (25-50%)", "Heavy (>50%)"];
export const ROLE_TYPES = ["IC", "Manager", "Director", "Exec"];

export const mergePreferences = (raw: any): Preferences => ({
  ...emptyPreferences(),
  ...(raw && typeof raw === "object" ? raw : {}),
});
