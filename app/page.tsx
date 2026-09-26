"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronRight, CircleDot, Copy, Download, FileCheck2, Fingerprint, Hash, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";

type Stage = "evidence" | "claims" | "authority" | "decision";
const stages: { id: Stage; label: string }[] = [
  { id: "evidence", label: "Evidence review" },
  { id: "claims", label: "Claim review" },
  { id: "authority", label: "Authority check" },
  { id: "decision", label: "Decision" },
];
type EvidenceRecord = { title: string; source: string; value: string; state: string; observedAt?: string };
type ClaimClassification = "Observed" | "Derived" | "Interpreted" | "Unresolved";
type ClaimRecord = {
  id: string;
  classification: ClaimClassification;
  claim: string;
  basis: string;
  effect: string;
};
type CaptureReceipt = {
  capturedAt: string;
  checks: { endpoint: string; httpStatus: number; outcome: "admitted" | "rejected"; issues: string[] }[];
};
const fixtureEvidence: EvidenceRecord[] = [
  { title: "BTC market quote", source: "CMC /v2/cryptocurrency/quotes/latest", value: "$60,842.17 · 24h −2.4%", state: "Admitted" },
  { title: "Global market metrics", source: "CMC /v1/global-metrics/quotes/latest", value: "Market cap $2.18T · BTC dominance 53.2%", state: "Admitted" },
  { title: "Counterparty exposure", source: "Required by case policy", value: "No verified evidence submitted", state: "Unresolved" },
];

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(",")}}`;
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("authority");
  const [reviewer, setReviewer] = useState<"analyst" | "custodian">("analyst");
  const [attempted, setAttempted] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>(fixtureEvidence);
  const [captureState, setCaptureState] = useState<"fixture" | "loading" | "live" | "unavailable">("fixture");
  const [captureNote, setCaptureNote] = useState("Illustrative fixture retained until a verified live capture succeeds.");
  const [captureReceipt, setCaptureReceipt] = useState<CaptureReceipt | null>(null);
  const [attemptedAt, setAttemptedAt] = useState<string | null>(null);
  const [bundleHash, setBundleHash] = useState<string | null>(null);
  const [bundleDownloadUrl, setBundleDownloadUrl] = useState<string | null>(null);
  const [bundleCopied, setBundleCopied] = useState(false);
  const authorized = reviewer === "custodian";
  const claims: ClaimRecord[] = [
    {
      id: "CLM-001",
      classification: "Observed",
      claim: "CMC reports a BTC quote and global market metrics at the recorded capture time.",
      basis: captureState === "live" && captureReceipt
        ? "Bound to the admitted live BTC quote, global metrics records, and capture receipt."
        : "Currently supported by the labelled demonstration fixture; a successful live capture replaces this basis.",
      effect: "May inform analysis; does not authorize an action.",
    },
    {
      id: "CLM-002",
      classification: "Derived",
      claim: "The proposed 8% reduction is within the custodian’s CAD $100k mandate.",
      basis: "Treasury position, valuation, and proposed transaction value have not been submitted.",
      effect: "Not presently calculable; action scope remains unresolved.",
    },
    {
      id: "CLM-003",
      classification: "Interpreted",
      claim: "Current market conditions support reducing BTC exposure.",
      basis: "An analyst may form this recommendation from admitted market evidence.",
      effect: "Analysis only; an interpretation cannot become authorization.",
    },
    {
      id: "CLM-004",
      classification: "Unresolved",
      claim: "Counterparty exposure is acceptable for the proposed action.",
      basis: "No verified counterparty-exposure evidence has been submitted.",
      effect: "Material blocker; the case must remain DEFERRED.",
    },
  ];

  function invalidateBundle() {
    setBundleHash(null);
    setBundleDownloadUrl(null);
    setBundleCopied(false);
  }

  function selectReviewer(value: "analyst" | "custodian") {
    setReviewer(value);
    setAttempted(false);
    setAttemptedAt(null);
    invalidateBundle();
  }

  function attemptAuthorization() {
    setAttempted(true);
    setAttemptedAt(new Date().toISOString());
    invalidateBundle();
  }

  async function captureLiveEvidence() {
    invalidateBundle();
    setCaptureState("loading");
    setCaptureNote("Requesting CoinMarketCap evidence through the server boundary…");
    try {
      const response = await fetch("/api/cmc", { cache: "no-store" });
      const result = await response.json() as { ok?: boolean; message?: string; capturedAt?: string; records?: EvidenceRecord[]; receipt?: CaptureReceipt };
      setCaptureReceipt(result.receipt ?? null);
      if (!response.ok || !result.ok || !result.records) throw new Error(result.message ?? "Live capture failed.");
      setEvidence([...result.records, fixtureEvidence[2]]);
      setCaptureState("live");
      setCaptureNote(`Captured ${new Date(result.capturedAt ?? Date.now()).toLocaleString()} · CMC responses admitted; unresolved policy evidence preserved.`);
    } catch (error) {
      setEvidence(fixtureEvidence);
      setCaptureState("unavailable");
      setCaptureNote(`${error instanceof Error ? error.message : "Live capture failed."} No live values were admitted; the labelled fixture remains visible.`);
    }
  }

  useEffect(() => {
    const modelContext = (document as Document & { modelContext?: { registerTool?: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(modelContext.registerTool({
      name: "select_case_reviewer",
      title: "Select case reviewer",
      description: "Select the visible reviewer whose mandate will be checked for this decision case.",
      inputSchema: { type: "object", properties: { reviewer: { type: "string", enum: ["analyst", "custodian"] } }, required: ["reviewer"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const value = (input as { reviewer?: string })?.reviewer;
        if (value !== "analyst" && value !== "custodian") throw new Error("Reviewer must be analyst or custodian.");
        setReviewer(value);
        setAttempted(false);
        setAttemptedAt(null);
        setBundleHash(null);
        setBundleDownloadUrl(null);
        setBundleCopied(false);
        setStage("authority");
        return { reviewer: value, mandate_covers_action: value === "custodian" };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);
  const gate = useMemo(() => ({
    evidence: { pass: false, note: "1 material requirement unresolved" },
    claims: { pass: false, note: "2 material claims unresolved" },
    authority: { pass: authorized, note: authorized ? "Mandate covers treasury action" : "Reviewer may analyze, not authorize" },
    scope: { pass: false, note: "Treasury position and action value not evidenced" },
  }), [authorized]);

  const classificationStyle: Record<ClaimClassification, string> = {
    Observed: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    Derived: "border-sky-300/25 bg-sky-300/10 text-sky-100",
    Interpreted: "border-violet-300/25 bg-violet-300/10 text-violet-100",
    Unresolved: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  };

  const bundleReady = captureState === "live" && captureReceipt !== null && attempted && attemptedAt !== null;

  async function generateDecisionBundle() {
    if (!bundleReady || !captureReceipt || !attemptedAt) return;
    const reviewerRecord = reviewer === "custodian"
      ? { id: "JL", name: "Jonah Little Bear", role: "Treasury Custodian", trustState: "Custodian", identityVerified: true, fictionalDemonstrationIdentity: true, mandate: "Authorize treasury adjustments up to CAD $100k" }
      : { id: "MS", name: "Maya Stone", role: "Market Analyst", trustState: "Contributor", identityVerified: true, fictionalDemonstrationIdentity: true, mandate: "Analyze evidence and submit recommendations" };
    const payload = {
      schema: "pot-decision-bundle/v0.1",
      case: {
        id: "POT-CMC-001",
        title: "Reduce treasury BTC exposure by 8%",
        proposedAction: "Reduce treasury BTC exposure by 8%",
      },
      evidence: {
        captureState: "live",
        capturedAt: captureReceipt.capturedAt,
        records: evidence.map(({ title, source, value, state, observedAt }) => ({ title, source, value, state, ...(observedAt ? { observedAt } : {}) })),
        receipt: captureReceipt,
      },
      claims: claims.map(({ id, classification, claim, basis, effect }) => ({ id, classification, claim, basis, effect })),
      authority: {
        reviewer: reviewerRecord,
        attemptedAt,
        result: authorized ? "AUTHORITY_SATISFIED" : "AUTHORITY_BLOCKED",
      },
      gates: {
        evidence: gate.evidence,
        claims: gate.claims,
        authority: gate.authority,
        scope: gate.scope,
      },
      decision: {
        state: "DEFERRED",
        requiredBeforeReconsideration: ["Verified counterparty exposure", "Treasury position evidence", "Proposed transaction value", "Assigned execution scope"],
        transactionPrepared: false,
        transactionExecuted: false,
        automatedTransitionToAuthorizedAllowed: false,
      },
      boundary: {
        purpose: "Governance research; not financial advice",
        excluded: ["CMC API credential", "Request headers", "Raw provider payloads"],
        humanAuthorizationRequired: true,
      },
    };
    const canonicalPayload = canonicalize(payload);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalPayload));
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const bundle = {
      payload,
      integrity: {
        algorithm: "SHA-256",
        canonicalization: "PoT-CANONICAL-JSON-v0.1 (recursive lexicographic key ordering, UTF-8)",
        hashedSection: "payload",
        digest: hash,
      },
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }));
    setBundleHash(hash);
    setBundleDownloadUrl(url);
    setBundleCopied(false);
  }

  async function copyBundleHash() {
    if (!bundleHash) return;
    await navigator.clipboard.writeText(bundleHash);
    setBundleCopied(true);
  }

  useEffect(() => () => {
    if (bundleDownloadUrl) URL.revokeObjectURL(bundleDownloadUrl);
  }, [bundleDownloadUrl]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-white/10 bg-[#07110f]/90 px-4 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-emerald-300/30 bg-emerald-300/10 text-emerald-200"><Fingerprint size={22} /></span>
            <div><p className="font-semibold tracking-tight">Proof of Trust</p><p className="text-xs text-zinc-400">Governed decision case</p></div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs font-medium text-amber-200"><CircleDot size={13} /> Case in review</div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1480px] gap-5 p-4 md:p-8 lg:grid-cols-[250px_minmax(0,1fr)_330px]">
        <aside className="panel p-4 lg:sticky lg:top-6 lg:h-fit">
          <p className="eyebrow">Case POT-CMC-001</p>
          <h1 className="mt-2 text-xl font-semibold leading-tight">Reduce treasury BTC exposure by 8%</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">Proposed action supported by current market conditions. Authorization requires admitted evidence and a Treasury Custodian mandate.</p>
          <nav className="mt-7 space-y-1" aria-label="Case stages">
            {stages.map((item, index) => {
              const active = stage === item.id;
              return <button key={item.id} onClick={() => setStage(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${active ? "bg-emerald-300/10 text-emerald-100" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}>
                <span className={`grid size-6 place-items-center rounded-full text-xs ${active ? "bg-emerald-300 text-[#07110f]" : "border border-white/15"}`}>{index + 1}</span>{item.label}<ChevronRight className="ml-auto" size={15} />
              </button>;
            })}
          </nav>
        </aside>

        <section className="space-y-5">
          {stage === "claims" && <div className="panel overflow-hidden">
            <div className="border-b border-white/10 px-5 py-5 md:px-7">
              <p className="eyebrow">Claim review</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">What does the evidence actually support?</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Classification preserves the boundary between a reported fact, a calculation, an interpretation, and a missing requirement. No claim can promote itself into a decision.</p>
            </div>
            <div className="grid gap-4 p-5 md:p-7">
              {claims.map((item) => <article key={item.id} className="rounded-xl border border-white/10 bg-black/15 p-4 md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs text-zinc-500">{item.id}</span>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${classificationStyle[item.classification]}`}>{item.classification}</span>
                </div>
                <h3 className="mt-3 font-semibold leading-6 text-zinc-100">{item.claim}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400"><strong className="text-zinc-300">Evidence basis: </strong>{item.basis}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400"><strong className="text-zinc-300">Governance effect: </strong>{item.effect}</p>
              </article>)}
            </div>
          </div>}

          {stage === "authority" && <div className="panel overflow-hidden">
            <div className="border-b border-white/10 px-5 py-5 md:px-7">
              <p className="eyebrow">Authority check</p>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                <div><h2 className="text-2xl font-semibold tracking-tight">Who may authorize this action?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Identity confirms the reviewer. Mandate determines what that reviewer is permitted to decide.</p></div>
                <span className={`status ${authorized ? "status-pass" : "status-block"}`}>{authorized ? <Check size={14} /> : <LockKeyhole size={14} />}{authorized ? "Gate satisfied" : "Authorization blocked"}</span>
              </div>
            </div>
            <div className="grid gap-5 p-5 md:grid-cols-2 md:p-7">
              <button onClick={() => selectReviewer("analyst")} className={`reviewer-card ${reviewer === "analyst" ? "reviewer-card-active" : ""}`}>
                <div className="flex items-start justify-between gap-3"><span className="avatar">MS</span><span className="status status-pass"><ShieldCheck size={13} /> Identity verified</span></div>
                <h3 className="mt-5 text-left font-semibold">Maya Stone</h3><p className="mt-1 text-left text-sm text-zinc-400">Market Analyst · Contributor</p><p className="mt-1 text-left text-xs text-zinc-600">Fictional demonstration identity</p>
                <div className="mt-5 border-t border-white/10 pt-4 text-left text-sm"><p className="text-zinc-500">Mandate</p><p className="mt-1 text-zinc-200">Analyze evidence and submit recommendations</p></div>
              </button>
              <button onClick={() => selectReviewer("custodian")} className={`reviewer-card ${reviewer === "custodian" ? "reviewer-card-active" : ""}`}>
                <div className="flex items-start justify-between gap-3"><span className="avatar">JL</span><span className="status status-pass"><ShieldCheck size={13} /> Identity verified</span></div>
                <h3 className="mt-5 text-left font-semibold">Jonah Little Bear</h3><p className="mt-1 text-left text-sm text-zinc-400">Treasury Custodian · Custodian</p><p className="mt-1 text-left text-xs text-zinc-600">Fictional demonstration identity</p>
                <div className="mt-5 border-t border-white/10 pt-4 text-left text-sm"><p className="text-zinc-500">Mandate</p><p className="mt-1 text-zinc-200">Authorize treasury adjustments up to CAD $100k</p></div>
              </button>
            </div>
            <div className="border-t border-white/10 bg-black/15 p-5 md:p-7">
              <button onClick={attemptAuthorization} className={`w-full rounded-xl px-5 py-3.5 text-sm font-semibold transition md:w-auto ${authorized ? "bg-emerald-300 text-[#07110f] hover:bg-emerald-200" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"}`}>Attempt authorization</button>
              {attempted && <div className={`mt-4 flex max-w-2xl gap-3 rounded-xl border p-4 text-sm leading-6 ${authorized ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100" : "border-amber-300/25 bg-amber-300/10 text-amber-100"}`}>
                {authorized ? <FileCheck2 className="mt-0.5 shrink-0" size={20} /> : <AlertTriangle className="mt-0.5 shrink-0" size={20} />}
                <p>{authorized ? "Authority requirement satisfied. The case still remains deferred because counterparty evidence and action scope are unresolved." : "Blocked. Maya’s identity is valid, but her Contributor mandate does not authorize treasury action. The analysis remains preserved without becoming a decision."}</p>
              </div>}
            </div>
          </div>}

          {stage === "decision" && <div className="panel overflow-hidden">
            <div className="border-b border-white/10 px-5 py-5 md:px-7">
              <p className="eyebrow">Decision</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">The case cannot advance</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Live market evidence and a valid custodian mandate cannot override unresolved evidence or an unproven action scope.</p>
            </div>
            <div className="p-5 md:p-7">
              <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-5">
                <p className="text-sm font-semibold text-amber-100">Decision outcome: DEFERRED</p>
                <p className="mt-2 text-sm leading-6 text-zinc-300">Required before another decision attempt: verified counterparty exposure, treasury position evidence, proposed transaction value, and assigned execution scope.</p>
              </div>
              <p className="mt-5 text-sm leading-6 text-zinc-400">The admitted evidence and analyst interpretation remain preserved. No transaction is prepared or executed, and no automated process may change this state to AUTHORIZED.</p>
              <div className="mt-6 border-t border-white/10 pt-6">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-emerald-300/25 bg-emerald-300/10 text-emerald-200"><Hash size={18} /></span>
                  <div>
                    <h3 className="font-semibold text-zinc-100">Integrity-verifiable decision bundle</h3>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">Create a portable JSON record of this case snapshot. The payload is canonically ordered and hashed locally with SHA-256.</p>
                  </div>
                </div>
                <button onClick={generateDecisionBundle} disabled={!bundleReady} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 py-3.5 text-sm font-semibold text-[#07110f] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 md:w-auto"><Hash size={16} />Generate decision bundle</button>
                {!bundleReady && <p className="mt-3 text-xs leading-5 text-amber-200">Requires a successful live CMC capture and a recorded authorization attempt.</p>}
                {bundleHash && bundleDownloadUrl && <div className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">Bundle generated</p>
                  <p className="mt-3 text-xs text-zinc-500">SHA-256 payload digest</p>
                  <p className="mt-1 break-all font-mono text-xs leading-5 text-zinc-200">{bundleHash}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button onClick={copyBundleHash} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3.5 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/5"><Copy size={15} />{bundleCopied ? "Hash copied" : "Copy hash"}</button>
                    <a href={bundleDownloadUrl} download="POT-CMC-001-decision-bundle.json" className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-3.5 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15"><Download size={15} />Download JSON</a>
                  </div>
                  <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-5 text-zinc-500">The bundle excludes the CMC API credential, request headers, and raw provider payloads.</p>
                </div>}
              </div>
            </div>
          </div>}

          <div className="panel p-5 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">Evidence ledger</p><h2 className="mt-1 text-lg font-semibold">Inputs supporting this case</h2></div><button onClick={captureLiveEvidence} disabled={captureState === "loading"} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-3.5 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15 disabled:cursor-wait disabled:opacity-60"><RefreshCw size={15} className={captureState === "loading" ? "animate-spin" : ""} />{captureState === "loading" ? "Capturing…" : "Capture live CMC evidence"}</button></div>
            <div className={`mt-4 rounded-xl border px-4 py-3 text-xs leading-5 ${captureState === "live" ? "border-emerald-300/20 bg-emerald-300/5 text-emerald-100" : captureState === "unavailable" ? "border-amber-300/20 bg-amber-300/5 text-amber-100" : "border-white/10 bg-white/[.025] text-zinc-400"}`}><strong>{captureState === "live" ? "LIVE CAPTURE" : "DEMO FIXTURE"}</strong> · {captureNote}</div>
            {captureReceipt && <div className="mt-4 rounded-xl border border-white/10 bg-black/15 p-4" aria-label="Capture diagnostic receipt">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">Capture receipt</p><time className="text-xs text-zinc-500">{new Date(captureReceipt.capturedAt).toLocaleString()}</time></div>
              <div className="mt-3 space-y-3">{captureReceipt.checks.map((check) => <div key={`${check.endpoint}-${check.httpStatus}`} className="grid gap-1 text-xs md:grid-cols-[1fr_auto] md:items-start md:gap-4">
                <div><p className="text-zinc-300">{check.endpoint}</p><p className="mt-1 font-mono text-zinc-500">HTTP {check.httpStatus}{check.issues.length ? ` · ${check.issues.join(", ")}` : " · schema complete"}</p></div>
                <span className={`status w-fit ${check.outcome === "admitted" ? "status-pass" : "status-block"}`}>{check.outcome === "admitted" ? "Admitted" : "Rejected"}</span>
              </div>)}</div>
              <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 text-zinc-500">Receipt excludes credentials, request headers, and raw provider payloads.</p>
            </div>}
            <div className="mt-5 divide-y divide-white/10">{evidence.map((item) => <div key={item.title} className="grid gap-2 py-4 md:grid-cols-[1fr_1.2fr_auto] md:items-center md:gap-5">
              <div><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-zinc-500">{item.source}</p></div><p className="text-sm text-zinc-300">{item.value}</p><span className={`status w-fit ${item.state === "Admitted" ? "status-pass" : "status-block"}`}>{item.state}</span>
            </div>)}</div>
          </div>

          <div className="panel p-5 md:p-7">
            <p className="eyebrow">Demo &amp; data boundary</p>
            <p className="mt-3 text-sm leading-6 text-zinc-300">This prototype uses fictional reviewer identities and illustrative values unless a record is explicitly marked as a live CMC capture. It provides governance research—not financial advice—and cannot execute a transaction. A human with a valid mandate remains responsible for every authorization.</p>
          </div>
        </section>

        <aside className="panel h-fit p-5 lg:sticky lg:top-6">
          <p className="eyebrow">Decision readiness</p><h2 className="mt-2 text-lg font-semibold">Mandatory gates</h2>
          <div className="mt-5 space-y-4">{Object.entries(gate).map(([name, item]) => <div key={name} className="flex gap-3">
            <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${item.pass ? "bg-emerald-300/15 text-emerald-200" : "bg-amber-300/15 text-amber-200"}`}>{item.pass ? <Check size={14} /> : <AlertTriangle size={14} />}</span>
            <div><p className="text-sm font-medium capitalize">{name}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{item.note}</p></div>
          </div>)}</div>
          <div className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4"><p className="text-sm font-semibold text-amber-100">Case state: DEFERRED</p><p className="mt-2 text-xs leading-5 text-zinc-400">A valid calculation cannot override missing evidence, mandate, or scope.</p></div>
          <p className="mt-5 text-xs leading-5 text-zinc-500">No automated process may transition this case to AUTHORIZED.</p>
        </aside>
      </div>
    </main>
  );
}
