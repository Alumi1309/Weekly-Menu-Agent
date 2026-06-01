import { useEffect, useMemo, useState } from 'react';

type MenuPattern = 'safe' | 'new';

type DailyProposal = {
  date: string;
  safe: string;
  newFlavor: string;
};

type InventoryItem = { name: string; quantity: string };
type Assignments = Record<string, string>;

const API_KEY_STORAGE_KEY = 'geminiApiKey';
const ASSIGNMENTS_STORAGE_KEY = 'menuAssignments';

const initialInventory: InventoryItem[] = [{ name: '玉ねぎ', quantity: '2個' }];
const sampleHistory = ['カレー', '焼き魚', '野菜炒め', 'ハンバーグ', 'パスタ', '唐揚げ'];

const generateProposals = (history: string[], inventory: InventoryItem[], options: string[], startDate: string) => {
  const proposals: DailyProposal[] = [];
  const baseDate = new Date(startDate);

  for (let i = 0; i < 7; i += 1) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + i);
    const formatted = date.toISOString().slice(0, 10);
    const safeIndex = i % history.length;
    const newIndex = (i + 2) % history.length;

    proposals.push({
      date: formatted,
      safe: `${history[safeIndex]}（定番）`,
      newFlavor: `${history[newIndex]} のアレンジ`,
    });
  }

  return proposals;
};

// --- Google OAuth (PKCE) and Calendar helpers ---
const GOOGLE_OAUTH_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_EVENTS = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

const base64UrlEncode = (arrayBuffer: ArrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const sha256 = async (plain: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return hash;
};

const generateCodeChallenge = async (verifier: string) => {
  const hashed = await sha256(verifier);
  return base64UrlEncode(hashed);
};

const makeVerifier = (len = 128) => {
  const array = new Uint8Array(len);
  crypto.getRandomValues(array);
  return base64UrlEncode(array.buffer).slice(0, len);
};


const App = () => {
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [options, setOptions] = useState<string[]>(['時短日あり', '冷蔵庫優先']);
  const [history, setHistory] = useState<string[]>(sampleHistory);
  const [targetDate, setTargetDate] = useState<string>('');
  const [assignmentPattern, setAssignmentPattern] = useState<MenuPattern>('safe');
  const [assignments, setAssignments] = useState<Assignments>({});
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(API_KEY_STORAGE_KEY) ?? '';
  });
  const [apiKeySaved, setApiKeySaved] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem(API_KEY_STORAGE_KEY));
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedKey) {
      setApiKey(savedKey);
      setApiKeySaved(true);
    }

    const savedAssignments = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
    if (savedAssignments) {
      setAssignments(JSON.parse(savedAssignments));
    }
  }, []);

  const proposals = useMemo(
    () => generateProposals(history, inventory, options, startDate),
    [history, inventory, options, startDate]
  );

  const refreshProposals = () => {
    setHistory((prev) => [...prev.slice(1), prev[0]]);
  };

  // Google OAuth client id stored locally
  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('googleClientId') ?? '';
  });
  const [googleSignedIn, setGoogleSignedIn] = useState<boolean>(false);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [importMessage, setImportMessage] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('googleClientId');
    if (saved) setGoogleClientId(saved);
    if (localStorage.getItem('googleTokens')) setGoogleSignedIn(true);

    // handle OAuth redirect with ?code=
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (code) {
      // exchange code for tokens
      const verifier = sessionStorage.getItem('pkce_verifier') ?? '';
      const redirect_uri = `${window.location.origin}${window.location.pathname}`;
      const body = new URLSearchParams();
      body.set('client_id', localStorage.getItem('googleClientId') ?? '');
      body.set('code', code);
      body.set('code_verifier', verifier);
      body.set('grant_type', 'authorization_code');
      body.set('redirect_uri', redirect_uri);

      fetch(GOOGLE_OAUTH_TOKEN, { method: 'POST', body: body.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
        .then((r) => r.json())
        .then((data) => {
          if (data.access_token) {
            data.__obtained_at = Math.floor(Date.now() / 1000);
            localStorage.setItem('googleTokens', JSON.stringify(data));
            setGoogleSignedIn(true);
            // remove code from URL
            const url = new URL(window.location.href);
            url.searchParams.delete('code');
            url.searchParams.delete('state');
            window.history.replaceState({}, document.title, url.toString());
          }
        })
        .catch(() => {});
    }
  }, []);

  const saveGoogleClientId = () => {
    localStorage.setItem('googleClientId', googleClientId);
  };

  const startGoogleSignIn = async () => {
    if (!googleClientId) return alert('Google Client ID を入力してください');
    const verifier = makeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    sessionStorage.setItem('pkce_verifier', verifier);
    const redirect_uri = `${window.location.origin}${window.location.pathname}`;
    const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(
      googleClientId
    )}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=${scope}&access_type=offline&prompt=consent&code_challenge=${encodeURIComponent(
      challenge
    )}&code_challenge_method=S256`;
    window.location.href = authUrl;
  };

  const getAccessToken = async () => {
    const raw = localStorage.getItem('googleTokens');
    if (!raw) return null;
    const tokens = JSON.parse(raw);
    const now = Math.floor(Date.now() / 1000);
    if (tokens.expires_in && tokens.__obtained_at && now > tokens.__obtained_at + tokens.expires_in - 60) {
      // refresh
      if (!tokens.refresh_token) return null;
      const body = new URLSearchParams();
      body.set('client_id', localStorage.getItem('googleClientId') ?? '');
      body.set('grant_type', 'refresh_token');
      body.set('refresh_token', tokens.refresh_token);
      const res = await fetch(GOOGLE_OAUTH_TOKEN, { method: 'POST', body: body.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      const data = await res.json();
      if (data.access_token) {
        data.refresh_token = data.refresh_token ?? tokens.refresh_token;
        data.__obtained_at = Math.floor(Date.now() / 1000);
        localStorage.setItem('googleTokens', JSON.stringify(data));
        return data.access_token;
      }
      return null;
    }
    if (!tokens.__obtained_at) tokens.__obtained_at = Math.floor(Date.now() / 1000);
    return tokens.access_token ?? null;
  };

  const signOutGoogle = () => {
    localStorage.removeItem('googleTokens');
    setGoogleSignedIn(false);
    setGoogleEvents([]);
  };

  const fetchGoogleEvents = async () => {
    const token = await getAccessToken();
    if (!token) return alert('認証が必要です');
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const url = `${GOOGLE_CALENDAR_EVENTS}?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime&maxResults=50`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setGoogleEvents(data.items ?? []);
  };

  const createGoogleEvent = async (date: string, summary: string) => {
    const token = await getAccessToken();
    if (!token) return alert('認証が必要です');
    // create all-day event
    const body = {
      summary,
      start: { date },
      end: { date },
    };
    const res = await fetch(GOOGLE_CALENDAR_EVENTS, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      alert(`${date} にイベントを作成しました`);
      fetchGoogleEvents();
    } else {
      const txt = await res.text();
      alert('作成に失敗しました: ' + txt);
    }
  };

  const saveApiKey = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    setApiKeySaved(true);
  };

  const saveAssignments = (newAssignments: Assignments) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(newAssignments));
    setAssignments(newAssignments);
  };

  const assignProposal = (proposal: DailyProposal) => {
    if (!targetDate) return;
    const menu = assignmentPattern === 'safe' ? proposal.safe : proposal.newFlavor;
    saveAssignments({
      ...assignments,
      [targetDate]: `${menu} (${proposal.date} から割り当て)`,
    });
  };

  return (
    <div className="app-shell">
      <header>
        <h1>Weekly Menu Agent</h1>
        <p>Googleカレンダー風の履歴を元に、7日分の無難／新味を提案します。</p>
      </header>

      <section className="panel">
        <h2>設定</h2>
        <label>
          反映開始日
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          割り当て日
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </label>
        <label>
          割り当てパターン
          <select value={assignmentPattern} onChange={(e) => setAssignmentPattern(e.target.value as MenuPattern)}>
            <option value="safe">無難</option>
            <option value="new">新しい味</option>
          </select>
        </label>
        <label>
          Gemini APIキー
          <input
            type="password"
            placeholder="APIキーを入力"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </label>
        <button type="button" onClick={saveApiKey} className="primary">
          APIキーを保存
        </button>
        {apiKeySaved && <p className="note">APIキーはこのブラウザのローカルに保存されました。</p>}

        <hr />
        <label>
          Google OAuth Client ID
          <input type="text" placeholder="クライアントIDを入力" value={googleClientId} onChange={(e) => setGoogleClientId(e.target.value)} />
        </label>
        <button type="button" onClick={saveGoogleClientId}>Client ID を保存</button>
        <div style={{ marginTop: 8 }}>
          <button type="button" onClick={startGoogleSignIn} className="primary">Google でサインイン</button>
          <button type="button" onClick={signOutGoogle} style={{ marginLeft: 8 }}>サインアウト</button>
          <button type="button" onClick={fetchGoogleEvents} style={{ marginLeft: 8 }}>カレンダーを取得</button>
        </div>
        {googleSignedIn && <p className="note">Google にサインイン済みです。</p>}
        {importMessage && <p className="note">{importMessage}</p>}
        <button type="button" onClick={refreshProposals} className="primary" style={{ marginTop: 8 }}>
          提案をリフレッシュ
        </button>
      </section>

      <section className="panel">
        <h2>冷蔵庫在庫の例</h2>
        <ul>
          {inventory.map((item) => (
            <li key={item.name}>{item.name} - {item.quantity}</li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>割り当て済みスケジュール</h2>
        {Object.keys(assignments).length === 0 ? (
          <p>まだ割り当てられた献立はありません。</p>
        ) : (
          <ul>
            {Object.entries(assignments)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, menu]) => (
                <li key={date} style={{ marginBottom: 8 }}>
                  {date}: {menu}
                  <button type="button" onClick={() => createGoogleEvent(date, menu)} style={{ marginLeft: 8 }}>Google に書き込む</button>
                </li>
              ))}
          </ul>
        )}
        {Object.keys(assignments).length > 0 && (
          <div style={{ marginTop: 8 }}>
            <button type="button" onClick={() => {
              Object.entries(assignments).forEach(([date, menu]) => createGoogleEvent(date, menu));
            }} className="primary">全てを Google に書き込む</button>
          </div>
        )}
      </section>

      <section className="panel proposal-grid">
        <h2>7日分の提案</h2>
        {proposals.map((proposal) => (
          <article key={proposal.date} className="proposal-card">
            <div className="proposal-date">{proposal.date}</div>
            <div><strong>無難</strong><p>{proposal.safe}</p></div>
            <div><strong>新しい味</strong><p>{proposal.newFlavor}</p></div>
            <div className="proposal-actions">
              <button type="button" onClick={() => assignProposal(proposal)} disabled={!targetDate}>
              {targetDate ? '選択した日付に割り当て' : '割り当て日を選択してください'}
            </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
};

export default App;
