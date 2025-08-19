import React, { useMemo, useState, useEffect, useRef, use } from "react";
import type { Lead, Interaction, Stage } from "./utility/types";
import "./index.css";
import Modal from "./Modal";

const seedLeads: Lead[] = [
  {
    id: "l1",
    name: "Alex Chen",
    title: "VP Engineering",
    company: "NimbusOps",
    email: "alex@nimbusops.io",
    website: "https://nimbusops.io",
    industry: "SaaS",
    size: 240,
    revenue: 32,
    techStack: ["Postgres", "Node", "Kotlin"],
    location: "Austin, TX",
    score: 58,
    stage: "New",
    interactions: [
      {
        id: "i1",
        type: "system",
        timestamp: new Date().toISOString(),
        content: "Lead created",
      },
    ],
  },
  {
    id: "l2",
    name: "Priya Singh",
    title: "Head of RevOps",
    company: "Acme Retail",
    email: "priya@acmeretail.com",
    website: "https://acmeretail.com",
    industry: "Retail",
    size: 5000,
    revenue: 1800,
    techStack: ["Snowflake", "Salesforce", "Python"],
    location: "Chicago, IL",
    score: 44,
    stage: "New",
    interactions: [
      {
        id: "i2",
        type: "system",
        timestamp: new Date().toISOString(),
        content: "Lead created",
      },
    ],
  },
  {
    id: "l3",
    name: "Diego Alvarez",
    title: "Director of Data",
    company: "Finovia",
    email: "diego@finovia.co",
    website: "https://finovia.co",
    industry: "FinServ",
    size: 900,
    revenue: 220,
    techStack: ["Postgres", "dbt", "TypeScript"],
    location: "Miami, FL",
    score: 67,
    stage: "New",
    interactions: [
      {
        id: "i3",
        type: "system",
        timestamp: new Date().toISOString(),
        content: "Lead created",
      },
    ],
  },
  {
    id: "l4",
    name: "Hannah Lee",
    title: "CTO",
    company: "CareBridge Health",
    email: "hannah@carebridge.health",
    website: "https://carebridge.health",
    industry: "Healthcare",
    size: 1200,
    revenue: 410,
    techStack: ["Ruby", "React", "Postgres"],
    location: "Boston, MA",
    score: 51,
    stage: "New",
    interactions: [
      {
        id: "i4",
        type: "system",
        timestamp: new Date().toISOString(),
        content: "Lead created",
      },
    ],
  },
];

// -------------------- Utilities --------------------

const cx = (...xs: (string | false | undefined | null)[]) =>
  xs.filter(Boolean).join(" ");
const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}`;

const stageOrder: Stage[] = [
  "New",
  "Contacted",
  "Qualified",
  "Meeting",
  "Won",
  "Lost",
];
const nextStage = (s: Stage): Stage =>
  stageOrder[Math.min(stageOrder.indexOf(s) + 1, stageOrder.length - 1)];

const scoreBar = (n: number) =>
  n >= 80
    ? "bg-emerald-500"
    : n >= 60
    ? "bg-blue-500"
    : n >= 40
    ? "bg-amber-500"
    : "bg-rose-500";

const fmt = (d: string | number | Date) => {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
};

const maybeFail = () => {
  if (Math.random() < 0.05) {
    throw new Error("Random failure occurred");
  }
};
const useMock = false; // Set to true to use mock data

async function apiQualify(
  lead: Lead
): Promise<{ newScore: number; reasons: string[]; disqs?: string[] }> {
  
  try {
    const response = await fetch('http://localhost:8000/providescore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lead),
    });

    const data = await response.json();
    const disqs = data.score < 40 ? ["Low intent signals"] : undefined;
    return { newScore: data.score, reasons: data.reason, disqs };
  } catch (error) {
    console.error('Error fetching lead score:', error);
    return {newScore: 0, reasons: ["Error fetching score"], disqs: []}
  }
}


async function apiCompose(
  lead: Lead
): Promise<{ subject: string; body: string; cta: string }> {
   try {
    const response = await fetch('http://localhost:8000/draftemail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lead),
    });

    const data = await response.json();
    console.log('Email Draft:', data.email_draft);
    return data;
  } catch (error) {
    console.error('Error fetching email draft:', error);
    return { subject: "", body: "", cta: "" };
  }
}


async function apiSlots(): Promise<{ startISO: string; endISO: string }[]> {
  if (!useMock) {
    // return fetch("/api/slots", { method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone }) }).then(r => r.json());
  }
  await new Promise((r) => setTimeout(r, 220));
  maybeFail();
  const now = new Date();
  const slots: { startISO: string; endISO: string }[] = [];
  let d = new Date(now);
  d.setHours(9, 0, 0, 0);
  while (slots.length < 4) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      const start = new Date(d);
      start.setHours(10 + slots.length, 0, 0, 0);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + 30);
      slots.push({ startISO: start.toISOString(), endISO: end.toISOString() });
    }
    d.setDate(d.getDate() + 1);
  }
  return slots;
}

// -------------------- Reusable UI --------------------

const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cx(
      "rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur transition hover:shadow-md",
      className
    )}
  >
    {children}
  </div>
);

const Badge = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={cx(
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
      className
    )}
  >
    {children}
  </span>
);

// Consistent Stage badge sizing to avoid squished/stretched pills
const StageBadge = ({ stage }: { stage: Stage }) => (
  <span
    className={cx(
      "inline-flex h-7 min-w-[7.5rem] items-center justify-center rounded-full px-3 text-[12px] font-semibold ring-1 ring-inset whitespace-nowrap"
    )}
  >
    {stage}
  </span>
);

const Spinner = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    className={cx("animate-spin", className)}
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeOpacity=".2"
      strokeWidth="3"
    />
    <path
      d="M21 12a9 9 0 0 1-9 9"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

const Button = ({
  children,
  onClick,
  disabled,
  loading,
  variant = "primary",
  className = "",
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "ghost" | "soft" | "accent";
  className?: string;
  ariaLabel?: string;
}) => {
  const styles = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
    soft: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    accent:
      "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-95",
  }[variant];
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={!!disabled || !!loading}
      className={cx(
        "inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-semibold shadow-sm transition active:translate-y-[1px] disabled:opacity-50",
        styles,
        className
      )}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
};

const Icon = ({
  name,
  className = "w-4 h-4",
}: {
  name: "spark" | "mail" | "clock" | "chev" | "search" | "x";
  className?: string;
}) => {
  const c = "stroke-current";
  switch (name) {
    case "spark":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
        >
          <path className={c} d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" />
        </svg>
      );
    case "mail":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
        >
          <path className={c} d="M4 6h16v12H4z" />
          <path className={c} d="M22 6l-10 7L2 6" />
        </svg>
      );
    case "clock":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
        >
          <circle className={c} cx="12" cy="12" r="9" />
          <path className={c} d="M12 7v6l4 2" />
        </svg>
      );
    case "chev":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
        >
          <path className={c} d="M9 18l6-6-6-6" />
        </svg>
      );
    case "search":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
        >
          <circle className={c} cx="11" cy="11" r="7" />
          <path className={c} d="M21 21l-3.5-3.5" />
        </svg>
      );
    case "x":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
        >
          <path className={c} d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
  }
};

const Toast = ({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) => {
  useEffect(() => {
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed right-5 top-5 z-50 rounded-2xl bg-slate-900/95 px-4 py-3 text-white shadow-xl">
      {message}
    </div>
  );
};

const ErrorBanner = ({
  error,
  onClose,
  onRetry,
}: {
  error: string;
  onClose: () => void;
  onRetry?: () => void;
}) => (
  <div
    role="alert"
    className="mx-auto mb-4 flex max-w-7xl items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800"
  >
    <div className="text-sm">{error}</div>
    <div className="flex items-center gap-2">
      {onRetry && (
        <Button variant="soft" onClick={onRetry} ariaLabel="Retry">
          Retry
        </Button>
      )}
      <button
        className="rounded-full p-1 hover:bg-white/60"
        onClick={onClose}
        aria-label="Dismiss"
      ></button>
    </div>
  </div>
);



// -------------------- Main Component --------------------

export default function SDRDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [queryInput, setQueryInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [stageFilter, setStageFilter] = useState<Stage | "All">("All");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [emailDraft, setEmailDraft] = useState<{
    subject: string;
    body: string;
    cta: string;
  } | null>(null);
  const [slots, setSlots] = useState<
    { startISO: string; endISO: string }[] | null
  >(null);
  const [toast, setToast] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const searchRef = useRef<HTMLInputElement>(null);

  // Load
  useEffect(() => {
    setLeads(seedLeads);
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedQuery(queryInput.trim().toLowerCase()),
      200
    );
    return () => clearTimeout(t);
  }, [queryInput]);

  // Keyboard "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && searchRef.current) {
        e.preventDefault();
        searchRef.current.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const stagePills: (Stage | "All")[] = [
    "All",
    "New",
    "Contacted",
    "Qualified",
    "Meeting",
  ];

  const filtered = useMemo(() => {
    return leads
      .filter((l) => stageFilter === "All" || l.stage === stageFilter)
      .filter((l) => l.score >= minScore)
      .filter((l) => {
        if (!debouncedQuery) return true;
        const hay = [l.name, l.company, l.title, l.industry, l.email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(debouncedQuery);
      })
      .sort((a, b) =>
        sortDir === "desc" ? b.score - a.score : a.score - b.score
      );
  }, [leads, stageFilter, minScore, debouncedQuery, sortDir]);

  const stats = useMemo(
    () => ({
      total: leads.length,
      qualified: leads.filter((l) => l.stage === "Qualified").length,
      contacted: leads.filter((l) => l.stage === "Contacted").length,
    }),
    [leads]
  );

  // -------------------- Actions --------------------

  async function handleQualify(lead: Lead) {
    try {
      setLoadingId(lead.id);
      const { newScore, reasons, disqs } = await apiQualify(lead);
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id
            ? {
                ...l,
                score: newScore,
                stage:
                  newScore >= 70
                    ? l.stage === "New"
                      ? "Qualified"
                      : l.stage
                    : l.stage,
                interactions: [
                  {
                    id: uid("ix"),
                    type: "note",
                    timestamp: new Date().toISOString(),
                    content: `Qualification: ${newScore} — ${reasons.join(
                      "; "
                    )}${disqs?.length ? "; disq: " + disqs.join(", ") : ""}`,
                  },
                  ...l.interactions,
                ],
              }
            : l
        )
      );
      setToast("Lead qualified");
    } catch (e: any) {
      setError(e.message || "Failed to qualify lead.");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleCompose(lead: Lead) {
    try {
      setLoadingId(lead.id);
      const draft = await apiCompose(lead);
      console.log("Email Draft:", draft);
      setEmailDraft(draft);
      setSelected(lead);
    } catch (e: any) {
      setError(e.message || "Failed to compose email.");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleSlots(lead: Lead) {
    try {
      setLoadingId(lead.id);
      const s = await apiSlots();
      setSlots(s);
      setSelected(lead);
    } catch (e: any) {
      setError(e.message || "Failed to fetch slots.");
    } finally {
      setLoadingId(null);
    }
  }

  function handleAdvance(lead: Lead) {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id
          ? {
              ...l,
              stage: nextStage(l.stage),
              interactions: [
                {
                  id: uid("ix"),
                  type: "system",
                  timestamp: new Date().toISOString(),
                  content: `Stage → ${nextStage(l.stage)}`,
                },
                ...l.interactions,
              ],
            }
          : l
      )
    );
  }

  function logEmailAndContacted() {
    if (!selected || !emailDraft) return;
    setLeads((prev) =>
      prev.map((l) =>
        l.id === selected.id
          ? {
              ...l,
              stage: l.stage === "New" ? "Contacted" : l.stage,
              interactions: [
                {
                  id: uid("ix"),
                  type: "email",
                  timestamp: new Date().toISOString(),
                  content: `${emailDraft.subject}

${emailDraft.body}

${emailDraft.cta}`,
                },
                ...l.interactions,
              ],
            }
          : l
      )
    );
    setToast("Email logged & stage updated");
    setEmailDraft(null);
  }

  // -------------------- Render --------------------

  return (
    <div className="min-h-screen bg-[radial-gradient(60rem_60rem_at_20%_-10%,#e8edff_10%,transparent_40%),radial-gradient(60rem_60rem_at_120%_-10%,#ffe8f1_10%,transparent_40%)]">
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <h1 className="text-[20px] font-bold tracking-tight">
            AI SDR Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Qualify leads • Compose outreach • Propose slots
          </p>

          <div className="flex items-center gap-2">
            <input
              ref={searchRef}
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search leads..."
              className="w-72 bg-transparent text-sm outline-none placeholder:text-slate-400"
              aria-label="Search leads"
            />
          </div>
        </div>
      </header>

      {error && (
        <ErrorBanner
          error={error}
          onClose={() => setError("")}
          onRetry={() => setError("")}
        />
      )}

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-xs text-slate-500">Total leads {stats.total}</p>
          </Card>
          <Card>
            <p className="text-xs text-slate-500">
              Qualified {stats.qualified}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-slate-500">
              Contacted {stats.contacted}
            </p>
          </Card>
        </section>

        {/* stage pills */}
        <div className="mb-4 flex flex-wrap items-center space-x-2">
          {stagePills.map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(s as any)}
              className={cx(
                "rounded-full border px-3 py-1 text-xs",
                stageFilter === s
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              {s}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <span>Sort by score</span>
            <button
              className="rounded-full border px-2 py-1"
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
            >
              {sortDir === "desc" ? "↓" : "↑"}
            </button>
          </div>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed">
              <thead>
                <tr className="border-b bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="p-3">Lead</th>
                  <th className="p-3">Title</th>
                  <th className="w-28 p-3">Score</th>
                  <th className="w-44 p-3">Stage</th>
                  <th className="w-[520px] p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium tracking-tight">
                            {lead.name}
                          </div>
                          <div className="text-sm text-slate-500">
                            {lead.company}
                            {lead.industry ? ` • ${lead.industry}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="truncate text-sm text-slate-700">
                        {lead.title ?? "—"}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cx(
                            "h-2 w-20 rounded-full transition",
                            scoreBar(lead.score)
                          )}
                        />
                        <span className="text-sm tabular-nums">
                          {lead.score}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <StageBadge stage={lead.stage} />
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="accent"
                          onClick={() => handleQualify(lead)}
                          loading={loadingId === lead.id}
                          ariaLabel={`Qualify ${lead.name}`}
                        >
                          Qualify
                        </Button>
                        <Button
                          variant="accent"
                          onClick={() => handleCompose(lead)}
                          loading={loadingId === lead.id}
                          ariaLabel={`Compose email to ${lead.name}`}
                        >
                          {" "}
                          Compose
                        </Button>
                        <Button
                          variant="accent"
                          onClick={() => handleSlots(lead)}
                          loading={loadingId === lead.id}
                          ariaLabel={`Propose slots to ${lead.name}`}
                        >
                          {" "}
                          Propose Slots
                        </Button>
                        <Button
                          variant="accent"
                          onClick={() => setSelected(lead)}
                          ariaLabel={`Open details for ${lead.name}`}
                        >
                          Details
                        </Button>
                        <Button
                          variant="accent"
                          onClick={() => handleAdvance(lead)}
                          ariaLabel={`Advance stage for ${lead.name}`}
                        >
                          Advance
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td className="p-8 text-center text-slate-500" colSpan={5}>
                      No leads match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      {/* Lead detail drawer */}
      <button
        onClick={() => setSelected(null)}
        className="rounded-full p-2 hover:bg-slate-100"
        aria-label="Close details"
        disabled={!selected}
      >
        Close details
      </button>

      <div className="flex items-center justify-between border-b p-5">
        <div className="flex items-center gap-3">
          <div>
            <div className="font-semibold tracking-tight">{selected?.name}</div>
            <div className="text-sm text-slate-500">
              {selected && selected?.title + " • "} {selected?.company}
            </div>
          </div>
        </div>
      </div>

      {selected && (
        <div className="space-y-5 p-5">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <div className="text-xs text-slate-500">Score</div>
              <div className="mt-2 flex items-center gap-3">
                <div
                  className={cx(
                    "h-2 w-24 rounded-full",
                    scoreBar(selected.score)
                  )}
                />
                <div className="text-lg font-semibold tabular-nums">
                  {selected.score}
                </div>
              </div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500">Stage</div>
              <div className="mt-2 flex items-center gap-3">
                <StageBadge stage={selected.stage} />
                <Button variant="soft" onClick={() => handleAdvance(selected)}>
                  Advance
                </Button>
              </div>
            </Card>
          </div>

          <Card>
            <div className="mb-2 text-sm font-semibold tracking-tight">
              Key details
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
              <dt className="text-slate-500">Industry</dt>
              <dd>{selected.industry ?? "—"}</dd>
              <dt className="text-slate-500">Employees</dt>
              <dd>{selected.size ?? "—"}</dd>
              <dt className="text-slate-500">Location</dt>
              <dd>{selected.location ?? "—"}</dd>
              <dt className="text-slate-500">Tech</dt>
              <dd>{selected.techStack?.join(", ") ?? "—"}</dd>
              <dt className="text-slate-500">Email</dt>
              <dd>{selected.email ?? "—"}</dd>
              <dt className="text-slate-500">Website</dt>
              <dd>
                {selected.website ? (
                  <a
                    className="text-blue-600 underline"
                    href={selected.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {selected.website}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </dl>
          </Card>

          <Card>
            <div className="mb-2 text-sm font-semibold tracking-tight">
              Activity
            </div>
            <ul className="space-y-2">
              {selected.interactions.map((ix) => (
                <li
                  key={ix.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="text-[11px] text-slate-500">
                    {fmt(ix.timestamp)} • {ix.type}
                  </div>
                  <div className="text-sm whitespace-pre-wrap leading-5">
                    {ix.content}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="accent"
              onClick={() => handleQualify(selected)}
              loading={loadingId === selected.id}
            >
              Qualify
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-500"
              onClick={() => handleCompose(selected)}
              loading={loadingId === selected.id}
            >
              Compose
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-500 text-white"
              onClick={() => handleSlots(selected)}
              loading={loadingId === selected.id}
            >
              Propose Slots
            </Button>
          </div>
        </div>
      )}

      {/* Compose modal */}
      <Modal
        open={!!emailDraft}
        title="Outreach draft"
        onClose={() => setEmailDraft(null)}
      >
        {emailDraft && (
          <div className="space-y-4">
            <div>
              <div className="text-xs text-slate-500">Subject</div>
              <input
                value={emailDraft.subject}
                onChange={(e) =>
                  setEmailDraft({ ...emailDraft, subject: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm"
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Body</span>
              </div>
              <textarea
                value={emailDraft.body}
                onChange={(e) =>
                  setEmailDraft({ ...emailDraft, body: e.target.value })
                }
                className="mt-1 h-44 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none"
              />
            </div>
            <div>
              <div className="text-xs text-slate-500">CTA</div>
              <input
                value={emailDraft.cta}
                onChange={(e) =>
                  setEmailDraft({ ...emailDraft, cta: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="soft"
                  onClick={() => {
                    navigator.clipboard.writeText(emailDraft.subject);
                    setToast("Copied subject");
                  }}
                >
                  Copy Subject
                </Button>
                <Button
                  variant="soft"
                  onClick={() => {
                    navigator.clipboard.writeText(emailDraft.body);
                    setToast("Copied body");
                  }}
                >
                  Copy Body
                </Button>
                <Button
                  variant="soft"
                  onClick={() => {
                    navigator.clipboard.writeText(`${emailDraft.subject}

${emailDraft.body}

${emailDraft.cta}`);
                    setToast("Copied full email");
                  }}
                >
                  Copy All
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  className="bg-blue-600 hover:bg-blue-500"
                  onClick={logEmailAndContacted}
                >
                  Log & Mark Contacted
                </Button>
                <Button variant="ghost" onClick={() => setEmailDraft(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Slots modal */}
      <Modal
        open={!!slots}
        title="Suggested meeting slots (30 min)"
        onClose={() => setSlots(null)}
      >
        {slots && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {slots.map((s, i) => (
                <span
                  key={i}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm"
                >
                  {fmt(s.startISO)} → {fmt(s.endISO)}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <Button
                variant="soft"
                onClick={() => {
                  navigator.clipboard.writeText(
                    slots
                      .map((s) => `${fmt(s.startISO)} - ${fmt(s.endISO)}`)
                      .join("\n")
                  );
                  setToast("Copied slots");
                }}
              >
                Copy Slots
              </Button>
              <Button variant="ghost" onClick={() => setSlots(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast} onClose={() => setToast("")} />}

    </div>
  );
}
