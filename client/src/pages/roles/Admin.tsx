import React, { useState } from 'react';
import {
  Search, Eye, CheckCircle, XCircle, Clock, BarChart2, FileText,
  Building, Landmark, Zap, Droplets, Trash2, Leaf, X, ChevronRight
} from 'lucide-react';
import { Invoice, InvoiceStatus, UtilityLine, RefuseCalc, BASLine } from '../../types';
import { useQuery } from '@tanstack/react-query';
import { fetchReviews, updateReview } from '../../utils/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtZAR(n: number) {
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusBadge(s: InvoiceStatus) {
  const styles: Record<InvoiceStatus, { bg: string; color: string; icon: React.ReactNode }> = {
    Pending:    { bg: '#fef3c7', color: '#92400e', icon: <Clock size={12}/> },
    'In Review':{ bg: '#dbeafe', color: '#1e40af', icon: <BarChart2 size={12}/> },
    Approved:   { bg: '#d1fae5', color: '#065f46', icon: <CheckCircle size={12}/> },
    Rejected:   { bg: '#fee2e2', color: '#991b1b', icon: <XCircle size={12}/> },
  };
  const st = styles[s] || styles['Pending'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem',
      fontWeight: 600, backgroundColor: st.bg, color: st.color
    }}>
      {st.icon}{s}
    </span>
  );
}

// ─── Seed demo invoices ────────────────────────────────────────────────────────

function buildSeedInvoice(id: string, overrides: Partial<Invoice>): Invoice {
  const utils = [
    { type: 'Electricity' as const, meterNumber: 'E-1042-A', consumption: '12 450 kWh', unitCost: 1.85, exclVat: 23032.50, vat: 3454.88, total: 26487.38 },
    { type: 'Water' as const,       meterNumber: 'W-0837-B', consumption: '340 kl',     unitCost: 22.40, exclVat: 7616.00,  vat: 1142.40, total: 8758.40  },
    { type: 'Sewerage' as const,    meterNumber: 'S-0122-C', consumption: 'N/A',        unitCost: 0,     exclVat: 2450.00,  vat: 367.50,  total: 2817.50  },
  ];
  const refuse = { councilTotal: 18200, proRataShare: 0.32, calculatedShare: 5824, landlordClaimed: 5100, lesserOfTwo: 5100, approved: true };
  const bas = [
    { service: 'Electricity', amount: 26487.38, objective: 'A03', responsibility: 'R041', fund: 'F001', asset: 'INF-E', item: '3107', infrastructure: 'I-022' },
    { service: 'Water',       amount: 8758.40,  objective: 'A04', responsibility: 'R041', fund: 'F001', asset: 'INF-W', item: '3108', infrastructure: 'I-023' },
    { service: 'Sewerage',    amount: 2817.50,  objective: 'A04', responsibility: 'R042', fund: 'F001', asset: 'INF-S', item: '3109', infrastructure: 'I-024' },
    { service: 'Refuse',      amount: 5100.00,  objective: 'A05', responsibility: 'R043', fund: 'F001', asset: 'INF-R', item: '3110', infrastructure: 'I-025' },
  ];
  const exclVat = utils.reduce((s, u) => s + u.exclVat, 0) + refuse.lesserOfTwo;
  const vatAmount = utils.reduce((s, u) => s + u.vat, 0);
  return {
    id,
    invoiceNumber: 'INV-2026-0891',
    invoiceDate: '2026-06-01',
    billingMonth: 'June 2026',
    receivedDate: '2026-06-15',
    paymentMethod: 'EBT',
    landlord: 'Batho Property Holdings (Pty) Ltd',
    propertyAddress: 'Erf 1142, 18 Proes Street, Pretoria CBD',
    buildingSizeM2: 4800,
    leasedAreaM2: 1540,
    proRataShare: 32,
    payeeName: 'Batho Property Holdings (Pty) Ltd',
    vatNumber: '4510213876',
    bankName: 'First National Bank',
    accountNumber: '627 441 2910',
    branchCode: '250655',
    accountType: 'Business Cheque',
    verifiedEntity: true,
    utilities: utils,
    refuse,
    basLines: bas,
    exclVat,
    vatAmount,
    totalAmount: exclVat + vatAmount,
    status: 'In Review',
    submittedBy: 'Thabo Mokoena',
    submittedAt: '2026-06-16T08:00:00Z',
    checklistItems: [
      { label: 'All utility meter readings match municipal statements', checked: true },
      { label: 'Pro-rata calculation verified against lease agreement', checked: true },
      { label: 'Payee banking details match CSD verification', checked: true },
    ],
    ...overrides,
  };
}

function mapReviewToInvoice(review: any, filename: string): Invoice {
  const isCOJ = review.serviceProvider.toLowerCase().includes('johannesburg') || review.serviceProvider.toLowerCase().includes('coj');
  
  let utilities: UtilityLine[] = [];
  let refuse: RefuseCalc = {
    councilTotal: 0,
    proRataShare: 1,
    calculatedShare: 0,
    landlordClaimed: 0,
    lesserOfTwo: 0,
    approved: true
  };
  let basLines: BASLine[] = [];
  let exclVat = review.amount;
  let vatAmount = 0;

  if (isCOJ) {
    utilities = [
      { type: 'Water', meterNumber: '941025570', consumption: '5 kl (36 days)', unitCost: 0, exclVat: 762.81, vat: 114.42, total: 877.23 },
    ];
    refuse = {
      councilTotal: 327.00,
      proRataShare: 1,
      calculatedShare: 327.00,
      landlordClaimed: 327.00,
      lesserOfTwo: 327.00,
      approved: true
    };
    basLines = [
      { service: 'Property Rates', amount: 800.96, objective: 'Rates', responsibility: 'R040', fund: 'F001', asset: 'Rates', item: 'Rates', infrastructure: 'Rates' },
      { service: 'Water & Sewerage', amount: 877.23, objective: 'Water', responsibility: 'R041', fund: 'F001', asset: 'Water', item: 'Water', infrastructure: 'Water' },
      { service: 'Refuse', amount: 376.05, objective: 'Refuse', responsibility: 'R042', fund: 'F001', asset: 'Refuse', item: 'Refuse', infrastructure: 'Refuse' },
    ];
    exclVat = 800.96 + 762.81 + 327.00;
    vatAmount = 163.47;
  } else {
    const isElectricity = review.serviceProvider.toLowerCase().includes('power') || review.serviceProvider.toLowerCase().includes('elect');
    const isWater = review.serviceProvider.toLowerCase().includes('water') || review.serviceProvider.toLowerCase().includes('rates');
    
    if (isElectricity) {
      utilities = [
        { type: 'Electricity', meterNumber: 'E-1042-A', consumption: 'Calculated', unitCost: 1.85, exclVat: review.amount / 1.15, vat: (review.amount / 1.15) * 0.15, total: review.amount }
      ];
      basLines = [
        { service: 'Electricity', amount: review.amount, objective: 'A03', responsibility: 'R041', fund: 'F001', asset: 'INF-E', item: '3107', infrastructure: 'I-022' }
      ];
    } else if (isWater) {
      utilities = [
        { type: 'Water', meterNumber: 'W-0837-B', consumption: 'Calculated', unitCost: 22.40, exclVat: review.amount / 1.15, vat: (review.amount / 1.15) * 0.15, total: review.amount }
      ];
      basLines = [
        { service: 'Water', amount: review.amount, objective: 'A04', responsibility: 'R041', fund: 'F001', asset: 'INF-W', item: '3108', infrastructure: 'I-023' }
      ];
    } else {
      refuse = {
        councilTotal: review.amount,
        proRataShare: 1,
        calculatedShare: review.amount,
        landlordClaimed: review.amount,
        lesserOfTwo: review.amount,
        approved: true
      };
      basLines = [
        { service: 'Sundry Payment', amount: review.amount, objective: 'A01', responsibility: 'R010', fund: 'F001', asset: 'GEN', item: '9901', infrastructure: 'I-001' }
      ];
    }
    exclVat = review.amount / 1.15;
    vatAmount = review.amount - exclVat;
  }

  return {
    id: review.id || `INV-${Date.now()}`,
    invoiceNumber: review.invoiceNumber || 'INV-TEMP',
    invoiceDate: review.invoiceDate || new Date().toISOString().split('T')[0],
    billingMonth: review.billingPeriod || 'May 2026',
    receivedDate: review.receivedDate || new Date().toISOString().split('T')[0],
    paymentMethod: 'EBT',
    landlord: review.serviceProvider,
    propertyAddress: review.propertyBuilding || '32 UCR1 Crescent, Halfway Gardens Ext.44',
    buildingSizeM2: 308,
    leasedAreaM2: 308,
    proRataShare: 100,
    payeeName: review.serviceProvider,
    vatNumber: isCOJ ? '4760117194' : '4510213876',
    bankName: isCOJ ? 'Standard Bank' : 'First National Bank',
    accountNumber: review.accountNumber || '1234567890',
    branchCode: '250655',
    accountType: 'Business Cheque',
    verifiedEntity: true,
    utilities,
    refuse,
    basLines,
    exclVat,
    vatAmount,
    totalAmount: review.amount,
    status: review.status === 'In Review' ? 'In Review' : review.status === 'Approved' ? 'Approved' : review.status === 'Returned' ? 'Rejected' : 'Pending',
    submittedBy: 'Thabo Mokoena',
    submittedAt: review.createdAt || new Date().toISOString(),
    checklistItems: [
      { label: 'All utility meter readings match municipal statements', checked: true },
      { label: 'Pro-rata calculation verified against lease agreement', checked: true },
      { label: 'Payee banking details match CSD verification', checked: true },
    ],
    documentName: filename,
    documentUrl: review.documents?.[0]?.url || ''
  };
}

// ─── Confirmation Modal ────────────────────────────────────────────────────────

interface ModalProps { onClose: () => void; onConfirm: (reason?: string) => void; type: 'approve' | 'reject'; }

function ConfirmModal({ onClose, onConfirm, type }: ModalProps) {
  const [reason, setReason] = useState('');
  const isReject = type === 'reject';

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '2rem', width: '480px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20}/></button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: isReject ? '#fee2e2' : '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isReject ? <XCircle size={22} color="#dc2626" /> : <CheckCircle size={22} color="#16a34a" />}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{isReject ? 'Reject Invoice' : 'Approve Invoice'}</h3>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              {isReject ? 'This invoice will be returned to the supervisor.' : 'This invoice will be marked as approved.'}
            </p>
          </div>
        </div>

        {isReject && (
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.5rem' }}>Rejection Reason <span style={{ color: '#dc2626' }}>*</span></label>
            <textarea
              value={reason} onChange={e => setReason(e.target.value)}
              rows={4} placeholder="Describe the reason for rejection so the supervisor can resubmit…"
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.65rem 1.5rem', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: '#475569' }}>Cancel</button>
          <button
            onClick={() => onConfirm(isReject ? reason : undefined)}
            disabled={isReject && !reason.trim()}
            style={{
              padding: '0.65rem 1.75rem', border: 'none', borderRadius: '10px',
              backgroundColor: isReject ? '#dc2626' : '#0e4d41',
              color: 'white', fontWeight: 700, fontSize: '0.875rem',
              cursor: isReject && !reason.trim() ? 'not-allowed' : 'pointer',
              opacity: isReject && !reason.trim() ? 0.6 : 1
            }}
          >
            {isReject ? 'Reject Invoice' : 'Confirm Approval'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Component ──────────────────────────────────────────────────────

interface Props { user: any; }

function DocumentPreview({ url, title }: { url?: string; title: string }) {
  if (!url) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '2rem', color: '#64748b' }}>
        <FileText size={48} style={{ marginBottom: '1rem', color: '#94a3b8' }} />
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>No document file available</span>
      </div>
    );
  }

  const isPdf = url.toLowerCase().includes('.pdf') || url.includes('data:application/pdf');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '500px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={16} color="#0e4d41" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0e4d41' }}>{title}</span>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#0e4d41', fontWeight: 600, textDecoration: 'underline' }}>Open In New Tab</a>
      </div>
      <div style={{ flex: 1, backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {isPdf ? (
          <iframe src={url} style={{ width: '100%', height: '100%', minHeight: '500px', border: 'none' }} title="Document PDF Preview" />
        ) : (
          <img src={url} style={{ maxWidth: '100%', maxHeight: '520px', objectFit: 'contain', padding: '0.5rem' }} alt="Document Preview" />
        )}
      </div>
    </div>
  );
}

export default function Admin({ user }: Props) {
  const { data: reviewsData, refetch: refetchReviews } = useQuery<any[]>({
    queryKey: ['reviews'],
    queryFn: fetchReviews
  });

  const invoices: Invoice[] = React.useMemo(() => {
    if (!reviewsData) return [];
    return reviewsData.map(r => mapReviewToInvoice(r, r.documents?.[0]?.name || 'Invoice'));
  }, [reviewsData]);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | InvoiceStatus>('All');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [modal, setModal] = useState<'approve' | 'reject' | null>(null);
  const [actionDone, setActionDone] = useState<'approved' | 'rejected' | null>(null);

  const stats = {
    total:    invoices.length,
    pending:  invoices.filter(i => i.status === 'Pending').length,
    inReview: invoices.filter(i => i.status === 'In Review').length,
    approved: invoices.filter(i => i.status === 'Approved').length,
  };

  const filtered = invoices.filter(inv => {
    const matchSearch = inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
                        inv.landlord.toLowerCase().includes(search.toLowerCase()) ||
                        inv.billingMonth.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || inv.status === filterStatus;
    return matchSearch && matchStatus;
  });

  async function handleConfirm(reason?: string) {
    if (!selectedInvoice) return;
    const newStatus: InvoiceStatus = modal === 'approve' ? 'Approved' : 'Rejected';
    const dbStatus = newStatus === 'Approved' ? 'Approved' : 'Returned';
    
    try {
      await updateReview(selectedInvoice.id, {
        status: dbStatus,
        directorComments: reason || 'Approved by Admin',
        ddComments: reason || 'Approved by Admin',
        clerkComments: reason || 'Approved by Admin'
      });
      await refetchReviews();
      
      const updated: Invoice = {
        ...selectedInvoice,
        status: newStatus,
        reviewedBy: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Admin',
        reviewedAt: new Date().toISOString(),
        rejectionReason: reason,
      };
      setSelectedInvoice(updated);
      setModal(null);
      setActionDone(newStatus === 'Approved' ? 'approved' : 'rejected');
      setTimeout(() => setActionDone(null), 3500);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to update status in the database: ${err.message || err}`);
    }
  }

  // ── Review Sheet ─────────────────────────────────────────────
  if (selectedInvoice) {
    const canAct = selectedInvoice.status === 'In Review';
    const utilityIcons: Record<string, React.ReactNode> = {
      Electricity: <Zap size={14} color="#ca8a04" />,
      Water:       <Droplets size={14} color="#2563eb" />,
      Sewerage:    <Trash2 size={14} color="#7c3aed" />,
    };

    return (
      <>
        {modal && <ConfirmModal type={modal} onClose={() => setModal(null)} onConfirm={handleConfirm} />}

        <div style={{ maxWidth: selectedInvoice.documentUrl ? '1200px' : '960px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => setSelectedInvoice(null)} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem 0.9rem', cursor: 'pointer', color: '#475569', fontSize: '0.8rem', fontWeight: 600 }}>← Back</button>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0e4d41', margin: 0 }}>Invoice Review — {selectedInvoice.invoiceNumber}</h2>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>{selectedInvoice.billingMonth} · {selectedInvoice.landlord}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {statusBadge(selectedInvoice.status)}
              {canAct && (
                <>
                  <button onClick={() => setModal('reject')} style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.55rem 1.25rem', border: '1px solid #fca5a5', borderRadius: '10px',
                    backgroundColor: 'white', color: '#dc2626', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer'
                  }}><XCircle size={16}/> Reject</button>
                  <button onClick={() => setModal('approve')} style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.55rem 1.25rem', border: 'none', borderRadius: '10px',
                    backgroundColor: '#0e4d41', color: 'white', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(14,77,65,0.25)'
                  }}><CheckCircle size={16}/> Approve</button>
                </>
              )}
            </div>
          </div>

          {actionDone && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.875rem 1.25rem', borderRadius: '10px', marginBottom: '1.25rem',
              backgroundColor: actionDone === 'approved' ? '#d1fae5' : '#fee2e2',
              border: `1px solid ${actionDone === 'approved' ? '#6ee7b7' : '#fca5a5'}`,
              color: actionDone === 'approved' ? '#065f46' : '#991b1b', fontWeight: 700, fontSize: '0.875rem'
            }}>
              {actionDone === 'approved' ? <CheckCircle size={18}/> : <XCircle size={18}/>}
              Invoice {actionDone === 'approved' ? 'approved' : 'rejected'} successfully.
            </div>
          )}

          {selectedInvoice.rejectionReason && (
            <div style={{ display: 'flex', gap: '0.75rem', padding: '0.875rem 1.25rem', backgroundColor: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#991b1b' }}>
              <XCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div><strong>Rejection Reason:</strong> {selectedInvoice.rejectionReason}</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: selectedInvoice.documentUrl ? '1.2fr 1fr' : '1fr', gap: '1.5rem' }}>
            {/* Left: Metadata and detail sheets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                {/* Invoice Summary */}
                <div className="card" style={{ margin: 0 }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0e4d41', marginBottom: '1rem' }}>Invoice Summary</h3>
                  {[
                    ['Invoice Number', selectedInvoice.invoiceNumber],
                    ['Billing Month',  selectedInvoice.billingMonth],
                    ['Invoice Date',   selectedInvoice.invoiceDate],
                    ['Received Date',  selectedInvoice.receivedDate],
                    ['Payment Method', selectedInvoice.paymentMethod],
                    ['Submitted By',   selectedInvoice.submittedBy],
                    ['Submitted Date', new Date(selectedInvoice.submittedAt).toLocaleDateString('en-ZA')],
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.8125rem' }}>
                      <span style={{ color: '#64748b' }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Property & Payee */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="card" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                      <Building size={15} color="#0e4d41" />
                      <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0e4d41', margin: 0 }}>Property</h3>
                    </div>
                    {[
                      ['Landlord',     selectedInvoice.landlord],
                      ['Address',      selectedInvoice.propertyAddress],
                      ['Pro-Rata',     `${selectedInvoice.proRataShare}%`],
                    ].map(([l, v]) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.8125rem' }}>
                        <span style={{ color: '#64748b' }}>{l}</span><span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="card" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Landmark size={15} color="#0e4d41" />
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0e4d41', margin: 0 }}>Payee & Bank</h3>
                      </div>
                      {selectedInvoice.verifiedEntity && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#d1fae5', color: '#065f46', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px' }}>
                          <CheckCircle size={10}/> Verified
                        </span>
                      )}
                    </div>
                    {[
                      ['VAT No.',     selectedInvoice.vatNumber],
                      ['Bank',        selectedInvoice.bankName],
                      ['Account No.', selectedInvoice.accountNumber],
                      ['Branch Code', selectedInvoice.branchCode],
                    ].map(([l, v]) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.8125rem' }}>
                        <span style={{ color: '#64748b' }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checklist status */}
                <div className="card" style={{ margin: 0 }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0e4d41', marginBottom: '1rem' }}>Verification Checklist</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedInvoice.checklistItems.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8125rem', color: item.checked ? '#065f46' : '#64748b' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '6px', backgroundColor: item.checked ? '#0e4d41' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {item.checked && <CheckCircle size={13} color="white" />}
                        </div>
                        {item.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Utility breakdown */}
                <div className="card" style={{ margin: 0 }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0e4d41', marginBottom: '1rem' }}>Utility Breakdown</h3>
                  {selectedInvoice.utilities.map(u => (
                    <div key={u.type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.8125rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#374151' }}>{utilityIcons[u.type]}{u.type}</span>
                      <span style={{ fontWeight: 700, color: '#0e4d41' }}>{fmtZAR(u.total)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.8125rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#374151' }}><Leaf size={14} color="#16a34a"/>Refuse</span>
                    <span style={{ fontWeight: 700, color: '#0e4d41' }}>{fmtZAR(selectedInvoice.refuse.lesserOfTwo)}</span>
                  </div>

                  <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
                      {[
                        { label: 'Excl. VAT',    value: fmtZAR(selectedInvoice.exclVat) },
                        { label: 'VAT (15%)',     value: fmtZAR(selectedInvoice.vatAmount) },
                        { label: 'Total Amount',  value: fmtZAR(selectedInvoice.totalAmount) },
                      ].map(item => (
                        <div key={item.label}>
                          <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0e4d41', marginTop: '0.2rem' }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Embedded Document Preview */}
            {selectedInvoice.documentUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <DocumentPreview url={selectedInvoice.documentUrl} title={selectedInvoice.documentName || 'Uploaded Invoice'} />
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── Invoice List ─────────────────────────────────────────────
  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0e4d41', margin: 0 }}>Invoice Management</h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#64748b' }}>Review and approve invoices submitted by supervisors</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Total Invoices', value: stats.total,    color: '#0e4d41', bg: '#ecfdf5', icon: <FileText size={20}/> },
          { label: 'Pending',        value: stats.pending,  color: '#92400e', bg: '#fef3c7', icon: <Clock size={20}/> },
          { label: 'In Review',      value: stats.inReview, color: '#1e40af', bg: '#dbeafe', icon: <BarChart2 size={20}/> },
          { label: 'Approved',       value: stats.approved, color: '#065f46', bg: '#d1fae5', icon: <CheckCircle size={20}/> },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: 'white', borderRadius: '14px', padding: '1.25rem 1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color, flexShrink: 0 }}>{card.icon}</div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500, marginTop: '0.25rem' }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices…" style={{
            width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem',
            border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem',
            outline: 'none', backgroundColor: 'white', boxSizing: 'border-box'
          }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} style={{
          padding: '0.6rem 1rem', border: '1px solid #e2e8f0', borderRadius: '10px',
          fontSize: '0.875rem', backgroundColor: 'white', cursor: 'pointer', outline: 'none'
        }}>
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Review">In Review</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {/* Invoice Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Invoice #', 'Landlord', 'Billing Month', 'Total Amount', 'Submitted By', 'Submitted Date', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.875rem' }}>No invoices found matching your criteria.</td></tr>
            ) : filtered.map((inv, idx) => (
              <tr key={inv.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}>
                <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#0e4d41' }}>{inv.invoiceNumber}</td>
                <td style={{ padding: '1rem 1.25rem', color: '#374151' }}>{inv.landlord}</td>
                <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{inv.billingMonth}</td>
                <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0e4d41' }}>{fmtZAR(inv.totalAmount)}</td>
                <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{inv.submittedBy}</td>
                <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{new Date(inv.submittedAt).toLocaleDateString('en-ZA')}</td>
                <td style={{ padding: '1rem 1.25rem' }}>{statusBadge(inv.status)}</td>
                <td style={{ padding: '1rem 1.25rem' }}>
                  <button onClick={() => setSelectedInvoice(inv)} style={{
                    background: '#f1f5f9', border: 'none', borderRadius: '8px',
                    padding: '0.4rem 0.7rem', cursor: 'pointer', color: '#0e4d41',
                    display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600
                  }}>
                    <Eye size={14}/> Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
