import { NextRequest, NextResponse } from "next/server";
import {
  getAllZaloGroups,
  getZaloGroupInfo,
  createZaloGroup,
  addZaloUserToGroup,
  removeZaloUserFromGroup,
  leaveZaloGroup,
  changeZaloGroupName,
  getZaloGroupLink,
  enableZaloGroupLink,
  joinZaloGroupByLink,
  getZaloGroupInvites,
  joinZaloGroupInvite,
  getZaloGroupBlockedMembers,
  blockZaloGroupMember,
  unblockZaloGroupMember,
  inviteZaloUserToGroups,
  changeZaloGroupOwner,
  disperseZaloGroup,
  createZaloNote,
  getZaloBoards,
  createZaloPoll,
  voteZaloPoll,
  lockZaloPoll,
} from "@/lib/zalo-gateway";
import { getAuthorizedZaloInboxSession } from "@/lib/zalo-inbox-access";

export async function GET(request: NextRequest) {
  if (!await getAuthorizedZaloInboxSession()) return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "list";
  const groupId = searchParams.get("groupId") || "";
  const query = searchParams.get("query") || undefined;
  const accountId = searchParams.get("accountId") || undefined;

  try {
    switch (action) {
      case "list":
        return NextResponse.json(await getAllZaloGroups(query, accountId));
      case "info":
        if (!groupId) return NextResponse.json({ success: false, error: "groupId required" }, { status: 400 });
        return NextResponse.json(await getZaloGroupInfo(groupId, accountId));
      case "link":
        if (!groupId) return NextResponse.json({ success: false, error: "groupId required" }, { status: 400 });
        return NextResponse.json(await getZaloGroupLink(groupId, accountId));
      case "invites":
        return NextResponse.json(await getZaloGroupInvites(accountId));
      case "blocked-members":
        if (!groupId) return NextResponse.json({ success: false, error: "groupId required" }, { status: 400 });
        return NextResponse.json(await getZaloGroupBlockedMembers(groupId));
      case "boards":
        if (!groupId) return NextResponse.json({ success: false, error: "groupId required" }, { status: 400 });
        return NextResponse.json(await getZaloBoards(groupId));
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
    const { action, groupId, userId, name, link, memberIds, nickname, title, options, pollId, optionId, pinAct, accountId } = body;

    switch (action) {
      case "create":
        if (!memberIds?.length) return NextResponse.json({ success: false, error: "memberIds required" }, { status: 400 });
        return NextResponse.json(await createZaloGroup({ name, memberIds, accountId }));
      case "add-member":
        if (!groupId || !userId) return NextResponse.json({ success: false, error: "groupId and userId required" }, { status: 400 });
        return NextResponse.json(await addZaloUserToGroup(userId, groupId, accountId));
      case "remove-member":
        if (!groupId || !userId) return NextResponse.json({ success: false, error: "groupId and userId required" }, { status: 400 });
        return NextResponse.json(await removeZaloUserFromGroup(userId, groupId, accountId));
      case "leave":
        if (!groupId) return NextResponse.json({ success: false, error: "groupId required" }, { status: 400 });
        return NextResponse.json(await leaveZaloGroup(groupId, accountId));
      case "rename":
        if (!groupId || !name) return NextResponse.json({ success: false, error: "groupId and name required" }, { status: 400 });
        return NextResponse.json(await changeZaloGroupName(groupId, name, accountId));
      case "enable-link":
        if (!groupId) return NextResponse.json({ success: false, error: "groupId required" }, { status: 400 });
        return NextResponse.json(await enableZaloGroupLink(groupId, accountId));
      case "join-link":
        if (!link) return NextResponse.json({ success: false, error: "link required" }, { status: 400 });
        return NextResponse.json(await joinZaloGroupByLink(link, accountId));
      case "join-invite":
        if (!groupId) return NextResponse.json({ success: false, error: "groupId required" }, { status: 400 });
        return NextResponse.json(await joinZaloGroupInvite(groupId, accountId));
      case "block-member":
        if (!groupId || !userId) return NextResponse.json({ success: false, error: "groupId and userId required" }, { status: 400 });
        return NextResponse.json(await blockZaloGroupMember(userId, groupId));
      case "unblock-member":
        if (!groupId || !userId) return NextResponse.json({ success: false, error: "groupId and userId required" }, { status: 400 });
        return NextResponse.json(await unblockZaloGroupMember(userId, groupId));
      case "invite-to-groups":
        if (!userId || !memberIds?.length) return NextResponse.json({ success: false, error: "userId and memberIds required" }, { status: 400 });
        return NextResponse.json(await inviteZaloUserToGroups(userId, memberIds));
      case "change-owner":
        if (!groupId || !userId) return NextResponse.json({ success: false, error: "groupId and userId required" }, { status: 400 });
        return NextResponse.json(await changeZaloGroupOwner(userId, groupId));
      case "disperse":
        if (!groupId) return NextResponse.json({ success: false, error: "groupId required" }, { status: 400 });
        return NextResponse.json(await disperseZaloGroup(groupId));
      case "create-note":
        if (!groupId || !title) return NextResponse.json({ success: false, error: "groupId and title required" }, { status: 400 });
        return NextResponse.json(await createZaloNote(groupId, title, pinAct));
      case "create-poll":
        if (!groupId || !title || !options?.length) return NextResponse.json({ success: false, error: "groupId, title, options required" }, { status: 400 });
        return NextResponse.json(await createZaloPoll({ groupId, title, options }));
      case "vote-poll":
        if (pollId == null || optionId == null) return NextResponse.json({ success: false, error: "pollId and optionId required" }, { status: 400 });
        return NextResponse.json(await voteZaloPoll(pollId, optionId));
      case "lock-poll":
        if (pollId == null) return NextResponse.json({ success: false, error: "pollId required" }, { status: 400 });
        return NextResponse.json(await lockZaloPoll(pollId));
      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
