export interface BankDetails {
  accountName?: string | null;
  accountNumber?: string | null;
  ifsc?: string | null;
  bankName?: string | null;
}

export interface CompanySnapshot {
  name: string;
  address?: string | null;
  phone?: string | null;
  gstNumber?: string | null;
  logoUrl?: string | null;
  bankDetails: BankDetails;
}

export interface CompanySnapshotUser {
  name?: string | null;
  company?: string | null;
  businessAddress?: string | null;
  businessPhone?: string | null;
  gstNumber?: string | null;
  logoUrl?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
}

/**
 * The single place that turns a User row into "the seller's letterhead
 * info" — reused by the quotation print page and (in P2) invoice
 * finalization, so the two documents never drift out of sync on which
 * fields count as "company info" (see Code Quality decision #6 in the plan).
 */
export function getCompanySnapshot(user: CompanySnapshotUser): CompanySnapshot {
  return {
    name: user.company || user.name || "Your Company",
    address: user.businessAddress,
    phone: user.businessPhone,
    gstNumber: user.gstNumber,
    logoUrl: user.logoUrl,
    bankDetails: {
      accountName: user.bankAccountName,
      accountNumber: user.bankAccountNumber,
      ifsc: user.bankIfsc,
      bankName: user.bankName,
    },
  };
}
