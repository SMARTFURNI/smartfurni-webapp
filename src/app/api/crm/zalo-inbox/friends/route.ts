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
} from "@/lib/zalo-gateway";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "list";
  const query = searchParams.get("query") || undefined;
  const userId = searchParams.get("userId") || "";

  try {
    switch (action) {
      case "list":
        return NextResponse.json(await getAllZaloFriends(query));
      case "sent-requests":
        return NextResponse.json(await getZaloSentFriendRequests());
      case "online":
        return NextResponse.json(await getZaloOnlineFriends());
      case "recommendations":
        return NextResponse.json(await getZaloFriendRecommendations());
      case "aliases":
        return NextResponse.json(await getZaloAliasList());
      case "related-groups":
        if (!userId) return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
        return NextResponse.json(await getZaloRelatedFriendGroups(userId));
      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, nickname } = body;

    switch (action) {
      case "undo-request":
        if (!userId) return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
        return NextResponse.json(await undoZaloFriendRequest(userId));
      case "unfriend":
        if (!userId) return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
        return NextResponse.json(await removeZaloFriend(userId));
      case "set-nickname":
        if (!userId || !nickname) return NextResponse.json({ success: false, error: "userId and nickname required" }, { status: 400 });
        return NextResponse.json(await setZaloFriendNickname(userId, nickname));
      case "remove-nickname":
        if (!userId) return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
        return NextResponse.json(await removeZaloFriendNickname(userId));
      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
