import { NextRequest, NextResponse } from 'next/server';
import {
  getAllTemplates,
  getTemplatesByCategory,
  createTemplate,
  getTemplateStats,
} from '@/services/email-template-service';

/**
 * GET /api/ai-agent/email/templates
 * Lấy danh sách tất cả templates
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let templates;

    if (category) {
      templates = getTemplatesByCategory(category as any);
    } else {
      templates = getAllTemplates();
    }

    const stats = getTemplateStats();

    return NextResponse.json({
      success: true,
      data: {
        templates,
        stats,
      },
    });
  } catch (error) {
    console.error('[EMAIL-TEMPLATES-API] Lỗi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi lấy danh sách templates',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-agent/email/templates
 * Tạo template mới
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, category, subject, bodyText, bodyHtml, variables, isActive } = body;

    // Validate
    if (!name || !category || !subject || !bodyText || !bodyHtml) {
      return NextResponse.json(
        {
          success: false,
          error: 'Thiếu thông tin bắt buộc',
        },
        { status: 400 }
      );
    }

    const template = createTemplate({
      name,
      description,
      category,
      subject,
      bodyText,
      bodyHtml,
      variables: variables || [],
      isActive: isActive !== false,
    });

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('[EMAIL-TEMPLATES-API] Lỗi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi tạo template',
      },
      { status: 500 }
    );
  }
}
