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
        <Link to="/" className="font-display text-xl tracking-tight">
          Hindsight
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <a href="#funnel" className="hidden sm:inline text-muted-foreground hover:text-foreground">
            The funnel
          </a>
          <a href="#how" className="hidden sm:inline text-muted-foreground hover:text-foreground">
            How it works
          </a>
          <a href="#waitlist" className="hidden sm:inline text-muted-foreground hover:text-foreground">
            Waitlist
          </a>
          {authed ? (
            <Link to="/dashboard" className="bg-foreground text-background px-4 py-2 hover:opacity-90">
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

// Modeled on a typical PM hiring funnel: 200 CVs → 1 offer.
const TYPICAL_FUNNEL = [
  { label: "CVs sent", count: 200, conv: null,  cost: "30 sec each" },
  { label: "Phone screen", count: 20, conv: "10%", cost: "20 min" },
  { label: "Hiring manager", count: 10, conv: "50%", cost: "45 min" },
  { label: "Second round", count: 6, conv: "60%", cost: "45 min" },
  { label: "Final round", count: 3, conv: "50%", cost: "60 min" },
  { label: "Offer", count: 1, conv: "33%", cost: "—" },
];

// Same shape, but with the reasons surfaced — what Hindsight gives you.
const HINDSIGHT_FUNNEL = [
  { label: "CVs sent", count: 200, conv: null,  reason: "Start" },
  { label: "Phone screen", count: 20, conv: "10%", reason: "CV doesn't match the JD's actual priorities" },
  { label: "Hiring manager", count: 10, conv: "50%", reason: "Recruiter pitch is generic · salary mismatch" },
  { label: "Second round", count: 6, conv: "60%", reason: "Story doesn't land · weak 'why this company'" },
  { label: "Final round", count: 3, conv: "50%", reason: "Specific competency gap (system design, case)" },
  { label: "Offer", count: 1, conv: "33%", reason: "Negotiation, competing offers, scope concerns" },
];

function Funnel() {
  const max = TYPICAL_FUNNEL[0].count;
  return (
    <section id="funnel" className="border-b border-border">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">
        <div className="label-eyebrow">Why most job searches feel impossible</div>
        <h2 className="font-display text-4xl md:text-6xl mt-4 max-w-3xl leading-[1.05]">
          200 CVs in. <span className="font-serif-italic">1 offer out.</span>
        </h2>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
          Hiring is a series of filters. Each round drops most candidates. The math is
          brutal — and most job seekers can't see it, let alone fix it.
        </p>

        {/* Diagram 1: the typical funnel */}
        <div className="mt-16 border border-border bg-card p-6 md:p-10">
          <div className="flex items-baseline justify-between gap-4 mb-8">
            <div>
              <div className="label-eyebrow">Diagram 01</div>
              <h3 className="font-display text-2xl mt-1">The typical hiring funnel</h3>
            </div>
            <div className="text-xs font-mono text-muted-foreground hidden sm:block">
              candidates remaining at each stage
            </div>
          </div>

          <div className="space-y-2">
            {TYPICAL_FUNNEL.map((s, i) => {
              const width = (s.count / max) * 100;
              return (
                <div key={s.label} className="grid grid-cols-12 gap-3 md:gap-6 items-center">
                  <div className="col-span-12 md:col-span-3 flex items-baseline gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground w-5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display text-base md:text-lg">{s.label}</span>
                    <span className="font-mono text-[10px] text-muted-foreground hidden md:inline">
                      · {s.cost}
                    </span>
                  </div>
                  <div className="col-span-9 md:col-span-7">
                    <div
                      className="bg-foreground text-background h-9 flex items-center px-3 transition-all"
                      style={{ width: `${Math.max(width, 2)}%`, minWidth: "44px" }}
                    >
                      <span className="font-mono text-xs tabular-nums">{s.count}</span>
                    </div>
                  </div>
                  <div className="col-span-3 md:col-span-2 font-mono text-xs tabular-nums text-muted-foreground text-right md:text-left">
                    {s.conv ? `→ ${s.conv}` : "start"}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-border grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <div className="label-eyebrow">From a blind application</div>
              <p className="mt-2 font-display text-xl">
                <span className="font-serif-italic">&lt; 1%</span> chance of an offer.
              </p>
            </div>
            <div>
              <div className="label-eyebrow">From a hiring-manager intro</div>
              <p className="mt-2 font-display text-xl">
                <span className="font-serif-italic">~10%</span> chance of an offer.
              </p>
            </div>
          </div>
        </div>

        {/* The pivot */}
        <div className="mt-20 max-w-2xl">
          <div className="label-eyebrow">What Hindsight does</div>
          <h3 className="font-display text-3xl md:text-4xl mt-4 leading-[1.1]">
            We can't change the funnel.{" "}
            <span className="font-serif-italic">We can change what you do at every stage.</span>
          </h3>
          <p className="mt-6 text-muted-foreground leading-relaxed">
            For every job you apply to, Hindsight measures where you are in the funnel,
            why you dropped out, and what to fix before the next application.
          </p>
        </div>

        {/* Diagram 2: the same funnel, with reasons */}
        <div className="mt-12 border border-foreground bg-foreground text-background p-6 md:p-10">
          <div className="flex items-baseline justify-between gap-4 mb-8">
            <div>
              <div className="label-eyebrow !text-background/60">Diagram 02</div>
              <h3 className="font-display text-2xl mt-1">Your funnel, with Hindsight</h3>
            </div>
            <div className="text-xs font-mono text-background/60 hidden sm:block">
              same shape — now you can see the why
            </div>
          </div>

          <div className="space-y-2">
            {HINDSIGHT_FUNNEL.map((s, i) => {
              const width = (s.count / max) * 100;
              return (
                <div key={s.label} className="grid grid-cols-12 gap-3 md:gap-6 items-center">
                  <div className="col-span-12 md:col-span-3 flex items-baseline gap-2">
                    <span className="font-mono text-[10px] text-background/60 w-5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display text-base md:text-lg">{s.label}</span>
                  </div>
                  <div className="col-span-4 md:col-span-3">
                    <div
                      className="bg-background text-foreground h-9 flex items-center px-3 transition-all"
                      style={{ width: `${Math.max(width, 4)}%`, minWidth: "44px" }}
                    >
                      <span className="font-mono text-xs tabular-nums">{s.count}</span>
                    </div>
                  </div>
                  <div className="col-span-8 md:col-span-6 text-sm text-background/80">
                    {i === 0 ? (
                      <span className="font-mono text-[10px] text-background/60">START</span>
                    ) : (
                      <>
                        <span className="font-serif-italic text-background">where you lose people:</span>{" "}
                        {s.reason}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10 text-sm text-muted-foreground max-w-2xl">
          <span className="font-serif-italic text-foreground">Most candidates obsess over the top —</span>{" "}
          sending more CVs. But sending 400 instead of 200 won't help if your CV-to-screen rate
          is the real problem. We help you find it.
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Mock product screens ───────────────────────── */

function Screens() {
  return (
    <section className="border-b border-border bg-surface/40">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">
        <div className="label-eyebrow">Inside the product</div>
        <h2 className="font-display text-4xl md:text-6xl mt-4 max-w-3xl leading-[1.05]">
          Three views, <span className="font-serif-italic">one promise</span>.
        </h2>

        <div className="mt-16 grid md:grid-cols-3 gap-8">
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
      <div className="border border-border bg-card aspect-[4/3] p-5 overflow-hidden relative">
        {children}
      </div>
      <div className="mt-5 flex items-baseline gap-3">
        <span className="font-mono text-xs text-muted-foreground">{number}</span>
        <h3 className="font-display text-xl">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{blurb}</p>
    </div>
  );
}

function FitScoreMock() {
  return (
    <div className="h-full flex flex-col">
      <div className="label-eyebrow">Fit score</div>
      <div className="flex items-baseline gap-3 mt-2">
        <span className="font-display text-6xl tabular-nums">42</span>
        <span className="font-serif-italic text-base text-muted-foreground">weak fit</span>
      </div>
      <div className="editorial-rule mt-3" />
      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
        Senior IC role, but the JD repeatedly emphasizes managing ICs. Your CV shows 6 yrs IC + 0 reports.
        Don't apply blind — either find a hiring manager referral or skip.
      </p>
      <div className="mt-auto pt-3 flex gap-1.5">
        <span className="label-tag !text-[9px]">Skip</span>
        <span className="label-tag !text-[9px]">Refer first</span>
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
      <div className="label-eyebrow">Last 90 days</div>
      <div className="mt-2 space-y-1.5">
        {stages.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground w-14">{s.label}</span>
            <div
              className="bg-foreground h-5 flex items-center px-1.5"
              style={{ width: `${s.w}%`, minWidth: "20px" }}
            >
              <span className="text-[10px] font-mono text-background tabular-nums">{s.n}</span>
            </div>
            {i > 0 && (
              <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                {Math.round((s.n / stages[i - 1].n) * 100) || 0}%
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="editorial-rule mt-3" />
      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
        <span className="text-foreground font-serif-italic">Where you're losing offers:</span> Applied → Screen (17%).
        Below the senior-IC benchmark of 22%.
      </p>
    </div>
  );
}

function DiagnosisMock() {
  return (
    <div className="h-full flex flex-col">
      <div className="label-eyebrow">Why you got rejected</div>
      <div className="font-display text-base mt-2 leading-tight">
        Stripe · Senior PM
      </div>
      <div className="text-[10px] font-mono text-muted-foreground">After onsite · 11d ago</div>
      <div className="editorial-rule mt-3" />
      <ul className="mt-3 space-y-2 text-[11px] leading-snug">
        <li className="flex gap-2">
          <span className="font-mono text-muted-foreground">01</span>
          <span>Recruiter cited <span className="font-serif-italic">"depth on payments"</span> — your CV led with growth.</span>
        </li>
        <li className="flex gap-2">
          <span className="font-mono text-muted-foreground">02</span>
          <span>3rd "why Stripe?" answer was generic. Pattern across 4 onsites.</span>
        </li>
      </ul>
      <div className="mt-auto pt-3">
        <span className="label-tag !text-[9px]">Fix next</span>
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
        <div className="label-eyebrow">How it works</div>
        <h2 className="font-display text-4xl md:text-6xl mt-4 max-w-3xl leading-[1.05]">
          Three steps. <span className="font-serif-italic">No fluff.</span>
        </h2>

        <div className="mt-16 grid md:grid-cols-3 gap-12">
          {steps.map((s) => (
            <div key={s.n}>
              <div className="font-mono text-xs text-muted-foreground">{s.n}</div>
              <h3 className="font-display text-2xl mt-3">{s.title}</h3>
              <p className="mt-4 text-muted-foreground leading-relaxed">{s.body}</p>
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
        <div className="label-eyebrow !text-background/60">Stay in the loop</div>
        <h2 className="font-display text-4xl md:text-6xl mt-4 leading-[1.05]">
          Get early access to the <span className="font-serif-italic">funnel</span>.
        </h2>
        <p className="mt-6 text-lg text-background/70 max-w-xl leading-relaxed">
          The fit score is live. Funnel tracking and rejection diagnosis ship next.
          Drop your email — we'll let you know when it's ready.
        </p>

        {state === "ok" ? (
          <div className="mt-12 border border-background/30 p-8">
            <div className="label-eyebrow !text-background/60">You're in</div>
            <p className="font-display text-2xl mt-2">Thanks. We'll be in touch.</p>
            <p className="text-background/70 mt-3 text-sm">
              Want to try the fit score now?{" "}
              <Link to="/onboarding" className="underline underline-offset-4">
                Start free →
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-12 space-y-6">
            <div>
              <div className="label-eyebrow !text-background/60 mb-2">Email</div>
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
              <div className="label-eyebrow !text-background/60 mb-2">
                What stage are you at? (optional)
              </div>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Senior PM, ~80 apps in, 5 offers, lots of ghosting"
                disabled={state === "loading"}
                className="w-full bg-transparent border-b border-background/40 focus:border-background py-3 text-base focus:outline-none transition-colors text-background placeholder:text-background/40"
              />
            </div>
            {err && (
              <div className="text-sm text-background/90 border-l-2 border-background pl-3 py-1">
                {err}
              </div>
            )}
            <button
              type="submit"
              disabled={state === "loading"}
              className="bg-background text-foreground px-8 py-4 text-base hover:opacity-90 transition disabled:opacity-50"
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
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 flex flex-col sm:flex-row items-baseline justify-between gap-4 text-xs font-mono text-muted-foreground">
        <div>Hindsight · Beta · {new Date().getFullYear()}</div>
        <div className="flex gap-6">
          <Link to="/auth" className="hover:text-foreground">Sign in</Link>
          <Link to="/onboarding" className="hover:text-foreground">Try free</Link>
        </div>
      </div>
    </footer>
  );
}
