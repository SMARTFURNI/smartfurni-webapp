import { NextRequest, NextResponse } from 'next/server';

// Type definitions for config
interface AIAgentConfig {
  gemini?: {
    apiKey: string;
    model: string;
  };
  email?: {
    provider: string;
    email: string;
    appPassword: string;
  };
  zalo?: {
    oaId: string;
    accessToken: string;
    secretKey: string;
  };
  facebook?: {
    appId: string;
    appSecret: string;
    accessToken: string;
    pageId: string;
  };
}

// In-memory storage (in production, use database)
let configStorage: AIAgentConfig = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-2.5-flash',
  },
  email: {
    provider: 'gmail',
    email: process.env.GMAIL_EMAIL || '',
    appPassword: process.env.GMAIL_APP_PASSWORD || '',
  },
  zalo: {
    oaId: process.env.ZALO_OA_ID || '',
    accessToken: process.env.ZALO_ACCESS_TOKEN || '',
    secretKey: process.env.ZALO_SECRET_KEY || '',
  },
  facebook: {
    appId: process.env.FACEBOOK_APP_ID || '',
    appSecret: process.env.FACEBOOK_APP_SECRET || '',
    accessToken: process.env.FACEBOOK_ACCESS_TOKEN || '',
    pageId: process.env.FACEBOOK_PAGE_ID || '',
  },
};

// Helper function to check admin access
async function isAdmin(request: NextRequest): Promise<boolean> {
  // In production, verify JWT token or session
  // For now, accept all requests (in development mode)
  return true;
}

// GET - Retrieve current configuration (masked sensitive data)
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Return config with masked sensitive data
    const maskedConfig = {
      gemini: {
        apiKey: configStorage.gemini?.apiKey ? '***' + configStorage.gemini.apiKey.slice(-8) : '',
        model: configStorage.gemini?.model || 'gemini-2.5-flash',
      },
      email: {
        provider: configStorage.email?.provider || 'gmail',
        email: configStorage.email?.email || '',
        appPassword: configStorage.email?.appPassword ? '***' : '',
      },
      zalo: {
        oaId: configStorage.zalo?.oaId || '',
        accessToken: configStorage.zalo?.accessToken ? '***' : '',
        secretKey: configStorage.zalo?.secretKey ? '***' : '',
      },
      facebook: {
        appId: configStorage.facebook?.appId || '',
        appSecret: configStorage.facebook?.appSecret ? '***' : '',
        accessToken: configStorage.facebook?.accessToken ? '***' : '',
        pageId: configStorage.facebook?.pageId || '',
      },
    };

    return NextResponse.json({
      success: true,
      config: maskedConfig,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error retrieving config:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve configuration', details: String(error) },
      { status: 500 }
    );
  }
}

// POST - Update configuration
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { gemini, email, zalo, facebook } = body;

    // Update Gemini config if provided
    if (gemini) {
      if (gemini.apiKey && !gemini.apiKey.startsWith('***')) {
        configStorage.gemini = {
          apiKey: gemini.apiKey,
          model: gemini.model || 'gemini-2.5-flash',
        };
      }
    }

    // Update Email config if provided
    if (email) {
      if (email.email && (email.appPassword && !email.appPassword.startsWith('***'))) {
        configStorage.email = {
          provider: email.provider || 'gmail',
          email: email.email,
          appPassword: email.appPassword,
        };
      }
    }

    // Update Zalo config if provided
    if (zalo) {
      if (zalo.oaId && (zalo.accessToken && !zalo.accessToken.startsWith('***'))) {
        configStorage.zalo = {
          oaId: zalo.oaId,
          accessToken: zalo.accessToken,
          secretKey: zalo.secretKey || '',
        };
      }
    }

    // Update Facebook config if provided
    if (facebook) {
      if (facebook.appId && (facebook.appSecret && !facebook.appSecret.startsWith('***'))) {
        configStorage.facebook = {
          appId: facebook.appId,
          appSecret: facebook.appSecret,
          accessToken: facebook.accessToken || '',
          pageId: facebook.pageId || '',
        };
      }
    }

    // In production, save to database
    // await db.aiAgentConfig.update(configStorage);

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
      config: {
        gemini: !!configStorage.gemini?.apiKey,
        email: !!configStorage.email?.email,
        zalo: !!configStorage.zalo?.oaId,
        facebook: !!configStorage.facebook?.appId,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT - Partially update configuration
export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { section, data } = body;

    if (!section || !data) {
      return NextResponse.json(
        { error: 'Missing section or data' },
        { status: 400 }
      );
    }

    // Update specific section
    switch (section) {
      case 'gemini':
        if (data.apiKey && !data.apiKey.startsWith('***')) {
          configStorage.gemini = { ...configStorage.gemini, ...data };
        }
        break;
      case 'email':
        if (data.email && data.appPassword && !data.appPassword.startsWith('***')) {
          configStorage.email = { ...configStorage.email, ...data };
        }
        break;
      case 'zalo':
        if (data.oaId && data.accessToken && !data.accessToken.startsWith('***')) {
          configStorage.zalo = { ...configStorage.zalo, ...data };
        }
        break;
      case 'facebook':
        if (data.appId && data.appSecret && !data.appSecret.startsWith('***')) {
          configStorage.facebook = { ...configStorage.facebook, ...data };
        }
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid section' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `${section} configuration updated successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - Reset configuration to defaults
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { section } = body;

    if (!section) {
      return NextResponse.json(
        { error: 'Missing section' },
        { status: 400 }
      );
    }

    // Reset specific section
    switch (section) {
      case 'gemini':
        configStorage.gemini = {
          apiKey: '',
          model: 'gemini-2.5-flash',
        };
        break;
      case 'email':
        configStorage.email = {
          provider: 'gmail',
          email: '',
          appPassword: '',
        };
        break;
      case 'zalo':
        configStorage.zalo = {
          oaId: '',
          accessToken: '',
          secretKey: '',
        };
        break;
      case 'facebook':
        configStorage.facebook = {
          appId: '',
          appSecret: '',
          accessToken: '',
          pageId: '',
        };
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid section' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `${section} configuration reset successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error resetting config:', error);
    return NextResponse.json(
      { error: 'Failed to reset configuration', details: String(error) },
      { status: 500 }
    );
  }
}
