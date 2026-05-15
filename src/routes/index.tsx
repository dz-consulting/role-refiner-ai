import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hindsight — From applied to offer, with a plan" },
      {
        name: "description",
        content:
          "Most job searches are pure luck and persistence. Yours doesn't have to be. Track every application, learn from every rejection, and close the gaps that stand between you and the offer.",
      },
      { property: "og:title", content: "Hindsight — From applied to offer, with a plan" },
      {
        property: "og:description",
        content:
          "Track every application. Learn from every rejection. Close the gaps that stand between you and the offer.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const nav = useNavigate();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
  }, []);

  return (
    <div className="min-h-screen">
      <Nav authed={authed} />
      <Hero authed={authed} onCta={() => nav({ to: authed ? "/dashboard" : "/onboarding" })} />
      <Funnel />
      <Screens />
      <HowItWorks />
      <Waitlist />
      <Footer />
    </div>
  );
}

/* ───────────────────────── Nav ───────────────────────── */

function Nav({ authed }: { authed: boolean }) {
  return (
    <header className="border-b border-border">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">
        <Link to="/" className="font-display text-2xl tracking-tight">
          Hindsight
        </Link>
        <nav className="flex items-center gap-7 text-base">
          <a href="#funnel" className="hidden sm:inline text-foreground/70 hover:text-foreground">
            The funnel
          </a>
          <a href="#how" className="hidden sm:inline text-foreground/70 hover:text-foreground">
            How it works
          </a>
          <a href="#waitlist" className="hidden sm:inline text-foreground/70 hover:text-foreground">
            Waitlist
          </a>
          {authed ? (
            <Link to="/dashboard" className="bg-foreground text-background px-5 py-2.5 hover:opacity-90 rounded-full text-sm font-medium">
              Dashboard →
            </Link>
          ) : (
            <Link to="/auth" className="text-foreground hover:underline underline-offset-4">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

/* ───────────────────────── Hero ───────────────────────── */

function Hero({ authed, onCta }: { authed: boolean; onCta: () => void }) {
  return (
    <section className="border-b border-border">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-20 md:py-28 grid md:grid-cols-12 gap-12 items-center">
        <div className="md:col-span-7">
          <div className="label-eyebrow-muted">Beta · Free during launch</div>
          <h1 className="font-display text-6xl md:text-8xl mt-5 leading-[0.95]">
            From <span className="font-serif-italic">applied</span> to{" "}
            <span className="font-serif-italic">offer</span>, with a plan.
          </h1>
          <p className="mt-8 text-xl md:text-2xl text-foreground/80 leading-snug max-w-xl font-light">
            Most job searches are pure luck. Yours doesn&apos;t have to be.
            Track every application, learn from every rejection, close the gaps
            standing between you and the offer.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <button
              onClick={onCta}
              className="bg-foreground text-background px-8 py-4 text-base font-medium hover:opacity-90 transition rounded-full"
            >
              {authed ? "Open dashboard →" : "Try free — no signup →"}
            </button>
            <a
              href="#waitlist"
              className="border border-foreground text-foreground px-8 py-4 text-base font-medium text-center hover:bg-foreground hover:text-background transition rounded-full"
            >
              Join the waitlist
            </a>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            3 free assessments per day. No card required.
          </p>
        </div>

        {/* Hero visual: concept diagram — 200 CVs collapse into 1 offer */}
        <div className="md:col-span-5">
          <ConceptVisual />
        </div>
      </div>
    </section>
  );
}

/* ───────────────── Concept visual: 200 → 1 ───────────────── */

function ConceptVisual() {
  // 10x20 grid of dots = 200 CVs, with a single highlighted "offer"
  const dots = Array.from({ length: 200 });
  return (
    <div className="border border-foreground bg-card p-8 md:p-10">
      <div className="label-eyebrow-muted">The hard truth</div>
      <p className="font-display text-2xl md:text-3xl mt-3 leading-[1.1]">
        200 applications. <span className="font-serif-italic">1 offer.</span>
      </p>

      <div className="mt-7 grid grid-cols-[repeat(20,minmax(0,1fr))] gap-[3px]">
        {dots.map((_, i) => {
          const isOffer = i === 137; // arbitrary highlighted dot
          return (
            <div
              key={i}
              className={
                isOffer
                  ? "aspect-square bg-foreground"
                  : "aspect-square bg-foreground/15"
              }
            />
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3 text-sm text-foreground/70">
        <span className="inline-block w-3 h-3 bg-foreground" />
        <span>
          The 1 offer you can&apos;t see coming —{" "}
          <span className="text-foreground font-medium">until you do</span>.
        </span>
      </div>
    </div>
  );
}

/* ───────────────────────── Funnel teaching diagram ───────────────────────── */

// Same candidate, same 200 applications. What changes is what they do at each stage.
const STAGES = [
  {
    label: "CV → Screen",
    solo: 10,
    with: 25,
    guess: "Ghosted. CV? JD fit? ATS? You'll never know.",
    diagnosis: "Fit score on every JD before you apply. CV gaps flagged against the actual requirements.",
  },
  {
    label: "Screen → Hiring manager",
    solo: 50,
    with: 70,
    guess: "Recruiter passed. They didn't say why. You wing the next one the same way.",
    diagnosis: "Recruiter-call brief per role: comp range, scope traps, 'why now' — locked before you dial in.",
  },
  {
    label: "HM → Second round",
    solo: 60,
    with: 75,
    guess: "'Not quite the right fit.' What does that mean? Move on.",
    diagnosis: "Pattern across rejections — the exact signal you're missing for this kind of company.",
  },
  {
    label: "Second → Final",
    solo: 50,
    with: 70,
    guess: "Loop tanked on something. System design? Stakeholder demo? Unclear.",
    diagnosis: "The exact competency gap, named — drilled before the next loop.",
  },
  {
    label: "Final → Offer",
    solo: 33,
    with: 55,
    guess: "One offer, no leverage. Take what they give you.",
    diagnosis: "Comp comps and a real BATNA from parallel processes you ran on purpose.",
  },
];

const SOLO_OFFERS = 1;
const WITH_OFFERS = 10;

function Funnel() {
  return (
    <section id="funnel" className="border-b border-border">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-20 md:py-28">
        <div className="label-eyebrow-muted">Your job search is a funnel</div>
        <h2 className="font-display text-5xl md:text-7xl mt-5 max-w-3xl leading-[1.0]">
          Stop guessing why you got <span className="font-serif-italic">rejected</span>.
        </h2>
        <p className="mt-6 max-w-2xl text-lg md:text-xl text-foreground/70 leading-snug font-light">
          Every job search has five stages. Most people lose offers at every one
          and never know which. Hindsight tracks the funnel and tells you, at each
          stage, <span className="font-serif-italic text-foreground">exactly why you fell out</span> — and what to do
          about it before the next application.
        </p>

        {/* Split-screen comparison */}
        <div className="mt-14 grid md:grid-cols-2 gap-px bg-border border border-border">
          {/* WITHOUT */}
          <div className="bg-card p-6 md:p-10">
            <div className="label-eyebrow-muted">Without Hindsight</div>
            <p className="font-display text-6xl md:text-7xl mt-3 tabular-nums leading-none">
              {SOLO_OFFERS} <span className="text-2xl md:text-3xl text-foreground/60 font-light">offer</span>
            </p>
            <p className="text-base text-foreground/70 mt-3 font-serif-italic">
              You guess. You apply. You get ghosted. You guess again.
            </p>

            <div className="mt-8 space-y-5">
              {STAGES.map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between items-baseline text-sm">
                    <span className="text-foreground/70">{s.label}</span>
                    <span className="tabular-nums font-medium text-foreground/70">{s.solo}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 bg-foreground/10">
                    <div className="h-full bg-foreground/40" style={{ width: `${s.solo}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-foreground/55 leading-snug">
                    <span className="text-foreground/70 font-medium">Why you failed: </span>
                    <span className="font-serif-italic">{s.guess}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* WITH */}
          <div className="bg-foreground text-background p-6 md:p-10">
            <div className="label-eyebrow-muted !text-background/60">With Hindsight</div>
            <p className="font-display text-6xl md:text-7xl mt-3 tabular-nums leading-none">
              {WITH_OFFERS} <span className="text-2xl md:text-3xl text-background/70 font-light">offers</span>
            </p>
            <p className="text-base text-background/80 mt-3 font-serif-italic">
              Every rejection becomes a data point. Every stage gets diagnosed.
            </p>

            <div className="mt-8 space-y-5">
              {STAGES.map((s) => {
                const delta = s.with - s.solo;
                return (
                  <div key={s.label}>
                    <div className="flex justify-between items-baseline text-sm">
                      <span className="text-background/80">{s.label}</span>
                      <span className="tabular-nums font-medium">
                        {s.with}%
                        <span className="font-serif-italic text-background/60 ml-2">+{delta}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-background/15">
                      <div className="h-full bg-background" style={{ width: `${s.with}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-background/75 leading-snug">
                      <span className="text-background font-medium">Hindsight tells you: </span>
                      {s.diagnosis}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <p className="mt-10 max-w-2xl text-lg text-foreground/70 leading-snug">
          <span className="font-serif-italic text-foreground">Five stages, five diagnoses.</span>{" "}
          Close the gaps you can name and the outcome isn&apos;t better — it&apos;s different.
        </p>
      </div>
    </section>
  );
}

/* ───────────────────────── Mock product screens ───────────────────────── */

function Screens() {
  return (
    <section className="border-b border-border bg-surface/40">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">
        <div className="label-eyebrow-muted">Inside the product</div>
        <h2 className="font-display text-5xl md:text-7xl mt-5 max-w-3xl leading-[1.0]">
          Three views, <span className="font-serif-italic">one promise</span>.
        </h2>

        <div className="mt-16 grid md:grid-cols-3 gap-10">
          <ScreenCard
            number="01"
            title="The fit score"
            blurb="Paste a JD, get an honest score in 60 seconds. No false hope."
          >
            <FitScoreMock />
          </ScreenCard>

          <ScreenCard
            number="02"
            title="Your funnel"
            blurb="Every application tracked. See exactly where offers slip away."
          >
            <FunnelMock />
          </ScreenCard>

          <ScreenCard
            number="03"
            title="The diagnosis"
            blurb="When you get rejected, we tell you why — and what to do next."
          >
            <DiagnosisMock />
          </ScreenCard>
        </div>
      </div>
    </section>
  );
}

function ScreenCard({
  number,
  title,
  blurb,
  children,
}: {
  number: string;
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="border border-border bg-card aspect-[4/3] p-6 overflow-hidden relative">
        {children}
      </div>
      <div className="mt-5 flex items-baseline gap-3">
        <span className="font-display text-base text-muted-foreground">{number}</span>
        <h3 className="font-display text-2xl">{title}</h3>
      </div>
      <p className="mt-3 text-base text-foreground/70 leading-snug">{blurb}</p>
    </div>
  );
}

function FitScoreMock() {
  return (
    <div className="h-full flex flex-col">
      <div className="label-eyebrow-muted">Fit score</div>
      <div className="flex items-baseline gap-3 mt-2">
        <span className="font-display text-7xl tabular-nums leading-none">42</span>
        <span className="font-serif-italic text-lg text-muted-foreground">weak fit</span>
      </div>
      <div className="editorial-rule mt-4" />
      <p className="mt-4 text-sm leading-snug text-foreground/80">
        Senior IC role, but the JD emphasizes managing ICs. Your CV shows 6 yrs IC + 0 reports.
        Don&apos;t apply blind — find a referral or skip.
      </p>
      <div className="mt-auto pt-4 flex gap-2">
        <span className="label-tag">Skip</span>
        <span className="label-tag">Refer first</span>
      </div>
    </div>
  );
}

function FunnelMock() {
  const stages = [
    { label: "Applied", n: 47, w: 100 },
    { label: "Screen", n: 8, w: 32 },
    { label: "Interview", n: 3, w: 18 },
    { label: "Offer", n: 0, w: 4 },
  ];
  return (
    <div className="h-full flex flex-col">
      <div className="label-eyebrow-muted">Last 90 days</div>
      <div className="mt-3 space-y-2">
        {stages.map((s, i) => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-16">{s.label}</span>
            <div
              className="bg-foreground h-6 flex items-center px-2"
              style={{ width: `${s.w}%`, minWidth: "28px" }}
            >
              <span className="text-xs font-medium text-background tabular-nums">{s.n}</span>
            </div>
            {i > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {Math.round((s.n / stages[i - 1].n) * 100) || 0}%
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="editorial-rule mt-4" />
      <p className="mt-3 text-sm leading-snug text-foreground/80">
        <span className="text-foreground font-serif-italic">Where you&apos;re losing offers:</span>{" "}
        Applied → Screen (17%). Below the senior-IC benchmark of 22%.
      </p>
    </div>
  );
}

function DiagnosisMock() {
  return (
    <div className="h-full flex flex-col">
      <div className="label-eyebrow-muted">Why you got rejected</div>
      <div className="font-display text-xl mt-2 leading-tight">Stripe · Senior PM</div>
      <div className="text-sm text-muted-foreground mt-1">After onsite · 11d ago</div>
      <div className="editorial-rule mt-4" />
      <ul className="mt-4 space-y-3 text-sm leading-snug">
        <li className="flex gap-3">
          <span className="text-muted-foreground">01</span>
          <span>Recruiter cited <span className="font-serif-italic">&ldquo;depth on payments&rdquo;</span> — your CV led with growth.</span>
        </li>
        <li className="flex gap-3">
          <span className="text-muted-foreground">02</span>
          <span>3rd &ldquo;why Stripe?&rdquo; answer was generic. Pattern across 4 onsites.</span>
        </li>
      </ul>
      <div className="mt-auto pt-4">
        <span className="label-tag">Fix next</span>
      </div>
    </div>
  );
}

/* ───────────────────────── How it works ───────────────────────── */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Upload your CV.",
      body: "One PDF. We extract roles, skills, outcomes — no forms to fill.",
    },
    {
      n: "02",
      title: "Assess every job.",
      body: "Paste a JD, get a fit score, decoded requirements, and screening risks before you apply.",
    },
    {
      n: "03",
      title: "Track the funnel.",
      body: "Mark each application's outcome. We surface where you're losing offers — and tell you what to do about it.",
    },
  ];
  return (
    <section id="how" className="border-b border-border">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">
        <div className="label-eyebrow-muted">How it works</div>
        <h2 className="font-display text-5xl md:text-7xl mt-5 max-w-3xl leading-[1.0]">
          Three steps. <span className="font-serif-italic">No fluff.</span>
        </h2>

        <div className="mt-16 grid md:grid-cols-3 gap-12">
          {steps.map((s) => (
            <div key={s.n}>
              <div className="font-display text-2xl text-muted-foreground">{s.n}</div>
              <h3 className="font-display text-3xl mt-3">{s.title}</h3>
              <p className="mt-4 text-lg text-foreground/70 leading-snug">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Waitlist ───────────────────────── */

function Waitlist() {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr("That doesn't look like a valid email.");
      return;
    }
    setState("loading");
    const { error } = await supabase
      .from("waitlist")
      .insert({ email: email.trim().toLowerCase(), note: note.trim() || null, source: "landing" });
    if (error) {
      // 23505 = unique violation — already on the list. Treat as success.
      if (error.code === "23505") {
        setState("ok");
        return;
      }
      setState("error");
      setErr(error.message);
      return;
    }
    setState("ok");
  };

  return (
    <section id="waitlist" className="border-b border-border bg-foreground text-background">
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-24 md:py-32">
        <div className="label-eyebrow-muted !text-background/60">Stay in the loop</div>
        <h2 className="font-display text-5xl md:text-7xl mt-5 leading-[1.0]">
          Get early access to <span className="font-serif-italic">Hindsight</span>.
        </h2>
        <p className="mt-6 text-xl text-background/70 max-w-xl leading-snug font-light">
          The fit score is live. Funnel tracking and rejection diagnosis ship next.
          Drop your email — we&apos;ll let you know when it&apos;s ready.
        </p>

        {state === "ok" ? (
          <div className="mt-12 border border-background/30 p-8">
            <div className="label-eyebrow-muted !text-background/60">You&apos;re in</div>
            <p className="font-display text-3xl mt-3">Thanks. We&apos;ll be in touch.</p>
            <p className="text-background/70 mt-4 text-base">
              Want to try the fit score now?{" "}
              <Link to="/onboarding" className="underline underline-offset-4">
                Start free →
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-12 space-y-8">
            <div>
              <div className="label-eyebrow-muted !text-background/60 mb-3">Email</div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={state === "loading"}
                className="w-full bg-transparent border-b border-background/40 focus:border-background py-3 text-lg focus:outline-none transition-colors text-background placeholder:text-background/40"
              />
            </div>
            <div>
              <div className="label-eyebrow-muted !text-background/60 mb-3">
                What stage are you at? (optional)
              </div>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Senior PM, ~80 apps in, lots of ghosting"
                disabled={state === "loading"}
                className="w-full bg-transparent border-b border-background/40 focus:border-background py-3 text-base focus:outline-none transition-colors text-background placeholder:text-background/40"
              />
            </div>
            {err && (
              <div className="text-base text-background/90 border-l-2 border-background pl-3 py-1">
                {err}
              </div>
            )}
            <button
              type="submit"
              disabled={state === "loading"}
              className="bg-background text-foreground px-8 py-4 text-base font-medium hover:opacity-90 transition disabled:opacity-50 rounded-full"
            >
              {state === "loading" ? "..." : "Join the waitlist →"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────── Footer ───────────────────────── */

function Footer() {
  return (
    <footer>
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 flex flex-col sm:flex-row items-baseline justify-between gap-4 text-sm text-muted-foreground">
        <div>Hindsight · Beta · {new Date().getFullYear()}</div>
        <div className="flex gap-6">
          <Link to="/auth" className="hover:text-foreground">Sign in</Link>
          <Link to="/onboarding" className="hover:text-foreground">Try free</Link>
        </div>
      </div>
    </footer>
  );
}
