import React from "react";

interface ModalProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({
  open,
  title,
  children,
  onClose,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 grid place-items-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-50 w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          <button
            className="rounded-full p-1.5 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close"
            disabled={!open}
          >Close draft</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;