/**
 * WellTune — App.tsx
 * Single-file React application (Vite + Tailwind)
 * All views controlled by a `view` state string.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Leaf, LogIn, UserPlus, Home, ListMusic, Play, Users, BarChart2,
  PlusCircle, Trash2, Edit3, ChevronRight, ChevronLeft, CheckCircle2,
  Heart, MessageCircle, UserCheck, UserX, X, Clock, Sparkles, Moon,
  Zap, Smile, Frown, Meh, ThumbsUp, Star, ArrowLeft, Save, LogOut,
} from "lucide-react";

// ─── Config ──────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// ─── HTTP helper ─────────────────────────────────────────────────────────────
async function api(path: string, opts: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers: { ...headers, ...(opts.headers as Record<string,string> || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface User { id: number; username: string; email: string; bio?: string }
interface Step { id?: number; title: string; duration_sec: number; instruction?: string }
interface Playlist {
  id: number; user_id: number; title: string; description?: string;
  category: string; is_public: number; username: string;
  comment_count?: number; steps?: Step[]; comments?: Comment[]
}
interface MoodLog { id: number; mood: string; note?: string; playlist_title: string; logged_at: string }
interface Comment { id: number; user_id: number; username: string; body: string; created_at: string }

// ─── Category meta ───────────────────────────────────────────────────────────
const CATEGORIES: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  stress_relief: { label: "Stress Relief",  color: "bg-sky-100 text-sky-700",      icon: <Moon size={14}/> },
  strength:      { label: "Strength",       color: "bg-rose-100 text-rose-700",    icon: <Zap size={14}/> },
  flexibility:   { label: "Flexibility",    color: "bg-amber-100 text-amber-700",  icon: <Sparkles size={14}/> },
  mindfulness:   { label: "Mindfulness",    color: "bg-violet-100 text-violet-700",icon: <Leaf size={14}/> },
  energy:        { label: "Energy",         color: "bg-lime-100 text-lime-700",    icon: <Zap size={14}/> },
  sleep:         { label: "Sleep",          color: "bg-indigo-100 text-indigo-700",icon: <Moon size={14}/> },
};

const MOODS = [
  { val: "amazing", label: "Amazing", icon: <Star size={22}/>,       color: "text-yellow-500" },
  { val: "good",    label: "Good",    icon: <ThumbsUp size={22}/>,    color: "text-green-500" },
  { val: "okay",    label: "Okay",    icon: <Smile size={22}/>,       color: "text-sky-500" },
  { val: "tired",   label: "Tired",   icon: <Meh size={22}/>,         color: "text-orange-400" },
  { val: "stressed",label: "Stressed",icon: <Frown size={22}/>,       color: "text-red-400" },
];

// ═════════════════════════════════════════════════════════════════════════════
// Small UI atoms
// ═════════════════════════════════════════════════════════════════════════════

function Btn({ children, onClick, variant = "primary", className = "", disabled = false }:
  { children: React.ReactNode; onClick?: () => void; variant?: "primary"|"ghost"|"danger"|"outline"; className?: string; disabled?: boolean }) {
  const base = "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed";
  const v = {
    primary: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm",
    ghost:   "bg-transparent text-slate-600 hover:bg-slate-100",
    danger:  "bg-red-50 text-red-600 hover:bg-red-100",
    outline: "border border-slate-200 text-slate-700 hover:bg-slate-50",
  };
  return <button className={`${base} ${v[variant]} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <input
        {...props}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
      />
    </div>
  );
}

function Textarea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <textarea
        {...props}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition resize-none"
      />
    </div>
  );
}

function CategoryBadge({ cat }: { cat: string }) {
  const m = CATEGORIES[cat];
  if (!m) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${m.color}`}>
      {m.icon} {m.label}
    </span>
  );
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm px-5 py-3 rounded-2xl shadow-xl animate-fade-in flex items-center gap-3">
      <CheckCircle2 size={16} className="text-emerald-400 shrink-0"/> {msg}
      <button onClick={onClose}><X size={14}/></button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [token,   setToken  ] = useState<string|null>(() => localStorage.getItem("wt_token"));
  const [me,      setMe     ] = useState<User|null>(null);
  const [view,    setView   ] = useState("login"); // login | signup | survey | dashboard | explore | myRoutines | player | profile | moodHistory
  const [toast,   setToast  ] = useState("");
  const [activePlaylist, setActivePlaylist] = useState<Playlist|null>(null);
  const [profileUserId,  setProfileUserId ] = useState<number|null>(null);

  const showToast = useCallback((m: string) => setToast(m), []);

  // Bootstrap: load /me on mount if token exists
  useEffect(() => {
    if (!token) { setView("login"); return; }
    api("/auth/me", {}, token)
      .then((u) => {
        setMe(u);
        // Check survey completion
        api("/survey", {}, token).then((s) => {
          setView(s ? "dashboard" : "survey");
        }).catch(() => setView("survey"));
      })
      .catch(() => { localStorage.removeItem("wt_token"); setToken(null); setView("login"); });
  }, [token]);

  function logout() {
    localStorage.removeItem("wt_token");
    setToken(null);
    setMe(null);
    setView("login");
  }

  function openPlayer(pl: Playlist) { setActivePlaylist(pl); setView("player"); }
  function openProfile(uid: number) { setProfileUserId(uid); setView("profile"); }

  const nav = (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur border-t border-slate-100 flex justify-around py-2 md:top-0 md:bottom-auto md:left-0 md:right-auto md:w-20 md:flex-col md:h-screen md:border-t-0 md:border-r md:py-6 md:px-2 md:justify-start md:gap-2">
      {[
        { id: "dashboard",   icon: <Home size={22}/>,       label: "Home" },
        { id: "explore",     icon: <Users size={22}/>,      label: "Explore" },
        { id: "myRoutines",  icon: <ListMusic size={22}/>,  label: "Mine" },
        { id: "moodHistory", icon: <BarChart2 size={22}/>,  label: "Mood" },
      ].map((n) => (
        <button key={n.id} onClick={() => setView(n.id)}
          className={`flex flex-col items-center gap-0.5 p-2 rounded-xl text-xs font-medium transition-all
            ${view === n.id ? "text-emerald-600 bg-emerald-50" : "text-slate-400 hover:text-slate-700"}`}>
          {n.icon} <span className="hidden md:block">{n.label}</span>
        </button>
      ))}
      <button onClick={logout}
        className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-xs font-medium text-slate-400 hover:text-red-500 transition-all md:mt-auto">
        <LogOut size={22}/> <span className="hidden md:block">Out</span>
      </button>
    </nav>
  );

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-slate-50 font-sans">
      {me && nav}
      <main className={`${me ? "pb-20 md:pb-0 md:pl-20" : ""} min-h-screen`}>{children}</main>
      {toast && <Toast msg={toast} onClose={() => setToast("")}/>}
    </div>
  );

  if (!me) return shell(
    view === "signup"
      ? <SignupView setToken={setToken} setView={setView} showToast={showToast}/>
      : <LoginView  setToken={setToken} setView={setView} showToast={showToast}/>
  );

  if (view === "survey")      return shell(<SurveyView token={token!} setView={setView} showToast={showToast}/>);
  if (view === "dashboard")   return shell(<Dashboard  token={token!} me={me} setView={setView} openPlayer={openPlayer} showToast={showToast}/>);
  if (view === "explore")     return shell(<Explore    token={token!} me={me} openPlayer={openPlayer} openProfile={openProfile} showToast={showToast}/>);
  if (view === "myRoutines")  return shell(<MyRoutines token={token!} me={me} openPlayer={openPlayer} showToast={showToast}/>);
  if (view === "moodHistory") return shell(<MoodHistory token={token!}/>);
  if (view === "player" && activePlaylist) return shell(
    <Player token={token!} playlist={activePlaylist} onDone={() => setView("dashboard")} showToast={showToast}/>
  );
  if (view === "profile" && profileUserId) return shell(
    <Profile token={token!} userId={profileUserId} me={me} openPlayer={openPlayer} setView={setView} showToast={showToast}/>
  );

  return shell(<Dashboard token={token!} me={me} setView={setView} openPlayer={openPlayer} showToast={showToast}/>);
}

// ═════════════════════════════════════════════════════════════════════════════
// AUTH VIEWS
// ═════════════════════════════════════════════════════════════════════════════

function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg mb-4">
            <Leaf size={28} className="text-white"/>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">WellTune</h1>
          <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-slate-700">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}

function LoginView({ setToken, setView, showToast }: any) {
  const [email, setEmail] = useState(""); const [pass, setPass] = useState(""); const [loading, setLoading] = useState(false);
  async function submit() {
    setLoading(true);
    try {
      const d = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password: pass }) });
      localStorage.setItem("wt_token", d.token);
      setToken(d.token);
    } catch (e: any) { showToast(e.message); }
    finally { setLoading(false); }
  }
  return (
    <AuthCard title="Welcome back 👋" subtitle="Your wellness journey continues">
      <Input label="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com"/>
      <Input label="Password" type="password" value={pass} onChange={(e)=>setPass(e.target.value)} placeholder="••••••••"
        onKeyDown={(e)=>e.key==="Enter"&&submit()}/>
      <Btn onClick={submit} className="w-full justify-center" disabled={loading}>{loading?"Signing in…":"Sign In"}</Btn>
      <p className="text-center text-xs text-slate-500">No account? <button className="text-emerald-600 font-semibold" onClick={()=>setView("signup")}>Sign up free</button></p>
    </AuthCard>
  );
}

function SignupView({ setToken, setView, showToast }: any) {
  const [f, setF] = useState({ username:"", email:"", password:"" }); const [loading, setLoading] = useState(false);
  async function submit() {
    setLoading(true);
    try {
      const d = await api("/auth/signup", { method: "POST", body: JSON.stringify(f) });
      localStorage.setItem("wt_token", d.token);
      setToken(d.token);
    } catch (e: any) { showToast(e.message); }
    finally { setLoading(false); }
  }
  return (
    <AuthCard title="Create account" subtitle="Start your wellness journey today">
      <Input label="Username" value={f.username} onChange={(e)=>setF({...f,username:e.target.value})} placeholder="leafy_yogi"/>
      <Input label="Email" type="email" value={f.email} onChange={(e)=>setF({...f,email:e.target.value})} placeholder="you@example.com"/>
      <Input label="Password" type="password" value={f.password} onChange={(e)=>setF({...f,password:e.target.value})} placeholder="min 8 chars"/>
      <Btn onClick={submit} className="w-full justify-center" disabled={loading}>{loading?"Creating…":"Create Account"}</Btn>
      <p className="text-center text-xs text-slate-500">Already have an account? <button className="text-emerald-600 font-semibold" onClick={()=>setView("login")}>Sign in</button></p>
    </AuthCard>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SURVEY VIEW
// ═════════════════════════════════════════════════════════════════════════════

function SurveyView({ token, setView, showToast }: any) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ goal: "", experience: "beginner", days_per_week: 3 });

  const questions = [
    {
      q: "What's your primary wellness goal?",
      key: "goal",
      options: Object.entries(CATEGORIES).map(([val, m]) => ({ val, label: m.label, icon: m.icon })),
    },
    {
      q: "How would you describe your experience level?",
      key: "experience",
      options: [
        { val: "beginner",     label: "Beginner",     icon: <Leaf size={20}/> },
        { val: "intermediate", label: "Intermediate", icon: <Sparkles size={20}/> },
        { val: "advanced",     label: "Advanced",     icon: <Zap size={20}/> },
      ],
    },
    {
      q: "How many days per week do you want to practice?",
      key: "days_per_week",
      options: [2,3,4,5,6,7].map((d) => ({ val: d, label: `${d} days` })),
    },
  ];

  const cur = questions[step];

  async function finish() {
    try {
      await api("/survey", { method: "POST", body: JSON.stringify(answers) }, token);
      showToast("Welcome to WellTune! 🌿");
      setView("dashboard");
    } catch (e: any) { showToast(e.message); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center"><Leaf size={20} className="text-white"/></div>
          <div>
            <h1 className="font-bold text-slate-800">Quick Setup</h1>
            <p className="text-xs text-slate-500">Step {step+1} of {questions.length}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-8">
          {questions.map((_,i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i<=step?"bg-emerald-500":"bg-slate-200"}`}/>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6">{cur.q}</h2>
          <div className="grid grid-cols-2 gap-3">
            {cur.options.map((opt) => {
              const selected = (answers as any)[cur.key] === opt.val;
              return (
                <button key={String(opt.val)}
                  onClick={() => setAnswers({ ...answers, [cur.key]: opt.val })}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left text-sm font-medium transition-all
                    ${selected ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-100 hover:border-emerald-200 text-slate-700"}`}>
                  <span className={selected?"text-emerald-500":"text-slate-400"}>{(opt as any).icon}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between mt-8">
            <Btn variant="ghost" onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0}><ChevronLeft size={16}/> Back</Btn>
            {step < questions.length-1
              ? <Btn onClick={()=>setStep(s=>s+1)} disabled={!(answers as any)[cur.key]}>Next <ChevronRight size={16}/></Btn>
              : <Btn onClick={finish} disabled={!(answers as any)[cur.key]}><CheckCircle2 size={16}/> Let's Go!</Btn>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════

function Dashboard({ token, me, setView, openPlayer, showToast }: any) {
  const [recs,  setRecs ] = useState<Playlist[]>([]);
  const [moods, setMoods] = useState<MoodLog[]>([]);

  useEffect(() => {
    api("/playlists/recommended", {}, token).then(setRecs).catch(()=>{});
    api("/mood", {}, token).then(setMoods).catch(()=>{});
  }, [token]);

  const latest = moods[0];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Good day, {me.username} 🌿</h1>
          <p className="text-slate-500 text-sm mt-0.5">Your wellness journey, one step at a time.</p>
        </div>
        <button onClick={()=>setView("myRoutines")} className="bg-emerald-500 text-white rounded-xl p-3 shadow-sm hover:bg-emerald-600 transition">
          <PlusCircle size={20}/>
        </button>
      </div>

      {/* Latest mood card */}
      {latest && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Last Session Mood</p>
          <div className="flex items-center gap-3">
            <span className={`${MOODS.find(m=>m.val===latest.mood)?.color} text-2xl`}>
              {MOODS.find(m=>m.val===latest.mood)?.icon}
            </span>
            <div>
              <p className="font-semibold text-slate-800 capitalize">{latest.mood}</p>
              <p className="text-xs text-slate-400">{latest.playlist_title} · {new Date(latest.logged_at).toLocaleDateString()}</p>
            </div>
          </div>
          {latest.note && <p className="text-sm text-slate-600 mt-3 italic">"{latest.note}"</p>}
        </div>
      )}

      {/* Recommended */}
      <section>
        <h2 className="text-base font-bold text-slate-700 mb-3">Recommended for You</h2>
        {recs.length === 0
          ? <p className="text-sm text-slate-400">Complete your survey to get personalised picks.</p>
          : <div className="flex flex-col gap-3">
              {recs.slice(0,5).map(pl => (
                <PlaylistCard key={pl.id} pl={pl} onPlay={()=>openPlayer(pl)}/>
              ))}
            </div>
        }
      </section>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// EXPLORE
// ═════════════════════════════════════════════════════════════════════════════

function Explore({ token, me, openPlayer, openProfile, showToast }: any) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [cat, setCat] = useState("");
  const [selected, setSelected] = useState<Playlist|null>(null);
  const [comment, setComment] = useState("");

  useEffect(() => {
    api(`/playlists${cat?"?category="+cat:""}`, {}, token).then(setPlaylists).catch(()=>{});
  }, [cat, token]);

  async function loadDetail(pl: Playlist) {
    const d = await api(`/playlists/${pl.id}`, {}, token);
    setSelected(d);
  }

  async function sendComment() {
    if (!selected || !comment.trim()) return;
    try {
      const c = await api(`/playlists/${selected.id}/comments`, { method:"POST", body:JSON.stringify({body:comment}) }, token);
      setSelected(s => s ? { ...s, comments: [...(s.comments||[]), c] } : s);
      setComment("");
    } catch(e:any) { showToast(e.message); }
  }

  if (selected) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={()=>setSelected(null)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-6 transition">
        <ArrowLeft size={16}/> Back
      </button>
      <PlaylistDetail pl={selected} token={token} me={me} openPlayer={openPlayer} openProfile={openProfile} showToast={showToast}
        onRefresh={()=>loadDetail(selected)}/>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Explore</h1>
      <p className="text-slate-500 text-sm mb-6">Discover community wellness routines</p>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button onClick={()=>setCat("")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${!cat?"bg-emerald-500 text-white border-emerald-500":"border-slate-200 text-slate-600 hover:border-emerald-300"}`}>
          All
        </button>
        {Object.entries(CATEGORIES).map(([k,m]) => (
          <button key={k} onClick={()=>setCat(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${cat===k?"bg-emerald-500 text-white border-emerald-500":"border-slate-200 text-slate-600 hover:border-emerald-300"}`}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {playlists.map(pl => (
          <PlaylistCard key={pl.id} pl={pl} onPlay={()=>openPlayer(pl)} onDetail={()=>loadDetail(pl)}/>
        ))}
        {playlists.length===0 && <p className="text-sm text-slate-400">No routines found.</p>}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PLAYLIST DETAIL (used in Explore)
// ═════════════════════════════════════════════════════════════════════════════

function PlaylistDetail({ pl, token, me, openPlayer, openProfile, showToast, onRefresh }: any) {
  const [comment, setComment] = useState("");
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (pl.user_id !== me.id) {
      api(`/follow/status/${pl.user_id}`, {}, token).then(d=>setFollowing(d.following)).catch(()=>{});
    }
  }, [pl.user_id, token, me.id]);

  async function toggleFollow() {
    try {
      if (following) { await api(`/follow/${pl.user_id}`, {method:"DELETE"}, token); setFollowing(false); }
      else           { await api(`/follow/${pl.user_id}`, {method:"POST"},   token); setFollowing(true); }
    } catch(e:any) { showToast(e.message); }
  }

  async function sendComment() {
    if (!comment.trim()) return;
    try {
      await api(`/playlists/${pl.id}/comments`, {method:"POST",body:JSON.stringify({body:comment})}, token);
      setComment(""); onRefresh();
    } catch(e:any) { showToast(e.message); }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CategoryBadge cat={pl.category}/>
            <h2 className="text-xl font-bold text-slate-800 mt-2">{pl.title}</h2>
            {pl.description && <p className="text-slate-500 text-sm mt-1">{pl.description}</p>}
            <button onClick={()=>openProfile(pl.user_id)} className="text-xs text-emerald-600 font-semibold mt-2 hover:underline">
              by @{pl.username}
            </button>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Btn onClick={()=>openPlayer(pl)}><Play size={14}/> Start</Btn>
            {pl.user_id !== me.id && (
              <Btn variant={following?"outline":"ghost"} onClick={toggleFollow}>
                {following ? <><UserX size={14}/> Unfollow</> : <><UserCheck size={14}/> Follow</>}
              </Btn>
            )}
          </div>
        </div>
      </div>

      {/* Steps preview */}
      {pl.steps?.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-3 text-sm">Steps ({pl.steps.length})</h3>
          <div className="flex flex-col gap-2">
            {pl.steps.map((s: Step, i: number) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0">{i+1}</span>
                <span className="flex-1 text-slate-700">{s.title}</span>
                <span className="text-xs text-slate-400 flex items-center gap-1"><Clock size={12}/>{s.duration_sec}s</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><MessageCircle size={16}/> Comments</h3>
        <div className="flex flex-col gap-3 mb-4 max-h-60 overflow-y-auto">
          {(pl.comments||[]).map((c: Comment) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600 shrink-0">
                {c.username[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <span className="text-xs font-semibold text-slate-600">@{c.username} </span>
                <span className="text-sm text-slate-700">{c.body}</span>
              </div>
            </div>
          ))}
          {(pl.comments||[]).length===0 && <p className="text-xs text-slate-400">Be the first to comment!</p>}
        </div>
        <div className="flex gap-2">
          <input value={comment} onChange={e=>setComment(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&sendComment()}
            placeholder="Share encouragement…"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"/>
          <Btn onClick={sendComment}>Post</Btn>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MY ROUTINES
// ═════════════════════════════════════════════════════════════════════════════

function MyRoutines({ token, me, openPlayer, showToast }: any) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [editing, setEditing] = useState<Playlist|null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { reload(); }, []);

  function reload() {
    api("/playlists/mine", {}, token).then(setPlaylists).catch(()=>{});
  }

  async function deleteP(id: number) {
    try {
      await api(`/playlists/${id}`, {method:"DELETE"}, token);
      showToast("Routine deleted");
      reload();
    } catch(e:any) { showToast(e.message); }
  }

  if (creating || editing) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={()=>{setCreating(false);setEditing(null);}} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-6 transition">
        <ArrowLeft size={16}/> Back
      </button>
      <PlaylistEditor token={token} existing={editing} onSave={()=>{setCreating(false);setEditing(null);reload();showToast(editing?"Updated!":"Created! 🎉");}} showToast={showToast}/>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Routines</h1>
          <p className="text-slate-500 text-sm">Create and manage your wellness playlists</p>
        </div>
        <Btn onClick={()=>setCreating(true)}><PlusCircle size={16}/> New</Btn>
      </div>
      {playlists.length===0
        ? <div className="text-center py-16">
            <ListMusic size={40} className="text-slate-200 mx-auto mb-3"/>
            <p className="text-slate-400 text-sm">No routines yet. Create your first one!</p>
          </div>
        : <div className="flex flex-col gap-3">
            {playlists.map(pl => (
              <PlaylistCard key={pl.id} pl={pl} onPlay={()=>openPlayer(pl)}
                actions={
                  <div className="flex gap-1">
                    <Btn variant="ghost" className="!p-2" onClick={()=>setEditing(pl)}><Edit3 size={15}/></Btn>
                    <Btn variant="danger" className="!p-2" onClick={()=>deleteP(pl.id)}><Trash2 size={15}/></Btn>
                  </div>
                }/>
            ))}
          </div>
      }
    </div>
  );
}

// ─── Playlist Editor ─────────────────────────────────────────────────────────
function PlaylistEditor({ token, existing, onSave, showToast }: any) {
  const [form, setForm] = useState({
    title: existing?.title || "",
    description: existing?.description || "",
    category: existing?.category || "mindfulness",
    is_public: existing?.is_public ?? 1,
  });
  const [steps, setSteps] = useState<Step[]>(existing?.steps || [{ title:"", duration_sec:60, instruction:"" }]);

  async function save() {
    if (!form.title.trim()) return showToast("Title required");
    if (steps.some(s=>!s.title.trim())) return showToast("All steps need a title");
    try {
      if (existing) {
        await api(`/playlists/${existing.id}`, {method:"PUT", body:JSON.stringify({...form, steps})}, token);
      } else {
        await api("/playlists", {method:"POST", body:JSON.stringify({...form, steps})}, token);
      }
      onSave();
    } catch(e:any) { showToast(e.message); }
  }

  function addStep() { setSteps(s=>[...s,{title:"",duration_sec:60,instruction:""}]); }
  function updateStep(i:number, k: keyof Step, v: any) { setSteps(s=>s.map((s2,j)=>j===i?{...s2,[k]:v}:s2)); }
  function removeStep(i:number) { setSteps(s=>s.filter((_,j)=>j!==i)); }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold text-slate-800">{existing?"Edit Routine":"New Routine"}</h2>

      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col gap-4">
        <Input label="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Morning Flow"/>
        <Textarea label="Description (optional)" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={2} placeholder="A gentle routine to start your day…"/>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</label>
          <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition">
            {Object.entries(CATEGORIES).map(([k,m])=><option key={k} value={k}>{m.label}</option>)}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input type="checkbox" checked={form.is_public===1} onChange={e=>setForm({...form,is_public:e.target.checked?1:0})}
            className="w-4 h-4 accent-emerald-500"/>
          Make public (share with community)
        </label>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-700">Steps</h3>
          <Btn variant="outline" onClick={addStep}><PlusCircle size={14}/> Add Step</Btn>
        </div>
        {steps.map((s,i)=>(
          <div key={i} className="border border-slate-100 rounded-xl p-4 flex flex-col gap-3 relative">
            <span className="absolute top-3 left-4 w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full text-xs font-bold flex items-center justify-center">{i+1}</span>
            <div className="pl-8">
              <Input label="Step Title" value={s.title} onChange={e=>updateStep(i,"title",e.target.value)} placeholder="Child's Pose"/>
            </div>
            <div className="flex gap-3 pl-8">
              <div className="flex-1">
                <Input label="Duration (seconds)" type="number" value={s.duration_sec} onChange={e=>updateStep(i,"duration_sec",Number(e.target.value))}/>
              </div>
              {steps.length>1 && <button onClick={()=>removeStep(i)} className="self-end mb-0.5 text-red-400 hover:text-red-600 transition"><Trash2 size={16}/></button>}
            </div>
            <div className="pl-8">
              <Textarea label="Instruction (optional)" value={s.instruction||""} onChange={e=>updateStep(i,"instruction",e.target.value)} rows={2} placeholder="Focus on your breath…"/>
            </div>
          </div>
        ))}
      </div>

      <Btn onClick={save} className="self-end"><Save size={15}/> {existing?"Save Changes":"Create Routine"}</Btn>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PLAYER
// ═════════════════════════════════════════════════════════════════════════════

function Player({ token, playlist, onDone, showToast }: any) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [mood, setMood] = useState("");
  const [note, setNote] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(() => {
    api(`/playlists/${playlist.id}`, {}, token).then(d => {
      setSteps(d.steps || []);
      if (d.steps?.length) setTimeLeft(d.steps[0].duration_sec);
    });
  }, [playlist.id, token]);

  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); advance(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [running, stepIdx]);

  function advance() {
    setRunning(false);
    if (stepIdx < steps.length - 1) {
      const next = stepIdx + 1;
      setStepIdx(next);
      setTimeLeft(steps[next].duration_sec);
    } else {
      setDone(true);
    }
  }

  async function submitMood() {
    if (!mood) return showToast("Please select a mood");
    try {
      await api("/mood", {method:"POST",body:JSON.stringify({playlist_id:playlist.id,mood,note})}, token);
      showToast("Great work today! 🌟");
      onDone();
    } catch(e:any) { showToast(e.message); }
  }

  const cur = steps[stepIdx];
  const pct = cur ? Math.round(((cur.duration_sec - timeLeft)/cur.duration_sec)*100) : 0;
  const fmt = (s:number) => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;

  if (done) return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-emerald-500"/>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Congratulations! 🎉</h2>
        <p className="text-slate-500 mb-8">You completed <strong>{playlist.title}</strong>. How do you feel?</p>

        <div className="grid grid-cols-5 gap-3 mb-6">
          {MOODS.map(m => (
            <button key={m.val} onClick={()=>setMood(m.val)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition
                ${mood===m.val?"border-emerald-400 bg-emerald-50":"border-slate-100 hover:border-emerald-200"}`}>
              <span className={m.color}>{m.icon}</span>
              <span className="text-xs text-slate-600">{m.label}</span>
            </button>
          ))}
        </div>

        <Textarea label="Optional note" value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="Any thoughts on today's session…"/>

        <Btn onClick={submitMood} className="w-full justify-center mt-4"><Heart size={16}/> Log Mood & Finish</Btn>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/10">
        <button onClick={onDone} className="text-white/60 hover:text-white transition"><X size={22}/></button>
        <div className="text-center">
          <p className="text-xs text-white/50 uppercase tracking-widest">Now playing</p>
          <p className="font-semibold text-sm truncate max-w-xs">{playlist.title}</p>
        </div>
        <span className="text-xs text-white/40">{stepIdx+1}/{steps.length}</span>
      </div>

      {/* Step progress rail */}
      <div className="flex gap-1 px-5 pt-4">
        {steps.map((_,i)=>(
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i<stepIdx?"bg-emerald-500":i===stepIdx?"bg-emerald-400":"bg-white/20"}`}/>
        ))}
      </div>

      {/* Main step view */}
      {cur && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8">
          {/* Circular timer */}
          <div className="relative w-52 h-52">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4"/>
              <circle cx="50" cy="50" r="46" fill="none" stroke="#10b981" strokeWidth="4"
                strokeDasharray={`${pct*2.89} 289`} strokeLinecap="round"/>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold tabular-nums">{fmt(timeLeft)}</span>
              <span className="text-white/50 text-xs mt-1">remaining</span>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">{cur.title}</h2>
            {cur.instruction && <p className="text-white/60 text-sm max-w-xs leading-relaxed">{cur.instruction}</p>}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="p-8 flex items-center justify-center gap-6">
        <button onClick={()=>{setStepIdx(i=>Math.max(0,i-1));setTimeLeft(steps[Math.max(0,stepIdx-1)]?.duration_sec||60);setRunning(false);}}
          className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition" disabled={stepIdx===0}>
          <ChevronLeft size={22}/>
        </button>
        <button onClick={()=>setRunning(r=>!r)}
          className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow-lg transition">
          {running ? <span className="flex gap-1.5"><span className="w-1.5 h-5 bg-white rounded-sm"/><span className="w-1.5 h-5 bg-white rounded-sm"/></span> : <Play size={24} fill="white"/>}
        </button>
        <button onClick={advance}
          className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
          <ChevronRight size={22}/>
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MOOD HISTORY
// ═════════════════════════════════════════════════════════════════════════════

function MoodHistory({ token }: any) {
  const [logs, setLogs] = useState<MoodLog[]>([]);
  useEffect(()=>{ api("/mood",{},token).then(setLogs).catch(()=>{}); },[token]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Mood Journal</h1>
      <p className="text-slate-500 text-sm mb-6">Your personal wellness record — celebrated, not scored.</p>

      {logs.length===0
        ? <div className="text-center py-16"><BarChart2 size={40} className="text-slate-200 mx-auto mb-3"/><p className="text-slate-400 text-sm">Complete a routine to see your mood history</p></div>
        : <div className="flex flex-col gap-3">
            {logs.map(l=>{
              const m = MOODS.find(x=>x.val===l.mood);
              return (
                <div key={l.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-start gap-4">
                  <span className={`${m?.color} mt-0.5`}>{m?.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 capitalize">{l.mood}</span>
                      <span className="text-slate-400 text-xs">after</span>
                      <span className="text-emerald-600 text-sm font-medium">{l.playlist_title}</span>
                    </div>
                    {l.note && <p className="text-sm text-slate-500 mt-1 italic">"{l.note}"</p>}
                    <p className="text-xs text-slate-400 mt-1">{new Date(l.logged_at).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PROFILE
// ═════════════════════════════════════════════════════════════════════════════

function Profile({ token, userId, me, openPlayer, setView, showToast }: any) {
  const [user, setUser] = useState<User|null>(null);
  const [pls, setPls] = useState<Playlist[]>([]);
  const [following, setFollowing] = useState(false);
  const [stats, setStats] = useState({ followers:0, following:0 });

  useEffect(()=>{
    if (userId===me.id) { setUser(me); } else {
      api(`/auth/me`,{},token).then(()=>{}); // placeholder: can't fetch other user profile endpoint without adding one
      // minimal: use playlist data to infer username
    }
    api(`/users/${userId}/playlists`,{},token).then(setPls).catch(()=>{});
    api(`/users/${userId}/followers`,{},token).then((r:any[])=>setStats(s=>({...s,followers:r.length}))).catch(()=>{});
    api(`/users/${userId}/following`,{},token).then((r:any[])=>setStats(s=>({...s,following:r.length}))).catch(()=>{});
    if (userId!==me.id) api(`/follow/status/${userId}`,{},token).then(d=>setFollowing(d.following)).catch(()=>{});
  },[userId,token,me]);

  async function toggleFollow() {
    try {
      if (following) { await api(`/follow/${userId}`,{method:"DELETE"},token); setFollowing(false); setStats(s=>({...s,followers:s.followers-1})); }
      else           { await api(`/follow/${userId}`,{method:"POST"},  token); setFollowing(true);  setStats(s=>({...s,followers:s.followers+1})); }
    } catch(e:any) { showToast(e.message); }
  }

  const displayName = pls[0]?.username || me.username;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={()=>setView("explore")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-6 transition">
        <ArrowLeft size={16}/> Back
      </button>
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl font-bold text-emerald-600">
              {displayName[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">@{displayName}</h2>
              <div className="flex gap-4 mt-1">
                <span className="text-xs text-slate-500"><strong className="text-slate-700">{stats.followers}</strong> followers</span>
                <span className="text-xs text-slate-500"><strong className="text-slate-700">{stats.following}</strong> following</span>
              </div>
            </div>
          </div>
          {userId!==me.id && (
            <Btn variant={following?"outline":"primary"} onClick={toggleFollow}>
              {following ? <><UserX size={14}/> Unfollow</> : <><UserCheck size={14}/> Follow</>}
            </Btn>
          )}
        </div>
      </div>
      <h3 className="font-semibold text-slate-700 mb-3">Public Routines</h3>
      {pls.length===0
        ? <p className="text-sm text-slate-400">No public routines yet.</p>
        : <div className="flex flex-col gap-3">{pls.map(pl=><PlaylistCard key={pl.id} pl={pl} onPlay={()=>openPlayer(pl)}/>)}</div>
      }
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Shared: PlaylistCard
// ═════════════════════════════════════════════════════════════════════════════

function PlaylistCard({ pl, onPlay, onDetail, actions }: { pl:Playlist; onPlay:()=>void; onDetail?:()=>void; actions?: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
        {CATEGORIES[pl.category]?.icon || <Leaf size={18} className="text-emerald-500"/>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 truncate">{pl.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <CategoryBadge cat={pl.category}/>
          {pl.username && <span className="text-xs text-slate-400">@{pl.username}</span>}
          {typeof pl.comment_count==="number" && <span className="text-xs text-slate-400 flex items-center gap-0.5"><MessageCircle size={11}/>{pl.comment_count}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {actions}
        {onDetail && <Btn variant="ghost" className="!p-2" onClick={onDetail}><MessageCircle size={15}/></Btn>}
        <button onClick={onPlay} className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition shadow-sm">
          <Play size={16} fill="white"/>
        </button>
      </div>
    </div>
  );
}
