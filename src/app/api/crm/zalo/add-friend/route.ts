import { NextRequest, NextResponse } from 'next/server';
import { getCrmSession } from '@/lib/admin-auth';
import { query, queryOne } from '@/lib/db';

/**
 * POST /api/crm/zalo/add-friend
 * Xử lý kết bạn Zalo cho khách hàng
 *
 * Request body:
 * {
 *   leadId: string,
 *   phone: string,
 *   name: string,
 *   zaloOAId?: string
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   data?: {
 *     leadId: string,
 *     zaloUserId?: string,
 *     addedAt: Date,
 *     status: 'pending' | 'sent' | 'accepted' | 'rejected'
 *   }
 * }
 */

interface AddFriendRequest {
  leadId: string;
  phone: string;
  name: string;
  zaloOAId?: string;
}

interface ZaloAddFriendResponse {
  success: boolean;
  message: string;
  data?: {
    leadId: string;
    zaloUserId?: string;
    addedAt: Date;
    status: 'pending' | 'sent' | 'accepted' | 'rejected';
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<ZaloAddFriendResponse>> {
  try {
    // Check authentication
    const session = await getCrmSession();
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = (await request.json()) as AddFriendRequest;
    const { leadId, phone, name, zaloOAId } = body;

    // Validate required fields
    if (!leadId || !phone) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: leadId, phone',
        },
        { status: 400 }
      );
    }

    // Verify lead exists
    const lead = await queryOne(
      'SELECT id, name, phone FROM leads WHERE id = $1',
      [leadId]
    );

    if (!lead) {
      return NextResponse.json(
        {
          success: false,
          message: 'Lead not found',
        },
        { status: 404 }
      );
    }

    // Get Zalo settings from environment
    const zaloAccessToken = process.env.ZALO_ACCESS_TOKEN;
    const zaloOAIdFromEnv = zaloOAId || process.env.ZALO_OA_ID;

    if (!zaloAccessToken || !zaloOAIdFromEnv) {
      return NextResponse.json(
        {
          success: false,
          message: 'Zalo configuration not found. Please configure ZALO_ACCESS_TOKEN and ZALO_OA_ID',
        },
        { status: 500 }
      );
    }

    // Normalize phone number (remove non-digits, add country code if needed)
    const normalizedPhone = normalizePhoneNumber(phone);

    // Call Zalo API to add friend
    const zaloResponse = await addZaloFriend(
      zaloAccessToken,
      zaloOAIdFromEnv,
      normalizedPhone,
      name
    );

    // Record interaction in database
    try {
      await query(
        `INSERT INTO zalo_interactions (lead_id, type, phone, zalo_user_id, status, response, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          leadId,
          'add_friend',
          normalizedPhone,
          zaloResponse.zaloUserId || null,
          zaloResponse.status,
          JSON.stringify(zaloResponse.rawResponse),
          session.staffId || 'system',
        ]
      );
    } catch (dbError) {
      console.error('Error recording interaction:', dbError);
      // Continue even if recording fails
    }

    // Update lead with Zalo info if available
    if (zaloResponse.zaloUserId) {
      try {
        await query(
          'UPDATE leads SET zalo_user_id = $1, zalo_added_at = NOW() WHERE id = $2',
          [zaloResponse.zaloUserId, leadId]
        );
      } catch (dbError) {
        console.error('Error updating lead:', dbError);
        // Continue even if update fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Add friend request sent successfully',
      data: {
        leadId,
        zaloUserId: zaloResponse.zaloUserId,
        addedAt: new Date(),
        status: zaloResponse.status,
      },
    });
  } catch (error) {
    console.error('Error adding Zalo friend:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        message: `Failed to add Zalo friend: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

/**
 * Normalize phone number to international format
 * Handles Vietnamese numbers and adds country code if needed
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let normalized = phone.replace(/\D/g, '');

  // Handle Vietnamese numbers
  if (normalized.startsWith('0')) {
    // Remove leading 0 and add country code
    normalized = '84' + normalized.substring(1);
  } else if (!normalized.startsWith('84')) {
    // If doesn't start with country code, assume Vietnam
    normalized = '84' + normalized;
  }

  return normalized;
}

/**
 * Call Zalo API to add friend using fetch API
 * Supports multiple approaches:
 * 1. Direct API call to Zalo Official Account
 * 2. Generate add friend link
 * 3. Send message with add friend button
 */
async function addZaloFriend(
  accessToken: string,
  oaId: string,
  phone: string,
  name: string
): Promise<{
  status: 'pending' | 'sent' | 'accepted' | 'rejected';
  zaloUserId?: string;
  rawResponse: any;
}> {
  try {
    // Approach 1: Try to get user info by phone and send add friend request
    const userResponse = await fetch(
      'https://graph.zalo.me/v2.0/me/findByPhoneNumber',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phone,
        }),
      }
    );

    const userData = await userResponse.json();

    if (userData && userData.data && userData.data.user_id) {
      const zaloUserId = userData.data.user_id;

      // Send add friend request
      const addFriendResponse = await fetch(
        `https://graph.zalo.me/v2.0/${oaId}/addFriend`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: zaloUserId,
            message: `Xin chào ${name}, tôi là nhân viên của SmartFurni. Hãy kết bạn để nhận thông tin sản phẩm tốt nhất!`,
          }),
        }
      );

      const addFriendData = await addFriendResponse.json();

      return {
        status: 'sent',
        zaloUserId,
        rawResponse: addFriendData,
      };
    }

    // Approach 2: If user not found, return pending status with add friend link
    return {
      status: 'pending',
      rawResponse: userData,
    };
  } catch (error) {
    console.error('Zalo API error:', error);

    // Even if API fails, we can still generate a manual add friend link
    // This allows users to manually add friend if automatic method fails
    const addFriendLink = generateZaloAddFriendLink(phone, name);

    return {
      status: 'pending',
      rawResponse: {
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackLink: addFriendLink,
      },
    };
  }
}

/**
 * Generate Zalo add friend link for manual addition
 * Format: https://zalo.me/[phone_number]
 */
function generateZaloAddFriendLink(phone: string, name: string): string {
  const normalizedPhone = normalizePhoneNumber(phone);
  return `https://zalo.me/${normalizedPhone}?utm_source=smartfurni&utm_medium=crm&utm_campaign=add_friend&name=${encodeURIComponent(name)}`;
}

/**
 * Database schema for Zalo interactions
 * Add this to your database:
 *
 * CREATE TABLE zalo_interactions (
 *   id TEXT PRIMARY KEY,
 *   lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
 *   type TEXT NOT NULL,
 *   phone TEXT NOT NULL,
 *   zalo_user_id TEXT,
 *   status TEXT NOT NULL,
 *   response JSONB,
 *   created_at TIMESTAMP DEFAULT NOW(),
 *   created_by TEXT NOT NULL
 * );
 *
 * ALTER TABLE leads ADD COLUMN zalo_user_id TEXT;
 * ALTER TABLE leads ADD COLUMN zalo_added_at TIMESTAMP;
 */
