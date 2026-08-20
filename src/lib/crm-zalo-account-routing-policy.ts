export type ZaloAutomationAccountSource =
  | "pinned"
  | "linked_interaction"
  | "accepted_friendship"
  | "linked_conversation"
  | "preferred"
  | "default"
  | "fallback";

export interface ZaloAutomationAccountCandidate {
  accountId: string;
  accountLabel: string;
  conversationId?: string;
}

export interface ZaloAutomationAccountResolution extends ZaloAutomationAccountCandidate {
  source: ZaloAutomationAccountSource;
}

export function chooseZaloAutomationAccount(input: {
  activeAccounts: ZaloAutomationAccountCandidate[];
  pinnedAccountId?: string;
  preferredAccountId?: string;
  defaultAccountId?: string;
  linkedInteraction?: ZaloAutomationAccountCandidate | null;
  acceptedFriendship?: ZaloAutomationAccountCandidate | null;
  linkedConversation?: ZaloAutomationAccountCandidate | null;
}): ZaloAutomationAccountResolution | null {
  const activeById = new Map(input.activeAccounts.map(account => [account.accountId, account]));
  const byId = (accountId: string | undefined, source: ZaloAutomationAccountSource) => {
    const account = accountId ? activeById.get(accountId) : null;
    return account ? { ...account, source } : null;
  };
  const activeCandidate = (
    candidate: ZaloAutomationAccountCandidate | null | undefined,
    source: ZaloAutomationAccountSource,
  ) => candidate && activeById.has(candidate.accountId) ? { ...candidate, source } : null;

  return byId(input.pinnedAccountId, "pinned")
    || activeCandidate(input.linkedInteraction, "linked_interaction")
    || activeCandidate(input.acceptedFriendship, "accepted_friendship")
    || activeCandidate(input.linkedConversation, "linked_conversation")
    || byId(input.preferredAccountId, "preferred")
    || byId(input.defaultAccountId, "default")
    || (input.activeAccounts[0] ? { ...input.activeAccounts[0], source: "fallback" } : null);
}
