// ─── Real Chemistry System ────────────────────────────────────────────────────

export interface Chemical {
  id: string;
  name: string;
  formula: string;
  type: 'acid' | 'base' | 'salt' | 'indicator' | 'oxidizer' | 'reducer' | 'solvent' | 'reagent';
  color: string;
  colorHex: number;
  emissive: string;
  emissiveHex: number;
  concentration?: string;
  molarMass: number;
  density: number;
  pH?: number;
  viscosity: number;
  isCorrosive: boolean;
  isToxic: boolean;
  isFlammable: boolean;
  description: string;
}

export interface Reaction {
  id: string;
  name: string;
  reactants: string[];
  products: string[];
  equation: string;
  netIonic: string;
  colorChange: { from: string; to: string };
  precipitate?: { color: string; name: string };
  gasProduced?: { name: string; color: string };
  temperatureChange: number;
  reactionTime: number;
  observations: string[];
  safetyNotes: string[];
}

// ─── Chemical Database ──────────────────────────────────────────────────────

export const CHEMICALS: Record<string, Chemical> = {
  'HCl': {
    id: 'HCl',
    name: 'Hydrochloric Acid',
    formula: 'HCl',
    type: 'acid',
    color: '#e8f4f8',
    colorHex: 0xe8f4f8,
    emissive: '#c8d8e8',
    emissiveHex: 0xc8d8e8,
    concentration: '0.1 M',
    molarMass: 36.46,
    density: 1.18,
    pH: 1.0,
    viscosity: 0.9,
    isCorrosive: true,
    isToxic: false,
    isFlammable: false,
    description: 'Strong mineral acid. Clear, colorless solution with pungent odor.',
  },
  'H2SO4': {
    id: 'H2SO4',
    name: 'Sulfuric Acid',
    formula: 'H₂SO₄',
    type: 'acid',
    color: '#f5f5f5',
    colorHex: 0xf5f5f5,
    emissive: '#e0e0e0',
    emissiveHex: 0xe0e0e0,
    concentration: '0.1 M',
    molarMass: 98.08,
    density: 1.84,
    pH: 0.5,
    viscosity: 1.2,
    isCorrosive: true,
    isToxic: true,
    isFlammable: false,
    description: 'Strong mineral acid. Very viscous, colorless to slightly yellow.',
  },
  'HNO3': {
    id: 'HNO3',
    name: 'Nitric Acid',
    formula: 'HNO₃',
    type: 'acid',
    color: '#fffde7',
    colorHex: 0xfffde7,
    emissive: '#fff9c4',
    emissiveHex: 0xfff9c4,
    concentration: '0.1 M',
    molarMass: 63.01,
    density: 1.42,
    pH: 0.5,
    viscosity: 0.8,
    isCorrosive: true,
    isToxic: true,
    isFlammable: false,
    description: 'Strong oxidizing acid. Colorless to faint yellow.',
  },
  'NaOH': {
    id: 'NaOH',
    name: 'Sodium Hydroxide',
    formula: 'NaOH',
    type: 'base',
    color: '#e8f4f8',
    colorHex: 0xe8f4f8,
    emissive: '#c8e8f8',
    emissiveHex: 0xc8e8f8,
    concentration: '0.1 M',
    molarMass: 40.00,
    density: 2.13,
    pH: 13.0,
    viscosity: 1.0,
    isCorrosive: true,
    isToxic: false,
    isFlammable: false,
    description: 'Strong base (caustic soda). Clear, colorless solution.',
  },
  'KOH': {
    id: 'KOH',
    name: 'Potassium Hydroxide',
    formula: 'KOH',
    type: 'base',
    color: '#f5f9ff',
    colorHex: 0xf5f9ff,
    emissive: '#e3f0ff',
    emissiveHex: 0xe3f0ff,
    concentration: '0.1 M',
    molarMass: 56.11,
    density: 2.04,
    pH: 13.5,
    viscosity: 1.0,
    isCorrosive: true,
    isToxic: false,
    isFlammable: false,
    description: 'Strong base (caustic potash). Clear, colorless solution.',
  },
  'NH3': {
    id: 'NH3',
    name: 'Ammonia Solution',
    formula: 'NH₃(aq)',
    type: 'base',
    color: '#f0f8ff',
    colorHex: 0xf0f8ff,
    emissive: '#e0f0ff',
    emissiveHex: 0xe0f0ff,
    concentration: '1 M',
    molarMass: 17.03,
    density: 0.9,
    pH: 11.5,
    viscosity: 0.9,
    isCorrosive: true,
    isToxic: true,
    isFlammable: false,
    description: 'Weak base. Pungent odor, colorless solution.',
  },
  'CuSO4': {
    id: 'CuSO4',
    name: 'Copper(II) Sulfate',
    formula: 'CuSO₄',
    type: 'salt',
    color: '#1565c0',
    colorHex: 0x1565c0,
    emissive: '#0d47a1',
    emissiveHex: 0x0d47a1,
    concentration: '0.1 M',
    molarMass: 159.61,
    density: 2.28,
    viscosity: 1.0,
    isCorrosive: false,
    isToxic: true,
    isFlammable: false,
    description: 'Deep blue solution. Used in electrochemistry and precipitation reactions.',
  },
  'KMnO4': {
    id: 'KMnO4',
    name: 'Potassium Permanganate',
    formula: 'KMnO₄',
    type: 'oxidizer',
    color: '#6a1b9a',
    colorHex: 0x6a1b9a,
    emissive: '#4a148c',
    emissiveHex: 0x4a148c,
    concentration: '0.02 M',
    molarMass: 158.03,
    density: 2.70,
    viscosity: 1.0,
    isCorrosive: true,
    isToxic: true,
    isFlammable: false,
    description: 'Deep purple, powerful oxidizing agent. Decolorizes in redox reactions.',
  },
  'K2Cr2O7': {
    id: 'K2Cr2O7',
    name: 'Potassium Dichromate',
    formula: 'K₂Cr₂O₇',
    type: 'oxidizer',
    color: '#e65100',
    colorHex: 0xe65100,
    emissive: '#bf360c',
    emissiveHex: 0xbf360c,
    concentration: '0.1 M',
    molarMass: 294.19,
    density: 2.68,
    viscosity: 1.0,
    isCorrosive: true,
    isToxic: true,
    isFlammable: false,
    description: 'Bright orange, strong oxidizer. Carcinogenic - handle with care!',
  },
  'AgNO3': {
    id: 'AgNO3',
    name: 'Silver Nitrate',
    formula: 'AgNO₃',
    type: 'reagent',
    color: '#fafafa',
    colorHex: 0xfafafa,
    emissive: '#e0e0e0',
    emissiveHex: 0xe0e0e0,
    concentration: '0.1 M',
    molarMass: 169.87,
    density: 4.35,
    viscosity: 1.0,
    isCorrosive: true,
    isToxic: true,
    isFlammable: false,
    description: 'Colorless solution. Forms characteristic white precipitate with chlorides.',
  },
  'FeCl3': {
    id: 'FeCl3',
    name: 'Iron(III) Chloride',
    formula: 'FeCl₃',
    type: 'salt',
    color: '#8d6e63',
    colorHex: 0x8d6e63,
    emissive: '#6d4c41',
    emissiveHex: 0x6d4c41,
    concentration: '0.1 M',
    molarMass: 162.20,
    density: 2.90,
    viscosity: 1.1,
    isCorrosive: true,
    isToxic: true,
    isFlammable: false,
    description: 'Yellow-brown solution. Forms brown precipitate with hydroxides.',
  },
  'FeSO4': {
    id: 'FeSO4',
    name: 'Iron(II) Sulfate',
    formula: 'FeSO₄',
    type: 'salt',
    color: '#81c784',
    colorHex: 0x81c784,
    emissive: '#66bb6a',
    emissiveHex: 0x66bb6a,
    concentration: '0.1 M',
    molarMass: 151.91,
    density: 2.84,
    viscosity: 1.0,
    isCorrosive: false,
    isToxic: false,
    isFlammable: false,
    description: 'Pale green solution. Oxidizes to brown in air.',
  },
  'NiSO4': {
    id: 'NiSO4',
    name: 'Nickel(II) Sulfate',
    formula: 'NiSO₄',
    type: 'salt',
    color: '#2e7d32',
    colorHex: 0x2e7d32,
    emissive: '#1b5e20',
    emissiveHex: 0x1b5e20,
    concentration: '0.1 M',
    molarMass: 154.76,
    density: 2.07,
    viscosity: 1.0,
    isCorrosive: false,
    isToxic: true,
    isFlammable: false,
    description: 'Bright green solution. Used in electroplating.',
  },
  'CoCl2': {
    id: 'CoCl2',
    name: 'Cobalt(II) Chloride',
    formula: 'CoCl₂',
    type: 'salt',
    color: '#e91e63',
    colorHex: 0xe91e63,
    emissive: '#c2185b',
    emissiveHex: 0xc2185b,
    concentration: '0.1 M',
    molarMass: 129.84,
    density: 3.36,
    viscosity: 1.0,
    isCorrosive: false,
    isToxic: true,
    isFlammable: false,
    description: 'Pink solution. Turns blue when heated or dehydrated.',
  },
  'BaCl2': {
    id: 'BaCl2',
    name: 'Barium Chloride',
    formula: 'BaCl₂',
    type: 'salt',
    color: '#fafafa',
    colorHex: 0xfafafa,
    emissive: '#e0e0e0',
    emissiveHex: 0xe0e0e0,
    concentration: '0.1 M',
    molarMass: 208.23,
    density: 3.86,
    viscosity: 1.0,
    isCorrosive: false,
    isToxic: true,
    isFlammable: false,
    description: 'Colorless solution. Forms white precipitate with sulfates.',
  },
  'PbNO3': {
    id: 'PbNO3',
    name: 'Lead(II) Nitrate',
    formula: 'Pb(NO₃)₂',
    type: 'salt',
    color: '#fafafa',
    colorHex: 0xfafafa,
    emissive: '#e0e0e0',
    emissiveHex: 0xe0e0e0,
    concentration: '0.1 M',
    molarMass: 331.21,
    density: 4.53,
    viscosity: 1.0,
    isCorrosive: false,
    isToxic: true,
    isFlammable: false,
    description: 'Colorless solution. Forms yellow precipitate with iodides.',
  },
  'NaCl': {
    id: 'NaCl',
    name: 'Sodium Chloride',
    formula: 'NaCl',
    type: 'salt',
    color: '#fafafa',
    colorHex: 0xfafafa,
    emissive: '#e0e0e0',
    emissiveHex: 0xe0e0e0,
    concentration: '0.5 M',
    molarMass: 58.44,
    density: 2.16,
    viscosity: 1.0,
    isCorrosive: false,
    isToxic: false,
    isFlammable: false,
    description: 'Common table salt. Colorless solution.',
  },
  'Na2SO4': {
    id: 'Na2SO4',
    name: 'Sodium Sulfate',
    formula: 'Na₂SO₄',
    type: 'salt',
    color: '#fafafa',
    colorHex: 0xfafafa,
    emissive: '#e0e0e0',
    emissiveHex: 0xe0e0e0,
    concentration: '0.1 M',
    molarMass: 142.04,
    density: 2.66,
    viscosity: 1.0,
    isCorrosive: false,
    isToxic: false,
    isFlammable: false,
    description: 'Colorless solution. Forms white precipitate with barium.',
  },
  'KI': {
    id: 'KI',
    name: 'Potassium Iodide',
    formula: 'KI',
    type: 'reducer',
    color: '#fafafa',
    colorHex: 0xfafafa,
    emissive: '#e0e0e0',
    emissiveHex: 0xe0e0e0,
    concentration: '0.1 M',
    molarMass: 166.00,
    density: 3.13,
    viscosity: 1.0,
    isCorrosive: false,
    isToxic: false,
    isFlammable: false,
    description: 'Colorless solution. Forms yellow precipitate with lead.',
  },
  'I2_KI': {
    id: 'I2_KI',
    name: 'Iodine Solution',
    formula: 'I₂ / KI',
    type: 'reagent',
    color: '#795548',
    colorHex: 0x795548,
    emissive: '#5d4037',
    emissiveHex: 0x5d4037,
    concentration: '0.05 M',
    molarMass: 253.81,
    density: 4.93,
    viscosity: 1.0,
    isCorrosive: false,
    isToxic: true,
    isFlammable: false,
    description: 'Amber-brown solution. Starch test turns dark blue.',
  },
  'phenolphthalein': {
    id: 'phenolphthalein',
    name: 'Phenolphthalein',
    formula: 'C₂₀H₁₄O₄',
    type: 'indicator',
    color: '#fafafa',
    colorHex: 0xfafafa,
    emissive: '#e0e0e0',
    emissiveHex: 0xe0e0e0,
    concentration: '0.1%',
    molarMass: 318.32,
    density: 1.28,
    viscosity: 0.8,
    isCorrosive: false,
    isToxic: false,
    isFlammable: false,
    description: 'pH indicator. Colorless in acid, pink in base (pH 8.2-10).',
  },
  'methyl_orange': {
    id: 'methyl_orange',
    name: 'Methyl Orange',
    formula: 'C₁₄H₁₄N₃NaO₃S',
    type: 'indicator',
    color: '#ff9800',
    colorHex: 0xff9800,
    emissive: '#f57c00',
    emissiveHex: 0xf57c00,
    concentration: '0.1%',
    molarMass: 327.33,
    density: 1.28,
    viscosity: 0.8,
    isCorrosive: false,
    isToxic: false,
    isFlammable: false,
    description: 'pH indicator. Red in acid (pH<3.1), yellow in base (pH>4.4).',
  },
  'bromothymol_blue': {
    id: 'bromothymol_blue',
    name: 'Bromothymol Blue',
    formula: 'C₂₇H₂₈Br₂O₅S',
    type: 'indicator',
    color: '#4caf50',
    colorHex: 0x4caf50,
    emissive: '#388e3c',
    emissiveHex: 0x388e3c,
    concentration: '0.1%',
    molarMass: 624.38,
    density: 1.28,
    viscosity: 0.8,
    isCorrosive: false,
    isToxic: false,
    isFlammable: false,
    description: 'pH indicator. Yellow (pH<6), Green (pH7), Blue (pH>7.6).',
  },
  'H2O': {
    id: 'H2O',
    name: 'Distilled Water',
    formula: 'H₂O',
    type: 'solvent',
    color: '#e3f2fd',
    colorHex: 0xe3f2fd,
    emissive: '#bbdefb',
    emissiveHex: 0xbbdefb,
    concentration: 'Pure',
    molarMass: 18.02,
    density: 1.00,
    pH: 7.0,
    viscosity: 1.0,
    isCorrosive: false,
    isToxic: false,
    isFlammable: false,
    description: 'Pure water. Universal solvent.',
  },
  'ethanol': {
    id: 'ethanol',
    name: 'Ethanol',
    formula: 'C₂H₅OH',
    type: 'solvent',
    color: '#fafafa',
    colorHex: 0xfafafa,
    emissive: '#e0e0e0',
    emissiveHex: 0xe0e0e0,
    concentration: '95%',
    molarMass: 46.07,
    density: 0.79,
    pH: 7.3,
    viscosity: 0.6,
    isCorrosive: false,
    isToxic: false,
    isFlammable: true,
    description: 'Colorless, volatile, flammable organic solvent.',
  },
};

// ─── Reaction Database ─────────────────────────────────────────────────────

export const REACTIONS: Reaction[] = [
  {
    id: 'HCl_NaOH',
    name: 'Neutralization: HCl + NaOH',
    reactants: ['HCl', 'NaOH'],
    products: ['NaCl', 'H2O'],
    equation: 'HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)',
    netIonic: 'H⁺(aq) + OH⁻(aq) → H₂O(l)',
    colorChange: { from: '#e8f4f8', to: '#e8f4f8' },
    temperatureChange: 15,
    reactionTime: 0.5,
    observations: ['Exothermic - solution warms up', 'No color change', 'pH approaches 7 at equivalence'],
    safetyNotes: ['Acid-base reaction - wear eye protection'],
  },
  {
    id: 'HCl_NaOH_phenol',
    name: 'Titration with Phenolphthalein',
    reactants: ['HCl', 'NaOH', 'phenolphthalein'],
    products: ['NaCl', 'H2O'],
    equation: 'HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l) + phenolphthalein endpoint',
    netIonic: 'H⁺(aq) + OH⁻(aq) → H₂O(l)',
    colorChange: { from: '#fafafa', to: '#f8bbd9' },
    temperatureChange: 12,
    reactionTime: 0.5,
    observations: ['Solution turns pale pink at equivalence point', 'Exothermic reaction', 'Sharp color change at pH 8.2'],
    safetyNotes: ['Acid-base titration - use burette carefully'],
  },
  {
    id: 'CuSO4_NaOH',
    name: 'Copper Hydroxide Precipitation',
    reactants: ['CuSO4', 'NaOH'],
    products: ['Cu(OH)2', 'Na2SO4'],
    equation: 'CuSO₄(aq) + 2NaOH(aq) → Cu(OH)₂(s)↓ + Na₂SO₄(aq)',
    netIonic: 'Cu²⁺(aq) + 2OH⁻(aq) → Cu(OH)₂(s)↓',
    colorChange: { from: '#1565c0', to: '#2196f3' },
    precipitate: { color: '#1976d2', name: 'Blue gelatinous precipitate (Cu(OH)₂)' },
    temperatureChange: 5,
    reactionTime: 1.0,
    observations: ['Bright blue gelatinous precipitate forms', 'Solution becomes cloudy', 'Precipitate settles slowly'],
    safetyNotes: ['Copper compounds are toxic - avoid skin contact'],
  },
  {
    id: 'AgNO3_NaCl',
    name: 'Silver Chloride Precipitation',
    reactants: ['AgNO3', 'NaCl'],
    products: ['AgCl', 'NaNO3'],
    equation: 'AgNO₃(aq) + NaCl(aq) → AgCl(s)↓ + NaNO₃(aq)',
    netIonic: 'Ag⁺(aq) + Cl⁻(aq) → AgCl(s)↓',
    colorChange: { from: '#fafafa', to: '#eceff1' },
    precipitate: { color: '#ffffff', name: 'White curdy precipitate (AgCl)' },
    temperatureChange: 2,
    reactionTime: 0.3,
    observations: ['White curdy precipitate forms immediately', 'Precipitate darkens on exposure to light'],
    safetyNotes: ['Silver compounds can stain skin'],
  },
  {
    id: 'PbNO3_KI',
    name: 'Lead Iodide Precipitation',
    reactants: ['PbNO3', 'KI'],
    products: ['PbI2', 'KNO3'],
    equation: 'Pb(NO₃)₂(aq) + 2KI(aq) → PbI₂(s)↓ + 2KNO₃(aq)',
    netIonic: 'Pb²⁺(aq) + 2I⁻(aq) → PbI₂(s)↓',
    colorChange: { from: '#fafafa', to: '#fff59d' },
    precipitate: { color: '#fdd835', name: 'Bright yellow precipitate (PbI₂)' },
    temperatureChange: 3,
    reactionTime: 0.5,
    observations: ['Golden yellow precipitate forms', 'Sparkles like gold dust', 'Classic qualitative test for lead'],
    safetyNotes: ['Lead compounds are toxic - handle with care'],
  },
  {
    id: 'KMnO4_FeSO4',
    name: 'Permanganate-Fe²⁺ Redox',
    reactants: ['KMnO4', 'FeSO4'],
    products: ['Fe2(SO4)3', 'MnSO4'],
    equation: '2KMnO₄(aq) + 10FeSO₄(aq) + 8H₂SO₄(aq) → 5Fe₂(SO₄)₃(aq) + 2MnSO₄(aq) + K₂SO₄(aq) + 8H₂O(l)',
    netIonic: 'MnO₄⁻ + 5Fe²⁺ + 8H⁺ → Mn²⁺ + 5Fe³⁺ + 4H₂O',
    colorChange: { from: '#6a1b9a', to: '#e0e0e0' },
    temperatureChange: 8,
    reactionTime: 2.0,
    observations: ['Purple color disappears as permanganate is reduced', 'Solution turns pale yellow', 'Self-indicating reaction'],
    safetyNotes: ['Permanganate is a strong oxidizer'],
  },
  {
    id: 'I2_starch',
    name: 'Iodine-Starch Complex',
    reactants: ['I2_KI', 'starch'],
    products: ['starch-I2_complex'],
    equation: 'I₂(aq) + starch → [starch-I₂] complex (intense blue-black)',
    netIonic: 'I₂ + starch → blue-black complex',
    colorChange: { from: '#795548', to: '#1a237e' },
    temperatureChange: 0,
    reactionTime: 0.2,
    observations: ['Instant color change to deep blue-black', 'Classic starch test', 'Color disappears on heating'],
    safetyNotes: ['Iodine stains - handle carefully'],
  },
  {
    id: 'BaCl2_Na2SO4',
    name: 'Barium Sulfate Precipitation',
    reactants: ['BaCl2', 'Na2SO4'],
    products: ['BaSO4', 'NaCl'],
    equation: 'BaCl₂(aq) + Na₂SO₄(aq) → BaSO₄(s)↓ + 2NaCl(aq)',
    netIonic: 'Ba²⁺(aq) + SO₄²⁻(aq) → BaSO₄(s)↓',
    colorChange: { from: '#fafafa', to: '#eceff1' },
    precipitate: { color: '#ffffff', name: 'White dense precipitate (BaSO₄)' },
    temperatureChange: 1,
    reactionTime: 0.3,
    observations: ['White precipitate forms immediately', 'Very insoluble - dense precipitate', 'Used in medical imaging'],
    safetyNotes: ['Barium compounds are toxic'],
  },
  {
    id: 'NH3_FeCl3',
    name: 'Iron(III) Hydroxide from Ammonia',
    reactants: ['NH3', 'FeCl3'],
    products: ['Fe(OH)3', 'NH4Cl'],
    equation: 'FeCl₃(aq) + 3NH₃(aq) + 3H₂O(l) → Fe(OH)₃(s)↓ + 3NH₄Cl(aq)',
    netIonic: 'Fe³⁺(aq) + 3NH₃(aq) + 3H₂O(l) → Fe(OH)₃(s)↓ + 3NH₄⁺(aq)',
    colorChange: { from: '#8d6e63', to: '#b71c1c' },
    precipitate: { color: '#8d6e63', name: 'Reddish-brown precipitate (Fe(OH)₃)' },
    temperatureChange: 5,
    reactionTime: 0.5,
    observations: ['Reddish-brown gelatinous precipitate', 'Ammonia smell may be detected'],
    safetyNotes: ['Ammonia has pungent odor - use in fume hood'],
  },
  {
    id: 'methyl_orange_acid',
    name: 'Methyl Orange Acid Color',
    reactants: ['methyl_orange', 'HCl'],
    products: ['methyl_orange_H+'],
    equation: 'Methyl orange + H⁺ → red protonated form',
    netIonic: 'Indicator color change',
    colorChange: { from: '#ff9800', to: '#d32f2f' },
    temperatureChange: 0,
    reactionTime: 0.1,
    observations: ['Orange turns red in acidic solution (pH < 3.1)'],
    safetyNotes: ['Indicator dye - may stain'],
  },
];

// ─── Reaction Engine ────────────────────────────────────────────────────────

export interface ReactionResult {
  success: boolean;
  reaction: Reaction | null;
  newColor: string;
  newColorHex: number;
  temperature: number;
  hasPrecipitate: boolean;
  precipitateColor?: string;
  precipitateName?: string;
  hasGas: boolean;
  gasName?: string;
  observations: string[];
  safetyNotes: string[];
}

export function computeReaction(
  chemA: string,
  chemB: string,
  options?: { hasIndicator?: string; temperature?: number }
): ReactionResult {
  const chemicals = [chemA, chemB].filter(Boolean);
  const temp = options?.temperature ?? 22;
  const indicator = options?.hasIndicator;

  // Find matching reaction
  for (const reaction of REACTIONS) {
    const reactantSet = new Set(reaction.reactants);
    const hasAllReactants = chemicals.every(c => reactantSet.has(c));

    if (hasAllReactants || reactantSet.has(chemA) && reactantSet.has(chemB)) {
      // Check for indicator-specific reactions
      if (indicator === 'phenolphthalein' && reaction.id === 'HCl_NaOH_phenol') {
        return {
          success: true,
          reaction,
          newColor: '#f8bbd9',
          newColorHex: 0xf8bbd9,
          temperature: temp + reaction.temperatureChange,
          hasPrecipitate: !!reaction.precipitate,
          precipitateColor: reaction.precipitate?.color,
          precipitateName: reaction.precipitate?.name,
          hasGas: !!reaction.gasProduced,
          gasName: reaction.gasProduced?.name,
          observations: reaction.observations,
          safetyNotes: reaction.safetyNotes,
        };
      }

      return {
        success: true,
        reaction,
        newColor: reaction.colorChange.to,
        newColorHex: parseInt(reaction.colorChange.to.replace('#', ''), 16),
        temperature: temp + reaction.temperatureChange,
        hasPrecipitate: !!reaction.precipitate,
        precipitateColor: reaction.precipitate?.color,
        precipitateName: reaction.precipitate?.name,
        hasGas: !!reaction.gasProduced,
        gasName: reaction.gasProduced?.name,
        observations: reaction.observations,
        safetyNotes: reaction.safetyNotes,
      };
    }
  }

  // No specific reaction - blend colors
  const chemAData = CHEMICALS[chemA];
  const chemBData = CHEMICALS[chemB];
  const colorA = chemAData?.colorHex ?? 0xe8f4f8;
  const colorB = chemBData?.colorHex ?? 0xe8f4f8;

  // Simple color blending
  const rA = (colorA >> 16) & 255;
  const gA = (colorA >> 8) & 255;
  const bA = colorA & 255;
  const rB = (colorB >> 16) & 255;
  const gB = (colorB >> 8) & 255;
  const bB = colorB & 255;

  const blendedR = Math.round((rA + rB) / 2);
  const blendedG = Math.round((gA + gB) / 2);
  const blendedB = Math.round((bA + bB) / 2);
  const blendedHex = (blendedR << 16) | (blendedG << 8) | blendedB;
  const blendedStr = `#${blendedR.toString(16).padStart(2, '0')}${blendedG.toString(16).padStart(2, '0')}${blendedB.toString(16).padStart(2, '0')}`;

  return {
    success: false,
    reaction: null,
    newColor: blendedStr,
    newColorHex: blendedHex,
    temperature: temp,
    hasPrecipitate: false,
    hasGas: false,
    observations: [`Mixed ${chemAData?.name ?? chemA} with ${chemBData?.name ?? chemB}`],
    safetyNotes: [],
  };
}

// ─── Utilities ──────────────────────────────────────────────────────────────

export function getChemicalColor(chemId: string): { hex: string; hexNum: number } {
  const chem = CHEMICALS[chemId];
  if (!chem) return { hex: '#e8f4f8', hexNum: 0xe8f4f8 };
  return { hex: chem.color, hexNum: chem.colorHex };
}

export function getChemicalEmissive(chemId: string): { hex: string; hexNum: number } {
  const chem = CHEMICALS[chemId];
  if (!chem) return { hex: '#e0e0e0', hexNum: 0xe0e0e0 };
  return { hex: chem.emissive, hexNum: chem.emissiveHex };
}

export function getChemicalByName(name: string): Chemical | undefined {
  const normalizedName = name.replace(/\s*\([^)]*\)/g, '').replace(/\(aq\)/g, '').trim();
  for (const chem of Object.values(CHEMICALS)) {
    if (chem.name.toLowerCase().includes(normalizedName.toLowerCase())) return chem;
    if (chem.formula.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, m => '₀₁₂₃₄₅₆₇₈₉'.indexOf(m).toString())
          .includes(normalizedName)) return chem;
  }
  return undefined;
}

export function formatFormula(formula: string): string {
  // Convert Unicode subscripts to regular format for display
  return formula
    .replace(/₀/g, '₀')
    .replace(/₁/g, '₁')
    .replace(/₂/g, '₂')
    .replace(/₃/g, '₃')
    .replace(/₄/g, '₄')
    .replace(/₅/g, '₅')
    .replace(/₆/g, '₆')
    .replace(/₇/g, '₇')
    .replace(/₈/g, '₈')
    .replace(/₉/g, '₉');
}

export function lerpColor(hexA: number, hexB: number, t: number): number {
  const rA = (hexA >> 16) & 255;
  const gA = (hexA >> 8) & 255;
  const bA = hexA & 255;
  const rB = (hexB >> 16) & 255;
  const gB = (hexB >> 8) & 255;
  const bB = hexB & 255;

  const r = Math.round(rA + (rB - rA) * t);
  const g = Math.round(gA + (gB - gA) * t);
  const b = Math.round(bA + (bB - bA) * t);

  return (r << 16) | (g << 8) | b;
}
