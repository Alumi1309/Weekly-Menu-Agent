import { useMemo, useState } from 'react';

type MenuPattern = 'safe' | 'new';

type DailyProposal = {
  date: string;
  safe: string;
  newFlavor: string;
};

type InventoryItem = { name: string; quantity: string };

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

const App = () => {
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [options, setOptions] = useState<string[]>(['時短日あり', '冷蔵庫優先']);
  const [history, setHistory] = useState<string[]>(sampleHistory);
  const [assignedDate, setAssignedDate] = useState<string>('');

  const proposals = useMemo(
    () => generateProposals(history, inventory, options, startDate),
    [history, inventory, options, startDate]
  );

  const refreshProposals = () => {
    setHistory((prev) => [...prev.slice(1), prev[0]]);
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
          <input type="date" value={assignedDate} onChange={(e) => setAssignedDate(e.target.value)} />
        </label>
        <button type="button" onClick={refreshProposals} className="primary">
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

      <section className="panel proposal-grid">
        <h2>7日分の提案</h2>
        {proposals.map((proposal) => (
          <article key={proposal.date} className="proposal-card">
            <div className="proposal-date">{proposal.date}</div>
            <div><strong>無難</strong><p>{proposal.safe}</p></div>
            <div><strong>新しい味</strong><p>{proposal.newFlavor}</p></div>
            <div className="proposal-actions">
              <button type="button">{assignedDate === proposal.date ? '割り当て済み' : 'この日に割り当て'}</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
};

export default App;
