import { useEffect, useMemo, useState } from "react";
import {
  BookOpen, Bot, Brain, ChartNoAxesColumnIncreasing, Check, ChevronRight,
  CircleHelp, Clock3, GraduationCap, LogOut, Menu, MessageCircle, Plus,
  Send, Settings, ShieldCheck, Sparkles, UserRound, X, Zap
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

const navItems = [
  { id: "home", label: "ホーム", icon: GraduationCap },
  { id: "ai", label: "勉強AI", icon: Bot },
  { id: "flashcards", label: "暗記カード", icon: Brain },
  { id: "records", label: "学習記録", icon: ChartNoAxesColumnIncreasing }
];

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState("home");
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "こんにちは！勉強AIです 📚\\nわからない問題や、勉強の進め方を気軽に質問してね。" }
  ]);
  const [aiBusy, setAiBusy] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logMinutes, setLogMinutes] = useState("30");
  const [logSubject, setLogSubject] = useState("数学");
  const [logNote, setLogNote] = useState("");
  const [cards, setCards] = useState([]);
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) { setProfile(null); return; }
    loadUserData();
  }, [session]);

  async function loadUserData() {
    const { data: p } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
    setProfile(p);
    const [{ data: l }, { data: c }] = await Promise.all([
      supabase.from("study_logs").select("*").order("created_at", { ascending: false }).limit(30),
      supabase.from("flashcards").select("*").order("created_at", { ascending: false }).limit(100)
    ]);
    setLogs(l || []);
    setCards(c || []);
  }

  async function handleAuth(e) {
    e.preventDefault();
    setAuthBusy(true); setAuthMessage("");
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail, password: authPassword,
          options: { data: { display_name: displayName } }
        });
        if (error) throw error;
        if (data.session) setAuthMessage("アカウントを作成しました！");
        else setAuthMessage("確認メールを送信しました。メール内のリンクから登録を完了してください。");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
      }
    } catch (err) { setAuthMessage(err.message || "認証に失敗しました。"); }
    finally { setAuthBusy(false); }
  }

  async function logout() { await supabase.auth.signOut(); setPage("home"); }

  async function askAI(e) {
    e?.preventDefault();
    const prompt = question.trim();
    if (!prompt || aiBusy) return;
    const next = [...messages, { role: "user", content: prompt }];
    setMessages(next); setQuestion(""); setAiBusy(true);
    try {
      const endpoint = import.meta.env.VITE_AI_WORKER_URL;
      if (!endpoint) throw new Error("AI接続先が未設定です。.env.local の VITE_AI_WORKER_URL を設定してください。");
      const response = await fetch(`${endpoint}/api/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-12).map(({ role, content }) => ({ role, content })) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "AIへの接続に失敗しました。");
      setMessages([...next, { role: "assistant", content: result.reply }]);
    } catch (err) {
      setMessages([...next, { role: "assistant", content: `接続エラー：${err.message}` }]);
    } finally { setAiBusy(false); }
  }

  async function addLog(e) {
    e.preventDefault();
    const minutes = Number(logMinutes);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) return;
    const item = { user_id: session.user.id, subject: logSubject, minutes, note: logNote.trim() };
    const { data, error } = await supabase.from("study_logs").insert(item).select().single();
    if (error) return setNotice(error.message);
    setLogs([data, ...logs]); setLogNote(""); setNotice("学習記録を保存しました！");
  }

  async function addCard(e) {
    e.preventDefault();
    if (!cardFront.trim() || !cardBack.trim()) return;
    const { data, error } = await supabase.from("flashcards")
      .insert({ user_id: session.user.id, front: cardFront.trim(), back: cardBack.trim() }).select().single();
    if (error) return setNotice(error.message);
    setCards([data, ...cards]); setCardFront(""); setCardBack(""); setNotice("暗記カードを追加しました！");
  }

  const totalMinutes = useMemo(() => logs.reduce((sum, item) => sum + item.minutes, 0), [logs]);
  const greeting = profile?.display_name || session?.user?.user_metadata?.display_name || session?.user?.email?.split("@")[0] || "学習者";

  if (!isSupabaseConfigured) return <SetupScreen />;
  if (!session) return <AuthScreen {...{authMode,setAuthMode,authEmail,setAuthEmail,authPassword,setAuthPassword,displayName,setDisplayName,authBusy,authMessage,handleAuth}} />;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="brand"><div className="brand-mark"><GraduationCap size={23}/></div><span>STUDY <b>TOOLS</b></span><button className="icon-btn mobile-close" onClick={()=>setMobileNav(false)}><X/></button></div>
        <div className="side-caption">LEARNING SPACE</div>
        <nav>{navItems.map(item => <button key={item.id} className={`nav-link ${page===item.id?"active":""}`} onClick={()=>{setPage(item.id);setMobileNav(false);}}><item.icon size={19}/>{item.label}{item.id==="ai"&&<span className="nav-new">AI</span>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={18}/></div><b>学習を楽しもう！</b><p>毎日少しずつの積み重ねが大切。</p></div><button className="nav-link" onClick={logout}><LogOut size={18}/>ログアウト</button></div>
      </aside>
      {mobileNav && <div className="scrim" onClick={()=>setMobileNav(false)}/>}
      <main className="main-area">
        <header className="topbar"><button className="icon-btn mobile-menu" onClick={()=>setMobileNav(true)}><Menu/></button><div className="breadcrumb">STUDY TOOLS <ChevronRight size={14}/><span>{navItems.find(n=>n.id===page)?.label}</span></div><div className="user-chip"><div className="avatar"><UserRound size={16}/></div><span>{greeting}</span></div></header>
        <div className="content">
          {notice && <div className="notice" onClick={()=>setNotice("")}>{notice}<X size={15}/></div>}
          {page==="home" && <HomePage {...{greeting,totalMinutes,logs,cards,setPage}}/>}
          {page==="ai" && <AIPage {...{messages,question,setQuestion,aiBusy,askAI}}/>}
          {page==="records" && <RecordsPage {...{logs,totalMinutes,logMinutes,setLogMinutes,logSubject,setLogSubject,logNote,setLogNote,addLog}}/>}
          {page==="flashcards" && <FlashcardsPage {...{cards,cardFront,setCardFront,cardBack,setCardBack,addCard,showAnswer,setShowAnswer}}/>}
        </div>
        <footer>© {new Date().getFullYear()} STUDY TOOLS <span>学びを、もっと身近に。</span></footer>
      </main>
    </div>
  );
}

function SetupScreen() {
  return <div className="auth-wrap"><div className="auth-card setup-card"><Brand/><div className="eyebrow">FIRST-TIME SETUP</div><h1>あと少しで準備完了！</h1><p>Supabaseの接続情報がまだ設定されていません。</p><ol><li><a href="https://supabase.com" target="_blank" rel="noreferrer">Supabase</a>でプロジェクトを作成</li><li>Project Settings → API からURLと公開用キーを取得</li><li>プロジェクト直下に <code>.env.local</code> を作成</li><li><code>.env.example</code> の項目をコピーして値を入力</li><li>ターミナルで <code>npm run dev</code> を実行</li></ol><div className="config-note"><ShieldCheck size={18}/>秘密のService Role KeyやAI APIキーはここに入力しないでください。</div></div></div>;
}
function Brand(){return <div className="auth-brand"><div className="brand-mark"><GraduationCap size={23}/></div><span>STUDY <b>TOOLS</b></span></div>}
function AuthScreen(p) {
  return <div className="auth-wrap"><div className="auth-decoration"><div className="orb orb-one"/><div className="orb orb-two"/><div className="auth-message"><div className="eyebrow">YOUR PERSONAL LEARNING SPACE</div><h1>学ぶって、<br/>おもしろい。</h1><p>AIと一緒に、あなたのペースで。<br/>毎日の学習をもっとスマートに。</p><div className="feature-pills"><span><Bot size={15}/> AI学習サポート</span><span><Brain size={15}/> 暗記カード</span><span><ChartNoAxesColumnIncreasing size={15}/> 学習記録</span></div></div></div><div className="auth-panel"><div className="auth-card"><Brand/><div className="eyebrow">{p.authMode==="login"?"WELCOME BACK":"GET STARTED"}</div><h2>{p.authMode==="login"?"おかえりなさい！":"アカウントを作成"}</h2><p className="muted">{p.authMode==="login"?"ログインして学習を続けましょう。":"無料で登録して学習を始めましょう。"}</p><form onSubmit={p.handleAuth}>{p.authMode==="signup"&&<label>表示名<input value={p.displayName} onChange={e=>p.setDisplayName(e.target.value)} placeholder="例：はる" required/></label>}<label>メールアドレス<input type="email" value={p.authEmail} onChange={e=>p.setAuthEmail(e.target.value)} placeholder="you@example.com" required/></label><label>パスワード<input type="password" minLength="8" value={p.authPassword} onChange={e=>p.setAuthPassword(e.target.value)} placeholder="8文字以上" required/></label>{p.authMessage&&<div className="auth-message">{p.authMessage}</div>}<button className="primary-btn full" disabled={p.authBusy}>{p.authBusy?"処理中...":p.authMode==="login"?"ログインする":"アカウントを作成"}<ChevronRight size={17}/></button></form><div className="switch-auth">{p.authMode==="login"?"アカウントをお持ちでない方":"すでにアカウントをお持ちの方"} <button onClick={()=>{p.setAuthMode(p.authMode==="login"?"signup":"login");}}>{p.authMode==="login"?"新規登録":"ログイン"}</button></div><div className="auth-safe"><ShieldCheck size={15}/> Supabaseによる安全な認証</div></div></div></div>;
}
function PageHeading({eyebrow,title,desc,action}){return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{desc}</p></div>{action}</div>}
function HomePage({greeting,totalMinutes,logs,cards,setPage}) {
  return <><PageHeading eyebrow="YOUR DASHBOARD" title={`こんにちは、${greeting}さん！`} desc="今日も自分のペースで、一歩ずつ進んでいこう。" action={<div className="date-pill"><Clock3 size={15}/>{new Date().toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric",weekday:"short"})}</div>}/>
    <section className="hero-banner"><div className="hero-copy"><div className="hero-tag"><Sparkles size={14}/> STUDY SMARTER</div><h2>今日の学びが、<br/>未来の自分をつくる。</h2><p>わからないことはAIに質問。学習の記録もここで管理しよう。</p><button className="light-btn" onClick={()=>setPage("ai")}>勉強AIに相談する <ChevronRight size={16}/></button></div><div className="hero-art"><div className="art-circle"><BookOpen size={66}/></div><div className="floating-note"><Zap size={16}/> KEEP GOING!</div><div className="sparkle s1">✦</div><div className="sparkle s2">✧</div></div></section>
    <div className="section-title"><div><h3>学習サマリー</h3><p>これまでの学習状況</p></div></div>
    <div className="stats-grid"><Stat icon={Clock3} label="累計学習時間" value={`${Math.floor(totalMinutes/60)}時間 ${totalMinutes%60}分`} color="blue"/><Stat icon={BookOpen} label="学習記録" value={`${logs.length}件`} color="purple"/><Stat icon={Brain} label="暗記カード" value={`${cards.length}枚`} color="orange"/></div>
    <div className="quick-grid"><button className="quick-card" onClick={()=>setPage("ai")}><div className="quick-icon violet"><Bot/></div><div><b>勉強AIに質問</b><p>苦手なところをわかりやすく解説</p></div><ChevronRight/></button><button className="quick-card" onClick={()=>setPage("flashcards")}><div className="quick-icon orange"><Brain/></div><div><b>暗記カードを使う</b><p>重要な用語や単語を覚えよう</p></div><ChevronRight/></button><button className="quick-card" onClick={()=>setPage("records")}><div className="quick-icon green"><ChartNoAxesColumnIncreasing/></div><div><b>学習を記録する</b><p>勉強時間を残して振り返ろう</p></div><ChevronRight/></button></div>
    <div className="section-title"><div><h3>最近の学習</h3><p>直近の記録</p></div><button className="text-btn" onClick={()=>setPage("records")}>すべて見る <ChevronRight size={15}/></button></div>
    <div className="panel">{logs.length===0?<div className="empty-state"><BookOpen size={27}/><b>まだ学習記録がありません</b><p>最初の学習を記録してみよう！</p></div>:logs.slice(0,4).map(log=><div className="record-row" key={log.id}><div className="subject-dot"/><div className="record-info"><b>{log.subject}</b><small>{new Date(log.created_at).toLocaleDateString("ja-JP")} {log.note&&`・${log.note}`}</small></div><strong>{log.minutes}分</strong></div>)}</div>
  </>;
}
function Stat({icon:Icon,label,value,color}){return <div className="stat-card"><div className={`stat-icon ${color}`}><Icon size={20}/></div><div><p>{label}</p><strong>{value}</strong></div></div>}
function AIPage({messages,question,setQuestion,aiBusy,askAI}) {
  const suggestions=["二次方程式の解き方を教えて","英語の現在完了形をわかりやすく説明して","日本史の明治維新を要約して"];
  return <><PageHeading eyebrow="AI STUDY ASSISTANT" title="勉強AI" desc="どんな質問にも、あなたに合わせてわかりやすく解説するよ。" action={<div className="ai-status"><span/> AIアシスタント</div>}/><div className="ai-layout"><div className="chat-panel"><div className="chat-header"><div className="ai-avatar"><Bot/></div><div><b>STUDY AI</b><small>あなたの学習パートナー</small></div><span className="online-dot"/></div><div className="chat-messages">{messages.map((m,i)=><div className={`message ${m.role}`} key={i}><div className="message-avatar">{m.role==="assistant"?<Bot size={16}/>:<UserRound size={16}/>}</div><div className="bubble">{m.content}</div></div>)}{aiBusy&&<div className="message assistant"><div className="message-avatar"><Bot size={16}/></div><div className="bubble typing">考え中<span>.</span><span>.</span><span>.</span></div></div>}</div><form className="chat-input" onSubmit={askAI}><input value={question} onChange={e=>setQuestion(e.target.value)} placeholder="質問を入力してね..." disabled={aiBusy}/><button disabled={aiBusy||!question.trim()}><Send size={18}/></button></form><div className="chat-disclaimer">AIの回答は間違うこともあります。教科書や信頼できる資料でも確認しよう。</div></div><aside className="suggestion-panel"><h3><Sparkles size={17}/> 質問のヒント</h3><p>こんな質問をしてみよう！</p>{suggestions.map(s=><button key={s} onClick={()=>setQuestion(s)}>{s}<ChevronRight size={15}/></button>)}<div className="ai-tip"><ShieldCheck size={18}/><b>使い方のコツ</b><p>学年・教科・どこがわからないかを書くと、より具体的な解説がもらえるよ。</p></div></aside></div></>;
}
function RecordsPage(p) {
  return <><PageHeading eyebrow="STUDY TRACKER" title="学習記録" desc="頑張った時間を記録して、成長を見える化しよう。"/><div className="record-layout"><form className="panel form-panel" onSubmit={p.addLog}><h3><Plus size={18}/> 学習を記録する</h3><label>教科<select value={p.logSubject} onChange={e=>p.setLogSubject(e.target.value)}>{["数学","英語","国語","理科","社会","その他"].map(x=><option key={x}>{x}</option>)}</select></label><label>学習時間（分）<input type="number" min="1" max="1440" value={p.logMinutes} onChange={e=>p.setLogMinutes(e.target.value)} required/></label><label>メモ（任意）<textarea value={p.logNote} onChange={e=>p.setLogNote(e.target.value)} placeholder="例：二次関数の問題を10問解いた"/></label><button className="primary-btn full">記録を保存 <Check size={17}/></button></form><div className="record-list-wrap"><div className="stats-grid single-stat"><Stat icon={Clock3} label="累計学習時間" value={`${Math.floor(p.totalMinutes/60)}時間 ${p.totalMinutes%60}分`} color="blue"/></div><div className="panel"><h3>学習履歴</h3>{p.logs.length===0?<div className="empty-state">学習記録はまだありません。</div>:p.logs.map(log=><div className="record-row" key={log.id}><div className="subject-dot"/><div className="record-info"><b>{log.subject}</b><small>{new Date(log.created_at).toLocaleString("ja-JP")} {log.note&&`・${log.note}`}</small></div><strong>{log.minutes}分</strong></div>)}</div></div></div></>;
}
function FlashcardsPage(p) {
  const current=p.cards[0];
  return <><PageHeading eyebrow="MEMORY TRAINING" title="暗記カード" desc="自分だけのカードを作って、効率よく覚えよう。"/><div className="flash-layout"><form className="panel form-panel" onSubmit={p.addCard}><h3><Plus size={18}/> カードを作成</h3><label>表（問題・単語）<textarea value={p.cardFront} onChange={e=>p.setCardFront(e.target.value)} placeholder="例：光合成とは？" required/></label><label>裏（答え・意味）<textarea value={p.cardBack} onChange={e=>p.setCardBack(e.target.value)} placeholder="例：植物が光エネルギーを使って..." required/></label><button className="primary-btn full">カードを追加 <Plus size={17}/></button></form><div className="flash-review"><div className="section-title"><div><h3>カード一覧</h3><p>{p.cards.length}枚のカード</p></div></div>{current?<><button className="flash-card" onClick={()=>p.setShowAnswer(!p.showAnswer)}><span className="card-label">{p.showAnswer?"ANSWER":"QUESTION"}</span><strong>{p.showAnswer?current.back:current.front}</strong><small>タップして{p.showAnswer?"問題":"答え"}を見る</small></button><div className="flash-count">最新のカードを表示中</div></>:<div className="panel empty-state"><Brain size={28}/><b>カードがまだありません</b><p>左のフォームから作ってみよう。</p></div>}</div></div></>;
}
export default App;