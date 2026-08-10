import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface LoadingContextType {
  isLoading: boolean;
  loadingText: string;
  progress: number | null;
  showLoading: (text?: string, progress?: number | null) => void;
  hideLoading: () => void;
  updateProgress: (progress: number | null, text?: string) => void;
  withLoading: <T>(
    action: () => Promise<T>,
    loadingMessage?: string,
    options?: { successMessage?: string; errorMessage?: string }
  ) => Promise<T>;
  showToast: (message: string, type?: ToastType) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Memproses data...');
  const [progress, setProgress] = useState<number | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showLoading = useCallback((text = 'Memproses data...', initialProgress: number | null = null) => {
    setLoadingText(text);
    setProgress(initialProgress);
    setIsLoading(true);
  }, []);

  const hideLoading = useCallback(() => {
    setIsLoading(false);
    setProgress(null);
  }, []);

  const updateProgress = useCallback((prog: number | null, text?: string) => {
    setProgress(prog);
    if (text) setLoadingText(text);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const withLoading = useCallback(
    async <T,>(
      action: () => Promise<T>,
      loadingMessage = 'Memproses data...',
      options?: { successMessage?: string; errorMessage?: string }
    ): Promise<T> => {
      showLoading(loadingMessage);
      try {
        const result = await action();
        if (options?.successMessage) {
          showToast(options.successMessage, 'success');
        }
        return result;
      } catch (error: any) {
        const errMsg = options?.errorMessage || error?.message || 'Terjadi kesalahan pada server.';
        showToast(errMsg, 'error');
        throw error;
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading, showToast]
  );

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        loadingText,
        progress,
        showLoading,
        hideLoading,
        updateProgress,
        withLoading,
        showToast,
      }}
    >
      {children}

      {/* Global Toast Container */}
      <div className="fixed top-5 right-5 z-[10000] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-xl border text-sm font-semibold transition-all transform animate-in slide-in-from-top-2 duration-300 ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : toast.type === 'error'
                ? 'bg-red-600 text-white border-red-500'
                : toast.type === 'warning'
                ? 'bg-amber-500 text-white border-amber-400'
                : 'bg-blue-600 text-white border-blue-500'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 shrink-0" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 shrink-0" />}
            <span className="flex-1 whitespace-pre-line leading-relaxed">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Global Fullscreen Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 transition-all duration-300 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center flex flex-col items-center gap-5 transform animate-in zoom-in-95 duration-200">
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border-4 border-blue-100 dark:border-slate-700 border-t-blue-600 dark:border-t-blue-500 animate-spin" />
              <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 absolute animate-pulse" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">{loadingText}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mohon tunggu sejenak, sedang berkomunikasi dengan server...
              </p>
            </div>

            {progress !== null && (
              <div className="w-full space-y-2 mt-2">
                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>Proses</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden p-0.5">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-300 shadow-xs"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};
