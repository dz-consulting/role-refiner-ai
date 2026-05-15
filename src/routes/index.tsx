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
          <div className="label-eyebrow-muted">AI job-search coach · Beta · Free during launch</div>
          <h1 className="font-display text-6xl md:text-8xl mt-5 leading-[0.95]">
            From <span className="font-serif-italic">applied</span> to{" "}
            <span className="font-serif-italic">offer</span>, with a coach.
          </h1>
          <p className="mt-8 text-xl md:text-2xl text-foreground/80 leading-snug max-w-xl font-light">
            Hindsight is an AI coach that scores roles before you apply,
            records and analyses your interviews, and preps you for the
            next round — so you stop guessing what went wrong.
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
  // Chart geometry (viewBox units)
  const W = 1000;
  const H = 560;
  const xL = 80;
  const xR = 960;
  const yT = 80;
  const yB = 440;
  const maxV = 200;
  const yScale = (v: number) => yB - (v / maxV) * (yB - yT);
  const barW = 92;
  const slot = (xR - xL) / FUNNEL.length;
  const cx = (i: number) => xL + slot * (i + 0.5);

  const yTicks = [0, 50, 100, 150, 200];

  return (
    <section id="funnel" className="border-b border-border">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-20 md:py-28">
        <div className="label-eyebrow-muted">Your job search is a funnel</div>
        <h2 className="font-display text-5xl md:text-7xl mt-5 max-w-3xl leading-[1.0]">
          200 applications in. <span className="font-serif-italic">1 offer out.</span>
        </h2>
        <p className="mt-6 max-w-2xl text-lg md:text-xl text-foreground/70 leading-snug font-light">
          This is what a typical search looks like. You lose offers at every stage and never
          know which. Hindsight tracks the funnel and tells you, at each stage,{" "}
          <span className="font-serif-italic text-foreground">exactly why you fell out</span>.
        </p>

        {/* The funnel chart */}
        <div className="mt-14 border border-border bg-card p-4 md:p-10">
          <div className="font-display text-2xl md:text-3xl mb-2">Typical tech hiring funnel</div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            role="img"
            aria-label="Typical tech hiring funnel from 200 CVs to 1 offer"
          >
            {/* Gridlines + Y axis labels */}
            {yTicks.map((v) => {
              const y = yScale(v);
              return (
                <g key={v}>
                  <line x1={xL} x2={xR} y1={y} y2={y} stroke="hsl(0 0% 88%)" strokeWidth={1} />
                  <text
                    x={xL - 14}
                    y={y + 5}
                    textAnchor="end"
                    fontSize={16}
                    fill="hsl(0 0% 35%)"
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                  >
                    {v}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {FUNNEL.map((s, i) => {
              const yTop = yScale(s.n);
              const h = yB - yTop;
              const x = cx(i) - barW / 2;
              return (
                <g key={s.label}>
                  <rect x={x} y={yTop} width={barW} height={h} fill="#F4A23C" />
                  {/* Count above bar */}
                  <text
                    x={cx(i)}
                    y={yTop - 14}
                    textAnchor="middle"
                    fontSize={20}
                    fontWeight={700}
                    fill="hsl(0 0% 10%)"
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                  >
                    {s.n}
                  </text>
                </g>
              );
            })}

            {/* Conversion % chips between consecutive bars */}
            {FUNNEL.map((s, i) => {
              if (s.conv == null) return null;
              const prev = FUNNEL[i - 1];
              const x1 = cx(i - 1) + barW / 2;
              const x2 = cx(i) - barW / 2;
              const midX = (x1 + x2) / 2;
              const yPrevTop = yScale(prev.n);
              const yCurTop = yScale(s.n);
              const chipY = Math.max(yPrevTop, yCurTop - 30);
              const chipW = 54;
              const chipH = 26;
              return (
                <g key={`conv-${i}`}>
                  {/* connector: small step from prev top down to current top */}
                  <path
                    d={`M ${x1} ${yPrevTop} L ${midX - chipW / 2 - 4} ${yPrevTop} M ${midX + chipW / 2 + 4} ${yPrevTop} L ${x2} ${yPrevTop} L ${x2} ${yCurTop}`}
                    fill="none"
                    stroke="hsl(0 0% 35%)"
                    strokeWidth={1.2}
                    markerEnd="url(#arrow)"
                  />
                  <rect
                    x={midX - chipW / 2}
                    y={chipY - chipH / 2}
                    width={chipW}
                    height={chipH}
                    rx={3}
                    fill="hsl(0 0% 28%)"
                  />
                  <text
                    x={midX}
                    y={chipY + 5}
                    textAnchor="middle"
                    fontSize={14}
                    fontWeight={600}
                    fill="white"
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                  >
                    {s.conv}%
                  </text>
                </g>
              );
            })}

            {/* Arrow marker */}
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(0 0% 35%)" />
              </marker>
              <marker
                id="arrowDashed"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(0 0% 30%)" />
              </marker>
            </defs>

            {/* Stage labels */}
            {FUNNEL.map((s, i) => (
              <g key={`lbl-${s.label}`}>
                <text
                  x={cx(i)}
                  y={yB + 28}
                  textAnchor="middle"
                  fontSize={15}
                  fontWeight={500}
                  fill="hsl(0 0% 12%)"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {s.label}
                </text>
                <text
                  x={cx(i)}
                  y={yB + 50}
                  textAnchor="middle"
                  fontSize={13}
                  fontStyle="italic"
                  fill="hsl(0 0% 40%)"
                  fontFamily="ui-serif, Georgia, serif"
                >
                  {s.time}
                </text>
              </g>
            ))}

            {/* Per-stage rejection annotations */}
            {[
              { i: 1, reason: "CV ↔ JD mismatch", boxX: 280 },
              { i: 2, reason: "Unclear motivation", boxX: 410 },
              { i: 3, reason: "Culture mismatch", boxX: 545 },
              { i: 4, reason: "Competency gap", boxX: 680 },
              { i: 5, reason: "Team-fit mismatch", boxX: 815 },
            ].map(({ i, reason, boxX }) => {
              const prev = FUNNEL[i - 1];
              const cur = FUNNEL[i];
              const chipX = (cx(i - 1) + barW / 2 + cx(i) - barW / 2) / 2;
              const yPrevTop = yScale(prev.n);
              const yCurTop = yScale(cur.n);
              const chipY = Math.max(yPrevTop, yCurTop - 30);
              const boxW = 132;
              const boxH = 26;
              const boxY = 18;
              return (
                <g key={`ann-${i}`}>
                  {/* connector */}
                  <path
                    d={`M ${boxX} ${boxY + boxH} L ${boxX} ${chipY - 18} L ${chipX} ${chipY - 18} L ${chipX} ${chipY - 13}`}
                    fill="none"
                    stroke="hsl(0 0% 30%)"
                    strokeWidth={1.2}
                    strokeDasharray="4 4"
                  />
                  {/* tag */}
                  <rect
                    x={boxX - boxW / 2}
                    y={boxY}
                    width={boxW}
                    height={boxH}
                    rx={2}
                    fill="#9FE3F2"
                  />
                  <text
                    x={boxX}
                    y={boxY + 17}
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight={600}
                    fill="hsl(0 0% 10%)"
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                  >
                    {reason}
                  </text>
                </g>
              );
            })}

            {/* Hindsight legend */}
            <g>
              <rect x={xL} y={yB + 70} width={14} height={14} fill="#9FE3F2" />
              <text
                x={xL + 22}
                y={yB + 82}
                fontSize={13}
                fontWeight={600}
                fill="hsl(0 0% 25%)"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                Typical rejection reason Hindsight surfaces at each stage
              </text>
            </g>
          </svg>
        </div>

        <p className="mt-10 max-w-2xl text-lg text-foreground/70 leading-snug">
          <span className="font-serif-italic text-foreground">Hindsight is the coach across all of it.</span>{" "}
          A fit score before you apply. A recording of every interview, analysed for what tanked it.
          A prep plan for the next round — built from what actually went wrong in the last one.
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
