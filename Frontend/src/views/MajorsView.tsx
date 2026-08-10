import React, { useState, useEffect } from 'react';
import { UserRole, MajorItem } from '../types';
import { getStudents, logActivity } from '../utils/storage';
import { ApiService } from '../services/api';
import { useLoading } from '../context/LoadingContext';
import { Layers, Plus, Edit3, Trash2, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { SweetAlertModal, AlertType } from '../components/SweetAlertModal';

interface MajorsViewProps {
  role: UserRole;
  userName: string;
}

export const MajorsView: React.FC<MajorsViewProps> = ({ role, userName }) => {
  const [majors, setMajors] = useState<MajorItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { showLoading, hideLoading, showToast } = useLoading();
  const students = getStudents();
  const isAdmin = role === 'admin';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kaprog, setKaprog] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
    showCancel?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const fetchMajors = async () => {
    setIsDataLoading(true);
    setErrorMessage(null);
    try {
      const res = await ApiService.getMajors();
      if (res.success && Array.isArray(res.data)) {
        setMajors(res.data);
      } else {
        const msg = res.message || 'Gagal memuat data jurusan dari Google Spreadsheet.';
        setErrorMessage(msg);
        showToast(msg, 'error');
        setMajors([]);
      }
    } catch (e: any) {
      console.error('Error fetching majors:', e);
      const msg = e.message || 'Gagal terhubung ke server Google Apps Script.';
      setErrorMessage(msg);
      showToast(msg, 'error');
      setMajors([]);
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    fetchMajors();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setCode('');
    setName('');
    setDescription('');
    setKaprog('');
    setIsActive(true);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (m: MajorItem) => {
    setEditingId(m.id);
    setCode(m.code || '');
    setName(m.name || '');
    setDescription(m.description || '');
    setKaprog(m.kaprog || '');
    setIsActive(m.isActive !== false);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !name.trim()) return;

    setIsSaving(true);
    showLoading(editingId ? 'Mengupdate data jurusan di Google Spreadsheet...' : 'Menyimpan data jurusan ke Google Spreadsheet...');
    try {
      const res = await ApiService.saveMajor({
        id: editingId || undefined,
        code: code.trim(),
        name: name.trim(),
        description: description.trim(),
        kaprog: kaprog.trim(),
        isActive: isActive
      });

      if (res.success) {
        logActivity(userName, role, editingId ? 'EDIT_JURUSAN' : 'TAMBAH_JURUSAN', `Jurusan: ${name}`);
        setIsFormOpen(false);
        await fetchMajors();
        showToast(res.message || `Data jurusan ${name} berhasil disimpan ke Spreadsheet.`, 'success');
      } else {
        showToast(res.message || 'Gagal menyimpan data jurusan.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal terhubung ke backend.', 'error');
    } finally {
      setIsSaving(false);
      hideLoading();
    }
  };

  const handleDelete = (m: MajorItem) => {
    if (isSaving) return;
    setAlertState({
      isOpen: true,
      type: 'warning',
      title: 'Hapus Jurusan?',
      message: `Apakah Anda yakin ingin menghapus jurusan ${m.name} dari database Google Spreadsheet?`,
      showCancel: true,
      onConfirm: async () => {
        showLoading('Menghapus data jurusan...');
        try {
          const res = await ApiService.deleteMajor(m.id);
          if (res.success) {
            logActivity(userName, role, 'HAPUS_JURUSAN', `Jurusan: ${m.name}`);
            await fetchMajors();
            showToast(res.message || 'Data jurusan berhasil dihapus.', 'success');
          } else {
            showToast(res.message || 'Gagal menghapus jurusan.', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'Gagal terhubung ke backend.', 'error');
        } finally {
          hideLoading();
        }
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xs gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            <span>Master Data Jurusan</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Kelola bidang keahlian / konsentrasi jurusan siswa langsung terhubung ke Google Spreadsheet DB.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jurusan Baru</span>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-center gap-3 text-rose-800 dark:text-rose-300 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <div className="flex-1">
            <strong className="font-bold">Error Memuat Data:</strong> {errorMessage}
          </div>
          <button
            onClick={fetchMajors}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 transition-all cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {isDataLoading ? (
        <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="font-bold text-xs">Memuat data jurusan dari Google Spreadsheet...</p>
        </div>
      ) : majors.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
          <Layers className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-bold text-sm text-slate-700 dark:text-slate-300">Belum Ada Data Jurusan</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Data jurusan pada Google Spreadsheet masih kosong. Klik tombol di atas untuk menambah jurusan baru.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {majors.map(m => {
            const studentCount = students.filter(s => 
              s.majorName?.toLowerCase() === m.name?.toLowerCase() ||
              s.majorName?.toLowerCase() === m.code?.toLowerCase() ||
              s.major?.toLowerCase() === m.name?.toLowerCase()
            ).length;

            return (
              <div key={m.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs flex flex-col justify-between transition-all hover:border-blue-200 dark:hover:border-blue-900">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {m.code && (
                        <span className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 rounded font-black text-[10px] uppercase mb-1">
                          {m.code}
                        </span>
                      )}
                      <h3 className="font-extrabold text-base text-slate-800 dark:text-white leading-snug">{m.name}</h3>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      m.isActive !== false
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                    }`}>
                      {m.isActive !== false ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>

                  {m.kaprog && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold mt-2 flex items-center gap-1.5">
                      <span className="text-slate-400 font-normal">Kaprog:</span> {m.kaprog}
                    </p>
                  )}

                  <p className="text-xs text-slate-400 mt-2 line-clamp-3">{m.description || 'Tidak ada deskripsi.'}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md">
                    {studentCount} Siswa
                  </span>

                  {isAdmin && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(m)}
                        className="px-2.5 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(m)}
                        className="px-2.5 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-300 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-sm">{editingId ? 'Edit Jurusan' : 'Tambah Jurusan Baru'}</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kode Jurusan</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="Contoh: TKJ, RPL, TPL"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Jurusan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Contoh: Teknik Komputer dan Jaringan"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Kepala Program (Kaprog)</label>
                <input
                  type="text"
                  value={kaprog}
                  onChange={e => setKaprog(e.target.value)}
                  placeholder="Contoh: Drs. Ahmad Dahlan, M.Pd."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Deskripsi Jurusan</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Deskripsi singkat mengenai jurusan ini..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="isActiveToggle" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Status Aktif (Dapat dipilih pada Data Kelas & Siswa)
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer transition-all"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SweetAlertModal
        isOpen={alertState.isOpen}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        showCancelButton={alertState.showCancel}
        onConfirm={() => {
          alertState.onConfirm();
          setAlertState(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
