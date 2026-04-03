import { NextRequest, NextResponse } from 'next/server';
import {
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  renderTemplate,
  validateTemplateVariables,
} from '@/services/email-template-service';

/**
 * GET /api/ai-agent/email/templates/[id]
 * Lấy template theo ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const template = getTemplateById((await params).id);

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template không tìm thấy',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('[EMAIL-TEMPLATES-API] Lỗi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi lấy template',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ai-agent/email/templates/[id]
 * Cập nhật template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { name, description, subject, bodyText, bodyHtml, variables, isActive } = body;

    const template = updateTemplate((await params).id, {
      name,
      description,
      subject,
      bodyText,
      bodyHtml,
      variables,
      isActive,
    });

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template không tìm thấy',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('[EMAIL-TEMPLATES-API] Lỗi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi cập nhật template',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai-agent/email/templates/[id]
 * Xóa template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const success = deleteTemplate((await params).id);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template không tìm thấy',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Template đã được xóa',
    });
  } catch (error) {
    console.error('[EMAIL-TEMPLATES-API] Lỗi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi xóa template',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai-agent/email/templates/[id]/render
 * Render template với variables
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const template = getTemplateById((await params).id);

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template không tìm thấy',
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { variables } = body;

    // Validate variables
    const validation = validateTemplateVariables(template, variables || {});

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Thiếu variables bắt buộc',
          missingVariables: validation.missingVariables,
        },
        { status: 400 }
      );
    }

    // Render template
    const rendered = renderTemplate(template, variables);

    return NextResponse.json({
      success: true,
      data: rendered,
    });
  } catch (error) {
    console.error('[EMAIL-TEMPLATES-API] Lỗi:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Lỗi khi render template',
      },
      { status: 500 }
    );
  }
}
