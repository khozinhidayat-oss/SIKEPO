import React, { useState, useMemo, useEffect } from 'react';
import { User, UserRole } from '../types';
import { 
  getUsers, saveUser, resetUserPassword, changeUserStatus, softDeleteUser, 
  hashPassword, logActivity 
} from '../utils/storage';
import { ApiService } from '../services/api';
import { useLoading } from '../context/LoadingContext';
import { 
  Users, UserPlus, Search, Filter, RefreshCw, Download, Edit3, Key, 
  Trash2, ShieldAlert, CheckCircle2, XCircle, AlertCircle, Eye, 
  X, Lock, ShieldCheck, Phone, Mail, UserCheck, UserX, Clock, 
  HelpCircle, Copy, Check, FileSpreadsheet, Sparkles, Building2, EyeOff
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SweetAlertModal, AlertType } from '../components/SweetAlertModal';

interface UsersViewProps {
  role: UserRole;
  userName: string;
  onNavigateTab?: (tab: string) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ role, userName, onNavigateTab }) => {
  const isAdmin = role === 'admin';
  const { showLoading, hideLoading, showToast } = useLoading();

  // Local States
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | 'admin' | 'kesiswaan'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'Aktif' | 'Nonaktif' | 'Dihapus'>('ALL');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form Add User State
  const [addForm, setAddForm] = useState({
    name: '',
    nipNik: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'kesiswaan' as UserRole,
    phone: '',
    status: 'Aktif' as 'Aktif' | 'Nonaktif'
  });
  const [showAddPass, setShowAddPass] = useState(false);

  // Form Edit User State
  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    nipNik: '',
    email: '',
    username: '',
    role: 'kesiswaan' as UserRole,
    phone: '',
    status: 'Aktif' as 'Aktif' | 'Nonaktif' | 'Dihapus'
  });

  // Form Reset Password State
  const [resetPassForm, setResetPassForm] = useState({
    userId: '',
    userName: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showResetPass, setShowResetPass] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // SweetAlert Modal state
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
    showCancelButton?: boolean;
    confirmButtonText?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const fetchUsersData = async () => {
    setIsDataLoading(true);
    try {
      const res = await ApiService.getUsers();
      if (res.success && Array.isArray(res.data)) {
        setUsersList(res.data);
      } else {
        setUsersList(getUsers());
      }
    } catch (e) {
      console.error('Error fetching users:', e);
      setUsersList(getUsers());
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersData();
  }, []);

  // Reload Users List from storage
  const handleRefresh = () => {
    fetchUsersData();
  };

  // Close SweetAlert
  const closeAlert = () => {
    setAlertConfig(prev => ({ ...prev, isOpen: false }));
  };

  // Show SweetAlert helper
  const showAlert = (
    type: AlertType, 
    title: string, 
    message: string, 
    onConfirm?: () => void,
    showCancel = false,
    confirmText = 'OK'
  ) => {
    setAlertConfig({
      isOpen: true,
      type,
      title,
      message,
      showCancelButton: showCancel,
      confirmButtonText: confirmText,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        closeAlert();
      }
    });
  };

  // 403 Forbidden View for non-Admin
  if (!isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-red-200 dark:border-red-900/50 p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto border-4 border-red-50 dark:border-red-950/50 animate-bounce">
            <ShieldAlert className="w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <span className="px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-bold rounded-full uppercase tracking-wider">
              403 Forbidden
            </span>
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Akses Ditolak
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Anda tidak memiliki izin untuk mengakses halaman <span className="font-semibold text-slate-800 dark:text-slate-200">Kelola User</span>. Menu ini khusus untuk akun ber-role <span className="font-bold text-red-600 dark:text-red-400">Administrator</span>.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                if (onNavigateTab) onNavigateTab('dashboard');
                else window.location.hash = '#dashboard';
              }}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              Kembali ke Dashboard Utama
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filtered users calculation
  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || (
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.nipNik && u.nipNik.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q))
      );

      // Role filter
      const matchRole = filterRole === 'ALL' || u.role === filterRole;

      // Status filter
      let currentStatusNormalized = u.status === 'active' ? 'Aktif' : u.status === 'inactive' ? 'Nonaktif' : u.status;
      const matchStatus = filterStatus === 'ALL' || currentStatusNormalized === filterStatus;

      return matchSearch && matchRole && matchStatus;
    });
  }, [usersList, searchQuery, filterRole, filterStatus]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = usersList.length;
    const adminCount = usersList.filter(u => u.role === 'admin' && u.status !== 'Dihapus').length;
    const kesiswaanCount = usersList.filter(u => u.role === 'kesiswaan' && u.status !== 'Dihapus').length;
    const inactiveCount = usersList.filter(u => u.status === 'Nonaktif' || u.status === 'inactive' || u.status === 'Dihapus').length;
    return { total, adminCount, kesiswaanCount, inactiveCount };
  }, [usersList]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Handle Add User Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validation
    if (!addForm.name.trim()) {
      showAlert('error', 'Validasi Gagal', 'Nama Lengkap pengguna wajib diisi.');
      return;
    }

    if (!addForm.email.trim()) {
      showAlert('error', 'Validasi Gagal', 'Email pengguna wajib diisi.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(addForm.email.trim())) {
      showAlert('error', 'Validasi Gagal', 'Format email tidak valid. Contoh: user@sekolah.sch.id');
      return;
    }

    // Check duplicate email
    const duplicateEmail = usersList.find(u => u.email.toLowerCase() === addForm.email.trim().toLowerCase());
    if (duplicateEmail) {
      showAlert('error', 'Email Terdaftar', `Email "${addForm.email}" sudah digunakan oleh pengguna lain.`);
      return;
    }

    if (!addForm.username.trim()) {
      showAlert('error', 'Validasi Gagal', 'Username wajib diisi.');
      return;
    }

    // Check duplicate username
    const duplicateUser = usersList.find(u => u.username && u.username.toLowerCase() === addForm.username.trim().toLowerCase());
    if (duplicateUser) {
      showAlert('error', 'Username Terdaftar', `Username "${addForm.username}" sudah dipakai.`);
      return;
    }

    if (!addForm.password || addForm.password.length < 8) {
      showAlert('error', 'Validasi Password', 'Password minimal terdiri dari 8 karakter.');
      return;
    }

    if (addForm.password !== addForm.confirmPassword) {
      showAlert('error', 'Password Tidak Cocok', 'Password dan Konfirmasi Password harus persis sama.');
      return;
    }

    // 2. Hash password & Save via REST API
    setIsSaving(true);
    showLoading('Menambahkan pengguna baru...');
    ApiService.saveUser({
      name: addForm.name.trim(),
      nipNik: addForm.nipNik.trim() || '-',
      email: addForm.email.trim().toLowerCase(),
      username: addForm.username.trim(),
      passwordHash: hashPassword(addForm.password),
      role: addForm.role,
      phone: addForm.phone.trim() || '-',
      status: addForm.status,
      createdBy: userName
    }).then(async res => {
      setIsSaving(false);
      hideLoading();
      if (res.success) {
        logActivity(
          userName,
          role,
          'TAMBAH_USER',
          `Menambahkan pengguna baru: ${addForm.name} (${addForm.username}) dengan role ${addForm.role}`,
          addForm.email,
          'Kelola User'
        );

        await fetchUsersData();
        setIsAddModalOpen(false);

        // Reset Form
        setAddForm({
          name: '',
          nipNik: '',
          email: '',
          username: '',
          password: '',
          confirmPassword: '',
          role: 'kesiswaan',
          phone: '',
          status: 'Aktif'
        });

        showToast(res.message || `Akun untuk ${addForm.name} berhasil dibuat.`, 'success');
      } else {
        showToast(res.message || 'Gagal menyimpan user ke Google Apps Script.', 'error');
      }
    }).catch(err => {
      setIsSaving(false);
      hideLoading();
      showToast(err.message || 'Gagal terhubung ke backend.', 'error');
    });
  };

  // Open Edit Modal
  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    let statusFormatted: 'Aktif' | 'Nonaktif' | 'Dihapus' = 'Aktif';
    if (user.status === 'inactive' || user.status === 'Nonaktif') statusFormatted = 'Nonaktif';
    else if (user.status === 'Dihapus') statusFormatted = 'Dihapus';

    setEditForm({
      id: user.id,
      name: user.name || '',
      nipNik: user.nipNik || '',
      email: user.email || '',
      username: user.username || user.email.split('@')[0],
      role: user.role,
      phone: user.phone || '',
      status: statusFormatted
    });
    setIsEditModalOpen(true);
  };

  // Handle Edit User Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!editForm.name.trim()) {
      showAlert('error', 'Validasi Gagal', 'Nama Lengkap pengguna wajib diisi.');
      return;
    }

    if (!editForm.email.trim()) {
      showAlert('error', 'Validasi Gagal', 'Email wajib diisi.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editForm.email.trim())) {
      showAlert('error', 'Validasi Gagal', 'Format email tidak valid.');
      return;
    }

    // Check duplicate email (excluding self)
    const duplicateEmail = usersList.find(u => u.id !== editForm.id && u.email.toLowerCase() === editForm.email.trim().toLowerCase());
    if (duplicateEmail) {
      showAlert('error', 'Email Terdaftar', `Email "${editForm.email}" sudah digunakan user lain.`);
      return;
    }

    // Check duplicate username (excluding self)
    if (editForm.username.trim()) {
      const duplicateUser = usersList.find(u => u.id !== editForm.id && u.username && u.username.toLowerCase() === editForm.username.trim().toLowerCase());
      if (duplicateUser) {
        showAlert('error', 'Username Terdaftar', `Username "${editForm.username}" sudah terpakai.`);
        return;
      }
    }

    setIsSaving(true);
    showLoading('Memperbarui data pengguna...');
    ApiService.saveUser({
      id: editForm.id,
      name: editForm.name.trim(),
      nipNik: editForm.nipNik.trim() || '-',
      email: editForm.email.trim().toLowerCase(),
      username: editForm.username.trim(),
      role: editForm.role,
      phone: editForm.phone.trim() || '-',
      status: editForm.status,
      passwordHash: selectedUser?.passwordHash || hashPassword('default123'),
      updatedBy: userName
    }).then(async res => {
      setIsSaving(false);
      hideLoading();
      if (res.success) {
        logActivity(
          userName,
          role,
          'EDIT_USER',
          `Memperbarui data pengguna ${editForm.name} (Role: ${editForm.role}, Status: ${editForm.status})`,
          editForm.email,
          'Kelola User'
        );

        await fetchUsersData();
        setIsEditModalOpen(false);
        showToast(res.message || `Data pengguna ${editForm.name} berhasil diperbarui.`, 'success');
      } else {
        showToast(res.message || 'Gagal memperbarui user.', 'error');
      }
    }).catch(err => {
      setIsSaving(false);
      hideLoading();
      showToast(err.message || 'Gagal terhubung ke backend.', 'error');
    });
  };

  // Open Reset Password Modal
  const handleOpenReset = (user: User) => {
    setSelectedUser(user);
    setResetPassForm({
      userId: user.id,
      userName: user.name,
      newPassword: '',
      confirmPassword: ''
    });
    setCopiedPass(false);
    setIsResetModalOpen(true);
  };

  // Auto Generate Temporary Password
  const handleAutoGeneratePass = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#@!';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setResetPassForm(prev => ({
      ...prev,
      newPassword: pass,
      confirmPassword: pass
    }));
  };

  // Handle Reset Password Submit
  const handleResetPassSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetPassForm.newPassword || resetPassForm.newPassword.length < 8) {
      showAlert('error', 'Validasi Password', 'Password baru minimal harus 8 karakter.');
      return;
    }

    if (resetPassForm.newPassword !== resetPassForm.confirmPassword) {
      showAlert('error', 'Password Tidak Cocok', 'Password Baru dan Konfirmasi Password tidak cocok.');
      return;
    }

    showAlert(
      'warning',
      'Konfirmasi Reset Password',
      `Apakah Anda yakin ingin mereset password untuk pengguna "${resetPassForm.userName}"?`,
      async () => {
        setIsSaving(true);
        showLoading('Mereset password pengguna...');
        try {
          const res = await ApiService.saveUser({
            id: resetPassForm.userId,
            name: resetPassForm.userName,
            passwordHash: hashPassword(resetPassForm.newPassword),
            updatedBy: userName
          });

          if (res.success) {
            logActivity(
              userName,
              role,
              'RESET_PASSWORD_USER',
              `Mereset password untuk user: ${resetPassForm.userName}`,
              selectedUser?.email,
              'Kelola User'
            );

            await fetchUsersData();
            setIsResetModalOpen(false);
            showToast(res.message || `Password untuk ${resetPassForm.userName} berhasil diperbarui.`, 'success');
          } else {
            showToast(res.message || 'Gagal mereset password.', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'Gagal terhubung ke backend.', 'error');
        } finally {
          setIsSaving(false);
          hideLoading();
        }
      },
      true,
      'Ya, Reset Password'
    );
  };

  // Toggle User Status (Aktif / Nonaktif)
  const handleToggleStatus = (user: User) => {
    const currentActive = user.status === 'Aktif' || user.status === 'active';
    const nextStatus = currentActive ? 'Nonaktif' : 'Aktif';

    const title = currentActive ? 'Nonaktifkan Pengguna' : 'Aktifkan Pengguna';
    const msg = currentActive 
      ? `Pengguna "${user.name}" tidak akan dapat login lagi ke aplikasi setelah dinonaktifkan.`
      : `Pengguna "${user.name}" akan dapat login kembali ke aplikasi.`;

    showAlert(
      'warning',
      title,
      msg,
      async () => {
        setIsSaving(true);
        showLoading(`Mengubah status pengguna menjadi ${nextStatus}...`);
        try {
          const res = await ApiService.saveUser({
            id: user.id,
            name: user.name,
            email: user.email,
            status: nextStatus,
            updatedBy: userName
          });

          if (res.success) {
            logActivity(
              userName,
              role,
              'UBAH_STATUS_USER',
              `Mengubah status user ${user.name} menjadi ${nextStatus}`,
              user.email,
              'Kelola User'
            );
            await fetchUsersData();
            showToast(res.message || `Pengguna "${user.name}" sekarang berstatus ${nextStatus}.`, 'success');
          } else {
            showToast(res.message || 'Gagal mengubah status.', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'Gagal terhubung ke backend.', 'error');
        } finally {
          setIsSaving(false);
          hideLoading();
        }
      },
      true,
      currentActive ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'
    );
  };

  // Handle Soft Delete User
  const handleSoftDelete = (user: User) => {
    showAlert(
      'error',
      'Konfirmasi Hapus User (Soft Delete)',
      `Data pengguna "${user.name}" akan ditandai sebagai 'Dihapus'. Data tidak benar-benar hilang dari spreadsheet untuk kebutuhan audit log. Lanjutkan?`,
      async () => {
        showLoading('Menghapus akun pengguna...');
        try {
          const res = await ApiService.deleteUser(user.id);
          if (res.success) {
            logActivity(
              userName,
              role,
              'HAPUS_USER_SOFT_DELETE',
              `Menghapus pengguna (soft delete): ${user.name} (${user.email})`,
              user.email,
              'Kelola User'
            );
            await fetchUsersData();
            showToast(res.message || `Akun "${user.name}" ditandai sebagai Dihapus.`, 'success');
          } else {
            showToast(res.message || 'Gagal menghapus user.', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'Gagal terhubung ke backend.', 'error');
        } finally {
          hideLoading();
        }
      }
    );
  };

  // Open Detail / Login Info Modal
  const handleOpenDetail = (user: User) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
  };

  // Export to Excel (Excludes password hash)
  const handleExportExcel = () => {
    try {
      const exportData = filteredUsers.map((u, idx) => ({
        'No': idx + 1,
        'Nama Lengkap': u.name || '-',
        'NIP / NIK': u.nipNik || '-',
        'Email': u.email || '-',
        'Username': u.username || u.email.split('@')[0],
        'Role': u.role === 'admin' ? 'Administrator' : 'Tim Kesiswaan',
        'Status': u.status === 'active' ? 'Aktif' : u.status === 'inactive' ? 'Nonaktif' : u.status,
        'Nomor HP': u.phone || '-',
        'Tanggal Dibuat': u.createdAt ? new Date(u.createdAt).toLocaleString('id-ID') : '-',
        'Terakhir Login': u.lastLogin || 'Belum Pernah'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Column width formatting
      const colWidths = [
        { wch: 6 },  // No
        { wch: 28 }, // Nama
        { wch: 22 }, // NIP
        { wch: 28 }, // Email
        { wch: 18 }, // Username
        { wch: 18 }, // Role
        { wch: 12 }, // Status
        { wch: 16 }, // Phone
        { wch: 22 }, // Tanggal Dibuat
        { wch: 22 }  // Terakhir Login
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pengguna');

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `Users_${dateStr}.xlsx`;

      XLSX.writeFile(wb, filename);

      logActivity(
        userName,
        role,
        'EXPORT_EXCEL_USERS',
        `Mengekspor ${exportData.length} data pengguna ke file Excel ${filename}`,
        '',
        'Kelola User'
      );

      showAlert('success', 'Export Excel Berhasil', `File "${filename}" berhasil diunduh.`);
    } catch (err: any) {
      showAlert('error', 'Export Gagal', `Gagal merender file Excel: ${err?.message || 'Error tidak diketahui'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Component */}
      <SweetAlertModal
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        showCancel={alertConfig.showCancelButton}
        confirmText={alertConfig.confirmButtonText}
        onConfirm={alertConfig.onConfirm || closeAlert}
        onCancel={closeAlert}
      />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 transform origin-top-right pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold border border-blue-400/30">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
              Sistem Manajemen Hak Akses
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-400" />
              Kelola User (Manajemen Pengguna)
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Pusat pengelolaan akun pengguna aplikasi SMART POINT SISWA. Kelola data Admin dan Tim Kesiswaan, reset password, nonaktifkan akun, dan audit riwayat login pengguna secara real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer border border-blue-400/30"
            >
              <UserPlus className="w-4 h-4" />
              Tambah User Baru
            </button>
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer border border-emerald-400/30"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </button>
            <button
              onClick={handleRefresh}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10 cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total User Registered</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.total}</h3>
            <p className="text-[11px] text-slate-500 mt-1">Akun pengguna di database</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">User Admin</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.adminCount}</h3>
            <p className="text-[11px] text-slate-500 mt-1">Akses penuh sistem</p>
          </div>
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Tim Kesiswaan</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.kesiswaanCount}</h3>
            <p className="text-[11px] text-slate-500 mt-1">Input & rekap poin siswa</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Nonaktif / Dihapus</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.inactiveCount}</h3>
            <p className="text-[11px] text-slate-500 mt-1">Akses login ditutup</p>
          </div>
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 rounded-xl flex items-center justify-center">
            <UserX className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
        {/* Controls / Filter Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/60 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama, username, email, NIP/NIK, no. HP..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Select Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Role Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterRole}
                  onChange={e => { setFilterRole(e.target.value as any); setCurrentPage(1); }}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="ALL">Semua Role</option>
                  <option value="admin">Admin</option>
                  <option value="kesiswaan">Tim Kesiswaan</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={filterStatus}
                  onChange={e => { setFilterStatus(e.target.value as any); setCurrentPage(1); }}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                  <option value="Dihapus">Dihapus (Soft Delete)</option>
                </select>
              </div>

              {/* Page size select */}
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value={5}>5 Data</option>
                <option value={10}>10 Data</option>
                <option value={25}>25 Data</option>
                <option value={50}>50 Data</option>
              </select>
            </div>
          </div>
        </div>

        {/* User Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center w-12">No</th>
                <th className="py-3.5 px-4">Nama Lengkap & NIP/NIK</th>
                <th className="py-3.5 px-4">Username & Email</th>
                <th className="py-3.5 px-4 text-center">Role</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">No. HP</th>
                <th className="py-3.5 px-4">Tanggal Dibuat</th>
                <th className="py-3.5 px-4 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60 text-xs text-slate-700 dark:text-slate-300">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Users className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Tidak ada data pengguna ditemukan.</p>
                      <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau reset filter role/status.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, index) => {
                  const globalIdx = (currentPage - 1) * pageSize + index + 1;
                  const isUserActive = u.status === 'Aktif' || u.status === 'active';
                  const isUserDeleted = u.status === 'Dihapus';

                  return (
                    <tr 
                      key={u.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-center font-medium text-slate-500">
                        {globalIdx}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          {u.name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          NIP/NIK: {u.nipNik || '-'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          @{u.username || u.email.split('@')[0]}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {u.email}
                        </div>
                      </td>

                      {/* Badge Role */}
                      <td className="py-3.5 px-4 text-center">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800">
                            <ShieldCheck className="w-3 h-3" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
                            <Users className="w-3 h-3" />
                            Tim Kesiswaan
                          </span>
                        )}
                      </td>

                      {/* Badge Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isUserDeleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-950 text-red-200 border border-red-800 dark:bg-red-950 dark:text-red-300">
                            <XCircle className="w-3 h-3" />
                            Dihapus
                          </span>
                        ) : isUserActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                            <UserX className="w-3 h-3" />
                            Nonaktif
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {u.phone || '-'}
                      </td>

                      <td className="py-3.5 px-4 text-[11px] text-slate-500">
                        <div>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '-'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Login: {u.lastLogin ? u.lastLogin.split(' ')[0] : 'Belum Pernah'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Detail Info Button */}
                          <button
                            onClick={() => handleOpenDetail(u)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Detail Info & Login History"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                            title="Edit User"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Reset Password Button */}
                          <button
                            onClick={() => handleOpenReset(u)}
                            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                            title="Reset Password"
                          >
                            <Key className="w-4 h-4" />
                          </button>

                          {/* Toggle Active/Inactive Button */}
                          {!isUserDeleted && (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isUserActive
                                  ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                                  : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                              }`}
                              title={isUserActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                            >
                              {isUserActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                          )}

                          {/* Soft Delete Button */}
                          {!isUserDeleted && (
                            <button
                              onClick={() => handleSoftDelete(u)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                              title="Hapus (Soft Delete)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            Menampilkan <span className="font-bold text-slate-800 dark:text-slate-200">{filteredUsers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> sampai <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(currentPage * pageSize, filteredUsers.length)}</span> dari <span className="font-bold text-slate-800 dark:text-slate-200">{filteredUsers.length}</span> total user
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 font-bold text-slate-800 dark:text-slate-200">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ================= MODAL TAMBAH USER ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-xl w-full p-6 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Tambah User Baru</h3>
                  <p className="text-xs text-slate-500">Buat akun akses Admin atau Tim Kesiswaan baru</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama Lengkap */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Drs. Hendra Wijaya, M.Pd"
                    value={addForm.name}
                    onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* NIP / NIK */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    NIP / NIK <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 19850315 201001 1 008"
                    value={addForm.nipNik}
                    onChange={e => setAddForm(p => ({ ...p, nipNik: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Nomor HP */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor HP <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={addForm.phone}
                    onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Aktif <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Contoh: hendra@sekolah.sch.id"
                    value={addForm.email}
                    onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: hendrawijaya"
                    value={addForm.username}
                    onChange={e => setAddForm(p => ({ ...p, username: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Password <span className="text-rose-500">* (Min. 8 karakter)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showAddPass ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={addForm.password}
                      onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPass(!showAddPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showAddPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Konfirmasi Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Konfirmasi Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={addForm.confirmPassword}
                    onChange={e => setAddForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Role Hak Akses <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={addForm.role}
                    onChange={e => setAddForm(p => ({ ...p, role: e.target.value as UserRole }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="kesiswaan">Tim Kesiswaan (Terbatas)</option>
                    <option value="admin">Administrator (Akses Penuh)</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Awal <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={addForm.status}
                    onChange={e => setAddForm(p => ({ ...p, status: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Aktif">Aktif (Dapat Login)</option>
                    <option value="Nonaktif">Nonaktif (Login Ditolak)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  Simpan User Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL EDIT USER ================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-xl w-full p-6 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Edit Data User</h3>
                  <p className="text-xs text-slate-500">Perbarui profil, role, atau status pengguna</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">NIP / NIK</label>
                  <input
                    type="text"
                    value={editForm.nipNik}
                    onChange={e => setEditForm(p => ({ ...p, nipNik: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nomor HP</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.username}
                    onChange={e => setEditForm(p => ({ ...p, username: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Role Hak Akses</label>
                  <select
                    value={editForm.role}
                    onChange={e => setEditForm(p => ({ ...p, role: e.target.value as UserRole }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="kesiswaan">Tim Kesiswaan</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status Akun</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm(p => ({ ...p, status: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                    <option value="Dihapus">Dihapus (Soft Delete)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL RESET PASSWORD ================= */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Reset Password</h3>
                  <p className="text-xs text-slate-500">User: <span className="font-semibold text-slate-800 dark:text-slate-200">{resetPassForm.userName}</span></p>
                </div>
              </div>
              <button 
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassSubmit} className="space-y-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/50 flex items-start gap-3 text-xs text-purple-900 dark:text-purple-300">
                <Sparkles className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Generasi Password Otomatis</p>
                  <p className="text-[11px] opacity-90">Klik tombol di bawah ini untuk membuat password acak sementara yang aman secara otomatis.</p>
                  <button
                    type="button"
                    onClick={handleAutoGeneratePass}
                    className="mt-2 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Generate Password Sementara
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showResetPass ? "text" : "password"}
                    required
                    placeholder="Masukkan password baru..."
                    value={resetPassForm.newPassword}
                    onChange={e => setResetPassForm(p => ({ ...p, newPassword: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:outline-none pr-20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(resetPassForm.newPassword);
                        setCopiedPass(true);
                        setTimeout(() => setCopiedPass(false), 2000);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600"
                      title="Salin Password"
                    >
                      {copiedPass ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetPass(!showResetPass)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      {showResetPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Konfirmasi Password Baru <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Ulangi password baru..."
                  value={resetPassForm.confirmPassword}
                  onChange={e => setResetPassForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Key className="w-4 h-4" />
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DETAIL INFO USER ================= */}
      {isDetailModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedUser.name}</h3>
                  <p className="text-xs text-slate-500">Detail Informasi Akun & Audit Login</p>
                </div>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">User ID</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedUser.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Role Hak Akses</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{selectedUser.role === 'admin' ? 'Administrator' : 'Tim Kesiswaan'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Username</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">@{selectedUser.username || selectedUser.email.split('@')[0]}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Email</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedUser.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">NIP / NIK</span>
                  <span className="text-slate-700 dark:text-slate-300">{selectedUser.nipNik || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Nomor HP</span>
                  <span className="text-slate-700 dark:text-slate-300">{selectedUser.phone || '-'}</span>
                </div>
              </div>

              {/* Audit Timestamps */}
              <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Riwayat Pembuatan & Perubahan
                </h4>
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Tanggal Dibuat:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString('id-ID') : '-'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Dibuat Oleh:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedUser.createdBy || 'System'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Diubah Terakhir:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedUser.updatedAt || '-'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Diubah Oleh:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedUser.updatedBy || '-'}</span>
                </div>
              </div>

              {/* Last Login Info */}
              <div className="space-y-2 p-4 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/40">
                <h4 className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5 mb-2">
                  <ShieldAlert className="w-4 h-4 text-blue-500" />
                  Sesi Login Terakhir
                </h4>
                <div className="flex justify-between py-1 border-b border-blue-100 dark:border-blue-900/30">
                  <span className="text-slate-500">Terakhir Login:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedUser.lastLogin || 'Belum Pernah'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-blue-100 dark:border-blue-900/30">
                  <span className="text-slate-500">Alamat IP:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{selectedUser.lastLoginIp || '192.168.1.100'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-blue-100 dark:border-blue-900/30">
                  <span className="text-slate-500">Browser / Perangkat:</span>
                  <span className="text-slate-800 dark:text-slate-200">{selectedUser.lastLoginBrowser || 'Chrome 126 (Windows 11)'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Status Login:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedUser.lastLoginStatus || 'Sukses'}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
