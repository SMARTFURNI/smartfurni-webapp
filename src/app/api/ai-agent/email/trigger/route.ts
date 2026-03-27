import { NextRequest, NextResponse } from 'next/server';
import { mockScenarios, getScenarioById, getTemplateById } from '@/lib/email-scenario-store';
import nodemailer from 'nodemailer';

/**
 * POST /api/ai-agent/email/trigger
 * Trigger email scenarios based on lead events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, leadName, email, eventType, eventData } = body;

    if (!leadId || !email || !eventType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: leadId, email, eventType',
        },
        { status: 400 }
      );
    }

    console.log(`[EMAIL-TRIGGER] Triggering scenarios for event: ${eventType}`, {
      leadId,
      leadName,
      email,
    });

    // Find matching scenarios
    const matchingScenarios = mockScenarios.filter((scenario) => {
      if (!scenario.enabled) return false;

      // Match trigger type
      if (eventType === 'new_lead' && scenario.trigger.type === 'new_lead') {
        return true;
      }
      if (eventType === 'lead_score_change' && scenario.trigger.type === 'lead_score_change') {
        // Check if score matches condition
        if (scenario.trigger.condition) {
          const { minScore, maxScore } = scenario.trigger.condition;
          const score = eventData?.score || 0;
          if (minScore && score < minScore) return false;
          if (maxScore && score > maxScore) return false;
          return true;
        }
        return true;
      }
      if (eventType === 'stage_change' && scenario.trigger.type === 'stage_change') {
        return true;
      }

      return false;
    });

    console.log(`[EMAIL-TRIGGER] Found ${matchingScenarios.length} matching scenarios`);

    // Execute first step of matching scenarios
    const results = [];

    for (const scenario of matchingScenarios) {
      const firstStep = scenario.steps[0];
      if (!firstStep) continue;

      const template = getTemplateById(firstStep.templateId);
      if (!template) continue;

      try {
        // Replace variables in template
        let subject = template.subject;
        let body = template.body;

        const variables = {
          leadName: leadName || 'Khách hàng',
          quantity: eventData?.quantity || '1',
          productName: eventData?.productName || 'Giường Điều Khiển Thông Minh',
          discount: eventData?.discount || '20%',
        };

        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          subject = subject.replace(regex, String(value));
          body = body.replace(regex, String(value));
        });

        // Send email
        const gmailUser = process.env.GMAIL_USER || 'phamtuat0820@gmail.com';
        const gmailPassword = process.env.GMAIL_PASSWORD || 'helx uzdy fpxs etgb';

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailUser,
            pass: gmailPassword,
          },
        });

        const info = await transporter.sendMail({
          from: gmailUser,
          to: email,
          subject: subject,
          text: body,
          html: template.htmlBody,
        });

        results.push({
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          stepId: firstStep.id,
          templateId: template.id,
          success: true,
          messageId: info.messageId,
          subject: subject,
        });

        console.log(`[EMAIL-TRIGGER] Email sent for scenario: ${scenario.name}`, {
          messageId: info.messageId,
        });
      } catch (error) {
        results.push({
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        console.error(`[EMAIL-TRIGGER] Failed to send email for scenario: ${scenario.name}`, error);
      }
    }

    console.log(`[EMAIL-TRIGGER] Trigger completed`, {
      totalScenarios: matchingScenarios.length,
      successCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
    });

    return NextResponse.json({
      success: true,
      data: {
        leadId,
        email,
        eventType,
        triggeredScenarios: matchingScenarios.length,
        results,
      },
    });
  } catch (error) {
    console.error('[EMAIL-TRIGGER] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger scenarios',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
