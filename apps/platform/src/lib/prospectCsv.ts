import type { ParsedRow } from '@/components/hq/CsvImportDialog';
import { Prospect, ProspectInput, ProspectStage } from '@/types/hq';

// pipeline.csv stage names (~/Oreece/sales/pipeline.csv) → prospect stages.
// Deal-like stages become "conversation booked" so they can be converted.
const CSV_STAGES: Record<string, ProspectStage> = {
  researching: 'researching',
  'ready to contact': 'ready',
  contacted: 'contacted',
  'follow-up due': 'follow_up_due',
  'conversation booked': 'conversation_booked',
  qualified: 'conversation_booked',
  discovery: 'conversation_booked',
  'proposal sent': 'conversation_booked',
  negotiation: 'conversation_booked',
  won: 'conversation_booked',
  nurture: 'nurture',
  lost: 'disqualified',
};

const DEAL_STAGES = ['qualified', 'discovery', 'proposal sent', 'negotiation', 'won', 'lost'];

export function parseProspectCsvRow(r: Record<string, string>): ParsedRow<ProspectInput> {
  const name = r.business_name || r.business || r.name || '';
  if (!name) return { ok: false, label: '', error: 'No business name' };
  const rawStage = (r.stage || 'researching').toLowerCase();
  const stage = CSV_STAGES[rawStage];
  if (!stage) return { ok: false, label: name, error: `Unknown stage "${r.stage}"` };
  const tier = (r.tier || r.notes?.match(/tier\s*([ABC])/i)?.[1] || '').toUpperCase();
  const value = Number((r.est_value_nzd_estimate || r.estimated_value || '').replace(/[^\d.]/g, ''));
  // Deal stages are kept in the notes so nothing from the spreadsheet is lost.
  const keptStage = DEAL_STAGES.includes(rawStage) ? `Pipeline stage: ${r.stage}` : '';
  return {
    ok: true,
    label: name,
    data: {
      businessName: name,
      website: r.website,
      industry: r.industry,
      location: r.location,
      contactChannel: r.public_contact_channel || r.contact_channel,
      leadSource: r.lead_source,
      observedProblem: r.observed_opportunity || r.observed_problem,
      evidence: r.evidence,
      tier: (['A', 'B', 'C'].includes(tier) ? tier : undefined) as Prospect['tier'],
      stage,
      consentBasis: r.consent_basis,
      nextAction: r.next_action,
      nextActionDate: /^\d{4}-\d{2}-\d{2}$/.test(r.next_action_date || '') ? r.next_action_date : undefined,
      lastContactedAt: /^\d{4}-\d{2}-\d{2}$/.test(r.last_contacted || '') ? `${r.last_contacted}T00:00:00Z` : undefined,
      estimatedValue: value > 0 ? value : undefined,
      currency: 'NZD',
      notes: [r.notes, keptStage, r.outcome ? `Outcome: ${r.outcome}` : ''].filter(Boolean).join('\n'),
      disqualifiedReason: stage === 'disqualified' ? r.outcome || 'Lost (imported)' : undefined,
    },
  };
}
