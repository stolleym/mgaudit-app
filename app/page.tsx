"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2, AlertTriangle, XCircle, TrendingUp, Factory, History,
  PlayCircle, FileDown, Upload, Download, Sparkles
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import jsPDF from "jspdf";

// ---------- Domain data & types ----------
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
  photo?: boolean;
};

type AuditRow = {
  category: string;
  checkpoint: string;
  rating: Rating;
  notes: string;
  photoDataUrl: string;
};

type Audit = {
  id: string;
  venue: Venue;
  month: string; // YYYY-MM
  score: number;
  rows: AuditRow[];
};

type ActionStatus = "Open" | "In Progress" | "Done";
type ActionItem = {
  id: string;
  venue: Venue;
  month: string;
  category: string;
  checkpoint: string;
  rating: Rating;
  owner: string;
  due: string; // YYYY-MM-DD
  status: ActionStatus;
  description: string;
};

const severityWeight: Record<Rating, number> = { Pass: 0, Minor: 1, Major: 3, Critical: 5, "N/A": 0 };
const band = (score: number) => (score >= 90 ? "green" : score >= 75 ? "amber" : "red");

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
  { category: "Maintenance", checkpoint: "Critical equipment serviced", target: "No overdue", owner: "Venue Manager", defaultDue: 3, suggested: "Book tech; tag out if needed; close work order." },
];

// ---------- Local storage helpers ----------
const DRAFT_KEY = "auditDraft";
const HISTORY_KEY = "auditHistory";
const DC_KEY = "deepCleanTasks";

const loadDraft = (): { venue: Venue; month: string; rows: AuditRow[] } | null => {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch { return null; }
};
const saveDraft = (v: unknown) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(v)); } catch {} };
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

const getHistory = (): Audit[] => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
};
const setHistory = (arr: Audit[]) => { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); } catch {} };
const pushHistory = (a: Audit) => { const h = getHistory(); h.push(a); setHistory(h); };

const loadDC = (): DCItem[] => {
  try { return JSON.parse(localStorage.getItem(DC_KEY) || "[]"); } catch { return []; }
};
const saveDC = (v: DCItem[]) => { try { localStorage.setItem(DC_KEY, JSON.stringify(v)); } catch {} };

// ---------- Utilities ----------
function daysFromNow(days: number) { const d = new Date(); d.setDate(d.getDate() + Math.max(0, days)); return d.toISOString().slice(0,10); }
function badgeClass(r: Rating) {
  return { Pass: "bg-green-600/20 text-green-400", Minor: "bg-amber-600/20 text-amber-400", Major: "bg-orange-600/20 text-orange-400", Critical: "bg-red-600/20 text-red-400", "N/A": "bg-zinc-700 text-zinc-300" }[r];
}
const classField = () => "bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400";

// ---------- Mock chart data ----------
const mockAudits = [
  { id: 1, venue: "Suzie Q" as Venue, month: "2025-04", ratings: { green: 14, amber: 2, red: 1 }, score: 88 },
  { id: 2, venue: "Suzie Q" as Venue, month: "2025-05", ratings: { green: 15, amber: 1, red: 1 }, score: 91 },
  { id: 3, venue: "Suzie Q" as Venue, month: "2025-06", ratings: { green: 15, amber: 1, red: 1 }, score: 92 },
  { id: 4, venue: "Windsor Wine Room" as Venue, month: "2025-04", ratings: { green: 13, amber: 3, red: 1 }, score: 85 },
  { id: 5, venue: "Windsor Wine Room" as Venue, month: "2025-05", ratings: { green: 14, amber: 2, red: 1 }, score: 88 },
  { id: 6, venue: "Windsor Wine Room" as Venue, month: "2025-06", ratings: { green: 15, amber: 1, red: 1 }, score: 90 },
];

// ---------- UI bits ----------
function ScoreBadge({ score }: { score: number }) {
  const b = band(score); const map = { green: "bg-green-600/20 text-green-400", amber: "bg-amber-600/20 text-amber-400", red: "bg-red-600/20 text-red-400" } as const;
  return <Badge className={`text-xs ${map[b]} rounded-full`}>{score}%</Badge>;
}
function KPI({ title, value, icon }: { title: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <Card className="rounded-2xl shadow-md bg-zinc-900 border-zinc-800">
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

function Dashboard({ venue, onStartNew, onHistory, onDeep }: { venue: Venue | "All"; onStartNew: () => void; onHistory: () => void; onDeep: () => void }) {
  const data = useMemo(() => mockAudits.filter(a => venue === "All" ? true : a.venue === venue), [venue]);
  const latest = data[data.length - 1];
  const openCritical = 1; const openMajor = 3;
  const lineData = data.map(d => ({ month: d.month, score: d.score }));
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="text-zinc-300 text-sm">Welcome back. Start a fresh audit or review history.</div>
        <div className="flex gap-2">
          <Button className="rounded-xl" onClick={onStartNew}><PlayCircle size={16} className="mr-2"/>Start New Audit</Button>
          <Button variant="secondary" className="rounded-xl" onClick={onHistory}><History size={16} className="mr-2"/>Audit History</Button>
          <Button variant="secondary" className="rounded-xl" onClick={onDeep}><Sparkles size={16} className="mr-2"/>Deep Clean</Button>
        </div>
      </div>
      <Card className="rounded-2xl bg-zinc-900 border-zinc-800">
        <CardContent className="p-4 h-[260px]">
          <div className="text-zinc-300 text-sm mb-2">Audit Score Trend</div>
          <div style={{width:'100%',height:'100%'}}>
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
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-2xl bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 h-[260px]">
            <div className="text-zinc-300 text-sm mb-2">Ratings Distribution (last 3 months)</div>
            <div style={{width:'100%',height:'100%'}}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.map(d => ({ month: d.month, Green: d.ratings.green, Amber: d.ratings.amber, Red: d.ratings.red }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Legend />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
                  <Bar dataKey="Green" fill="#22c55e" />
                  <Bar dataKey="Amber" fill="#f59e0b" />
                  <Bar dataKey="Red" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="text-zinc-300 text-sm mb-2">Last 6 Audits</div>
            <div className="space-y-2">
              {data.slice(-6).map(a => (
                <div key={a.id} className="flex items-center justify-between rounded-xl bg-zinc-800/60 px-3 py-2">
                  <div className="text-zinc-200 text-sm">{a.venue} • {a.month}</div>
                  <ScoreBadge score={a.score} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------- Full Audit ----------
function FullAudit({ onFinalise, onCancel }: { onFinalise: (actions: ActionItem[], audit: Audit, pdfUrl: string) => void; onCancel: () => void }) {
  const draft = loadDraft();
  const [venue, setVenue] = useState<Venue>(draft?.venue || "Suzie Q");
  const [month, setMonth] = useState<string>(draft?.month || new Date().toISOString().slice(0,7));
  const initial: AuditRow[] =
    (draft?.rows as AuditRow[] | undefined) ||
    CHECKPOINTS.map((cp) => ({
      category: cp.category,
      checkpoint: cp.checkpoint,
      rating: "Pass",
      notes: "",
      photoDataUrl: "",
    }));
  const [rows, setRows] = useState<AuditRow[]>(initial);
  useEffect(() => { saveDraft({ venue, month, rows }); }, [venue, month, rows]);

  const inputFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const requirePhoto = (checkpoint: string, rating: Rating) => {
    const meta = CHECKPOINTS.find(c => c.checkpoint === checkpoint);
    if (meta?.photo) return true;
    if (rating !== "Pass" && rating !== "N/A") return true;
    return false;
  };

  const grouped = useMemo<[string, AuditRow[]][]>(() => {
    const m = new Map<string, AuditRow[]>();
    rows.forEach((r: AuditRow) => {
      if (!m.has(r.category)) m.set(r.category, []);
      m.get(r.category)!.push(r);
    });
    return Array.from(m.entries());
  }, [rows]);

  const sectionProgress = useMemo((): { cat: string; total: number; done: number }[] => {
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

  const setRow = (index: number, patch: Partial<AuditRow>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

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
    rows.forEach((r) => {
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
          due: daysFromNow((meta?.defaultDue ?? 3) - (sev >= 3 ? 2 : 0)),
          status: "Open",
          description: `${meta?.suggested ?? "Correct and retrain."} ${r.notes ? `Notes: ${r.notes}` : ""}`.trim(),
        });
      }
    });
    const audit: Audit = { id: Math.random().toString(36).slice(2), venue, month, score, rows };

    const doc = buildPDF(audit, actions, true);
    const pdfUrl = doc.output("bloburl");

    Object.values(inputFileRefs.current).forEach((el) => { if (el) el.value = ""; });

    clearDraft(); pushHistory(audit);
    onFinalise(actions, audit, pdfUrl);
  };

  return (
    <div className="grid md:grid-cols-12 gap-4">
      {/* Sidebar */}
      <aside className="md:col-span-3">
        <Card className="bg-zinc-900 border-zinc-800 rounded-2xl sticky top-4">
          <CardContent className="p-4 space-y-2">
            <div className="text-zinc-300 text-sm mb-1">Progress</div>
            {sectionProgress.map(s => (
              <div key={s.cat} className="flex items-center justify-between text-sm">
                <span className="text-zinc-200">{s.cat}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${s.done===s.total? 'bg-green-600/20 text-green-400':'bg-zinc-700 text-zinc-300'}`}>{s.done}/{s.total}</span>
              </div>
            ))}
            <div className="pt-2 text-xs text-zinc-400">{allComplete ? 'All sections complete.' : 'Some sections still need photos.'}</div>
          </CardContent>
        </Card>
      </aside>

      {/* Form */}
      <div className="md:col-span-9 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-zinc-300">Venue</Label>
            <Select value={venue} onValueChange={(v) => setVenue(v as Venue)}>
              <SelectTrigger className={`rounded-xl ${classField()}`}><SelectValue placeholder="Select venue" /></SelectTrigger>
              <SelectContent className="bg-zinc-900 text-zinc-100 border-zinc-800">
                {VENUES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-zinc-300">Audit Month (YYYY-MM)</Label>
            <Input value={month} onChange={e => setMonth(e.target.value)} className={`rounded-xl ${classField()}`} placeholder="2025-07" />
          </div>
        </div>

        <div className="space-y-3">
          {grouped.map(([cat, items]) => (
            <Card key={cat} className="bg-zinc-900 border-zinc-800 rounded-2xl">
              <CardContent className="p-0">
                <details className="group" open>
                  <summary className="list-none cursor-pointer select-none px-4 py-3 flex items-center justify-between border-b border-zinc-800">
                    <span className="text-zinc-100 font-medium">{cat}</span>
                    <span className="text-zinc-400 text-xs">{items.length} checks</span>
                  </summary>
                  <div className="p-4 grid gap-3">
                    {items.map((row) => {
                      const index = rows.findIndex(r => r.checkpoint === row.checkpoint);
                      return (
                        <div key={row.checkpoint} className="grid md:grid-cols-5 gap-3 bg-zinc-900">
                          <div className="col-span-2">
                            <Label className="text-zinc-300">Checkpoint</Label>
                            <div className="text-zinc-100 text-sm">{row.checkpoint}</div>
                            <div className="text-zinc-500 text-xs">Target: {CHECKPOINTS.find(c=>c.checkpoint===row.checkpoint)?.target}</div>
                          </div>
                          <div>
                            <Label className="text-zinc-300">Rating</Label>
                            <Select value={rows[index].rating} onValueChange={(v) => setRow(index, { rating: v as Rating })}>
                              <SelectTrigger className={`rounded-xl ${classField()}`}><SelectValue placeholder="Select rating" /></SelectTrigger>
                              <SelectContent className="bg-zinc-900 text-zinc-100 border-zinc-800">
                                {["Pass","Minor","Major","Critical","N/A"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-zinc-300">Notes</Label>
                            <Input value={rows[index].notes} onChange={(e) => setRow(index, { notes: e.target.value })} className={`rounded-xl ${classField()}`} placeholder="Brief details" />
                          </div>
                          {(() => {
                            const needs = requirePhoto(row.checkpoint, rows[index].rating);
                            return needs ? (
                              <div>
                                <Label className="text-zinc-300">Photo</Label>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  ref={el => (inputFileRefs.current[row.checkpoint] = el)}
                                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], index)}
                                  className={`rounded-xl ${classField()}`}
                                />
                              </div>
                            ) : null;
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="sticky bottom-4 flex flex-wrap gap-2 justify-end">
          <Button variant="secondary" className="rounded-xl" onClick={() => { clearDraft(); onCancel(); }}>Discard Draft</Button>
          <Button className="rounded-xl" onClick={() => saveDraft({ venue, month, rows })}>Save Draft</Button>
          <Button className="rounded-xl" onClick={finalise} disabled={!allComplete}><FileDown size={16} className="mr-2"/>Finalise</Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Actions table ----------
function ActionsTable({ actions, update }: { actions: ActionItem[]; update: (id: string, patch: Partial<ActionItem>) => void }) {
  return (
    <div className="space-y-2">
      {actions.length === 0 && <div className="text-zinc-400 text-sm">No open actions. Nice.</div>}
      {actions.map(a => (
        <div key={a.id} className="grid grid-cols-12 items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <div className="col-span-3 text-zinc-200 text-sm">{a.venue} • {a.category}<div className="text-zinc-400 text-xs">{a.checkpoint}</div></div>
          <div className="col-span-2"><Badge className={badgeClass(a.rating)}>{a.rating}</Badge></div>
          <div className="col-span-3 text-zinc-300 text-xs">{a.description}</div>
          <div className="col-span-2 text-zinc-300 text-xs">Owner: {a.owner} • Due {a.due}</div>
          <div className="col-span-2 flex gap-2 justify-end">
            <Button variant="secondary" className="rounded-xl" onClick={() => update(a.id, { status: "In Progress" })}>Start</Button>
            <Button className="rounded-xl" onClick={() => update(a.id, { status: "Done" })}><CheckCircle2 size={16} className="mr-1"/>Close</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- History ----------
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
      r.onload = () => { try {
        const arr = JSON.parse(String(r.result)) as Audit[];
        if (Array.isArray(arr)) { setHistory(arr); setItems(arr); }
      } catch {} };
      r.readAsText(f);
    };
    input.click();
  };
  const exportPDF = (audit: Audit) => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("Audit Report", 10, 10);
    doc.setFontSize(12); doc.text(`Venue: ${audit.venue}`, 10, 20);
    doc.text(`Month: ${audit.month}`, 10, 26);
    doc.text(`Score: ${audit.score}%`, 10, 32);
    doc.save(`audit_${audit.venue}_${audit.month}.pdf`);
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button size="sm" className="rounded-xl" onClick={exportJSON}><Download size={14} className="mr-1"/>Export JSON</Button>
        <Button size="sm" variant="secondary" className="rounded-xl" onClick={importJSON}><Upload size={14} className="mr-1"/>Import JSON</Button>
      </div>
      {items.length === 0 && <div className="text-zinc-400 text-sm">No history yet. Finalise an audit to see it here.</div>}
      {items.map(a => (
        <div key={a.id} className="flex items-center justify-between rounded-xl bg-zinc-900 border border-zinc-800 p-3">
          <div className="text-zinc-100 text-sm">{a.venue} • {a.month}</div>
          <div className="flex items-center gap-2">
            <ScoreBadge score={a.score} />
            <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => exportPDF(a)}><FileDown size={14} className="mr-1"/>Export PDF</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Deep Clean ----------
type DCItem = { id: string; title: string; due: string; done: boolean };
function DeepCleanSchedule() {
  const [items, setItems] = useState<DCItem[]>(loadDC());
  const [title, setTitle] = useState<string>("");
  const [due, setDue] = useState<string>(new Date().toISOString().slice(0,10));
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
          <Label className="text-zinc-300">Task</Label>
          <Input value={title} onChange={(e)=>setTitle(e.target.value)} className={`rounded-xl ${classField()}`} placeholder="e.g., Deep clean grill & hood" />
        </div>
        <div>
          <Label className="text-zinc-300">Due date</Label>
          <Input type="date" value={due} onChange={(e)=>setDue(e.target.value)} className={`rounded-xl ${classField()}`} />
        </div>
        <div className="flex items-end">
          <Button className="rounded-xl w-full" onClick={add}><Sparkles size={16} className="mr-2"/>Add Task</Button>
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
                <Button variant="secondary" className="rounded-xl" onClick={()=>toggle(item.id)}>{item.done ? "Undo" : "Mark Done"}</Button>
                <Button className="rounded-xl" onClick={()=>remove(item.id)}>Remove</Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Self-tests ----------
function useSelfTests() {
  useEffect(() => {
    const base = 100;
    console.assert(base - severityWeight["Minor"] * 5 === 95, "Minor should deduct 5");
    console.assert(base - severityWeight["Major"] * 5 === 85, "Major should deduct 15");
    console.assert(base - severityWeight["Critical"] * 5 === 75, "Critical should deduct 25");
    console.assert(band(91) === "green", "≥90 green");
    console.assert(band(80) === "amber", "75–89 amber");
    console.assert(band(60) === "red", "<75 red");
    const d0 = daysFromNow(0); const d2 = daysFromNow(2);
    console.assert(d0.length === 10 && d0.includes("-"), "daysFromNow format");
    console.assert(d2 >= d0, "daysFromNow forward");
  }, []);
}

// ---------- Root App ----------
export default function Page() {
  useSelfTests();
  type Route = "splash" | "dashboard" | "full" | "actions" | "history" | "deepclean" | "complete";
  const [route, setRoute] = useState<Route>("splash");
  const [venue, setVenue] = useState<Venue | "All">("All");
  const [actions, setActions] = useState<ActionItem[]>([
    { id: "a1", venue: "Suzie Q", month: "2025-06", category: "Food Safety & Hygiene", checkpoint: "Fridge ≤ 5 °C / Freezer ≤ −15 °C", rating: "Major", owner: "Sous Chef", due: daysFromNow(1), status: "Open", description: "Verify temps; calibrate probes; discard non-compliant stock; log corrective action." },
  ]);
  const [pdfUrl, setPdfUrl] = useState<string>("");

  // Splash → Dashboard after 2.5s
  useEffect(() => {
    if (route !== "splash") return;
    const t = setTimeout(()=>setRoute("dashboard"), 2500);
    return ()=>clearTimeout(t);
  }, [route]);

  const updateAction = (id: string, patch: Partial<ActionItem>) =>
    setActions(a => a.map(x => x.id === id ? { ...x, ...patch } : x));

  const onFinalise = (newActions: ActionItem[], _audit: Audit, pdfUrlFromAudit: string) => {
    setActions(a => [...newActions, ...a]);
    setPdfUrl(pdfUrlFromAudit);
    setRoute("complete");
  };

  const Header = (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-2xl bg-zinc-900 border-zinc-800"><Factory size={18}/></div>
        <h1 className="text-2xl font-semibold">Monthly Audit – Suzie Q & Windsor Wine Room</h1>
      </div>
      <div className="flex items-center gap-2">
        {route !== "splash" && (
          <>
            <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => setRoute("dashboard")}>Home</Button>
            <Select value={venue} onValueChange={(v) => setVenue(v as any)}>
              <SelectTrigger className={`rounded-xl w-[200px] bg-zinc-900 border-zinc-800 text-zinc-100`}><SelectValue placeholder="All Venues"/></SelectTrigger>
              <SelectContent className="bg-zinc-900 text-zinc-100 border-zinc-800">
                <SelectItem value="All">All Venues</SelectItem>
                {VENUES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        )}
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-[#0E0E10] text-zinc-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {route !== "splash" && Header}

        <div className="animate-fadeinup">
          {route === "splash" && (
            <div className="flex items-center justify-center h-[80vh]">
              <Image src="/mamas-logo.png" alt="Mamas Dining Group" width={260} height={260} className="opacity-95" priority />
            </div>
          )}

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

          {route === "history" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-zinc-300 text-sm">Previously finalised audits</div>
                <Button variant="secondary" className="rounded-xl" onClick={() => setRoute("dashboard")}>Back to Dashboard</Button>
              </div>
              <AuditHistory />
            </div>
          )}

          {route === "deepclean" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-zinc-300 text-sm">Deep cleaning tasks & schedules</div>
                <Button variant="secondary" className="rounded-xl" onClick={() => setRoute("dashboard")}>Back to Dashboard</Button>
              </div>
              <DeepCleanSchedule />
            </div>
          )}

          {route === "complete" && (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center">
              <div className="text-3xl font-semibold mb-2">Audit Completed</div>
              <div className="text-zinc-400 mb-6">Nice work. Your PDF is ready.</div>
              <div className="flex gap-3">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="rounded-xl"><FileDown size={16} className="mr-2"/>View PDF</Button>
                </a>
                <Button variant="secondary" className="rounded-xl" onClick={()=>setRoute("dashboard")}>Return to Dashboard</Button>
              </div>
            </div>
          )}
        </div>

        {route !== "splash" && <footer className="text-xs text-zinc-500 pt-6">Drafts save locally until Finalised. Scoring: ≥90 Green, 75-89 Amber, &lt;75 Red.</footer>}
      </div>
    </div>
  );
}
