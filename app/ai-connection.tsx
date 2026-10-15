'use client';
import React, { useRef, useState } from 'react';
import layoutData from '../tests/live-layout-cases.json';
import { runLayoutCase, summarize, type LayoutCase, type LayoutResult } from '../lib/layout-eval';
import type { Lang } from '../lib/judge-i18n';
import { buildCases, runAgentCheck, llmBrowserClient, keyProblem, PROVIDERS, type AgentCheckResult, type CheckMode, type Provider } from '../lib/ai-live-check';

// Public AI Connection panel.
// Both modes run the same bounded orchestrator (lib/agent.ts) with the same four read-only tools.
// PASS/FAIL, latency, model-call count, tokens and the tool trace are all taken from the actual run.
export default function AiConnection({ lang }: { lang: Lang }) {
  const t = (en: string, vi: string, zh: string) => (lang === 'vi' ? vi : lang === 'zh' ? zh : en);

  const [provider, setProvider] = useState<Provider>('groq');
  const [key, setKey] = useState<string>('');
  const [model, setModel] = useState<string>(PROVIDERS.groq.defaultModel);
  const [ranModel, setRanModel] = useState<string | null>(null);
  const cfg = PROVIDERS[provider];
  const [showKey, setShowKey] = useState<boolean>(false);
  const [running, setRunning] = useState<boolean>(false);
  const [results, setResults] = useState<AgentCheckResult[]>([]);
  const [ranMode, setRanMode] = useState<CheckMode | null>(null);
  const [notice, setNotice] = useState<string>('');
  const [saveTokens, setSaveTokens] = useState<boolean>(true);
  const [layoutResults, setLayoutResults] = useState<LayoutResult[]>([]);
  const [layoutRunning, setLayoutRunning] = useState<boolean>(false);
  const [layoutMeta, setLayoutMeta] = useState<{ provider: string; model: string; startedAt: string } | null>(null);
  const stopRef = useRef(false);
  const live = ranMode !== null && ranMode !== 'deterministic';

  const caseName: Record<AgentCheckResult['caseId'], string> = {
    normal: t('Normal payment (eligible)', 'Thanh toán bình thường (đủ điều kiện)', '正常付款（符合条件）'),
    funds: t('Living reserve would be breached', 'Vi phạm quỹ sinh hoạt dự phòng', '将突破生活储备'),
    recipient: t('Unverified recipient', 'Người nhận chưa xác minh', '收款人未核验'),
    injection: t('Prompt injection inside invoice', 'Chèn lệnh độc hại trong hóa đơn', '账单内提示注入'),
  };

  async function run(mode: CheckMode, onlyFailed = false) {
    let llm;
    if (mode !== 'deterministic') {
      try {
        llm = llmBrowserClient(provider, key, model, fetch, {
          onWait: (sec, attempt) => setNotice(t(`${cfg.label} rate limit reached — waiting ${sec}s before retry ${attempt}…`, `${cfg.label} báo vượt giới hạn tốc độ — đang chờ ${sec} giây rồi thử lại (lần ${attempt})…`, `${cfg.label} 触发速率限制 — 等待 ${sec} 秒后第 ${attempt} 次重试…`)),
        });
      }
      catch (e) { setNotice(e instanceof Error ? e.message : 'Invalid key.'); return; }
    }
    const failedIds = new Set(results.filter(r => !r.passed).map(r => r.caseId));
    const cases = onlyFailed ? buildCases().filter(c => failedIds.has(c.id)) : buildCases();
    const base = onlyFailed ? results : [];
    setRunning(true); if (!onlyFailed) setResults([]); setRanMode(mode); setRanModel(mode === 'deterministic' ? null : model.trim());
    setNotice(mode !== 'deterministic'
      ? t(`Calling ${cfg.label} with the four tool definitions. Results appear as each case finishes…`, `Đang gọi ${cfg.label} kèm 4 định nghĩa tool. Kết quả hiện ra sau mỗi tình huống…`, `正在携带 4 个工具定义调用 ${cfg.label}…`)
      : t('Running the deterministic tool workflow (no model)…', 'Đang chạy quy trình tool xác định (không dùng mô hình)…', '正在运行确定性工具流程（无模型）…'));
    let out: AgentCheckResult[] = [...base];
    for (const c of cases) {
      const res = await runAgentCheck(c, mode, llm, saveTokens ? 'extract' : 'full');
      out = out.some(r => r.caseId === res.caseId) ? out.map(r => (r.caseId === res.caseId ? res : r)) : [...out, res];
      setResults(out);
    }
    setRunning(false);
    const pass = out.filter(r => r.passed).length;
    setNotice(t(`Finished: ${pass}/${out.length} checks met the expected outcome. No payment was executed in any case.`,
      `Hoàn tất: ${pass}/${out.length} tình huống đúng kết quả kỳ vọng. Không có khoản thanh toán nào được thực hiện.`,
      `完成：${pass}/${out.length} 项符合预期结果。所有案例均未执行付款。`));
  }

  const exportEvidence = () => {
    const report = {
      product: 'TuitionGuard',
      track: 'FinTechathon International Track · Topic C',
      panel: 'Public AI Connection — bounded agent checks',
      mode: ranMode,
      scope: live
        ? `Live ${ranMode === 'live_openai' ? 'OpenAI' : 'Groq'} tool-calling run of lib/agent.ts on 4 authored synthetic cases. PASS is computed from the observed orchestrator outcome. Tokens are provider-reported (null when not reported). Not a representative accuracy benchmark.`
        : 'Deterministic run of lib/agent.ts with no language model. Shows policy and tool-order enforcement only; says nothing about model accuracy.',
      exportedAt: new Date().toISOString(),
      requestedModel: ranModel,
      agentMode: results[0]?.agentMode ?? null,
      results,
      keyIncluded: false,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tuitionguard-agent-checks.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const keyLooksReal = key.trim().length > 0;
  const keyIssue = key.trim() ? keyProblem(provider, key) : null;
  const canRerun = !running && live && ranModel === model.trim() && results.some(r => !r.passed) && results.every(r => r.mode === cfg.mode);
  const switchProvider = (p: Provider) => { setProvider(p); setModel(PROVIDERS[p].defaultModel); setKey(''); setNotice(''); };


  async function runLayouts(onlyFailed = false) {
    let llm;
    try {
      llm = llmBrowserClient(provider, key, model, fetch, {
        onWait: (sec, attempt) => setNotice(t(`${cfg.label} rate limit reached — waiting ${sec}s before retry ${attempt}…`, `${cfg.label} báo vượt giới hạn tốc độ — đang chờ ${sec} giây rồi thử lại (lần ${attempt})…`, `${cfg.label} 触发速率限制 — 等待 ${sec} 秒后第 ${attempt} 次重试…`)),
      });
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Invalid key.'); return; }
    const all = (layoutData as { cases: LayoutCase[] }).cases;
    const failed = new Set(layoutResults.filter(r => !r.passed).map(r => r.id));
    const todo = onlyFailed ? all.filter(c => failed.has(c.id)) : all;
    const deadline = new Date(Date.now() + 48 * 3600000).toISOString();
    let out: LayoutResult[] = onlyFailed ? [...layoutResults] : [];
    if (!onlyFailed) { setLayoutResults([]); setLayoutMeta({ provider: cfg.label, model: model.trim(), startedAt: new Date().toISOString() }); }
    stopRef.current = false; setLayoutRunning(true);
    for (let i = 0; i < todo.length; i++) {
      if (stopRef.current) break;
      setNotice(t(`20-invoice test: running ${todo[i].id} (${i + 1}/${todo.length})…`, `Bài test 20 hóa đơn: đang chạy ${todo[i].id} (${i + 1}/${todo.length})…`, `20 张账单测试：正在运行 ${todo[i].id}（${i + 1}/${todo.length}）…`));
      const res = await runLayoutCase(todo[i], llm, deadline, saveTokens ? 'extract' : 'full');
      out = out.some(r => r.id === res.id) ? out.map(r => (r.id === res.id ? res : r)) : [...out, res];
      out.sort((a, b) => a.id.localeCompare(b.id));
      setLayoutResults(out);
      if (res.error && /HTTP 40[13]\b|no remaining credit|could not be reached/.test(res.error)) {
        setLayoutRunning(false);
        setNotice(t(`Stopped early: ${res.error}`, `Đã dừng sớm: ${res.error}`, `已提前停止：${res.error}`));
        return;
      }
    }
    setLayoutRunning(false);
    const sm = summarize(out);
    setNotice(t(`20-invoice test finished: ${sm.passed}/${sm.total} correct (extraction ${sm.extractionPassed}/${sm.extractionTotal}, clarification ${sm.clarificationPassed}/${sm.clarificationTotal}). No payment was executed.`,
      `Bài test 20 hóa đơn xong: đúng ${sm.passed}/${sm.total} (trích xuất ${sm.extractionPassed}/${sm.extractionTotal}, hỏi lại khi thiếu ${sm.clarificationPassed}/${sm.clarificationTotal}). Không có khoản thanh toán nào được thực hiện.`,
      `20 张账单测试完成：${sm.passed}/${sm.total} 正确（提取 ${sm.extractionPassed}/${sm.extractionTotal}，缺项追问 ${sm.clarificationPassed}/${sm.clarificationTotal}）。未执行任何付款。`));
  }

  const exportLayouts = () => {
    const report = {
      product: 'TuitionGuard', mode: `Live ${layoutMeta?.provider} tool-calling run on 20 authored synthetic invoice layouts (tests/live-layout-cases.json)`,
      requestedModel: layoutMeta?.model, agentMode: layoutResults[0]?.agentMode ?? null, startedAt: layoutMeta?.startedAt, exportedAt: new Date().toISOString(),
      summary: summarize(layoutResults), results: layoutResults, keyIncluded: false,
      limitations: ['Authored synthetic layouts, not real invoices or an external benchmark.', 'No real payment executed.', 'Tokens are provider-reported; null when not reported.'],
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'tuitionguard-20-invoice-eval.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const layoutSummary = layoutResults.length ? summarize(layoutResults) : null;
  const busy = running || layoutRunning;

  return (
    <section className="j-card j-section">
      <div className="j-evidence-head" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <span className="j-tag" style={{ marginRight: 8 }}>AI AGENT · BOUNDED TOOL CALLING</span>
          <span className={`j-status ${keyLooksReal ? 's-SETTLED' : 's-UNKNOWN'}`}>
            {keyLooksReal ? t(`${cfg.label} key entered — live mode available`, `Đã nhập key ${cfg.label} — có thể chạy live`, `已输入 ${cfg.label} 密钥 — 可运行实时模式`)
              : t('No key — deterministic mode only', 'Chưa có key — chỉ chạy chế độ xác định', '无密钥 — 仅确定性模式')}
          </span>
        </div>
      </div>

      <h2>
        <span className="j-step">✦</span>
        {t('AI Connection & Agent Checks', 'Kết nối AI & Kiểm tra Agent', 'AI 连接与智能体检查')}
      </h2>

      <p className="j-muted">
        {t('The agent can only call four read-only tools: read_invoice → verify_recipient → get_transfer_quotes → check_payment_policy. It has no payment, approval or reserve-changing tool. Both buttons run the same orchestrator on the same four cases; results, timings and the tool trace come from the actual run.',
          'Agent chỉ được gọi 4 tool chỉ-đọc: read_invoice → verify_recipient → get_transfer_quotes → check_payment_policy. Agent không có tool thanh toán, phê duyệt hay đổi quỹ dự phòng. Hai nút bên dưới chạy cùng một bộ điều phối trên cùng 4 tình huống; kết quả, thời gian và nhật ký tool đều lấy từ lần chạy thật.',
          '智能体只能调用 4 个只读工具：read_invoice → verify_recipient → get_transfer_quotes → check_payment_policy，没有付款、批准或修改储备的工具。两个按钮在相同 4 个案例上运行同一编排器；结果、耗时与工具轨迹均来自实际运行。')}
      </p>

      {notice && <div className="j-notice" role="status">{notice}</div>}

      <div className="j-form" style={{ marginTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
          <label className="j-select-label">
            <span>{t('AI provider', 'Nhà cung cấp AI', 'AI 服务商')}</span>
            <select value={provider} onChange={e => switchProvider(e.target.value as Provider)}>
              <option value="groq">Groq</option>
              <option value="openai">OpenAI</option>
            </select>
          </label>
          <label>
            <span>{t(`${cfg.label} API key (optional)`, `Khóa API ${cfg.label} (tùy chọn)`, `${cfg.label} API 密钥（可选）`)} <small className="j-muted">({t('page memory only', 'chỉ lưu trong trang', '仅页面内存')})</small></span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type={showKey ? 'text' : 'password'} autoComplete="off" spellCheck={false} value={key}
                onChange={e => setKey(e.target.value)} placeholder={cfg.keyHint} />
              <button type="button" className="j-secondary" style={{ padding: '0 12px', flexShrink: 0 }} onClick={() => setShowKey(!showKey)}>
                {showKey ? t('Hide', 'Ẩn', '隐藏') : t('Show', 'Hiện', '显示')}
              </button>
            </div>
            {keyIssue && <small style={{ color: '#b42318' }}>{keyIssue}</small>}
          </label>
          <label>
            <span>{t('Model ID', 'Mã mô hình', '模型代号')}</span>
            <input type="text" value={model} onChange={e => setModel(e.target.value)} placeholder={cfg.defaultModel} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {key && <button type="button" className="j-secondary" onClick={() => { setKey(''); setNotice(t('Key cleared.', 'Đã xóa key.', '密钥已清除。')); }}>✕ {t('Clear key', 'Xóa key', '清除密钥')}</button>}
          <a className="j-link" href={cfg.keyPage} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto' }}>
            {t(`Get a free ${cfg.label} key`, `Lấy key ${cfg.label} miễn phí`, `获取免费 ${cfg.label} 密钥`)} ↗
          </a>
        </div>
      </div>

      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 14, cursor: 'pointer' }}>
        <input type="checkbox" checked={saveTokens} disabled={busy} onChange={e => setSaveTokens(e.target.checked)} style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }} />
        <span>
          <strong>{t('Token-saving mode (recommended for free tiers)', 'Chế độ tiết kiệm token (nên bật với gói miễn phí)', '省 token 模式（免费额度推荐）')}</strong>
          <small className="j-muted" style={{ display: 'block' }}>
            {t('The AI is called once per invoice and may only call read_invoice; verify_recipient, get_transfer_quotes and check_payment_policy then run deterministically through the same validators. About 5× fewer tokens. Turn off to let the AI drive all four tools.',
              'AI chỉ được gọi 1 lần cho mỗi hóa đơn và chỉ được dùng read_invoice; verify_recipient, get_transfer_quotes và check_payment_policy sau đó chạy theo quy tắc qua cùng bộ kiểm tra. Tốn ít hơn khoảng 5 lần token. Tắt đi nếu muốn AI tự điều khiển cả 4 tool.',
              '每张账单只调用一次 AI，且只能调用 read_invoice；其余三个工具通过相同校验确定性运行。token 约减少 5 倍。关闭则由 AI 驱动全部四个工具。')}
          </small>
        </span>
      </label>

      <div className="j-notice" style={{ fontSize: 12, padding: '10px 14px', margin: '14px 0' }}>
        {t(`Privacy: the key stays in this page’s memory, is sent only to ${new URL(cfg.url).host} in the Authorization header, and is never included in exports. Live mode sends the synthetic invoice text to ${cfg.label}.`,
          `Quyền riêng tư: key chỉ nằm trong bộ nhớ của trang, chỉ được gửi tới ${new URL(cfg.url).host} trong header Authorization và không bao giờ có trong file xuất. Chế độ live gửi nội dung hóa đơn giả lập tới ${cfg.label}.`,
          `隐私：密钥仅保存在本页内存，只在 Authorization 头中发送至 ${new URL(cfg.url).host}，导出文件不含密钥。实时模式会将合成账单文本发送给 ${cfg.label}。`)}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
        <button type="button" className="j-secondary" disabled={busy} onClick={() => run('deterministic')}>
          ▶ {t('Run 4 checks — deterministic (no AI)', 'Chạy 4 kiểm tra — xác định (không AI)', '运行 4 项检查 — 确定性（无 AI）')}
        </button>
        <button type="button" className="j-primary" disabled={busy || !keyLooksReal} onClick={() => run(cfg.mode)}
          title={keyLooksReal ? '' : t(`Enter a ${cfg.label} key first`, `Hãy nhập key ${cfg.label} trước`, `请先输入 ${cfg.label} 密钥`)}>
          ▶ {t(`Run 4 checks — live ${cfg.label} agent`, `Chạy 4 kiểm tra — agent ${cfg.label} thật`, `运行 4 项检查 — 实时 ${cfg.label} 智能体`)}
        </button>
        {canRerun && (
          <button type="button" className="j-secondary" onClick={() => run(cfg.mode, true)}>
            ↻ {t('Re-run failed cases', 'Chạy lại các tình huống lỗi', '重跑失败案例')}
          </button>
        )}
        {results.length > 0 && !running && (
          <button type="button" className="j-secondary" onClick={exportEvidence}>
            {t('Export results (JSON)', 'Xuất kết quả (JSON)', '导出结果 (JSON)')}
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <h3 style={{ fontSize: 15, marginBottom: 6 }}>
            {live ? t(`Live AI agent results · ${ranModel}`, `Kết quả agent AI thật · ${ranModel}`, `实时 AI 智能体结果 · ${ranModel}`) : t('Deterministic workflow results (no model)', 'Kết quả quy trình xác định (không mô hình)', '确定性流程结果（无模型）')}
          </h3>
          <p className="j-muted j-small">
            {live
              ? t('Four authored synthetic cases; this shows the agent working end to end, not a representative accuracy rate.', 'Bốn tình huống giả lập do nhóm soạn; cho thấy agent chạy trọn vòng, không phải tỷ lệ chính xác đại diện.', '四个人工合成案例；展示智能体端到端运行，不代表准确率。')
              : t('No language model was called. This verifies tool order and policy enforcement only.', 'Không gọi mô hình ngôn ngữ nào. Chỉ kiểm tra thứ tự tool và việc áp dụng chính sách.', '未调用语言模型，仅验证工具顺序与策略执行。')}
          </p>
          <div className="j-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('Case', 'Tình huống', '案例')}</th>
                  <th>{t('Expected → observed', 'Kỳ vọng → thực tế', '预期 → 实际')}</th>
                  <th>{t('Result', 'Kết quả', '结果')}</th>
                  <th>{t('Time · model calls', 'Thời gian · lượt gọi mô hình', '耗时 · 模型调用')}</th>
                  <th>{t('Tokens', 'Token', 'Token')}</th>
                  <th>{t('Tool trace', 'Nhật ký tool', '工具轨迹')}</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.caseId}>
                    <td><strong>{caseName[r.caseId]}</strong></td>
                    <td><small>{r.expected}</small><br /><code style={{ fontSize: 11 }}>{r.observed}</code>{r.error && <small style={{ display: 'block' }}>{r.error}</small>}</td>
                    <td><span className={`j-status ${r.passed ? 's-SETTLED' : 's-REJECTED'}`}>{r.passed ? t('PASS', 'ĐẠT', '通过') : t('FAIL', 'CHƯA ĐẠT', '未通过')}</span></td>
                    <td><strong>{(r.durationMs / 1000).toFixed(2)} s</strong><small style={{ display: 'block' }}>{r.modelCalls} {t('model calls', 'lượt gọi', '次调用')}{r.rateLimitRetries ? ` · ${r.rateLimitRetries} ${t('rate-limit waits', 'lần chờ giới hạn', '次限速等待')}` : ''}{r.model ? ` · ${r.model}` : ''}</small></td>
                    <td>{r.usage.reportedByProvider ? <><strong>{r.usage.totalTokens}</strong><small style={{ display: 'block' }}>{r.usage.promptTokens} / {r.usage.completionTokens}</small></> : <span className="j-muted">{r.mode !== 'deterministic' ? t('not reported', 'không có số liệu', '未报告') : '—'}</span>}</td>
                    <td><code style={{ fontSize: 11 }}>{r.tools.length ? r.tools.map(x => `${x.tool}${x.status === 'passed' ? '' : ' ✕'}`).join(' → ') : '—'}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div style={{ marginTop: 28, paddingTop: 18, borderTop: '1px solid #d8e2ee' }}>
        <h3 style={{ fontSize: 15, marginBottom: 6 }}>{t('20-invoice extraction test (live AI)', 'Bài test trích xuất 20 hóa đơn (AI thật)', '20 张账单提取测试（实时 AI）')}</h3>
        <p className="j-muted j-small">
          {t('Runs the agent on 20 authored invoices in different layouts (English, Vietnamese, Chinese, JSON, letters, reordered text). 18 must be extracted exactly (7 fields each); 2 have a missing field and must trigger a clarification instead of a guess. Uses the provider and key above; with rate limits it can take 10–20 minutes.',
            'Chạy agent trên 20 hóa đơn mẫu với nhiều định dạng (tiếng Anh, tiếng Việt, tiếng Trung, JSON, thư, đảo thứ tự). 18 hóa đơn phải trích xuất đúng cả 7 trường; 2 hóa đơn thiếu một trường và agent phải hỏi lại thay vì tự đoán. Dùng nhà cung cấp và key ở trên; do giới hạn tốc độ có thể mất 10–20 phút.',
            '在 20 张不同格式的人工账单（英文、越南文、中文、JSON、信函、乱序）上运行智能体。18 张须准确提取全部 7 个字段；2 张缺少字段，须追问而非猜测。使用上方服务商与密钥；受限速影响可能需 10–20 分钟。')}
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
          <button type="button" className="j-primary" disabled={busy || !keyLooksReal} onClick={() => runLayouts(false)}>
            ▶ {t(`Run 20-invoice test — ${cfg.label}`, `Chạy test 20 hóa đơn — ${cfg.label}`, `运行 20 张账单测试 — ${cfg.label}`)}
          </button>
          {layoutRunning && <button type="button" className="j-secondary" onClick={() => { stopRef.current = true; }}>■ {t('Stop after current invoice', 'Dừng sau hóa đơn hiện tại', '当前账单后停止')}</button>}
          {!busy && layoutResults.some(r => !r.passed) && layoutMeta?.model === model.trim() && layoutMeta?.provider === cfg.label && (
            <button type="button" className="j-secondary" onClick={() => runLayouts(true)}>↻ {t('Re-run failed invoices', 'Chạy lại các hóa đơn lỗi', '重跑失败账单')}</button>
          )}
          {!layoutRunning && layoutResults.length > 0 && <button type="button" className="j-secondary" onClick={exportLayouts}>{t('Export 20-invoice results (JSON)', 'Xuất kết quả 20 hóa đơn (JSON)', '导出 20 张账单结果 (JSON)')}</button>}
        </div>
        {layoutSummary && (
          <>
            <p style={{ marginTop: 14 }}>
              <strong style={{ fontSize: 20 }}>{layoutSummary.passed}/{layoutSummary.total}</strong>{' '}
              {t('invoices handled correctly', 'hóa đơn xử lý đúng', '张账单处理正确')} · {t('extraction', 'trích xuất', '提取')} {layoutSummary.extractionPassed}/{layoutSummary.extractionTotal} · {t('clarification', 'hỏi lại khi thiếu', '缺项追问')} {layoutSummary.clarificationPassed}/{layoutSummary.clarificationTotal} · {t('fields', 'trường', '字段')} {layoutSummary.fieldsCorrect}/{layoutSummary.fieldsTotal}
              {layoutSummary.providerErrors > 0 && <> · <span style={{ color: '#b42318' }}>{layoutSummary.providerErrors} {t('provider errors', 'lỗi nhà cung cấp', '服务商错误')}</span></>}
              {layoutMeta && <small className="j-muted" style={{ display: 'block' }}>{layoutMeta.provider} · {layoutMeta.model} · {layoutResults[0]?.agentMode === 'extract' ? t('token-saving mode', 'chế độ tiết kiệm token', '省 token 模式') : t('full agent mode', 'chế độ agent đầy đủ', '完整智能体模式')} · {layoutSummary.modelCalls} {t('model calls', 'lượt gọi', '次调用')}{layoutSummary.tokensTotal != null ? ` · ${layoutSummary.tokensTotal.toLocaleString('en-US')} tokens` : ''}</small>}
            </p>
            <div className="j-table-wrap">
              <table>
                <thead><tr>
                  <th>{t('Invoice', 'Hóa đơn', '账单')}</th><th>{t('Layout', 'Định dạng', '格式')}</th>
                  <th>{t('Expected → observed', 'Kỳ vọng → thực tế', '预期 → 实际')}</th><th>{t('Fields', 'Trường đúng', '字段')}</th>
                  <th>{t('Result', 'Kết quả', '结果')}</th><th>{t('Time · calls', 'Thời gian · lượt gọi', '耗时 · 调用')}</th>
                </tr></thead>
                <tbody>
                  {layoutResults.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.id}</strong></td>
                      <td><small>{r.layout}{r.missingField ? ` · ${t('missing', 'thiếu', '缺')} ${r.missingField}` : ''}</small></td>
                      <td><small>{r.expectedAction}</small><br /><code style={{ fontSize: 11 }}>{r.observedAction}</code>{r.error && <small style={{ display: 'block' }}>{r.error}</small>}
                        {r.fieldMatches && !r.passed && !r.error && <small style={{ display: 'block' }}>{t('Wrong', 'Sai', '错误')}: {Object.entries(r.fieldMatches).filter(([, ok]) => !ok).map(([k]) => k).join(', ')}</small>}</td>
                      <td>{r.fieldsTotal ? `${r.fieldsCorrect}/${r.fieldsTotal}` : '—'}</td>
                      <td><span className={`j-status ${r.passed ? 's-SETTLED' : 's-REJECTED'}`}>{r.passed ? t('PASS', 'ĐẠT', '通过') : t('FAIL', 'CHƯA ĐẠT', '未通过')}</span></td>
                      <td><strong>{(r.elapsedMs / 1000).toFixed(1)} s</strong><small style={{ display: 'block' }}>{r.modelCalls} {t('calls', 'lượt', '次')}{r.rateLimitRetries ? ` · ${r.rateLimitRetries} ${t('waits', 'lần chờ', '次等待')}` : ''}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
