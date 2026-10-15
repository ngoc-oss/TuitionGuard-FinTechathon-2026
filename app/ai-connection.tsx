'use client';
import React, { useState } from 'react';
import type { Lang } from '../lib/judge-i18n';
import { buildCases, runAgentCheck, groqBrowserClient, type AgentCheckResult, type CheckMode } from '../lib/ai-live-check';

// Public AI Connection panel.
// Both modes run the same bounded orchestrator (lib/agent.ts) with the same four read-only tools.
// PASS/FAIL, latency, model-call count, tokens and the tool trace are all taken from the actual run.
export default function AiConnection({ lang }: { lang: Lang }) {
  const t = (en: string, vi: string, zh: string) => (lang === 'vi' ? vi : lang === 'zh' ? zh : en);

  const [key, setKey] = useState<string>('');
  const [model, setModel] = useState<string>('openai/gpt-oss-120b');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [running, setRunning] = useState<boolean>(false);
  const [results, setResults] = useState<AgentCheckResult[]>([]);
  const [ranMode, setRanMode] = useState<CheckMode | null>(null);
  const [notice, setNotice] = useState<string>('');

  const caseName: Record<AgentCheckResult['caseId'], string> = {
    normal: t('Normal payment (eligible)', 'Thanh toán bình thường (đủ điều kiện)', '正常付款（符合条件）'),
    funds: t('Living reserve would be breached', 'Vi phạm quỹ sinh hoạt dự phòng', '将突破生活储备'),
    recipient: t('Unverified recipient', 'Người nhận chưa xác minh', '收款人未核验'),
    injection: t('Prompt injection inside invoice', 'Chèn lệnh độc hại trong hóa đơn', '账单内提示注入'),
  };

  async function run(mode: CheckMode) {
    let llm;
    if (mode === 'live_groq') {
      try { llm = groqBrowserClient(key, model); }
      catch (e) { setNotice(e instanceof Error ? e.message : 'Invalid key.'); return; }
    }
    setRunning(true); setResults([]); setRanMode(mode);
    setNotice(mode === 'live_groq'
      ? t('Calling Groq with the four tool definitions. Results appear as each case finishes…', 'Đang gọi Groq kèm 4 định nghĩa tool. Kết quả hiện ra sau mỗi tình huống…', '正在携带 4 个工具定义调用 Groq…')
      : t('Running the deterministic tool workflow (no model)…', 'Đang chạy quy trình tool xác định (không dùng mô hình)…', '正在运行确定性工具流程（无模型）…'));
    const out: AgentCheckResult[] = [];
    for (const c of buildCases()) {
      out.push(await runAgentCheck(c, mode, llm));
      setResults([...out]);
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
      scope: ranMode === 'live_groq'
        ? 'Live Groq tool-calling run of lib/agent.ts on 4 authored synthetic cases. PASS is computed from the observed orchestrator outcome. Tokens are provider-reported (null when not reported). Not a representative accuracy benchmark.'
        : 'Deterministic run of lib/agent.ts with no language model. Shows policy and tool-order enforcement only; says nothing about model accuracy.',
      exportedAt: new Date().toISOString(),
      requestedModel: ranMode === 'live_groq' ? model : null,
      results,
      keyIncluded: false,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tuitionguard-agent-checks.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const keyLooksReal = /^gsk_[A-Za-z0-9]{20,}$/.test(key.trim());

  return (
    <section className="j-card j-section">
      <div className="j-evidence-head" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <span className="j-tag" style={{ marginRight: 8 }}>AI AGENT · BOUNDED TOOL CALLING</span>
          <span className={`j-status ${keyLooksReal ? 's-SETTLED' : 's-UNKNOWN'}`}>
            {keyLooksReal ? t('Groq key entered — live mode available', 'Đã nhập key Groq — có thể chạy live', '已输入 Groq 密钥 — 可运行实时模式')
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
          <label>
            <span>{t('Groq API key (optional)', 'Khóa Groq API (tùy chọn)', 'Groq API 密钥（可选）')} <small className="j-muted">({t('page memory only', 'chỉ lưu trong trang', '仅页面内存')})</small></span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type={showKey ? 'text' : 'password'} autoComplete="off" spellCheck={false} value={key}
                onChange={e => setKey(e.target.value)} placeholder="gsk_..." />
              <button type="button" className="j-secondary" style={{ padding: '0 12px', flexShrink: 0 }} onClick={() => setShowKey(!showKey)}>
                {showKey ? t('Hide', 'Ẩn', '隐藏') : t('Show', 'Hiện', '显示')}
              </button>
            </div>
          </label>
          <label>
            <span>{t('Model ID', 'Mã mô hình', '模型代号')}</span>
            <input type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="openai/gpt-oss-120b" />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {key && <button type="button" className="j-secondary" onClick={() => { setKey(''); setNotice(t('Key cleared.', 'Đã xóa key.', '密钥已清除。')); }}>✕ {t('Clear key', 'Xóa key', '清除密钥')}</button>}
          <a className="j-link" href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ marginLeft: 'auto' }}>
            {t('Get a free Groq key', 'Lấy key Groq miễn phí', '获取免费 Groq 密钥')} ↗
          </a>
        </div>
      </div>

      <div className="j-notice" style={{ fontSize: 12, padding: '10px 14px', margin: '14px 0' }}>
        {t('Privacy: the key stays in this page’s memory, is sent only to api.groq.com in the Authorization header, and is never included in exports. Live mode sends the synthetic invoice text to Groq.',
          'Quyền riêng tư: key chỉ nằm trong bộ nhớ của trang, chỉ được gửi tới api.groq.com trong header Authorization và không bao giờ có trong file xuất. Chế độ live gửi nội dung hóa đơn giả lập tới Groq.',
          '隐私：密钥仅保存在本页内存，只在 Authorization 头中发送至 api.groq.com，导出文件不含密钥。实时模式会将合成账单文本发送给 Groq。')}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
        <button type="button" className="j-secondary" disabled={running} onClick={() => run('deterministic')}>
          ▶ {t('Run 4 checks — deterministic (no AI)', 'Chạy 4 kiểm tra — xác định (không AI)', '运行 4 项检查 — 确定性（无 AI）')}
        </button>
        <button type="button" className="j-primary" disabled={running || !keyLooksReal} onClick={() => run('live_groq')}
          title={keyLooksReal ? '' : t('Enter a Groq key first', 'Hãy nhập key Groq trước', '请先输入 Groq 密钥')}>
          ▶ {t('Run 4 checks — live Groq agent', 'Chạy 4 kiểm tra — agent Groq thật', '运行 4 项检查 — 实时 Groq 智能体')}
        </button>
        {results.length > 0 && !running && (
          <button type="button" className="j-secondary" onClick={exportEvidence}>
            {t('Export results (JSON)', 'Xuất kết quả (JSON)', '导出结果 (JSON)')}
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <h3 style={{ fontSize: 15, marginBottom: 6 }}>
            {ranMode === 'live_groq' ? t('Live Groq agent results', 'Kết quả agent Groq thật', '实时 Groq 智能体结果') : t('Deterministic workflow results (no model)', 'Kết quả quy trình xác định (không mô hình)', '确定性流程结果（无模型）')}
          </h3>
          <p className="j-muted j-small">
            {ranMode === 'live_groq'
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
                    <td><strong>{(r.durationMs / 1000).toFixed(2)} s</strong><small style={{ display: 'block' }}>{r.modelCalls} {t('model calls', 'lượt gọi', '次调用')}{r.model ? ` · ${r.model}` : ''}</small></td>
                    <td>{r.usage.reportedByProvider ? <><strong>{r.usage.totalTokens}</strong><small style={{ display: 'block' }}>{r.usage.promptTokens} / {r.usage.completionTokens}</small></> : <span className="j-muted">{r.mode === 'live_groq' ? t('not reported', 'không có số liệu', '未报告') : '—'}</span>}</td>
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
