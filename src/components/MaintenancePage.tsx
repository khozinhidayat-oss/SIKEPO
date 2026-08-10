import React, { useState, useEffect } from 'react';
import { MaintenanceSettings } from '../types';
import { ShieldAlert, RefreshCw, Clock, Wrench, Lock, ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface MaintenancePageProps {
  settings: MaintenanceSettings;
  schoolName?: string;
  logoUrl?: string;
  onRefresh: () => void;
  onAdminLoginClick?: () => void;
  isPreview?: boolean;
  onExitPreview?: () => void;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({
  settings,
  schoolName = 'SMART POINT SISWA',
  logoUrl,
  onRefresh,
  onAdminLoginClick,
  isPreview = false,
  onExitPreview
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live Countdown Timer logic
  useEffect(() => {
    if (!settings.endTime || !settings.showCountdown) return;

    const calculateTimeLeft = () => {
      const target = new Date(settings.endTime!).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [settings.endTime, settings.showCountdown]);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      onRefresh();
      setIsRefreshing(false);
    }, 600);
  };

  const formatDateTime = (dtStr?: string) => {
    if (!dtStr) return '-';
    try {
      const d = new Date(dtStr);
      if (isNaN(d.getTime())) return dtStr;
      return d.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dtStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      
      {/* Background Decorative Blur Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Preview Banner if in Admin Preview mode */}
      {isPreview && (
        <div className="fixed top-0 inset-x-0 bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md z-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>MODE PRATINJAU MAINTENANCE (Anda sedang melihat halaman ini sebagai Administrator)</span>
          </div>
          {onExitPreview && (
            <button
              onClick={onExitPreview}
              className="px-3 py-1 bg-slate-950 text-white rounded hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              Tutup Pratinjau
            </button>
          )}
        </div>
      )}

      {/* Main Card Container */}
      <div className={`w-full max-w-2xl bg-slate-800/90 backdrop-blur-md rounded-3xl border border-slate-700/80 shadow-2xl p-6 sm:p-10 relative z-10 my-8 ${isPreview ? 'mt-12' : ''}`}>
        
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center">
          
          {/* Animated Icon Badge */}
          <div className="relative mb-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 p-0.5 shadow-xl shadow-red-900/40">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-amber-400">
                <Wrench className="w-10 h-10 sm:w-12 sm:h-12 animate-pulse" />
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border-2 border-slate-900 shadow-sm">
              Maintenance
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-full text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>SISTEM DALAM PEMELIHARAAN</span>
          </div>

          {/* School & App Name */}
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-400">
            {schoolName}
          </h2>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
            {settings.title || 'Aplikasi Sedang Dalam Pemeliharaan'}
          </h1>

          {/* Message */}
          <p className="text-sm sm:text-base text-slate-300 mt-4 leading-relaxed max-w-xl">
            {settings.message || 'Maaf, aplikasi sedang dilakukan pemeliharaan dan pembaruan sistem. Seluruh fungsi CRUD dinonaktifkan sementara agar tidak terjadi kesalahan data.'}
          </p>
        </div>

        {/* Schedule & Countdown Box */}
        <div className="mt-8 bg-slate-900/80 rounded-2xl p-5 border border-slate-700/60 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <Clock className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-slate-400 block font-medium">Waktu Mulai</span>
                <span className="font-bold text-slate-200 mt-0.5 block">{formatDateTime(settings.startTime)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-slate-400 block font-medium">Estimasi Selesai</span>
                <span className="font-bold text-slate-200 mt-0.5 block">
                  {settings.endTime ? formatDateTime(settings.endTime) : 'Sampai Pemeliharaan Selesai'}
                </span>
              </div>
            </div>
          </div>

          {/* Countdown Display if enabled */}
          {settings.showCountdown && settings.endTime && (
            <div className="pt-2 border-t border-slate-800">
              <div className="text-center mb-3">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-400">
                  {timeLeft.isExpired ? 'WAKTU PEMELIHARAAN SELESAI (MENUNGGU SINKRONISASI)' : 'ESTIMASI WAKTU TERSISA'}
                </span>
              </div>

              {!timeLeft.isExpired ? (
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700">
                    <span className="text-xl sm:text-2xl font-black text-amber-400 block font-mono">
                      {String(timeLeft.days).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium uppercase">Hari</span>
                  </div>

                  <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700">
                    <span className="text-xl sm:text-2xl font-black text-amber-400 block font-mono">
                      {String(timeLeft.hours).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium uppercase">Jam</span>
                  </div>

                  <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700">
                    <span className="text-xl sm:text-2xl font-black text-amber-400 block font-mono">
                      {String(timeLeft.minutes).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium uppercase">Menit</span>
                  </div>

                  <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700">
                    <span className="text-xl sm:text-2xl font-black text-amber-400 block font-mono">
                      {String(timeLeft.seconds).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium uppercase">Detik</span>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-center text-xs text-amber-300">
                  Pemeliharaan dijadwalkan telah selesai. Sistem sedang melakukan finalisasi. Silakan muat ulang halaman.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Action Controls */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Refresh Page Button */}
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition-all active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Memeriksa Status...' : 'Refresh Halaman'}
          </button>

          {/* Admin Login Link / Bypass if allowed */}
          {settings.allowAdminAccess && onAdminLoginClick && (
            <button
              onClick={onAdminLoginClick}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 font-medium transition-colors py-2 px-3 rounded-lg hover:bg-slate-800"
            >
              <Lock className="w-3.5 h-3.5" /> Login Administrator <ArrowRight className="w-3 h-3" />
            </button>
          )}

        </div>

        {/* Footer Note */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 text-center text-[11px] text-slate-500">
          SMART POINT SISWA &bull; Hak Cipta dilindungi. Sistem Keamanan Sekolah & Kedisiplinan.
        </div>

      </div>

    </div>
  );
};
