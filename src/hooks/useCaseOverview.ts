import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// Lifecycle phases for the stepper
export type LifecyclePhase =
  | 'open'
  | 'evidence'
  | 'submitted'
  | 'escalation'
  | 'outcome';

export interface EvidenceItem {
  evidence_type: string;
  display_name: string;
  is_required: boolean;
  status: 'uploaded' | 'missing' | 'pending';
  file_name: string | null;
}

export interface ValidationItem {
  check: string;
  passed: boolean;
  message?: string;
}

export interface CaseOverviewData {
  id: string;
  lifecycle_phase: LifecyclePhase;
  urgency_level: number;
  urgency_reason: string | null;
  current_deadline: string | null;
  is_submittable: boolean;
  is_urgent: boolean;
  evidence: EvidenceItem[];
  validation: ValidationItem[];
}

export function useCaseOverview(caseId: string | null) {
  const [data, setData] = useState<CaseOverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('[useCaseOverview] Hook initialized with ID:', caseId);

  useEffect(() => {
    if (!caseId) {
      setData(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch case data with lifecycle fields
        const { data: caseData, error: caseErr } = await supabase
          .from('chargebacks')
          .select(
            'id, lifecycle_phase, urgency_level, urgency_reason, current_deadline, is_submittable, is_urgent'
          )
          .eq('id', caseId)
          .single();

        if (caseErr) throw caseErr;
        if (cancelled) return;

        console.log('[useCaseOverview] Case data loaded:', caseData);

        // 2. Fetch evidence checklist
        let evidence: EvidenceItem[] = [];
        const { data: evData, error: evErr } = await supabase
          .from('case_evidence_checklist')
          .select('evidence_type, display_name, is_required, status, file_name')
          .eq('chargeback_id', caseId);

        if (evErr) {
          console.warn('[useCaseOverview] Evidence load error:', evErr.message);
        } else {
          evidence = (evData ?? []) as EvidenceItem[];
        }
        if (cancelled) return;
        console.log('[useCaseOverview] Evidence loaded:', evidence);

        // 3. Fetch validation / submission readiness
        let validation: ValidationItem[] = [];
        const { data: valData, error: valErr } = await supabase
          .from('case_submission_validation')
          .select('check, passed, message')
          .eq('chargeback_id', caseId);

        if (valErr) {
          console.warn(
            '[useCaseOverview] Validation load error:',
            valErr.message
          );
        } else {
          validation = (valData ?? []) as ValidationItem[];
        }
        if (cancelled) return;
        console.log('[useCaseOverview] Validation loaded:', validation);

        setData({
          id: caseData.id,
          lifecycle_phase: caseData.lifecycle_phase ?? 'open',
          urgency_level: caseData.urgency_level ?? 0,
          urgency_reason: caseData.urgency_reason ?? null,
          current_deadline: caseData.current_deadline ?? null,
          is_submittable: caseData.is_submittable ?? false,
          is_urgent: caseData.is_urgent ?? false,
          evidence,
          validation,
        });
      } catch (err: any) {
        if (!cancelled) {
          console.error('[useCaseOverview] Error:', err);
          setError(err.message || 'Fout bij laden case data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  return { data, loading, error };
}
