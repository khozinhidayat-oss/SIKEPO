import React, { useState } from 'react';
import { UserRole } from '../types';
import { getMajors, saveMajor, deleteMajor, getStudents, logActivity } from '../utils/storage';
import { Layers, Plus, Edit3, Trash2, X } from 'lucide-react';
import { SweetAlertModal, AlertType } from '../components/SweetAlertModal';

interface MajorsViewProps {
  role: UserRole;
  userName: string;
}

export const MajorsView: React.FC<MajorsViewProps> = ({ role, userName }) => {
  const [majors, setMajors] = useState(getMajors());
  const students = getStudents();
  const isAdmin = role === 'admin';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

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

  const refresh = () => setMajors(getMajors());

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (m: any) => {
    setEditingId(m.id);
    setName(m.name);
    setDescription(m.description);
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    saveMajor({
      id: editingId || undefined,
      name: name.trim(),
      description: description.trim()
    });

    logActivity(userName, role, editingId ? 'EDIT_JURUSAN' : 'TAMBAH_JURUSAN', `Jurusan: ${name}`);
    setIsFormOpen(false);
    refresh();

    setAlertState({
      isOpen: true,
      type: 'success',
      title: 'Berhasil!',
      message: `Data jurusan ${name} berhasil disimpan.`,
      onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleDelete = (m: any) => {
    setAlertState({
      isOpen: true,
      type: 'warning',
      title: 'Hapus Jurusan?',
      message: `Apakah Anda yakin ingin menghapus jurusan ${m.name}?`,
      showCancel: true,
      onConfirm: () => {
        deleteMajor(m.id);
        logActivity(userName, role, 'HAPUS_JURUSAN', `Jurusan: ${m.name}`);
        refresh();
        setAlertState({
          isOpen: true,
          type: 'success',
          title: 'Terhapus!',
          message: 'Data jurusan berhasil dihapus.',
          onConfirm: () => setAlertState(prev => ({ ...prev, isOpen: false }))
        });
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

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                <span>{editingId ? 'Edit Jurusan' : 'Tambah Jurusan Baru'}</span>
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Jurusan *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Contoh: RPL atau MIPA"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Deskripsi Keterangan</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Keterangan singkat jurusan"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30"
                >
                  Simpan Jurusan
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
        showCancel={alertState.showCancel}
        onConfirm={alertState.onConfirm}
        onCancel={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
