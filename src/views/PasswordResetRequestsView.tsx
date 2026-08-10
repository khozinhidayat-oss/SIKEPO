import React, { useState, useEffect } from 'react';
import { PasswordResetRequest, UserRole } from '../types';
import { ApiService } from '../services/api';
import { getPasswordResetRequests, processPasswordResetRequestLocal } from '../utils/storage';
import { 
  KeyRound, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Check, 
  X, 
  Lock, 
  Eye, 
  EyeOff, 
  Phone, 
  Mail, 
  User, 
  Calendar,
  Sparkles
} from 'lucide-react';

interface PasswordResetRequestsViewProps {
  role?: UserRole;
  userName?: string;
  onNavigateTab?: (tab: string) => void;
}

export const PasswordResetRequestsView: React.FC<PasswordResetRequestsViewProps> = ({
  role = 'admin',
  userName = 'Admin',
  onNavigateTab
}) => {
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Menunggu Persetujuan' | 'Disetujui' | 'Ditolak'>('Semua');

  // Action Modals
  const [selectedReq, setSelectedReq] = useState<PasswordResetRequest | null>(null);
  const [modalType, setModalType] = useState<'approve' | 'reject' | null>(null);
  
  // Approve Form State
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [processSuccess, setProcessSuccess] = useState<string | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await ApiService.getPasswordResetRequests();
      if (res && res.success && Array.isArray(res.data)) {
        setRequests(res.data);
      } else {
        setRequests(getPasswordResetRequests());
      }
    } catch (e) {
      setRequests(getPasswordResetRequests());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pass = 'SP';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
  };

  const handleOpenApproveModal = (req: PasswordResetRequest) => {
    setSelectedReq(req);
    setModalType('approve');
    setNewPassword('');
    setAdminNote('');
    setProcessError(null);
    setProcessSuccess(null);
    generateRandomPassword();
  };

  const handleOpenRejectModal = (req: PasswordResetRequest) => {
    setSelectedReq(req);
    setModalType('reject');
    setAdminNote('');
    setProcessError(null);
    setProcessSuccess(null);
  };

  const handleProcessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !modalType) return;

    if (modalType === 'approve' && !newPassword.trim()) {
      setProcessError('Password baru wajib diisi untuk persetujuan reset password.');
      return;
    }

    setIsProcessing(true);
    setProcessError(null);

    const status = modalType === 'approve' ? 'Disetujui' : 'Ditolak';

    try {
      // 1. Try ApiService
      const apiRes = await ApiService.processPasswordResetRequest({
        requestId: selectedReq.id,
        status,
        newPassword: modalType === 'approve' ? newPassword.trim() : undefined,
        adminName: userName,
        catatanAdmin: adminNote.trim()
      });

      if (apiRes && apiRes.success) {
        setProcessSuccess(apiRes.message || `Permintaan reset password berhasil ${status.toLowerCase()}.`);
        await fetchRequests();
        setTimeout(() => {
          setModalType(null);
          setSelectedReq(null);
        }, 1200);
        return;
      }

      // 2. Local Fallback
      const localRes = processPasswordResetRequestLocal(
        selectedReq.id,
        status,
        modalType === 'approve' ? newPassword.trim() : undefined,
        userName,
        adminNote.trim()
      );

      if (localRes.success) {
        setProcessSuccess(localRes.message);
        await fetchRequests();
        setTimeout(() => {
          setModalType(null);
          setSelectedReq(null);
        }, 1200);
      } else {
        setProcessError(localRes.message);
      }
    } catch (err: any) {
      setProcessError('Gagal memproses permintaan: ' + (err.message || 'Kesalahan sistem'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter Data
  const filteredRequests = requests.filter(req => {
    const matchStatus = statusFilter === 'Semua' || req.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchSearch = 
      req.username.toLowerCase().includes(term) ||
      req.nama.toLowerCase().includes(term) ||
      req.email.toLowerCase().includes(term) ||
      (req.nomorWhatsapp && req.nomorWhatsapp.includes(term)) ||
      req.alasan.toLowerCase().includes(term);

    return matchStatus && matchSearch;
  });

  // KPI Metrics
  const totalCount = requests.length;
  const pendingCount = requests.filter(r => r.status === 'Menunggu Persetujuan').length;
  const approvedCount = requests.filter(r => r.status === 'Disetujui').length;
  const rejectedCount = requests.filter(r => r.status === 'Ditolak').length;

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300 border border-white/20 shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Permintaan Reset Password</h1>
              <p className="text-xs text-amber-100/80 mt-0.5">
                Kelola permintaan pengajuan reset kata sandi akun pengguna dari halaman login
              </p>
            </div>
          </div>
          <button
            onClick={fetchRequests}
            disabled={isLoading}
            className="self-start sm:self-auto px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-md border border-white/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan Data</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Pengajuan</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Menunggu Persetujuan</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Disetujui</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{approvedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">Ditolak</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{rejectedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari username, nama, email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {(['Semua', 'Menunggu Persetujuan', 'Disetujui', 'Ditolak'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Tanggal Permintaan</th>
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">Kontak</th>
                <th className="py-3 px-4">Alasan Reset</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi / Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs text-slate-700 dark:text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Memuat daftar permintaan reset password...</span>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <KeyRound className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold">Tidak ada data permintaan reset password</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {searchTerm || statusFilter !== 'Semua' ? 'Coba ubah kata kunci atau filter status' : 'Belum ada pengajuan dari halaman login'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req, idx) => {
                  const dateFormatted = req.tanggal ? new Date(req.tanggal).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '-';

                  return (
                    <tr key={req.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{dateFormatted}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{req.nama}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">@{req.username}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5 text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{req.email}</span>
                          </div>
                          {req.nomorWhatsapp && (
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                              <Phone className="w-3 h-3 shrink-0" />
                              <span>{req.nomorWhatsapp}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-slate-600 dark:text-slate-300 line-clamp-2 leading-snug">{req.alasan || '-'}</p>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {req.status === 'Disetujui' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Disetujui</span>
                          </span>
                        ) : req.status === 'Ditolak' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <XCircle className="w-3 h-3" />
                            <span>Ditolak</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3 h-3" />
                            <span>Menunggu</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {req.status === 'Menunggu Persetujuan' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenApproveModal(req)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Setujui</span>
                            </button>
                            <button
                              onClick={() => handleOpenRejectModal(req)}
                              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Tolak</span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400">
                            <p>Diproses oleh: <span className="font-semibold text-slate-600 dark:text-slate-300">{req.diprosesOleh || 'Admin'}</span></p>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL PROSES APPROVE / REJECT ================= */}
      {modalType && selectedReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  modalType === 'approve'
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400'
                }`}>
                  {modalType === 'approve' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {modalType === 'approve' ? 'Setujui Reset Password' : 'Tolak Permintaan Reset'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pengguna: <strong className="text-slate-800 dark:text-slate-200">{selectedReq.nama}</strong> (@{selectedReq.username})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error message */}
            {processError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{processError}</span>
              </div>
            )}

            {/* Success message */}
            {processSuccess ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 font-bold text-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{processSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleProcessSubmit} className="space-y-4">
                {modalType === 'approve' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Password Baru <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Acak Password</span>
                      </button>
                    </div>

                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Ketik password baru untuk pengguna"
                        className="w-full pl-9 pr-10 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Password ini akan langsung tersimpan di database untuk pengguna @{selectedReq.username}.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Catatan Administrator <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder={modalType === 'approve' ? 'Catatan untuk log aktivitas...' : 'Sebutkan alasan penolakan permintaan...'}
                    value={adminNote}
                    onChange={e => setAdminNote(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className={`px-5 py-2 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      modalType === 'approve'
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                        : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : modalType === 'approve' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Setujui & Ubah Password</span>
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5" />
                        <span>Tolak Permintaan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
