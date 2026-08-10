import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends (React.Component as any) {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[UNHANDLED REACT ERROR]', error, errorInfo);
    (this as any).setState({ errorInfo });
  }

  handleReset = () => {
    (this as any).setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    const state = (this as any).state as State;
    const props = (this as any).props as Props;

    if (state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-lg w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black mb-2 text-white">Terjadi Kesalahan Sistem</h2>
            <p className="text-slate-400 text-sm mb-6">
              Aplikasi mengalami kendala saat memuat komponen UI. Jangan khawatir, data Anda tetap aman.
            </p>

            {state.error && (
              <div className="bg-slate-950 rounded-xl p-4 text-left font-mono text-xs text-red-300 border border-red-900/50 mb-6 overflow-x-auto max-h-36">
                <p className="font-bold text-red-400 mb-1">{state.error.toString()}</p>
                {state.errorInfo && (
                  <pre className="text-slate-500 text-[10px] leading-relaxed">
                    {state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Refresh & Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return props.children;
  }
}
