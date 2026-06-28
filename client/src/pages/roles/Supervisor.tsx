import React, { useState, useRef, useEffect } from 'react';
import {
  FileText, Upload, Search, Eye, Plus, ChevronRight, ChevronDown,
  CheckCircle, XCircle, Clock, BarChart2, AlertTriangle, Pen,
  Building, Landmark, Zap, Droplets, Trash2, Leaf, CheckSquare, Square
} from 'lucide-react';
import { Invoice, InvoiceStatus, UtilityLine, RefuseCalc, BASLine } from '../../types';

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

// ─── Mock data generator ───────────────────────────────────────────────────────

function generateMockInvoice(override?: Partial<Invoice>): Invoice {
  const utils: UtilityLine[] = [
    { type: 'Electricity', meterNumber: 'E-1042-A', consumption: '12 450 kWh', unitCost: 1.85, exclVat: 23032.50, vat: 3454.88, total: 26487.38 },
    { type: 'Water',       meterNumber: 'W-0837-B', consumption: '340 kl',     unitCost: 22.40, exclVat: 7616.00,  vat: 1142.40, total: 8758.40  },
    { type: 'Sewerage',    meterNumber: 'S-0122-C', consumption: 'N/A',        unitCost: 0,     exclVat: 2450.00,  vat: 367.50,  total: 2817.50  },
  ];
  const refuse: RefuseCalc = {
    councilTotal: 18200.00, proRataShare: 0.32,
    calculatedShare: 5824.00, landlordClaimed: 5100.00,
    lesserOfTwo: 5100.00, approved: true
  };
  const bas: BASLine[] = [
    { service: 'Electricity', amount: 26487.38, objective: 'A03',  responsibility: 'R041', fund: 'F001', asset: 'INF-E', item: '3107', infrastructure: 'I-022' },
    { service: 'Water',       amount: 8758.40,  objective: 'A04',  responsibility: 'R041', fund: 'F001', asset: 'INF-W', item: '3108', infrastructure: 'I-023' },
    { service: 'Sewerage',    amount: 2817.50,  objective: 'A04',  responsibility: 'R042', fund: 'F001', asset: 'INF-S', item: '3109', infrastructure: 'I-024' },
    { service: 'Refuse',      amount: 5100.00,  objective: 'A05',  responsibility: 'R043', fund: 'F001', asset: 'INF-R', item: '3110', infrastructure: 'I-025' },
  ];
  const exclVat = utils.reduce((s, u) => s + u.exclVat, 0) + refuse.lesserOfTwo;
  const vatAmount = utils.reduce((s, u) => s + u.vat, 0);
  return {
    id: `INV-${Date.now()}`,
    invoiceNumber: 'INV-2026-1142',
    invoiceDate: '2026-06-01',
    billingMonth: 'June 2026',
    receivedDate: '2026-06-15',
    paymentMethod: 'EBT',
    landlord: 'Batho Property Holdings (Pty) Ltd',
    propertyAddress: 'Erf 1142, 18 Proes Street, Pretoria CBD, 0002',
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
    status: 'Pending',
    submittedBy: 'Thabo Mokoena',
    submittedAt: new Date().toISOString(),
    checklistItems: [
      { label: 'All utility meter readings match municipal statements', checked: false },
      { label: 'Pro-rata calculation verified against lease agreement', checked: false },
      { label: 'Payee banking details match CSD verification', checked: false },
    ],
    ...override,
  };
}

// ─── Step indicators ───────────────────────────────────────────────────────────

const STEPS = ['Identification', 'Utilities', 'BAS Allocation', 'Sign-off'];

function StepBar({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '2rem' }}>
      {STEPS.map((label, i) => {
        const done    = i < step;
        const active  = i === step;
        const pending = i > step;
        return (
          <React.Fragment key={label}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.8rem',
                backgroundColor: done ? '#0e4d41' : active ? '#d8c14c' : '#e2e8f0',
                color: done ? 'white' : active ? '#0e4d41' : '#94a3b8',
                border: active ? '3px solid #0e4d41' : '3px solid transparent',
                boxShadow: active ? '0 0 0 4px rgba(14,77,65,0.15)' : 'none',
                transition: 'all 0.3s ease',
              }}>
                {done ? <CheckCircle size={18} /> : i + 1}
              </div>
              <span style={{
                marginTop: '0.375rem', fontSize: '0.7rem', fontWeight: active ? 700 : 500,
                color: active ? '#0e4d41' : done ? '#0e4d41' : '#94a3b8',
                textAlign: 'center', whiteSpace: 'nowrap'
              }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 2, height: '3px', marginBottom: '1.1rem',
                backgroundColor: done ? '#0e4d41' : '#e2e8f0',
                transition: 'background-color 0.4s ease'
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Signature Canvas ──────────────────────────────────────────────────────────

function SignatureCanvas({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing   = useRef(false);
  const [hasSig, setHasSig] = useState(false);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
    setHasSig(true);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#0e4d41';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function stopDraw() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current!;
    onSave(canvas.toDataURL());
  }

  function clear() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
    onSave('');
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={480} height={160}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        style={{
          display: 'block', width: '100%', height: '140px',
          border: '2px dashed #0e4d41', borderRadius: '8px',
          cursor: 'crosshair', backgroundColor: '#f8fafc', touchAction: 'none'
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem' }}>
        <span style={{ color: '#64748b' }}>Draw your signature above</span>
        {hasSig && (
          <button onClick={clear} style={{
            background: 'none', border: 'none', color: '#dc2626',
            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600
          }}>Clear</button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface Props {
  user: any;
}

export default function Supervisor({ user }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    // Seed with demo data
    const demo1 = generateMockInvoice({ id: 'INV-001', invoiceNumber: 'INV-2026-0891', billingMonth: 'May 2026', status: 'In Review', submittedAt: '2026-06-10T08:00:00Z', landlord: 'Seriti Office Parks' });
    const demo2 = generateMockInvoice({ id: 'INV-002', invoiceNumber: 'INV-2026-1007', billingMonth: 'May 2026', status: 'Approved',   submittedAt: '2026-06-12T10:30:00Z', landlord: 'Blue Dawn Properties' });
    return [demo1, demo2];
  });

  // List view state
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | InvoiceStatus>('All');

  // Wizard state
  const [wizardMode, setWizardMode]       = useState<'list' | 'new' | 'view'>('list');
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [step, setStep]                   = useState(0);
  const [invoice, setInvoice]             = useState<Invoice>(() => generateMockInvoice());
  const [ocrLoading, setOcrLoading]       = useState(false);
  const [ocrDone, setOcrDone]             = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [submitted, setSubmitted]         = useState(false);

  // Derived stats
  const stats = {
    total:     invoices.length,
    pending:   invoices.filter(i => i.status === 'Pending').length,
    inReview:  invoices.filter(i => i.status === 'In Review').length,
    approved:  invoices.filter(i => i.status === 'Approved').length,
  };

  const filtered = invoices.filter(inv => {
    const matchSearch = inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
                        inv.landlord.toLowerCase().includes(search.toLowerCase()) ||
                        inv.billingMonth.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || inv.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── Wizard handlers ──────────────────────────────────────────

  function startNew() {
    setInvoice(generateMockInvoice());
    setStep(0);
    setOcrDone(false);
    setOcrLoading(false);
    setSubmitted(false);
    setWizardMode('new');
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    simulateOcr(file.name);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    simulateOcr(file.name);
  }

  function simulateOcr(filename: string) {
    setOcrLoading(true);
    setOcrDone(false);
    setTimeout(() => {
      setOcrLoading(false);
      setOcrDone(true);
      setInvoice(prev => ({ ...prev, documentName: filename }));
    }, 2200);
  }

  function toggleChecklist(idx: number) {
    setInvoice(prev => ({
      ...prev,
      checklistItems: prev.checklistItems.map((item, i) =>
        i === idx ? { ...item, checked: !item.checked } : item
      )
    }));
  }

  function submitInvoice() {
    const finalInvoice: Invoice = { ...invoice, status: 'In Review', submittedAt: new Date().toISOString(), submittedBy: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Thabo Mokoena' };
    setInvoices(prev => [finalInvoice, ...prev]);
    setSubmitted(true);
    setTimeout(() => {
      setWizardMode('list');
      setSubmitted(false);
    }, 1800);
  }

  // ── Render ───────────────────────────────────────────────────

  if (wizardMode === 'view' && viewingInvoice) {
    return <InvoiceDetailView invoice={viewingInvoice} onBack={() => setWizardMode('list')} />;
  }

  if (wizardMode === 'new') {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button onClick={() => setWizardMode('list')} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem 0.9rem', cursor: 'pointer', color: '#475569', fontSize: '0.8rem', fontWeight: 600 }}>← Back</button>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0e4d41', margin: 0 }}>New Invoice Submission</h2>
        </div>

        <StepBar step={step} />

        {step === 0 && <Step1 invoice={invoice} ocrLoading={ocrLoading} ocrDone={ocrDone} onFileDrop={handleFileDrop} onFileInput={handleFileInput} onNext={() => setStep(1)} />}
        {step === 1 && <Step2 invoice={invoice} onBack={() => setStep(0)} onNext={() => setStep(2)} />}
        {step === 2 && <Step3 invoice={invoice} openAccordion={openAccordion} setOpenAccordion={setOpenAccordion} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
        {step === 3 && <Step4 invoice={invoice} submitted={submitted} onToggle={toggleChecklist} onSign={sig => setInvoice(p => ({ ...p, signature: sig }))} onBack={() => setStep(2)} onSubmit={submitInvoice} />}
      </div>
    );
  }

  // ── Invoice List ─────────────────────────────────────────────
  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0e4d41', margin: 0 }}>Invoice Management</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#64748b' }}>Submit and track facility utility invoices</p>
        </div>
        <button onClick={startNew} style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          backgroundColor: '#0e4d41', color: 'white', border: 'none',
          padding: '0.65rem 1.25rem', borderRadius: '10px', fontWeight: 700,
          fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(14,77,65,0.25)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease'
        }}>
          <Plus size={16} /> New Invoice
        </button>
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
            <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color, flexShrink: 0 }}>
              {card.icon}
            </div>
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
              {['Invoice #', 'Landlord', 'Billing Month', 'Total Amount', 'Submitted', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.875rem' }}>No invoices found. Click "New Invoice" to create one.</td></tr>
            ) : filtered.map((inv, idx) => (
              <tr key={inv.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}>
                <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#0e4d41' }}>{inv.invoiceNumber}</td>
                <td style={{ padding: '1rem 1.25rem', color: '#374151' }}>{inv.landlord}</td>
                <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{inv.billingMonth}</td>
                <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0e4d41' }}>{fmtZAR(inv.totalAmount)}</td>
                <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{new Date(inv.submittedAt).toLocaleDateString('en-ZA')}</td>
                <td style={{ padding: '1rem 1.25rem' }}>{statusBadge(inv.status)}</td>
                <td style={{ padding: '1rem 1.25rem' }}>
                  <button onClick={() => { setViewingInvoice(inv); setWizardMode('view'); }} style={{
                    background: '#f1f5f9', border: 'none', borderRadius: '8px',
                    padding: '0.4rem 0.7rem', cursor: 'pointer', color: '#0e4d41',
                    display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600
                  }}>
                    <Eye size={14}/> View
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

// ─── Step 1: Identification ────────────────────────────────────────────────────

function Step1({ invoice, ocrLoading, ocrDone, onFileDrop, onFileInput, onNext }: {
  invoice: Invoice; ocrLoading: boolean; ocrDone: boolean;
  onFileDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNext: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      {/* Left: Upload */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0e4d41', marginBottom: '1rem' }}>Document Upload</h3>
          <div
            onDragOver={e => e.preventDefault()} onDrop={onFileDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: '2px dashed #0e4d41', borderRadius: '12px', padding: '2.5rem 1.5rem',
              textAlign: 'center', cursor: 'pointer', backgroundColor: '#f0fdf4',
              transition: 'background-color 0.2s ease'
            }}
          >
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={onFileInput} style={{ display: 'none' }} />
            {ocrLoading ? (
              <>
                <div style={{ width: '36px', height: '36px', border: '3px solid #0e4d41', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
                <p style={{ color: '#0e4d41', fontWeight: 600, margin: 0 }}>Processing OCR…</p>
                <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>Extracting invoice data</p>
              </>
            ) : ocrDone ? (
              <>
                <CheckCircle size={40} color="#0e4d41" style={{ marginBottom: '0.75rem' }} />
                <p style={{ color: '#0e4d41', fontWeight: 700, margin: 0 }}>Document processed</p>
                <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>{invoice.documentName}</p>
              </>
            ) : (
              <>
                <Upload size={40} color="#0e4d41" style={{ marginBottom: '0.75rem' }} />
                <p style={{ color: '#0e4d41', fontWeight: 700, margin: 0 }}>Drag & drop or click to upload</p>
                <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>PDF, JPG or PNG invoice</p>
              </>
            )}
          </div>
        </div>

        {/* Skeleton / OCR fields */}
        {ocrLoading ? (
          <div className="card" style={{ margin: 0 }}>
            {[60, 80, 50, 70].map((w, i) => (
              <div key={i} style={{ height: '14px', backgroundColor: '#e2e8f0', borderRadius: '6px', width: `${w}%`, marginBottom: '0.75rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : ocrDone && (
          <div className="card" style={{ margin: 0 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0e4d41', marginBottom: '1rem' }}>Extracted Invoice Fields</h3>
            {[
              ['Invoice Number', invoice.invoiceNumber],
              ['Invoice Date', invoice.invoiceDate],
              ['Billing Month', invoice.billingMonth],
              ['Received Date', invoice.receivedDate],
              ['Payment Method', invoice.paymentMethod],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.8125rem' }}>
                <span style={{ color: '#64748b' }}>{label}</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Property & Payee */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {ocrDone && (
          <>
            <div className="card" style={{ margin: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Building size={16} color="#0e4d41" />
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0e4d41', margin: 0 }}>Property Information</h3>
              </div>
              {[
                ['Landlord', invoice.landlord],
                ['Property Address', invoice.propertyAddress],
                ['Building Size', `${invoice.buildingSizeM2.toLocaleString()} m²`],
                ['Leased Area', `${invoice.leasedAreaM2.toLocaleString()} m²`],
                ['Pro-Rata Share', `${invoice.proRataShare}%`],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#64748b' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: '#0f172a', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
                </div>
              ))}
            </div>

            <div className="card" style={{ margin: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Landmark size={16} color="#0e4d41" />
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0e4d41', margin: 0 }}>Payee & Banking Details</h3>
                </div>
                {invoice.verifiedEntity && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: '#d1fae5', color: '#065f46', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                    <CheckCircle size={11} /> Verified Entity
                  </span>
                )}
              </div>
              {[
                ['Payee Name', invoice.payeeName],
                ['VAT Number', invoice.vatNumber],
                ['Bank', invoice.bankName],
                ['Account No.', invoice.accountNumber],
                ['Branch Code', invoice.branchCode],
                ['Account Type', invoice.accountType],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#64748b' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onNext} disabled={!ocrDone} style={{
          backgroundColor: ocrDone ? '#0e4d41' : '#e2e8f0', color: ocrDone ? 'white' : '#94a3b8',
          border: 'none', padding: '0.7rem 2rem', borderRadius: '10px',
          fontWeight: 700, fontSize: '0.875rem', cursor: ocrDone ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          Next: Utilities <ChevronRight size={16} />
        </button>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }`}</style>
    </div>
  );
}

// ─── Step 2: Utilities ─────────────────────────────────────────────────────────

function Step2({ invoice, onBack, onNext }: { invoice: Invoice; onBack: () => void; onNext: () => void }) {
  const utilityIcons: Record<string, React.ReactNode> = {
    Electricity: <Zap size={15} color="#ca8a04" />,
    Water:       <Droplets size={15} color="#2563eb" />,
    Sewerage:    <Trash2 size={15} color="#7c3aed" />,
  };

  const lesserOk = invoice.refuse.approved;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Utility Table */}
      <div className="card" style={{ margin: 0 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0e4d41', marginBottom: '1rem' }}>Utility Consumption & Charges</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0fdf4' }}>
                {['Service', 'Meter No.', 'Consumption', 'Unit Cost', 'Excl. VAT', 'VAT', 'Total'].map(h => (
                  <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#0e4d41', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.utilities.map(u => (
                <tr key={u.type} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>{utilityIcons[u.type]} {u.type}</td>
                  <td style={{ padding: '0.75rem', color: '#475569', fontFamily: 'monospace' }}>{u.meterNumber}</td>
                  <td style={{ padding: '0.75rem', color: '#475569' }}>{u.consumption}</td>
                  <td style={{ padding: '0.75rem', color: '#475569' }}>R {u.unitCost.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem' }}>{fmtZAR(u.exclVat)}</td>
                  <td style={{ padding: '0.75rem', color: '#64748b' }}>{fmtZAR(u.vat)}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 700, color: '#0e4d41' }}>{fmtZAR(u.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refuse Pro-Rata */}
      <div className="card" style={{ margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Leaf size={16} color="#16a34a" />
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0e4d41', margin: 0 }}>Refuse Pro-Rata Calculation</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
          {[
            { label: 'Council Total', value: fmtZAR(invoice.refuse.councilTotal) },
            { label: `Calculated Share (${invoice.refuse.proRataShare * 100}%)`, value: fmtZAR(invoice.refuse.calculatedShare) },
            { label: 'Landlord Claimed', value: fmtZAR(invoice.refuse.landlordClaimed) },
          ].map(item => (
            <div key={item.label} style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500, marginBottom: '0.25rem' }}>{item.label}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0e4d41' }}>{item.value}</div>
            </div>
          ))}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem',
          borderRadius: '10px', border: `1px solid ${lesserOk ? '#bbf7d0' : '#fecaca'}`,
          backgroundColor: lesserOk ? '#f0fdf4' : '#fef2f2'
        }}>
          {lesserOk ? <CheckCircle size={20} color="#16a34a" /> : <AlertTriangle size={20} color="#dc2626" />}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: lesserOk ? '#065f46' : '#991b1b' }}>
              Lesser-of-Two Rule: {lesserOk ? '✓ Approved' : '⚠ Capped'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Approved amount: <strong>{fmtZAR(invoice.refuse.lesserOfTwo)}</strong>
              {!lesserOk && ' — Claim exceeds pro-rata calculation, amount capped.'}
            </div>
          </div>
        </div>
      </div>

      {/* Consolidated Dossier Total */}
      <div className="card" style={{ margin: 0, border: '2px solid #0e4d41' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0e4d41', marginBottom: '1rem' }}>Consolidated Dossier Total</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[
            { label: 'Excl. VAT', value: fmtZAR(invoice.exclVat), color: '#374151' },
            { label: 'VAT (15%)', value: fmtZAR(invoice.vatAmount), color: '#374151' },
            { label: 'Total Amount', value: fmtZAR(invoice.totalAmount), color: '#0e4d41' },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: item.color, marginTop: '0.25rem' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.65rem 1.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: '#475569' }}>← Back</button>
        <button onClick={onNext} style={{ backgroundColor: '#0e4d41', color: 'white', border: 'none', padding: '0.65rem 2rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Next: BAS Allocation <ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

// ─── Step 3: BAS Allocation ────────────────────────────────────────────────────

function Step3({ invoice, openAccordion, setOpenAccordion, onBack, onNext }: {
  invoice: Invoice; openAccordion: string | null; setOpenAccordion: (k: string | null) => void; onBack: () => void; onNext: () => void;
}) {
  const totalAllocated = invoice.basLines.reduce((s, l) => s + l.amount, 0);
  const balanced = Math.abs(totalAllocated - invoice.totalAmount) < 0.01;

  const serviceIcons: Record<string, React.ReactNode> = {
    Electricity: <Zap size={15} color="#ca8a04" />, Water: <Droplets size={15} color="#2563eb" />,
    Sewerage: <Trash2 size={15} color="#7c3aed" />, Refuse: <Leaf size={15} color="#16a34a" />,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Balance Banner */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 1.5rem', borderRadius: '12px', border: `1px solid ${balanced ? '#bbf7d0' : '#fecaca'}`,
        backgroundColor: balanced ? '#f0fdf4' : '#fef2f2'
      }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Target Total</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0e4d41' }}>{fmtZAR(invoice.totalAmount)}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          {balanced
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#d1fae5', color: '#065f46', fontWeight: 700, padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.8rem' }}><CheckCircle size={14}/> Fully Allocated</span>
            : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 700, padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.8rem' }}><AlertTriangle size={14}/> Balance: {fmtZAR(invoice.totalAmount - totalAllocated)}</span>
          }
        </div>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Allocated</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0e4d41' }}>{fmtZAR(totalAllocated)}</div>
        </div>
      </div>

      {/* System Note */}
      <div style={{ display: 'flex', gap: '0.75rem', padding: '0.875rem 1.25rem', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe', fontSize: '0.8rem', color: '#1e40af' }}>
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
        <span>BAS codes are pre-populated from the approved master chart of accounts. All fields are locked to prevent unauthorised allocation changes.</span>
      </div>

      {/* Accordion per service */}
      {invoice.basLines.map(line => {
        const isOpen = openAccordion === line.service;
        return (
          <div key={line.service} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'white' }}>
            <button onClick={() => setOpenAccordion(isOpen ? null : line.service)} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: 700, color: '#0e4d41'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {serviceIcons[line.service]} {line.service}
                <span style={{ fontWeight: 800, marginLeft: '0.5rem' }}>{fmtZAR(line.amount)}</span>
              </div>
              <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
            </button>
            {isOpen && (
              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  {[
                    ['Objective', line.objective], ['Responsibility', line.responsibility], ['Fund', line.fund],
                    ['Asset', line.asset], ['Item', line.item], ['Infrastructure', line.infrastructure],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                      <input disabled value={value} style={{
                        width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0',
                        borderRadius: '8px', fontSize: '0.875rem', backgroundColor: '#f8fafc',
                        color: '#374151', fontWeight: 600, boxSizing: 'border-box', cursor: 'not-allowed'
                      }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.65rem 1.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: '#475569' }}>← Back</button>
        <button onClick={onNext} style={{ backgroundColor: '#0e4d41', color: 'white', border: 'none', padding: '0.65rem 2rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Next: Sign-off <ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

// ─── Step 4: Sign-off ──────────────────────────────────────────────────────────

function Step4({ invoice, submitted, onToggle, onSign, onBack, onSubmit }: {
  invoice: Invoice; submitted: boolean;
  onToggle: (idx: number) => void; onSign: (sig: string) => void;
  onBack: () => void; onSubmit: () => void;
}) {
  const allChecked = invoice.checklistItems.every(i => i.checked);
  const hasSig     = !!invoice.signature;
  const canSubmit  = allChecked && hasSig;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
      {/* Checklist */}
      <div className="card" style={{ margin: 0 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0e4d41', marginBottom: '1rem' }}>Verification Checklist</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {invoice.checklistItems.map((item, idx) => (
            <label key={idx} onClick={() => onToggle(idx)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: item.checked ? '#0e4d41' : '#374151', userSelect: 'none' }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${item.checked ? '#0e4d41' : '#cbd5e1'}`,
                backgroundColor: item.checked ? '#0e4d41' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.2s ease'
              }}>
                {item.checked && <CheckCircle size={14} color="white" />}
              </div>
              {item.label}
            </label>
          ))}
        </div>
      </div>

      {/* Signature */}
      <div className="card" style={{ margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Pen size={16} color="#0e4d41" />
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0e4d41', margin: 0 }}>Digital Signature</h3>
        </div>
        <SignatureCanvas onSave={onSign} />
      </div>

      {/* Compiled By blocks */}
      <div className="card" style={{ margin: 0 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0e4d41', marginBottom: '1rem' }}>Authorisation Record</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[
            { role: 'Compiled By', name: invoice.submittedBy, date: new Date().toLocaleDateString('en-ZA') },
            { role: 'Verified By',   name: '—', date: '—' },
            { role: 'Approved By',   name: '—', date: '—' },
          ].map(block => (
            <div key={block.role} style={{ textAlign: 'center', padding: '0.875rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>{block.role}</div>
              <div style={{ fontWeight: 700, color: '#0e4d41', fontSize: '0.875rem' }}>{block.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>{block.date}</div>
            </div>
          ))}
        </div>
      </div>

      {!canSubmit && (
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1rem', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '0.8rem', color: '#92400e' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          {!allChecked ? 'Please tick all checklist items.' : 'Please draw your signature.'}
        </div>
      )}

      {submitted && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', backgroundColor: '#d1fae5', borderRadius: '10px', border: '1px solid #6ee7b7', color: '#065f46', fontWeight: 700 }}>
          <CheckCircle size={20} /> Invoice submitted successfully! Redirecting…
        </div>
      )}

      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.65rem 1.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: '#475569' }}>← Back</button>
        <button onClick={onSubmit} disabled={!canSubmit || submitted} style={{
          backgroundColor: canSubmit ? '#0e4d41' : '#e2e8f0', color: canSubmit ? 'white' : '#94a3b8',
          border: 'none', padding: '0.65rem 2rem', borderRadius: '10px',
          fontWeight: 700, fontSize: '0.875rem', cursor: canSubmit ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: submitted ? 0.7 : 1
        }}>
          Submit to Admin <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Invoice Detail View (read-only) ──────────────────────────────────────────

function InvoiceDetailView({ invoice, onBack }: { invoice: Invoice; onBack: () => void }) {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button onClick={onBack} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem 0.9rem', cursor: 'pointer', color: '#475569', fontSize: '0.8rem', fontWeight: 600 }}>← Back</button>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0e4d41', margin: 0 }}>{invoice.invoiceNumber} — Details</h2>
        <div style={{ marginLeft: 'auto' }}>{statusBadge(invoice.status)}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0e4d41', marginBottom: '1rem' }}>Invoice Summary</h3>
          {[
            ['Invoice Number', invoice.invoiceNumber], ['Billing Month', invoice.billingMonth],
            ['Invoice Date', invoice.invoiceDate], ['Total Amount', fmtZAR(invoice.totalAmount)],
            ['Payment Method', invoice.paymentMethod], ['Submitted By', invoice.submittedBy],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.8125rem' }}>
              <span style={{ color: '#64748b' }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{ margin: 0 }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0e4d41', marginBottom: '1rem' }}>Utility Totals</h3>
          {invoice.utilities.map(u => (
            <div key={u.type} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.8125rem' }}>
              <span style={{ color: '#64748b' }}>{u.type}</span><span style={{ fontWeight: 600, color: '#0e4d41' }}>{fmtZAR(u.total)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', fontSize: '0.8125rem' }}>
            <span style={{ color: '#64748b' }}>Refuse</span><span style={{ fontWeight: 600, color: '#0e4d41' }}>{fmtZAR(invoice.refuse.lesserOfTwo)}</span>
          </div>
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#f0fdf4', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#0e4d41' }}>
            <span>Total</span><span>{fmtZAR(invoice.totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
