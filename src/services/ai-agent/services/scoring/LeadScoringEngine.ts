import { geminiClient, PromptManager } from '../gemini';
import { leadDataAggregator, AggregatedLeadData } from './LeadDataAggregator';
import {
  DEFAULT_LEAD_SCORING_MODEL,
  getClassification,
  LeadClassification,
} from './LeadScoringModel';
import { logger } from '../../utils/logger';
import { PerformanceTimer } from '../../utils/monitoring';

export interface LeadScore {
  leadId: string;
  score: number; // 0-100
  classification: LeadClassification;
  factors: Record<string, { score: number; weight: number; value: number }>;
  recommendations: string[];
  conversionProbability: number; // 0.0 - 1.0
  nextBestAction: string;
  reasoning: string;
  scoredAt: Date;
  validUntil: Date; // Score validity (usually 7 days)
}

/**
 * Lead Scoring Engine
 * Calculates lead quality score using AI and data aggregation
 */
export class LeadScoringEngine {
  /**
   * Score a single lead
   */
  async scoreLead(leadId: string): Promise<LeadScore | null> {
    const timer = new PerformanceTimer('lead_scoring');

    try {
      logger.info('Starting lead scoring', { leadId });

      // Step 1: Aggregate lead data
      const aggregatedData = await leadDataAggregator.aggregateLeadData(leadId);
      if (!aggregatedData) {
        throw new Error('Failed to aggregate lead data');
      }

      // Step 2: Calculate factor scores
      const factorScores = this.calculateFactorScores(aggregatedData);

      // Step 3: Calculate overall score
      const overallScore = this.calculateOverallScore(factorScores);

      // Step 4: Get AI-powered insights
      const aiInsights = await this.getAIInsights(aggregatedData, overallScore);

      // Step 5: Generate recommendations
      const recommendations = this.generateRecommendations(
        overallScore,
        aggregatedData
      );

      const duration = timer.end();

      const leadScore: LeadScore = {
        leadId,
        score: overallScore,
        classification: getClassification(overallScore),
        factors: factorScores,
        recommendations,
        conversionProbability: this.estimateConversionProbability(overallScore),
        nextBestAction: this.getNextBestAction(
          getClassification(overallScore),
          aggregatedData
        ),
        reasoning: aiInsights.reasoning,
        scoredAt: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      };

      logger.info('Lead scoring completed', {
        leadId,
        score: leadScore.score,
        classification: leadScore.classification,
        duration,
      });

      return leadScore;
    } catch (error) {
      const duration = timer.end();

      logger.error('Lead scoring failed', {
        leadId,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      return null;
    }
  }

  /**
   * Calculate scores for each factor
   */
  private calculateFactorScores(
    data: AggregatedLeadData
  ): Record<string, { score: number; weight: number; value: number }> {
    const model = DEFAULT_LEAD_SCORING_MODEL;
    const scores: Record<string, { score: number; weight: number; value: number }> = {};

    // Profile factors
    scores.companySize = {
      score: this.scoreCompanySize(data.profile.companySize),
      weight: model.companySize.weight,
      value: data.profile.companySize ? 1 : 0,
    };

    scores.industry = {
      score: this.scoreIndustry(data.profile.industry),
      weight: model.industry.weight,
      value: data.profile.industry ? 1 : 0,
    };

    scores.jobTitle = {
      score: this.scoreJobTitle(data.profile.jobTitle),
      weight: model.jobTitle.weight,
      value: data.profile.jobTitle ? 1 : 0,
    };

    // Engagement factors
    scores.emailOpenRate = {
      score: data.emailEngagement.openRate * 100,
      weight: model.emailOpenRate.weight,
      value: data.emailEngagement.openRate,
    };

    scores.emailClickRate = {
      score: data.emailEngagement.clickRate * 100,
      weight: model.emailClickRate.weight,
      value: data.emailEngagement.clickRate,
    };

    scores.zaloResponseRate = {
      score: data.zaloEngagement.responseRate * 100,
      weight: model.zaloResponseRate.weight,
      value: data.zaloEngagement.responseRate,
    };

    scores.websiteVisits = {
      score: Math.min((data.behavior.websiteVisits / 10) * 100, 100),
      weight: model.websiteVisits.weight,
      value: data.behavior.websiteVisits,
    };

    // Behavior factors
    scores.productInterest = {
      score: Math.min((data.behavior.productPagesViewed.length / 5) * 100, 100),
      weight: model.productInterest.weight,
      value: data.behavior.productPagesViewed.length,
    };

    scores.priceInquiries = {
      score: Math.min((data.behavior.priceInquiries / 3) * 100, 100),
      weight: model.priceInquiries.weight,
      value: data.behavior.priceInquiries,
    };

    scores.demoRequests = {
      score: data.behavior.demoRequests > 0 ? 100 : 0,
      weight: model.demoRequests.weight,
      value: data.behavior.demoRequests,
    };

    // Interaction factors
    scores.recency = {
      score: leadDataAggregator.calculateRecencyScore(
        data.behavior.lastVisitDate || data.profile.createdAt
      ),
      weight: model.recency.weight,
      value: data.recencyDays,
    };

    scores.frequency = {
      score: data.frequencyScore,
      weight: model.frequency.weight,
      value: data.frequencyScore,
    };

    scores.monetaryValue = {
      score: Math.min((data.monetaryValue / 100000) * 100, 100),
      weight: model.monetaryValue.weight,
      value: data.monetaryValue,
    };

    return scores;
  }

  /**
   * Calculate overall score from factor scores
   */
  private calculateOverallScore(
    factorScores: Record<string, { score: number; weight: number; value: number }>
  ): number {
    let totalScore = 0;
    let totalWeight = 0;

    for (const factor of Object.values(factorScores)) {
      totalScore += factor.score * factor.weight;
      totalWeight += factor.weight;
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Score company size (0-100)
   */
  private scoreCompanySize(size?: string): number {
    const scores: Record<string, number> = {
      startup: 40,
      small: 60,
      medium: 80,
      large: 95,
      enterprise: 100,
    };
    return scores[size || 'small'] || 50;
  }

  /**
   * Score industry (0-100)
   */
  private scoreIndustry(industry?: string): number {
    const targetIndustries: Record<string, number> = {
      hospitality: 100,
      healthcare: 95,
      finance: 90,
      retail: 70,
      technology: 80,
      manufacturing: 75,
      education: 60,
    };
    return targetIndustries[industry?.toLowerCase() || 'retail'] || 50;
  }

  /**
   * Score job title (0-100)
   */
  private scoreJobTitle(title?: string): number {
    if (!title) return 40;

    const titleLower = title.toLowerCase();
    if (
      titleLower.includes('ceo') ||
      titleLower.includes('director') ||
      titleLower.includes('manager')
    ) {
      return 100;
    }
    if (
      titleLower.includes('head') ||
      titleLower.includes('lead') ||
      titleLower.includes('supervisor')
    ) {
      return 80;
    }
    if (titleLower.includes('staff') || titleLower.includes('specialist')) {
      return 60;
    }
    return 50;
  }

  /**
   * Get AI-powered insights
   */
  private async getAIInsights(
    data: AggregatedLeadData,
    score: number
  ): Promise<{ reasoning: string }> {
    try {
      const prompt = PromptManager.getPrompt('lead_scoring', {
        leadName: data.profile.name,
        company: data.profile.company,
        engagementMetrics: {
          emailOpenRate: data.emailEngagement.openRate,
          zaloResponseRate: data.zaloEngagement.responseRate,
          websiteVisits: data.behavior.websiteVisits,
        },
        purchaseHistory: {
          priceInquiries: data.behavior.priceInquiries,
          demoRequests: data.behavior.demoRequests,
        },
        currentStage: getClassification(score),
        source: data.profile.source,
      });

      const response = await geminiClient.generateContent(prompt, {
        temperature: 0.5,
        maxTokens: 300,
      });

      if (!response.success) {
        throw new Error('Failed to get AI insights');
      }

      return { reasoning: response.content };
    } catch (error) {
      logger.warn('Failed to get AI insights', {
        error: error instanceof Error ? error.message : String(error),
      });
      return { reasoning: 'Unable to generate AI insights' };
    }
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    score: number,
    data: AggregatedLeadData
  ): string[] {
    const recommendations: string[] = [];

    if (score >= 80) {
      recommendations.push('Ưu tiên liên hệ trực tiếp');
      recommendations.push('Chuẩn bị proposal/báo giá');
      if (data.behavior.demoRequests === 0) {
        recommendations.push('Mời tham gia demo sản phẩm');
      }
    } else if (score >= 50) {
      recommendations.push('Tiếp tục nuôi dưỡng (nurture)');
      recommendations.push('Gửi case studies liên quan');
      if (data.emailEngagement.openRate < 0.5) {
        recommendations.push('Thử đổi subject line email');
      }
    } else {
      recommendations.push('Đưa vào nurture campaign dài hạn');
      recommendations.push('Phân tích lý do engagement thấp');
    }

    return recommendations;
  }

  /**
   * Estimate conversion probability
   */
  private estimateConversionProbability(score: number): number {
    // Simple linear model: score 80 = 80% probability, score 50 = 30% probability
    return Math.max(0, Math.min(1, (score - 20) / 100));
  }

  /**
   * Get next best action
   */
  private getNextBestAction(
    classification: LeadClassification,
    data: AggregatedLeadData
  ): string {
    if (classification === 'hot') {
      return 'schedule_call';
    } else if (classification === 'warm') {
      if (data.behavior.priceInquiries === 0) {
        return 'send_quote';
      }
      return 'send_case_study';
    } else {
      return 'add_to_nurture_campaign';
    }
  }
}

export const leadScoringEngine = new LeadScoringEngine();

