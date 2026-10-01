# VBE 实验引擎

校验预算经济（Verification Budget Economy）多智能体实验代码。
对应总报告：`docs/lab-report.md`。

当前 E–I–P 探索性研究已跑完：

- 论文初稿：`../VBE-paper-draft.md`
- Paper 1 submission spine：`../VBE-paper1-submission-spine.md`（AAMAS 2027/GAAI 八页结构、压缩摘要、三项主贡献、claim–evidence matrix、主文/附录分流与停止条件）
- Paper 1 精简投稿稿：`../VBE-paper1-submission-draft.md`（v0.4，约 5,300 词；W-CO→W-RG→W-SGB 主因果链；加入 named/executed scope 形式化、严格限定的 grok/Flash 方向一致性及 W-MER incomplete 边界）
- Paper 1 supplement router：`../VBE-paper1-supplement-router.md`（S1–S12 路由、旧表迁移、审计与一致性清单）
- Paper 1 venue 决策：`../VBE-paper1-venue-and-replication-decision.md`（AAMAS first、opt in Findings；TMLR/ARR 条件分支；COLM 不作为等待中的默认首选）
- Study W-MER engaged-money repair：`../VBE-engaged-money-repair-design.md`、`../VBE-welfare-money-engagement-repair-protocol.md`、`../VBE-welfare-money-engagement-repair-protocol_EN.md`、`../VBE-welfare-money-engagement-repair-report.md`、`../VBE-welfare-money-engagement-repair-report_EN.md`、`../VBE-welfare-money-engagement-repair-amendment-1.md`、`src/data/welfare-money-engagement-repair-freeze.json`（v1.0 零调用冻结后执行；健康 pre-flight，26/50 cells 与 2,100 retained target calls 后 transport stall；post catalog `ConnectionRefused`；正式 `INCOMPLETE`，无 priced-semantic 结论且不再恢复）
- Paper 1 主图：`../figures/VBE-paper1-welfare-mechanism.svg`、`../figures/VBE-paper1-welfare-mechanism.png`（由冻结 W-SGB JSON 生成）
- 综合实验报告：`../VBE-EIP-experimental-report.md`
- Study E 细报：`../VBE-study-E-deepseek-pilot.md`
- Study E 影子信念试运行：`../VBE-study-E-shadow-pilot.md`
- Study E 引出反应性 2×2：`../VBE-study-E-reactivity-pilot.md`
- Study E 引出反应性冻结协议：`../VBE-elicitation-reactivity-protocol.md`
- Study E 引出反应性独立确认：`../VBE-elicitation-reactivity-confirmatory-report.md`
- Study E 引出反应性确认协议：`../VBE-elicitation-reactivity-confirmatory-protocol.md`
- Study E 引出 package 组件 pilot：`../VBE-elicitation-disassembly-pilot-report.md`
- Study E 组件拆解冻结协议：`../VBE-elicitation-disassembly-protocol.md`
- Study E belief-reward 测量审计：`../VBE-belief-reward-audit.md`
- Study E-BIS 修复后 belief instrument 灵敏度闸门：`../VBE-belief-instrument-sensitivity-report.md`、`../VBE-belief-instrument-sensitivity-protocol.md`
- Study E-CI 可信社会信息随机化 ITT：`../VBE-credible-information-itt-report.md`、`../VBE-credible-information-itt-protocol.md`
- Study E-TPCD typed peer probability 与近期历史冲突：`../VBE-peer-probability-conflict-report.md`、`../VBE-peer-probability-conflict-protocol.md`
- Study E-SVG typed source-validity gating：`../VBE-source-validity-gating-report.md`、`../VBE-source-validity-gating-protocol.md`
- Study E-SVG-CXT 轨迹上下文迁移：`../VBE-source-validity-context-transfer-report.md`、`../VBE-source-validity-context-transfer-protocol.md`
- Study E-SVG-ONL 在线 source quarantine：`../VBE-online-source-quarantine-report.md`、`../VBE-online-source-quarantine-protocol.md`
- Study E-BUY 买方参与能力闸门：`../VBE-buyer-capability-gate-report.md`、`../VBE-buyer-capability-gate-protocol.md`、`../VBE-buyer-capability-gate-amendment-1.md`
- Study E-BUY-CXT 买方 sealed→online 上下文注入：`../VBE-buyer-context-injection-report.md`、`../VBE-buyer-context-injection-protocol.md`
- Study E-BUY-ENV-D 公共总体 envelope 组件拆解：`../VBE-buyer-envelope-disassembly-report.md`、`../VBE-buyer-envelope-disassembly-protocol.md`
- Study E-BUY-WRAP-D wrapper / representation 最终微拆：`../VBE-buyer-wrapper-disassembly-report.md`、`../VBE-buyer-wrapper-disassembly-protocol.md`
- Study E-BUY-EV-L wrapper × margin × certainty 经济强度阶梯：`../VBE-buyer-wrapper-ev-ladder-report.md`、`../VBE-buyer-wrapper-ev-ladder-report_EN.md`、`../VBE-buyer-wrapper-ev-ladder-protocol.md`、`../VBE-buyer-wrapper-ev-ladder-protocol_EN.md`（72/72 已完成；`TIER MANIPULATION NOT VALIDATED`）
- Study E-BUY-TEMP-R buyer 时间复制与跨家族正控：`../VBE-buyer-temporal-replay-report.md`、`../VBE-buyer-temporal-replay-report_EN.md`、`../VBE-buyer-temporal-replay-protocol.md`、`../VBE-buyer-temporal-replay-protocol_EN.md`（24/24 已完成；`BROAD CURRENT-WINDOW OUTPUT COLLAPSE`；路由诊断见 `../VBE-provider-routing-diagnostic-report.md`）
- Provider-health bracket v1.1：`../VBE-provider-health-bracket-protocol.md`、`../VBE-provider-health-bracket-protocol_EN.md`、`src/data/provider-health-freeze.json`（14-call pre + 14-call post；新 serving era 首项健康研究建立 baseline，后续研究 preflight 必须匹配）
- Study W-CO 福利挤出跨时代复制：`../VBE-welfare-crowding-out-report.md`、`../VBE-welfare-crowding-out-report_EN.md`、`../VBE-welfare-crowding-out-protocol.md`、`../VBE-welfare-crowding-out-protocol_EN.md`（18 个 fresh paired seeds；2,728 target calls；健康 pre/post bracket；福利 +2.3333，但 gift/sale 联合替代门失败；事后路径为 H–H check swaps）
- Study W-RG 福利角色泛化执行通道：`../VBE-welfare-role-generalization-channel-report.md`、`../VBE-welfare-role-generalization-channel-report_EN.md`、`../VBE-welfare-role-generalization-channel-protocol.md`、`../VBE-welfare-role-generalization-channel-protocol_EN.md`（12 个 fresh 四臂 paired seeds；3,680 target calls；健康 pre/post bracket；同 gift prompt 切断 H–H 通道使福利下降 3.2083，12/12 同向；正式 verdict 支持 H–H 通道占优）
- Study W-SGB 福利语义泛化边界：`../VBE-welfare-semantic-generalization-boundary-report.md`、`../VBE-welfare-semantic-generalization-boundary-report_EN.md`、`../VBE-welfare-semantic-generalization-boundary-protocol.md`、`../VBE-welfare-semantic-generalization-boundary-protocol_EN.md`、`src/data/welfare-semantic-boundary-freeze.json`（14 个 fresh 七臂 paired seeds；7,602/7,602 target calls；健康 pre/post bracket；gift reference 在 H–H 与福利上复制；正式 verdict 为 `GIFT REFERENCE REPLICATED — GENERIC DIRECTIVE SPILLOVER`，并判定 `SUBJECT EXCLUSIVITY BINDS`）
- 中央 null 污染审计：`../VBE-central-null-contamination-audit.md`、`../VBE-central-null-contamination-audit_EN.md`（E-BIS/E-CI 未受已观测 Flash 常量塌缩污染；C-M 零 API）
- Study P 独立确认报告：`../VBE-persistence-confirmatory-report.md`
- Study P 确认协议：`../VBE-persistence-confirmatory-protocol.md`
- Study P-ENF 同模型窄执行层：`../VBE-model-preserving-enforcement-report.md`、`../VBE-model-preserving-enforcement-protocol.md`
- Study I 正创始人租金能力闸门：`../VBE-founder-rent-gate-report.md`
- Study I-R 冻结协议与实施修正：`../VBE-founder-rent-gate-protocol.md`、`../VBE-founder-rent-gate-amendment-1.md`
- Study I-T 交易挂钩 royalty：`../VBE-founder-royalty-report.md`、`../VBE-founder-royalty-protocol.md`
- Study I-M 作者决策微基准：`../VBE-founder-decision-microbenchmark-report.md`、`../VBE-founder-decision-microbenchmark-protocol.md`
- Study I-C 可验证 payoff compiler：`../VBE-payoff-compiler-report.md`、`../VBE-payoff-compiler-protocol.md`
- Study I-S pre-context payoff sanitization：`../VBE-payoff-sanitization-report.md`、`../VBE-payoff-sanitization-protocol.md`
- Study I-TS 规范化 royalty 环境复制：`../VBE-sanitized-royalty-replication-report.md`、`../VBE-sanitized-royalty-replication-protocol.md`
- Study I-TP 隐藏采用预测与动作置信度：`../VBE-hidden-adoption-forecast-report.md`、`../VBE-hidden-adoption-forecast-protocol.md`
- Study I-TPC 动作条件置信度补集：`../VBE-action-confidence-complement-report.md`、`../VBE-action-confidence-complement-protocol.md`、`../VBE-action-confidence-complement-amendment-1.md`、`../VBE-action-confidence-complement-amendment-2.md`
- Study I-TPF proper-scoring 与历史先验 scaffold：`../VBE-forecast-scaffold-report.md`、`../VBE-forecast-scaffold-protocol.md`
- Study I-TPU 随机证据信号 posterior update：`../VBE-posterior-update-report.md`、`../VBE-posterior-update-protocol.md`
- Study I-TPUR RED 分支显式物化消融：`../VBE-posterior-red-branch-report.md`、`../VBE-posterior-red-branch-protocol.md`
- Study I-TPUD typed posterior 到行动迁移：`../VBE-posterior-action-transfer-report.md`、`../VBE-posterior-action-transfer-protocol.md`
- Study I-TPUE 真实早期交易信号环境迁移：`../VBE-real-signal-transfer-report.md`、`../VBE-real-signal-transfer-protocol.md`、`../VBE-real-signal-transfer-amendment-1.md`
- Study C-M 固定供给 mark 集中度因果干预：`../VBE-mark-concentration-report.md`、`../VBE-mark-concentration-protocol.md`
- 研究协议与实施记录：`../VBE-next-study-protocol.md`
- 预设目标完成度审计：`../VBE-research-completion-audit.md`

智能体决策通过 `src/lib/vbe/llm.ts` 的 provider adapter 调用。支持 xAI 和 DeepSeek；对照机器人在 `robots.ts`，不需要 API。

## 布局

```
src/lib/vbe/
  env.ts          回合引擎、相遇、记分、beforeMeetings/afterMeetings 钩子
  params.ts       冻结参数（n=8, T=24, q=0.4, …）
  prompts.ts      规则 / 故事 / 会面 prompt
  robots.ts       Never / Barter / Reciprocity / KW / Altruist
  llm.ts          provider adapter、模型调用、JSON 解析
  types.ts        Proposal, AgentState, RunResult
  run-*.ts        各刀 runner（可 resume）
  *.test.ts       编码、识别、K=0 等单测
src/data/*.json   已跑结果（种子级）
```

## 跑法

需要 Node 22+（`--experimental-strip-types`），以及所选 provider 的 API key。

分析器例外：它们必须是冻结产物的纯函数，不得依赖 API key、`LLM_PROVIDER`、`LLM_MODEL` 或 `LLM_API_URL` 等环境配置。`analysis-keyless.test.ts` 会显式清空这些凭证与配置，并运行全部 `analyze-*.ts` 脚本；新增分析器会自动进入该电池。

新研究的调用冻结还必须包含账户级 `/models` 目录、请求模型名与允许的 provider-returned model 集合；若 preflight 映射超出冻结集合，必须在首次 target call 前停止。

```bash
# DeepSeek（未来 V4.1 Flash 研究使用 canonical API 名称；不得与旧 Flash corpus 池化）
export LLM_PROVIDER=deepseek
export LLM_MODEL=deepseek-flash
export DEEPSEEK_API_KEY=...

# xAI（复现既有 Grok 实验时使用）
export LLM_PROVIDER=xai
export LLM_MODEL=grok-4.5
export XAI_API_KEY=...
```

不要把 key 写入源码或结果文件。DeepSeek 路径显式关闭 thinking，并保持温度为 0；每份 Study E 报告记录实际模型名。

```bash
# 无 API：机器人校准
node --experimental-strip-types src/lib/vbe/run-calibrate.ts

# 单测
node --experimental-strip-types --test src/lib/vbe/*.test.ts

# 各刀（会写 src/data/<name>.json，已有结果则 skip）
node --experimental-strip-types src/lib/vbe/run-phase0.ts
node --experimental-strip-types src/lib/vbe/run-phase1.ts
node --experimental-strip-types src/lib/vbe/run-origination.ts

# Gate 0：不调用 API 的 mark 边际价值检查
node --experimental-strip-types src/lib/vbe/run-value.ts

# Study E pilot：E0 私有送达 vs E∞ 公共账本（需要 API）
node --experimental-strip-types src/lib/vbe/run-epistemic.ts

# 单次真实 API/JSON 兼容性检查，不写实验数据
node --experimental-strip-types src/lib/vbe/run-epistemic.ts --smoke

# 不调用 API，打印两组最终 prompt 供审查
node --experimental-strip-types src/lib/vbe/run-epistemic.ts --dry-run

# pilot 完成后做 seed-level 配对推断
node --experimental-strip-types src/lib/vbe/analyze-epistemic.ts

# Study E 后置校准：买方占优动作 + 信念量表灵敏度
node --experimental-strip-types src/lib/vbe/run-epistemic-gates.ts

# Study E′2：k=2 临界安装规模（与 k=1 使用同一批 seed）
node --experimental-strip-types src/lib/vbe/run-epistemic-threshold.ts
node --experimental-strip-types src/lib/vbe/analyze-epistemic.ts src/data/epistemic-k2.json
node --experimental-strip-types src/lib/vbe/analyze-epistemic-threshold.ts

# Study E 影子信念：先跑已知真值闸门，通过后才能跑 8-seed pilot
node --experimental-strip-types src/lib/vbe/run-epistemic-shadow-gates.ts
node --experimental-strip-types src/lib/vbe/run-epistemic-shadow.ts
node --experimental-strip-types src/lib/vbe/analyze-epistemic-shadow.ts

# Study E-R：private/public × inline/sealed-replay，8 个四臂 block
node --experimental-strip-types src/lib/vbe/run-epistemic-reactivity.ts
node --experimental-strip-types src/lib/vbe/analyze-epistemic-reactivity.ts

# Study E-R 独立确认：16 个全新四臂 block
node --experimental-strip-types src/lib/vbe/run-epistemic-reactivity-confirmatory.ts
node --experimental-strip-types src/lib/vbe/analyze-epistemic-reactivity-confirmatory.ts

# Study E-D：private/public × action/schema/unrewarded/rewarded，8 个八臂 block
node --experimental-strip-types src/lib/vbe/run-epistemic-disassembly.ts
node --experimental-strip-types src/lib/vbe/analyze-epistemic-disassembly.ts

# Study E-RW：奖励 transition 独立确认，28 个全新四臂 block
node --experimental-strip-types src/lib/vbe/run-epistemic-reward-confirmatory.ts
node --experimental-strip-types src/lib/vbe/analyze-epistemic-reward-confirmatory.ts

# Study E：从 retained raw meetings 重算 belief-reward 粒度、量级与固定点
node --experimental-strip-types src/lib/vbe/audit-epistemic-belief-reward.ts

# Study E-BIS：逐报告计分、truthful robot anchors、数分量级赌注的 8-seed 灵敏度闸门
node --experimental-strip-types src/lib/vbe/run-belief-instrument-sensitivity.ts
node --experimental-strip-types src/lib/vbe/analyze-belief-instrument-sensitivity.ts

# Study E-CI：真实四机器人政策不变，只随机化 0/2/4 份公开可信证书
node --experimental-strip-types src/lib/vbe/run-credible-information-itt.ts
node --experimental-strip-types src/lib/vbe/analyze-credible-information-itt.ts

# Study E-TPCD：typed peer probability 与 K=4 近期拒绝历史的封存冲突诊断
node --experimental-strip-types src/lib/vbe/run-peer-probability-conflict.ts
node --experimental-strip-types src/lib/vbe/analyze-peer-probability-conflict.ts

# Study I：付费发布 vs 确定退款 vs 外生发布阳性对照
node --experimental-strip-types src/lib/vbe/run-founder.ts
node --experimental-strip-types src/lib/vbe/analyze-founder.ts

# Study I-R：确定正作者收益 vs 等财富控制，18 个全新三臂 block
node --experimental-strip-types src/lib/vbe/run-founder-rent.ts
node --experimental-strip-types src/lib/vbe/analyze-founder-rent.ts

# Study I-T：交易挂钩 royalty vs 同分布延迟财富控制
node --experimental-strip-types src/lib/vbe/run-founder-royalty.ts
node --experimental-strip-types src/lib/vbe/analyze-founder-royalty.ts

# Study I-M：role × score × timing × semantics 作者决策与封存算术
node --experimental-strip-types src/lib/vbe/run-founder-decision-microbenchmark.ts
node --experimental-strip-types src/lib/vbe/analyze-founder-decision-microbenchmark.ts

# Study I-C：raw / correct / verified / false / rejected payoff 表示
node --experimental-strip-types src/lib/vbe/run-founder-payoff-compiler.ts
node --experimental-strip-types src/lib/vbe/analyze-founder-payoff-compiler.ts

# Study I-S：错误派生字段的 pre-context quarantine
node --experimental-strip-types src/lib/vbe/run-founder-payoff-sanitization.ts
node --experimental-strip-types src/lib/vbe/analyze-founder-payoff-sanitization.ts

# Study I-TS：把可信 canonical payoff object 接回完整 royalty 环境
node --experimental-strip-types src/lib/vbe/run-founder-sanitized-royalty.ts
node --experimental-strip-types src/lib/vbe/analyze-founder-sanitized-royalty.ts

# Study I-TP：隐藏历史分布，分开封存预测、阈值动作与 action confidence
node --experimental-strip-types src/lib/vbe/run-founder-hidden-forecast.ts
node --experimental-strip-types src/lib/vbe/analyze-founder-hidden-forecast.ts

# Study I-TPC：已知概率下的 chosen-action complement 接口微基准
node --experimental-strip-types src/lib/vbe/run-founder-action-confidence.ts
node --experimental-strip-types src/lib/vbe/analyze-founder-action-confidence.ts

# Study I-TPF：raw / proper-score / prior-scaffold 隐藏采用预测
node --experimental-strip-types src/lib/vbe/run-founder-forecast-scaffold.ts
node --experimental-strip-types src/lib/vbe/analyze-founder-forecast-scaffold.ts

# Study I-TPU：条件表 / compiled likelihood / explicit odds 后验更新
node --experimental-strip-types src/lib/vbe/run-founder-posterior-update.ts
node --experimental-strip-types src/lib/vbe/analyze-founder-posterior-update.ts

# Study I-TPUR：implicit complement / explicit rows / observed-row-only
node --experimental-strip-types src/lib/vbe/run-founder-posterior-red-branch.ts
node --experimental-strip-types src/lib/vbe/analyze-founder-posterior-red-branch.ts

# Study I-TPUD：prior / typed posterior / matched noninformative action transfer
node --experimental-strip-types src/lib/vbe/run-founder-posterior-action-transfer.ts
node --experimental-strip-types src/lib/vbe/analyze-founder-posterior-action-transfer.ts

# Study I-TPUE：真实早期交易信号 → deterministic posterior → 封存行动
node --experimental-strip-types src/lib/vbe/validate-founder-real-signal-calibration.ts
node --experimental-strip-types src/lib/vbe/run-founder-real-signal-transfer.ts
node --experimental-strip-types src/lib/vbe/analyze-founder-real-signal-transfer.ts

# Study C-M：零 API，固定总供给并直接操纵 round-5 mark 集中度
node --experimental-strip-types src/lib/vbe/run-mark-concentration.ts
node --experimental-strip-types src/lib/vbe/analyze-mark-concentration.ts

# Study P：临时提示、私有记忆、公共账本、可执行合约
node --experimental-strip-types src/lib/vbe/run-persistence.ts
node --experimental-strip-types src/lib/vbe/analyze-persistence.ts

# Study P 独立确认：16 个全新 paired seeds，仅 transient vs public-ledger
node --experimental-strip-types src/lib/vbe/run-persistence-confirmatory.ts
node --experimental-strip-types src/lib/vbe/analyze-persistence-confirmatory.ts

# Study P-ENF：同模型 ledger / blind execution / disclosed execution
node --experimental-strip-types src/lib/vbe/run-model-preserving-enforcement.ts
node --experimental-strip-types src/lib/vbe/analyze-model-preserving-enforcement.ts

# Study W-SGB：语义泛化边界（冻结 → pre-health → target → post-health → 零调用 finalization）
node --experimental-strip-types src/lib/vbe/run-welfare-semantic-boundary.ts --dry-run
node --experimental-strip-types --test src/lib/vbe/welfare-semantic-boundary.test.ts
node --experimental-strip-types src/lib/vbe/run-provider-health.ts --plan src/data/provider-health-welfare-semantic-boundary-plan.json --phase pre
node --experimental-strip-types src/lib/vbe/run-welfare-semantic-boundary.ts
node --experimental-strip-types src/lib/vbe/run-provider-health.ts --plan src/data/provider-health-welfare-semantic-boundary-plan.json --phase post
node --experimental-strip-types src/lib/vbe/run-welfare-semantic-boundary.ts
node --experimental-strip-types src/lib/vbe/analyze-welfare-semantic-boundary.ts
node --experimental-strip-types src/lib/vbe/plot-paper1-welfare.ts
node --experimental-strip-types src/lib/vbe/analyze-paper1-scope-exploratory.ts
node --experimental-strip-types --test src/lib/vbe/paper1-scope-exploratory.test.ts
node --experimental-strip-types src/lib/vbe/plot-paper1-exploratory.ts

# Study E-SVG：validator × temporal scope × population scope
node --experimental-strip-types src/lib/vbe/run-source-validity-gating.ts
node --experimental-strip-types src/lib/vbe/analyze-source-validity-gating.ts

# Study E-SVG-CXT：复用冻结 E-CI 轨迹的四臂 source-gate 影子迁移
node --experimental-strip-types src/lib/vbe/run-source-validity-context-transfer.ts
node --experimental-strip-types src/lib/vbe/analyze-source-validity-context-transfer.ts

# Study E-SVG-ONL：全 LLM 在线闭环 valid / visible-invalid / quarantined-invalid
node --experimental-strip-types src/lib/vbe/run-online-source-quarantine.ts
node --experimental-strip-types src/lib/vbe/analyze-online-source-quarantine.ts

# Study E-BUY：买方参与能力与 sealed→online 接口瓶颈
node --experimental-strip-types src/lib/vbe/run-buyer-capability.ts
node --experimental-strip-types src/lib/vbe/analyze-buyer-capability.ts

# Study E-BUY-CXT：真实状态、记忆与公共总体 envelope 注入
node --experimental-strip-types src/lib/vbe/run-buyer-context-injection.ts
node --experimental-strip-types src/lib/vbe/analyze-buyer-context-injection.ts

# Study E-BUY-ENV-D：公共总体 envelope 组件拆解
node --experimental-strip-types src/lib/vbe/run-buyer-envelope-disassembly.ts
node --experimental-strip-types src/lib/vbe/analyze-buyer-envelope-disassembly.ts

# Study E-BUY-WRAP-D：wrapper / representation 最终微拆
node --experimental-strip-types src/lib/vbe/run-buyer-wrapper-disassembly.ts
node --experimental-strip-types src/lib/vbe/analyze-buyer-wrapper-disassembly.ts

# Study E-BUY-EV-L：wrapper × margin × certainty 经济强度阶梯
node --experimental-strip-types src/lib/vbe/run-buyer-wrapper-ev-ladder.ts --dry-run
node --experimental-strip-types --test src/lib/vbe/buyer-wrapper-ev-ladder.test.ts
node --experimental-strip-types src/lib/vbe/run-buyer-wrapper-ev-ladder.ts
node --experimental-strip-types src/lib/vbe/analyze-buyer-wrapper-ev-ladder.ts
```

已冻结结果含 892 个 LLM 环境 treatment-runs，以及 I-M/I-C/I-S 各 20 个 prompt blocks、I-TP 的 36 个封存决策/预测区组、I-TPC 的 12 个已知分布 blocks、I-TPF 的 36 个 forecast/rollout blocks、I-TPU 的 24 个 posterior cases、I-TPUR 的 12 个 RED cases、I-TPUD 的 24 个 action-transfer cases 和 I-TPUE 的 36 个真实信号 rollouts，并有 E-TPCD 的 24 个四臂冲突 blocks、E-SVG 的 18 个九臂来源 blocks、E-SVG-CXT 的 72 个四臂轨迹上下文 blocks、E-SVG-ONL 的 18 个三臂在线 blocks、E-BUY 的 24 个六臂买方能力 blocks、E-BUY-CXT 的 30 个五臂上下文 blocks、E-BUY-ENV-D 的 18 个六臂 envelope 拆解 blocks、E-BUY-WRAP-D 的 12 个六臂 wrapper 拆解 blocks、P-ENF 的 18 个三臂执行 blocks，共 65,778 次保留成功模型调用，另有 40 次影子量表闸门调用。E-BIS 含 8 个环境 runs、299 次调用与 216 条逐项计分报告，全部成功；204/216 仍为 `(0.5,0.5)`，三项冻结 sensitivity gates 均失败。E-CI 含 54 个环境 runs、2,091 次调用；4−0 卖方 ITT 为 +0.0158，未达冻结门，verdict 为 `NO MATERIAL ACTION ITT`。E-TPCD 含 96 次封存行动调用；history-only/consistent 为 0/24 卖出，high-control/contradicted 为 24/24，verdict 为 `TYPED OBJECT OVERRIDES RECENT HISTORY`。E-SVG 含 162 次封存行动调用；fully valid 18/18、七个 invalid typed arms 1/126、合同准确率 161/162，verdict 为 `SOURCE VALIDITY GATE SUPPORTED`。E-SVG-CXT 得到 valid-visible 与 invalid-visible 均 72/72 卖出、history-only 与 invalid-quarantined 均 0/72，verdict 为 `VISIBLE FAILED SOURCE CONTAMINATES`。E-SVG-ONL 随后以 54 个全 LLM runs 完成在线闭环：visible-invalid−quarantined seller intent 为 +0.0522（单侧 exact `p=0.003906`），低于冻结 +0.15 MRES；PASS−FAIL 为 +0.1554，买方、成交与撤除后效应均为零，verdict 为 `NO MATERIAL ONLINE ACTION CONTAMINATION`。E-BUY 随后用 24 个六臂 sealed blocks 验证买方能力：low-uncertain 23/24、high-guaranteed 24/24、negative-guaranteed 2/24，主能力差 +0.9167（单侧 exact `p=2.38×10⁻⁷`），而 certainty、margin 与 action materialization 的单轴 rescue 均未通过。E-BUY-CXT 再用 15 seeds × early/late 两个 contexts 的五臂配对重放：standard-sealed 28/30、real-state 16/30、real-memory 25/30，而 online-envelope 与 exact online-replay 均为 0/30；envelope 在有/无记忆下的 seed-level 降幅为 +0.8333/+0.5333，verdict 为 `PUBLIC POPULATION ENVELOPE SUPPRESSOR`。E-BUY-ENV-D 再以 18 个未复用 contexts 拆解该包：narrow-anchor 16/18，而 public-hard-current-full、四个 dual-role 核心格和 original-envelope 均 0/18；首个 bridge 降幅 +0.8889（单侧 exact `p=0.0000153`），verdict 为 `PUBLIC WRAPPER/HARD-ONLY BRIDGE SUPPRESSOR`，但该 bridge 仍同时改变 wording 与 representation。E-BUY-WRAP-D 最后用 12 个全新 contexts 得到 exact narrow 12/12、exact public-hard 0/12，而 harmonized sealed-flat/sealed-nested/public-flat 为 12/12、public-nested 为 10/12；framing/representation 主效应均仅 +0.0833，residual repair 为 +0.8333（单侧 exact `p=0.0009766`），verdict 为 `HARMONIZED CORE REPAIRS EXACT-PUBLIC BRIDGE`。P-ENF 含 54 runs、4,122 次调用；blind−ledger 成交 +0.2956、mean score +1.4132，verdict 为 `EXECUTION EFFECT SUPPORTED WITH WELFARE SUPPORT`。C-M 另含 512 个 seed blocks、6,656 次零 API robot population-runs。环境结果记录 0 次 API/schema/parse failure；E-BUY-CXT、E-BUY-ENV-D 与 E-BUY-WRAP-D 的 150/108/72 次调用同样全部成功且无 amendment。I-M 保留 800 次成功调用并披露 4 次未保留 parse failure 和 2 次诊断调用；I-C 保留 400 次成功调用并披露 3 次未保留 parse failure；I-S 保留 400 次成功调用且无失败或 amendment；I-TP 的 2,942 次调用全部成功。I-TPC 最终保留 576 次单版本调用，另归档排除 464 次修正前成功调用并披露 2 次 schema failure。I-TPF 的 108 次预测与 2,692 次环境调用全部成功；I-TPU 的 72 次 posterior 调用、I-TPUR 的 36 次 RED 消融调用与 I-TPUD 的 72 次 action-transfer 调用全部成功。I-TPUE 保留 2,776 次环境行动与 108 次封存决策，另按冻结 amendment 排除一个停止 seed 的 72 次成功调用。E-BUY 保留 144 次单版本调用；另有首次 transport mismatch 后 1 次成功调用未记录并按 Amendment 1 排除。P0/P2、P-ENF、E-SVG（仅短 sealed interface）、Study E-R、Study E-RW、Study I-R、Study I-S、Study I-TS、Study I-TPUD 和 Study I-TPUE 获冻结支持；C-M 独立支持固定供给下库存集中度降低交易速度。I-T 的原始交易 royalty 为 11/18，未达到 14/18 门槛；I-TS 的 canonical trade 为 18/18、同批 raw 为 8/18、canonical lottery 为 0/18，表示修复与决策依赖两项冻结检验均通过。I-M 定位分布算术故障；I-C 与 E-SVG-CXT 显示 in-context `FAIL` 不是稳定隔离边界；I-S 把失败数字在 prompt 前 quarantine 后恢复受控决策，I-TS 进一步证明该修复可迁移到真实交易不确定性和延迟结算环境。I-TP 隐藏历史分布后，预测、冻结阈值决策与 action-conditioned confidence 三模块均失败，verdict 为 `NOT CALIBRATED`。I-TPC 显示 scalar complement 288/288、显式分支 vector 283/288，而普通 compiled vector 255/288，verdict 为 `CAPABILITY PRESENT — EXPLICIT VECTOR REPAIR REQUIRED`。I-TPF 的 proper-score Brier 改善只有 +0.0211，未达 +0.05 floor；历史 prior scaffold 虽把 Brier 降至 0.5922，却 36/36 复制 prior 且 TV=0.1019 略过 guard，verdict 为 `NO FORECAST INTERVENTION SUPPORTED`。I-TPU 显示 conditional-table 仅 13/24、RED 仅 1/12，而 compiled-likelihood 与 explicit-odds 均为 24/24，verdict 为 `COMPILED LIKELIHOOD REQUIRED`。I-TPUR 同轮复制 implicit RED 0/12、显式两行 11/12、observed-only 12/12，verdict 为 `COMPLEMENT MATERIALIZATION REQUIRED`。I-TPUD 的三臂 own-target 均为 24/24，typed flip 与 control stability 均为 24/24。I-TPUE 的真实信号/库存代理使 fresh Brier 改善 +0.0894，typed 低后验翻转 11/11、control 稳定 36/36，verdict 为 `REAL-SIGNAL PIPELINE SUPPORTED`。

2026-09-13 的 pre-freeze 设计审计不改变 E-BUY-WRAP-D 冻结产物或机器 verdict。E-BUY-EV-L v1.1 随后完成 72/72 target calls：weak、medium、strong 三档下 narrow 与 public-hard 六臂全部为 0/12，所有 72 个结构化 proposals 均为 `{"giveCheck":true,"giveChits":0,"requireChit":true}`，无 API/schema/parse failure，全部完整性审计通过。由于三个 narrow rates 都未达到 0.75，机器 verdict 为 `TIER MANIPULATION NOT VALIDATED`，link 为 `WEAK LINK DRIFTED`，margin/certainty statuses 均为 `NOT INTERPRETABLE`。按冻结分支不运行 grounding 或 online closure；结果不能区分新-context heterogeneity 与 later service-window/provider drift，也不否定 grounding residual。加入本研究后，保留成功模型调用总数由 65,778 增至 65,850。

E-BUY-TEMP-R 随后以 24 次独立调用完成 identical-input temporal replay：12 个 E-BUY-WRAP-D exact-narrow 与 12 个 E-BUY high-guaranteed 历史 12/12 prompts 在当前窗口均为 0/12。24 个 prompt/request hashes 与 response IDs 均不同，raw response 却逐字相同；连同 EV-L，本窗口 96 个不同 prompts 的 raw-response entropy 为零。共享 caller hashes 未变，机器 verdict 为 `BROAD CURRENT-WINDOW OUTPUT COLLAPSE`。Observed adapter 记录 provider returned model=`deepseek-flash`、system fingerprint=`aeb56401ca74e127821c4f9126dcb669`。DeepSeek 随后确认 `deepseek-flash` 是 V4.1 Flash canonical API 名称，旧 V4 Flash 名称暂时路由到它；显式 `deepseek-flash` 仍复现常量，而官方改路由截止点前的 Pro 正控正常。因此本结果限于 documented V4→V4.1 alias + V4.1 Flash serving-identity output collapse，作 methods/limitations 素材，不升格为新研究主线。总保留成功调用现为 65,874。

W-CO 在切换点后完成首个 canonical `deepseek-flash` bracket：12 次 bridge 与 2,728 次 target calls 全部成功，pre/post 各 14 次 health calls 健康且身份一致。Gift-talk−money-talk mean score 为 +2.3333，但预定 Easy→Hard gift 增量未达 MRES、两臂 mark sales 均为零，正式 verdict 为 `WELFARE CONTRAST WITHOUT JOINT BEHAVIORAL SUBSTITUTION`。事后审计显示 H–H mutual check swaps 从 27/154 升至 138/154。加入 2,740 次研究调用后 retained study/diagnostic 总数为 68,614；另计 28 次 provider-health calls，完整 bracket workflow 为 68,642 次成功调用。

W-RG 随后把 H–H 路径做成前瞻性同提示执行干预：12 个 fresh seeds 的三条 gift 臂可见 prompt 字节相同，只在 response 后切断 H–H 或 E→H 通道。48/48 cells、3,680 target calls 全部成功，第二个 pre/post bracket 继续健康。Gift−neutral 福利为 +1.6823；gift−H–H-blocked 为 +3.2083 且 12/12 同向；E→H-blocked−H–H-blocked 为 +2.7604 且 12/12 同向。正式 verdict 为 `HH EXECUTION CHANNEL DOMINATES REPLICATED GIFT-TALK WELFARE EFFECT`。累计 retained study/diagnostic calls 为 72,294；两项研究共 56 次 provider-health calls 后，完整 bracketed workflow 总数为 72,350。

W-RG 的报告解释边界已进一步收紧：标准 gift 臂有 26 个物质可行的原始 E→H gift 意图，其中 25 个被 Hard 的无条件给出吸收并结算为 swap。因此低的一向 E→H 实现率不是低 Easy 意图，而是 Hard 互惠造成的上游吸收；blocked-arm 结果是执行制度对比，不是两个独立中介的贡献分解。另因 neutral 没有任何建议，gift−neutral 同时包含“存在公共指令”的效应，不能识别 gift-specific semantics。下一候选实验将以 H–H swap rate 和福利为共同主要结果，引入 exact money-talk、主体/受益者量词变体及一个非福利改善交易指令；非主要 `+0.4479`（单侧 exact `p=0.0625`）继续保持 descriptive、non-upgradeable。

W-SGB 随后完成该语义边界：98/98 cells、7,602 target calls 全部成功，第三个 pre/post bracket 健康且身份一致。Exact gift−neutral 的 H–H swap-rate 与福利分别为 +0.6070 和 +2.0625，均 14/14 同向并通过两组 Holm gates；exact money 不提高两项结果，所有七臂 mark sales 均为零。机械负福利的 E–E 指令在 113/114 机会中被执行，同时使 H–H swap-rate 相对 neutral 提高 +0.3777，但福利仅 +0.1875、区间跨零。`Easy only` 基本退回 neutral，any-holder 与 Hard-partner-only 保留强效应。正式 verdict 为 `GIFT REFERENCE REPLICATED — GENERIC DIRECTIVE SPILLOVER`，量词判定为 `SUBJECT EXCLUSIVITY BINDS`：规则传播能力与制度福利质量是两个不同维度。加入本研究后 retained study/diagnostic 总数为 79,896；三项 V4.1 Flash 研究共 84 次 provider-health calls，完整 bracketed workflow 为 79,980 次成功调用。

温度固定 0。环境研究（含 I-TS、I-TP、I-TPF、I-TPUE 与 C-M）的统计单位是**种子/population-run**；C-M 的 12 个集中分配先在 seed 内平均。I-M/I-C/I-S/I-TPC 的统计单位是完整区组，I-TPU/I-TPUR/I-TPUD 的统计单位是完整 prior × signal case；不要把单次会面、数值字段、分配排列或 prompt 当独立观测。

## 最小识别

第 2 层货币：内部 Hard（持标记）向 Easy 买校验，接受率 ≥ 0.4，且最后一轮塌到近 0。
起源编码（冻结）：点名标记为交换媒介且给出汇率 = MONEY；无条件白送剩余校验 = GIFT。

## Study E：共同可知性

`epistemic.ts` 使用一个冻结 KW 代理（#0）作为行为事实锚点。E0 和 E∞ 向每个 LLM 提供完全相同的锚点事实，只改变该事实的送达证明：私人通知不证明别人收到，公共账本证明全体看到同一记录。

在冻结参数下，`value.ts` 自动得到第 5–21 轮的协调窗口：仅依赖 #0 接受 mark 不足以覆盖 0.5 的机会成本，但若其他代理普遍接受则足够。Study E 只在该窗口上做主要推断，并分开报告：

- Easy 卖方愿意收 mark 的意图；
- Hard 买方愿意支付 mark 的意图；
- 双方配合后的实际成交；
- 一阶 `pAccept` 和二阶 `pSecond`。

runner 使用 12 个配对 seed，任何 API 或 JSON schema 错误都会立即终止当前运行，不会用 idle 行为填补污染数据。

Study E 使用独立的结构 RNG 与收益 RNG。相同 seed 的 E0/E∞ 共享初始持有者、角色、配对以及每个 agent-round 的成功抽样；行为差异不会推动后续外生日程漂移。报告会核对日程指纹。主要因果比率以全部外生 H–E 会面为分母，持 mark 的可行机会条件比率只作诊断，避免处理后选择。

影子 Study E 在 k=2 下另用 8 个全新配对 seed。行动 prompt 不询问信念；第 5/10/15/20 轮的旁路探针不改环境、记忆或他人可见信息。v1 已知真值闸门 10/20 失败并保留，v2 语义字段 20/20 通过后才放行。pilot 未复现旧 k=2 正向买方效应（public−private = −0.120），二阶预期差仅 +0.004；但探针答案几乎恒为 3/5，仍不具备足够的构念效度。

Study E-R 再用 8 个全新 seed 做同-seed 四臂比较。Inline 复制旧联合行动/信念提示；sealed-replay 实时只行动，24 轮结束后才逐一重放冻结上下文。买方 public−private 在 inline 为 +0.320，在 sealed 为 −0.112；冻结主 interaction 为 +0.432、8/8 seed 为正，因此定位到完整 elicitation package 的强反应性。四臂主窗口的 `pAccept/pSecond` 仍全部为 0.5，所以结果不能解释为已测得的信念中介。

E-RC 使用 16 个不重叠新 seed 独立复制相同四臂设计，且 pilot 数据不进入确认估计。Inline public−private 买方效应为 +0.299，sealed 为 −0.117，主 interaction 为 +0.416（95% [+0.319, +0.509]；相对 0.15 MRES 的 centered one-sided exact `p=0.000183`），两个方向护栏均通过。3,650/3,652 条确认信念记录仍为 0.5，因此可确认的是完整 elicitation package 的行动反应性，而不是信念中介或单一问题语义。

E-D 再用 8 个全新 seed，把实时界面嵌套为 action-only、schema-control、belief-unrewarded、belief-rewarded，并与 private/public 交叉。D−A 总 interaction 为 +0.353、8/8 seed 为正，成功恢复整体效应；B−A、C−B、D−C 分别为 +0.042、+0.149、+0.162。冻结筛选选择奖励文字为下一确认候选，但语义增量只比门槛低 0.0011，不能宣称奖励是唯一原因。B/C/D 的 2,550 条数值字段仍全部为 0.5。

E-RW 用 28 个进一步的新 seed 只复制 private/public × belief-unrewarded/belief-rewarded。112 个 runs、6,324 次调用全部成功，28/28 schedule block 匹配。Rewarded−unrewarded 的买方 public interaction 为 +0.215（bootstrap 95% [+0.135,+0.295]；零中心单侧 exact `p=0.00001287`），rewarded public +0.298、unrewarded public +0.084，两条护栏均通过，冻结 verdict 为 `SUPPORTED`。后置审计表明每 agent-run 约 6.4 个报告先平均成两个 settlement，总上限仅 0.5 分，且全体 0.5 是 `pSecond` 的内生固定点；因此它支持低物质赌注 reward-framing 的行动效应，不支持奖励优化或 belief null 的能力解释。

C-M 在 512 个全新 seeds 上直接操纵 round-5 mark 分布，并保持总供给、support identities、前四轮历史与外生日程不变。`[2,1,1,0]` 相对 `[1,1,1,1]` 使 rounds 5–23 交易减少 0.6449（bootstrap 95% [−0.6978,−0.5916]），全部冻结门通过。I-TPUE 的 signal 因而应视为早期交易/库存集中度复合代理；预测结果保留，early trade 因果解释不成立。
