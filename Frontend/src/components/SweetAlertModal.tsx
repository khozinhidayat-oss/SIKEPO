import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface SweetAlertProps {
  isOpen: boolean;
  type: AlertType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const SweetAlertModal: React.FC<SweetAlertProps> = ({
  isOpen,
  type,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Batal',
  showCancel = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-bounce" />;
      case 'error':
        return <XCircle className="w-16 h-16 text-red-500 animate-pulse" />;
      case 'warning':
        return <AlertTriangle className="w-16 h-16 text-amber-500 animate-pulse" />;
      case 'info':
      default:
        return <Info className="w-16 h-16 text-blue-500" />;
    }
  };

  const getHeaderBg = () => {
    switch (type) {
      case 'success': return 'bg-emerald-50 text-emerald-800';
      case 'error': return 'bg-red-50 text-red-800';
      case 'warning': return 'bg-amber-50 text-amber-800';
      case 'info':
      default: return 'bg-blue-50 text-blue-800';
    }
  };

  const getBtnBg = () => {
    switch (type) {
      case 'success': return 'bg-emerald-600 hover:bg-emerald-700 text-white';
      case 'error': return 'bg-red-600 hover:bg-red-700 text-white';
      case 'warning': return 'bg-amber-600 hover:bg-amber-700 text-white';
      case 'info':
      default: return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 transform transition-all scale-100">
        <div className={`p-6 text-center flex flex-col items-center justify-center ${getHeaderBg()}`}>
          {getIcon()}
          <h3 className="mt-4 text-xl font-bold text-slate-800">{title}</h3>
        </div>
        <div className="p-6 text-center">
          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{message}</p>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          {showCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-5 py-2 text-sm font-semibold rounded-lg shadow-xs transition-colors ${getBtnBg()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
