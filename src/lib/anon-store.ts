// Local-only store for anonymous (not signed in) users during the beta.
// All data lives in localStorage and never touches the backend.

const PROFILE_KEY = "anon:profile";
const ASSESSMENTS_KEY = "anon:assessments";
const DAILY_KEY = "anon:daily";

export const ANON_DAILY_LIMIT = 3;

export type AnonProfile = {
  name: string;
  title: string;
  years_experience: number;
  skills: string[];
  roles: { title: string; company: string; duration: string }[];
  outcomes: string[];
  seniority_signals: string[];
  languages: string[];
  preferences: any;
  raw_text?: string;
};

export type AnonAssessment = {
  id: string;
  created_at: string;
  job_description: string;
  company: string | null;
  role_title: string | null;
  fit_score: number | null;
  fit_label: string | null;
  fit_summary: string | null;
  job_decoder: any;
  requirements: any;
  screening_risks: any;
  action_items: any;
  company_intel: any;
  intent_to_apply: boolean;
  status: string;
  feedback: Record<string, string>;
};

function safeRead<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ---------------- Profile ----------------
export function getAnonProfile(): AnonProfile | null {
  return safeRead<AnonProfile>(PROFILE_KEY);
}
export function saveAnonProfile(p: AnonProfile) {
  safeWrite(PROFILE_KEY, p);
}
export function clearAnonProfile() {
  if (typeof window !== "undefined") localStorage.removeItem(PROFILE_KEY);
}

// ---------------- Assessments ----------------
export function getAnonAssessments(): AnonAssessment[] {
  return safeRead<AnonAssessment[]>(ASSESSMENTS_KEY) ?? [];
}
export function getAnonAssessment(id: string): AnonAssessment | null {
  return getAnonAssessments().find((a) => a.id === id) ?? null;
}
export function saveAnonAssessment(a: AnonAssessment) {
  const all = getAnonAssessments();
  const idx = all.findIndex((x) => x.id === a.id);
  if (idx >= 0) all[idx] = a;
  else all.unshift(a);
  safeWrite(ASSESSMENTS_KEY, all);
}
export function updateAnonAssessment(id: string, patch: Partial<AnonAssessment>) {
  const cur = getAnonAssessment(id);
  if (!cur) return;
  saveAnonAssessment({ ...cur, ...patch });
}

// ---------------- Daily limit ----------------
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
export function getAnonDailyCount(): number {
  const r = safeRead<{ date: string; count: number }>(DAILY_KEY);
  if (!r || r.date !== todayKey()) return 0;
  return r.count;
}
export function getAnonDailyRemaining(): number {
  return Math.max(0, ANON_DAILY_LIMIT - getAnonDailyCount());
}
export function incrementAnonDaily() {
  const cur = getAnonDailyCount();
  safeWrite(DAILY_KEY, { date: todayKey(), count: cur + 1 });
}

export function newAnonId(): string {
  return "anon-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
