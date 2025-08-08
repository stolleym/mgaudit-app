"use client";
import Image from "next/image";
import { useState, useEffect } from "react";

// --- types ---
type Checkpoint = {
  category: string;
  checkpoint: string;
  target: string;
  owner: string;
  defaultDue: number;
  suggested: string;
  photo?: boolean; // optional
};

// --- data ---
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

// --- main component ---
export default function Page() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const requirePhoto = (checkpoint: string, rating: string) => {
    const meta = CHECKPOINTS.find(c => c.checkpoint === checkpoint);
    if (meta?.photo) return true;
    if (rating !== "Pass" && rating !== "N/A") return true;
    return false;
  };

  if (showSplash) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "#fff"
      }}>
        <Image src="/mamas-logo.png" alt="Mamas Logo" width={300} height={300} priority />
      </div>
    );
  }

  return (
    <div>
      {/* Your app’s main content here */}
      <h1>Audit Dashboard</h1>
      {/* Example usage of requirePhoto */}
      {CHECKPOINTS.map(c => (
        <div key={c.checkpoint}>
          <strong>{c.checkpoint}</strong> – Requires Photo? {requirePhoto(c.checkpoint, "Pass") ? "Yes" : "No"}
        </div>
      ))}
    </div>
  );
}
