// ConfirmDeleteModal.tsx
import React from "react";
import Button from "../ui/button/Button";

type ConfirmDeleteModalProps = {
  isOpen: boolean;
  tenantName: string;
  title: string;
  onClose: () => void;
  onConfirm: () => void;
};

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  tenantName,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-24 z-50">
      <div className="dark bg-slate-900/95 border border-white/20 text-white p-6 rounded-2xl shadow-2xl max-w-sm w-full">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <p className="mb-6 text-blue-100">
          Are you sure you want to delete{" "}
          <strong className="text-white">{tenantName}</strong>?
        </p>
        <div className="flex justify-end space-x-4">
          <Button onClick={onClose} variant="outline" size="sm">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            size="sm"
            className="from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
