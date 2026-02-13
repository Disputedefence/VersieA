import React, { useState, useEffect, useContext } from 'react';
import { supabase } from './supabaseClient';
import { FEATURES as _FEATURES } from './features';
import { useCaseOverview } from './hooks/useCaseOverview';
import { LifecycleStepper } from './components/LifecycleStepper';

import {
  LayoutDashboard,
  CreditCard,
  ShieldAlert,
  Users,
  Settings,
  Bell,
  Search,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  LogOut,
  Plus,
  Sparkles,
  FileText,
  Loader2,
  Copy,
  Clock,

  Trash2,
  Download,
  BarChart3,
  History,
  FileCheck,
  Eye,

  Briefcase,
  Filter,
  Square,
  Zap,
  UserCheck,
  MessageSquare,
  BadgeCheck,
  Mail,
  Lock,
  User,
  RefreshCw,
  Save,
  Globe,
  Smartphone,
  Menu,
  Building,
  Check,

  Moon,
  Sun,
  BookOpen,

  Crown,
  TrendingUp,
  ShieldCheck,
  Package,
  FileSignature,
  Camera,
  Ban,
  Calculator,
  Radar,
  Gavel,
  Truck,
  ShoppingBag,
  Activity,
  StickyNote,
  Server,
  Database,
  Code,
  Fingerprint,
} from 'lucide-react';

// --- Theme Context ---
const ThemeContext = React.createContext({
  isDarkMode: true,
  toggleTheme: () => {},
});

// --- Gemini API Configuration ---
const callGeminiAPI = async (prompt: string) => {
  const apiKey = '';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          analysis: { type: 'STRING' },
          winProbability: { type: 'INTEGER' },
          strategy: { type: 'STRING' },
          draftLetter: { type: 'STRING' },
        },
      },
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error('API request failed');

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(resultText);
  } catch (error) {
    console.error('Gemini API Error:', error);
    return {
      analysis:
        "De klant claimt dat het product niet is ontvangen (Code 13.1). Tracking toont echter 'afgeleverd'. Dit is een sterke zaak voor representment mits een POD (Proof of Delivery) aanwezig is.",
      winProbability: 85,
      strategy:
        'Upload bewijs van levering (POD) en de handtekening van de ontvanger.',
      draftLetter:
        "To whom it may concern,\n\nWe are writing to formally dispute the chargeback for transaction #12345 (Reason Code 13.1). The cardholder claims the merchandise was not received.\n\nHowever, we have attached the Proof of Delivery (POD) from the carrier, which clearly indicates that the package was delivered to the cardholder's billing address on [Date] and signed for by [Name].\n\nIn accordance with Visa regulations regarding Compelling Evidence, we kindly request that you represent this chargeback in our favor.\n\nSincerely,\n\nDispute Defence Team",
    };
  }
};

// --- Types & Mock Data ---

type ChargebackStatus =
  | 'Open'
  | 'Pending'
  | 'Won'
  | 'Lost'
  | 'Accepted'
  | 'Deflected';
type WorkflowStep =
  | 'Retrieval'
  | '1st Chargeback'
  | 'Evidence Collection'
  | 'Representment'
  | 'Pre-Arb'
  | 'Decision'
  | 'Prevention'
  | 'Submitted';

interface EvidenceFile {
  id: string;
  name: string;
  size: string;
  type: string;
  date: string;
}

interface Customer {
  name: string;
  email: string;
  phone: string;
  ipAddress: string;
  country: string;
  priorOrders?: number;
  ce3Eligible?: boolean;
}

interface Chargeback {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  reason: string;
  reasonCode: string;
  date: string;
  dueDate: string;
  status: ChargebackStatus;
  workflowStep: WorkflowStep;
  cardBrand: 'visa' | 'mastercard';
  evidence: EvidenceFile[];
  expertReviewStatus?: 'none' | 'requested' | 'in_progress' | 'completed';
  customer: Customer;
  notes?: string;

  // New Technical Data Fields
  arn?: string; // Acquirer Reference Number
  authCode?: string; // Authorization Code
  eci?: string; // Electronic Commerce Indicator
  threeDSStatus?:
    | 'Fully Authenticated'
    | 'Attempted'
    | 'Not Authenticated'
    | 'N/A';
  avsResponse?: string;
  cvcResponse?: string;
  mcc?: string; // Merchant Category Code
  descriptor?: string;
  settlementDate?: string;
  hasRefund?: boolean;
}

const TODAY = new Date();
const formatDate = (daysToAdd: number) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + daysToAdd);
  return d.toISOString().split('T')[0];
};

export const MOCK_CHARGEBACKS: Chargeback[] = [
  {
    id: 'CB-2024-101',
    merchant: 'CoolBlue BV',
    amount: 129.95,
    currency: 'EUR',
    reason: 'Fraud - Cardholder does not recognize',
    reasonCode: '10.4',
    date: formatDate(-2),
    dueDate: formatDate(2),
    status: 'Open',
    workflowStep: '1st Chargeback',
    cardBrand: 'visa',
    evidence: [],
    expertReviewStatus: 'none',
    customer: {
      name: 'Pieter Janssen',
      email: 'p.janssen@gmail.com',
      phone: '+31 6 1234 5678',
      ipAddress: '192.168.1.45',
      country: 'NL',
      priorOrders: 3,
      ce3Eligible: true,
    },
    notes: 'Klant gebeld op 12 jan, geen gehoor. Voicemail ingesproken.',
    // Tech Data
    arn: '74535213123456789012345',
    authCode: 'TAS321',
    eci: '05', // Fully Auth (Visa)
    threeDSStatus: 'Fully Authenticated',
    avsResponse: 'M', // Match
    cvcResponse: 'M', // Match
    mcc: '5732', // Electronics Store
    descriptor: 'COOLBLUE *ORDER 123',
    settlementDate: formatDate(-1),
    hasRefund: false,
  },
  {
    id: 'ALERT-992',
    merchant: 'Bol.com',
    amount: 45.0,
    currency: 'EUR',
    reason: 'Fraud Alert (RDR)',
    reasonCode: 'N/A',
    date: formatDate(0),
    dueDate: formatDate(1),
    status: 'Deflected',
    workflowStep: 'Prevention',
    cardBrand: 'visa',
    evidence: [],
    expertReviewStatus: 'none',
    customer: {
      name: 'J. de Boer',
      email: 'jdb@test.com',
      phone: '-',
      ipAddress: '10.0.0.1',
      country: 'NL',
    },
    arn: 'N/A (Pre-Dispute)',
    authCode: '123456',
    eci: '07', // SSL / No 3DS
    threeDSStatus: 'Not Authenticated',
    mcc: '5399', // Misc Gen Merchandise
  },
  // --- NIEUWE TRANSACTIES TOEGEVOEGD VOOR HOGERE OMZET ---
  {
    id: 'CB-2024-115',
    merchant: 'CoolBlue BV',
    amount: 2899.0,
    currency: 'EUR',
    reason: 'Fraud - Cardholder does not recognize',
    reasonCode: '10.4',
    date: formatDate(-12),
    dueDate: formatDate(-1),
    status: 'Won',
    workflowStep: 'Decision',
    cardBrand: 'mastercard',
    evidence: [],
    expertReviewStatus: 'completed',
    customer: {
      name: 'K. van der Wal',
      email: 'k.vanderwal@bedrijf.nl',
      phone: '+31 6 2233 4455',
      ipAddress: '82.11.22.33',
      country: 'NL',
      priorOrders: 2,
      ce3Eligible: true,
    },
    arn: '85746352415263748596071',
    authCode: 'MAC221',
    eci: '02',
    threeDSStatus: 'Fully Authenticated',
    mcc: '5732',
    descriptor: 'COOLBLUE LAPTOPS',
  },
  {
    id: 'ALERT-995',
    merchant: 'MediaMarkt',
    amount: 1499.0,
    currency: 'EUR',
    reason: 'Fraud Alert (Ethoca)',
    reasonCode: 'N/A',
    date: formatDate(-1),
    dueDate: formatDate(0),
    status: 'Deflected',
    workflowStep: 'Prevention',
    cardBrand: 'visa',
    evidence: [],
    expertReviewStatus: 'none',
    customer: {
      name: 'Gaming Cafe AMS',
      email: 'info@gamernl.com',
      phone: '-',
      ipAddress: '188.12.33.44',
      country: 'NL',
    },
    arn: 'N/A',
    authCode: '998811',
    eci: '05',
    threeDSStatus: 'Fully Authenticated',
    mcc: '5732',
  },
  {
    id: 'CB-2024-116',
    merchant: 'Bijenkorf',
    amount: 549.0,
    currency: 'EUR',
    reason: 'Merchandise Not Received',
    reasonCode: '13.1',
    date: formatDate(-5),
    dueDate: formatDate(8),
    status: 'Won',
    workflowStep: 'Decision',
    cardBrand: 'visa',
    evidence: [],
    expertReviewStatus: 'none',
    customer: {
      name: 'Chantal Visser',
      email: 'chantal.v@live.nl',
      phone: '+31 6 5566 7788',
      ipAddress: '24.11.22.99',
      country: 'NL',
      priorOrders: 5,
      ce3Eligible: true,
    },
    arn: '12345678901234567890123',
    authCode: 'DYSON1',
    eci: '05',
    threeDSStatus: 'Fully Authenticated',
    mcc: '5311',
    descriptor: 'DE BIJENKORF ONLINE',
  },
  {
    id: 'CB-2024-117',
    merchant: 'Kamera Express',
    amount: 2500.0,
    currency: 'EUR',
    reason: 'Fraud - No Authorization',
    reasonCode: '4837',
    date: formatDate(-8),
    dueDate: formatDate(6),
    status: 'Won',
    workflowStep: 'Decision',
    cardBrand: 'mastercard',
    evidence: [],
    expertReviewStatus: 'completed',
    customer: {
      name: 'Studio X',
      email: 'finance@studiox.nl',
      phone: '+31 20 123 4567',
      ipAddress: '195.11.22.33',
      country: 'NL',
    },
    arn: '99887766554433221100112',
    authCode: 'SONY01',
    eci: '02',
    threeDSStatus: 'Fully Authenticated',
    mcc: '5946', // Camera Shops
    descriptor: 'KAMERA EXPRESS ROTTERDAM',
  },
  // --- EINDE NIEUWE TRANSACTIES ---
  {
    id: 'CB-2024-102',
    merchant: 'Bol.com',
    amount: 450.0,
    currency: 'EUR',
    reason: 'Merchandise Not Received',
    reasonCode: '13.1',
    date: formatDate(-3),
    dueDate: formatDate(5),
    status: 'Pending',
    workflowStep: 'Representment',
    cardBrand: 'visa',
    evidence: [
      {
        id: '1',
        name: 'factuur_123.pdf',
        size: '1.2 MB',
        type: 'application/pdf',
        date: '2024-01-12',
      },
    ],
    expertReviewStatus: 'none',
    customer: {
      name: 'Sarah de Vries',
      email: 'sarah.dv@hotmail.com',
      phone: '+31 6 8765 4321',
      ipAddress: '84.21.12.33',
      country: 'NL',
      priorOrders: 1,
      ce3Eligible: false,
    },
    arn: '23456789012345678901234',
    authCode: '883721',
    eci: '05',
    threeDSStatus: 'Fully Authenticated',
    avsResponse: 'A', // Address match, ZIP not
    cvcResponse: 'M',
    mcc: '5399',
    descriptor: 'BOL.COM AMSTERDAM',
    settlementDate: formatDate(-2),
  },
  {
    id: 'CB-2024-103',
    merchant: 'MediaMarkt',
    amount: 899.0,
    currency: 'EUR',
    reason: 'Defective/Not as Described',
    reasonCode: '4853',
    date: formatDate(-20),
    dueDate: formatDate(-5),
    status: 'Lost',
    workflowStep: 'Decision',
    cardBrand: 'mastercard',
    evidence: [],
    expertReviewStatus: 'completed',
    customer: {
      name: 'Mark Rutten',
      email: 'mark.r@live.nl',
      phone: '+31 6 1122 3344',
      ipAddress: '45.22.11.99',
      country: 'NL',
    },
    arn: '55544433322211100099988',
    authCode: '998877',
    eci: '02', // Fully Auth (Mastercard)
    threeDSStatus: 'Fully Authenticated',
    avsResponse: 'M',
    cvcResponse: 'M',
    mcc: '5732',
    descriptor: 'MEDIAMARKT WEBSHOP',
  },
  {
    id: 'CB-2024-105',
    merchant: 'Zalando',
    amount: 120.5,
    currency: 'EUR',
    reason: 'Fraud - No Cardholder Authorization',
    reasonCode: '4837',
    date: formatDate(-15),
    dueDate: formatDate(-2),
    status: 'Lost',
    workflowStep: 'Decision',
    cardBrand: 'mastercard',
    evidence: [],
    expertReviewStatus: 'none',
    customer: {
      name: 'Lucas Visser',
      email: 'l.visser@kpnmail.nl',
      phone: '+31 6 9988 7766',
      ipAddress: '62.14.55.11',
      country: 'NL',
    },
    arn: '44433322211100099988877',
    authCode: 'N/A', // Forced?
    eci: '01', // Attempted (Mastercard) - Liability Shift NOT guaranteed per se depending on region
    threeDSStatus: 'Attempted',
    avsResponse: 'U', // Unavailable
    cvcResponse: 'N', // No match! Red flag
    mcc: '5651', // Family Clothing
    descriptor: 'ZALANDO SE',
  },
];

const INTEGRATIONS = [
  { id: 'stripe', name: 'Stripe', status: 'connected', logo: 'S' },
  { id: 'adyen', name: 'Adyen', status: 'disconnected', logo: 'A' },
  { id: 'mollie', name: 'Mollie', status: 'disconnected', logo: 'M' },
  { id: 'buckaroo', name: 'Buckaroo', status: 'disconnected', logo: 'B' },
  {
    id: 'shopify',
    name: 'Shopify Payments',
    status: 'disconnected',
    logo: 'Sh',
  },
  { id: 'ethoca', name: 'Ethoca Alerts', status: 'disconnected', logo: 'E' },
];

const INITIAL_TEAM_MEMBERS = [
  {
    id: 1,
    name: 'Jan de Vries',
    role: 'Super Admin',
    email: 'jan@disputedefence.com',
    status: 'Active',
  },
  {
    id: 2,
    name: 'Sophie Bakker',
    role: 'Case Manager',
    email: 'sophie@disputedefence.com',
    status: 'Active',
  },
  {
    id: 3,
    name: 'Finance Team',
    role: 'Viewer',
    email: 'finance@disputedefence.com',
    status: 'Pending',
  },
];

// --- Components ---

const Card = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { isDarkMode } = useContext(ThemeContext);
  return (
    <div
      className={`${
        isDarkMode
          ? 'bg-[#2C2C2C] border-[#3E3E3E]'
          : 'bg-white border-slate-200'
      } rounded-xl border shadow-sm ${className}`}
    >
      {children}
    </div>
  );
};

const StatusBadge = ({ status }: { status: ChargebackStatus }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const styles = {
    Open: 'bg-red-500/10 text-red-400 border-red-500/20',
    Pending: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    Won: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Lost: isDarkMode
      ? 'bg-[#1E1E1E] text-zinc-400 border-[#3E3E3E]'
      : 'bg-slate-100 text-slate-500 border-slate-200',
    Accepted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Deflected: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${styles[status]}`}
    >
      {status === 'Deflected' && <Radar size={12} className="mr-1" />}
      {status}
    </span>
  );
};

const DeadlineTimer = ({
  dueDate,
  status,
}: {
  dueDate: string;
  status: string;
}) => {
  const { isDarkMode } = useContext(ThemeContext);
  if (
    status === 'Won' ||
    status === 'Lost' ||
    status === 'Accepted' ||
    status === 'Deflected'
  )
    return (
      <span
        className={`font-mono ${
          isDarkMode ? 'text-[#A0A0A0]' : 'text-slate-400'
        }`}
      >
        -
      </span>
    );

  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <span
        className={`${
          isDarkMode
            ? 'text-[#A0A0A0] bg-[#1E1E1E] border-[#3E3E3E]'
            : 'text-slate-500 bg-slate-100 border-slate-200'
        } flex items-center gap-1 font-mono text-xs px-2 py-1 rounded border`}
      >
        <Clock size={12} /> Verlopen
      </span>
    );
  }

  if (diffDays <= 2) {
    return (
      <span className="flex items-center gap-1.5 text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded border border-red-500/20 whitespace-nowrap">
        <Zap size={12} className="fill-red-400" /> {diffDays} dagen
      </span>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 text-sm font-medium ${
        diffDays <= 7
          ? 'text-[#FF6D00]'
          : isDarkMode
          ? 'text-[#A0A0A0]'
          : 'text-slate-500'
      }`}
    >
      <Clock size={14} />
      <span className="whitespace-nowrap">{diffDays} dagen</span>
    </div>
  );
};

const CardBrand = ({ brand }: { brand: 'visa' | 'mastercard' }) => (
  <div
    className={`w-10 h-6 rounded flex items-center justify-center text-[9px] font-black text-white tracking-widest ${
      brand === 'visa' ? 'bg-[#1a1f71]' : 'bg-[#eb001b]'
    }`}
  >
    {brand === 'visa' ? 'VISA' : 'MC'}
  </div>
);

// --- Extended Case Detail Modal ---
export const CaseDetailModal = ({
  isOpen,
  onClose,
  chargeback,
  onUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  chargeback: Chargeback | null;
  onUpdate: (updated: Chargeback) => void;
}) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'technical' | 'evidence' | 'ai' | 'expert' | 'letter' | 'notes'
  >('overview');
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiData, setAiData] = useState<any>(null);
  const [dashboardData, _setDashboardData] = useState<any>(null);
  const [localCase, setLocalCase] = useState<Chargeback | null>(null);
  const [expertRequestLoading, setExpertRequestLoading] = useState(false);
  const [noteText, setNoteText] = useState('');

  // Lifecycle overview data from Supabase
  const { data: overviewData, loading: overviewLoading } = useCaseOverview(
    chargeback?.id ?? null
  );

  useEffect(() => {
    if (chargeback) {
      setLocalCase(chargeback);
      setNoteText(chargeback.notes || '');
      setAiData(null);
      setActiveTab('overview');
    }
  }, [chargeback]);

  if (!isOpen || !localCase) return null;

  const handleAIAnalysis = async () => {
    setIsAILoading(true);
    const prompt = `Analyse chargeback: ${localCase.reason} (Code ${localCase.reasonCode}) for ${localCase.amount} ${localCase.currency}. Merchant: ${localCase.merchant}. 
    Respond in JSON with the following fields:
    - analysis (in Dutch): A short analysis of the situation.
    - winProbability (integer): 0-100.
    - strategy (in Dutch): A short strategy sentence.
    - draftLetter (in English): A formal dispute response letter addressed to the bank. IMPORTANT: The letter MUST be in English.`;

    const result = await callGeminiAPI(prompt);
    setAiData(result);
    setIsAILoading(false);
  };

  const handleFileUpload = () => {
    const newFile: EvidenceFile = {
      id: Math.random().toString(),
      name: 'bewijs_levering.pdf',
      size: '2.4 MB',
      type: 'application/pdf',
      date: new Date().toISOString().split('T')[0],
    };
    setLocalCase({
      ...localCase,
      evidence: [...localCase.evidence, newFile],
      workflowStep: 'Evidence Collection',
    });
  };

  const handleDeleteEvidence = (fileId: string) => {
    const updatedEvidence = localCase.evidence.filter((f) => f.id !== fileId);
    setLocalCase({ ...localCase, evidence: updatedEvidence });
    onUpdate({ ...localCase, evidence: updatedEvidence });
  };

  const updateStatus = (step: WorkflowStep) => {
    const updated = { ...localCase, workflowStep: step };
    setLocalCase(updated);
    onUpdate(updated);
  };

  const handleExpertRequest = () => {
    setExpertRequestLoading(true);
    setTimeout(() => {
      const updated = {
        ...localCase,
        expertReviewStatus: 'requested' as const,
      };
      setLocalCase(updated);
      onUpdate(updated);
      setExpertRequestLoading(false);
    }, 1500);
  };

  const handleAcceptLiability = () => {
    const updated = {
      ...localCase,
      status: 'Accepted' as const,
      workflowStep: 'Decision' as const,
    };
    setLocalCase(updated);
    onUpdate(updated);
    onClose();
  };

  const handleSaveNotes = () => {
    const updated = { ...localCase, notes: noteText };
    setLocalCase(updated);
    onUpdate(updated);
    alert('Notities opgeslagen');
  };

  const downloadDraft = () => {
    const element = document.createElement('a');
    const file = new Blob([aiData?.draftLetter || 'Draft content'], {
      type: 'text/plain',
    });
    element.href = URL.createObjectURL(file);
    element.download = `Verweer_${localCase.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Logic to determine liability shift status
  const isLiabilityShiftActive =
    localCase.threeDSStatus === 'Fully Authenticated' ||
    (localCase.cardBrand === 'visa' && localCase.eci === '05') ||
    (localCase.cardBrand === 'mastercard' && localCase.eci === '02');

  // Styles helpers
  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-[#A0A0A0]' : 'text-slate-500';
  const bgMain = isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-50';
  const border = isDarkMode ? 'border-[#3E3E3E]' : 'border-slate-200';
  const headerBg = isDarkMode ? 'bg-[#2C2C2C]' : 'bg-white';
  const cardBg = isDarkMode ? 'bg-[#2C2C2C]' : 'bg-white';
  const positiveText = isDarkMode ? 'text-emerald-400' : 'text-emerald-600';

  // Dynamic Evidence Funnel Logic
  const getRequiredEvidence = (code: string) => {
    if (code.includes('13.1') || code.includes('Not Received')) {
      return [
        {
          label: 'Proof of Delivery (POD)',
          icon: Package,
          desc: 'Getekend bewijs van aflevering door vervoerder.',
        },
        {
          label: 'Klantcommunicatie',
          icon: MessageSquare,
          desc: 'Emails waarin klant ontvangst erkent of updates.',
        },
        {
          label: 'Tracking Informatie',
          icon: Globe,
          desc: 'Screenshot van de tracking pagina.',
        },
      ];
    } else if (
      code.includes('10.4') ||
      code.includes('4837') ||
      code.includes('Fraud')
    ) {
      return [
        {
          label: 'AVS/CVV Match',
          icon: ShieldCheck,
          desc: 'Bewijs dat postcode en CVC code klopten.',
        },
        {
          label: 'IP & Device Log',
          icon: Smartphone,
          desc: 'IP adres en apparaat gegevens van koper.',
        },
        {
          label: 'Eerdere Orders',
          icon: History,
          desc: 'Bewijs van eerdere succesvolle orders (CE 3.0).',
        },
      ];
    } else if (
      code.includes('Defective') ||
      code.includes('13.3') ||
      code.includes('4853')
    ) {
      return [
        {
          label: 'Productbeschrijving',
          icon: FileText,
          desc: 'Screenshot van productpagina op moment van aankoop.',
        },
        {
          label: "Foto's van Item",
          icon: Camera,
          desc: "Foto's voor verzending (indien beschikbaar).",
        },
        {
          label: 'Retourbeleid',
          icon: RefreshCw,
          desc: 'Bewijs dat retourbeleid is geaccepteerd.',
        },
      ];
    } else {
      return [
        {
          label: 'Algemene Voorwaarden',
          icon: FileText,
          desc: 'Log dat T&C zijn geaccepteerd.',
        },
        {
          label: 'Factuur',
          icon: FileSignature,
          desc: 'De originele factuur van de order.',
        },
      ];
    }
  };

  const requirements = getRequiredEvidence(
    localCase.reasonCode || localCase.reason
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-0 md:p-8">
      <div
        className={`${bgMain} border ${border} md:rounded-2xl w-full h-full lg:max-w-5xl xl:max-w-6xl md:h-[90vh] shadow-2xl flex flex-col md:flex-row overflow-hidden`}
      >
        {/* Sidebar inside Modal (Desktop only) */}
        <div
          className={`hidden md:flex w-64 border-r ${border} flex-col ${headerBg} flex-shrink-0`}
        >
          <div className="p-6 border-b border-[#3E3E3E]">
            <div className="flex items-center gap-3 mb-2">
              <h2 className={`text-lg font-bold ${textPrimary}`}>
                {localCase.id}
              </h2>
              <StatusBadge status={localCase.status} />
            </div>
            <p className={`text-xs ${textSecondary} flex items-center gap-2`}>
              <User size={12} /> {localCase.customer.name}
            </p>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {[
              { id: 'overview', label: 'Overzicht', icon: LayoutDashboard },
              { id: 'technical', label: 'Technische Data', icon: Server }, // New Tab
              { id: 'evidence', label: 'Bewijs & Funnel', icon: FileCheck },
              { id: 'ai', label: 'AI Analist', icon: Sparkles },
              { id: 'expert', label: 'Expert Review', icon: UserCheck },
              { id: 'letter', label: 'Correspondentie', icon: FileText },
              { id: 'notes', label: 'Notities', icon: StickyNote },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#FF6D00] text-white shadow-md'
                    : `text-[#A0A0A0] hover:bg-[#3E3E3E] hover:text-white`
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
                {tab.id === 'expert' &&
                  localCase.expertReviewStatus === 'completed' && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500"></span>
                  )}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-[#3E3E3E]">
            <button
              onClick={onClose}
              className={`w-full py-2 rounded-md border ${border} ${textSecondary} hover:bg-[#3E3E3E] hover:text-white text-sm`}
            >
              Sluiten
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div
          className={`flex-1 flex flex-col h-full overflow-hidden ${bgMain} min-w-0`}
        >
          {/* Mobile Header */}
          <div
            className={`md:hidden px-6 py-4 border-b ${border} flex justify-between items-center ${headerBg}`}
          >
            <div>
              <h2 className={`text-lg font-bold ${textPrimary}`}>
                {localCase.id}
              </h2>
              <p className={`text-xs ${textSecondary}`}>
                {localCase.reasonCode}
              </p>
            </div>
            <button onClick={onClose}>
              <XCircle size={24} className={textSecondary} />
            </button>
          </div>

          {/* Mobile Tabs */}
          <div
            className={`md:hidden flex border-b ${border} overflow-x-auto no-scrollbar`}
          >
            {[
              'overview',
              'technical',
              'evidence',
              'ai',
              'expert',
              'letter',
              'notes',
            ].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-3 text-xs font-bold uppercase ${
                  activeTab === tab
                    ? 'text-[#FF6D00] border-b-2 border-[#FF6D00]'
                    : textSecondary
                }`}
              >
                {tab === 'technical' ? 'Tech' : tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-10">
            {/* === Stap 19-09: Dashboard tiles (inside main content) === */}
            {dashboardData && (
              <div className="w-full max-w-7xl mx-auto mb-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 px-6 py-4">
                    <div className="text-sm text-neutral-400">Total cases</div>
                    <div className="text-3xl font-semibold">
                      {dashboardData.stats?.total_chargebacks ?? 0}
                    </div>
                  </div>

                  <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 px-6 py-4">
                    <div className="text-sm text-neutral-400">Open</div>
                    <div className="text-3xl font-semibold">
                      {dashboardData.stats?.open_count ?? 0}
                    </div>
                  </div>

                  <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 px-6 py-4">
                    <div className="text-sm text-neutral-400">Won</div>
                    <div className="text-3xl font-semibold">
                      {dashboardData.stats?.won_count ?? 0}
                    </div>
                  </div>

                  <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 px-6 py-4">
                    <div className="text-sm text-neutral-400">Exposure (€)</div>
                    <div className="text-3xl font-semibold">
                      {dashboardData.stats?.total_eur_exposure ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Lifecycle Stepper */}
                {overviewLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={24} className="animate-spin text-[#FF6D00]" />
                  </div>
                )}
                {overviewData && (
                  <LifecycleStepper data={overviewData} isDarkMode={isDarkMode} />
                )}
                {!overviewLoading && !overviewData && (
                  <div className="w-full overflow-x-auto pb-2">
                    <div className="flex justify-between relative min-w-[500px]">
                      <div
                        className={`absolute top-1/2 left-0 w-full h-1 -translate-y-1/2 ${
                          isDarkMode ? 'bg-[#3E3E3E]' : 'bg-slate-200'
                        } -z-0 rounded`}
                      ></div>
                      {[
                        'Retrieval',
                        '1st Chargeback',
                        'Representment',
                        'Pre-Arb',
                        'Decision',
                      ].map((step, idx) => {
                        const currentIdx = [
                          'Retrieval',
                          '1st Chargeback',
                          'Representment',
                          'Pre-Arb',
                          'Decision',
                        ].indexOf(localCase.workflowStep);
                        const isCompleted = idx <= currentIdx;
                        return (
                          <div
                            key={step}
                            className={`relative z-10 px-4 py-1 rounded-full text-xs font-bold border-2 ${
                              isCompleted
                                ? 'bg-[#FF6D00] border-[#FF6D00] text-white'
                                : `${
                                    isDarkMode
                                      ? 'bg-[#2C2C2C] border-[#3E3E3E]'
                                      : 'bg-white border-slate-200'
                                  } ${textSecondary}`
                            }`}
                          >
                            {step}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* --- PRO TIP / UPSELL BANNER --- */}
                {localCase.status === 'Open' && (
                  <div className="bg-gradient-to-r from-[#FF6D00]/10 to-orange-600/5 border border-[#FF6D00]/20 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#FF6D00] p-2 rounded-full text-white flex-shrink-0">
                        <Crown size={18} />
                      </div>
                      <div>
                        <h4 className={`text-sm font-bold ${textPrimary}`}>
                          Twijfelt u over dit dossier?
                        </h4>
                        <p className={`text-xs ${textSecondary}`}>
                          Onze experts verhogen de winstkans met gemiddeld 40%.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('expert')}
                      className="text-[#FF6D00] text-sm font-bold hover:underline px-4 whitespace-nowrap"
                    >
                      Bekijk opties
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Left Column: Case Details */}
                  <div className="xl:col-span-2 space-y-6">
                    <Card className="p-6 relative overflow-hidden">
                      {/* Liability Shift Indicator - Quick View */}
                      <div
                        className={`absolute top-0 right-0 p-2 rounded-bl-lg text-[10px] font-bold uppercase tracking-wider ${
                          isLiabilityShiftActive
                            ? 'bg-emerald-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}
                      >
                        {isLiabilityShiftActive
                          ? 'Liability Shift: Active'
                          : 'No Liability Shift'}
                      </div>

                      <h3
                        className={`text-sm font-bold ${textSecondary} uppercase tracking-widest mb-6 flex items-center gap-2`}
                      >
                        <Briefcase size={16} /> Case Details
                      </h3>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                        <div>
                          <p className={`text-xs ${textSecondary} mb-1`}>
                            Reason Code
                          </p>
                          <p
                            className={`font-mono font-bold ${textPrimary} text-lg`}
                          >
                            {localCase.reasonCode}
                          </p>
                          <p className={`${textSecondary} text-xs mt-1`}>
                            {localCase.reason}
                          </p>
                        </div>
                        <div>
                          <p className={`text-xs ${textSecondary} mb-1`}>
                            Bedrag
                          </p>
                          <p className={`font-bold ${textPrimary} text-lg`}>
                            {localCase.currency} {localCase.amount.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className={`text-xs ${textSecondary} mb-1`}>
                            Transactie Datum
                          </p>
                          <p className={`${textPrimary}`}>{localCase.date}</p>
                        </div>
                        <div>
                          <p className={`text-xs ${textSecondary} mb-1`}>
                            Kaart
                          </p>
                          <CardBrand brand={localCase.cardBrand} />
                        </div>
                      </div>

                      {/* Short Tech Summary */}
                      <div
                        className={`mt-6 pt-4 border-t ${border} grid grid-cols-3 gap-4`}
                      >
                        <div>
                          <p
                            className={`text-[10px] ${textSecondary} uppercase font-bold`}
                          >
                            ARN
                          </p>
                          <p
                            className={`font-mono text-xs ${textPrimary} truncate`}
                            title={localCase.arn || 'N/A'}
                          >
                            {localCase.arn || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p
                            className={`text-[10px] ${textSecondary} uppercase font-bold`}
                          >
                            Auth Code
                          </p>
                          <p className={`font-mono text-xs ${textPrimary}`}>
                            {localCase.authCode || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p
                            className={`text-[10px] ${textSecondary} uppercase font-bold`}
                          >
                            3DS Status
                          </p>
                          <div className="flex items-center gap-1">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                isLiabilityShiftActive
                                  ? 'bg-emerald-500'
                                  : 'bg-red-500'
                              }`}
                            ></div>
                            <p
                              className={`font-mono text-xs ${textPrimary} truncate`}
                            >
                              {localCase.threeDSStatus || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3
                        className={`text-sm font-bold ${textSecondary} uppercase tracking-widest mb-6 flex items-center gap-2`}
                      >
                        <BookOpen size={16} /> Vereist Bewijs (Compelling
                        Evidence)
                      </h3>
                      <div className="space-y-3">
                        {requirements.map((req, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-3 p-3 rounded border ${
                              isDarkMode
                                ? 'bg-[#1E1E1E] border-[#3E3E3E]'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="mt-0.5 text-[#FF6D00] flex-shrink-0">
                              <req.icon size={16} />
                            </div>
                            <div>
                              <p className={`text-sm font-bold ${textPrimary}`}>
                                {req.label}
                              </p>
                              <p className={`text-xs ${textSecondary}`}>
                                {req.desc}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>

                  {/* Right Column: Customer & Action */}
                  <div className="space-y-6">
                    <Card className="p-6">
                      <h3
                        className={`text-sm font-bold ${textSecondary} uppercase tracking-widest mb-4`}
                      >
                        <User size={14} className="inline mr-2" /> Klant
                      </h3>
                      <div className="text-center mb-6">
                        <div
                          className={`w-16 h-16 mx-auto rounded-full ${
                            isDarkMode ? 'bg-[#3E3E3E]' : 'bg-slate-200'
                          } flex items-center justify-center text-xl font-bold ${textSecondary} mb-3`}
                        >
                          {localCase.customer.name.charAt(0)}
                        </div>
                        <h4
                          className={`text-lg font-bold ${textPrimary} truncate`}
                        >
                          {localCase.customer.name}
                        </h4>
                        <p className={`text-xs ${textSecondary}`}>
                          {localCase.customer.country}
                        </p>
                      </div>

                      {localCase.customer.ce3Eligible && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg mb-6 flex items-center gap-3">
                          <ShieldCheck
                            className="text-emerald-500 flex-shrink-0"
                            size={18}
                          />
                          <div>
                            <p className={`text-sm font-bold ${positiveText}`}>
                              CE 3.0 Match
                            </p>
                            <p className={`text-xs ${textSecondary}`}>
                              Klant heeft {localCase.customer.priorOrders}{' '}
                              eerdere orders. Sterk bewijs!
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3 text-sm">
                        <div
                          className={`flex justify-between py-2 border-b ${border}`}
                        >
                          <span className={textSecondary}>Email</span>
                          <span
                            className={`${textPrimary} truncate max-w-[120px]`}
                          >
                            {localCase.customer.email}
                          </span>
                        </div>
                        <div
                          className={`flex justify-between py-2 border-b ${border}`}
                        >
                          <span className={textSecondary}>IP</span>
                          <span className={`${textPrimary} font-mono`}>
                            {localCase.customer.ipAddress}
                          </span>
                        </div>
                      </div>
                    </Card>

                    <div
                      className={`${
                        isDarkMode ? 'bg-[#2C2C2C]' : 'bg-white'
                      } border border-[#FF6D00] rounded-lg p-6 text-center`}
                    >
                      <h3 className={`font-bold ${textPrimary} mb-2`}>
                        Deadline
                      </h3>
                      <p className={`text-2xl font-mono ${textPrimary} mb-4`}>
                        {localCase.dueDate}
                      </p>
                      <button
                        onClick={() => setActiveTab('evidence')}
                        className="w-full bg-[#FF6D00] hover:bg-[#e66200] text-white py-3 rounded-md font-bold text-sm transition-colors mb-3"
                      >
                        Start Verdediging
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TECHNICAL DATA (NEW) */}
            {activeTab === 'technical' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className={`text-xl font-bold ${textPrimary}`}>
                    Technische Details
                  </h3>
                  <span className="bg-[#FF6D00]/10 text-[#FF6D00] text-[10px] font-bold uppercase px-2 py-1 rounded border border-[#FF6D00]/20">
                    Bank Grade Data
                  </span>
                </div>
                <p className={`${textSecondary} text-sm mb-6`}>
                  Cruciale data voor Visa (VDR) en Mastercard (MDRI) compliance
                  en bewijsvoering.
                </p>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* 1. Transaction Security & Liability */}
                  <Card className="p-6">
                    <h4
                      className={`text-sm font-bold ${textSecondary} uppercase tracking-widest mb-6 flex items-center gap-2`}
                    >
                      <Lock size={16} /> Security & Liability
                    </h4>

                    <div
                      className={`p-4 rounded-lg border mb-6 flex items-start gap-4 ${
                        isLiabilityShiftActive
                          ? 'bg-emerald-500/10 border-emerald-500/20'
                          : 'bg-red-500/10 border-red-500/20'
                      }`}
                    >
                      <div
                        className={`mt-1 ${
                          isLiabilityShiftActive
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }`}
                      >
                        {isLiabilityShiftActive ? (
                          <ShieldCheck size={24} />
                        ) : (
                          <AlertTriangle size={24} />
                        )}
                      </div>
                      <div>
                        <h5
                          className={`font-bold text-lg ${
                            isLiabilityShiftActive
                              ? 'text-emerald-400'
                              : 'text-red-400'
                          }`}
                        >
                          {isLiabilityShiftActive
                            ? 'Liability Shift Active'
                            : 'No Liability Shift'}
                        </h5>
                        <p className={`text-sm ${textSecondary} mt-1`}>
                          {isLiabilityShiftActive
                            ? 'Issuer is aansprakelijk voor fraude (10.4/4837) vanwege succesvolle 3D Secure.'
                            : 'Merchant is aansprakelijk voor fraude. Geen succesvolle 3DS authenticatie.'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p
                          className={`text-xs font-bold ${textSecondary} uppercase`}
                        >
                          3D Secure Status
                        </p>
                        <p className={`font-mono text-sm ${textPrimary}`}>
                          {localCase.threeDSStatus || 'N/A'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p
                          className={`text-xs font-bold ${textSecondary} uppercase`}
                        >
                          ECI Indicator
                        </p>
                        <p
                          className={`font-mono text-sm ${textPrimary} font-bold`}
                        >
                          {localCase.eci || 'N/A'}
                        </p>
                        <p className="text-[10px] text-[#A0A0A0]">
                          {localCase.eci === '05' &&
                            '(Visa) Fully Authenticated'}
                          {localCase.eci === '06' && '(Visa) Attempted'}
                          {localCase.eci === '07' && '(Visa) Non-Secure'}
                          {localCase.eci === '02' && '(MC) Fully Authenticated'}
                          {localCase.eci === '01' && '(MC) Attempted'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p
                          className={`text-xs font-bold ${textSecondary} uppercase`}
                        >
                          CAVV / AAV
                        </p>
                        <p className={`font-mono text-sm ${textSecondary}`}>
                          {isLiabilityShiftActive
                            ? 'Present (Hidden)'
                            : 'Not Present'}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* 2. Reference Data */}
                  <Card className="p-6">
                    <h4
                      className={`text-sm font-bold ${textSecondary} uppercase tracking-widest mb-6 flex items-center gap-2`}
                    >
                      <Database size={16} /> Reference Data
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-1 pb-3 border-b border-[#3E3E3E]/50">
                        <p
                          className={`text-xs font-bold ${textSecondary} uppercase`}
                        >
                          ARN (Acquirer Reference Number)
                        </p>
                        <div className="flex items-center gap-2">
                          <p
                            className={`font-mono text-sm ${textPrimary} tracking-wide`}
                          >
                            {localCase.arn || 'N/A'}
                          </p>
                          {localCase.arn && (
                            <Copy
                              size={12}
                              className="cursor-pointer text-[#FF6D00] hover:text-white transition-colors"
                            />
                          )}
                        </div>
                        <p className="text-[10px] text-[#A0A0A0]">
                          Gebruik dit nummer om refunds te traceren bij de
                          issuer.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p
                            className={`text-xs font-bold ${textSecondary} uppercase`}
                          >
                            Auth Code
                          </p>
                          <p className={`font-mono text-sm ${textPrimary}`}>
                            {localCase.authCode || 'N/A'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p
                            className={`text-xs font-bold ${textSecondary} uppercase`}
                          >
                            Settlement Date
                          </p>
                          <p className={`font-mono text-sm ${textPrimary}`}>
                            {localCase.settlementDate || 'Pending'}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`p-3 rounded border ${border} ${
                          isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-50'
                        } mt-2`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold ${textSecondary}`}
                          >
                            Refund History
                          </span>
                          <span
                            className={`text-xs font-bold ${
                              localCase.hasRefund
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            }`}
                          >
                            {localCase.hasRefund
                              ? 'CREDIT FOUND'
                              : 'NO CREDIT FOUND'}
                          </span>
                        </div>
                        {localCase.hasRefund && (
                          <p className="text-[10px] text-[#A0A0A0] mt-1">
                            Partial refund gevonden op ARN ...456
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>

                  {/* 3. Verification Codes */}
                  <Card className="p-6">
                    <h4
                      className={`text-sm font-bold ${textSecondary} uppercase tracking-widest mb-6 flex items-center gap-2`}
                    >
                      <Code size={16} /> Response Codes
                    </h4>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="text-center p-4 rounded border border-[#3E3E3E] bg-[#1E1E1E]">
                        <p
                          className={`text-xs font-bold ${textSecondary} uppercase mb-2`}
                        >
                          AVS Response
                        </p>
                        <div
                          className={`text-3xl font-black ${textPrimary} mb-1`}
                        >
                          {localCase.avsResponse || '-'}
                        </div>
                        <p className="text-[10px] text-[#A0A0A0]">
                          {localCase.avsResponse === 'M' &&
                            'Full Match (Address & ZIP)'}
                          {localCase.avsResponse === 'A' &&
                            'Address Match, ZIP No Match'}
                          {localCase.avsResponse === 'Z' &&
                            'ZIP Match, Address No Match'}
                          {localCase.avsResponse === 'N' && 'No Match'}
                          {localCase.avsResponse === 'U' && 'Unavailable'}
                        </p>
                      </div>
                      <div className="text-center p-4 rounded border border-[#3E3E3E] bg-[#1E1E1E]">
                        <p
                          className={`text-xs font-bold ${textSecondary} uppercase mb-2`}
                        >
                          CVC Response
                        </p>
                        <div
                          className={`text-3xl font-black ${textPrimary} mb-1`}
                        >
                          {localCase.cvcResponse || '-'}
                        </div>
                        <p className="text-[10px] text-[#A0A0A0]">
                          {localCase.cvcResponse === 'M' && 'Match'}
                          {localCase.cvcResponse === 'N' && 'No Match'}
                          {localCase.cvcResponse === 'P' && 'Not Processed'}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* 4. Merchant Context & CE 3.0 */}
                  <Card className="p-6">
                    <h4
                      className={`text-sm font-bold ${textSecondary} uppercase tracking-widest mb-6 flex items-center gap-2`}
                    >
                      <Fingerprint size={16} /> Context & CE 3.0
                    </h4>
                    <div className="space-y-4 mb-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p
                            className={`text-xs font-bold ${textSecondary} uppercase`}
                          >
                            MCC
                          </p>
                          <p className={`font-mono text-sm ${textPrimary}`}>
                            {localCase.mcc || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p
                            className={`text-xs font-bold ${textSecondary} uppercase`}
                          >
                            Descriptor
                          </p>
                          <p
                            className={`font-mono text-[10px] ${textPrimary} truncate`}
                          >
                            {localCase.descriptor || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {localCase.customer.ce3Eligible ? (
                      <div className="border border-emerald-500/30 bg-emerald-500/5 rounded p-3">
                        <p className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-2">
                          <CheckCircle2 size={12} /> CE 3.0 Eligible
                        </p>
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr className="text-[#A0A0A0] text-left">
                              <th className="pb-1">Data Point</th>
                              <th className="pb-1">Dispute</th>
                              <th className="pb-1">History (120d+)</th>
                            </tr>
                          </thead>
                          <tbody className={textPrimary}>
                            <tr>
                              <td className="py-1">IP Address</td>
                              <td className="font-mono">
                                {localCase.customer.ipAddress}
                              </td>
                              <td className="font-mono">
                                {localCase.customer.ipAddress}{' '}
                                <span className="text-emerald-500">✔</span>
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1">Device ID</td>
                              <td className="font-mono">...8a92</td>
                              <td className="font-mono">
                                ...8a92{' '}
                                <span className="text-emerald-500">✔</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="border border-[#3E3E3E] bg-[#1E1E1E] rounded p-3 text-center">
                        <p className={`text-xs ${textSecondary}`}>
                          Geen Compelling Evidence 3.0 data beschikbaar voor
                          deze klant.
                        </p>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            )}

            {/* TAB: EVIDENCE / FUNNEL */}
            {activeTab === 'evidence' && (
              <div className="space-y-8">
                <div>
                  <h3 className={`text-xl font-bold ${textPrimary} mb-2`}>
                    Verweer Wizard
                  </h3>
                  <p className={`${textSecondary} text-sm mb-6`}>
                    Op basis van Reason Code{' '}
                    <strong>{localCase.reasonCode}</strong> is het volgende
                    bewijs verplicht:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                    {requirements.map((req, i) => (
                      <div
                        key={i}
                        className={`p-6 border ${border} rounded-lg ${cardBg} relative overflow-hidden group`}
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#FF6D00]"></div>
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className={`w-8 h-8 rounded bg-[#FF6D00]/10 flex items-center justify-center text-[#FF6D00] flex-shrink-0`}
                          >
                            <req.icon size={18} />
                          </div>
                          <h4 className={`font-bold ${textPrimary}`}>
                            {req.label}
                          </h4>
                        </div>
                        <p className={`text-xs ${textSecondary} mb-4 h-8`}>
                          {req.desc}
                        </p>

                        {/* Simulated File Upload Input */}
                        <div
                          className={`border-2 border-dashed ${border} rounded-md p-3 text-center cursor-pointer hover:border-[#FF6D00] transition-colors`}
                          onClick={handleFileUpload}
                        >
                          <span className={`text-xs font-bold ${textPrimary}`}>
                            + Upload Bestand
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3
                    className={`text-sm font-bold ${textSecondary} uppercase tracking-widest mb-4`}
                  >
                    Geüploade Bestanden
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {localCase.evidence.length === 0 ? (
                      <div className="col-span-full text-center py-8">
                        <p className={`${textSecondary} italic`}>
                          Nog geen bewijs toegevoegd.
                        </p>
                      </div>
                    ) : (
                      localCase.evidence.map((file) => (
                        <div
                          key={file.id}
                          className={`flex items-center justify-between ${
                            isDarkMode ? 'bg-[#2C2C2C]' : 'bg-white'
                          } border ${border} p-4 rounded-lg group hover:border-[#FF6D00] transition-colors`}
                        >
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className="w-10 h-10 bg-red-500/10 rounded flex items-center justify-center text-red-400 font-bold text-[10px] border border-red-500/10 flex-shrink-0">
                              PDF
                            </div>
                            <div className="min-w-0">
                              <p
                                className={`${textPrimary} text-sm font-medium truncate`}
                              >
                                {file.name}
                              </p>
                              <p className={`${textSecondary} text-xs`}>
                                {file.size} • {file.date}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                alert(`Bestand ${file.name} openen...`)
                              }
                              className={`p-2 ${textSecondary} hover:${textPrimary} hover:bg-black/5 rounded`}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteEvidence(file.id)}
                              className={`p-2 ${textSecondary} hover:text-red-400 hover:bg-red-500/10 rounded`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: AI ANALYSIS */}
            {activeTab === 'ai' && (
              <div className="h-full flex flex-col justify-center max-w-2xl mx-auto">
                {!aiData && !isAILoading ? (
                  <div className="text-center">
                    <div
                      className={`w-24 h-24 ${
                        isDarkMode ? 'bg-[#2C2C2C]' : 'bg-white'
                      } rounded-full flex items-center justify-center mb-6 border border-[#FF6D00] mx-auto`}
                    >
                      <Sparkles size={40} className="text-[#FF6D00]" />
                    </div>
                    <h3 className={`text-2xl font-bold ${textPrimary} mb-3`}>
                      AI Expert Analyse
                    </h3>
                    <p className={`${textSecondary} mb-8 leading-relaxed`}>
                      Onze AI analyseert de Reason Code{' '}
                      <strong>{localCase.reasonCode}</strong> en vergelijkt deze
                      met duizenden gewonnen zaken om de beste strategie te
                      bepalen.
                    </p>
                    <button
                      onClick={handleAIAnalysis}
                      className="bg-[#FF6D00] text-white hover:bg-[#e66200] px-8 py-4 rounded-md font-bold transition-transform hover:scale-105 flex items-center gap-2 mx-auto"
                    >
                      <Sparkles size={18} />
                      Start Analyse
                    </button>
                  </div>
                ) : isAILoading ? (
                  <div className="text-center">
                    <div className="relative w-16 h-16 mb-6 mx-auto">
                      <div className="absolute inset-0 rounded-full border-t-2 border-[#FF6D00] animate-spin"></div>
                    </div>
                    <p className={`${textPrimary} font-medium text-lg`}>
                      Data analyseren...
                    </p>
                    <p className={`${textSecondary} text-sm`}>
                      Kansen berekenen...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="md:col-span-2 p-6">
                        <h4 className="text-xs font-bold text-[#FF6D00] mb-4 flex items-center gap-2 uppercase tracking-widest">
                          <Sparkles size={12} /> Analyse
                        </h4>
                        <p className={`${textPrimary} text-sm leading-relaxed`}>
                          {aiData.analysis}
                        </p>
                      </Card>
                      <Card className="p-6 flex flex-col items-center justify-center text-center">
                        <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">
                          Winstkans
                        </h4>
                        <div
                          className={`text-5xl font-black ${textPrimary} tracking-tighter mb-2`}
                        >
                          {aiData.winProbability}
                          <span className="text-2xl text-emerald-400">%</span>
                        </div>
                      </Card>
                    </div>

                    <Card className="p-6 border-l-4 border-l-[#FF6D00]">
                      <h4 className={`${textPrimary} font-bold text-sm mb-2`}>
                        Aanbevolen Strategie
                      </h4>
                      <p className={`${textSecondary} text-sm`}>
                        {aiData.strategy}
                      </p>
                    </Card>

                    <div className="flex flex-col gap-4 pt-4 items-center">
                      <button
                        onClick={() => setActiveTab('letter')}
                        className="w-full justify-center text-white bg-[#FF6D00] hover:bg-[#e66200] px-6 py-3 rounded-md text-sm font-bold transition-all flex items-center gap-2"
                      >
                        Naar Brief Bewerker <ChevronRight size={16} />
                      </button>
                      <button
                        onClick={() => setActiveTab('expert')}
                        className={`text-xs ${textSecondary} hover:${textPrimary} underline`}
                      >
                        Niet zeker? Vraag een Expert
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: EXPERT REVIEW - MARKETED VERSION */}
            {activeTab === 'expert' && (
              <div className="h-full flex flex-col justify-center max-w-4xl mx-auto">
                {localCase.expertReviewStatus === 'completed' ? (
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    <div
                      className={`${
                        isDarkMode ? 'bg-[#2C2C2C]' : 'bg-white'
                      } border border-emerald-500/20 rounded-lg p-8 flex flex-col md:flex-row items-start gap-6`}
                    >
                      <div className="w-16 h-16 rounded bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <BadgeCheck size={32} className="text-emerald-400" />
                      </div>
                      <div>
                        <h3
                          className={`text-2xl font-bold ${textPrimary} mb-2`}
                        >
                          Expert Review Voltooid
                        </h3>
                        <p className={`${textSecondary} text-sm max-w-lg mb-6`}>
                          Uw dossier is beoordeeld door{' '}
                          <strong>Sarah Jansen</strong> (Senior Dispute
                          Specialist). De winkstkans is herzien en het verweer
                          is aangescherpt.
                        </p>
                        <div className="flex gap-4">
                          <button
                            onClick={() => setActiveTab('letter')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-md font-bold text-sm transition-colors"
                          >
                            Bekijk Aangepaste Brief
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="animate-in fade-in duration-500 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="text-left space-y-6">
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${
                          isDarkMode
                            ? 'bg-[#FF6D00]/20 text-[#FF6D00]'
                            : 'bg-orange-100 text-orange-600'
                        } text-xs font-bold uppercase tracking-wider`}
                      >
                        <Crown size={12} /> Premium Service
                      </div>
                      <h3
                        className={`text-4xl font-black ${textPrimary} leading-tight`}
                      >
                        Verlies deze zaak <br />
                        <span className="text-[#FF6D00]">niet onnodig.</span>
                      </h3>
                      <p className={`${textSecondary} text-lg leading-relaxed`}>
                        Chargeback regels zijn complex. Onze gecertificeerde
                        experts controleren uw bewijs, herschrijven de brief en
                        verhogen uw winstkans aanzienlijk.
                      </p>
                      <ul className="space-y-3">
                        {[
                          'Review door Visa/Mastercard specialist',
                          "Check op verplichte 'Compelling Evidence'",
                          'Juridisch correcte verweerbrief',
                          'Binnen 24 uur reactie',
                        ].map((item, i) => (
                          <li
                            key={i}
                            className={`flex items-center gap-3 ${textPrimary}`}
                          >
                            <CheckCircle2
                              size={18}
                              className="text-emerald-500"
                            />{' '}
                            {item}
                          </li>
                        ))}
                      </ul>
                      <div className="pt-4 flex flex-col sm:flex-row items-start gap-4">
                        <button
                          onClick={handleExpertRequest}
                          disabled={expertRequestLoading}
                          className="bg-[#FF6D00] text-white hover:bg-[#e66200] px-8 py-4 rounded-md font-bold shadow-lg flex items-center gap-3 transition-transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
                        >
                          {expertRequestLoading ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <UserCheck size={18} />
                          )}
                          Review Aanvragen
                        </button>
                        <div className="flex flex-col">
                          <span className={`${textPrimary} font-bold`}>
                            € 49,00{' '}
                            <span
                              className={`text-xs ${textSecondary} font-normal`}
                            >
                              / eenmalig
                            </span>
                          </span>
                          {localCase.amount > 500 && (
                            <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                              <Gavel size={10} /> No Cure No Pay beschikbaar
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right side visual */}
                    <div
                      className={`hidden md:flex flex-col gap-4 p-6 rounded-2xl ${
                        isDarkMode ? 'bg-[#2C2C2C]/50' : 'bg-slate-50'
                      } border ${border} relative overflow-hidden`}
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF6D00]/10 rounded-full blur-2xl"></div>
                      <div className="flex items-center gap-4 p-4 rounded-lg bg-[#1E1E1E] border border-[#3E3E3E] shadow-xl transform translate-x-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                          <TrendingUp size={20} />
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm">
                            +40% Winstkans
                          </p>
                          <p className="text-[#A0A0A0] text-xs">
                            Met expert review
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 rounded-lg bg-[#1E1E1E] border border-[#3E3E3E] shadow-xl transform -translate-x-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm">
                            Volledige Dekking
                          </p>
                          <p className="text-[#A0A0A0] text-xs">
                            Visa & Mastercard
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: LETTER */}
            {activeTab === 'letter' && (
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`${textPrimary} font-bold`}>
                    Concept Verweerbrief
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAIAnalysis}
                      className={`${textSecondary} hover:${textPrimary} p-2 rounded hover:${
                        isDarkMode ? 'bg-[#3E3E3E]' : 'bg-slate-200'
                      } transition-colors`}
                      title="Regenereren"
                    >
                      <RefreshCw size={18} />
                    </button>
                    <button
                      onClick={downloadDraft}
                      className={`${textSecondary} hover:${textPrimary} p-2 rounded hover:${
                        isDarkMode ? 'bg-[#3E3E3E]' : 'bg-slate-200'
                      } transition-colors`}
                      title="Download PDF"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </div>
                <textarea
                  className={`flex-1 w-full ${
                    isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-50'
                  } border ${border} rounded-lg p-6 ${textPrimary} font-mono text-sm leading-relaxed focus:ring-1 focus:ring-[#FF6D00] focus:border-[#FF6D00] outline-none resize-none transition-all`}
                  value={
                    aiData
                      ? aiData.draftLetter
                      : 'Voer eerst een AI analyse uit om een conceptbrief te genereren...'
                  }
                  onChange={(e) =>
                    setAiData({ ...aiData, draftLetter: e.target.value })
                  }
                />
              </div>
            )}

            {/* TAB: NOTES (Scratchpad) */}
            {activeTab === 'notes' && (
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className={`${textPrimary} font-bold`}>
                      Dossier Notities
                    </h3>
                    <p className={`${textSecondary} text-xs`}>
                      Interne aantekeningen voor dit dossier.
                    </p>
                  </div>
                  <button
                    onClick={handleSaveNotes}
                    className="bg-[#FF6D00] text-white hover:bg-[#e66200] px-4 py-2 rounded-md font-bold text-sm transition-colors flex items-center gap-2"
                  >
                    <Save size={16} /> Opslaan
                  </button>
                </div>
                <textarea
                  className={`flex-1 w-full ${
                    isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-50'
                  } border ${border} rounded-lg p-6 ${textPrimary} text-sm leading-relaxed focus:ring-1 focus:ring-[#FF6D00] focus:border-[#FF6D00] outline-none resize-none transition-all`}
                  placeholder="Typ hier uw notities..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div
            className={`p-4 md:p-6 ${headerBg} border-t ${border} flex flex-col-reverse md:flex-row justify-between items-center gap-4 relative z-10`}
          >
            <div className={`text-xs ${textSecondary} flex items-center gap-2`}>
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>{' '}
              Automatisch opgeslagen
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <button
                onClick={onClose}
                className={`flex-1 md:flex-none px-6 py-3 rounded-md ${textSecondary} hover:${textPrimary} hover:${
                  isDarkMode ? 'bg-[#3E3E3E]' : 'bg-slate-200'
                } transition-colors text-sm font-medium border border-transparent`}
              >
                Sluiten
              </button>

              {localCase.workflowStep !== 'Submitted' &&
                localCase.status !== 'Accepted' && (
                  <>
                    <button
                      onClick={handleAcceptLiability}
                      className={`flex-1 md:flex-none px-6 py-3 rounded-md border ${border} text-red-400 hover:text-white hover:bg-red-500/10 transition-colors text-sm font-medium flex items-center justify-center gap-2`}
                      title="Voorkom administratiekosten bij de bank"
                    >
                      <Ban size={16} /> Accepteer Claim
                    </button>

                    <button
                      onClick={() => {
                        updateStatus('Submitted');
                        onClose();
                      }}
                      className="flex-1 md:flex-none px-8 py-3 rounded-md bg-[#FF6D00] hover:bg-[#e66200] text-white transition-all text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={16} />
                      Verweer Indienen
                    </button>
                  </>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- ROI Calculator Component ---
const ROICalculator = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [revenue, setRevenue] = useState(50000000); // 50M
  const [aov, setAov] = useState(75);
  const [cbRate, setCbRate] = useState(0.4);

  // Constants
  const WIN_RATE_INDUSTRY = 0.25;
  const WIN_RATE_DD = 0.7;

  // Calculations
  const transactions = revenue / aov;
  const chargebacks = Math.floor(transactions * (cbRate / 100));
  const lostRevenue = chargebacks * aov;

  const recoveredIndustry = lostRevenue * WIN_RATE_INDUSTRY;
  const recoveredDD = lostRevenue * WIN_RATE_DD;
  const savings = recoveredDD - recoveredIndustry;

  // Styles helpers
  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-[#A0A0A0]' : 'text-slate-500';
  const border = isDarkMode ? 'border-[#3E3E3E]' : 'border-slate-200';
  const inputBg = isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-50';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      <div
        className={`p-6 md:p-8 rounded-xl border ${border} ${
          isDarkMode ? 'bg-[#2C2C2C]' : 'bg-white'
        }`}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-full bg-[#FF6D00]/20 text-[#FF6D00]">
            <Calculator size={24} />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${textPrimary}`}>
              ROI Calculator
            </h2>
            <p className={`text-sm ${textSecondary}`}>
              Bereken uw potentiële besparing met Dispute Defence
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Inputs */}
          <div className="space-y-6">
            <div>
              <label
                className={`block text-xs font-bold ${textSecondary} uppercase mb-2`}
              >
                Jaaromzet
              </label>
              <input
                type="number"
                value={revenue}
                onChange={(e) => setRevenue(Number(e.target.value))}
                className={`w-full ${inputBg} border ${border} rounded-md px-4 py-3 ${textPrimary} focus:border-[#FF6D00] outline-none font-mono`}
              />
            </div>
            <div>
              <label
                className={`block text-xs font-bold ${textSecondary} uppercase mb-2`}
              >
                Gemiddelde Orderwaarde (AOV)
              </label>
              <input
                type="number"
                value={aov}
                onChange={(e) => setAov(Number(e.target.value))}
                className={`w-full ${inputBg} border ${border} rounded-md px-4 py-3 ${textPrimary} focus:border-[#FF6D00] outline-none font-mono`}
              />
            </div>
            <div>
              <label
                className={`block text-xs font-bold ${textSecondary} uppercase mb-2`}
              >
                Chargeback Rate (%)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={cbRate}
                  onChange={(e) => setCbRate(Number(e.target.value))}
                  className="w-full accent-[#FF6D00]"
                />
                <span className={`font-bold ${textPrimary} w-12`}>
                  {cbRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Stats Middle */}
          <div
            className={`p-6 rounded-lg ${
              isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-50'
            } border ${border} space-y-4`}
          >
            <div className="flex justify-between items-center pb-4 border-b border-[#3E3E3E]">
              <span className={textSecondary}>Aantal Chargebacks</span>
              <span className={`font-bold ${textPrimary}`}>
                {chargebacks.toLocaleString()} / jaar
              </span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-[#3E3E3E]">
              <span className={textSecondary}>Totaal Betwist</span>
              <span className={`font-bold ${textPrimary}`}>
                {formatCurrency(lostRevenue)}
              </span>
            </div>
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs text-[#A0A0A0]">
                <span>Huidig herstel (25%)</span>
                <span>{formatCurrency(recoveredIndustry)}</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-500"
                  style={{ width: '25%' }}
                ></div>
              </div>

              <div className="flex justify-between text-xs text-[#FF6D00] font-bold mt-4">
                <span>Met Dispute Defence (70%)</span>
                <span>{formatCurrency(recoveredDD)}</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FF6D00]"
                  style={{ width: '70%' }}
                ></div>
              </div>
            </div>
          </div>

          {/* Result Big */}
          <div className="flex flex-col justify-center items-center text-center p-6 bg-gradient-to-br from-[#FF6D00]/20 to-transparent border border-[#FF6D00] rounded-lg">
            <h3 className={`text-lg font-bold ${textPrimary} mb-2`}>
              Uw Potentiële Winst
            </h3>
            <div className="text-5xl font-black text-[#FF6D00] tracking-tight mb-4">
              +{formatCurrency(savings)}
            </div>
            <p className={`text-sm ${textSecondary} mb-6`}>
              Extra omzet per jaar t.o.v. industrie gemiddelde
            </p>
            <button className="bg-[#FF6D00] text-white px-6 py-3 rounded-md font-bold hover:bg-[#e66200] transition-colors w-full">
              Start Nu & Bespaar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Login Screen ---
const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [_authMode, _setAuthMode] = useState<
    'options' | 'email-login' | 'email-signup'
  >('email-login'); // Default to email
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Styles helpers
  const bgMain = isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-50';
  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-[#A0A0A0]' : 'text-slate-500';
  const inputBg = isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-50';
  const border = isDarkMode ? 'border-[#3E3E3E]' : 'border-slate-200';

  return (
    <div
      className={`min-h-screen ${bgMain} flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300`}
    >
      <Card className="max-w-md w-full p-6 md:p-10 relative z-10 shadow-2xl transition-all duration-300">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#FF6D00]/20 rounded-full mx-auto flex items-center justify-center mb-6">
            <ShieldAlert className="text-[#FF6D00] w-8 h-8" />
          </div>
          <h1
            className={`text-2xl md:text-3xl font-black ${textPrimary} mb-2 tracking-tight`}
          >
            Dispute Defence
          </h1>
          <p className={`${textSecondary} text-sm md:text-base`}>
            Next-Gen Chargeback Protection
          </p>
        </div>

        {/* Login Form is Always Visible Now */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Mail
                className={`absolute left-4 top-1/2 -translate-y-1/2 ${textSecondary} w-5 h-5`}
              />
              <input
                type="email"
                placeholder="Email adres"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full ${inputBg} border ${border} rounded-md pl-12 pr-4 py-3 ${textPrimary} focus:border-[#FF6D00] focus:ring-1 focus:ring-[#FF6D00] outline-none transition-all`}
              />
            </div>
            <div className="relative">
              <Lock
                className={`absolute left-4 top-1/2 -translate-y-1/2 ${textSecondary} w-5 h-5`}
              />
              <input
                type="password"
                placeholder="Wachtwoord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full ${inputBg} border ${border} rounded-md pl-12 pr-4 py-3 ${textPrimary} focus:border-[#FF6D00] focus:ring-1 focus:ring-[#FF6D00] outline-none transition-all`}
              />
            </div>
          </div>

          <button
            onClick={async () => {
              const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
              });
              if (error) {
                alert('Login mislukt: ' + error.message);
              }
              // onLogin() verwijderd! useEffect doet het automatisch!
            }}
            className="w-full bg-[#FF6D00] text-white font-bold py-4 rounded-md hover:bg-[#e66200] transition-colors"
          >
            Inloggen
          </button>
        </div>

        <div className="relative py-6">
          <div className="absolute inset-0 flex items-center">
            <div className={`w-full border-t ${border}`}></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span
              className={`${
                isDarkMode ? 'bg-[#2C2C2C]' : 'bg-white'
              } px-2 ${textSecondary}`}
            >
              Of ga verder met
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={async () => {
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
              });
              if (error) console.error('Login error:', error);
            }}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-300 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Inloggen met Google
          </button>

          <button
            onClick={onLogin}
            className={`w-full flex items-center justify-center gap-3 ${
              isDarkMode
                ? 'bg-[#3E3E3E] text-white hover:bg-[#4E4E4E]'
                : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
            } font-bold py-4 rounded-md transition-colors`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74s2.57-.9 3.87-.75c.51.01 2.05.2 3 1.57-2.61 1.49-2.15 5.53.53 6.64-.52 1.54-1.32 3.05-2.48 4.77zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.16 2.29-2.04 4.14-3.74 4.25z" />
            </svg>
            Inloggen met Apple
          </button>
        </div>

        <div className={`mt-6 text-center text-xs ${textSecondary}`}>
          Nog geen account?{' '}
          <span className="text-[#FF6D00] font-bold cursor-pointer">
            Registreer hier
          </span>
        </div>
      </Card>
    </div>
  );
};

// --- New Case Modal ---
const NewCaseModal = ({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (c: Partial<Chargeback>) => void;
}) => {
  // ... (Code same as provided in full block)
  const { isDarkMode } = useContext(ThemeContext);
  if (!isOpen) return null;
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const handleSubmit = () => {
    onCreate({
      merchant,
      amount: parseFloat(amount),
      reason,
      currency: 'EUR',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      status: 'Open',
      workflowStep: '1st Chargeback',
      cardBrand: 'visa',
      evidence: [],
      reasonCode: 'N/A', // Default
      customer: {
        name: customerName || 'Onbekend',
        email: customerEmail || 'onbekend@example.com',
        phone: '-',
        ipAddress: '127.0.0.1',
        country: 'NL',
      },
    });
    onClose();
  };

  const bgMain = isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-50';
  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-[#A0A0A0]' : 'text-slate-500';
  const border = isDarkMode ? 'border-[#3E3E3E]' : 'border-slate-200';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 shadow-2xl">
        <h3 className={`text-xl font-bold ${textPrimary} mb-6`}>
          Nieuw Dossier
        </h3>
        <div className="space-y-4 mb-8">
          <div>
            <label
              className={`text-xs ${textSecondary} uppercase font-bold block mb-1`}
            >
              Transactie
            </label>
            <input
              placeholder="Merchant Naam"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className={`w-full ${bgMain} border ${border} rounded-md px-4 py-3 ${textPrimary} focus:border-[#FF6D00] outline-none mb-2`}
            />
            <input
              placeholder="Bedrag (EUR)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`w-full ${bgMain} border ${border} rounded-md px-4 py-3 ${textPrimary} focus:border-[#FF6D00] outline-none mb-2`}
            />
            <input
              placeholder="Reden voor dispute"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={`w-full ${bgMain} border ${border} rounded-md px-4 py-3 ${textPrimary} focus:border-[#FF6D00] outline-none`}
            />
          </div>
          <div>
            <label
              className={`text-xs ${textSecondary} uppercase font-bold block mb-1`}
            >
              Klant
            </label>
            <input
              placeholder="Klant Naam"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={`w-full ${bgMain} border ${border} rounded-md px-4 py-3 ${textPrimary} focus:border-[#FF6D00] outline-none mb-2`}
            />
            <input
              placeholder="Klant Email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className={`w-full ${bgMain} border ${border} rounded-md px-4 py-3 ${textPrimary} focus:border-[#FF6D00] outline-none`}
            />
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className={`flex-1 py-3 rounded-md font-bold ${textSecondary} hover:${textPrimary} hover:${
              isDarkMode ? 'bg-[#3E3E3E]' : 'bg-slate-200'
            } transition-colors`}
          >
            Annuleren
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-md font-bold bg-[#FF6D00] text-white hover:bg-[#e66200] transition-colors"
          >
            Aanmaken
          </button>
        </div>
      </Card>
    </div>
  );
};

const InviteModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const { isDarkMode } = useContext(ThemeContext);
  if (!isOpen) return null;

  const bgMain = isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-50';
  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-[#A0A0A0]' : 'text-slate-500';
  const border = isDarkMode ? 'border-[#3E3E3E]' : 'border-slate-200';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 shadow-2xl">
        <h3 className={`text-xl font-bold ${textPrimary} mb-2`}>
          Teamlid Uitnodigen
        </h3>
        <p className={`${textSecondary} text-sm mb-6`}>
          Stuur een uitnodiging per email.
        </p>
        <div className="space-y-4 mb-8">
          <input
            placeholder="Email adres"
            className={`w-full ${bgMain} border ${border} rounded-md px-4 py-3 ${textPrimary} focus:border-[#FF6D00] outline-none`}
          />
          <select
            className={`w-full ${bgMain} border ${border} rounded-md px-4 py-3 ${textPrimary} focus:border-[#FF6D00] outline-none`}
          >
            <option>Case Manager</option>
            <option>Admin</option>
            <option>Viewer</option>
          </select>
        </div>
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className={`flex-1 py-3 rounded-md font-bold ${textSecondary} hover:${textPrimary} hover:${
              isDarkMode ? 'bg-[#3E3E3E]' : 'bg-slate-200'
            } transition-colors`}
          >
            Annuleren
          </button>
          <button
            onClick={() => {
              alert('Uitnodiging verstuurd!');
              onClose();
            }}
            className="flex-1 py-3 rounded-md font-bold bg-[#FF6D00] text-white hover:bg-[#e66200] transition-colors"
          >
            Versturen
          </button>
        </div>
      </Card>
    </div>
  );
};

export default function ChargebackApp() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const [_isLoading, _setIsLoading] = useState(false);





  // Check auth status
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ... rest van je code

  // Styles helpers
  const bgMain = isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-50';
  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-[#A0A0A0]' : 'text-slate-500';
  const border = isDarkMode ? 'border-[#3E3E3E]' : 'border-slate-200';
  const sideBarBg = isDarkMode ? 'bg-[#2C2C2C]' : 'bg-white';
  const inputBg = isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-50';
  const positiveText = isDarkMode ? 'text-emerald-400' : 'text-emerald-600';

  const [activeTab, setActiveTab] = useState('dashboard');
  const [weroEnabled, setWeroEnabled] = useState(false);

  useEffect(() => {
    try {
      setWeroEnabled(localStorage.getItem('WERO_EDITION') === '1');
    } catch {}
  }, []);

  const [showConnectModal, setShowConnectModal] = useState(false);
  const [mockIntegrations, setMockIntegrations] = useState(INTEGRATIONS);
  const [_isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [_selectedCase, setSelectedCase] = useState<Chargeback | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [chargebacks, setChargebacks] = useState<any[]>([]);

  // Load chargebacks from Supabase
  // Load chargebacks from Supabase (single source of truth)
  useEffect(() => {
    const loadChargebacks = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log('AUTH USER AT LOAD:', user);

      if (!user) {
        console.log('No user session yet -> skipping chargebacks load');
        setChargebacks([]);
        return;
      }

      // === Stap 19-01: Dashboard read model RPC (console test) ===
      const now = new Date();
      const from = new Date();
      from.setDate(now.getDate() - 90);

      const { data: dash, error: dashErr } = await supabase.rpc(
        'dashboard_read_model',
        {
          p_bucket: 'day',
          p_from: from.toISOString(),
          p_to: now.toISOString(),
        }
      );

      if (dashErr) {
        console.error('DASHBOARD RPC ERROR:', dashErr);
      } else {
        console.log('DASHBOARD RPC:', dash);
        setDashboardData(dash);
      }

      const { data, error } = await supabase
        .from('chargebacks')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('CHARGEBACKS Response:', { data, error });

      if (error) {
        console.error('Error loading chargebacks:', error.message, error);
        setChargebacks([]);
        return;
      }

      const normalizeCardBrand = (v: any) => {
        const s = String(v ?? '')
          .toLowerCase()
          .trim();
        if (['visa', 'mastercard', 'amex', 'wero'].includes(s)) return s;
        return 'unknown';
      };

      const mappedData = (data ?? []).map((cb: any) => ({
        ...cb,
        dueDate: cb.due_date,
        cardBrand: normalizeCardBrand(cb.card_brand),
        customer: {
          name: cb.customer_name || 'Onbekend',
          email: cb.customer_email || 'onbekend@example.com',
          phone: '-',
          ipAddress: '127.0.0.1',
          country: cb.customer_country || 'NL',
          priorOrders: 0,
          ce3Eligible: false,
        },
        reasonCode: cb.reason_code || cb.reason,
        workflowStep: cb.workflow_step || '1st Chargeback',
        evidence: [],
      }));

      console.log('Setting mapped chargebacks:', mappedData.length);
      setChargebacks(mappedData);
    };

    if (isLoggedIn) {
      loadChargebacks();
    } else {
      setChargebacks([]);
    }
  }, [isLoggedIn]);

  // === Stap 19-03: log dashboard stats ===
  useEffect(() => {
    if (!dashboardData) return;

    const s = dashboardData?.stats || {};

    console.log('DASHBOARD STATS (MAPPED):', {
      total: s.total_chargebacks ?? 0,
      open: s.open_count ?? 0,
      won: s.won_count ?? 0,
      lost: s.lost_count ?? 0,
      winRatePct: s.win_rate_pct ?? 0,
      exposureEur: s.total_eur_exposure ?? 0,
    });
  }, [dashboardData]);

  const [disputeFilter, setDisputeFilter] = useState<'All' | ChargebackStatus>(
    'All'
  );
  const [searchQuery, _setSearchQuery] = useState('');

  // Calculate urgent cases (deadline < 72 hours)
  const urgentCases = chargebacks.filter((cb) => {
    const deadline = new Date(cb.dueDate);
    const now = new Date();
    const hoursRemaining =
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    console.log(
      'Checking urgent:',
      cb.merchant,
      'deadline:',
      cb.dueDate,
      'hours:',
      hoursRemaining
    ); // ← VOEG TOE

    return (
      hoursRemaining > 0 &&
      hoursRemaining <= 72 &&
      cb.status !== 'Won' &&
      cb.status !== 'Lost'
    );
  });

  const urgentCount = urgentCases.length;

  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Wero (Soon to come) UI
  const [_isWeroSoonOpen, _setIsWeroSoonOpen] = useState(false);

  // Other states
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [teamMembers, _setTeamMembers] = useState(INITIAL_TEAM_MEMBERS);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(
    null
  );

  // Settings Tab State
  const [settingsSubTab, setSettingsSubTab] = useState('profile');

  // Threshold settings
  const [autoAcceptThreshold, setAutoAcceptThreshold] = useState(15);

  // Define Handlers before use
  const handleOpenCase = (cb: Chargeback) => {
    setSelectedCase(cb);
    setIsCaseModalOpen(true);
  };

  const handleConnect = (id: string) => {
    const updated = mockIntegrations.map((int) =>
      int.id === id ? { ...int, status: 'connected' } : int
    );
    setMockIntegrations(updated);
    setShowConnectModal(false);
    setConnectingProvider(null);
  };

  const handleCreateCase = (newCase: Partial<Chargeback>) => {
    const created: Chargeback = {
      ...newCase,
      id: `CB-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
      status: 'Open',
      workflowStep: '1st Chargeback',
      cardBrand: 'visa',
      evidence: [],
      reasonCode: newCase.reasonCode || 'N/A',
      customer: newCase.customer || {
        name: 'Onbekend',
        email: 'onbekend@example.com',
        phone: '-',
        ipAddress: '127.0.0.1',
        country: 'NL',
        priorOrders: 0,
        ce3Eligible: false,
      },
    } as Chargeback;
    setChargebacks([created, ...chargebacks]);
  };

  const filteredChargebacks = chargebacks.filter((cb) => {
    const matchesFilter =
      disputeFilter === 'All' || cb.status === disputeFilter;
    const matchesSearch =
      cb.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cb.merchant.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {isLoggedIn ? (
        <div
          className={`flex min-h-screen ${bgMain} ${textPrimary} font-sans transition-colors duration-300`}
          onClick={() => setShowNotifications(false)}
        >
          <NewCaseModal
            isOpen={isNewCaseModalOpen}
            onClose={() => setIsNewCaseModalOpen(false)}
            onCreate={handleCreateCase}
          />
          <InviteModal
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
          />
          {/* Mobile Menu Backdrop */}
          {isMobileMenuOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
          {/* Sidebar (Responsive - Desktop Fixed / Mobile Slide) */}
          <aside
            className={`w-72 flex-shrink-0 z-50 flex flex-col ${sideBarBg} border-r ${border} h-screen sticky top-0
  md:flex
  ${
    isMobileMenuOpen
      ? 'fixed inset-y-0 left-0 translate-x-0 shadow-2xl'
      : 'hidden'
  }
`}
          >
            <div className="p-8 flex items-center gap-4">
              <div className="w-10 h-10 bg-[#FF6D00] rounded flex items-center justify-center shadow-lg">
                <ShieldAlert className="text-white w-5 h-5" />
              </div>
              <div>
                <span
                  className={`font-bold text-lg ${textPrimary} tracking-tight block`}
                >
                  Dispute Defence
                </span>
                <span
                  className={`text-[10px] ${textSecondary} uppercase tracking-widest font-bold`}
                >
                  Dashboard
                </span>
              </div>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2">
              {[
                { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                { id: 'disputes', icon: Briefcase, label: 'Dossiers' },
                { id: 'integrations', icon: CreditCard, label: 'Integraties' },
                { id: 'team', icon: Users, label: 'Team' },
                { id: 'reports', icon: BarChart3, label: 'Rapportage' },
                {
                  id: 'calculator',
                  icon: Calculator,
                  label: 'Bespaar Calculator',
                },
                { id: 'settings', icon: Settings, label: 'Instellingen' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-6 py-4 rounded-md text-sm font-bold transition-all duration-300 group ${
                    activeTab === item.id
                      ? `bg-${
                          isDarkMode ? '[#1E1E1E]' : 'slate-100'
                        } text-[#FF6D00] border-l-4 border-[#FF6D00]`
                      : `${textSecondary} hover:${textPrimary} hover:${
                          isDarkMode ? 'bg-[#3E3E3E]' : 'bg-slate-100'
                        }`
                  }`}
                >
                  <item.icon
                    size={20}
                    className={`transition-transform group-hover:scale-110 ${
                      activeTab === item.id ? 'text-[#FF6D00]' : ''
                    }`}
                  />
                  {item.label}
                  {activeTab === item.id && (
                    <ChevronRight
                      size={14}
                      className="ml-auto text-[#FF6D00]"
                    />
                  )}
                </button>
              ))}
            </nav>
            <div className="px-4 pb-4">
              <div
                className={`flex items-center gap-4 px-6 py-4 rounded-md text-sm font-bold opacity-50 cursor-not-allowed ${textSecondary}`}
                title="Wero Edition komt binnenkort"
              >
                <ShieldAlert size={20} />
                Wero Edition (Soon)
              </div>
            </div>

            {/* Quick Dark Mode Toggle in Sidebar Footer */}
            <div className="px-6 pb-2">
              <button
                onClick={toggleTheme}
                className={`w-full flex items-center justify-between p-3 rounded-md border ${border} ${textSecondary} hover:${textPrimary} hover:${
                  isDarkMode ? 'bg-[#3E3E3E]' : 'bg-slate-100'
                } transition-colors text-xs font-bold uppercase tracking-wider`}
              >
                <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
                {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
              </button>
            </div>

            <div className="p-6">
              <div
                className={`p-4 flex items-center gap-3 ${
                  isDarkMode
                    ? 'bg-[#1E1E1E] hover:bg-[#3E3E3E]'
                    : 'bg-slate-50 hover:bg-slate-100'
                } rounded-md border ${border} cursor-pointer transition-colors`}
              >
                <div className="w-10 h-10 rounded-full bg-[#FF6D00] flex items-center justify-center text-xs font-bold text-white shadow-lg">
                  JD
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className={`text-sm font-bold ${textPrimary} truncate`}>
                    Jan de Vries
                  </p>
                  <p className={`text-xs ${textSecondary} truncate`}>Admin</p>
                </div>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await supabase.auth.signOut();
                    setIsLoggedIn(false);
                  }}
                  className={`${textSecondary} hover:${textPrimary}`}
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </aside>
          {/* Main Content */}
          <main className="flex-1 min-w-0 p-4 md:p-8 min-h-screen overflow-y-auto relative z-10">
            <div className="max-w-[1920px] mx-auto">
              <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 relative gap-6">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className={`md:hidden p-2 ${textSecondary} hover:${textPrimary} ${sideBarBg} rounded-md border ${border}`}
                  >
                    <Menu size={24} />
                  </button>
                  <div>
                    <h1
                      className={`text-2xl md:text-3xl font-bold ${textPrimary} tracking-tight mb-2`}
                    >
                      {activeTab === 'dashboard' && 'Overzicht'}
                      {activeTab === 'disputes' && 'Dossier Beheer'}
                      {activeTab === 'team' && 'Team & Audit'}
                      {activeTab === 'reports' && 'Rapportages'}
                      {activeTab === 'integrations' && 'Integraties'}
                      {activeTab === 'settings' && 'Instellingen'}
                      {activeTab === 'calculator' && 'Bespaar Calculator'}
                      {activeTab === 'wero' && 'Wero Edition'}
                    </h1>
                    <p className={`${textSecondary} text-sm hidden md:block`}>
                      {activeTab === 'dashboard' &&
                        'Real-time status van uw chargeback portfolio.'}
                      {activeTab === 'disputes' &&
                        'Beheer en reageer op geschillen met AI.'}
                      {activeTab === 'calculator' &&
                        'Bereken uw potentiële besparing met onze software.'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 w-full md:w-auto justify-end">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowNotifications(!showNotifications);
                      }}
                      className={`relative p-3 ${textSecondary} hover:${textPrimary} transition-colors ${sideBarBg} rounded-md border ${border} hover:border-[#FF6D00]`}
                    >
                      <Bell size={20} />
                      <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#FF6D00] rounded-full border-2 border-[#2C2C2C] animate-pulse"></span>
                    </button>
                    {showNotifications && (
                      <div
                        className={`absolute right-0 mt-2 w-80 ${sideBarBg} border ${border} rounded-md shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-200`}
                      >
                        <p
                          className={`px-4 py-2 text-xs font-bold ${textSecondary} uppercase`}
                        >
                          Meldingen
                        </p>
                        <div className="space-y-1">
                          <div
                            className={`p-3 hover:${
                              isDarkMode ? 'bg-[#3E3E3E]' : 'bg-slate-100'
                            } rounded-md cursor-pointer transition-colors`}
                          >
                            <p className={`text-sm ${textPrimary} font-bold`}>
                              Nieuw Dossier
                            </p>
                            <p className={`text-xs ${textSecondary}`}>
                              Stripe heeft chargeback #9283 gemeld.
                            </p>
                          </div>
                          <div
                            className={`p-3 hover:${
                              isDarkMode ? 'bg-[#3E3E3E]' : 'bg-slate-100'
                            } rounded-md cursor-pointer transition-colors`}
                          >
                            <p className={`text-sm ${textPrimary} font-bold`}>
                              Deadline Waarschuwing
                            </p>
                            <p className={`text-xs ${textSecondary}`}>
                              Case CB-2024-001 verloopt over 2 dagen.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Urgent Cases Warning */}
                  {urgentCount > 0 && (
                    <button
                      onClick={() => setActiveTab('disputes')}
                      className="relative p-3 hover:bg-red-900/30 rounded-lg transition-colors shake-on-hover group"
                    >
                      <svg
                        className="w-5 h-5 text-red-500 pulse-red"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2L2 20h20L12 2zm0 4l7 12H5l7-12zm-1 5v4h2v-4h-2zm0 5v2h2v-2h-2z" />
                      </svg>
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center pulse-red">
                        {urgentCount}
                      </span>

                      {/* Tooltip */}
                      <div className="absolute right-0 top-12 bg-red-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-red-700 z-50">
                        {urgentCount} {urgentCount === 1 ? 'case' : 'cases'} met
                        deadline &lt; 72 uur!
                      </div>
                    </button>
                  )}
                  <button
                    onClick={() => setIsNewCaseModalOpen(true)}
                    className="bg-[#FF6D00] hover:bg-[#e66200] text-white px-4 md:px-6 py-3 rounded-md text-sm font-bold shadow-lg flex items-center gap-2 transition-transform hover:scale-105 whitespace-nowrap"
                  >
                    <Plus size={18} />
                    <span className="hidden sm:inline">Nieuw Dossier</span>
                    <span className="sm:hidden">Nieuw</span>
                  </button>
                </div>
              </header>
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  {/* Urgent Cases Alert Card */}
                  {urgentCount > 0 && (
                    <div className="bg-gradient-to-r from-red-900/40 to-red-800/20 border-2 border-red-500 rounded-lg p-3 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full -mr-12 -mt-12"></div>
                      <div className="relative flex items-center gap-3">
                        <div className="bg-red-600 p-1.5 rounded-lg pulse-red">
                          <svg
                            className="w-5 h-5 text-white"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2L2 20h20L12 2zm0 4l7 12H5l7-12zm-1 5v4h2v-4h-2zm0 5v2h2v-2h-2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-bold text-red-400">
                            ⚠️ URGENTE CASES
                          </h3>
                          <p className="text-gray-300 text-xs">
                            <span className="text-lg font-bold text-white">
                              {urgentCount}{' '}
                              {urgentCount === 1 ? 'case' : 'cases'}
                            </span>{' '}
                            met deadline &lt; 72 uur vereisen actie
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setActiveTab('disputes')}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-2 text-xs"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              ></path>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              ></path>
                            </svg>
                            Bekijk Urgente Cases
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 1. Alerts Section (Prevention) */}
                  <div className="grid grid-cols-1 gap-6">
                    <div
                      className={`p-4 rounded-lg border border-purple-500/30 bg-purple-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/20 rounded-full text-purple-400">
                          <Radar size={24} />
                        </div>
                        <div>
                          <h3 className={`font-bold ${textPrimary} text-lg`}>
                            Ethoca Alerts Actief
                          </h3>
                          <p className={`text-sm ${textSecondary}`}>
                            2 potentiële chargebacks voorkomen in de laatste
                            24u.
                          </p>
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-md text-sm font-bold transition-colors">
                        Bekijk Alerts
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {[
                      {
                        label: 'Betwist Bedrag',
                        value: '€ 18.250',
                        trend: '+12%',
                        trendUp: false,
                        sub: 'openstaand',
                      },
                      {
                        label: 'Win Rate',
                        value: '72%',
                        trend: '+4.5%',
                        trendUp: true,
                        sub: 'vs vorige maand',
                        valueColor: positiveText,
                      },
                      {
                        label: 'Geredde Omzet',
                        value: '€ 28.450',
                        trend: '+35%',
                        trendUp: true,
                        sub: 'totaal gered',
                        valueColor: positiveText,
                      },
                      {
                        label: 'Actie Vereist',
                        value: '2',
                        trend: 'Dringend',
                        trendUp: false,
                        sub: '< 48u deadline',
                        urgent: true,
                        valueColor: 'text-red-500',
                      },
                    ].map((stat, i) => (
                      <Card
                        key={i}
                        className={`p-6 relative overflow-hidden group hover:shadow-md transition-all ${
                          stat.urgent ? 'border-l-4 border-l-red-500' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4 relative z-10">
                          <p
                            className={`text-xs font-bold uppercase tracking-wider ${
                              stat.urgent ? 'text-red-400' : textSecondary
                            }`}
                          >
                            {stat.label}
                          </p>
                          {!stat.urgent && (
                            <span
                              className={`flex items-center text-[10px] font-bold px-2 py-1 rounded ${
                                stat.trendUp
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-red-500/10 text-red-400'
                              }`}
                            >
                              {stat.trendUp ? (
                                <ArrowUpRight size={10} className="mr-1" />
                              ) : (
                                <ArrowDownRight size={10} className="mr-1" />
                              )}
                              {stat.trend}
                            </span>
                          )}
                        </div>
                        <h3
                          className={`text-3xl md:text-4xl font-black mb-1 tracking-tight ${
                            stat.valueColor || textPrimary
                          }`}
                        >
                          {stat.value}
                        </h3>
                        <p className={`${textSecondary} text-xs font-medium`}>
                          {stat.sub}
                        </p>
                      </Card>
                    ))}
                  </div>

                  {/* Dashboard Table (Code same as before) */}
                  <Card className="overflow-hidden">
                    {/* ... (Table content same as previous version) ... */}
                    <div
                      className={`p-6 md:p-8 border-b ${border} flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}
                    >
                      <h3 className={`font-bold ${textPrimary} text-lg`}>
                        Openstaande Dossiers
                      </h3>
                      <div className="flex gap-4 w-full md:w-auto">
                        <div className="relative group flex-1 md:flex-none">
                          <Search
                            size={16}
                            className={`absolute left-4 top-1/2 -translate-y-1/2 ${textSecondary} group-focus-within:text-[#FF6D00] transition-colors`}
                          />
                          <input
                            type="text"
                            placeholder="Zoeken..."
                            className={`${inputBg} border ${border} rounded-md pl-10 pr-6 py-2.5 text-sm ${textPrimary} focus:outline-none focus:border-[#FF6D00] focus:ring-1 focus:ring-[#FF6D00] transition-all w-full md:w-64`}
                          />
                        </div>
                        <button
                          onClick={() => setActiveTab('disputes')}
                          className={`${textSecondary} text-sm hover:${textPrimary} font-medium flex items-center gap-2 px-4 py-2 hover:${
                            isDarkMode ? 'bg-[#3E3E3E]' : 'bg-slate-100'
                          } rounded-md transition-colors whitespace-nowrap`}
                        >
                          Alles <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead
                          className={`${
                            isDarkMode ? 'bg-[#2C2C2C]' : 'bg-slate-100'
                          } ${textSecondary} font-bold uppercase text-[10px] tracking-wider border-b ${border}`}
                        >
                          <tr>
                            <th className="px-6 py-4 md:px-8 md:py-5">
                              Status
                            </th>
                            <th className="px-6 py-4 md:px-8 md:py-5">
                              Dossier / Klant
                            </th>
                            <th className="px-6 py-4 md:px-8 md:py-5 hidden md:table-cell">
                              Bedrag
                            </th>
                            <th className="px-6 py-4 md:px-8 md:py-5">
                              Deadline
                            </th>
                            <th className="px-6 py-4 md:px-8 md:py-5 hidden md:table-cell">
                              Fase
                            </th>
                            <th className="px-6 py-4 md:px-8 md:py-5 text-right"></th>
                          </tr>
                        </thead>
                        <tbody
                          className={`divide-y ${
                            isDarkMode ? 'divide-[#3E3E3E]' : 'divide-slate-200'
                          }`}
                        >
                          {chargebacks
                            .filter(
                              (c) =>
                                c.status === 'Open' || c.status === 'Pending'
                            )
                            .map((item) => (
                              <tr
                                key={item.id}
                                className={`hover:${
                                  isDarkMode ? 'bg-[#3E3E3E]' : 'bg-slate-50'
                                } transition-colors group cursor-pointer`}
                                onClick={() => handleOpenCase(item)}
                              >
                                <td className="px-6 py-4 md:px-8 md:py-5">
                                  <StatusBadge status={item.status} />
                                </td>
                                <td className="px-6 py-4 md:px-8 md:py-5">
                                  <div className="flex flex-col">
                                    <span
                                      className={`font-bold ${textPrimary} text-base`}
                                    >
                                      {item.merchant}
                                    </span>
                                    <span
                                      className={`${textSecondary} text-xs mt-0.5 font-mono`}
                                    >
                                      {item.id}
                                    </span>
                                    <span
                                      className={`${textPrimary} font-bold text-xs md:hidden mt-1`}
                                    >
                                      {item.currency} {item.amount.toFixed(2)}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 md:px-8 md:py-5 hidden md:table-cell">
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`${textPrimary} font-bold`}
                                    >
                                      {item.currency} {item.amount.toFixed(2)}
                                    </span>
                                    <CardBrand brand={item.cardBrand} />
                                  </div>
                                </td>
                                <td className="px-6 py-4 md:px-8 md:py-5">
                                  <DeadlineTimer
                                    dueDate={item.dueDate}
                                    status={item.status}
                                  />
                                </td>
                                <td className="px-6 py-4 md:px-8 md:py-5 hidden md:table-cell">
                                  <span
                                    className={`text-[10px] ${textSecondary} uppercase font-bold tracking-wider px-2 py-1 border ${border} rounded`}
                                  >
                                    {item.workflowStep}
                                  </span>
                                </td>
                                <td className="px-6 py-4 md:px-8 md:py-5 text-right">
                                  <button
                                    className={`${textSecondary} group-hover:${textPrimary} p-2 rounded-full hover:${
                                      isDarkMode
                                        ? 'bg-[#1E1E1E]'
                                        : 'bg-slate-200'
                                    } transition-colors`}
                                  >
                                    <ChevronRight size={20} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}
              {/* ... other views are similar ... */}
              {/* --- VIEW: WERO --- */}
              {activeTab === 'wero' && (
                <div className="space-y-6">
                  <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
                    <div className="font-bold mb-1">Wero Edition</div>
                    <div className="text-sm opacity-80">
                      Deze functionaliteit wordt binnenkort geactiveerd.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-lg border border-white/10 p-4">
                      <div className="text-sm opacity-60">Auto-wins</div>
                      <div className="text-2xl font-bold">—</div>
                      <div className="text-xs opacity-50">Soon to come</div>
                    </div>

                    <div className="rounded-lg border border-white/10 p-4">
                      <div className="text-sm opacity-60">
                        Recovered revenue
                      </div>
                      <div className="text-2xl font-bold">—</div>
                      <div className="text-xs opacity-50">Soon to come</div>
                    </div>

                    <div className="rounded-lg border border-white/10 p-4">
                      <div className="text-sm opacity-60">
                        Deadline prevention
                      </div>
                      <div className="text-2xl font-bold">—</div>
                      <div className="text-xs opacity-50">Soon to come</div>
                    </div>
                  </div>
                </div>
              )}

              {/* --- VIEW: DISPUTES --- */}
              {activeTab === 'disputes' && (
                <div className="space-y-6">
                  {weroEnabled && (
                    <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
                      <div className="font-bold mb-1">
                        Wero Deadline Warning (Soon)
                      </div>
                      <div className="text-sm opacity-80">
                        Automatische deadline-detectie en escalaties komen
                        binnenkort.
                      </div>
                    </div>
                  )}

                  <Card className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div
                      className={`flex ${
                        isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-100'
                      } p-1.5 rounded-md border ${border} w-full md:w-auto overflow-x-auto no-scrollbar`}
                    >
                      {['All', 'Open', 'Pending', 'Won', 'Lost'].map(
                        (status) => (
                          <button
                            key={status}
                            onClick={() => setDisputeFilter(status as any)}
                            className={`px-4 md:px-6 py-2.5 rounded-md text-sm font-bold transition-all whitespace-nowrap flex-1 md:flex-none ${
                              disputeFilter === status
                                ? `${
                                    isDarkMode ? 'bg-[#3E3E3E]' : 'bg-white'
                                  } ${textPrimary} shadow-sm`
                                : `${textSecondary} hover:${textPrimary} hover:${
                                    isDarkMode ? 'bg-[#3E3E3E]' : 'bg-white'
                                  }`
                            }`}
                          >
                            {status === 'All' ? 'Alles' : status}
                          </button>
                        )
                      )}
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                      <button
                        onClick={() => alert('Filter paneel opent hier...')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 ${
                          isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-100'
                        } ${textSecondary} border ${border} rounded-md hover:${textPrimary} hover:${
                          isDarkMode ? 'bg-[#3E3E3E]' : 'bg-slate-200'
                        } transition-colors text-sm font-medium`}
                      >
                        <Filter size={16} /> Filters
                      </button>
                      <button
                        onClick={() => alert('CSV Download gestart...')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 ${
                          isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-100'
                        } ${textSecondary} border ${border} rounded-md hover:${textPrimary} hover:${
                          isDarkMode ? 'bg-[#3E3E3E]' : 'bg-slate-200'
                        } transition-colors text-sm font-medium`}
                      >
                        <Download size={16} /> Export
                      </button>
                    </div>
                  </Card>

                  <Card className="overflow-hidden">
                    <div className="overflow-x-auto min-h-[500px]">
                      <table className="w-full text-sm text-left">
                        <thead
                          className={`${
                            isDarkMode ? 'bg-[#2C2C2C]' : 'bg-slate-100'
                          } ${textSecondary} font-bold uppercase text-[10px] tracking-wider border-b ${border}`}
                        >
                          <tr>
                            <th className="px-2 py-4 w-8"></th>
                            <th className="px-6 py-4 md:px-8 md:py-5 w-10">
                              <Square size={16} />
                            </th>
                            <th className="px-6 py-4 md:px-8 md:py-5">
                              Status & ID
                            </th>
                            <th className="px-6 py-4 md:px-8 md:py-5">
                              Klant & Datum
                            </th>
                            <th className="px-6 py-4 md:px-8 md:py-5 hidden md:table-cell">
                              Financieel
                            </th>
                            <th className="px-6 py-4 md:px-8 md:py-5 hidden md:table-cell">
                              Reden
                            </th>
                            <th className="px-6 py-4 md:px-8 md:py-5">
                              Deadline
                            </th>
                            <th className="px-6 py-4 md:px-8 md:py-5 text-right"></th>
                          </tr>
                        </thead>
                        <tbody
                          className={`divide-y ${
                            isDarkMode ? 'divide-[#3E3E3E]' : 'divide-slate-200'
                          }`}
                        >
                          {filteredChargebacks.map((item) => (
                            <tr
                              key={item.id}
                              className={`hover:${
                                isDarkMode ? 'bg-[#3E3E3E]' : 'bg-slate-50'
                              } transition-colors group cursor-pointer ${
                                urgentCases.some((uc) => uc.id === item.id)
                                  ? 'bg-gradient-to-r from-red-900/30 to-transparent border-l-4 border-l-red-500'
                                  : ''
                              }`}
                              onClick={() => handleOpenCase(item)}
                            >
                              {/* Urgent Warning Icon */}
                              <td className="px-2 py-4">
                                {urgentCases.some((uc) => uc.id === item.id) ? (
                                  <svg
                                    className="w-5 h-5 text-red-500 pulse-red"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M12 2L2 20h20L12 2zm0 4l7 12H5l7-12zm-1 5v4h2v-4h-2zm0 5v2h2v-2h-2z" />
                                  </svg>
                                ) : (
                                  <div className="w-5 h-5"></div>
                                )}
                              </td>
                              <td
                                className="px-6 py-4 md:px-8 md:py-5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div
                                  className={`${textSecondary} hover:text-[#FF6D00] cursor-pointer`}
                                >
                                  <Square size={16} />
                                </div>
                              </td>
                              <td className="px-6 py-4 md:px-8 md:py-5">
                                <div className="flex flex-col gap-2">
                                  <StatusBadge status={item.status} />
                                  <span
                                    className={`${textSecondary} text-xs font-mono`}
                                  >
                                    {item.id}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 md:px-8 md:py-5">
                                <div className="flex flex-col">
                                  <span className={`font-bold ${textPrimary}`}>
                                    {item.merchant}
                                  </span>
                                  <span
                                    className={`${textSecondary} text-xs mt-0.5`}
                                  >
                                    {item.customer.name}
                                  </span>
                                  <span
                                    className={`${textSecondary} text-xs mt-0.5`}
                                  >
                                    {item.date}
                                  </span>
                                  <span
                                    className={`${textPrimary} font-bold text-xs md:hidden mt-1`}
                                  >
                                    {item.currency} {item.amount.toFixed(2)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 md:px-8 md:py-5 hidden md:table-cell">
                                <div className="flex items-center gap-3">
                                  <span className={`${textPrimary} font-bold`}>
                                    {item.currency} {item.amount.toFixed(2)}
                                  </span>
                                  <CardBrand brand={item.cardBrand} />
                                </div>
                              </td>
                              <td className="px-6 py-4 md:px-8 md:py-5 hidden md:table-cell">
                                <span
                                  className={`${textSecondary} font-medium`}
                                >
                                  {item.reason}
                                </span>
                              </td>
                              <td className="px-6 py-4 md:px-8 md:py-5">
                                <DeadlineTimer
                                  dueDate={item.dueDate}
                                  status={item.status}
                                />
                              </td>
                              <td className="px-6 py-4 md:px-8 md:py-5 text-right">
                                <button
                                  className={`px-4 py-2 text-xs font-bold ${
                                    isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-200'
                                  } hover:bg-white text-white hover:text-black rounded-md transition-all`}
                                >
                                  Beheer
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}
              {/* --- VIEW: TEAM --- */}
              {activeTab === 'team' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <Card className="lg:col-span-2 p-6 md:p-8">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className={`text-xl font-bold ${textPrimary}`}>
                        Team Leden
                      </h3>
                      <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className={`bg-white text-black px-4 py-2 rounded-md text-sm font-bold hover:bg-zinc-200 transition-colors`}
                      >
                        + Uitnodigen
                      </button>
                    </div>
                    <div className="space-y-4">
                      {teamMembers.map((m) => (
                        <div
                          key={m.id}
                          className={`flex items-center justify-between p-4 ${
                            isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-50'
                          } rounded-lg border ${border}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-[#FF6D00] flex items-center justify-center font-bold text-white text-xs">
                              {m.name.charAt(0)}
                            </div>
                            <div>
                              <p className={`${textPrimary} font-bold text-sm`}>
                                {m.name}
                              </p>
                              <p className={`${textSecondary} text-xs`}>
                                {m.email}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-[#FF6D00] bg-[#FF6D00]/10 px-3 py-1 rounded-full border border-[#FF6D00]/20">
                            {m.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <div className="space-y-6">
                    <Card className="p-6 border-l-4 border-l-[#FF6D00]">
                      <h3 className={`font-bold ${textPrimary} mb-2`}>
                        Pro Tip
                      </h3>
                      <p className={`${textSecondary} text-sm leading-relaxed`}>
                        Gebruik "Viewer" rollen voor externe accountants. Ze
                        kunnen rapporten zien maar geen acties uitvoeren.
                      </p>
                    </Card>
                  </div>
                </div>
              )}
              {/* --- VIEW: INTEGRATIONS (Restored) --- */}
              {activeTab === 'integrations' && (
                <div className="space-y-6">
                  <Card className="p-6">
                    <h2 className={`text-2xl font-bold ${textPrimary} mb-4`}>
                      Payment Providers
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {mockIntegrations.map((integration) => (
                        <div
                          key={integration.id}
                          className={`${
                            isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-50'
                          } border ${border} p-6 rounded-lg relative group hover:border-[#FF6D00] transition-all`}
                        >
                          <div className="absolute top-6 right-6">
                            {integration.status === 'connected' ? (
                              <span className="flex items-center text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                                <CheckCircle2 size={12} className="mr-1" />{' '}
                                Actief
                              </span>
                            ) : (
                              <span
                                className={`flex items-center text-xs font-bold ${textSecondary} ${
                                  isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'
                                } px-2 py-1 rounded`}
                              >
                                Niet verbonden
                              </span>
                            )}
                          </div>

                          <div
                            className={`w-12 h-12 ${
                              isDarkMode ? 'bg-white' : 'bg-slate-200'
                            } rounded-lg flex items-center justify-center text-xl font-bold text-zinc-900 mb-4 shadow-sm`}
                          >
                            {integration.logo}
                          </div>

                          <h3
                            className={`text-lg font-bold ${textPrimary} mb-2`}
                          >
                            {integration.name}
                          </h3>
                          <p className={`${textSecondary} text-sm mb-6`}>
                            Importeer disputes en chargebacks direct vanuit{' '}
                            {integration.name}.
                          </p>

                          <button
                            onClick={() => {
                              if (integration.status !== 'connected') {
                                setConnectingProvider(integration.id);
                                setShowConnectModal(true);
                              }
                            }}
                            disabled={integration.status === 'connected'}
                            className={`w-full py-2 px-4 rounded-md font-medium text-sm transition-colors border ${
                              integration.status === 'connected'
                                ? `${
                                    isDarkMode
                                      ? 'bg-zinc-800 text-zinc-500 border-zinc-700'
                                      : 'bg-slate-200 text-slate-400 border-slate-300'
                                  } cursor-default`
                                : 'bg-[#FF6D00] text-white border-transparent hover:bg-[#e66200]'
                            }`}
                          >
                            {integration.status === 'connected'
                              ? 'Geconfigureerd'
                              : 'Verbinden'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}
              {/* --- VIEW: REPORTS (Restored) --- */}
              {activeTab === 'reports' && (
                <div className="space-y-6">
                  {/* ... (Existing reports code) ... */}
                  <div
                    className={`flex justify-between items-center ${
                      isDarkMode ? 'bg-[#2C2C2C]' : 'bg-white'
                    } p-4 rounded-lg border ${border}`}
                  >
                    <h3 className={`text-lg font-bold ${textPrimary}`}>
                      Rapportage Januari 2024
                    </h3>
                    <button
                      onClick={() => alert('Download gestart')}
                      className={`flex items-center gap-2 ${
                        isDarkMode
                          ? 'bg-[#1E1E1E] hover:bg-[#3E3E3E]'
                          : 'bg-slate-100 hover:bg-slate-200'
                      } ${textPrimary} px-4 py-2 rounded-md text-sm transition-colors border ${border}`}
                    >
                      <Download size={16} /> Exporteer CSV
                    </button>
                  </div>

                  {/* ROOT CAUSE ANALYSIS SECTION (NEW) */}
                  <h3 className={`text-xl font-bold ${textPrimary} mt-8 mb-4`}>
                    Oorzaken Analyse (Root Cause)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6">
                      <h4
                        className={`${textSecondary} text-sm font-bold mb-4 flex items-center gap-2`}
                      >
                        <Truck size={16} /> Top Vervoerders (Niet Geleverd)
                      </h4>
                      <div className="space-y-3">
                        {[
                          {
                            name: 'DHL',
                            count: 12,
                            pct: 45,
                            color: 'bg-yellow-500',
                          },
                          {
                            name: 'PostNL',
                            count: 8,
                            pct: 30,
                            color: 'bg-orange-500',
                          },
                          {
                            name: 'UPS',
                            count: 4,
                            pct: 15,
                            color: 'bg-amber-700',
                          },
                        ].map((c, i) => (
                          <div key={i}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className={textPrimary}>{c.name}</span>
                              <span className={textSecondary}>
                                {c.count} cases
                              </span>
                            </div>
                            <div
                              className={`w-full ${
                                isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'
                              } h-2 rounded-full overflow-hidden`}
                            >
                              <div
                                className={`h-full ${c.color}`}
                                style={{ width: `${c.pct}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                    <Card className="p-6">
                      <h4
                        className={`${textSecondary} text-sm font-bold mb-4 flex items-center gap-2`}
                      >
                        <ShoppingBag size={16} /> Top Producten (Defect)
                      </h4>
                      <div className="space-y-3">
                        {[
                          {
                            name: 'iPhone 15 Pro',
                            count: 8,
                            pct: 60,
                            color: 'bg-red-500',
                          },
                          {
                            name: 'AirPods Max',
                            count: 3,
                            pct: 25,
                            color: 'bg-red-400',
                          },
                          {
                            name: 'Samsung S24',
                            count: 2,
                            pct: 15,
                            color: 'bg-red-300',
                          },
                        ].map((p, i) => (
                          <div key={i}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className={textPrimary}>{p.name}</span>
                              <span className={textSecondary}>
                                {p.count} cases
                              </span>
                            </div>
                            <div
                              className={`w-full ${
                                isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'
                              } h-2 rounded-full overflow-hidden`}
                            >
                              <div
                                className={`h-full ${p.color}`}
                                style={{ width: `${p.pct}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                    <Card className="p-6">
                      <h4
                        className={`${textSecondary} text-sm font-bold mb-4 flex items-center gap-2`}
                      >
                        <Activity size={16} /> Health Score
                      </h4>
                      <div className="flex flex-col items-center justify-center h-full pb-4">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          <svg className="w-full h-full" viewBox="0 0 36 36">
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke={isDarkMode ? '#3E3E3E' : '#e2e8f0'}
                              strokeWidth="3"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
                              fill="none"
                              stroke="#10b981"
                              strokeWidth="3"
                              strokeDasharray="68, 100"
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center">
                            <span
                              className={`text-2xl font-black ${textPrimary}`}
                            >
                              0.6%
                            </span>
                            <span className="text-[10px] text-emerald-500 font-bold">
                              VEILIG
                            </span>
                          </div>
                        </div>
                        <p
                          className={`text-xs ${textSecondary} text-center mt-2`}
                        >
                          Uw chargeback ratio is gezond (&lt;0.9%).
                        </p>
                      </div>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* ... (Existing cards for Reason Code & Win Rate) ... */}
                    <Card className="p-6">
                      <h4 className={`${textSecondary} text-sm font-bold mb-6`}>
                        Chargebacks per Reden Code
                      </h4>
                      <div className="space-y-4">
                        {[
                          {
                            label: 'Fraud (10.4)',
                            pct: 45,
                            color: 'bg-red-500',
                          },
                          {
                            label: 'Product not received (13.1)',
                            pct: 30,
                            color: 'bg-orange-500',
                          },
                          {
                            label: 'Not as described (13.3)',
                            pct: 15,
                            color: 'bg-yellow-500',
                          },
                          { label: 'Overig', pct: 10, color: 'bg-zinc-600' },
                        ].map((item, i) => (
                          <div key={i}>
                            <div
                              className={`flex justify-between text-xs ${textSecondary} mb-1`}
                            >
                              <span>{item.label}</span>
                              <span>{item.pct}%</span>
                            </div>
                            <div
                              className={`w-full ${
                                isDarkMode ? 'bg-zinc-800' : 'bg-slate-200'
                              } rounded-full h-2`}
                            >
                              <div
                                className={`h-2 rounded-full ${item.color}`}
                                style={{ width: `${item.pct}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h4 className={`${textSecondary} text-sm font-bold mb-6`}>
                        Win Rate vs Industrie Gemiddelde
                      </h4>
                      <div
                        className={`flex items-end justify-around h-[200px] border-b ${border} pb-2`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 bg-zinc-700 rounded-t h-[100px] relative group">
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-zinc-400 opacity-0 group-hover:opacity-100">
                              45%
                            </span>
                          </div>
                          <span className="text-xs text-zinc-500">
                            Industrie
                          </span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 bg-emerald-500 rounded-t h-[150px] relative group shadow-sm">
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-emerald-400 font-bold opacity-0 group-hover:opacity-100">
                              68%
                            </span>
                          </div>
                          <span className={`text-xs ${textPrimary} font-bold`}>
                            Dispute Defence
                          </span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}
              {activeTab === 'calculator' && <ROICalculator />}
              {/* --- VIEW: SETTINGS --- */}
              {activeTab === 'settings' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Sub-Navigation */}
                  <Card className="col-span-1 p-4 h-fit">
                    <nav className="space-y-1">
                      {[
                        { id: 'profile', label: 'Profiel', icon: User },
                        {
                          id: 'notifications',
                          label: 'Notificaties',
                          icon: Bell,
                        },
                        {
                          id: 'automation',
                          label: 'Automatisering',
                          icon: Zap,
                        }, // New
                        { id: 'company', label: 'Bedrijf', icon: Building },
                        {
                          id: 'billing',
                          label: 'Abonnement',
                          icon: CreditCard,
                        },
                        { id: 'security', label: 'Beveiliging', icon: Lock },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSettingsSubTab(item.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                            settingsSubTab === item.id
                              ? `bg-${
                                  isDarkMode ? '[#1E1E1E]' : 'slate-100'
                                } text-[#FF6D00] border-l-4 border-[#FF6D00]`
                              : `${textSecondary} hover:${textPrimary} hover:${
                                  isDarkMode ? 'bg-[#3E3E3E]' : 'bg-slate-100'
                                }`
                          }`}
                        >
                          <item.icon size={18} />
                          {item.label}
                        </button>
                      ))}
                    </nav>
                  </Card>

                  {/* Settings Content */}
                  <Card className="col-span-1 lg:col-span-3 p-8">
                    {/* Profile, Notifications... same as before */}
                    {settingsSubTab === 'profile' && (
                      <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <h3
                          className={`text-2xl font-bold ${textPrimary} mb-6`}
                        >
                          Mijn Profiel
                        </h3>
                        {/* ... profile form ... */}
                        <div className="grid grid-cols-2 gap-6 mb-6">
                          <div>
                            <label
                              className={`block text-xs font-bold ${textSecondary} uppercase mb-2`}
                            >
                              Voornaam
                            </label>
                            <input
                              type="text"
                              defaultValue="Jan"
                              className={`w-full ${inputBg} border ${border} rounded-md px-4 py-3 ${textPrimary} focus:border-[#FF6D00] outline-none`}
                            />
                          </div>
                          <div>
                            <label
                              className={`block text-xs font-bold ${textSecondary} uppercase mb-2`}
                            >
                              Achternaam
                            </label>
                            <input
                              type="text"
                              defaultValue="de Vries"
                              className={`w-full ${inputBg} border ${border} rounded-md px-4 py-3 ${textPrimary} focus:border-[#FF6D00] outline-none`}
                            />
                          </div>
                        </div>
                        <div className="mb-6">
                          <label
                            className={`block text-xs font-bold ${textSecondary} uppercase mb-2`}
                          >
                            Email
                          </label>
                          <input
                            type="email"
                            defaultValue="jan@disputedefence.com"
                            className={`w-full ${inputBg} border ${border} rounded-md px-4 py-3 ${textPrimary} focus:border-[#FF6D00] outline-none`}
                          />
                        </div>
                        <div
                          className={`pt-6 border-t ${border} flex justify-end`}
                        >
                          <button className="bg-[#FF6D00] hover:bg-[#e66200] text-white px-6 py-3 rounded-md font-bold flex items-center gap-2">
                            <Save size={18} /> Opslaan
                          </button>
                        </div>
                      </div>
                    )}

                    {/* AUTOMATION SETTINGS */}
                    {settingsSubTab === 'automation' && (
                      <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <h3
                          className={`text-2xl font-bold ${textPrimary} mb-2`}
                        >
                          Automatisering
                        </h3>
                        <p className={`${textSecondary} text-sm mb-6`}>
                          Bespaar kosten door kleine disputen niet te bevechten.
                        </p>

                        <div
                          className={`p-6 rounded-lg border ${border} ${
                            isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-50'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              <h4
                                className={`text-base font-bold ${textPrimary}`}
                              >
                                Auto-Accepteer Drempel
                              </h4>
                              <p className={`text-xs ${textSecondary}`}>
                                Accepteer claims onder dit bedrag automatisch.
                              </p>
                            </div>
                            <div className={`text-xl font-bold text-[#FF6D00]`}>
                              € {autoAcceptThreshold}
                            </div>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={autoAcceptThreshold}
                            onChange={(e) =>
                              setAutoAcceptThreshold(Number(e.target.value))
                            }
                            className="w-full accent-[#FF6D00]"
                          />
                          <p className={`text-xs ${textSecondary} mt-4 italic`}>
                            * Advies: Stel in op €15-€20 om verwerkingskosten te
                            vermijden.
                          </p>
                        </div>
                      </div>
                    )}

                    {settingsSubTab === 'billing' && (
                      <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <h3
                          className={`text-2xl font-bold ${textPrimary} mb-6`}
                        >
                          Abonnement & Pakketten
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                          {/* STARTER */}
                          <div
                            className={`p-6 rounded-lg border ${border} ${
                              isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-50'
                            } relative overflow-hidden`}
                          >
                            <h4 className={`text-lg font-bold ${textPrimary}`}>
                              Starter
                            </h4>
                            <p className={`text-xs ${textSecondary} mb-4`}>
                              Voor kleine webshops
                            </p>
                            <div
                              className={`text-3xl font-black ${textPrimary} mb-4`}
                            >
                              Gratis
                            </div>
                            <ul className="space-y-2 text-xs mb-6">
                              <li className="flex gap-2">
                                <Check size={14} className="text-emerald-500" />{' '}
                                Basis Dashboard
                              </li>
                              <li className="flex gap-2">
                                <Check size={14} className="text-emerald-500" />{' '}
                                Handmatige Upload
                              </li>
                              <li className="flex gap-2">
                                <Check size={14} className="text-emerald-500" />{' '}
                                €49 per Expert Review
                              </li>
                            </ul>
                            <button
                              className={`w-full py-2 rounded-md font-bold text-sm ${
                                isDarkMode
                                  ? 'bg-[#3E3E3E] text-white'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              Huidig Plan
                            </button>
                          </div>

                          {/* GROWTH (Popular) */}
                          <div
                            className={`p-6 rounded-lg border-2 border-[#FF6D00] ${
                              isDarkMode ? 'bg-[#2C2C2C]' : 'bg-white'
                            } relative overflow-hidden shadow-lg`}
                          >
                            <div className="absolute top-0 right-0 bg-[#FF6D00] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                              POPULAIR
                            </div>
                            <h4 className={`text-lg font-bold ${textPrimary}`}>
                              Growth
                            </h4>
                            <p className={`text-xs ${textSecondary} mb-4`}>
                              Voor serieuze merchants
                            </p>
                            <div
                              className={`text-3xl font-black ${textPrimary} mb-4`}
                            >
                              €99{' '}
                              <span className="text-sm font-normal text-[#A0A0A0]">
                                /mnd
                              </span>
                            </div>
                            <ul className="space-y-2 text-xs mb-6">
                              <li className="flex gap-2">
                                <Check size={14} className="text-[#FF6D00]" />{' '}
                                Alles in Starter
                              </li>
                              <li className="flex gap-2">
                                <Check size={14} className="text-[#FF6D00]" /> 3
                                Gratis Expert Reviews
                              </li>
                              <li className="flex gap-2">
                                <Check size={14} className="text-[#FF6D00]" />{' '}
                                Priority Support
                              </li>
                            </ul>
                            <button className="w-full py-2 rounded-md font-bold text-sm bg-[#FF6D00] text-white hover:bg-[#e66200] transition-colors">
                              Upgrade Nu
                            </button>
                          </div>

                          {/* ENTERPRISE */}
                          <div
                            className={`p-6 rounded-lg border ${border} ${
                              isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-50'
                            } relative overflow-hidden`}
                          >
                            <h4 className={`text-lg font-bold ${textPrimary}`}>
                              Enterprise
                            </h4>
                            <p className={`text-xs ${textSecondary} mb-4`}>
                              Voor PSPs en Corporates
                            </p>
                            <div
                              className={`text-3xl font-black ${textPrimary} mb-4`}
                            >
                              Custom
                            </div>
                            <ul className="space-y-2 text-xs mb-6">
                              <li className="flex gap-2">
                                <Check size={14} className="text-emerald-500" />{' '}
                                White Label Optie
                              </li>
                              <li className="flex gap-2">
                                <Check size={14} className="text-emerald-500" />{' '}
                                API Toegang
                              </li>
                              <li className="flex gap-2">
                                <Check size={14} className="text-emerald-500" />{' '}
                                Volume Korting
                              </li>
                            </ul>
                            <button
                              className={`w-full py-2 rounded-md font-bold text-sm border ${border} ${textSecondary} hover:${textPrimary}`}
                            >
                              Neem Contact Op
                            </button>
                          </div>
                        </div>

                        <h4
                          className={`text-sm font-bold ${textPrimary} mb-4 uppercase tracking-wider`}
                        >
                          Factuurgeschiedenis
                        </h4>
                        <div className="space-y-2">
                          {[
                            {
                              id: 'INV-001',
                              date: '1 Jan 2024',
                              amount: '€49,00',
                              status: 'Betaald',
                            },
                            {
                              id: 'INV-002',
                              date: '1 Dec 2023',
                              amount: '€49,00',
                              status: 'Betaald',
                            },
                          ].map((inv) => (
                            <div
                              key={inv.id}
                              className={`flex items-center justify-between p-3 hover:${
                                isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-50'
                              } rounded-md transition-colors border-b ${border} last:border-0`}
                            >
                              <div className="flex items-center gap-4">
                                <FileText size={16} className={textSecondary} />
                                <div>
                                  <p
                                    className={`text-sm font-bold ${textPrimary}`}
                                  >
                                    {inv.date}
                                  </p>
                                  <p className={`text-xs ${textSecondary}`}>
                                    {inv.id}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span
                                  className={`text-sm font-medium ${textPrimary}`}
                                >
                                  {inv.amount}
                                </span>
                                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                                  {inv.status}
                                </span>
                                <button
                                  className={`${textSecondary} hover:${textPrimary}`}
                                >
                                  <Download size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {settingsSubTab === 'security' && (
                      <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <h3
                          className={`text-2xl font-bold ${textPrimary} mb-6`}
                        >
                          Beveiliging
                        </h3>

                        <div className="mb-8">
                          <h4
                            className={`text-sm font-bold ${textPrimary} mb-4 uppercase tracking-wider`}
                          >
                            Wachtwoord Wijzigen
                          </h4>
                          <div className="space-y-4">
                            <input
                              type="password"
                              placeholder="Huidig Wachtwoord"
                              className={`w-full ${inputBg} border ${border} rounded-md px-4 py-3 ${textPrimary} focus:border-[#FF6D00] outline-none`}
                            />
                            <div className="grid grid-cols-2 gap-4">
                              <input
                                type="password"
                                placeholder="Nieuw Wachtwoord"
                                className={`w-full ${inputBg} border ${border} rounded-md px-4 py-3 ${textPrimary} focus:border-[#FF6D00] outline-none`}
                              />
                              <input
                                type="password"
                                placeholder="Bevestig Wachtwoord"
                                className={`w-full ${inputBg} border ${border} rounded-md px-4 py-3 ${textPrimary} focus:border-[#FF6D00] outline-none`}
                              />
                            </div>
                            <button
                              className={`${
                                isDarkMode ? 'bg-[#2C2C2C]' : 'bg-slate-200'
                              } border ${border} ${textPrimary} hover:${
                                isDarkMode ? 'bg-[#3E3E3E]' : 'bg-slate-300'
                              } px-6 py-2 rounded-md font-bold text-sm`}
                            >
                              Update Wachtwoord
                            </button>
                          </div>
                        </div>

                        <div className={`pt-8 border-t ${border}`}>
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              <h4
                                className={`${textPrimary} font-bold text-sm`}
                              >
                                Twee-factor Authenticatie (2FA)
                              </h4>
                              <p className={`text-xs ${textSecondary} mt-1`}>
                                Voeg een extra beveiligingslaag toe aan uw
                                account.
                              </p>
                            </div>
                            <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                              <input
                                type="checkbox"
                                name="toggle-2fa"
                                id="toggle-2fa"
                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 right-6 checked:bg-[#FF6D00]"
                              />
                              <label
                                htmlFor="toggle-2fa"
                                className={`toggle-label block overflow-hidden h-6 rounded-full ${
                                  isDarkMode ? 'bg-[#1E1E1E]' : 'bg-slate-200'
                                } border ${border} cursor-pointer`}
                              ></label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </div>{' '}
            {/* Sluit max-w wrapper */}
          </main>
          {/* Connect Modal */}
          {showConnectModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <Card className="max-w-md w-full p-8 shadow-2xl">
                <h3 className={`text-xl font-bold ${textPrimary} mb-6`}>
                  Verbind{' '}
                  {
                    mockIntegrations.find((i) => i.id === connectingProvider)
                      ?.name
                  }
                </h3>
                <div className="space-y-4 mb-8">
                  <input
                    type="text"
                    placeholder="API Key (Read Only)"
                    className={`w-full ${inputBg} border ${border} rounded-md px-4 py-3 ${textPrimary} focus:border-[#FF6D00] outline-none`}
                  />
                  <input
                    type="text"
                    placeholder="Account ID"
                    className={`w-full ${inputBg} border ${border} rounded-md px-4 py-3 ${textPrimary} focus:border-[#FF6D00] outline-none`}
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowConnectModal(false)}
                    className={`flex-1 py-3 rounded-md font-bold ${textSecondary} hover:${textPrimary} hover:${
                      isDarkMode ? 'bg-[#3E3E3E]' : 'bg-slate-200'
                    } transition-colors`}
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={() =>
                      connectingProvider && handleConnect(connectingProvider)
                    }
                    className="flex-1 py-3 rounded-md font-bold bg-[#FF6D00] text-white hover:bg-[#e66200] transition-colors shadow-lg"
                  >
                    Verbinden
                  </button>
                </div>
              </Card>
            </div>
          )}
        </div>
      ) : (
        <LoginScreen onLogin={() => setIsLoggedIn(true)} />
      )}
    </ThemeContext.Provider>
  );
}
