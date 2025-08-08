'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, CheckCircle, XCircle } from 'lucide-react';
import jsPDF from 'jspdf';

// TYPES
type Rating = 'Pass' | 'Fail' | 'N/A';

interface Checkpoint {
  category: string;
  checkpoint: string;
  target: string;
  owner: string;
  defaultDue: number;
  suggested: string;
  photo?: boolean; // <-- FIXED: added photo property as optional
}

// DATA
const CHECKPOINTS: Checkpoint[] = [
  {
    category: 'System Compliance',
    checkpoint: 'Prep lists fully ticked?',
    target: '100%',
    owner: 'Sous Chef',
    defaultDue: 3,
    suggested: 'Audit daily prep sheets; retrain on completion standard; implement AM spot-check.',
    photo: false
  },
  {
    category: 'Cleanliness',
    checkpoint: 'Deep clean completed',
    target: 'Weekly',
    owner: 'Head Chef',
    defaultDue: 7,
    suggested: 'Schedule all-staff deep clean and document with photos.',
    photo: true
  },
  // ... add the rest of your checkpoints here with `photo: true/false`
];

// COMPONENT
export default function Page() {
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(false);

  // requirePhoto now safely checks
  const requirePhoto = (checkpoint: string, rating: Rating) => {
    const meta = CHECKPOINTS.find(c => c.checkpoint === checkpoint);
    if (meta?.photo) return true;
    if (rating !== 'Pass' && rating !== 'N/A') return true;
    return false;
  };

  const handleRating = (checkpoint: string, rating: Rating) => {
    setRatings(prev => ({ ...prev, [checkpoint]: rating }));
  };

  const handleNote = (checkpoint: string, note: string) => {
    setNotes(prev => ({ ...prev, [checkpoint]: note }));
  };

  const handlePhoto = (checkpoint: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotos(prev => ({ ...prev, [checkpoint]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    // Could add validation here
    setCompleted(true);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Audit Report', 10, 10);
    CHECKPOINTS.forEach((cp, idx) => {
      doc.text(`${idx + 1}. ${cp.checkpoint}`, 10, 20 + idx * 10);
      doc.text(`Rating: ${ratings[cp.checkpoint] || ''}`, 80, 20 + idx * 10);
    });
    doc.save('audit.pdf');
  };

  return (
    <div className="p-6 space-y-6">
      <img
        src="/mamas-logo.png"
        alt="Logo"
        className="h-12"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      {CHECKPOINTS.map((cp) => (
        <Card key={cp.checkpoint}>
          <CardContent>
            <h2 className="text-lg font-bold">{cp.checkpoint}</h2>
            <div className="flex gap-2 mt-2">
              <Button
                onClick={() => handleRating(cp.checkpoint, 'Pass')}
                variant={ratings[cp.checkpoint] === 'Pass' ? 'default' : 'outline'}
              >
                Pass
              </Button>
              <Button
                onClick={() => handleRating(cp.checkpoint, 'Fail')}
                variant={ratings[cp.checkpoint] === 'Fail' ? 'default' : 'outline'}
              >
                Fail
              </Button>
              <Button
                onClick={() => handleRating(cp.checkpoint, 'N/A')}
                variant={ratings[cp.checkpoint] === 'N/A' ? 'default' : 'outline'}
              >
                N/A
              </Button>
            </div>
            <textarea
              placeholder="Notes"
              value={notes[cp.checkpoint] || ''}
              onChange={(e) => handleNote(cp.checkpoint, e.target.value)}
              className="w-full mt-2 border rounded p-2"
            />
            {requirePhoto(cp.checkpoint, ratings[cp.checkpoint] || 'N/A') && (
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && handlePhoto(cp.checkpoint, e.target.files[0])}
                className="mt-2"
              />
            )}
          </CardContent>
        </Card>
      ))}

      {!completed ? (
        <Button onClick={handleSubmit} className="mt-4">
          Complete Audit
        </Button>
      ) : (
        <div className="flex flex-col items-center mt-4">
          <CheckCircle className="text-green-500 h-8 w-8" />
          <p className="mt-2">Audit completed!</p>
          <div className="flex gap-2 mt-2">
            <Button onClick={exportPDF}>View PDF</Button>
            <Button onClick={() => setCompleted(false)}>Return to Dashboard</Button>
          </div>
        </div>
      )}
    </div>
  );
}
