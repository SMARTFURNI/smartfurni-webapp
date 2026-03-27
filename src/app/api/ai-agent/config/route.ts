import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

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
  const headersList = headers();
  const authHeader = headersList.get('authorization');
  
  // For now, accept requests from authenticated users
  // In production, implement proper authentication
  return !!authHeader || process.env.NODE_ENV === 'development';
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
      { error: 'Failed to retrieve configuration' },
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

    // Validate and update Gemini config
    if (gemini) {
      if (!gemini.apiKey || gemini.apiKey.startsWith('***')) {
        // Keep existing key if masked
        if (!configStorage.gemini?.apiKey) {
          return NextResponse.json(
            { error: 'Gemini API Key is required' },
            { status: 400 }
          );
        }
      } else {
        configStorage.gemini = {
          apiKey: gemini.apiKey,
          model: gemini.model || 'gemini-2.5-flash',
        };
      }
    }

    // Validate and update Email config
    if (email) {
      if (!email.email) {
        return NextResponse.json(
          { error: 'Email address is required' },
          { status: 400 }
        );
      }
      if (!email.appPassword || email.appPassword.startsWith('***')) {
        if (!configStorage.email?.appPassword) {
          return NextResponse.json(
            { error: 'Email App Password is required' },
            { status: 400 }
          );
        }
      } else {
        configStorage.email = {
          provider: email.provider || 'gmail',
          email: email.email,
          appPassword: email.appPassword,
        };
      }
    }

    // Validate and update Zalo config
    if (zalo) {
      if (!zalo.oaId) {
        return NextResponse.json(
          { error: 'Zalo OA ID is required' },
          { status: 400 }
        );
      }
      if (!zalo.accessToken || zalo.accessToken.startsWith('***')) {
        if (!configStorage.zalo?.accessToken) {
          return NextResponse.json(
            { error: 'Zalo Access Token is required' },
            { status: 400 }
          );
        }
      } else {
        configStorage.zalo = {
          oaId: zalo.oaId,
          accessToken: zalo.accessToken,
          secretKey: zalo.secretKey || '',
        };
      }
    }

    // Validate and update Facebook config
    if (facebook) {
      if (!facebook.appId) {
        return NextResponse.json(
          { error: 'Facebook App ID is required' },
          { status: 400 }
        );
      }
      if (!facebook.appSecret || facebook.appSecret.startsWith('***')) {
        if (!configStorage.facebook?.appSecret) {
          return NextResponse.json(
            { error: 'Facebook App Secret is required' },
            { status: 400 }
          );
        }
      } else {
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
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
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
        configStorage.gemini = { ...configStorage.gemini, ...data };
        break;
      case 'email':
        configStorage.email = { ...configStorage.email, ...data };
        break;
      case 'zalo':
        configStorage.zalo = { ...configStorage.zalo, ...data };
        break;
      case 'facebook':
        configStorage.facebook = { ...configStorage.facebook, ...data };
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
      { error: 'Failed to update configuration' },
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
      { error: 'Failed to reset configuration' },
      { status: 500 }
    );
  }
}
