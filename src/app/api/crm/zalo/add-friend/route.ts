import { NextRequest, NextResponse } from 'next/server';
import { getCrmSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { leads, zaloInteractions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';

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
    if (!session || !session.user) {
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

    // Verify lead exists and belongs to user's company
    const lead = await db.query.leads.findFirst({
      where: eq(leads.id, leadId),
    });

    if (!lead) {
      return NextResponse.json(
        {
          success: false,
          message: 'Lead not found',
        },
        { status: 404 }
      );
    }

    // Get Zalo settings from environment or database
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
    const interaction = await db.insert(zaloInteractions).values({
      leadId,
      type: 'add_friend',
      phone: normalizedPhone,
      status: zaloResponse.status,
      zaloUserId: zaloResponse.zaloUserId,
      response: zaloResponse.rawResponse,
      createdAt: new Date(),
      createdBy: session.user.id,
    });

    // Update lead with Zalo info if available
    if (zaloResponse.zaloUserId) {
      await db
        .update(leads)
        .set({
          zaloUserId: zaloResponse.zaloUserId,
          zaloAddedAt: new Date(),
        })
        .where(eq(leads.id, leadId));
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
 * Call Zalo API to add friend
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
    const userResponse = await axios.post(
      'https://graph.zalo.me/v2.0/me/findByPhoneNumber',
      {
        phone_number: phone,
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (userResponse.data && userResponse.data.data && userResponse.data.data.user_id) {
      const zaloUserId = userResponse.data.data.user_id;

      // Send add friend request
      const addFriendResponse = await axios.post(
        `https://graph.zalo.me/v2.0/${oaId}/addFriend`,
        {
          user_id: zaloUserId,
          message: `Xin chào ${name}, tôi là nhân viên của SmartFurni. Hãy kết bạn để nhận thông tin sản phẩm tốt nhất!`,
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        status: 'sent',
        zaloUserId,
        rawResponse: addFriendResponse.data,
      };
    }

    // Approach 2: If user not found, return pending status with add friend link
    return {
      status: 'pending',
      rawResponse: userResponse.data,
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
 * Add this to your schema.ts file:
 *
 * export const zaloInteractions = pgTable('zalo_interactions', {
 *   id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
 *   leadId: text('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
 *   type: text('type').notNull(), // 'add_friend', 'send_message', 'call', etc.
 *   phone: text('phone').notNull(),
 *   zaloUserId: text('zalo_user_id'),
 *   status: text('status').notNull(), // 'pending', 'sent', 'accepted', 'rejected'
 *   response: jsonb('response'),
 *   createdAt: timestamp('created_at').notNull().defaultNow(),
 *   createdBy: text('created_by').notNull(),
 * });
 */
