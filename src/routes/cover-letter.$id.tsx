import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { requireAuth } from "@/lib/feature-flags";
import { AppHeader } from "@/components/AppHeader";
import { downloadCoverLetterPdf, coverLetterToText, type CoverLetter } from "@/lib/cover-letter";

export const Route = createFileRoute("/cover-letter/$id")({
  beforeLoad: requireAuth,
  component: CoverLetterPage,
});

const TONES = [
  { id: "professional", label: "Professional & human", hint: "Direct, warm, no corporate-speak" },
  { id: "warm", label: "Warm & personal", hint: "Friendlier, more first-person voice" },
  { id: "confident", label: "Confident & direct", hint: "Senior, assertive, outcome-led" },
  { id: "enthusiastic", label: "Enthusiastic", hint: "Energetic, mission-driven" },
];

function CoverLetterPage() {
  const { id } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [letter, setLetter] = useState<CoverLetter | null>(null);
  const [tone, setTone] = useState("professional");
  const [extraNotes, setExtraNotes] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [{ data: a }, { data: prof }] = await Promise.all([
          supabase.from("assessments").select("*").eq("id", id).maybeSingle(),
          supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        ]);
        if (!a || !prof) throw new Error("Missing data");
        setAssessment(a);
        setProfile(prof);
        if (a.cover_letter) setLetter(a.cover_letter as CoverLetter);
      } catch (e: any) {
        setError(e.message ?? "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const generate = async () => {
    if (!profile || !assessment) return;
    setGenerating(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("cover-letter", {
        body: {
          profile: {
            name: profile.name,
            title: profile.title,
            years_experience: profile.years_experience,
            skills: profile.skills,
            roles: profile.roles,
            outcomes: profile.outcomes,
            seniority_signals: profile.seniority_signals,
          },
          cvText: profile.raw_text,
          jobDescription: assessment.job_description,
          company: assessment.company,
          roleTitle: assessment.role_title,
          fitSummary: assessment.fit_summary,
          requirements: assessment.requirements,
          tone: TONES.find((t) => t.id === tone)?.label ?? tone,
          extraNotes,
        },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      setLetter(data.letter);
      await supabase.from("assessments").update({ cover_letter: data.letter }).eq("id", id);
    } catch (e: any) {
      setError(e.message ?? "Failed to generate cover letter");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!letter) return;
    await navigator.clipboard.writeText(coverLetterToText(letter));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-8 py-16">
        <Link to="/assessment/$id" params={{ id }} className="text-xs font-mono text-muted-foreground hover:text-foreground">
          ← Back to assessment
        </Link>

        <header className="mt-12">
          <div className="label-eyebrow">Cover letter · {assessment?.company || "—"}</div>
          <h1 className="font-display text-5xl mt-3 leading-[1.05]">
            {assessment?.role_title || "Tailored cover letter"}
          </h1>
          <p className="mt-6 text-muted-foreground max-w-2xl leading-relaxed">
            Generated from your CV, the job description, and this role's fit assessment. Truthful — nothing invented. Edit freely before sending.
          </p>
        </header>

        {/* Controls */}
        <section className="mt-12 border-t border-foreground pt-8">
          <div className="label-eyebrow mb-4">Tone</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TONES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                className={`text-left border p-4 transition-colors ${
                  tone === t.id ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/40"
                }`}
              >
                <div className="font-display text-sm">{t.label}</div>
                <div className="text-xs text-muted-foreground mt-1.5">{t.hint}</div>
              </button>
            ))}
          </div>

          <div className="mt-8">
            <div className="label-eyebrow mb-3">Anything specific to mention? <span className="text-muted-foreground/60">(optional)</span></div>
            <textarea
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              rows={3}
              placeholder="e.g. referral from X, relocating to NYC, particularly interested in their work on Y…"
              className="w-full bg-card border border-border focus:border-foreground p-3 text-sm focus:outline-none"
            />
          </div>

          <div className="mt-8 flex flex-wrap gap-4 items-center">
            <button
              onClick={generate}
              disabled={generating || loading}
              className="bg-foreground text-background px-6 py-3 hover:opacity-90 disabled:opacity-40"
            >
              {generating ? "Writing…" : letter ? "Regenerate cover letter ↻" : "Generate cover letter →"}
            </button>
            {letter && (
              <>
                <button
                  onClick={copyToClipboard}
                  className="text-sm underline underline-offset-4 hover:text-foreground text-muted-foreground"
                >
                  {copied ? "Copied ✓" : "Copy as text"}
                </button>
                <button
                  onClick={() => downloadCoverLetterPdf(letter, `${assessment?.company ?? "letter"}_${assessment?.role_title ?? ""}`)}
                  className="text-sm underline underline-offset-4 hover:text-foreground text-muted-foreground"
                >
                  Download PDF ↓
                </button>
              </>
            )}
          </div>

          {error && (
            <div className="mt-6 text-sm text-destructive border-l-2 border-destructive pl-3 py-1">
              {error}
            </div>
          )}
        </section>

        {/* Letter */}
        {generating && !letter && (
          <div className="mt-20 py-16 text-center font-serif-italic text-2xl text-muted-foreground animate-pulse">
            Drafting your cover letter…
          </div>
        )}

        {letter && (
          <section className="mt-16">
            {letter.rationale && (
              <div className="mb-8 border-l-2 border-foreground pl-4 py-2">
                <div className="label-eyebrow mb-1.5">The angle</div>
                <div className="text-sm text-muted-foreground italic leading-relaxed">{letter.rationale}</div>
              </div>
            )}

            {letter.subject_line && (
              <div className="mb-6 flex items-baseline gap-3">
                <span className="label-eyebrow">Subject</span>
                <input
                  value={letter.subject_line}
                  onChange={(e) => setLetter({ ...letter, subject_line: e.target.value })}
                  className="flex-1 bg-transparent font-display text-lg border-b border-border focus:border-foreground focus:outline-none pb-1"
                />
              </div>
            )}

            <div className="border border-border bg-card p-8 md:p-12 space-y-5">
              <input
                value={letter.greeting}
                onChange={(e) => setLetter({ ...letter, greeting: e.target.value })}
                className="w-full bg-transparent text-base focus:outline-none"
              />
              {letter.paragraphs.map((p, i) => (
                <textarea
                  key={i}
                  value={p}
                  onChange={(e) => {
                    const next = [...letter.paragraphs];
                    next[i] = e.target.value;
                    setLetter({ ...letter, paragraphs: next });
                  }}
                  rows={Math.max(3, Math.ceil(p.length / 80))}
                  className="w-full bg-transparent text-base leading-relaxed focus:outline-none resize-none"
                />
              ))}
              <div className="pt-4">
                <input
                  value={letter.closing}
                  onChange={(e) => setLetter({ ...letter, closing: e.target.value })}
                  className="w-full bg-transparent text-base focus:outline-none"
                />
                <input
                  value={letter.signature}
                  onChange={(e) => setLetter({ ...letter, signature: e.target.value })}
                  className="w-full bg-transparent font-display text-lg focus:outline-none mt-1"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={async () => {
                  await supabase.from("assessments").update({ cover_letter: letter }).eq("id", id);
                }}
                className="text-xs font-mono text-muted-foreground hover:text-foreground"
              >
                Save edits
              </button>
            </div>
          </section>
        )}

        {!letter && !generating && !loading && (
          <div className="mt-20 py-16 text-center text-muted-foreground border border-dashed border-border">
            Pick a tone above and hit <span className="font-mono">Generate</span> to draft your letter.
          </div>
        )}
      </main>
    </div>
  );
}
