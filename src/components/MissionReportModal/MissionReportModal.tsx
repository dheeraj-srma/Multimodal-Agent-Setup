import React, { useState } from 'react';
import { X, FileText, Copy, Check, Download } from 'lucide-react';
import './MissionReportModal.css';

interface MissionReportModalProps {
  reportText?: string;
  onClose: () => void;
}

export const MissionReportModal: React.FC<MissionReportModalProps> = ({ reportText, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!reportText) return;
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!reportText) return;
    const blob = new Blob([reportText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MISSION_REPORT_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop">
      <div className="report-modal-card">
        <div className="report-modal-header">
          <div className="rm-title-group">
            <FileText size={16} className="rm-icon" />
            <span className="rm-title">ORCHESTRATOR MISSION SYNTHESIS REPORT</span>
          </div>
          <div className="rm-header-actions">
            <button className="rm-action-btn" onClick={handleCopy} title="Copy to Clipboard">
              {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
              <span>{copied ? 'COPIED' : 'COPY'}</span>
            </button>
            <button className="rm-action-btn" onClick={handleDownload} title="Download Markdown">
              <Download size={14} />
              <span>EXPORT</span>
            </button>
            <button className="rm-close-btn" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="report-modal-body">
          {reportText ? (
            <pre className="report-markdown-view">{reportText}</pre>
          ) : (
            <div className="report-empty-view">
              <span>No mission report generated yet. Complete a mission to view synthesis.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
