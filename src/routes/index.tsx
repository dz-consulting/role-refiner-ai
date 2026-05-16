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
          <div className="label-eyebrow-muted">AI interview coach · Beta · Free during launch</div>
          <h1 className="font-display text-6xl md:text-8xl mt-5 leading-[0.95]">
            Your personal <span className="font-serif-italic">interview coach</span>.
          </h1>
          <p className="mt-8 text-xl md:text-2xl text-foreground/80 leading-snug max-w-xl font-light">
            Hindsight analyses your interview performance, learns from every
            rejection, and builds a prep plan for the next round — so you stop
            making the same mistakes twice.
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

const FUNNEL = [
  {
    label: "CVs",
    time: "30 seconds",
    n: 200,
    conv: null as number | null,
    happens: "Recruiter or ATS scans your CV against the JD. 30 seconds, often less. Most never get read by a human.",
    flag: "CV ↔ JD mismatch — your headline experience doesn't map to the role's top requirements.",
  },
  {
    label: "Phone screens",
    time: "20 minutes",
    n: 20,
    conv: 10,
    happens: "Recruiter qualifies fit, comp, motivation, and timeline. It's a filter — they're looking for reasons to cut.",
    flag: "Unclear motivation — you sound like you'd take any job, not this one.",
  },
  {
    label: "Hiring manager",
    time: "45 minutes",
    n: 10,
    conv: 50,
    happens: "First real conversation about the role. The HM probes scope, ownership, and whether you'd be a peer they want to work with.",
    flag: "Culture mismatch — your examples land in the wrong register for how this team operates.",
  },
  {
    label: "Second round",
    time: "45 minutes",
    n: 6,
    conv: 60,
    happens: "Craft round — case study, system design, deep-dive, or stakeholder demo with cross-functional partners.",
    flag: "Competency gap — one specific skill (system design, prioritisation, exec comms) doesn't meet the bar.",
  },
  {
    label: "Final round",
    time: "60 minutes",
    n: 3,
    conv: 50,
    happens: "Onsite or final loop. Multiple interviewers debrief together. Consensus call, often with a skeptic in the room.",
    flag: "Team-fit mismatch — one panelist isn't convinced you'd raise the bar for their team.",
  },
  {
    label: "Offer",
    time: "—",
    n: 1,
    conv: 33,
    happens: "Comp negotiation, references, start date. Whatever leverage you have now is the only leverage you'll get.",
    flag: "No leverage — no comp comps, no parallel offers, no real BATNA. You take what's offered.",
  },
];

function Funnel() {
  const stages = [
    { label: "Applications",    count: 300, passRate: "15%", time: "10 sec" },
    { label: "Recruiter screen", count: 45,  passRate: "44%", time: "30 min" },
    { label: "Technical screen", count: 20,  passRate: "40%", time: "60 min" },
    { label: "Onsite",           count: 8,   passRate: "38%", time: "4–5 hrs" },
    { label: "Final round",      count: 3,   passRate: "33%", time: "60 min" },
    { label: "Offer",            count: 1,   passRate: null,  time: null },
  ];

  // Chart geometry
  const W = 800;
  const H = 320;
  const padL = 44;
  const padR = 16;
  const padT = 24;
  const padB = 64; // room for two-line x labels
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const yMax = 340;
  const colW = innerW / stages.length;
  const barW = colW * 0.55;
  const yTicks = [0, 100, 200, 300];
  const barColor = "#E8943A";

  const xCenter = (i: number) => padL + colW * (i + 0.5);
  const yFor = (v: number) => padT + innerH * (1 - v / yMax);

  return (
    <section id="funnel" className="border-b border-border">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-20 md:py-28">
        <div className="label-eyebrow-muted">Your job search is a funnel</div>
        <h2 className="font-display text-5xl md:text-7xl mt-5 max-w-3xl leading-[1.0]">
          300 applications in. <span className="font-serif-italic">1 offer out.</span>
        </h2>
        <p className="mt-6 max-w-2xl text-lg md:text-xl text-foreground/70 leading-snug font-light">
          This is what a typical tech hiring funnel looks like. You lose candidates at every stage and
          never know why. Hindsight tracks the funnel and tells you, at each stage,{" "}
          <span className="font-serif-italic text-foreground">exactly why you fell out</span>.
        </p>

        <div className="mt-14 border border-border bg-card p-4 md:p-8">
          <div className="text-sm font-medium mb-6">Typical tech hiring funnel</div>

          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            role="img"
            aria-label="Bar chart showing candidate counts: Applications 300, Recruiter screen 45, Technical screen 20, Onsite 8, Final round 3, Offer 1"
          >
            {/* y-axis gridlines + ticks */}
            {yTicks.map((t) => (
              <g key={t}>
                <line
                  x1={padL}
                  x2={W - padR}
                  y1={yFor(t)}
                  y2={yFor(t)}
                  stroke="hsl(0 0% 0% / 0.06)"
                  strokeWidth={1}
                />
                <text
                  x={padL - 10}
                  y={yFor(t) + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill="hsl(0 0% 60%)"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {t}
                </text>
              </g>
            ))}

            {/* bars + value/passrate labels */}
            {stages.map((s, i) => {
              const h = innerH * (s.count / yMax);
              const x = xCenter(i) - barW / 2;
              const y = padT + innerH - h;
              return (
                <g key={s.label}>
                  <rect x={x} y={y} width={barW} height={h} rx={3} fill={barColor} />
                  <text
                    x={xCenter(i)}
                    y={y - 18}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={500}
                    fill="hsl(0 0% 33%)"
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                  >
                    {s.count}
                  </text>
                  {s.passRate && (
                    <text
                      x={xCenter(i)}
                      y={y - 4}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={500}
                      fill="hsl(0 0% 33%)"
                      fontFamily="ui-sans-serif, system-ui, sans-serif"
                    >
                      {s.passRate}
                    </text>
                  )}

                  {/* x labels: stage + time */}
                  <text
                    x={xCenter(i)}
                    y={padT + innerH + 18}
                    textAnchor="middle"
                    fontSize={11}
                    fill="hsl(0 0% 40%)"
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                  >
                    {s.label}
                  </text>
                  {s.time && (
                    <text
                      x={xCenter(i)}
                      y={padT + innerH + 34}
                      textAnchor="middle"
                      fontSize={11}
                      fill="hsl(0 0% 40%)"
                      fontFamily="ui-sans-serif, system-ui, sans-serif"
                    >
                      {s.time}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* KPI cards */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard label="Blind application success rate" value="<0.5%" />
            <KpiCard label="Referral offer rate (est.)" value="~5–8%" />
            <KpiCard label="Onsite → offer rate" value="~12%" />
          </div>
        </div>

        <p className="mt-10 max-w-2xl text-lg text-foreground/70 leading-snug">
          <span className="font-serif-italic text-foreground">Hindsight is your coach across all of it.</span>{" "}
          A fit score before you apply. An honest analysis of every interview you do —
          what worked, what tanked it, and the patterns repeating across rounds.
          A prep plan for the next one, built from what just went wrong.
        </p>
      </div>
    </section>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface/60 border border-border rounded-md px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-medium mt-1">{value}</div>
    </div>
  );
}

/* ───────────────────────── Mock product screens ───────────────────────── */

function Screens() {
  return (
    <section className="border-b border-border bg-surface/40">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">
        <div className="label-eyebrow-muted">Three tools, one coach</div>
        <h2 className="font-display text-5xl md:text-7xl mt-5 max-w-3xl leading-[1.0]">
          What Hindsight <span className="font-serif-italic">actually does</span>.
        </h2>
        <p className="mt-6 max-w-2xl text-lg md:text-xl text-foreground/70 leading-snug font-light">
          Three things, end-to-end. Score the role before you waste a week on it.
          Analyse every interview and learn what tanked it. Walk into the next one prepared.
        </p>

        <div className="mt-16 grid md:grid-cols-3 gap-10">
          <ScreenCard
            number="01"
            title="Fit score, before you apply"
            blurb="Paste a JD. Get an honest score in 60 seconds, the requirements that'll cut you, and a tailored angle if it's worth pursuing."
          >
            <FitScoreMock />
          </ScreenCard>

          <ScreenCard
            number="02"
            title="Interview performance, analysed"
            blurb="After every interview, Hindsight breaks down your performance — the answers that landed, the ones that lost the room, and the patterns repeating across rounds."
          >
            <RecordingMock />
          </ScreenCard>

          <ScreenCard
            number="03"
            title="Prep for the next round"
            blurb="A drill plan built from your last interview's gaps. The exact stories, frameworks, and questions to rehearse before you go again."
          >
            <PrepMock />
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

function RecordingMock() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="label-eyebrow-muted">Interview analysis</div>
        <span className="text-xs text-muted-foreground tabular-nums">47:12 · 3rd round</span>
      </div>
      <div className="font-display text-xl mt-2 leading-tight">Stripe · HM round</div>
      <div className="editorial-rule mt-4" />
      <div className="mt-4 space-y-3 text-sm leading-snug">
        <div className="flex gap-3">
          <span className="text-muted-foreground tabular-nums shrink-0">12:04</span>
          <span>
            <span className="font-serif-italic">&ldquo;Why Stripe?&rdquo;</span> answer ran 90s, never named their API-first thesis. HM disengaged at 12:38.
          </span>
        </div>
        <div className="flex gap-3">
          <span className="text-muted-foreground tabular-nums shrink-0">28:51</span>
          <span>
            Scoping question: you proposed without clarifying constraints. Pattern across 3 onsites.
          </span>
        </div>
      </div>
      <div className="mt-auto pt-4 flex gap-2">
        <span className="label-tag">Drill these</span>
      </div>
    </div>
  );
}

function PrepMock() {
  return (
    <div className="h-full flex flex-col">
      <div className="label-eyebrow-muted">Prep · Stripe second round</div>
      <div className="font-display text-xl mt-2 leading-tight">3 things to nail</div>
      <div className="editorial-rule mt-4" />
      <ul className="mt-4 space-y-3 text-sm leading-snug">
        <li className="flex gap-3">
          <span className="text-muted-foreground">01</span>
          <span>Rewrite <span className="font-serif-italic">&ldquo;why Stripe&rdquo;</span> in 45s — anchor on payments depth.</span>
        </li>
        <li className="flex gap-3">
          <span className="text-muted-foreground">02</span>
          <span>Scoping drill: 3 reps. Always clarify constraints before proposing.</span>
        </li>
        <li className="flex gap-3">
          <span className="text-muted-foreground">03</span>
          <span>Likely panel question: <span className="font-serif-italic">&ldquo;Walk me through a tough trade-off.&rdquo;</span></span>
        </li>
      </ul>
      <div className="mt-auto pt-4">
        <span className="label-tag">Start drill →</span>
      </div>
    </div>
  );
}

/* ───────────────────────── How it works ───────────────────────── */

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Score before you apply.",
      body: "Upload your CV, paste a JD. Hindsight scores fit, names the requirements that'll cut you, and tells you whether to apply, refer, or skip.",
    },
    {
      n: "02",
      title: "Analyse every interview.",
      body: "After each round, Hindsight breaks down your performance — the answers that landed, the ones that lost the room, and the patterns repeating across interviews.",
    },
    {
      n: "03",
      title: "Walk in prepared next time.",
      body: "A drill plan built from your last interview's gaps: the stories to rewrite, the questions you'll get asked, the answers worth rehearsing.",
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
