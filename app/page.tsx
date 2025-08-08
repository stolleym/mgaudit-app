"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp, Factory, History, PlayCircle, FileDown, Upload, Download, Sparkles } from "lucide-react";
import jsPDF from "jspdf";

/** ---------- Types ---------- */
const VENUES = ["Suzie Q", "Windsor Wine Room"] as const;
type Venue = typeof VENUES[number];
type Rating = "Pass" | "Minor" | "Major" | "Critical" | "N/A";

type Checkpoint = {
  category: string;
  checkpoint: string;
  target: string;
  owner: string;
  defaultDue: number;
  suggested: string;
  photo?: boolean; // optional
};

type AuditRow = {
  category: string;
  checkpoint: string;
  rating: Rating;
  notes: string;
  photoDataUrl: string;
};

type ActionItem = {
  id: string;
  venue: Venue;
  month: string;
  category: string;
  checkpoint: string;
  rating: Rating;
  owner: string;
  due: string;
  status: "Open" | "In Progress" | "Done";
  description: string;
};

type Audit = {
  id: string;
  venue: Venue;
  month: string;
  score: number;
  rows: AuditRow[];
};

/** ---------- Constants & Utils ---------- */
const CATEGORIES = [
  "System Compliance","Food Safety & Hygiene","Food Quality","Health & Safety",
  "Council / Regulatory","KPIs","Guest / Staff Feedback","Maintenance",
] as const;

const severityWeight: Record<Rating, number> = { Pass: 0, Minor: 1, Major: 3, Critical: 5, "N/A": 0 };
const band = (score: number) => (score >= 90 ? "green" : score >= 75 ? "amber" : "red");
const daysFromNow = (days: number) => { const d = new Date(); d.setDate(d.getDate() + Math.max(0, days)); return d.toISOString().slice(0,10); };
const badgeClass = (r: Rating) =>
  ({ Pass: "bg-green-600/20 text-green-400", Minor: "bg-amber-600/20 text-amber-400", Major: "bg-orange-600/20 text-orange-400", Critical: "bg-red-600/20 text-red-400", "N/A": "bg-zinc-700 text-zinc-300" }[r]);

const CHECKPOINTS: ReadonlyArray<Checkpoint> = [
  { category: "System Compliance", checkpoint: "Prep lists fully ticked?", target: "100%", owner: "Sous Chef", defaultDue: 3, suggested: "Audit daily prep sheets; retrain on completion standard; implement AM spot-check." },
  { category: "System Compliance", checkpoint: "SOPs followed on line?", target: "0 deviations", owner: "Head Chef", defaultDue: 3, suggested: "Run 2-dish line check; correct deviations; sign-off on shift brief." },
  { category: "Food Safety & Hygiene", checkpoint: "Allergen matrix current & on-hand", target: "Matches menu & labels", owner: "Duty Manager", defaultDue: 1, suggested: "Print current matrix; cross-check labels; brief FOH/BOH." },
  { category: "Food Safety & Hygiene", checkpoint: "Fridge ≤ 5 °C / Freezer ≤ −15 °C", target: "100%", owner: "Sous Chef", defaultDue: 0, suggested: "Verify temps; calibrate probes; discard non-compliant stock; log corrective action.", photo: true },
  { category: "Food Safety & Hygiene", checkpoint: "Cleaning schedule signed", target: "100%", owner: "Section Leads", defaultDue: 2, suggested: "Close gaps; reassign tasks; implement sign-off photo proof." },
  { category: "Food Quality", checkpoint: "Tasting panel (2 dishes)", target: "≥ 2 (Good)", owner: "Head Chef", defaultDue: 2, suggested: "Run panel; adjust seasoning/plating; update plate spec.", photo: true },
  { category: "Food Quality", checkpoint: "Presentation matches photos", target: "Yes", owner: "Head Chef", defaultDue: 2, suggested: "Refresh plating demo; update pass photo; brief team.", photo: true },
  { category: "Health & Safety", checkpoint: "Knife & PPE checks", target: "No defects", owner: "Sous Chef", defaultDue: 0, suggested: "Replace damaged PPE; log and educate; certify knives safe." },
  { category: "Health & Safety", checkpoint: "New hazards logged", target: "Up to date", owner: "Duty Manager", defaultDue: 1, suggested: "Log hazards; assign controls; verify by EOD." },
  { category: "Council / Regulatory", checkpoint: "Required docs on-site & in date", target: "100%", owner: "Venue Manager", defaultDue: 0, suggested: "Update folder; print missing docs; date-stamp review." },
  { category: "Council / Regulatory", checkpoint: "Probe calibration < 7 days", target: "Yes", owner: "Sous Chef", defaultDue: 0, suggested: "Calibrate or replace; attach certificate; reset reminder." },
  { category: "KPIs", checkpoint: "POS / Payroll", target: "≤ 17.5%", owner: "Venue Manager", defaultDue: 7, suggested: "Adjust rosters; cap OT; align staffing to forecast; review after 1 week." },
  { category: "KPIs", checkpoint: "COGS % (last week)", target: "≤ 30%", owner: "Head Chef", defaultDue: 7, suggested: "Trim high-cost SKUs; portion checks; negotiate buys; monitor daily." },
  { category: "KPIs", checkpoint: "Wastage $", target: "↓ week-on-week", owner: "Head Chef", defaultDue: 7, suggested: "Introduce waste board; butcher maps; next-day review." },
  { category: "Guest / Staff Feedback", checkpoint: "Public reviews ≥ 4★", target: "≥ 4.7", owner: "Venue Manager", defaultDue: 7, suggested: "Reply to reviews; table touches; service huddles." },
  { category: "Guest / Staff Feedback", checkpoint: "Staff training hours", target: "≥ 2 h pp / month", owner: "Head Chef", defaultDue: 14, suggested: "Schedule training blocks; capture attendance; sign-off." },
  { category: "Maintenance", checkpoint: "Critical equipment serviced", target: "No overdue", owner: "Venue Manager", defaultDue: 3, suggested: "Book tech; tag out if needed; close work order." }
] as const;

/** Local storage keys */
const DRAFT_KEY = "auditDraft";
const HISTORY_KEY = "auditHistory";
const DC_KEY = "deepCleanTasks";

/** Safe localStorage helpers */
const loadDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch { return null; } };
const saveDraft = (v: unknown) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(v)); } catch {} };
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };
const getHistory = (): Audit[] => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; } };
const setHistory = (arr: Audit[]) => { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); } catch {} };
const pushHistory = (a: Audit) => { const h = getHistory(); h.push(a); setHistory(h); };
const loadDC = (): DCItem[] => { try { return JSON.parse(localStorage.getItem(DC_KEY) || "[]"); } catch { return []; } };
const saveDC = (v: DCItem[]) => { try { localStorage.setItem(DC_KEY, JSON.stringify(v)); } catch {} };

/** ---------- Mock chart data ---------- */
const mockAudits = [
  { id: 1, venue: "Suzie Q" as Venue, month: "2025-04", ratings: { green: 14, amber: 2, red: 1 }, score: 88 },
  { id: 2, venue: "Suzie Q" as Venue, month: "2025-05", ratings: { green: 15, amber: 1, red: 1 }, score: 91 },
  { id: 3, venue: "Suzie Q" as Venue, month: "2025-06", ratings: { green: 15, amber: 1, red: 1 }, score: 92 },
  { id: 4, venue: "Windsor Wine Room" as Venue, month: "2025-04", ratings: { green: 13, amber: 3, red: 1 }, score: 85 },
  { id: 5, venue: "Windsor Wine Room" as Venue, month: "2025-05", ratings: { green: 14, amber: 2, red: 1 }, score: 88 },
  { id: 6, venue: "Windsor Wine Room" as Venue, month: "2025-06", ratings: { green: 15, amber: 1, red: 1 }, score: 90 }
];

/** ---------- Small UI helpers ---------- */
function ScoreBadge({ score }: { score: number }) {
  const b = band(score);
  const map = { green: "bg-green-600/20 text-green-400", amber: "bg-amber-600/20 text-amber-400", red: "bg-red-600/20 text-red-400" } as const;
  return <span className={`badge ${map[b]}`}>{score}%</span>;
}

function KPI({
  title,
  value,
  icon,
  onClick,
}: {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={`rounded-2xl shadow-md bg-zinc-900 border-zinc-800 ${
        onClick ? "cursor-pointer hover:bg-zinc-900/70 hover:border-zinc-700 transition-colors" : ""
      }`}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-zinc-800">{icon ?? <TrendingUp size={18} />}</div>
        <div className="flex-1">
          <div className="text-zinc-400 text-xs">{title}</div>
          <div className="text-zinc-100 text-xl font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}


/** ---------- Dashboard ---------- */
function Dashboard({
  venue,
  actions,
  onStartNew,
  onHistory,
  onDeep,
  onOpenActions,
}: {
  venue: Venue | "All";
  actions: ActionItem[];
  onStartNew: () => void;
  onHistory: () => void;
  onDeep: () => void;
  onOpenActions: (severity: "Critical" | "Major" | "All") => void;
}) {
  const data = useMemo(
    () => mockAudits.filter(a => (venue === "All" ? true : a.venue === venue)),
    [venue]
  );
  const latest = data[data.length - 1];
  const lineData = data.map(d => ({ month: d.month, score: d.score }));

  const openCritical = actions.filter(
    a => a.status !== "Done" && (venue === "All" ? true : a.venue === venue) && a.rating === "Critical"
  ).length;

  const openMajor = actions.filter(
    a => a.status !== "Done" && (venue === "All" ? true : a.venue === venue) && a.rating === "Major"
  ).length;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="text-zinc-300 text-sm">Welcome back. Start a fresh audit or review history.</div>
        <div className="flex gap-2">
          <Button className="rounded-xl" onClick={onStartNew}>
            <PlayCircle size={16} className="mr-2" />
            Start New Audit
          </Button>
          <Button variant="secondary" className="rounded-xl" onClick={onHistory}>
            <History size={16} className="mr-2" />
            Audit History
          </Button>
          <Button variant="secondary" className="rounded-xl" onClick={onDeep}>
            <Sparkles size={16} className="mr-2" />
            Deep Clean
          </Button>
        </div>
      </div>

      {/* CLICKABLE KPI TILES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI title="Latest Audit Score" value={<ScoreBadge score={latest?.score ?? 0} />} />

        <KPI
          title="Open Critical Actions"
          value={
            <div className="flex items-center gap-2">
              <XCircle size={16} />
              {openCritical}
            </div>
          }
          onClick={() => onOpenActions("Critical")}
        />

        <KPI
          title="Open Major Actions"
          value={
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} />
              {openMajor}
            </div>
          }
          onClick={() => onOpenActions("Major")}
        />

        <KPI title="On-time Close Rate" value="92%" />
      </div>

      {/* Charts (unchanged) */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800">
        <div className="p-4 h-[260px]">
          <div className="text-zinc-300 text-sm mb-2">Audit Score Trend</div>
          <div style={{ width: "100%", height: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" stroke="#888" />
                <YAxis domain={[70, 100]} stroke="#888" />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
                <Line type="monotone" dataKey="score" stroke="#7dd3fc" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Keep your ratings distribution + last audits cards below as they were */}
    </div>
  );
}


/** ---------- Full Audit ---------- */
function FullAudit({ onFinalise, onCancel }: { onFinalise: (actions: ActionItem[], audit: Audit, pdfUrl: string) => void; onCancel: () => void }) {
  const draft = loadDraft();
  const [venue, setVenue] = useState<Venue>(draft?.venue || "Suzie Q");
  const [month, setMonth] = useState<string>(draft?.month || new Date().toISOString().slice(0,7));
  const initial: AuditRow[] =
    (draft?.rows as AuditRow[] | undefined) ||
    CHECKPOINTS.map((cp) => ({ category: cp.category, checkpoint: cp.checkpoint, rating: "Pass", notes: "", photoDataUrl: "" }));
  const [rows, setRows] = useState<AuditRow[]>(initial);
  useEffect(() => { saveDraft({ venue, month, rows }); }, [venue, month, rows]);

  const inputFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const requirePhoto = (checkpoint: string, rating: Rating) => {
    const meta = CHECKPOINTS.find(c => c.checkpoint === checkpoint);
    if (meta?.photo) return true;
    if (rating !== "Pass" && rating !== "N/A") return true;
    return false;
  };

  const grouped = useMemo(() => {
    const m = new Map<string, AuditRow[]>();
    rows.forEach((r) => { if (!m.has(r.category)) m.set(r.category, []); m.get(r.category)!.push(r); });
    return Array.from(m.entries());
  }, [rows]);

  const sectionProgress = useMemo(() => {
    return grouped.map(([cat, items]) => {
      const total = items.length;
      const done = items.filter((row) => {
        const needsPhoto = requirePhoto(row.checkpoint, row.rating);
        const hasPhoto = !!row.photoDataUrl;
        return !needsPhoto || (needsPhoto && hasPhoto);
      }).length;
      return { cat, total, done };
    });
  }, [grouped]);

  const allComplete = sectionProgress.every(s => s.done === s.total);
  const setRow = (index: number, patch: Partial<AuditRow>) => setRows(prev => prev.map((r,i) => i===index ? { ...r, ...patch } : r));

  const handleFile = (file: File, index: number) => {
    const reader = new FileReader();
    reader.onload = () => setRow(index, { photoDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const validatePhotos = () => {
    for (const r of rows) { if (requirePhoto(r.checkpoint, r.rating) && !r.photoDataUrl) return r.checkpoint; }
    return null;
  };

  const buildPDF = (audit: Audit, actions: ActionItem[], embedPhotos = true) => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("Monthly Audit Report", 10, 10);
    doc.setFontSize(12);
    doc.text(`Venue: ${audit.venue}`, 10, 20);
    doc.text(`Month: ${audit.month}`, 10, 26);
    doc.text(`Score: ${audit.score}%`, 10, 32);
    let y = 42;
    audit.rows.forEach((r, i) => {
      doc.text(`${i + 1}. [${r.category}] ${r.checkpoint} - ${r.rating}`, 10, y); y += 6;
      if (r.notes) { doc.text(`Notes: ${r.notes}`, 14, y); y += 6; }
      if (embedPhotos && r.photoDataUrl) {
        try { doc.addImage(r.photoDataUrl, 'JPEG', 14, y, 40, 30); y += 34; } catch {}
      }
    });
    y += 4; doc.text(`Action Plan:`, 10, y); y += 6;
    actions.forEach((a, i) => { doc.text(`${i + 1}. ${a.checkpoint} - ${a.rating} - Owner: ${a.owner} Due: ${a.due}`, 10, y); y += 6; });
    return doc;
  };

  const finalise = () => {
    const missing = validatePhotos();
    if (missing) { alert(`Photo required for: ${missing}`); return; }

    let score = 100; const actions: ActionItem[] = [];
    rows.forEach(r => {
      const sev = severityWeight[r.rating];
      score = Math.max(0, score - sev * 5);
      if (r.rating !== "Pass" && r.rating !== "N/A") {
        const meta = CHECKPOINTS.find(c => c.checkpoint === r.checkpoint);
        actions.push({
          id: Math.random().toString(36).slice(2),
          venue,
          month,
          category: r.category,
          checkpoint: r.checkpoint,
          rating: r.rating,
          owner: meta?.owner ?? "Head Chef",
          due: daysFromNow((meta?.defaultDue ?? 3) - (severityWeight[r.rating] >= 3 ? 2 : 0)),
          status: "Open",
          description: `${meta?.suggested ?? "Correct and retrain."} ${r.notes ? `Notes: ${r.notes}` : ""}`.trim(),
        });
      }
    });

    const audit: Audit = { id: Math.random().toString(36).slice(2), venue, month, score, rows };

    // Avoid URL vs string typing issues: build blob, make object URL string
    const doc = buildPDF(audit, actions, true);
    const blob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(blob);

    Object.values(inputFileRefs.current).forEach((el) => { if (el) el.value = ""; });

    clearDraft(); pushHistory(audit);
    onFinalise(actions, audit, pdfUrl);
  };

  return (
    <div className="grid md:grid-cols-12 gap-4">
      {/* Sidebar */}
      <aside className="md:col-span-3">
        <div className="card sticky top-4">
          <div className="p-4 space-y-2">
            <div className="text-zinc-300 text-sm mb-1">Progress</div>
            {sectionProgress.map(s => (
              <div key={s.cat} className="flex items-center justify-between text-sm">
                <span className="text-zinc-200">{s.cat}</span>
                <span className={`badge ${s.done===s.total? 'bg-green-600/20 text-green-400':'bg-zinc-700 text-zinc-300'}`}>{s.done}/{s.total}</span>
              </div>
            ))}
            <div className="pt-2 text-xs text-zinc-400">{allComplete ? 'All sections complete.' : 'Some sections still need photos.'}</div>
          </div>
        </div>
      </aside>

      {/* Form */}
      <div className="md:col-span-9 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-zinc-300 text-sm mb-1">Venue</div>
            <select value={venue} onChange={(e) => setVenue(e.target.value as Venue)} className="select">
              {VENUES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <div className="text-zinc-300 text-sm mb-1">Audit Month (YYYY-MM)</div>
            <input value={month} onChange={e => setMonth(e.target.value)} className="input" placeholder="2025-07" />
          </div>
        </div>

        <div className="space-y-3">
          {Array.from(grouped).map(([cat, items]) => (
            <div key={cat} className="card">
              <details className="group" open>
                <summary className="list-none cursor-pointer select-none px-4 py-3 flex items-center justify-between border-b border-zinc-800">
                  <span className="text-zinc-100 font-medium">{cat}</span>
                  <span className="text-zinc-400 text-xs">{items.length} checks</span>
                </summary>
                <div className="p-4 grid gap-3">
                  {items.map((row) => {
                    const index = rows.findIndex(r => r.checkpoint === row.checkpoint);
                    const needs = requirePhoto(row.checkpoint, rows[index].rating);
                    return (
                      <div key={row.checkpoint} className="grid md:grid-cols-5 gap-3">
                        <div className="col-span-2">
                          <div className="text-zinc-300 text-sm mb-1">Checkpoint</div>
                          <div className="text-zinc-100 text-sm">{row.checkpoint}</div>
                          <div className="text-zinc-500 text-xs">Target: {CHECKPOINTS.find(c=>c.checkpoint===row.checkpoint)?.target}</div>
                        </div>

                        <div>
                          <div className="text-zinc-300 text-sm mb-1">Rating</div>
                          <select
                            value={rows[index].rating}
                            onChange={(e) => setRow(index, { rating: e.target.value as Rating })}
                            className="select"
                          >
                            {["Pass","Minor","Major","Critical","N/A"].map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>

                        <div>
                          <div className="text-zinc-300 text-sm mb-1">Notes</div>
                          <input
                            value={rows[index].notes}
                            onChange={(e) => setRow(index, { notes: e.target.value })}
                            className="input"
                            placeholder="Brief details"
                          />
                        </div>

                        {needs && (
                          <div>
                            <div className="text-zinc-300 text-sm mb-1">Photo</div>
                            <input
                              type="file"
                              accept="image/*"
                              ref={(el) => { inputFileRefs.current[row.checkpoint] = el; }}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const f = e.target.files?.[0];
                                if (f) handleFile(f, index);
                              }}
                              className="input"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            </div>
          ))}
        </div>

        <div className="sticky bottom-4 flex flex-wrap gap-2 justify-end">
          <button className="btn btn-secondary" onClick={() => { clearDraft(); onCancel(); }}>Discard Draft</button>
          <button className="btn btn-secondary" onClick={() => saveDraft({ venue, month, rows })}>Save Draft</button>
          <button className="btn btn-primary" onClick={finalise} disabled={!allComplete}><FileDown size={16}/>Finalise</button>
        </div>
      </div>
    </div>
  );
}

/** ---------- Actions table ---------- */
function ActionsTable({ actions, update }: { actions: ActionItem[]; update: (id: string, patch: Partial<ActionItem>) => void }) {
  return (
    <div className="space-y-2">
      {actions.length === 0 && <div className="text-zinc-400 text-sm">No open actions. Nice.</div>}
      {actions.map(a => (
        <div key={a.id} className="grid grid-cols-12 items-center gap-2 card p-3">
          <div className="col-span-3 text-zinc-200 text-sm">
            {a.venue} • {a.category}
            <div className="text-zinc-400 text-xs">{a.checkpoint}</div>
          </div>
          <div className="col-span-2"><span className={`badge ${badgeClass(a.rating)}`}>{a.rating}</span></div>
          <div className="col-span-3 text-zinc-300 text-xs">{a.description}</div>
          <div className="col-span-2 text-zinc-300 text-xs">Owner: {a.owner} • Due {a.due}</div>
          <div className="col-span-2 flex gap-2 justify-end">
            <button className="btn btn-secondary" onClick={() => update(a.id, { status: "In Progress" })}>Start</button>
            <button className="btn btn-primary" onClick={() => update(a.id, { status: "Done" })}><CheckCircle2 size={16}/>Close</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** ---------- History ---------- */
function AuditHistory() {
  const [items, setItems] = useState<Audit[]>(getHistory());
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'auditHistory.json'; a.click(); URL.revokeObjectURL(url);
  };
  const importJSON = async () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/json';
    input.onchange = () => {
      const f = input.files?.[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { try { const arr = JSON.parse(String(r.result)); if (Array.isArray(arr)) { setHistory(arr); setItems(arr); } } catch {} };
      r.readAsText(f);
    };
    input.click();
  };
  const exportPDF = (audit: Audit) => {
    const doc = new jsPDF(); doc.setFontSize(16); doc.text("Audit Report", 10, 10);
    doc.setFontSize(12); doc.text(`Venue: ${audit.venue}`, 10, 20); doc.text(`Month: ${audit.month}`, 10, 26); doc.text(`Score: ${audit.score}%`, 10, 32);
    doc.save(`audit_${audit.venue}_${audit.month}.pdf`);
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={exportJSON}><Download size={14}/>Export JSON</button>
        <button className="btn btn-secondary" onClick={importJSON}><Upload size={14}/>Import JSON</button>
      </div>
      {items.length === 0 && <div className="text-zinc-400 text-sm">No history yet. Finalise an audit to see it here.</div>}
      {items.map(a => (
        <div key={a.id} className="flex items-center justify-between card p-3">
          <div className="text-zinc-100 text-sm">{a.venue} • {a.month}</div>
          <div className="flex items-center gap-2">
            <ScoreBadge score={a.score} />
            <button className="btn btn-secondary" onClick={() => exportPDF(a)}><FileDown size={14}/>Export PDF</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** ---------- Deep Clean ---------- */
type DCItem = { id: string; title: string; due: string; done: boolean };
function DeepCleanSchedule() {
  const [items, setItems] = useState<DCItem[]>(loadDC());
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(new Date().toISOString().slice(0,10));
  useEffect(() => { saveDC(items); }, [items]);

  const add = () => { if (!title || !due) return;
    setItems(prev => [...prev, { id: Math.random().toString(36).slice(2), title, due, done: false }]);
    setTitle("");
  };
  const toggle = (id: string) => setItems(prev => prev.map(i => i.id === id ? { ...i, done: !i.done } : i));
  const remove = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const today = new Date().toISOString().slice(0,10);

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <div className="text-zinc-300 text-sm mb-1">Task</div>
          <input value={title} onChange={(e)=>setTitle(e.target.value)} className="input" placeholder="e.g., Deep clean grill & hood" />
        </div>
        <div>
          <div className="text-zinc-300 text-sm mb-1">Due date</div>
          <input type="date" value={due} onChange={(e)=>setDue(e.target.value)} className="input" />
        </div>
        <div className="flex items-end">
          <button className="btn btn-primary w-full" onClick={add}><Sparkles size={16}/>Add Task</button>
        </div>
      </div>

      <div className="space-y-2">
        {items.length === 0 && <div className="text-zinc-400 text-sm">No deep cleans scheduled. Add your first task.</div>}
        {items.map(item => {
          const overdue = !item.done && item.due < today;
          return (
            <div key={item.id} className={`flex items-center justify-between rounded-xl border p-3 ${overdue ? "border-red-500/40 bg-red-950/20" : "border-zinc-800 bg-zinc-900"}`}>
              <div>
                <div className={`text-sm ${item.done ? "line-through text-zinc-400" : "text-zinc-100"}`}>{item.title}</div>
                <div className={`text-xs ${overdue ? "text-red-400" : "text-zinc-400"}`}>Due {item.due}{overdue ? " • Overdue" : ""}</div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary" onClick={()=>toggle(item.id)}>{item.done ? "Undo" : "Mark Done"}</button>
                <button className="btn btn-primary" onClick={()=>remove(item.id)}>Remove</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
type ActionStatus = "Open" | "In Progress" | "Done";
type ActionItem = {
  id: string;
  venue: Venue;
  month: string;
  category: string;
  checkpoint: string;
  rating: Rating;
  owner: string;
  due: string;     // YYYY-MM-DD
  status: ActionStatus;
  description: string;
};

function statusBadgeClass(status: ActionStatus) {
  switch (status) {
    case "Open": return "bg-zinc-700 text-zinc-200";
    case "In Progress": return "bg-blue-600/20 text-blue-300";
    case "Done": return "bg-green-600/20 text-green-400";
  }
}

function ratingBadgeClass(r: Rating) {
  return {
    Pass: "bg-green-600/20 text-green-400",
    Minor: "bg-amber-600/20 text-amber-400",
    Major: "bg-orange-600/20 text-orange-400",
    Critical: "bg-red-600/20 text-red-400",
    "N/A": "bg-zinc-700 text-zinc-300",
  }[r];
}

function ActionsPanel({
  actions,
  filter,
  venue,
  update,
  onBack,
}: {
  actions: ActionItem[];
  filter: Rating | "All";
  venue: Venue | "All";
  update: (id: string, patch: Partial<ActionItem>) => void;
  onBack: () => void;
}) {
  const items = actions
    .filter(a => a.status !== "Done")
    .filter(a => (venue === "All" ? true : a.venue === venue))
    .filter(a => (filter === "All" ? true : a.rating === filter));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-zinc-300 text-sm">
          {filter === "All" ? "Open Actions" : `Open ${filter} Actions`} • {items.length} item{items.length === 1 ? "" : "s"}
        </div>
        <Button variant="secondary" className="rounded-xl" onClick={onBack}>Back to Dashboard</Button>
      </div>

      {items.length === 0 && (
        <div className="text-zinc-400 text-sm">Nothing open here. Beautiful.</div>
      )}

      <div className="grid gap-3">
        {items.map(a => (
          <Card key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge className={ratingBadgeClass(a.rating)}>{a.rating}</Badge>
                  <span className="text-zinc-200 text-sm">{a.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusBadgeClass(a.status)}>{a.status}</Badge>
                  <span className="text-xs text-zinc-400">Owner: {a.owner}</span>
                  <span className="text-xs text-zinc-400">Due {a.due}</span>
                </div>
              </div>

              <div className="mt-2 text-zinc-100 text-sm">
                {a.checkpoint}
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                {a.description}
              </div>

              <div className="mt-3 flex gap-2 justify-end">
                {a.status === "Open" && (
                  <Button
                    variant="secondary"
                    className="rounded-xl"
                    onClick={() => update(a.id, { status: "In Progress" })}
                  >
                    Start
                  </Button>
                )}
                {a.status !== "Done" && (
                  <Button
                    className="rounded-xl"
                    onClick={() => update(a.id, { status: "Done" })}
                  >
                    Close
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** ---------- Root Page ---------- */
export default function Page() {
  type Route = "dashboard" | "full" | "actions" | "history" | "deepclean" | "complete";
  const [route, setRoute] = useState<Route>("dashboard");
  const [venue, setVenue] = useState<Venue | "All">("All");
  const [actions, setActions] = useState<ActionItem[]>([
    { id: "a1", venue: "Suzie Q", month: "2025-06", category: "Food Safety & Hygiene", checkpoint: "Fridge ≤ 5 °C / Freezer ≤ −15 °C", rating: "Major", owner: "Sous Chef", due: daysFromNow(1), status: "Open", description: "Verify temps; calibrate probes; discard non-compliant stock; log corrective action." },
  ]);
  const [pdfUrl, setPdfUrl] = useState<string>("");

  const updateAction = (id: string, patch: Partial<ActionItem>) => setActions(a => a.map(x => x.id === id ? { ...x, ...patch } : x));

  const onFinalise = (newActions: ActionItem[], audit: Audit, pdfUrlFromAudit: string) => {
    setActions(a => [...newActions, ...a]);
    setPdfUrl(pdfUrlFromAudit);
    setRoute("complete");
  };

  const Header = (
    <header className="flex items-center justify-between p-4 md:p-0">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-2xl bg-zinc-900 border border-zinc-800"><Factory size={18}/></div>
        <h1 className="text-2xl font-semibold">Monthly Audit – Suzie Q & Windsor Wine Room</h1>
      </div>
      <div className="flex items-center gap-2">
        <button className="btn btn-secondary" onClick={() => setRoute("dashboard")}>Home</button>
        <select value={venue} onChange={(e) => setVenue(e.target.value as any)} className="select w-[200px]">
          <option value="All">All Venues</option>
          {VENUES.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {Header}

        <div>
          {route === "dashboard" && (
            <Dashboard
              venue={venue}
              onStartNew={() => setRoute("full")}
              onHistory={() => setRoute("history")}
              onDeep={() => setRoute("deepclean")}
            />
          )}

          {route === "full" && (
            <FullAudit onFinalise={onFinalise} onCancel={() => setRoute("dashboard")} />
          )}

          {route === "actions" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-zinc-300 text-sm">Open actions created from your audits.</div>
                <button className="btn btn-secondary" onClick={() => setRoute("dashboard")}>Back to Dashboard</button>
              </div>
              <ActionsTable actions={actions.filter(a => venue === "All" ? true : a.venue === venue)} update={updateAction} />
            </div>
          )}

          {route === "history" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-zinc-300 text-sm">Previously finalised audits</div>
                <button className="btn btn-secondary" onClick={() => setRoute("dashboard")}>Back to Dashboard</button>
              </div>
              <AuditHistory />
            </div>
          )}

          {route === "deepclean" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-zinc-300 text-sm">Deep cleaning tasks & schedules</div>
                <button className="btn btn-secondary" onClick={() => setRoute("dashboard")}>Back to Dashboard</button>
              </div>
              <DeepCleanSchedule />
            </div>
          )}

          {route === "complete" && (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center">
              <div className="text-3xl font-semibold mb-2">Audit Completed</div>
              <div className="text-zinc-400 mb-6">Nice work. Your PDF is ready.</div>
              <div className="flex gap-3">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary"><FileDown size={16}/>View PDF</a>
                <button className="btn btn-secondary" onClick={()=>setRoute("dashboard")}>Return to Dashboard</button>
              </div>
            </div>
          )}
        </div>

        <footer className="text-xs text-zinc-500 pt-6">
          Drafts save locally until Finalised. Scoring: ≥90 Green, 75-89 Amber, &lt;75 Red.
        </footer>
      </div>
    </div>
  );
}
