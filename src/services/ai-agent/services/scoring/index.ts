export {
  DEFAULT_LEAD_SCORING_MODEL,
  SCORING_THRESHOLDS,
  getClassification,
  getClassificationColor,
  getClassificationLabel,
} from './LeadScoringModel';
export { LeadDataAggregator, leadDataAggregator } from './LeadDataAggregator';
export { LeadScoringEngine, leadScoringEngine } from './LeadScoringEngine';
export { BatchScoringService, batchScoringService } from './BatchScoringService';
export { ScoringScheduler, scoringScheduler } from './ScoringScheduler';

export type { LeadClassification, ScoringFactor, LeadScoringFactors } from './LeadScoringModel';
export type {
  LeadProfile,
  EmailEngagementData,
  ZaloEngagementData,
  BehaviorData,
  AggregatedLeadData,
} from './LeadDataAggregator';
export type { LeadScore } from './LeadScoringEngine';
export type { BatchScoringJob } from './BatchScoringService';

