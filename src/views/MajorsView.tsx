import React, { useState, useEffect } from 'react';
import { UserRole, MajorItem } from '../types';
import { getMajors, getStudents, logActivity } from '../utils/storage';
import { ApiService } from '../services/api';
import { useLoading } from '../context/LoadingContext';
import { Layers, Plus, Edit3, Trash2, X, Loader2 } from 'lucide-react';
import { SweetAlertModal, AlertType } from '../components/SweetAlertModal';

interface MajorsViewProps {
  role: UserRole;
  userName: string;
}

export const MajorsView: React.FC<MajorsViewProps> = ({ role, userName }) => {
  const [majors, setMajors] = useState<MajorItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const { showLoading, hideLoading, showToast } = useLoading();
  const students = getStudents();
  const isAdmin = role === 'admin';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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
    try {
      const res = await ApiService.getMajors();
      if (res.success && Array.isArray(res.data)) {
        setMajors(res.data);
      } else {
        setMajors(getMajors());
      }
    } catch (e) {
      console.error('Error fetching majors:', e);
      setMajors(getMajors());
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    fetchMajors();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (m: MajorItem) => {
    setEditingId(m.id);
    setName(m.name);
    setDescription(m.description || '');
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !name.trim()) return;

    setIsSaving(true);
    showLoading(editingId ? 'Mengupdate data jurusan...' : 'Menyimpan data jurusan...');
    try {
      const res = await ApiService.saveMajor({
        id: editingId || undefined,
        name: name.trim(),
        description: description.trim()
      });

      if (res.success) {
        logActivity(userName, role, editingId ? 'EDIT_JURUSAN' : 'TAMBAH_JURUSAN', `Jurusan: ${name}`);
        setIsFormOpen(false);
        await fetchMajors();
        showToast(res.message || `Data jurusan ${name} berhasil disimpan.`, 'success');
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
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            <span>Master Data Jurusan</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Kelola bidang keahlian / konsentrasi jurusan siswa di sekolah.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jurusan</span>
          </button>
        )}
      </div>

      {isDataLoading ? (
        <div className="p-12 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="font-bold text-xs">Memuat data jurusan dari Google Spreadsheet...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {majors.map(m => {
            const studentCount = students.filter(s => s.majorName === m.name).length;
            return (
              <div key={m.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-base text-slate-800 dark:text-white">{m.name}</h3>
                    <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold">
                      {studentCount} Siswa
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{m.description || 'Tidak ada deskripsi.'}</p>
                </div>

                {isAdmin && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
                    <button
                      onClick={() => handleOpenEdit(m)}
                      className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(m)}
                      className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
                    >
                      Hapus
                    </button>
                  </div>
                )}
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
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Jurusan</label>
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
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Deskripsi</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Deskripsi singkat jurusan..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
