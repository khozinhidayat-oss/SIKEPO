import React from 'react';
import { getStudentPointSummaries, getTransactions, getSettings } from '../utils/storage';
import { 
  Users, AlertOctagon, ShieldAlert, 
  TrendingUp, AlertTriangle, ArrowRight, Activity, ShieldCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, Legend 
} from 'recharts';

interface DashboardViewProps {
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTab }) => {
  const studentSummaries = getStudentPointSummaries();
  const transactions = getTransactions();
  const settings = getSettings();

  const totalStudents = studentSummaries.length;
  const totalPelanggaran = transactions.filter(t => t.type === 'pelanggaran').length;

  // Today stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPelanggaran = transactions.filter(t => t.type === 'pelanggaran' && t.date === todayStr).length;

  // Students exceeding threshold
  const thresholdExceededStudents = studentSummaries
    .filter(s => s.exceedsThreshold)
    .sort((a, b) => b.netPoints - a.netPoints);

  // Monthly trend data aggregation
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const currentYear = new Date().getFullYear();
  const monthlyData = monthNames.map((name, index) => {
    const monthNum = (index + 1).toString().padStart(2, '0');
    const mPelanggaran = transactions.filter(t => 
      t.type === 'pelanggaran' && t.date.startsWith(`${currentYear}-${monthNum}`)
    ).length;
    return { name, Pelanggaran: mPelanggaran };
  });

  // Violations Per Class aggregation
  const classMap: { [key: string]: number } = {};
  transactions
    .filter(t => t.type === 'pelanggaran')
    .forEach(t => {
      classMap[t.className] = (classMap[t.className] || 0) + 1;
    });

  const classChartData = Object.keys(classMap).map(cls => ({
    className: cls,
    Jumlah: classMap[cls]
  }));

  // Violations Per Major aggregation
  const majorMap: { [key: string]: number } = {};
  transactions
    .filter(t => t.type === 'pelanggaran')
    .forEach(t => {
      majorMap[t.majorName] = (majorMap[t.majorName] || 0) + 1;
    });

  const COLORS = ['#2563EB', '#16A34A', '#F59E0B', '#DC2626', '#8B5CF6', '#EC4899'];
  const majorChartData = Object.keys(majorMap).map((mjr, idx) => ({
    name: mjr,
    value: majorMap[mjr],
    color: COLORS[idx % COLORS.length]
  }));

  // Top 10 Violations
  const violationFreqMap: { [key: string]: { name: string; category: string; count: number; totalPoints: number } } = {};
  transactions
    .filter(t => t.type === 'pelanggaran')
    .forEach(t => {
      if (!violationFreqMap[t.itemName]) {
        violationFreqMap[t.itemName] = { name: t.itemName, category: t.itemCategory, count: 0, totalPoints: 0 };
      }
      violationFreqMap[t.itemName].count += 1;
      violationFreqMap[t.itemName].totalPoints += t.points;
    });

  const top10Violations = Object.values(violationFreqMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner Greeting - High Density Header */}
      <div className="bg-slate-800 text-white rounded-xl p-5 shadow-xs border border-slate-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold mb-1">
            <Activity className="w-3.5 h-3.5" />
            <span>Tahun Ajaran {settings.academicYear} &bull; Semester {settings.semester}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">SMART POINT SISWA</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Sistem Pemantauan dan Pengelolaan Poin Pelanggaran Kedisiplinan Siswa.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => onNavigateTab('input-violation')}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Catat Pelanggaran</span>
          </button>
        </div>
      </div>

      {/* Threshold Alert Bar if any student exceeds limit */}
      {thresholdExceededStudents.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border-l-4 border-l-red-500 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 dark:bg-red-950/50 rounded-lg text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                PERINGATAN: {thresholdExceededStudents.length} Siswa Melebihi Batas Point Kedisiplinan (&ge; {settings.pointThreshold} Poin)
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Siswa tersebut memerlukan tindakan pembinaan atau surat pemanggilan orang tua segera.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('reports')}
            className="px-3 py-1.5 bg-red-600 text-white font-semibold rounded-md text-xs hover:bg-red-700 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
          >
            <span>Lihat Laporan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* HIGH DENSITY STAT CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Siswa */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700/60">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Siswa</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white flex items-center justify-between">
            <span>{totalStudents}</span>
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Terdaftar aktif</div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1 mt-3 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full w-full" />
          </div>
        </div>

        {/* Card 2: Total Pelanggaran */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700/60">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Kasus Pelanggaran</div>
          <div className="text-2xl font-bold text-red-600 flex items-center justify-between">
            <span>{totalPelanggaran}</span>
            <AlertOctagon className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{todayPelanggaran} Kasus hari ini</div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1 mt-3 rounded-full overflow-hidden">
            <div className="bg-red-600 h-full w-3/4" />
          </div>
        </div>

        {/* Card 3: Limit Melebihi */}
        <div className={`p-4 rounded-xl shadow-xs border ${
          thresholdExceededStudents.length > 0
            ? 'bg-red-50/60 dark:bg-red-950/30 border-red-200 dark:border-red-800/60'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/60'
        }`}>
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Melebihi Limit Poin</div>
          <div className="text-2xl font-bold text-red-600 flex items-center justify-between">
            <span>{thresholdExceededStudents.length} Siswa</span>
            <ShieldAlert className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Batas {settings.pointThreshold} Poin</div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1 mt-3 rounded-full overflow-hidden">
            <div className="bg-red-600 h-full w-full" />
          </div>
        </div>
      </div>

      {/* CHARTS GRID 1: Trend Chart & Violations Per Class */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Area Chart */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Tren Pelanggaran Bulanan</h3>
              <p className="text-[11px] text-slate-400">Statistik transaksi pelanggaran dalam tahun berjalan</p>
            </div>
            <TrendingUp className="w-4.5 h-4.5 text-blue-600" />
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorPelanggaran" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DC2626" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#DC2626" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="Pelanggaran" stroke="#DC2626" fillOpacity={1} fill="url(#colorPelanggaran)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Violations Per Class Bar Chart */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Pelanggaran Per Kelas</h3>
              <p className="text-[11px] text-slate-400">Distribusi kasus berdasarkan tingkatan kelas</p>
            </div>
            <Users className="w-4.5 h-4.5 text-indigo-600" />
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="className" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="Jumlah" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CHARTS GRID 2: Major Pie & Top 10 Violations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Violations Per Major Pie Chart */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-0.5">Pelanggaran Per Jurusan</h3>
          <p className="text-[11px] text-slate-400 mb-3">Proporsi pelanggaran antar jurusan</p>
          <div className="h-52 w-full flex items-center justify-center">
            {majorChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={majorChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {majorChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">Belum ada data pelanggaran</div>
            )}
          </div>
        </div>

        {/* Top 10 Violations List */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-0.5">Top 10 Jenis Pelanggaran Terbanyak</h3>
          <p className="text-[11px] text-slate-400 mb-3">Frekuensi dan dampak poin pelanggaran teratas</p>

          <div className="space-y-2">
            {top10Violations.length > 0 ? (
              top10Violations.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-[10px]">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{item.name}</div>
                      <div className="text-[10px] text-slate-400">{item.category}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 rounded-md font-bold text-[10px]">
                      {item.count} Kasus
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                      {item.totalPoints} Poin
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">Belum ada data pelanggaran</div>
            )}
          </div>
        </div>
      </div>

      {/* TOP SISWA MELEBIHI LIMIT BOARD */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>Daftar Siswa Melebihi Limit Batas Poin (&ge; {settings.pointThreshold} Poin)</span>
            </h3>
            <p className="text-[11px] text-slate-400">Siswa yang memerlukan pemanggilan orang tua atau bimbingan konseling</p>
          </div>
          <button
            onClick={() => onNavigateTab('reports')}
            className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
          >
            Lihat Laporan Lengkap &rarr;
          </button>
        </div>

        {thresholdExceededStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-2.5">NIS</th>
                  <th className="p-2.5">Nama Siswa</th>
                  <th className="p-2.5">Kelas / Jurusan</th>
                  <th className="p-2.5 text-right">Poin Pelanggaran</th>
                  <th className="p-2.5 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {thresholdExceededStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-red-50/40 dark:hover:bg-red-950/20 transition-colors">
                    <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">{student.nis}</td>
                    <td className="p-2.5 font-bold text-slate-800 dark:text-slate-100">{student.name}</td>
                    <td className="p-2.5 text-slate-500">{student.className} - {student.majorName}</td>
                    <td className="p-2.5 text-right">
                      <span className="px-2 py-0.5 bg-red-600 text-white font-bold rounded-md text-xs shadow-xs">
                        {student.netPoints} Poin
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <span className="px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200 rounded-md text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Panggilan Ortu
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 bg-slate-50 dark:bg-slate-900/30 rounded-xl text-xs text-slate-500 flex flex-col items-center gap-1.5">
            <ShieldCheck className="w-7 h-7 text-emerald-500" />
            <div className="font-bold text-slate-700 dark:text-slate-300">Tidak ada siswa yang melebihi limit poin ({settings.pointThreshold} poin)</div>
            <div className="text-[11px] text-slate-400">Kedisiplinan siswa saat ini terjaga dengan sangat baik!</div>
          </div>
        )}
      </div>
    </div>
  );
};
