import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Bot, FlaskConical, CheckCircle, ChevronRight, FileDown, Thermometer, Droplets, Eye, Lightbulb, Volume2, VolumeX, Calculator, NotebookPen, MessageCircle, Equal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVR } from '../context/VRContext';
import { supabase, Experiment, ExperimentStep } from '../lib/supabase';
import ThreeLabCanvas from '../components/ThreeLabCanvas';
import VRModeToggle from '../components/VRModeToggle';

type RightTab = 'tutor' | 'calc' | 'notes';

interface AiMessage {
  role: 'user' | 'ai';
  text: string;
  type?: 'hint' | 'correction' | 'info';
}

interface ReactionState {
  color: string;
  temperature: number;
  hasPrecipitate: boolean;
  gasProduced: boolean;
  colorName: string;
}

// ─── Chemistry formula definitions ──────────────────────────────────────────
interface FormulaField { key: string; label: string; unit: string; placeholder: string }
interface Formula {
  id: string;
  name: string;
  formula: string;
  description: string;
  fields: FormulaField[];
  solve: (inputs: Record<string, number>) => { label: string; value: number; unit: string } | null;
}

const FORMULAS: Formula[] = [
  {
    id: 'molarity',
    name: 'Molarity',
    formula: 'M = n / V',
    description: 'Moles of solute per litre of solution',
    fields: [
      { key: 'n', label: 'Moles of solute', unit: 'mol', placeholder: 'e.g. 0.1' },
      { key: 'V', label: 'Volume', unit: 'L', placeholder: 'e.g. 0.5' },
    ],
    solve: ({ n, V }) => V ? { label: 'Molarity (M)', value: n / V, unit: 'mol/L' } : null,
  },
  {
    id: 'titration',
    name: 'Titration',
    formula: 'M₁V₁ = M₂V₂',
    description: 'Find unknown concentration at equivalence point',
    fields: [
      { key: 'M1', label: 'Molarity of solution 1', unit: 'mol/L', placeholder: 'e.g. 0.1' },
      { key: 'V1', label: 'Volume of solution 1', unit: 'mL', placeholder: 'e.g. 25' },
      { key: 'V2', label: 'Volume of solution 2', unit: 'mL', placeholder: 'e.g. 30' },
    ],
    solve: ({ M1, V1, V2 }) => V2 ? { label: 'Molarity of solution 2 (M₂)', value: (M1 * V1) / V2, unit: 'mol/L' } : null,
  },
  {
    id: 'moles',
    name: 'Moles from Mass',
    formula: 'n = m / Mᵣ',
    description: 'Calculate moles from mass and molar mass',
    fields: [
      { key: 'm', label: 'Mass', unit: 'g', placeholder: 'e.g. 4' },
      { key: 'Mr', label: 'Molar mass', unit: 'g/mol', placeholder: 'e.g. 40 (NaOH)' },
    ],
    solve: ({ m, Mr }) => Mr ? { label: 'Moles (n)', value: m / Mr, unit: 'mol' } : null,
  },
  {
    id: 'ph',
    name: 'pH Calculation',
    formula: 'pH = −log[H⁺]',
    description: 'Measure of hydrogen ion concentration',
    fields: [
      { key: 'H', label: '[H⁺] concentration', unit: 'mol/L', placeholder: 'e.g. 0.001' },
    ],
    solve: ({ H }) => H > 0 ? { label: 'pH', value: -Math.log10(H), unit: '' } : null,
  },
  {
    id: 'poh',
    name: 'pOH Calculation',
    formula: 'pOH = −log[OH⁻]',
    description: 'pH + pOH = 14 at 25°C',
    fields: [
      { key: 'OH', label: '[OH⁻] concentration', unit: 'mol/L', placeholder: 'e.g. 0.01' },
    ],
    solve: ({ OH }) => OH > 0 ? { label: 'pOH', value: -Math.log10(OH), unit: '' } : null,
  },
  {
    id: 'yield',
    name: 'Percentage Yield',
    formula: '%yield = (actual / theoretical) × 100',
    description: 'Efficiency of a chemical reaction',
    fields: [
      { key: 'actual', label: 'Actual yield', unit: 'g', placeholder: 'e.g. 3.6' },
      { key: 'theoretical', label: 'Theoretical yield', unit: 'g', placeholder: 'e.g. 4.0' },
    ],
    solve: ({ actual, theoretical }) => theoretical ? { label: '% Yield', value: (actual / theoretical) * 100, unit: '%' } : null,
  },
  {
    id: 'density',
    name: 'Density',
    formula: 'ρ = m / V',
    description: 'Mass per unit volume',
    fields: [
      { key: 'm', label: 'Mass', unit: 'g', placeholder: 'e.g. 50' },
      { key: 'V', label: 'Volume', unit: 'mL', placeholder: 'e.g. 25' },
    ],
    solve: ({ m, V }) => V ? { label: 'Density (ρ)', value: m / V, unit: 'g/mL' } : null,
  },
  {
    id: 'boyle',
    name: "Boyle's Law",
    formula: 'P₁V₁ = P₂V₂',
    description: 'Pressure-volume relationship at constant temperature',
    fields: [
      { key: 'P1', label: 'Initial pressure', unit: 'atm', placeholder: 'e.g. 1' },
      { key: 'V1', label: 'Initial volume', unit: 'L', placeholder: 'e.g. 2' },
      { key: 'P2', label: 'Final pressure', unit: 'atm', placeholder: 'e.g. 2' },
    ],
    solve: ({ P1, V1, P2 }) => P2 ? { label: 'Final volume (V₂)', value: (P1 * V1) / P2, unit: 'L' } : null,
  },
  {
    id: 'charles',
    name: "Charles's Law",
    formula: 'V₁/T₁ = V₂/T₂',
    description: 'Volume-temperature relationship at constant pressure',
    fields: [
      { key: 'V1', label: 'Initial volume', unit: 'L', placeholder: 'e.g. 2' },
      { key: 'T1', label: 'Initial temperature', unit: 'K', placeholder: 'e.g. 300' },
      { key: 'T2', label: 'Final temperature', unit: 'K', placeholder: 'e.g. 400' },
    ],
    solve: ({ V1, T1, T2 }) => T1 ? { label: 'Final volume (V₂)', value: (V1 * T2) / T1, unit: 'L' } : null,
  },
  {
    id: 'ideal_gas',
    name: 'Ideal Gas Law',
    formula: 'PV = nRT',
    description: 'R = 0.08206 L·atm/mol·K',
    fields: [
      { key: 'P', label: 'Pressure', unit: 'atm', placeholder: 'e.g. 1' },
      { key: 'V', label: 'Volume', unit: 'L', placeholder: 'e.g. 22.4' },
      { key: 'T', label: 'Temperature', unit: 'K', placeholder: 'e.g. 273' },
    ],
    solve: ({ P, V, T }) => T ? { label: 'Moles of gas (n)', value: (P * V) / (0.08206 * T), unit: 'mol' } : null,
  },
];

// ─── AI responses ─────────────────────────────────────────────────────────
const AI_RESPONSES: Record<string, string[]> = {
  default: [
    "Great question! In chemistry, precision is key. Make sure you follow each step carefully.",
    "Remember to always observe the reaction carefully. Colors, temperature, and gas formation are all important indicators.",
    "Safety first! Always wear your protective equipment and handle chemicals with care.",
    "The reaction you're observing is driven by changes in electron arrangement. Keep watching!",
    "That's a good observation. Write it down in your Notes tab so you can include it in your report.",
  ],
  titration: [
    "Watch the color change at the equivalence point — it should turn from colorless to pale pink with phenolphthalein.",
    "Add the NaOH drop by drop near the endpoint. Rapid addition can cause you to overshoot!",
    "Use M₁V₁ = M₂V₂ in the Calculations tab to find the unknown concentration.",
    "Record your burette readings before and after — you'll need both for the volume calculation.",
  ],
  flame: [
    "Sodium produces a very bright yellow flame that can mask other colors — use cobalt blue glass to filter it.",
    "The colors come from excited electrons returning to ground state, releasing energy as visible light.",
    "Make sure your nichrome wire is thoroughly cleaned between tests to avoid contamination.",
    "Potassium produces a lilac/violet flame that's easier to see through cobalt blue glass.",
  ],
  electrolysis: [
    "Hydrogen forms at the cathode, the negative electrode, and oxygen at the anode, the positive electrode.",
    "The volume ratio of hydrogen to oxygen should be approximately 2 to 1 — this confirms the water formula H₂O.",
    "The glowing splint test confirms oxygen: it will relight when held near the oxygen-filled tube.",
    "Adding electrolyte like sodium sulfate improves conductivity without being consumed in the reaction.",
  ],
  precipitation: [
    "Precipitation occurs when the product of ion concentrations exceeds the Ksp, the solubility product.",
    "AgCl is white, BaSO₄ is white, but PbI₂ is a distinctive bright yellow — a classic qualitative test.",
    "Net ionic equations only show the species actually participating in the reaction.",
    "The cloudiness you see is actually millions of tiny insoluble particles forming in solution.",
  ],
};

function getAIResponse(question: string, experiment: Experiment, currentStep: number, steps: ExperimentStep[]): string {
  const q = question.toLowerCase();
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  // Step-specific: user asking to repeat, next, current, or what to do
  const stepKeywords = ['next step', 'current step', 'say again', 'repeat', 'what step', 'what do i do', 'what should i do', 'tell me the step', 'what now', 'step again', 'again', 'next'];
  if (stepKeywords.some(kw => q.includes(kw)) || (q.includes('step') && (q.includes('say') || q.includes('tell') || q.includes('again') || q.includes('what') || q.includes('current')))) {
    if (step) {
      return `You're currently on Step ${currentStep + 1} of ${steps.length}: "${step.title}". Here's what to do: ${step.desc}${isLastStep ? ' This is the final step — complete it to finish the experiment!' : ` After this, you'll move to step ${currentStep + 2}.`}`;
    }
  }

  // Hint for current step specifically
  if (q.includes('hint') || q.includes('help me') || q.includes('stuck') || q.includes('don\'t know') || q.includes("don't know")) {
    if (step) {
      return `Here's a hint for Step ${currentStep + 1} — "${step.title}": ${step.desc}. Take your time and observe carefully!`;
    }
  }

  // Safety questions
  if (q.includes('safe') || q.includes('danger') || q.includes('hazard')) {
    return `For "${experiment.title}", key safety precautions include: ${experiment.safety_notes.join('; ')}. Always wear protective equipment!`;
  }

  // Chemical/formula questions
  if (q.includes('chemical') || q.includes('reagent') || q.includes('material')) {
    return `This experiment uses: ${experiment.chemicals.join(', ')}. Each plays an important role. Check the Calculations tab for relevant formulas!`;
  }

  // Formula-specific questions
  if (q.includes('formula') || q.includes('equation') || q.includes('calculate') || q.includes('calculation')) {
    return `Open the Calculations tab on the right to access all chemistry formulas — molarity, titration (M₁V₁=M₂V₂), pH, moles, percentage yield, and more! You can calculate values directly there.`;
  }

  // Objective/goal questions
  if (q.includes('objective') || q.includes('goal') || q.includes('learn') || q.includes('purpose')) {
    return `The objectives for this experiment are: ${experiment.objectives.join('; ')}.`;
  }

  // Progress questions
  if (q.includes('progress') || q.includes('how many') || q.includes('how far') || q.includes('finish') || q.includes('done')) {
    return `You've completed ${currentStep} out of ${steps.length} steps. You're currently on Step ${currentStep + 1}: "${step?.title}". ${isLastStep ? 'You\'re on the last step!' : `${steps.length - currentStep - 1} step(s) remaining.`}`;
  }

  // Experiment-specific pool
  let pool = AI_RESPONSES.default;
  if (experiment.title.toLowerCase().includes('titration')) pool = [...AI_RESPONSES.titration, ...AI_RESPONSES.default];
  else if (experiment.title.toLowerCase().includes('flame')) pool = [...AI_RESPONSES.flame, ...AI_RESPONSES.default];
  else if (experiment.title.toLowerCase().includes('electrolysis')) pool = [...AI_RESPONSES.electrolysis, ...AI_RESPONSES.default];
  else if (experiment.title.toLowerCase().includes('precipitation')) pool = [...AI_RESPONSES.precipitation, ...AI_RESPONSES.default];

  return pool[Math.floor(Math.random() * pool.length)];
}

function getReactionState(experimentTitle: string, step: number, totalSteps: number): ReactionState {
  const progress = step / totalSteps;
  if (experimentTitle.toLowerCase().includes('titration')) {
    return { color: progress >= 0.8 ? '#ff69b4' : '#e8f4f8', colorName: progress >= 0.8 ? 'Pink (endpoint reached)' : 'Colorless', temperature: 22 + progress * 2, hasPrecipitate: false, gasProduced: false };
  } else if (experimentTitle.toLowerCase().includes('flame')) {
    const colors = ['#ff4500', '#ffdd00', '#ff6347', '#40e0d0', '#ff8c00'];
    const colorNames = ['Crimson (Li)', 'Yellow (Na)', 'Lilac (K)', 'Green-Blue (Cu)', 'Orange-Red (Ca)'];
    const idx = Math.min(Math.floor(progress * colors.length), colors.length - 1);
    return { color: colors[idx], colorName: colorNames[idx], temperature: 800 + step * 100, hasPrecipitate: false, gasProduced: false };
  } else if (experimentTitle.toLowerCase().includes('electrolysis')) {
    return { color: '#d0f0ff', colorName: 'Clear with bubbles', temperature: 20 + progress * 5, hasPrecipitate: false, gasProduced: progress > 0.3 };
  } else if (experimentTitle.toLowerCase().includes('precipitation')) {
    return { color: progress > 0.3 ? '#f5f5dc' : '#e8f4f8', colorName: step === 3 ? 'Yellow (PbI₂)' : step >= 1 ? 'White precipitate' : 'Clear', temperature: 21, hasPrecipitate: progress > 0.25, gasProduced: false };
  }
  return { color: '#e8f8e8', colorName: 'Clear', temperature: 22, hasPrecipitate: false, gasProduced: false };
}

// ─── Experiment-specific chemical equations & key formulas ──────────────────
function getExperimentChemistry(title: string): { equations: string[]; keyFormulas: string[]; reaction: string } {
  const t = title.toLowerCase();
  if (t.includes('titration')) return {
    equations: [
      'HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)',
      'Net ionic: H⁺(aq) + OH⁻(aq) → H₂O(l)',
      'Equivalence point: moles acid = moles base',
    ],
    keyFormulas: ['M = n/V (Molarity)', 'M₁V₁ = M₂V₂ (Titration)', 'pH = −log[H⁺]', 'n = m/Mᵣ (Moles)'],
    reaction: 'Acid-Base Neutralization — HCl + NaOH → NaCl + H₂O. Phenolphthalein turns pale pink at equivalence point (pH ≈ 7).',
  };
  if (t.includes('flame')) return {
    equations: [
      'Li: 2p⁶→2p⁵3s¹ transition → 670 nm (Crimson)',
      'Na: 3s¹→3p¹ transition → 589 nm (Yellow)',
      'K: 4s¹→4p¹ transition → 766 nm (Lilac)',
      'Cu: 3d¹⁰4s¹→3d¹⁰4p¹ transition → 510 nm (Green-Blue)',
    ],
    keyFormulas: ['E = hν (Photon energy)', 'E = hc/λ (Energy-wavelength)', 'ΔE = E₂ − E₁ (Energy transition)'],
    reaction: 'Electron Excitation — heat excites outer electrons to higher energy levels; when they return to ground state, they emit characteristic wavelengths of visible light.',
  };
  if (t.includes('electrolysis')) return {
    equations: [
      'Overall: 2H₂O(l) → 2H₂(g) + O₂(g)',
      'Cathode (−): 4H₂O + 4e⁻ → 2H₂ + 4OH⁻',
      'Anode (+): 2H₂O → O₂ + 4H⁺ + 4e⁻',
      'Volume ratio H₂:O₂ = 2:1',
    ],
    keyFormulas: ['Q = It (Charge)', 'n = Q/96485 (Faraday)', 'PV = nRT (Ideal Gas)', 'V ratio H₂:O₂ = 2:1'],
    reaction: 'Electrolytic Decomposition — electrical energy breaks water into hydrogen gas at the cathode and oxygen gas at the anode. The 2:1 volume ratio confirms H₂O formula.',
  };
  if (t.includes('precipitation')) return {
    equations: [
      'AgNO₃(aq) + NaCl(aq) → AgCl(s)↓ + NaNO₃(aq)  [white precipitate]',
      'BaCl₂(aq) + Na₂SO₄(aq) → BaSO₄(s)↓ + 2NaCl(aq)  [white precipitate]',
      'Pb(NO₃)₂(aq) + 2KI(aq) → PbI₂(s)↓ + 2KNO₃(aq)  [yellow precipitate]',
      'Net ionic: Ag⁺(aq) + Cl⁻(aq) → AgCl(s)↓',
    ],
    keyFormulas: ['Ksp = [A⁺]ᵐ[B⁻]ⁿ (Solubility product)', 'Q > Ksp → precipitation occurs', 'Ion product Q = [Ag⁺][Cl⁻]'],
    reaction: 'Double Displacement — mixing solutions causes insoluble ionic compounds to form and settle out as precipitates. When Q exceeds Ksp, precipitation occurs.',
  };
  return { equations: [], keyFormulas: ['M = n/V', 'n = m/Mᵣ', 'PV = nRT'], reaction: 'Chemical reaction observed in the virtual lab.' };
}

// ─── PDF generation ─────────────────────────────────────────────────────────
function generatePDFContent(experiment: Experiment, results: {
  score: number; steps_completed: number; total_steps: number;
  observations: string; ai_hints_used: number; time_taken_minutes: number;
  aiMessages: AiMessage[]; studentName: string; studentId: string; className: string;
  calcLog: CalcEntry[]; reactionState: ReactionState;
}) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const time = new Date().toLocaleTimeString();
  const chem = getExperimentChemistry(experiment.title);

  const CSS = `*{box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;margin:0;padding:0;line-height:1.5}.page{max-width:820px;margin:0 auto;padding:40px}
.header{background:linear-gradient(135deg,#0f172a,#1e3a5f);color:white;padding:32px;border-radius:14px;margin-bottom:24px}
.header h1{margin:0 0 4px;font-size:22px;letter-spacing:-.3px}.sub{opacity:.75;font-size:13px;margin-top:6px}
.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}
.meta-item{background:rgba(255,255,255,.12);padding:8px 12px;border-radius:8px;font-size:12px}
.meta-item strong{display:block;opacity:.7;font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px}
.score-banner{display:flex;align-items:center;justify-content:center;gap:24px;background:${results.score>=80?'#f0fdf4':results.score>=60?'#fffbeb':'#fef2f2'};border:2px solid ${results.score>=80?'#86efac':results.score>=60?'#fde68a':'#fca5a5'};border-radius:14px;padding:20px 28px;margin-bottom:24px}
.score-num{font-size:60px;font-weight:bold;color:${results.score>=80?'#16a34a':results.score>=60?'#d97706':'#dc2626'};line-height:1}
.score-label{font-size:12px;color:#64748b;margin-top:4px}
.section{margin-bottom:28px}
.section h2{font-size:15px;font-weight:700;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:8px;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.section h2::before{content:'';display:inline-block;width:4px;height:16px;background:#3b82f6;border-radius:2px}
.eq-box{background:#0f172a;color:#e2e8f0;border-radius:10px;padding:16px;font-family:monospace;font-size:13px;margin-bottom:4px;line-height:1.8}
.eq-line{display:block;padding:2px 0}
.pill{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;margin:2px}
.pill-blue{background:#dbeafe;color:#1e40af}
.pill-green{background:#dcfce7;color:#16a34a}
.pill-red{background:#fee2e2;color:#dc2626}
.pill-amber{background:#fef3c7;color:#92400e}
.step{display:flex;gap:14px;padding:12px 0;border-bottom:1px solid #f1f5f9}
.step-num{width:28px;height:28px;background:#0f172a;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;flex-shrink:0;margin-top:2px}
.reaction-box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:14px;font-size:13px;color:#0c4a6e;line-height:1.6}
.obs{background:#fffbeb;border-left:4px solid #f59e0b;padding:14px 16px;border-radius:0 10px 10px 0;font-size:13px;line-height:1.7;white-space:pre-wrap;font-family:monospace}
.calc-row{display:flex;flex-direction:column;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;margin-bottom:6px;font-size:12px}
.calc-formula{font-weight:700;color:#1e40af;margin-bottom:4px}
.calc-inputs{color:#475569;font-family:monospace}
.calc-result{color:#16a34a;font-weight:700;font-size:13px;margin-top:4px;font-family:monospace}
.formula-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.formula-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px}
.formula-card code{display:block;font-family:monospace;font-size:13px;color:#1e40af;font-weight:bold;margin-top:4px}
.outcome-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.outcome-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center}
.outcome-box strong{display:block;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
.outcome-val{font-size:18px;font-weight:bold;color:#0f172a}
.ai-msg{padding:8px 12px;margin-bottom:6px;border-radius:8px;font-size:12px}
.ai-msg.user{background:#eff6ff;border-left:3px solid #3b82f6}
.ai-msg.ai{background:#f0fdf4;border-left:3px solid #22c55e}
.ai-msg strong{display:block;font-size:10px;text-transform:uppercase;color:#64748b;margin-bottom:3px}
.perf-table{width:100%;border-collapse:collapse;font-size:13px}
.perf-table th{text-align:left;padding:9px 12px;background:#f8fafc;border-bottom:2px solid #e2e8f0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.05em}
.perf-table td{padding:9px 12px;border-bottom:1px solid #f1f5f9}
.footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:24px}}`;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Lab Report — ${experiment.title}</title><style>${CSS}</style></head>
<body><div class="page">

<div class="header">
  <h1>VR ChemLab — Laboratory Report</h1>
  <div class="sub">${experiment.title} &nbsp;·&nbsp; ${experiment.category} &nbsp;·&nbsp; ${experiment.difficulty}</div>
  <div class="meta-grid">
    <div class="meta-item"><strong>Student Name</strong>${results.studentName}</div>
    <div class="meta-item"><strong>Student ID</strong>${results.studentId}</div>
    <div class="meta-item"><strong>Class / Section</strong>${results.className || 'N/A'}</div>
    <div class="meta-item"><strong>Date &amp; Time</strong>${date} at ${time}</div>
  </div>
</div>

<div class="score-banner">
  <div><div class="score-num">${results.score}%</div><div class="score-label">Final Score</div></div>
  <div>
    <div style="font-size:16px;font-weight:bold;color:#0f172a;margin-bottom:6px">${results.score>=90?'🏆 Outstanding Performance':results.score>=80?'⭐ Excellent Work':results.score>=60?'👍 Good Effort':'📚 Needs Improvement'}</div>
    <div style="font-size:13px;color:#64748b">${results.steps_completed} of ${results.total_steps} steps completed</div>
    <div style="font-size:13px;color:#64748b">${results.time_taken_minutes} minutes &nbsp;·&nbsp; ${results.ai_hints_used} AI hints used</div>
  </div>
</div>

<div class="section">
  <h2>Experiment Overview</h2>
  <p style="font-size:13px;color:#475569;margin-bottom:14px">${experiment.description}</p>
  <div style="margin-bottom:10px"><strong style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Learning Objectives</strong></div>
  ${experiment.objectives.map(o=>`<div style="padding:3px 0;font-size:13px;color:#475569">&#x2713;&nbsp; ${o}</div>`).join('')}
</div>

<div class="section">
  <h2>Chemical Reaction &amp; Equations</h2>
  <div class="reaction-box" style="margin-bottom:14px">${chem.reaction}</div>
  <div class="eq-box">${chem.equations.map(eq=>`<span class="eq-line">${eq}</span>`).join('')}</div>
</div>

<div class="section">
  <h2>Reaction Outcomes Observed</h2>
  <div class="outcome-grid">
    <div class="outcome-box"><strong>Final Color</strong><div class="outcome-val" style="font-size:14px">${results.reactionState.colorName}</div></div>
    <div class="outcome-box"><strong>Temperature</strong><div class="outcome-val">${results.reactionState.temperature.toFixed(1)}°C</div></div>
    <div class="outcome-box"><strong>Precipitate</strong><div class="outcome-val" style="font-size:14px">${results.reactionState.hasPrecipitate?'✓ Observed':'Not observed'}</div></div>
    <div class="outcome-box"><strong>Gas Produced</strong><div class="outcome-val" style="font-size:14px">${results.reactionState.gasProduced?'✓ Detected':'Not detected'}</div></div>
    <div class="outcome-box"><strong>Steps Done</strong><div class="outcome-val">${results.steps_completed}/${results.total_steps}</div></div>
    <div class="outcome-box"><strong>Duration</strong><div class="outcome-val">${results.time_taken_minutes} min</div></div>
  </div>
</div>

<div class="section">
  <h2>Materials Used</h2>
  <div style="margin-bottom:10px">
    <strong style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Chemicals / Reagents</strong><br>
    <div style="margin-top:6px">${experiment.chemicals.map(c=>`<span class="pill pill-blue">${c}</span>`).join('')}</div>
  </div>
  <div style="margin-bottom:10px">
    <strong style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Equipment &amp; Tools</strong><br>
    <div style="margin-top:6px">${experiment.equipment.map(e=>`<span class="pill pill-green">${e}</span>`).join('')}</div>
  </div>
  <div>
    <strong style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Safety Precautions</strong><br>
    <div style="margin-top:6px">${experiment.safety_notes.map(s=>`<span class="pill pill-red">⚠ ${s}</span>`).join('')}</div>
  </div>
</div>

<div class="section">
  <h2>Key Formulas &amp; Reference</h2>
  <div class="formula-grid">
    ${chem.keyFormulas.map(f => {
      const parts = f.split('(');
      const formula = parts[0].trim();
      const desc = parts[1] ? parts[1].replace(')', '') : '';
      return `<div class="formula-card"><span style="font-size:11px;color:#64748b">${desc}</span><code>${formula}</code></div>`;
    }).join('')}
  </div>
</div>

<div class="section">
  <h2>Procedure — Step by Step</h2>
  ${(experiment.steps as ExperimentStep[]).map((s,i)=>`
    <div class="step">
      <div class="step-num">${s.step||i+1}</div>
      <div>
        <strong style="font-size:14px;display:block;margin-bottom:3px">${s.title}</strong>
        <span style="font-size:13px;color:#64748b">${s.desc}</span>
      </div>
    </div>`).join('')}
</div>

${results.observations ? `
<div class="section">
  <h2>Student Observations &amp; Notes</h2>
  <div class="obs">${results.observations.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
</div>` : ''}

${results.calcLog.length > 0 ? `
<div class="section">
  <h2>Calculations Performed</h2>
  ${results.calcLog.map(c=>`
    <div class="calc-row">
      <div class="calc-formula">${c.formula} &nbsp;<span style="font-size:10px;color:#94a3b8">[${c.timestamp}]</span></div>
      <div class="calc-inputs">Input: ${c.inputs}</div>
      <div class="calc-result">= ${c.result}</div>
    </div>`).join('')}
</div>` : ''}

${results.aiMessages.length > 0 ? `
<div class="section">
  <h2>AI Tutor (Aria) Interaction Log</h2>
  ${results.aiMessages.slice(0,12).map(m=>`
    <div class="ai-msg ${m.role}">
      <strong>${m.role==='user'?'Student':'Aria — AI Tutor'}</strong>${m.text}
    </div>`).join('')}
  ${results.aiMessages.length>12?`<div style="font-size:11px;color:#94a3b8;margin-top:4px">${results.aiMessages.length-12} more messages not shown...</div>`:''}
</div>` : ''}

<div class="section">
  <h2>Performance Summary</h2>
  <table class="perf-table">
    <tr><th>Metric</th><th style="text-align:right">Value</th></tr>
    <tr><td>Final Score</td><td style="text-align:right;font-weight:bold;color:${results.score>=80?'#16a34a':results.score>=60?'#d97706':'#dc2626'}">${results.score}%</td></tr>
    <tr><td>Steps Completed</td><td style="text-align:right">${results.steps_completed} / ${results.total_steps}</td></tr>
    <tr><td>Time Taken</td><td style="text-align:right">${results.time_taken_minutes} minutes</td></tr>
    <tr><td>AI Hints Used</td><td style="text-align:right">${results.ai_hints_used}</td></tr>
    <tr><td>Calculations Done</td><td style="text-align:right">${results.calcLog.length}</td></tr>
    <tr><td>Grade</td><td style="text-align:right;font-weight:bold">${results.score>=90?'A+':results.score>=80?'A':results.score>=70?'B':results.score>=60?'C':'D'}</td></tr>
  </table>
</div>

<div class="footer">
  <p>VR ChemLab — AI-Powered Virtual Chemistry Laboratory</p>
  <p>Final Year Project &amp; Ed-Tech Research Prototype</p>
  <p>Report generated: ${date} at ${time}</p>
</div>

</div></body></html>`;
}

// ─── Speech synthesis hook ─────────────────────────────────────────────────
function useSpeech() {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    function pickVoice() {
      const voices = window.speechSynthesis.getVoices();
      // Prefer female English voices
      const female = voices.find(v => /female|woman|girl/i.test(v.name) && v.lang.startsWith('en'));
      const googleUS = voices.find(v => v.name === 'Google US English' && v.lang === 'en-US');
      const samantha = voices.find(v => v.name.toLowerCase().includes('samantha'));
      const karen = voices.find(v => v.name.toLowerCase().includes('karen'));
      const victoria = voices.find(v => v.name.toLowerCase().includes('victoria'));
      const zira = voices.find(v => v.name.toLowerCase().includes('zira'));
      const englishFemale = voices.find(v => v.lang === 'en-US' && v.name.toLowerCase().includes('female'));
      const anyEnglish = voices.find(v => v.lang === 'en-US');
      voiceRef.current = female ?? googleUS ?? samantha ?? karen ?? victoria ?? zira ?? englishFemale ?? anyEnglish ?? voices[0] ?? null;
    }
    pickVoice();
    window.speechSynthesis.addEventListener('voiceschanged', pickVoice);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', pickVoice);
  }, []);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) utt.voice = voiceRef.current;
    utt.pitch = 1.15;
    utt.rate = 0.95;
    utt.volume = 0.9;
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  }, [voiceEnabled]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  return { voiceEnabled, setVoiceEnabled, speak, stopSpeaking, speaking };
}

interface CalcEntry { formula: string; inputs: string; result: string; timestamp: string }

// ─── Formula Calculator Card ───────────────────────────────────────────────
function FormulaCard({ formula, onResult }: { formula: Formula; onResult?: (entry: CalcEntry) => void }) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ label: string; value: number; unit: string } | null>(null);
  const [error, setError] = useState('');

  function calculate() {
    setError('');
    const nums: Record<string, number> = {};
    for (const f of formula.fields) {
      const v = parseFloat(inputs[f.key] ?? '');
      if (isNaN(v) || v === 0) {
        setError(`Enter a valid value for "${f.label}"`);
        return;
      }
      nums[f.key] = v;
    }
    const res = formula.solve(nums);
    if (!res) { setError('Could not calculate — check your values.'); return; }
    setResult(res);
    if (onResult) {
      const inputStr = formula.fields.map(f => `${f.label} = ${inputs[f.key]} ${f.unit}`).join(', ');
      onResult({
        formula: `${formula.name} (${formula.formula})`,
        inputs: inputStr,
        result: `${res.label} = ${res.value.toFixed(4)} ${res.unit}`,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  }

  function clear() {
    setInputs({});
    setResult(null);
    setError('');
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-slate-200 font-semibold text-sm">{formula.name}</h4>
          <span className="font-mono text-cyan-400 text-xs bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">{formula.formula}</span>
        </div>
        <p className="text-slate-500 text-xs">{formula.description}</p>
      </div>

      <div className="space-y-2">
        {formula.fields.map(f => (
          <div key={f.key} className="flex items-center gap-2">
            <label className="text-slate-400 text-xs w-28 shrink-0">{f.label}</label>
            <div className="flex-1 relative">
              <input
                type="number"
                step="any"
                value={inputs[f.key] ?? ''}
                onChange={e => setInputs(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all pr-10"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 text-xs font-mono">{f.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {result && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
          <Equal className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <span className="text-green-300 text-sm font-semibold">{result.label}:</span>
          <span className="text-green-400 font-bold text-sm ml-auto font-mono">
            {result.value.toFixed(4)} {result.unit}
          </span>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={calculate} className="flex-1 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-medium transition-colors">
          Calculate
        </button>
        {(result || error || Object.keys(inputs).length > 0) && (
          <button onClick={clear} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-400 rounded-lg text-xs transition-colors">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main LabPage ──────────────────────────────────────────────────────────
export default function LabPage() {
  const { experimentId } = useParams<{ experimentId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { voiceEnabled, setVoiceEnabled, speak, stopSpeaking, speaking } = useSpeech();
  const { isVRMode, isStereoMode, isDeviceOrientation, isPerfMode } = useVR();

  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [observations, setObservations] = useState('');
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [startTime] = useState(Date.now());
  const [reactionState, setReactionState] = useState<ReactionState>({ color: '#e8f4f8', temperature: 22, hasPrecipitate: false, gasProduced: false, colorName: 'Clear' });
  const [activeTab, setActiveTab] = useState<RightTab | null>(null);
  const [exporting, setExporting] = useState(false);
  const [calcLog, setCalcLog] = useState<CalcEntry[]>([]);
  const aiEndRef = useRef<HTMLDivElement>(null);

  function addCalcEntry(entry: CalcEntry) {
    setCalcLog(prev => [...prev, entry]);
  }

  useEffect(() => {
    if (experimentId && profile) loadExperiment();
  }, [experimentId, profile]);

  useEffect(() => {
    if (experiment) setReactionState(getReactionState(experiment.title, currentStep, experiment.steps.length));
  }, [currentStep, experiment]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  async function loadExperiment() {
    const { data } = await supabase.from('experiments').select('*').eq('id', experimentId).maybeSingle();
    if (!data) { navigate('/dashboard'); return; }
    setExperiment(data as Experiment);

    const { data: session } = await supabase.from('attendance_sessions').insert({
      student_id: profile!.id,
      experiment_id: experimentId,
      session_date: new Date().toISOString().split('T')[0],
      entry_time: new Date().toISOString(),
      device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      status: 'active',
    }).select().maybeSingle();

    if (session) setSessionId(session.id);

    const welcome = `Hi there! Welcome to "${data.title}"! I'm your AI chemistry tutor. This is a ${data.difficulty} level experiment and takes about ${data.estimated_duration_minutes} minutes. ${data.objectives[0] ? `Today you'll learn: ${data.objectives[0]}.` : ''} Use the Calculations tab for formulas and Notes to record observations. Ready? Click Next Step to begin!`;

    const msg: AiMessage = { role: 'ai', text: welcome, type: 'info' };
    setAiMessages([msg]);
    speak(welcome);
    setLoading(false);
  }

  async function handleNextStep() {
    if (!experiment) return;
    const steps = experiment.steps as ExperimentStep[];
    if (currentStep < steps.length - 1) {
      setCurrentStep(p => p + 1);
      const nextStep = steps[currentStep + 1];
      const hint = `Moving to step ${currentStep + 2}: ${nextStep?.title}. ${nextStep?.desc}`;
      speak(hint);
    } else {
      await completeExperiment();
    }
  }

  async function completeExperiment() {
    if (!experiment || !sessionId || !profile) return;
    const timeTaken = Math.round((Date.now() - startTime) / 60000);
    const steps = experiment.steps as ExperimentStep[];
    const calcScore = Math.max(60, 100 - hintsUsed * 5 - (steps.length - currentStep - 1) * 10);
    setScore(calcScore);
    setCompleted(true);

    await supabase.from('experiment_results').insert({
      session_id: sessionId, student_id: profile.id, experiment_id: experiment.id,
      score: calcScore, steps_completed: currentStep + 1, total_steps: steps.length,
      observations, ai_hints_used: hintsUsed, time_taken_minutes: timeTaken,
      mistakes_made: [], reaction_outcomes: { finalColor: reactionState.color, temperature: reactionState.temperature },
    });

    await supabase.from('attendance_sessions').update({ exit_time: new Date().toISOString(), status: 'completed' }).eq('id', sessionId);

    const done = `Wonderful work! You've completed the "${experiment.title}" experiment with a score of ${calcScore} percent! ${calcScore >= 80 ? 'That was outstanding performance!' : calcScore >= 60 ? 'Great effort!' : 'Keep practicing to improve!'} Download your PDF report from the top bar.`;
    setAiMessages(prev => [...prev, { role: 'ai', text: done, type: 'info' }]);
    speak(done);
  }

  async function handleAiSend() {
    if (!aiInput.trim() || !experiment) return;
    const q = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', text: q }]);
    setAiTyping(true);
    setHintsUsed(h => h + 1);

    if (sessionId && profile) {
      await supabase.from('ai_interactions').insert({
        session_id: sessionId, student_id: profile.id, question: q,
        answer: '', interaction_type: 'text', step_context: `Step ${currentStep + 1}`,
      });
    }

    await new Promise(r => setTimeout(r, 700 + Math.random() * 500));
    const expSteps = experiment.steps as ExperimentStep[];
    const answer = getAIResponse(q, experiment, currentStep, expSteps);
    const msg: AiMessage = { role: 'ai', text: answer };
    setAiMessages(prev => [...prev, msg]);
    speak(answer);
    setAiTyping(false);
  }

  function handleHint() {
    if (!experiment) return;
    const steps = experiment.steps as ExperimentStep[];
    const step = steps[currentStep];
    setHintsUsed(h => h + 1);
    const hintText = `Here's a hint for step ${currentStep + 1}: "${step.title}". ${step.desc}. Take your time and observe carefully!`;
    const msg: AiMessage = { role: 'ai', text: hintText, type: 'hint' };
    setAiMessages(prev => [...prev, msg]);
    speak(hintText);
    setActiveTab('tutor');
  }

  function addNoteTimestamp() {
    const ts = `[${new Date().toLocaleTimeString()}] `;
    setObservations(prev => prev + (prev && !prev.endsWith('\n') ? '\n' : '') + ts);
  }

  function handleExportPDF() {
    if (!experiment || !profile) return;
    setExporting(true);
    const pdfSteps = experiment.steps as ExperimentStep[];
    const html = generatePDFContent(experiment, {
      score, steps_completed: currentStep + 1, total_steps: pdfSteps.length,
      observations, ai_hints_used: hintsUsed,
      time_taken_minutes: Math.round((Date.now() - startTime) / 60000),
      aiMessages, studentName: profile.full_name,
      studentId: profile.student_id ?? '', className: profile.class_name,
      calcLog, reactionState,
    });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) win.onload = () => win.print();
    URL.revokeObjectURL(url);
    setTimeout(() => setExporting(false), 2000);
  }

  async function handleLeave() {
    stopSpeaking();
    if (sessionId && !completed) {
      await supabase.from('attendance_sessions').update({ exit_time: new Date().toISOString(), status: 'abandoned' }).eq('id', sessionId);
    }
    navigate('/dashboard');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading experiment...</p>
        </div>
      </div>
    );
  }

  if (!experiment) return null;

  const steps = experiment.steps as ExperimentStep[];
  const currentStepData = steps[currentStep];
  const drawerOpen = activeTab !== null;

  function toggleTab(tab: RightTab) {
    setActiveTab(prev => prev === tab ? null : tab);
  }

  const BOTTOM_TABS: { id: RightTab; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'tutor', label: 'AI Tutor', icon: Bot, color: 'text-cyan-400' },
    { id: 'calc', label: 'Calculator', icon: Calculator, color: 'text-violet-400' },
    { id: 'notes', label: 'Notes', icon: NotebookPen, color: 'text-amber-400' },
  ];

  return (
    <div className="flex flex-col w-full h-full bg-gray-950 overflow-hidden relative">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm shrink-0 gap-3 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={handleLeave} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-white font-semibold text-sm truncate">{experiment.title}</h1>
            <p className="text-slate-500 text-xs">{experiment.category} · {experiment.difficulty}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <VRModeToggle />
          <button
            onClick={() => { setVoiceEnabled(!voiceEnabled); if (voiceEnabled) stopSpeaking(); }}
            className={`p-1.5 rounded-lg transition-colors ${voiceEnabled ? 'text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20' : 'text-slate-600 hover:text-slate-400 hover:bg-slate-800'}`}
          >
            {voiceEnabled ? <Volume2 className={`w-4 h-4 ${speaking ? 'animate-pulse' : ''}`} /> : <VolumeX className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 rounded-full transition-all duration-500" style={{ width: `${((currentStep + (completed ? 1 : 0)) / steps.length) * 100}%` }} />
            </div>
            <span className="text-slate-400 text-xs tabular-nums">{completed ? steps.length : currentStep}/{steps.length}</span>
          </div>
          {completed && (
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-400 hover:text-gray-900 border border-cyan-500/40 hover:border-cyan-500 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            >
              <FileDown className="w-3.5 h-3.5" />
              {exporting ? 'Opening...' : 'PDF'}
            </button>
          )}
        </div>
      </header>

      {/* ── Full-screen 3D Canvas ─────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        <ThreeLabCanvas
          reactionColor={reactionState.color}
          hasGas={reactionState.gasProduced}
          hasPrecipitate={reactionState.hasPrecipitate}
          isVRMode={isVRMode}
          isStereoMode={isStereoMode}
          isDeviceOrientation={isDeviceOrientation}
          isPerfMode={isPerfMode}
          experimentStations={[{
            id: experiment.id,
            title: experiment.title,
            category: experiment.category,
            difficulty: experiment.difficulty,
            chemicals: experiment.chemicals,
            equipment: experiment.equipment,
          }]}
          onObjectClick={(name) => {
            if (name.startsWith('__')) return; // internal events
            const equipInfo: Record<string, string> = {
              'Erlenmeyer Flask': 'Contains the acid solution. Add indicator drops first, then titrate from the burette.',
              'Burette': 'Filled with base solution. Open the valve slowly to drip into the flask below.',
              'Beaker': 'Use this to measure and transfer solutions. Can be poured into the flask.',
              'Pipette': 'For precise volume transfer. Squeeze the bulb, dip in solution, then release slowly.',
              'CuSO₄ (aq)': 'Copper sulfate — bright blue solution. Common reagent in electrochemistry experiments.',
              'K₂Cr₂O₇ (aq)': 'Potassium dichromate — orange solution. Strong oxidizing agent. Handle with care!',
              'NiSO₄ (aq)': 'Nickel sulfate — green solution. Used in electroplating and precipitation reactions.',
              'KMnO₄ (aq)': 'Potassium permanganate — deep purple. Powerful oxidizer used as an indicator.',
            };
            const info = equipInfo[name] ?? `${name} is a piece of lab equipment. Use it according to the procedure.`;
            const msg: AiMessage = { role: 'ai', text: info, type: 'info' };
            setAiMessages(prev => [...prev, msg]);
          }}
          onPour={(from, to) => {
            const pourMsg = `Reaction observed: You poured ${from} into ${to}. Watch the color change and note any gas or precipitate formation!`;
            const msg: AiMessage = { role: 'ai', text: pourMsg, type: 'info' };
            setAiMessages(prev => [...prev, msg]);
            // Advance reaction state for interactivity
            if (currentStep < (experiment.steps as ExperimentStep[]).length - 1) {
              setCurrentStep(s => Math.min(s + 1, (experiment.steps as ExperimentStep[]).length - 1));
            }
          }}
        />

        {/* Reaction readouts — top left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          <div className="glass rounded-lg px-3 py-1.5 flex items-center gap-2">
            <Thermometer className="w-3.5 h-3.5 text-red-400" />
            <span className="text-white text-xs font-medium">{reactionState.temperature.toFixed(1)}°C</span>
          </div>
          <div className="glass rounded-lg px-3 py-1.5 flex items-center gap-2">
            <Droplets className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-white text-xs font-medium">{reactionState.colorName}</span>
          </div>
          {reactionState.gasProduced && (
            <div className="glass rounded-lg px-3 py-1.5 flex items-center gap-2 animate-pulse-glow">
              <Eye className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-yellow-400 text-xs font-medium">Gas detected!</span>
            </div>
          )}
          {reactionState.hasPrecipitate && (
            <div className="glass rounded-lg px-3 py-1.5 flex items-center gap-2 animate-pulse-glow">
              <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-cyan-400 text-xs font-medium">Precipitate forming</span>
            </div>
          )}
        </div>

        {/* Current step pill — top right */}
        {!completed && (
          <div className="absolute top-3 right-3 z-10 max-w-[200px]">
            <div className="glass rounded-xl px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-full bg-cyan-500/30 border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-bold text-[10px] shrink-0">
                  {currentStep + 1}
                </div>
                <span className="text-cyan-300 text-xs font-semibold truncate">{currentStepData?.title}</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-snug line-clamp-2">{currentStepData?.desc}</p>
            </div>
          </div>
        )}

        {/* Completed overlay */}
        {completed && (
          <div className="absolute top-3 right-3 z-10">
            <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-white text-xs font-semibold">Complete!</p>
                <p className={`text-xs font-bold ${score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{score}%</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Step action bar ─────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-slate-900/95 border-t border-slate-800 px-4 py-2.5 flex items-center gap-2 z-10">
        {completed ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
            <span className="text-white text-sm font-semibold flex-1">Experiment Complete — Score: <span className={`${score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{score}%</span></span>
            <button onClick={handleExportPDF} disabled={exporting} className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-gray-900 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
              <FileDown className="w-4 h-4" />
              Download PDF
            </button>
          </>
        ) : (
          <>
            <button onClick={handleHint} className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg text-xs font-medium transition-colors shrink-0">
              <Lightbulb className="w-3.5 h-3.5" />
              Hint
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-slate-300 text-xs font-medium truncate">Step {currentStep + 1}: {currentStepData?.title}</p>
            </div>
            <button onClick={handleNextStep} className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-gray-900 rounded-lg text-sm font-semibold transition-colors shrink-0">
              {currentStep < steps.length - 1
                ? <><ChevronRight className="w-4 h-4" />Next</>
                : <><CheckCircle className="w-4 h-4" />Finish</>}
            </button>
          </>
        )}
      </div>

      {/* ── Bottom tool bar ──────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-slate-950 border-t border-slate-800 flex z-20">
        {BOTTOM_TABS.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => toggleTab(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-all ${
              activeTab === id
                ? `${color} bg-slate-800`
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
            {id === 'tutor' && aiMessages.length > 1 && activeTab !== 'tutor' && (
              <span className="absolute mt-0 w-1.5 h-1.5 rounded-full bg-cyan-400 top-2 ml-5" />
            )}
          </button>
        ))}
      </div>

      {/* ── Slide-up drawer ──────────────────────────────────────────────────── */}
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="absolute inset-0 bg-black/40 z-30"
          onClick={() => setActiveTab(null)}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`absolute left-0 right-0 bottom-0 z-40 flex flex-col bg-slate-900 border-t border-slate-700 rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out`}
        style={{
          height: '58vh',
          transform: drawerOpen ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        {/* Drawer handle + header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            {activeTab === 'tutor' && (
              <>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400/30 to-cyan-500/30 border border-cyan-500/30 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-slate-200 text-sm font-semibold">Aria — AI Tutor</p>
                  <p className="text-slate-500 text-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                    {speaking ? 'Speaking...' : `Online · ${hintsUsed} hints used`}
                  </p>
                </div>
              </>
            )}
            {activeTab === 'calc' && (
              <>
                <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                  <Calculator className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-slate-200 text-sm font-semibold">Chemistry Calculator</p>
                  <p className="text-slate-500 text-xs">{calcLog.length} calculations done</p>
                </div>
              </>
            )}
            {activeTab === 'notes' && (
              <>
                <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <NotebookPen className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-slate-200 text-sm font-semibold">Observation Notes</p>
                  <p className="text-slate-500 text-xs">{observations.length} chars recorded</p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'tutor' && (
              <button
                onClick={() => { setVoiceEnabled(!voiceEnabled); if (voiceEnabled) stopSpeaking(); }}
                className={`p-1.5 rounded-lg transition-colors ${voiceEnabled ? 'text-pink-400 bg-pink-500/10 hover:bg-pink-500/20' : 'text-slate-600 hover:text-slate-400'}`}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={() => setActiveTab(null)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-90" />
            </button>
          </div>
        </div>

        {/* ── AI Tutor content ── */}
        {activeTab === 'tutor' && (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.role === 'ai' && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400/30 to-cyan-500/30 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                  )}
                  <div className={`max-w-[85%] group relative ${msg.role === 'user' ? '' : 'flex-1'}`}>
                    <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-cyan-500/20 text-cyan-100 rounded-br-sm'
                        : msg.type === 'hint'
                        ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-100 rounded-bl-sm'
                        : 'bg-slate-800 text-slate-200 rounded-bl-sm'
                    }`}>
                      {msg.type === 'hint' && <p className="text-yellow-500 text-xs font-semibold mb-1">AI Hint</p>}
                      {msg.text}
                    </div>
                    {msg.role === 'ai' && (
                      <button
                        onClick={() => speak(msg.text)}
                        className="mt-1 ml-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-pink-400 hover:bg-pink-500/10"
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {aiTyping && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400/30 to-cyan-500/30 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="bg-slate-800 px-4 py-3 rounded-xl rounded-bl-sm">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(j => <div key={j} className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: `${j * 0.15}s` }} />)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={aiEndRef} />
            </div>
            <div className="p-3 border-t border-slate-800 shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiSend(); } }}
                  placeholder="Ask Aria anything..."
                  className="lab-input text-sm flex-1"
                  disabled={aiTyping}
                />
                <button
                  onClick={handleAiSend}
                  disabled={!aiInput.trim() || aiTyping}
                  className="p-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Calculator content ── */}
        {activeTab === 'calc' && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 space-y-3">
              {FORMULAS.map(f => <FormulaCard key={f.id} formula={f} onResult={addCalcEntry} />)}
            </div>
          </div>
        )}

        {/* ── Notes content ── */}
        {activeTab === 'notes' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-800 flex flex-wrap gap-1.5 shrink-0">
              <button
                onClick={addNoteTimestamp}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-xs transition-colors"
              >
                + Timestamp
              </button>
              {['Color change', 'Gas produced', 'Precipitate', 'Temperature↑', 'Odor noted'].map(tag => (
                <button
                  key={tag}
                  onClick={() => setObservations(prev => prev + (prev && !prev.endsWith('\n') ? '\n' : '') + `• ${tag}\n`)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 rounded text-xs transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
            <textarea
              value={observations}
              onChange={e => setObservations(e.target.value)}
              placeholder={`Step ${currentStep + 1} observations:\n• What do you see?\n• Any color change?\n• Temperature change?\n• Gas or precipitate?`}
              className="flex-1 bg-transparent border-0 resize-none text-slate-200 text-sm p-4 placeholder-slate-600 focus:outline-none leading-relaxed font-mono"
            />
            <div className="px-4 py-2 border-t border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-slate-600 text-xs">{observations.length} chars · {observations.split('\n').filter(Boolean).length} lines</span>
              <button onClick={() => setObservations('')} className="text-xs text-slate-600 hover:text-red-400 transition-colors" disabled={!observations}>
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
