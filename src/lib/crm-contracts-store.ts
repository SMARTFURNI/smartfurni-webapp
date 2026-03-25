/**
 * CRM Contracts Store
 * Handles: Electronic contracts, digital signatures, PDF generation, storage
 */
import { query } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContractStatus = "draft" | "sent" | "signed" | "cancelled" | "expired";

export interface ContractSignature {
  party: "seller" | "buyer";
  name: string;
  title: string;
  signedAt: string;
  ipAddress?: string;
  signatureData?: string; // base64 signature image
}

export interface Contract {
  id: string;
  contractNumber: string;
  leadId: string;
  leadName: string;
  quoteId?: string;
  title: string;
  status: ContractStatus;
  // Seller info
  sellerName: string;
  sellerAddress: string;
  sellerTaxId: string;
  sellerRepresentative: string;
  sellerTitle: string;
  // Buyer info
  buyerName: string;
  buyerAddress: string;
  buyerTaxId: string;
  buyerRepresentative: string;
  buyerTitle: string;
  buyerPhone: string;
  buyerEmail: string;
  // Contract terms
  items: ContractItem[];
  totalValue: number;
  discount: number;
  finalValue: number;
  paymentTerms: string;
  deliveryTerms: string;
  warrantyTerms: string;
  specialTerms: string;
  // Dates
  contractDate: string;
  deliveryDate: string;
  validUntil: string;
  // Signatures
  signatures: ContractSignature[];
  // Files
  pdfUrl?: string;
  signedPdfUrl?: string;
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  notes: string;
}

export interface ContractItem {
  id: string;
  productName: string;
  sku: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  paymentTerms: string;
  deliveryTerms: string;
  warrantyTerms: string;
  specialTerms: string;
  isDefault: boolean;
  createdAt: string;
}

// ─── Schema Init ──────────────────────────────────────────────────────────────

export async function initContractsSchema(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS crm_contracts (
      id TEXT PRIMARY KEY,
      contract_number TEXT NOT NULL UNIQUE,
      lead_id TEXT NOT NULL,
      lead_name TEXT NOT NULL,
      quote_id TEXT,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      seller_name TEXT NOT NULL DEFAULT '',
      seller_address TEXT NOT NULL DEFAULT '',
      seller_tax_id TEXT NOT NULL DEFAULT '',
      seller_representative TEXT NOT NULL DEFAULT '',
      seller_title TEXT NOT NULL DEFAULT '',
      buyer_name TEXT NOT NULL DEFAULT '',
      buyer_address TEXT NOT NULL DEFAULT '',
      buyer_tax_id TEXT NOT NULL DEFAULT '',
      buyer_representative TEXT NOT NULL DEFAULT '',
      buyer_title TEXT NOT NULL DEFAULT '',
      buyer_phone TEXT NOT NULL DEFAULT '',
      buyer_email TEXT NOT NULL DEFAULT '',
      items JSONB NOT NULL DEFAULT '[]',
      total_value NUMERIC NOT NULL DEFAULT 0,
      discount NUMERIC NOT NULL DEFAULT 0,
      final_value NUMERIC NOT NULL DEFAULT 0,
      payment_terms TEXT NOT NULL DEFAULT '',
      delivery_terms TEXT NOT NULL DEFAULT '',
      warranty_terms TEXT NOT NULL DEFAULT '',
      special_terms TEXT NOT NULL DEFAULT '',
      contract_date TEXT NOT NULL DEFAULT '',
      delivery_date TEXT NOT NULL DEFAULT '',
      valid_until TEXT NOT NULL DEFAULT '',
      signatures JSONB NOT NULL DEFAULT '[]',
      pdf_url TEXT,
      signed_pdf_url TEXT,
      created_by TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS crm_contract_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      payment_terms TEXT NOT NULL DEFAULT '',
      delivery_terms TEXT NOT NULL DEFAULT '',
      warranty_terms TEXT NOT NULL DEFAULT '',
      special_terms TEXT NOT NULL DEFAULT '',
      is_default BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    INSERT INTO crm_contract_templates (id, name, description, payment_terms, delivery_terms, warranty_terms, special_terms, is_default)
    VALUES (
      'tpl-standard',
      'Hợp đồng B2B Tiêu chuẩn',
      'Mẫu hợp đồng chuẩn cho khách hàng doanh nghiệp',
      'Thanh toán 50% khi ký hợp đồng, 50% khi giao hàng và nghiệm thu.',
      'Giao hàng trong vòng 30-45 ngày làm việc kể từ ngày ký hợp đồng. Bên Bán chịu trách nhiệm vận chuyển và lắp đặt tại địa điểm Bên Mua chỉ định.',
      'Bảo hành 5 năm cho toàn bộ sản phẩm. Bảo hành bao gồm lỗi kỹ thuật, hỏng hóc do sản xuất. Không bảo hành các hư hỏng do tác động ngoại lực.',
      'Hai bên cam kết thực hiện đúng các điều khoản trong hợp đồng này. Mọi tranh chấp phát sinh sẽ được giải quyết thông qua thương lượng, hòa giải; nếu không thành sẽ đưa ra Tòa án có thẩm quyền tại TP. Hồ Chí Minh.',
      true
    ) ON CONFLICT (id) DO NOTHING;
  `);
}

// ─── Contracts CRUD ───────────────────────────────────────────────────────────

export async function getContracts(filters?: { leadId?: string; status?: ContractStatus }): Promise<Contract[]> {
  try {
    await initContractsSchema();
    let sql = `SELECT * FROM crm_contracts WHERE 1=1`;
    const params: unknown[] = [];
    if (filters?.leadId) { params.push(filters.leadId); sql += ` AND lead_id = $${params.length}`; }
    if (filters?.status) { params.push(filters.status); sql += ` AND status = $${params.length}`; }
    sql += ` ORDER BY created_at DESC`;
    const rows = await query(sql, params);
    return rows.map(mapContract);
  } catch { return []; }
}

export async function getContract(id: string): Promise<Contract | null> {
  try {
    await initContractsSchema();
    const rows = await query(`SELECT * FROM crm_contracts WHERE id = $1`, [id]);
    return rows[0] ? mapContract(rows[0]) : null;
  } catch { return null; }
}

export async function createContract(input: Omit<Contract, "id" | "contractNumber" | "createdAt" | "updatedAt">): Promise<Contract> {
  await initContractsSchema();
  const id = `contract-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const year = new Date().getFullYear();
  const seq = await query(`SELECT COUNT(*) as cnt FROM crm_contracts WHERE contract_number LIKE $1`, [`HD${year}%`]);
  const num = (parseInt((seq[0] as Record<string, unknown>).cnt as string) + 1).toString().padStart(4, "0");
  const contractNumber = `HD${year}${num}`;
  const now = new Date().toISOString();
  const rows = await query(
    `INSERT INTO crm_contracts (
      id, contract_number, lead_id, lead_name, quote_id, title, status,
      seller_name, seller_address, seller_tax_id, seller_representative, seller_title,
      buyer_name, buyer_address, buyer_tax_id, buyer_representative, buyer_title, buyer_phone, buyer_email,
      items, total_value, discount, final_value,
      payment_terms, delivery_terms, warranty_terms, special_terms,
      contract_date, delivery_date, valid_until,
      signatures, pdf_url, signed_pdf_url, created_by, notes, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
      $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$36
    ) RETURNING *`,
    [
      id, contractNumber, input.leadId, input.leadName, input.quoteId ?? null, input.title, input.status,
      input.sellerName, input.sellerAddress, input.sellerTaxId, input.sellerRepresentative, input.sellerTitle,
      input.buyerName, input.buyerAddress, input.buyerTaxId, input.buyerRepresentative, input.buyerTitle, input.buyerPhone, input.buyerEmail,
      JSON.stringify(input.items), input.totalValue, input.discount, input.finalValue,
      input.paymentTerms, input.deliveryTerms, input.warrantyTerms, input.specialTerms,
      input.contractDate, input.deliveryDate, input.validUntil,
      JSON.stringify(input.signatures), input.pdfUrl ?? null, input.signedPdfUrl ?? null,
      input.createdBy, input.notes, now,
    ]
  );
  return mapContract(rows[0]);
}

export async function updateContract(id: string, updates: Partial<Contract>): Promise<Contract | null> {
  try {
    const fields: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, string> = {
      title: "title", status: "status", items: "items",
      totalValue: "total_value", discount: "discount", finalValue: "final_value",
      paymentTerms: "payment_terms", deliveryTerms: "delivery_terms",
      warrantyTerms: "warranty_terms", specialTerms: "special_terms",
      contractDate: "contract_date", deliveryDate: "delivery_date", validUntil: "valid_until",
      signatures: "signatures", pdfUrl: "pdf_url", signedPdfUrl: "signed_pdf_url",
      notes: "notes",
      buyerName: "buyer_name", buyerAddress: "buyer_address", buyerTaxId: "buyer_tax_id",
      buyerRepresentative: "buyer_representative", buyerTitle: "buyer_title",
      buyerPhone: "buyer_phone", buyerEmail: "buyer_email",
    };
    for (const [key, col] of Object.entries(map)) {
      if (key in updates) {
        const val = updates[key as keyof Contract];
        params.push(typeof val === "object" && val !== null ? JSON.stringify(val) : val);
        fields.push(`${col} = $${params.length}`);
      }
    }
    if (!fields.length) return getContract(id);
    params.push(new Date().toISOString()); fields.push(`updated_at = $${params.length}`);
    params.push(id);
    const rows = await query(`UPDATE crm_contracts SET ${fields.join(", ")} WHERE id = $${params.length} RETURNING *`, params);
    return rows[0] ? mapContract(rows[0]) : null;
  } catch { return null; }
}

export async function deleteContract(id: string): Promise<void> {
  await query(`DELETE FROM crm_contracts WHERE id = $1`, [id]);
}

export async function getContractTemplates(): Promise<ContractTemplate[]> {
  try {
    await initContractsSchema();
    const rows = await query(`SELECT * FROM crm_contract_templates ORDER BY is_default DESC, created_at DESC`);
    return rows.map(r => ({
      id: r.id as string, name: r.name as string, description: r.description as string,
      paymentTerms: r.payment_terms as string, deliveryTerms: r.delivery_terms as string,
      warrantyTerms: r.warranty_terms as string, specialTerms: r.special_terms as string,
      isDefault: r.is_default as boolean, createdAt: String(r.created_at),
    }));
  } catch { return []; }
}

function mapContract(r: Record<string, unknown>): Contract {
  return {
    id: r.id as string,
    contractNumber: r.contract_number as string,
    leadId: r.lead_id as string,
    leadName: r.lead_name as string,
    quoteId: r.quote_id as string | undefined,
    title: r.title as string,
    status: r.status as ContractStatus,
    sellerName: r.seller_name as string,
    sellerAddress: r.seller_address as string,
    sellerTaxId: r.seller_tax_id as string,
    sellerRepresentative: r.seller_representative as string,
    sellerTitle: r.seller_title as string,
    buyerName: r.buyer_name as string,
    buyerAddress: r.buyer_address as string,
    buyerTaxId: r.buyer_tax_id as string,
    buyerRepresentative: r.buyer_representative as string,
    buyerTitle: r.buyer_title as string,
    buyerPhone: r.buyer_phone as string,
    buyerEmail: r.buyer_email as string,
    items: (typeof r.items === "string" ? JSON.parse(r.items) : r.items) as ContractItem[],
    totalValue: Number(r.total_value),
    discount: Number(r.discount),
    finalValue: Number(r.final_value),
    paymentTerms: r.payment_terms as string,
    deliveryTerms: r.delivery_terms as string,
    warrantyTerms: r.warranty_terms as string,
    specialTerms: r.special_terms as string,
    contractDate: r.contract_date as string,
    deliveryDate: r.delivery_date as string,
    validUntil: r.valid_until as string,
    signatures: (typeof r.signatures === "string" ? JSON.parse(r.signatures) : r.signatures) as ContractSignature[],
    pdfUrl: r.pdf_url as string | undefined,
    signedPdfUrl: r.signed_pdf_url as string | undefined,
    createdBy: r.created_by as string,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    notes: r.notes as string,
  };
}
