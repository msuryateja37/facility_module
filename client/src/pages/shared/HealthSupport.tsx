import React from 'react';
import { Phone, Mail, HelpCircle, Shield, FileText } from 'lucide-react';

export default function HealthSupport() {
  const faqs = [
    {
      q: "How do I move a compliance review from Verification to DD Approval?",
      a: "The Supervisor must first verify the checklist under the 'Verification' tab, upload the inspection report, and click the 'Sign Off and Approve' button. This changes the status to 'Verified', moving it to the Deputy Director's queue."
    },
    {
      q: "What is required for the Finance Payment Form?",
      a: "The Financial Department must fill out all 7 pages of the payment voucher wizard. It requires valid bank confirmations, cost allocations, and final supervisor signatures."
    },
    {
      q: "Who handles archival records?",
      a: "Internal Control (IC) Officers manage the Archival Management section where reviews are registered into physical box numbers and shelves for record-keeping."
    }
  ];

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--color-primary)' }}>Health & Support Helpdesk</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Access contact centers, guidelines, and troubleshooting.
        </p>
      </div>

      <div className="grid-cols-3">
        {/* Contact list */}
        <div className="card" style={{ gridColumn: 'span 1' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Phone size={18} style={{ color: 'var(--color-primary)' }} /> Support Contacts
          </h3>
          
          <div style={{ fontSize: '0.875rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <strong>IT Systems Helpdesk</strong>
              <div style={{ color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>+27 (12) 312 8300</div>
              <div style={{ color: 'var(--color-text-muted)' }}>helpdesk@dlrrd.gov.za</div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <strong>Compliance & Audits</strong>
              <div style={{ color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>+27 (12) 312 8411</div>
              <div style={{ color: 'var(--color-text-muted)' }}>compliance@dlrrd.gov.za</div>
            </div>

            <div>
              <strong>Finance Department Support</strong>
              <div style={{ color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>+27 (12) 312 8900</div>
              <div style={{ color: 'var(--color-text-muted)' }}>finance.queries@dlrrd.gov.za</div>
            </div>
          </div>
        </div>

        {/* Support articles */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HelpCircle size={18} style={{ color: 'var(--color-primary)' }} /> Frequently Asked Questions
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {faqs.map((faq, index) => (
              <div key={index} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-primary-dark)', marginBottom: '0.375rem' }}>
                  {faq.q}
                </h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-dark)', lineHeight: '1.5' }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: 'var(--color-primary-light)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-sage-light)'
          }}>
            <Shield size={24} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: '0.875rem', color: 'var(--color-primary-dark)' }}>Security Compliance Policy</strong>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-dark)', marginTop: '0.125rem' }}>
                All file uploads are scanned for security. Ensure documents are in PDF format and do not exceed 10MB in size. Never share system logins outside of authorized channels.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
