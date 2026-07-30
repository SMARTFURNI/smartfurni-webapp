import "server-only";

import { storeImageAsset } from "@/lib/media-assets";
import type { ContractSignature } from "@/lib/crm-contracts-store";

export async function externalizeContractSignatures(
  signatures: unknown,
  contractId: string,
): Promise<ContractSignature[]> {
  if (!Array.isArray(signatures)) return [];
  return Promise.all(signatures.map(async (raw, index) => {
    if (!raw || typeof raw !== "object") {
      throw new Error(`Chữ ký thứ ${index + 1} không hợp lệ`);
    }
    const signature = { ...(raw as Record<string, unknown>) };
    const data = typeof signature.signatureData === "string" ? signature.signatureData : "";
    if (!data.startsWith("data:image/")) return signature as unknown as ContractSignature;
    const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/.exec(data);
    if (!match) throw new Error(`Chữ ký thứ ${index + 1} không hợp lệ`);
    const buffer = Buffer.from(match[1], "base64");
    if (buffer.length > 3 * 1024 * 1024) {
      throw new Error(`Chữ ký thứ ${index + 1} vượt quá 3MB`);
    }
    const stored = await storeImageAsset({
      buffer,
      originalName: `${contractId}-signature-${index + 1}.png`,
      folder: "contracts",
      subfolder: contractId,
      maxWidth: 1200,
      quality: 88,
      visibility: "private",
      entityType: "contract",
      entityId: contractId,
    });
    return { ...signature, signatureData: stored.url } as unknown as ContractSignature;
  }));
}
