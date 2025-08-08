import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ open, onClose, title, children }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);
  if (!open) return null;
  return ReactDOM.createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => {
        if (e.target === overlayRef.current) onClose();
      }}
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-[hsl(var(--card))] rounded-lg shadow-lg max-w-lg w-full mx-4 p-6 relative animate-fade-in border border-[hsl(var(--border))]">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground focus:outline-none"
          aria-label="Close modal"
        >
          <span aria-hidden="true">&times;</span>
        </button>
        {title && <h2 className="text-lg font-bold mb-4 font-mono">{title}</h2>}
        <div className="bg-[hsl(var(--background))] rounded-md p-4 border border-[hsl(var(--border))]">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal; 