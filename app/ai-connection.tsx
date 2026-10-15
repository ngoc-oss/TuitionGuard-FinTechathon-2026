'use client';
import React, { useState } from 'react';
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
      const res = await runAgentCheck(c, mode, llm);
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

      <div className="j-notice" style={{ fontSize: 12, padding: '10px 14px', margin: '14px 0' }}>
        {t(`Privacy: the key stays in this page’s memory, is sent only to ${new URL(cfg.url).host} in the Authorization header, and is never included in exports. Live mode sends the synthetic invoice text to ${cfg.label}.`,
          `Quyền riêng tư: key chỉ nằm trong bộ nhớ của trang, chỉ được gửi tới ${new URL(cfg.url).host} trong header Authorization và không bao giờ có trong file xuất. Chế độ live gửi nội dung hóa đơn giả lập tới ${cfg.label}.`,
          `隐私：密钥仅保存在本页内存，只在 Authorization 头中发送至 ${new URL(cfg.url).host}，导出文件不含密钥。实时模式会将合成账单文本发送给 ${cfg.label}。`)}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
        <button type="button" className="j-secondary" disabled={running} onClick={() => run('deterministic')}>
          ▶ {t('Run 4 checks — deterministic (no AI)', 'Chạy 4 kiểm tra — xác định (không AI)', '运行 4 项检查 — 确定性（无 AI）')}
        </button>
        <button type="button" className="j-primary" disabled={running || !keyLooksReal} onClick={() => run(cfg.mode)}
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
    </section>
  );
}
