import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/evals")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  component: AdminEvals,
});

type Tab = "queue" | "runs" | "notes" | "datasets";

function AdminEvals() {
  const [tab, setTab] = useState<Tab>("queue");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-6xl py-8">
        <h1 className="text-3xl font-bold mb-6">Evals — assess-job</h1>
        <div className="flex gap-2 mb-6 border-b">
          {(["queue", "runs", "notes", "datasets"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "queue" ? "Review queue" : t === "runs" ? "Runs" : t === "notes" ? "Prompt-fix notes" : "Datasets"}
            </button>
          ))}
        </div>
        {tab === "queue" && <QueueTab />}
        {tab === "runs" && <RunsTab />}
        {tab === "notes" && <NotesTab />}
        {tab === "datasets" && <DatasetsTab />}
      </main>
    </div>
  );
}

// ---------- Queue ----------

function QueueTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("eval_review_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100);
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (items.length === 0) return <p className="text-muted-foreground">Queue empty.</p>;

  return (
    <div className="space-y-4">
      {items.map((item) => <QueueItem key={item.id} item={item} onResolved={load} />)}
    </div>
  );
}

function QueueItem({ item, onResolved }: { item: any; onResolved: () => void }) {
  const [run, setRun] = useState<any>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [assessment, setAssessment] = useState<any>(null);
  const [verdict, setVerdict] = useState<"good" | "bad" | "needs_prompt_fix">("needs_prompt_fix");
  const [note, setNote] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      if (item.run_id) {
        const [{ data: r }, { data: s }] = await Promise.all([
          supabase.from("eval_runs").select("*").eq("id", item.run_id).maybeSingle(),
          supabase.from("eval_scores").select("*").eq("run_id", item.run_id),
        ]);
        setRun(r);
        setScores(s ?? []);
      }
      if (item.assessment_id) {
        const { data: a } = await supabase
          .from("assessments")
          .select("id, company, role_title, fit_score, fit_label, fit_summary, requirements, job_description")
          .eq("id", item.assessment_id)
          .maybeSingle();
        setAssessment(a);
      }
    })();
  }, [item.id, item.run_id, item.assessment_id]);

  const submit = async () => {
    const { error } = await supabase
      .from("eval_review_queue")
      .update({
        status: "reviewed",
        verdict,
        prompt_fix_note: note || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    onResolved();
  };

  const dismiss = async () => {
    await supabase.from("eval_review_queue").update({ status: "dismissed", reviewed_at: new Date().toISOString() }).eq("id", item.id);
    onResolved();
  };

  const failed = scores.filter((s) => s.passed === false);

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex justify-between items-start gap-4 mb-2">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
          <p className="font-mono text-sm break-all">{item.reason}</p>
          {assessment && (
            <p className="text-sm mt-1">
              {assessment.company ?? "?"} — {assessment.role_title ?? "?"} · score {assessment.fit_score} ({assessment.fit_label})
            </p>
          )}
        </div>
        <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Hide" : "Details"}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 text-sm">
          {failed.length > 0 && (
            <div>
              <p className="font-medium mb-1">Failed checks:</p>
              <ul className="list-disc pl-5 space-y-1">
                {failed.map((s) => (
                  <li key={s.id} className="font-mono text-xs">
                    {s.scorer}.{s.name}
                    {s.detail && <span className="text-muted-foreground"> — {JSON.stringify(s.detail).slice(0, 200)}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {assessment?.fit_summary && (
            <div>
              <p className="font-medium mb-1">Fit summary:</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{assessment.fit_summary}</p>
            </div>
          )}
          {run?.output && (
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground">Full output JSON</summary>
              <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-h-64">{JSON.stringify(run.output, null, 2)}</pre>
            </details>
          )}
        </div>
      )}

      <div className="mt-4 space-y-2">
        <div className="flex gap-2">
          {(["good", "bad", "needs_prompt_fix"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVerdict(v)}
              className={`text-xs px-3 py-1 rounded border ${verdict === v ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
            >
              {v.replace("_", " ")}
            </button>
          ))}
        </div>
        {verdict === "needs_prompt_fix" && (
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What should the Langfuse prompt change to fix this? (e.g. 'model keeps marking German as Gap when candidate is C1 — strengthen language-check instruction')"
            className="text-sm"
            rows={3}
          />
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={submit}>Save verdict</Button>
          <Button size="sm" variant="ghost" onClick={dismiss}>Dismiss</Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Runs ----------

function RunsTab() {
  const [runs, setRuns] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("eval_runs").select("id, case_id, prompt_label, model, latency_ms, created_at, error").order("created_at", { ascending: false }).limit(50).then(({ data }) => setRuns(data ?? []));
  }, []);
  return (
    <div className="space-y-2">
      {runs.map((r) => (
        <div key={r.id} className="border rounded p-3 text-sm flex justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{r.id.slice(0, 8)} · {new Date(r.created_at).toLocaleString()}</p>
            <p>{r.case_id ? `case ${r.case_id.slice(0,8)}` : "inline"} · {r.model ?? "?"} · {r.latency_ms ?? "?"}ms{r.error ? ` · ERROR: ${r.error}` : ""}</p>
          </div>
        </div>
      ))}
      {runs.length === 0 && <p className="text-muted-foreground">No runs yet.</p>}
    </div>
  );
}

// ---------- Prompt-fix notes ----------

function NotesTab() {
  const [notes, setNotes] = useState<any[]>([]);
  useEffect(() => {
    supabase
      .from("eval_review_queue")
      .select("id, reason, prompt_fix_note, reviewed_at, assessment_id, run_id")
      .eq("verdict", "needs_prompt_fix")
      .not("prompt_fix_note", "is", null)
      .order("reviewed_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setNotes(data ?? []));
  }, []);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Use these to update prompts in Langfuse manually.</p>
      {notes.map((n) => (
        <div key={n.id} className="border-l-2 border-primary pl-4 py-2">
          <p className="text-xs text-muted-foreground">{n.reviewed_at && new Date(n.reviewed_at).toLocaleString()}</p>
          <p className="text-sm whitespace-pre-wrap">{n.prompt_fix_note}</p>
          <p className="text-xs text-muted-foreground mt-1 font-mono">{n.reason}</p>
        </div>
      ))}
      {notes.length === 0 && <p className="text-muted-foreground">No prompt-fix notes yet.</p>}
    </div>
  );
}

// ---------- Datasets ----------

function DatasetsTab() {
  const [cases, setCases] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [profileText, setProfileText] = useState("");
  const [jd, setJd] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    const { data } = await supabase.from("eval_cases").select("id, tags, source, notes, created_at").order("created_at", { ascending: false });
    setCases(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const addCase = async () => {
    let profile: any;
    try { profile = JSON.parse(profileText); } catch { toast.error("Profile must be valid JSON"); return; }
    const { error } = await supabase.from("eval_cases").insert({ profile, job_description: jd, notes, source: "seed" });
    if (error) { toast.error(error.message); return; }
    toast.success("Case added");
    setProfileText(""); setJd(""); setNotes("");
    load();
  };

  const runAll = async () => {
    setRunning(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-evals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (!res.ok) toast.error(body.error ?? "Failed");
      else toast.success(`Ran ${body.runs?.length ?? 0} cases`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{cases.length} case(s)</p>
        <Button onClick={runAll} disabled={running || cases.length === 0}>{running ? "Running…" : "Run all cases"}</Button>
      </div>

      <div className="space-y-2">
        {cases.map((c) => (
          <div key={c.id} className="border rounded p-3 text-sm">
            <p className="font-mono text-xs text-muted-foreground">{c.id.slice(0, 8)} · {c.source} · {new Date(c.created_at).toLocaleString()}</p>
            {c.notes && <p className="mt-1">{c.notes}</p>}
            {c.tags?.length > 0 && <p className="text-xs text-muted-foreground mt-1">tags: {c.tags.join(", ")}</p>}
          </div>
        ))}
      </div>

      <div className="border-t pt-6 space-y-3">
        <h3 className="font-medium">Add case</h3>
        <Textarea value={profileText} onChange={(e) => setProfileText(e.target.value)} placeholder='Profile JSON (e.g. {"name":"…","skills":["…"],"languages":[]})' rows={6} className="font-mono text-xs" />
        <Textarea value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Job description" rows={6} />
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} />
        <Button onClick={addCase} disabled={!profileText || !jd}>Add</Button>
      </div>
    </div>
  );
}
