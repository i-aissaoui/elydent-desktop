"use client";

// Modal component - no state needed
import { AlertTriangle, X } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = "Oui, supprimer",
  cancelText = "Annuler",
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-300'>
        {/* Header */}
        <div className='bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <AlertTriangle size={24} className='text-red-600' />
            <h2 className='text-xl font-black text-gray-900'>{title}</h2>
          </div>
          <button
            onClick={onCancel}
            className='text-gray-500 hover:text-gray-700 transition-colors'
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className='px-6 py-6'>
          <p className='text-gray-700 leading-relaxed'>{message}</p>
        </div>

        {/* Footer */}
        <div className='bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3'>
          <button
            onClick={onCancel}
            className='flex-1 px-4 py-2 bg-gray-200 text-gray-900 font-bold rounded-lg hover:bg-gray-300 transition-colors'
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className='flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors'
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
