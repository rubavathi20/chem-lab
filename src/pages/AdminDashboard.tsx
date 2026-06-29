import { useState, useEffect } from 'react';
import {
  FlaskConical, LogOut, Users, BarChart2, Home,
  Download, Search, RefreshCw, TrendingUp, Award,
  CheckCircle, Shield, Activity, Plus, X,
  BookOpen, ChevronUp, ChevronDown, Beaker, AlertCircle,
  GraduationCap, ClipboardList, Menu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase, Profile, Experiment, AttendanceSession, ExperimentResult } from '../lib/supabase';

type AdminPage = 'dashboard' | 'experiments' | 'students' | 'attendance' | 'reports';

interface StudentWithStats extends Profile {
  totalSessions: number;
  completedExps: number;
  avgScore: number;
  lastSeen: string | null;
}

// ─── Sidebar ───────────────────────────────────────────────────────────────
const NAV_ITEMS: { id: AdminPage; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'experiments', label: 'Experiments', icon: Beaker },
  { id: 'students', label: 'Students', icon: GraduationCap },
  { id: 'attendance', label: 'Attendance', icon: ClipboardList },
  { id: 'reports', label: 'Reports', icon: BarChart2 },
];

function Sidebar({ page, setPage, profile, onLogout, collapsed, setCollapsed }: {
  page: AdminPage;
  setPage: (p: AdminPage) => void;
  profile: Profile | null;
  onLogout: () => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}) {
  return (
    <aside className={`flex flex-col shrink-0 bg-slate-950 border-r border-slate-800 transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'} h-full`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
        <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/30 shrink-0">
          <Shield className="w-5 h-5 text-amber-400" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-none truncate">VR ChemLab</p>
            <p className="text-amber-400 text-xs mt-0.5">Admin Panel</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded text-slate-600 hover:text-slate-300 transition-colors shrink-0"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setPage(id)}
            title={collapsed ? label : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              page === id
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      {/* Profile + logout */}
      <div className="border-t border-slate-800 p-3 space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
              {profile?.full_name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-slate-200 text-xs font-medium truncate">{profile?.full_name}</p>
              <p className="text-slate-500 text-xs">Administrator</p>
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          title="Sign out"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState<AdminPage>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceSession[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [results, setResults] = useState<ExperimentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateExp, setShowCreateExp] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setRefreshing(true);
    const [attRes, studRes, expRes, resRes] = await Promise.all([
      supabase.from('attendance_sessions').select('*, profiles(full_name, student_id, class_name), experiments(title, category)').order('entry_time', { ascending: false }).limit(500),
      supabase.from('profiles').select('*').eq('role', 'student').order('full_name'),
      supabase.from('experiments').select('*').order('created_at'),
      supabase.from('experiment_results').select('*, experiments(title)').order('completed_at', { ascending: false }),
    ]);

    if (attRes.data) setAttendance(attRes.data as AttendanceSession[]);
    if (studRes.data) setStudents(studRes.data as Profile[]);
    if (expRes.data) setExperiments(expRes.data as Experiment[]);
    if (resRes.data) setResults(resRes.data as ExperimentResult[]);
    setLoading(false);
    setRefreshing(false);
  }

  const studentsWithStats: StudentWithStats[] = students.map(s => {
    const stuAtt = attendance.filter(a => a.student_id === s.id);
    const stuRes = results.filter(r => r.student_id === s.id);
    return {
      ...s,
      totalSessions: stuAtt.length,
      completedExps: new Set(stuRes.map(r => r.experiment_id)).size,
      avgScore: stuRes.length > 0 ? Math.round(stuRes.reduce((acc, r) => acc + r.score, 0) / stuRes.length) : 0,
      lastSeen: stuAtt[0]?.entry_time ?? null,
    };
  });

  const today = new Date().toISOString().split('T')[0];
  const activeToday = attendance.filter(a => a.session_date === today).length;
  const overallAvg = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;

  async function handleLogout() {
    await signOut();
    navigate('/auth');
  }

  const pageTitle = NAV_ITEMS.find(n => n.id === page)?.label ?? 'Dashboard';
  const PageIcon = NAV_ITEMS.find(n => n.id === page)?.icon ?? Home;

  return (
    <div className="flex w-full h-full bg-gray-950 overflow-hidden">
      <Sidebar
        page={page}
        setPage={setPage}
        profile={profile}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/40 shrink-0">
          <div className="flex items-center gap-3">
            <PageIcon className="w-5 h-5 text-amber-400" />
            <h1 className="text-white font-semibold text-base">{pageTitle}</h1>
            <span className="hidden sm:inline text-slate-600 text-sm">·</span>
            <span className="hidden sm:inline text-slate-500 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={refreshing}
              title="Refresh"
              className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-400 text-xs font-medium hidden sm:inline">Live</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-500 text-sm">Loading data...</span>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {page === 'dashboard' && (
                <DashboardPage
                  students={studentsWithStats}
                  attendance={attendance}
                  experiments={experiments}
                  results={results}
                  activeToday={activeToday}
                  overallAvg={overallAvg}
                />
              )}
              {page === 'experiments' && (
                <ExperimentsPage
                  experiments={experiments}
                  results={results}
                  onCreateClick={() => setShowCreateExp(true)}
                />
              )}
              {page === 'students' && (
                <StudentsPage students={studentsWithStats} />
              )}
              {page === 'attendance' && (
                <AttendancePage attendance={attendance} />
              )}
              {page === 'reports' && (
                <ReportsPage attendance={attendance} students={students} results={results} experiments={experiments} />
              )}
            </div>
          )}
        </main>
      </div>

      {showCreateExp && (
        <CreateExperimentModal
          onClose={() => setShowCreateExp(false)}
          onSuccess={() => { setShowCreateExp(false); loadData(); }}
        />
      )}
    </div>
  );
}

// ─── Dashboard / Overview ────────────────────────────────────────────────────
function DashboardPage({ students, attendance, experiments, results, activeToday, overallAvg }: {
  students: StudentWithStats[];
  attendance: AttendanceSession[];
  experiments: Experiment[];
  results: ExperimentResult[];
  activeToday: number;
  overallAvg: number;
}) {
  const totalCompleted = results.length;
  const passRate = results.length > 0 ? Math.round((results.filter(r => r.score >= 60).length / results.length) * 100) : 0;

  // 7-day activity
  const days7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split('T')[0];
    return { key, day: d.toLocaleDateString('en', { weekday: 'short' }), count: attendance.filter(a => a.session_date === key).length };
  });
  const maxCount = Math.max(...days7.map(d => d.count), 1);

  const topStudents = [...students].sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);

  const recentSessions = attendance.slice(0, 6);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: students.length, sub: 'enrolled', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Active Today', value: activeToday, sub: 'lab sessions', icon: Activity, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'Overall Avg Score', value: `${overallAvg}%`, sub: 'across all students', icon: Award, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Pass Rate', value: `${passRate}%`, sub: '≥60% threshold', icon: CheckCircle, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-lg border ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-sm font-medium text-slate-300 mt-0.5">{label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-day activity chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-white font-semibold">7-Day Lab Activity</h3>
              <p className="text-slate-500 text-xs mt-0.5">Daily sessions across all classes</p>
            </div>
            <div className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs font-medium">
              {attendance.length} total
            </div>
          </div>
          <div className="flex items-end gap-2 h-32">
            {days7.map(({ day, count, key }) => (
              <div key={key} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-slate-400 text-xs">{count > 0 ? count : ''}</span>
                <div
                  className="w-full rounded-t-md bg-amber-500/30 hover:bg-amber-500/50 transition-colors relative"
                  style={{ height: `${(count / maxCount) * 100}%`, minHeight: count > 0 ? '8px' : '4px' }}
                />
                <span className="text-slate-500 text-xs">{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick stats */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Lab Overview</h3>
          <div className="space-y-3">
            {[
              { label: 'Experiments Available', value: experiments.length, color: 'text-amber-400' },
              { label: 'Total Completions', value: totalCompleted, color: 'text-green-400' },
              { label: 'Active Experiments', value: experiments.filter(e => e.is_active).length, color: 'text-blue-400' },
              { label: 'Students at Risk', value: students.filter(s => s.avgScore > 0 && s.avgScore < 50).length, color: 'text-red-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <span className="text-slate-400 text-sm">{label}</span>
                <span className={`font-bold text-sm ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top performers */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            Top Performers
          </h3>
          {topStudents.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No student data yet</p>
          ) : (
            <div className="space-y-2">
              {topStudents.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-800/50 transition-colors">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                    i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-slate-600/40 text-slate-300' : 'bg-slate-800 text-slate-500'
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm font-medium truncate">{s.full_name}</p>
                    <p className="text-slate-500 text-xs">{s.student_id} · {s.class_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${s.avgScore >= 80 ? 'text-green-400' : s.avgScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {s.avgScore}%
                    </p>
                    <p className="text-slate-600 text-xs">{s.completedExps} exps</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent sessions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            Recent Lab Sessions
          </h3>
          {recentSessions.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No sessions recorded yet</p>
          ) : (
            <div className="space-y-2">
              {recentSessions.map(s => {
                const p = s.profiles as unknown as Profile | null;
                const e = s.experiments as unknown as Experiment | null;
                return (
                  <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-800/50 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                      <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 text-xs font-medium truncate">{p?.full_name ?? '—'}</p>
                      <p className="text-slate-600 text-xs truncate">{e?.title ?? 'Unknown experiment'}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                      s.status === 'completed' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Experiments Page ────────────────────────────────────────────────────────
function ExperimentsPage({ experiments, results, onCreateClick }: {
  experiments: Experiment[];
  results: ExperimentResult[];
  onCreateClick: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = experiments.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-white font-bold text-lg">Experiment Library</h2>
          <p className="text-slate-500 text-sm mt-0.5">Create and manage virtual chemistry experiments</p>
        </div>
        <button
          onClick={onCreateClick}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-900 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Experiment
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search experiments..."
          className="lab-input pl-9 text-sm"
        />
      </div>

      {/* Experiment cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-xl">
          <Beaker className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No experiments found</p>
          <p className="text-slate-600 text-sm mt-1">Create your first experiment to get started</p>
          <button
            onClick={onCreateClick}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg text-sm font-medium transition-colors mx-auto"
          >
            <Plus className="w-4 h-4" />
            Create Experiment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(exp => {
            const expResults = results.filter(r => r.experiment_id === exp.id);
            const avgScore = expResults.length > 0 ? Math.round(expResults.reduce((s, r) => s + r.score, 0) / expResults.length) : null;
            const steps = exp.steps as unknown[];
            const chemicals = (exp.chemicals ?? []) as string[];
            const equipment = (exp.equipment ?? []) as string[];

            return (
              <div key={exp.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        exp.difficulty === 'beginner' ? 'bg-green-500/15 text-green-400' :
                        exp.difficulty === 'intermediate' ? 'bg-yellow-500/15 text-yellow-400' :
                        'bg-red-500/15 text-red-400'
                      }`}>
                        {exp.difficulty}
                      </span>
                      <span className="text-slate-600 text-xs">{exp.category}</span>
                    </div>
                    <h3 className="text-white font-semibold text-sm leading-snug">{exp.title}</h3>
                  </div>
                  <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ml-2 ${exp.is_active ? 'bg-green-400' : 'bg-slate-600'}`} title={exp.is_active ? 'Active' : 'Inactive'} />
                </div>

                <p className="text-slate-500 text-xs leading-relaxed mb-4 line-clamp-2">{exp.description}</p>

                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-slate-800/60 rounded-lg px-2.5 py-2">
                    <p className="text-slate-500 text-xs">Steps</p>
                    <p className="text-slate-200 font-semibold text-sm">{steps?.length ?? 0}</p>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg px-2.5 py-2">
                    <p className="text-slate-500 text-xs">Duration</p>
                    <p className="text-slate-200 font-semibold text-sm">{exp.estimated_duration_minutes}m</p>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg px-2.5 py-2">
                    <p className="text-slate-500 text-xs">Chemicals</p>
                    <p className="text-slate-200 font-semibold text-sm">{chemicals.length}</p>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg px-2.5 py-2">
                    <p className="text-slate-500 text-xs">Equipment</p>
                    <p className="text-slate-200 font-semibold text-sm">{equipment.length}</p>
                  </div>
                </div>

                {/* Stats footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-1 text-slate-500 text-xs">
                    <Users className="w-3.5 h-3.5" />
                    <span>{expResults.length} attempts</span>
                  </div>
                  {avgScore !== null && (
                    <span className={`text-xs font-semibold ${avgScore >= 80 ? 'text-green-400' : avgScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                      Avg {avgScore}%
                    </span>
                  )}
                </div>

                {/* Chemicals list preview */}
                {chemicals.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <p className="text-slate-600 text-xs mb-1.5">Chemicals</p>
                    <div className="flex flex-wrap gap-1">
                      {chemicals.slice(0, 3).map((c, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs border border-blue-500/15">{c}</span>
                      ))}
                      {chemicals.length > 3 && <span className="px-1.5 py-0.5 bg-slate-800 text-slate-500 rounded text-xs">+{chemicals.length - 3}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Students Page ───────────────────────────────────────────────────────────
function StudentsPage({ students }: { students: StudentWithStats[] }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'full_name' | 'avgScore' | 'totalSessions'>('full_name');
  const [sortAsc, setSortAsc] = useState(true);

  function handleSort(key: typeof sortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  }

  const filtered = students
    .filter(s =>
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.student_id ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (s.class_name ?? '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = a[sortKey] ?? '', bv = b[sortKey] ?? '';
      return (av < bv ? -1 : av > bv ? 1 : 0) * (sortAsc ? 1 : -1);
    });

  function SortIcon({ col }: { col: typeof sortKey }) {
    if (sortKey !== col) return <ChevronDown className="w-3 h-3 text-slate-600" />;
    return sortAsc ? <ChevronUp className="w-3 h-3 text-amber-400" /> : <ChevronDown className="w-3 h-3 text-amber-400" />;
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-white font-bold text-lg">Student Roster</h2>
          <p className="text-slate-500 text-sm mt-0.5">{students.length} enrolled students</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..." className="lab-input pl-9 text-sm" />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50">
                {[
                  { label: 'Student', col: 'full_name' as const },
                  { label: 'Class', col: null },
                  { label: 'Sessions', col: 'totalSessions' as const },
                  { label: 'Avg Score', col: 'avgScore' as const },
                  { label: 'Experiments', col: null },
                  { label: 'Last Active', col: null },
                  { label: 'Status', col: null },
                ].map(({ label, col }) => (
                  <th key={label} className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {col ? (
                      <button onClick={() => handleSort(col)} className="flex items-center gap-1 hover:text-slate-300 transition-colors">
                        {label} <SortIcon col={col} />
                      </button>
                    ) : label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-600">No students found</td></tr>
              )}
              {filtered.map(s => {
                const isActive = s.lastSeen
                  ? (new Date().getTime() - new Date(s.lastSeen).getTime()) < 7 * 24 * 60 * 60 * 1000
                  : false;
                return (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-semibold text-xs shrink-0">
                          {s.full_name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-slate-200 font-medium">{s.full_name}</p>
                          <p className="text-slate-500 text-xs">{s.student_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{s.class_name || '—'}</td>
                    <td className="py-3 px-4 text-slate-300 font-medium">{s.totalSessions}</td>
                    <td className="py-3 px-4">
                      <span className={`font-bold ${s.avgScore >= 80 ? 'text-green-400' : s.avgScore >= 60 ? 'text-yellow-400' : s.avgScore > 0 ? 'text-red-400' : 'text-slate-600'}`}>
                        {s.avgScore > 0 ? `${s.avgScore}%` : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{s.completedExps}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      {s.lastSeen ? new Date(s.lastSeen).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-500/15 text-green-400' : 'bg-slate-700 text-slate-500'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Attendance Page ─────────────────────────────────────────────────────────
function AttendancePage({ attendance }: { attendance: AttendanceSession[] }) {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = attendance.filter(a => {
    const p = a.profiles as unknown as Profile | null;
    const nameMatch = (p?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
                      (p?.student_id ?? '').toLowerCase().includes(search.toLowerCase());
    const dateMatch = !dateFilter || a.session_date === dateFilter;
    const statusMatch = statusFilter === 'all' || a.status === statusFilter;
    return nameMatch && dateMatch && statusMatch;
  });

  function exportCSV() {
    const rows = [
      ['Student Name', 'Student ID', 'Class', 'Experiment', 'Date', 'Entry Time', 'Exit Time', 'Duration (min)', 'Status'],
      ...filtered.map(a => {
        const p = a.profiles as unknown as Profile | null;
        const e = a.experiments as unknown as Experiment | null;
        const dur = a.exit_time ? Math.round((new Date(a.exit_time).getTime() - new Date(a.entry_time).getTime()) / 60000) : '';
        return [p?.full_name ?? '', p?.student_id ?? '', p?.class_name ?? '', e?.title ?? '', a.session_date, new Date(a.entry_time).toLocaleTimeString(), a.exit_time ? new Date(a.exit_time).toLocaleTimeString() : '', dur, a.status];
      }),
    ];
    const csv = rows.map(r => r.map(String).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'attendance.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-white font-bold text-lg">Attendance Log</h2>
          <p className="text-slate-500 text-sm mt-0.5">{attendance.length} total sessions recorded</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors border border-slate-700">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-44">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..." className="lab-input pl-9 text-sm" />
        </div>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="lab-input text-sm w-40" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="lab-input text-sm w-36">
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
        </select>
        {(search || dateFilter || statusFilter !== 'all') && (
          <button onClick={() => { setSearch(''); setDateFilter(''); setStatusFilter('all'); }} className="px-3 py-2 text-slate-500 hover:text-slate-200 text-sm transition-colors">
            Clear
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50">
                {['Student', 'Experiment', 'Date', 'Entry', 'Exit', 'Duration', 'Status'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-600">No records match your filters</td></tr>
              )}
              {filtered.map(a => {
                const p = a.profiles as unknown as Profile | null;
                const e = a.experiments as unknown as Experiment | null;
                const dur = a.exit_time ? Math.round((new Date(a.exit_time).getTime() - new Date(a.entry_time).getTime()) / 60000) : null;
                return (
                  <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-slate-200 font-medium">{p?.full_name ?? '—'}</p>
                      <p className="text-slate-500 text-xs">{p?.student_id} · {p?.class_name}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs max-w-[160px] truncate">{e?.title ?? '—'}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{a.session_date}</td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{new Date(a.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{a.exit_time ? new Date(a.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{dur != null ? `${dur}m` : '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.status === 'completed' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                        {a.status === 'completed' ? 'Completed' : 'In Progress'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-600">
          Showing {filtered.length} of {attendance.length} records
        </div>
      </div>
    </div>
  );
}

// ─── Reports Page ─────────────────────────────────────────────────────────────
function ReportsPage({ attendance, students, results, experiments }: {
  attendance: AttendanceSession[];
  students: Profile[];
  results: ExperimentResult[];
  experiments: Experiment[];
}) {
  const scoreRanges = [
    { label: '90–100%', min: 90, max: 100, color: 'bg-green-500' },
    { label: '80–89%', min: 80, max: 90, color: 'bg-green-400' },
    { label: '70–79%', min: 70, max: 80, color: 'bg-yellow-400' },
    { label: '60–69%', min: 60, max: 70, color: 'bg-orange-400' },
    { label: 'Below 60%', min: 0, max: 60, color: 'bg-red-500' },
  ];
  const maxBucket = Math.max(...scoreRanges.map(r => results.filter(res => res.score >= r.min && res.score < r.max).length), 1);

  function exportReport() {
    const overallAvg = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
    const passRate = results.length > 0 ? Math.round((results.filter(r => r.score >= 60).length / results.length) * 100) : 0;
    const lines = [
      `VR ChemLab — Analytics Report`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      `SUMMARY`,
      `Total Students: ${students.length}`,
      `Total Experiments: ${experiments.length}`,
      `Total Sessions: ${attendance.length}`,
      `Total Completions: ${results.length}`,
      `Overall Avg Score: ${overallAvg}%`,
      `Pass Rate (≥60%): ${passRate}%`,
      '',
      `EXPERIMENT PERFORMANCE`,
      ...experiments.map(exp => {
        const expRes = results.filter(r => r.experiment_id === exp.id);
        const avg = expRes.length > 0 ? Math.round(expRes.reduce((s, r) => s + r.score, 0) / expRes.length) : 0;
        return `${exp.title}: ${expRes.length} attempts, avg ${avg}%`;
      }),
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
    const a = document.createElement('a'); a.href = url; a.download = 'vrchemlab_report.txt'; a.click();
    URL.revokeObjectURL(url);
  }

  const overallAvg = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  const passRate = results.length > 0 ? Math.round((results.filter(r => r.score >= 60).length / results.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">Analytics & Reports</h2>
          <p className="text-slate-500 text-sm mt-0.5">Overall performance overview for all students</p>
        </div>
        <button onClick={exportReport} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors border border-slate-700">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Avg Score', value: `${overallAvg}%`, icon: Award, color: 'text-amber-400' },
          { label: 'Pass Rate', value: `${passRate}%`, icon: CheckCircle, color: 'text-green-400' },
          { label: 'Total Attempts', value: results.length, icon: FlaskConical, color: 'text-blue-400' },
          { label: 'At Risk', value: students.length > 0 ? results.filter(r => r.score < 50).length : 0, icon: AlertCircle, color: 'text-red-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <Icon className={`w-5 h-5 ${color} shrink-0`} />
            <div>
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-slate-500 text-xs">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Score distribution */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-5">Score Distribution</h3>
        {results.length === 0 ? (
          <p className="text-slate-600 text-center py-8 text-sm">No results data yet</p>
        ) : (
          <div className="space-y-3">
            {scoreRanges.map(({ label, min, max, color }) => {
              const count = results.filter(r => r.score >= min && r.score < max).length;
              const pct = Math.round((count / maxBucket) * 100);
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs w-20 shrink-0">{label}</span>
                  <div className="flex-1 bg-slate-800 rounded-full h-5 overflow-hidden">
                    <div className={`${color} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-slate-400 text-xs w-12 text-right shrink-0">{count} students</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Per-experiment breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-white font-semibold">Experiment Performance Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40">
                {['Experiment', 'Category', 'Attempts', 'Avg Score', 'Pass Rate'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {experiments.map(exp => {
                const expRes = results.filter(r => r.experiment_id === exp.id);
                const avg = expRes.length > 0 ? Math.round(expRes.reduce((s, r) => s + r.score, 0) / expRes.length) : 0;
                const pass = expRes.length > 0 ? Math.round((expRes.filter(r => r.score >= 60).length / expRes.length) * 100) : 0;
                return (
                  <tr key={exp.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-slate-200 font-medium">{exp.title}</p>
                      <p className="text-slate-600 text-xs">{exp.estimated_duration_minutes}min · {(exp.steps as unknown[])?.length ?? 0} steps</p>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{exp.category}</td>
                    <td className="py-3 px-4 text-slate-300 font-medium">{expRes.length}</td>
                    <td className="py-3 px-4">
                      <span className={`font-bold ${avg >= 80 ? 'text-green-400' : avg >= 60 ? 'text-yellow-400' : expRes.length === 0 ? 'text-slate-600' : 'text-red-400'}`}>
                        {expRes.length === 0 ? '—' : `${avg}%`}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-medium ${pass >= 80 ? 'text-green-400' : pass >= 60 ? 'text-yellow-400' : expRes.length === 0 ? 'text-slate-600' : 'text-red-400'}`}>
                        {expRes.length === 0 ? '—' : `${pass}%`}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {experiments.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-slate-600">No experiments yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Create Experiment Modal ─────────────────────────────────────────────────
type StepDraft = { step: number; title: string; desc: string };

interface ExpFormData {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimated_duration_minutes: number;
  objectives: string[];
  chemicals: string[];
  equipment: string[];
  safety_notes: string[];
  steps: StepDraft[];
}

function CreateExperimentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<ExpFormData>({
    title: '',
    description: '',
    category: '',
    difficulty: 'beginner',
    estimated_duration_minutes: 30,
    objectives: [''],
    chemicals: [''],
    equipment: [''],
    safety_notes: [''],
    steps: [{ step: 1, title: '', desc: '' }],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function setField<K extends keyof ExpFormData>(k: K, v: ExpFormData[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function updateArr(field: keyof ExpFormData, i: number, v: string) {
    setForm(prev => ({ ...prev, [field]: (prev[field] as string[]).map((x, idx) => idx === i ? v : x) }));
  }

  function addArr(field: keyof ExpFormData) {
    setForm(prev => ({ ...prev, [field]: [...(prev[field] as string[]), ''] }));
  }

  function removeArr(field: keyof ExpFormData, i: number) {
    setForm(prev => ({ ...prev, [field]: (prev[field] as string[]).filter((_, idx) => idx !== i) }));
  }

  function updateStep(i: number, k: keyof StepDraft, v: string) {
    setForm(prev => ({ ...prev, steps: prev.steps.map((s, idx) => idx === i ? { ...s, [k]: v } : s) }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return setError('Title is required');
    if (!form.description.trim()) return setError('Description is required');
    setLoading(true); setError('');

    const { error: err } = await supabase.from('experiments').insert({
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim() || 'General',
      difficulty: form.difficulty,
      estimated_duration_minutes: form.estimated_duration_minutes,
      objectives: form.objectives.filter(o => o.trim()),
      chemicals: form.chemicals.filter(c => c.trim()),
      equipment: form.equipment.filter(e => e.trim()),
      safety_notes: form.safety_notes.filter(s => s.trim()),
      steps: form.steps.filter(s => s.title.trim()).map((s, i) => ({ step: i + 1, title: s.title, desc: s.desc })),
      is_active: true,
    });

    setLoading(false);
    if (err) return setError(err.message);
    onSuccess();
  }

  function ArrayField({ label, field, placeholder }: { label: string; field: keyof ExpFormData; placeholder: string }) {
    const items = form[field] as string[];
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-300">{label}</label>
          <button type="button" onClick={() => addArr(field)} className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-amber-400 border border-slate-700 transition-colors">
            + Add
          </button>
        </div>
        <div className="space-y-2">
          {items.map((val, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text" value={val}
                onChange={e => updateArr(field, i, e.target.value)}
                placeholder={placeholder}
                className="lab-input text-sm flex-1"
              />
              {items.length > 1 && (
                <button type="button" onClick={() => removeArr(field, i)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl my-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30">
              <Beaker className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-white font-bold">Create New Experiment</h2>
              <p className="text-slate-500 text-xs">Fill in the details for the virtual lab activity</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Experiment Title *</label>
              <input type="text" value={form.title} onChange={e => setField('title', e.target.value)} placeholder="e.g., Acid-Base Titration" className="lab-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Category</label>
              <input type="text" value={form.category} onChange={e => setField('category', e.target.value)} placeholder="e.g., Analytical Chemistry" className="lab-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Difficulty</label>
              <select value={form.difficulty} onChange={e => setField('difficulty', e.target.value)} className="lab-input">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Duration (minutes)</label>
              <input type="number" value={form.estimated_duration_minutes} onChange={e => setField('estimated_duration_minutes', parseInt(e.target.value) || 30)} className="lab-input" min="5" max="240" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description *</label>
            <textarea value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Describe the experiment goals, setup, and what students will learn..." className="lab-input resize-none h-24" />
          </div>

          {/* Divider */}
          <div className="border-t border-slate-800 pt-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Lab Requirements</p>
            <div className="space-y-5">
              <ArrayField label="Chemicals / Reagents" field="chemicals" placeholder="e.g., Hydrochloric Acid (HCl) 0.1M" />
              <ArrayField label="Equipment & Tools" field="equipment" placeholder="e.g., 50ml Burette, Ring Stand" />
              <ArrayField label="Safety Precautions" field="safety_notes" placeholder="e.g., Wear safety goggles and gloves" />
              <ArrayField label="Learning Objectives" field="objectives" placeholder="e.g., Determine unknown concentration by titration" />
            </div>
          </div>

          {/* Steps */}
          <div className="border-t border-slate-800 pt-2">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Procedure Steps</p>
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, steps: [...prev.steps, { step: prev.steps.length + 1, title: '', desc: '' }] }))}
                className="text-xs px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-amber-400 border border-slate-700 transition-colors"
              >
                + Add Step
              </button>
            </div>
            <div className="space-y-3">
              {form.steps.map((step, i) => (
                <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-400 uppercase">Step {i + 1}</span>
                    {form.steps.length > 1 && (
                      <button type="button" onClick={() => setForm(prev => ({ ...prev, steps: prev.steps.filter((_, idx) => idx !== i) }))} className="text-red-400 hover:text-red-300 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input type="text" value={step.title} onChange={e => updateStep(i, 'title', e.target.value)} placeholder="Step title (e.g., Prepare the burette)" className="lab-input text-sm" />
                  <textarea value={step.desc} onChange={e => updateStep(i, 'desc', e.target.value)} placeholder="Detailed instructions for this step..." className="lab-input text-sm resize-none h-16" />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-slate-800">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors text-sm">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 rounded-lg font-bold transition-colors text-sm flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" /> : <BookOpen className="w-4 h-4" />}
              {loading ? 'Creating...' : 'Create Experiment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
