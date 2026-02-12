# CLAUDE.md — Dispute Defence (VersieA)

This file provides context for AI assistants working on this codebase.

## Project Overview

**Dispute Defence** is a chargeback defense and dispute management platform targeting Dutch merchants and e-commerce businesses. It provides a dashboard for tracking, analyzing, and responding to payment chargebacks across Visa and Mastercard networks.

Key capabilities:
- Chargeback case management with workflow tracking (Retrieval → Decision)
- AI-powered analysis via Gemini API (win probability, strategy, draft response letters)
- Evidence file management and upload
- Team collaboration with role-based access
- ROI calculator for chargeback defense value
- Payment provider integrations (Stripe, Adyen, Mollie, Buckaroo, Shopify Payments, Ethoca)
- Dark/light theme support

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Framework   | React 18.2 + TypeScript 5.2        |
| Build       | Vite 5.0                            |
| Styling     | Tailwind CSS 3.4                    |
| Icons       | Lucide React 0.263                  |
| Backend     | Supabase (auth, database, storage)  |
| AI          | Google Gemini API (analysis)        |
| Package mgr | npm (lock file present)             |

## Project Structure

```
VersieA/
├── src/
│   ├── main.tsx              # React entry point — renders <App /> to #root
│   ├── App.tsx               # Main application (~4,500 lines, monolithic)
│   ├── supabaseClient.ts     # Supabase client initialization
│   ├── features.ts           # Feature flags
│   ├── index.css             # Global styles + Tailwind directives
│   ├── App.css               # Component animations, theme toggle styles
│   └── vite-env.d.ts         # Vite type declarations
├── Docs/
│   └── security/
│       ├── SECURITY_OWNER.md   # Security owner: RenzoRuitenbeek
│       └── SECURITY_BACKLOG.md # P0/P1 security requirements
├── public/                   # Static assets
├── index.html                # Vite HTML entry point
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript config (strict mode)
├── tsconfig.node.json        # TS config for Vite/Node
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── postcss.config.js         # PostCSS (Tailwind + Autoprefixer)
```

## Architecture Notes

### Monolithic App.tsx

Nearly all application logic lives in `src/App.tsx` (~4,500 lines). This single file contains:

- **ThemeContext** — dark/light mode context provider
- **Gemini API integration** — `callGeminiAPI()` for AI chargeback analysis
- **Type definitions** — `ChargebackStatus`, `WorkflowStep`, `Chargeback`, `Customer`, `EvidenceFile`
- **Mock data** — sample chargebacks with Dutch merchant names (CoolBlue, Bol.com)
- **UI components** — Card, StatusBadge, DeadlineTimer, CardBrand, CaseDetailModal, ROICalculator, LoginScreen, NewCaseModal, InviteModal
- **Main ChargebackApp component** — dashboard with tabs: Dashboard, Disputes, Team & Audit, Reports, Integrations, Settings, Calculator, Wero Edition

When modifying this file, be aware of its size and the implicit dependencies between co-located components.

### Feature Flags (`src/features.ts`)

```typescript
export const FEATURES = {
  weroEdition: false,    // Wero payment method support (unreleased)
  reports: false,         // Reporting section (unreleased)
  incidentBanner: false,  // Incident notification banner (unreleased)
  devTogglesInUI: true,   // Dev toggles visible in UI (disable for production)
} as const;
```

Always check and respect feature flags when working on gated functionality.

### Supabase Configuration

The Supabase client is initialized in `src/supabaseClient.ts` with hardcoded credentials. The app uses:
- **Authentication** — email/password with retry logic for transient failures
- **Session management** — persistent sessions with `onAuthStateChange` listener

### Gemini AI Integration

Located at the top of `App.tsx`. The API key is currently empty (placeholder). When the API call fails, it falls back to hardcoded Dutch-language mock responses. The response schema expects: `analysis`, `winProbability`, `strategy`, `draftLetter`.

## Key Domain Types

```typescript
type ChargebackStatus = 'Open' | 'Pending' | 'Won' | 'Lost' | 'Accepted' | 'Deflected'
type WorkflowStep = 'Retrieval' | '1st Chargeback' | 'Evidence Collection' | 'Representment' | 'Pre-Arb' | 'Decision' | 'Prevention' | 'Submitted'

interface Chargeback {
  id, merchant, amount, currency, reason, reasonCode, date, dueDate,
  status: ChargebackStatus,
  workflowStep: WorkflowStep,
  cardBrand: 'visa' | 'mastercard',
  evidence: EvidenceFile[],
  customer: Customer,
  // Technical payment data: arn, authCode, eci, threeDSStatus, avsResponse, cvcResponse, mcc, descriptor, settlementDate, hasRefund
}
```

## Development Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # TypeScript check + Vite production build (tsc && vite build)
npm run preview   # Preview production build locally
```

## TypeScript Configuration

Strict mode is enabled with additional strictness flags:
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- Target: ES2020
- Module: ESNext with bundler resolution

All code must pass `tsc` with zero errors before the production build succeeds.

## Coding Conventions

- **Language**: Code is in English; user-facing strings and comments are often in Dutch
- **Styling**: Tailwind CSS utility classes; dark mode via `ThemeContext` with conditional class names
- **State management**: React hooks (`useState`, `useEffect`, `useContext`); no external state library
- **Icons**: All icons from `lucide-react` — import individually
- **Component pattern**: Functional components with hooks; components are currently co-located in App.tsx
- **No routing library**: Tab-based navigation via state, not URL routes

## Testing and Linting

**Not yet configured.** There is no test runner (Jest, Vitest), no linter (ESLint), and no formatter (Prettier). The only code quality gate is the TypeScript compiler (`tsc`).

When adding tests in the future, Vitest is the natural choice given the Vite build setup.

## Security Requirements

The project has documented security governance in `Docs/security/`:

- **Security Owner**: RenzoRuitenbeek — has veto-right on production releases
- **P0 items (release blockers)**: tenant isolation (RLS), audit logs, webhook verification, secure evidence upload, data retention/deletion, backups, incident runbook
- **P1 items (post-beta)**: monitoring/alerts, supplier register, PII masking, secure caching
- **Rule**: No production release without all P0 items completed and Security Owner approval

### Security Considerations for Contributors

- Supabase credentials are currently hardcoded in `supabaseClient.ts` — these should be moved to environment variables before production
- The Gemini API key field exists but is empty — never commit real API keys
- Evidence uploads must enforce type and size limits (P0 requirement)
- All state changes should be audit-logged (P0 requirement)
- Tenant isolation via Row Level Security must be verified (P0 requirement)

## Common Tasks

### Adding a new UI tab/section
1. Add the tab name to the tab state logic in `ChargebackApp` within `App.tsx`
2. Add the sidebar navigation entry with a Lucide icon
3. Create the content section with conditional rendering based on active tab
4. If experimental, gate behind a feature flag in `features.ts`

### Adding a new chargeback field
1. Update the `Chargeback` interface in `App.tsx`
2. Update mock data entries
3. Add display logic in `CaseDetailModal` and any relevant list views
4. If the field comes from Supabase, update the database schema accordingly

### Modifying the AI analysis
1. The Gemini API call is in `callGeminiAPI()` at the top of `App.tsx`
2. Update the `responseSchema` if changing the expected output structure
3. Update the fallback mock response to match the new schema
4. The API key must be configured for live API calls to work
