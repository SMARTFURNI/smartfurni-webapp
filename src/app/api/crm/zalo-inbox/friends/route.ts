import { NextRequest, NextResponse } from "next/server";
import {
  getAllZaloFriends,
  getZaloSentFriendRequests,
  undoZaloFriendRequest,
  removeZaloFriend,
  setZaloFriendNickname,
  removeZaloFriendNickname,
  getZaloOnlineFriends,
  getZaloFriendRecommendations,
  getZaloAliasList,
  getZaloRelatedFriendGroups,
  getAllZaloGroups,
  getZaloUserInfo,
} from "@/lib/zalo-gateway";
import { getAuthorizedZaloInboxSession } from "@/lib/zalo-inbox-access";

export async function GET(request: NextRequest) {
  if (!await getAuthorizedZaloInboxSession()) return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "list";
  const query = searchParams.get("query") || undefined;
  const userId = searchParams.get("userId") || "";
  const accountId = searchParams.get("accountId") || undefined;

  try {
    switch (action) {
      case "list":
        return NextResponse.json(await getAllZaloFriends(query, accountId));
      case "sent-requests":
        return NextResponse.json(await getZaloSentFriendRequests(accountId));
      case "online":
        return NextResponse.json(await getZaloOnlineFriends(accountId));
      case "recommendations":
        return NextResponse.json(await getZaloFriendRecommendations(accountId));
      case "aliases":
        return NextResponse.json(await getZaloAliasList(accountId));
      case "related-groups":
        if (!userId) return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
        return NextResponse.json(await getZaloRelatedFriendGroups(userId, accountId));
      case "related-groups-details": {
        if (!userId) return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
        const related = await getZaloRelatedFriendGroups(userId, accountId);
        if (!related.success) return NextResponse.json(related);
        const allGroups = await getAllZaloGroups(undefined, accountId);
        if (!allGroups.success) return NextResponse.json(allGroups);
        const relatedIds = new Set(related.groupIds || []);
        return NextResponse.json({
          success: true,
          groups: (allGroups.groups || []).filter(group => relatedIds.has(group.groupId)),
        });
      }
      case "profile":
        if (!userId) return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
        return NextResponse.json(await getZaloUserInfo(userId, accountId));
      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!await getAuthorizedZaloInboxSession()) return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: 403 });
  try {
    const body = await request.json();
    const { action, userId, nickname, accountId } = body;

    switch (action) {
      case "undo-request":
        if (!userId) return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
        return NextResponse.json(await undoZaloFriendRequest(userId, accountId));
      case "unfriend":
        if (!userId) return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
        return NextResponse.json(await removeZaloFriend(userId, accountId));
      case "set-nickname":
        if (!userId || !nickname) return NextResponse.json({ success: false, error: "userId and nickname required" }, { status: 400 });
        return NextResponse.json(await setZaloFriendNickname(userId, nickname, accountId));
      case "remove-nickname":
        if (!userId) return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
        return NextResponse.json(await removeZaloFriendNickname(userId, accountId));
      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
