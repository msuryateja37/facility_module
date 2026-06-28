// ─── Invoice Types ─────────────────────────────────────────────

export type InvoiceStatus = 'Pending' | 'In Review' | 'Approved' | 'Rejected';

export interface UtilityLine {
  type: 'Electricity' | 'Water' | 'Sewerage';
  meterNumber: string;
  consumption: string;
  unitCost: number;
  exclVat: number;
  vat: number;
  total: number;
}

export interface RefuseCalc {
  councilTotal: number;
  proRataShare: number;   // % of building used
  calculatedShare: number; // councilTotal * proRataShare
  landlordClaimed: number;
  lesserOfTwo: number;    // min(calculatedShare, landlordClaimed)
  approved: boolean;
}

export interface BASLine {
  service: string;
  amount: number;
  objective: string;
  responsibility: string;
  fund: string;
  asset: string;
  item: string;
  infrastructure: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  billingMonth: string;   // e.g. "June 2026"
  receivedDate: string;
  paymentMethod: 'EBT' | 'Manual';
  // Property
  landlord: string;
  propertyAddress: string;
  buildingSizeM2: number;
  leasedAreaM2: number;
  proRataShare: number;   // %
  // Payee / Bank
  payeeName: string;
  vatNumber: string;
  bankName: string;
  accountNumber: string;
  branchCode: string;
  accountType: string;
  verifiedEntity: boolean;
  // Financials
  utilities: UtilityLine[];
  refuse: RefuseCalc;
  basLines: BASLine[];
  exclVat: number;
  vatAmount: number;
  totalAmount: number;
  // Workflow
  status: InvoiceStatus;
  submittedBy: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  // Checklist & Signature
  checklistItems: { label: string; checked: boolean }[];
  signature?: string;     // base64 data URL
  // Document
  documentUrl?: string;
  documentName?: string;
}

// ─── Legacy types kept for compatibility ───────────────────────

export interface ReviewDocument {
  name: string;
  status: 'Uploaded' | 'Pending';
  url?: string;
}

export interface CalculationLine {
  id: number;
  description: string;
  qty: string;
  price: string;
  amount: number;
}

export interface Review {
  id: string;
  serviceProvider: string;
  propertyBuilding: string;
  billingPeriod: string;
  amount: number;
  status: string;
  aiConfidence: number;
  aiSuggestedAllocation: string;
  invoiceNumber: string;
  invoiceDate: string;
  accountNumber: string;
  receivedDate: string;
  daysRemaining: number;
  clerkComments?: string;
  supervisorComments?: string;
  ddComments?: string;
  directorComments?: string;
  documents: ReviewDocument[];
  calculations?: CalculationLine[];
  paymentForm?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ArchiveLog {
  id: string;
  reviewId: string;
  facilityName: string;
  archivedBy: string;
  archivedDate: string;
  boxNumber: string;
  shelfNumber: string;
  status: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details: string;
}
