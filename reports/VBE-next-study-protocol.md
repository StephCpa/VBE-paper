# 从便宜谈话到制度：VBE 下一阶段研究协议

**版本：** 1.30 · 2026-09-14  
**状态：** E-R、E-RW、E-SVG（限短 sealed interface）、I-R、I-S、I-TS、I-TPUD、I-TPUE、P0/P2 和 P-ENF 获项目内冻结支持；W-SGB 为 `GIFT REFERENCE REPLICATED — GENERIC DIRECTIVE SPILLOVER`，并判定 `SUBJECT EXCLUSIVITY BINDS`；E-SVG-CXT 为 `VISIBLE FAILED SOURCE CONTAMINATES`；E-SVG-ONL 为 `NO MATERIAL ONLINE ACTION CONTAMINATION`，但检测到低于 MRES 的小 seller-intent 残余；E-BUY 为 `BUYER CAPABILITY PRESENT — ONLINE NULL CONTEXTUAL`；E-BUY-CXT 为 `PUBLIC POPULATION ENVELOPE SUPPRESSOR`；E-BUY-ENV-D 为 `PUBLIC WRAPPER/HARD-ONLY BRIDGE SUPPRESSOR`；E-BUY-WRAP-D 为 `HARMONIZED CORE REPAIRS EXACT-PUBLIC BRIDGE`；P-ENF 为 `EXECUTION EFFECT SUPPORTED WITH WELFARE SUPPORT`；I-T 为已由 I-TS 修复的部分支持前序结果；I-TP 为 `NOT CALIBRATED`；I-TPC 定位为“标量能力存在、普通 vector 不安全”；I-TPF 为 `NO FORECAST INTERVENTION SUPPORTED`；I-TPU 为 `COMPILED LIKELIHOOD REQUIRED`；I-TPUR 为 `COMPLEMENT MATERIALIZATION REQUIRED`；E-CI 为 `NO MATERIAL ACTION ITT`；E-TPCD 为 `TYPED OBJECT OVERRIDES RECENT HISTORY`
**承接材料：** `VBE-research-dossier.md`、`lab-report.md`

**2026-09-13 EV 设计更新：** E-BUY-WRAP-D 的冻结协议、结果与 verdict 不变，其 “repair” 仍仅指相对 narrow anchor 的行动恢复。`VBE-buyer-wrapper-ev-ladder-protocol.md` v1.1 已在首次调用前完成最后一次 verdict-only 重冻结：weak→medium 为 margin-only（EV 0.04575→0.3325），medium→strong 为 certainty-only（0.3325→1.33），且 12 个 fresh contexts 中有 8 个 seeds 与 E-BUY-WRAP-D 重叠。v1.1 新增窄接口三档有效性门与单轴非单调 verdict，但不改 tiers、prompts、contexts、contrasts、既有阈值或调用数。Strong robustness 才触发在线三臂 closure；部分 EV 恢复且仍有 residual gap 时先做 36-call sealed grounding；full threshold shift 停止归因并把 grounding 明确保留为未检验；descriptive recovery 触发 fresh-seed/独立窗口复制，single-axis reversal 与 no-localization 均不触发 grounding。

**2026-09-13 E-BUY-EV-L 结果：** 72/72 调用成功且完整性全部通过，但六臂均为 0/12，三个 narrow tiers 全部未达 0.75 validity floor。机器 verdict 为 `TIER MANIPULATION NOT VALIDATED`，link 为 `WEAK LINK DRIFTED`，margin/certainty 均为 `NOT INTERPRETABLE`。这是 stated-tier/action-capability manipulation failure，不是 wrapper null；按冻结分支不做 grounding 或 online closure。结果不能区分 fresh-context heterogeneity 与 later service-window/provider drift，grounding residual 保持未检验。

**2026-09-13 E-BUY-TEMP-R 与路由诊断：** 12 个 E-BUY-WRAP-D exact narrow 与 12 个 E-BUY high-guaranteed 历史 12/12 prompts 被逐字重放，两臂当前均为 0/12。24 个不同 prompt/request hashes、24 个唯一 response IDs 得到一个相同 raw response；连同 EV-L，本窗口 96 个 prompts 的 raw-response entropy 为零。共享 caller hashes 未变，故 new-context-only 不足以解释。DeepSeek 官方随后确认 `deepseek-flash` 是 V4.1 Flash canonical API 名称，旧 V4 Flash 名称暂时路由到它；乱写模型名返回 400，显式 `deepseek-flash` 仍复现常量，而改路由截止点前的 Pro 对照正常区分任务。因此记录定性为 `DOCUMENTED V4-TO-V4.1 FLASH ALIAS PLUS V4.1-FLASH-SERVING-IDENTITY-SPECIFIC OUTPUT COLLAPSE`，作 methods/limitations 素材，不转为新主线，不恢复 grounding。

**状态优先级说明：** 上述日期标记的 EV-L/TEMP-R 决定取代本文后部仍保留的“EV ladder 待运行”或“直接进入 online closure”历史措辞。E-BIS、E-CI 与 C-M 均已完成，不是待运行项。

**诊断闭合与 null 审计：** 同账户 `deepseek-v4-pro` 在官方改路由截止点前于同一历史 prompt 上返回合理购买动作，同 RULES 的无关算术后缀也精确返回外部预定 JSON，故塌缩定位到 provider-labeled V4.1 Flash serving identity。零调用审计又确认 E-BIS/E-CI 早于 9 月 8 日的更晚健康锚点，且各有 4 种 LLM proposal patterns；E-CI 每个剂量臂都包含全部四种。两个 null 因此未受已观测 V4.1 Flash 单常量塌缩污染；C-M 仍是零 API。

**模型时代边界与后续顺序：** 既有主 corpus 属于早期 Flash 请求时代；canonical `deepseek-flash` 调用属于 provider-labeled V4.1 Flash era，两者不得池化。历史 shared-item bridge 只能描述迁移差异，不能证明模型等价。官方 2026-09-14 04:00 UTC 后 `deepseek-v4-pro` 也路由到 V4.1 Flash，因此 pre-cutoff Pro scratch 只用于诊断，不建立 Pro era。W-CO 建立本 era baseline，W-RG 与 W-SGB 随后均以 `eraBaselineMode=compare` 完成；所有后续研究继续使用 compare。W-SGB 已完成，belief repair 仍未运行且不再是 Paper 1 的依赖项。

**2026-09-14 W-CO 结果：** 官方切换点后 catalog 仍为 `deepseek-flash, deepseek-v4-pro`；run-specific plan 与 manifest 在零调用状态冻结。Pre/post 14-call health brackets 均健康且身份一致，建立首个 V4.1 Flash era baseline。12-call bridge 中 8 个历史 positive prompts 全由 buy 变为 no-buy，4 个 negative 保持 no-buy，仅作跨时代描述。36/36 target cells、2,728 calls 全部成功。Gift-talk−money-talk mean score 为 `+2.3333`（95% `[+1.7292,+2.9306]`，单侧 exact `p=0.00001526`），通过福利门；Easy→Hard gift-rate 仅 `+0.03158`，未达 +0.25 MRES，且两臂 mark sales 均为 0，故正式 verdict 为 `WELFARE CONTRAST WITHOUT JOINT BEHAVIORAL SUBSTITUTION`。事后 trace audit 将主要路径定位到 H–H mutual check swaps（27/154→138/154）与 Hard solve rate（34.72%→41.84%），应表述为 instruction-induced role generalization，而非已识别 monetary crowding out。下一候选是独立冻结的 role-generalization disassembly；是否把它插在 belief-instrument repair 前，需作为新的顺序决策，不从本结果自动授权调用。

**2026-09-14 W-RG 前瞻性通道结果：** 用户授权后，role-generalization closure 以 12 个全新 seed、四个配对臂和 `eraBaselineMode=compare` 独立冻结。三条 gift 臂的可见 prompt 字节相同，只在模型响应后分别切断物质可行的 H–H 检查给出或 Easy→Hard 无条件 gift。48/48 cells、3,680 target calls 全部成功；pre/post bracket 健康且身份一致。Gift−neutral 福利为 `+1.6823`（95% `[+0.8542,+2.4635]`，单侧 exact `p=0.00341797`）；gift−H–H-blocked 为 `+3.2083`（`[+2.4688,+3.8906]`，12/12 正向，`p=0.00024414`）；E→H-blocked−H–H-blocked 为 `+2.7604`（`[+2.0938,+3.4115]`，12/12 正向，`p=0.00024414`）。H–H swap 从标准 gift 的 83/107 降至 blocked 的 0/107；标准 E→H gift 为 1/262、对应 blocked 为 0/262。全部完整性、操纵和福利 gate 通过，正式 verdict 为 `HH EXECUTION CHANNEL DOMINATES REPLICATED GIFT-TALK WELFARE EFFECT`。这识别的是同提示下执行通道的动态总效应，不是私有心理状态或自然中介比例。下一高价值候选转为语义泛化边界：主体量词、受益者角色与一般合作措辞的独立随机化；仍需新协议和新 seed，不能自动调用。

**W-RG 解释修订与下一研究预测：** 标准 gift 臂中共有 26 个物质可行的原始 E→H gift 意图，其中 25 个遇到 Hard 的无条件给出并结算为 swap；因此 E→H 在意图层面并不弱，而是在单向实现之前被 Hard 互惠吸收。通道对比仍是有效的执行制度总效应，但不是两个独立中介的贡献分解。另因 neutral 不含任何建议，gift−neutral 也混合了“存在公共指令”的效应，不能单独识别 gift 语义。下一项实验应把 H–H swap rate 与福利列为共同主要结果，并至少纳入 no-recommendation neutral、exact gift、`Easy only`、`any check-holder`、`only when partner is Hard`、exact money-talk，以及一个指向非福利改善交易的负向指令。预注册：若泛化的是 helping，money-talk 不应明显提高 H–H swap；若泛化的是“关于 check movement 的公共指令”，money-talk 也会提高；若只是公共消息显著性，负向指令也可能产生 spillover。非主要 gift-standard−E→H-blocked 的 `+0.4479`、单侧 exact `p=0.0625` 继续隔离为 descriptive、non-upgradeable，不作 clean null。

**2026-09-14 W-SGB 零调用冻结：** 七臂 execution-unmodified 语义边界实验已冻结，包含 exact neutral、exact gift、`Easy only`、`any check-holder`、`only when partner is Hard`、exact money-talk 与机械福利为 `−1.0`/次的 E–E reciprocal-transfer 指令。14 个 fresh seeds 采用循环序列及逆序，实现每臂每位置两次、任意两臂 7/7 先后平衡。H–H swap rate 与福利为共同主要结果，各有八个方向性 contrasts，并分别以 Holm 将 FWER 控制在 0.025；负向指令另有 E–E swap engagement gate。预计 98 cells、7,602 target calls，加 28 health calls 共 7,630。Freeze manifest SHA-256 为 `affb3e0a8d9939a4107630eeb1d39540d02401c77c6613443b5c085e6872b72b`；target 与 bracket calls at freeze 均为 0。

**2026-09-14 W-SGB 正式结果：** 98/98 cells、7,602 target calls 全部成功，第三个 pre/post bracket 健康且与 era baseline、模型、指纹、catalog 和 prompt hashes 一致。Exact gift−neutral 的 H–H swap-rate 与福利分别为 `+0.6070`（95% `[+0.5097,+0.7140]`）和 `+2.0625`（`[+1.4286,+2.8125]`），均 14/14 同向且 Holm-adjusted `p=0.0004883`。Exact money 不提高两项结果，所有七臂 mark sales 都为零。机械负福利 E–E 指令在 113/114 机会中形成被点名 swap，并使未点名 H–H swap rate 相对 neutral 提高 `+0.3777`（`[+0.2875,+0.4745]`），但福利只有 `+0.1875`（`[−0.3393,+0.7098]`）。`Easy only` 基本退回 neutral，any-holder 与 Hard-partner-only 保留强效应。正式 verdict 为 `GIFT REFERENCE REPLICATED — GENERIC DIRECTIVE SPILLOVER`，量词判定为 `SUBJECT EXCLUSIVITY BINDS`。结论是公共指令可形成跨角色制度表型，但泛化能力不保证福利质量。下一步优先整合 Paper 1；若再扩展，应以全新冻结的 token/长度匹配 lexical-pragmatic 微拆为可选项。

**2026-09-14 投稿与 money-repair 决策：** Paper 1 采用 AAMAS 2027 Main Track/GAAI first，并选择 Findings 考虑；TMLR 与 ARR 按拒稿理由分支，COLM 2027 不再作为等待中的默认首选。八页主稿采用命名交易支持 `S_D=(A_D,B_D,R_D,Q_D)` 与 opportunity-normalized executed relation 的 scope-expansion 定义；旧时代 E/I/P 表移往 supplement。当前 era 内唯一优先的可选新实验 `VBE-W-MER-ENGAGED-MONEY-REPAIR` 已完成零调用 v1.0 冻结：五臂、10 个 fresh paired seeds、3,930 target calls，并以 named-sale engagement 为语义解释的前置门；H–H family 还包含反向 MRES 阈值检验，避免把不显著误写成缺效。Freeze manifest SHA-256 为 `2baaa3c2f011a6a54a15563f482630f97c12c534590c893455e65e592998f62b`，canonical dry-run 为 `61a1bf6a…96aec`；冻结时 target 与 bracket calls 均为 0。

**2026-09-14 W-MER 执行终止：** Pre-flight 14/14 健康并匹配 era baseline；target 原子保留 26/50 cells、2,100 个完整逻辑 calls，其中五个 paired blocks 完成。下一预定 cell `13577|gift-bilateral` 连续两次发生无返回 transport stall；第一次后已前瞻记录 transport-only amendment，第二次触发停止条件。Post-flight 随后在 catalog 请求处 `ConnectionRefused`，未形成完整 bracket。正式 verdict 为 `INCOMPLETE`；部分数据、包括 money-bilateral 在五个完整 blocks 中仅 2/42 sales，全部只作审计，不能支持任何 priced-semantic 结论。W-MER v1.0 永久停止，不再恢复；Paper 1 不升级结果，继续提交现有 W-RG/W-SGB 主张。

### 实施摘要

| 模块 | 已完成证据 | 当前判定 |
|---|---|---|
| E：信息拓扑与来源 | k=1、k=2 各 12 个配对 seed；影子/E-R/E-D/E-RW；E-BIS、E-CI、E-TPCD；E-SVG 18 个九臂 blocks；E-SVG-CXT 72 个四臂 blocks；E-SVG-ONL 18 个在线三臂 blocks；E-BUY 24 个六臂 sealed blocks；E-BUY-CXT 30 个五臂 contexts；E-BUY-ENV-D 18 个六臂 contexts；E-BUY-WRAP-D 12 个六臂 contexts；共 29,668 次保留调用 | 显式报告不敏感、原始证书无预设幅度 ITT；typed object 覆盖短历史；短接口 validity gate 达到 161/162，轨迹上下文中 visible `FAIL` 72/72 污染；在线 seller 残余低于 MRES，buyer/trade/withdrawal 均为零；E-BUY 排除三个能力解释，E-BUY-CXT 定位 envelope package，E-BUY-ENV-D 把 weak-EV collapse 前移到 public wrapper bridge；E-BUY-WRAP-D 显示在 harmonized template 中单独改变 public framing 或一层 nesting 都未复现完整 collapse，且 package 可恢复行动，但三格饱和、来源动作全为不买，故经济鲁棒性仍待 EV ladder；无可信 B2 或信念中介证据 |
| I：制度创立 | 原 pilot 36 runs；I-R、I-T、I-TS 各 54 runs；I-M 800 次，I-C/I-S 各 400 次；I-TP 36 个决策/预测区组和 36 次 rollout；I-TPC 12 blocks、576 次；I-TPF 36 个 forecast/rollout blocks、2,800 次；I-TPU 24 cases、72 次；I-TPUR 12 cases、36 次；I-TPUD 24 cases、72 次；I-TPUE 36 个 fresh rollouts、2,884 次；共 26,828 次保留调用 | 确定收益 18/18；原始交易 royalty 11/18；pre-context 修复后 fresh-seed canonical trade 18/18、raw 8/18、canonical lottery 0/18；隐藏历史后预测、阈值决策和动作置信度均未校准；已知概率的 scalar complement 288/288，但普通 vector 未过安全门；proper-score 未过效应 floor，历史 prior scaffold 被原样复制；给定 compiled LR 后 posterior 24/24；RED 隐含补集 0/12、显式两行 11/12、observed-only 12/12；typed posterior 使 24/24 行动翻转；真实早期信号 fresh Brier 改善 +0.0894，typed 低后验翻转 11/11、LR=1 control 稳定 36/36 |
| P：制度载体与执行 | 四臂 pilot 各 12 seed；P0/P2 独立确认各 16 seed；P-ENF 18 个三臂 blocks、54 runs、4,122 次调用；P 线共 9,282 次调用 | 公共账本保存卖方语义；同模型 blind execution 使成交 +0.2956、mean score +1.4132，冻结 verdict 含福利支持；blind 不作部署建议 |
| W：福利与规范泛化 | W-CO、W-RG 与 W-SGB 均完成且有健康 pre/post bracket；W-SGB 为 14×7 paired design、7,602 target calls | Gift reference 在 H–H 与福利上复制；H–H 执行通道承载福利；负向 E–E 指令也诱发 H–H spillover 但不改善福利；显式主体排他约束泛化。正式结论为 generic directive spillover，而非 helping-only |

当前综合论文命题不再是“LLM 是否相信钱”，而是：**公共文本能使规则跨控制器保持可读，却不会自动产生内生作者、高阶信念证据、双边激励相容或福利改进。** 论文初稿见 `VBE-paper-draft.md`。

---

## 0. 一句话研究命题

LLM 群体并不一定缺少执行一种制度的能力；它们缺少的可能是使制度成立的三个联合条件：**共同可知性（E, epistemic commonality）、创立收益可内部化（I, incentive capture）、规则具有公共持久载体（P, persistence substrate）**。

本阶段不再问宽泛的“LLM 会不会相信钱”，而问：

> 当制度内容、物质收益和基础策略保持不变时，信息拓扑、创始人收益和制度载体分别在何种条件下，使 nonce 货币从私人策略变成可维持的公共均衡？

---

## 1. 研究契约

| 字段 | 本阶段约定 |
|---|---|
| 真实主体 | 需要部署多个自治 LLM、又不能假定它们天然共享协议的系统设计者 |
| 工作负载 | 4–8 个独立决策智能体，重复匿名交换，局部历史，有限通信，存在无内在用途的可转移 token |
| 现有默认假设 | 相同信息被每个智能体看到，就近似等于共同知识；没人付费发言，说明不愿创立；制度要持久就必须写进权重 |
| 冲突 | 当前数据中公开句子有效、私信与示范弱、付费创立为零、上下文清除后无持久性；这些结果也分别符合信息层级不足、公共品欠供给和载体缺失 |
| 目标函数 | 因果识别制度采用、创立和存续的最小条件；其次才是提高总分 |
| 硬约束 | 推理 API；当前只有单一模型家族；有效统计单位是环境种子和 prompt 模板；禁止把会面次数当独立样本 |
| 非目标 | 不判断模型是否“真的相信”；不把 LLM 当人类被试；不把强制执行称作共同信念；本阶段不做权重训练 |
| 成功证据 | 控制内容与收益后，E/I/P 的干预分别移动预注册的高阶预期、创立行为和跨人口存续 |
| 推翻证据 | 公共与私有信息等价；创始人确定获利仍不创立；无强制公共记录不能延长制度寿命 |

### 1.1 目标 estimand

研究对象是一个**固定模型策略在环境随机性上的因果响应**，不是“所有 LLM 的普遍心理”。

主 estimand 均按 seed 聚合：

- 信息效应：同一环境轨迹下，公共信息与私有信息的非承诺者接受率差。
- 创始人效应：同一广播成本下，创始人私人收益权对创立概率和创立时间的影响。
- 载体效应：安装方式相同后，公共账本对制度半衰期和全员替换后存续率的影响。

跨模型泛化是后续独立主张，不能由更多 grok-4.5 会面替代。

---

## 2. 因果图与首要瓶颈

```text
nonce 先验地板
      ↓
关于他人接受策略的事实
      ↓  [E: 谁知道？谁知道别人知道？]
一阶与二阶接受预期
      ↓
是否接受 / 报价 / 成交
      ↓  [I: 谁承担创立成本、谁获得制度收益？]
是否有人发布并维护制度
      ↓  [P: 规则保存在何处？是否可验证？]
冲击恢复、陌生人加入、创始群体退出
```

第一条边的测量依赖性已经被定位并两次独立确认：完整 inline package 的 public 买方 interaction 为 +0.416，进一步隔离低赌注奖励文字后为 +0.215；但显式 `pAccept/pSecond` 仍近乎恒为 0.5。后置审计发现约 6.437 份报告被压缩为每 agent-run 两次结算、总上限仅 0.5 分，且全体 0.5 是 `pSecond` 的内生固定点，故 belief null 不能再解释成能力缺口。修复后的 E-BIS 随后以逐报告计分、truthful robot anchors 和平均 3.375 分满额赌注运行 8 个新 seeds：204/216 条记录仍为 `(0.5,0.5)`，216/216 两字段相等，三项冻结 sensitivity gates 全部失败。这支持显式社会概率报告通道在完整任务中不敏感，但仍不等于潜在 belief 缺失。I 线确认确定即时正收益把创立从 0/18 升至 18/18；原始交易挂钩 royalty 为 11/18。I-M 显示分布算术故障；I-C 发现正确摘要能修复决策，但错误摘要即使标记 `FAIL` 仍造成残余污染；I-S 确认调用前删除失败数值能使受控决策恢复，I-TS 又把同一架构接回 fresh-seed 完整环境，使 canonical trade 达到 18/18、同批 raw 为 8/18、canonical lottery 为 0/18。I-TP 随后隐藏历史分布并解耦预测、动作与置信度，三项冻结模块全部失败；I-TPC 进一步显示补集运算的 scalar 能力为 288/288，但普通三字段 vector 只有 255/288，显式分支才恢复到 283/288。I-TPF 接着区分 scoring instruction 与信息 scaffold：proper-score 只有 +0.0211 Brier 改善，历史 prior 虽显著降分却被 36/36 原样复制，且 aggregate TV 0.1019 未过 0.10 guard。I-TPU 用机械 Bayes 真值证明给定 observed-signal LR 后可 24/24 精确更新；I-TPUR 同轮消融又得到 implicit RED 0/12、显式两行 11/12、observed-only 12/12。I-TPUD 进一步确认 typed posterior 在 24/24 cases 中使阈值行动翻转，matched noninformative object 则 24/24 保持 prior policy。I-TPUE 随后在真实 VBE rollout 上前瞻验证 early-trade/inventory-concentration 复合代理：Brier 改善 +0.0894、fresh 条件率差 +0.6364，typed 低后验翻转 11/11，control 稳定 36/36。C-M 再直接干预可操纵的库存分布，得到固定供给下 `[2,1,1,0]−[1,1,1,1]` 的未来交易效应 −0.6449。已识别的可部署边界是确定性编译、独立验证、pre-context quarantine、typed signal/posterior/action materialization、版本化外部 prior、漂移监测和执行不变量检查。E-CI 随后在真实四机器人世界随机化 0/2/4 份公开证书，4−0 卖方 ITT 仅 +0.0158（95% [−0.0749,+0.1110]，单侧 exact p=0.3794），判为 `NO MATERIAL ACTION ITT`。E-TPCD 用 24 个四臂 blocks 表明 `PASS` 编译对象在该接口中完全覆盖 K=4 拒绝历史。P-ENF 在同一模型与可见账本下得到 blind−ledger 成交 +0.2956、mean score +1.4132。E-SVG 的短接口 validity gate 达到 161/162，但 E-SVG-CXT 的 visible `FAIL` 在 72 个轨迹上下文中 72/72 污染。E-SVG-ONL 随后完成 18 个全 LLM 三臂在线 blocks：visible-invalid−quarantine seller intent 为 +0.0522（单侧 exact `p=0.003906`），未达 +0.15 MRES；PASS−FAIL 为 +0.1554，buyer、trade 与 withdrawal effect 均为零。E-BUY 随后用 24 个六臂 sealed blocks 得到 low-uncertain 23/24、high-guaranteed 24/24 与 negative-guaranteed 2/24，主能力差 +0.9167（单侧 exact `p=2.38×10⁻⁷`）；certainty、margin 与 action materialization 的单轴 rescue 均未通过。E-BUY-CXT 进一步得到 standard-sealed 28/30、real-state 16/30、real-memory 25/30、online-envelope/online-replay 均 0/30，并定位公共总体 envelope package。E-BUY-ENV-D 再用 18 个未复用 contexts 得到 narrow anchor 16/18、public hard-only current/full 0/18，其余四个 envelope 格也全为 0/18；首个 collapse 因而前移到 public wrapper/hard-only representation bridge，但尚未拆出 wording、schema、状态重复或行动语义强调。E-BUY-WRAP-D 最后用 12 个全新 contexts 得到 exact narrow 12/12、exact public-hard 0/12，而 harmonized 四格为 12/12、12/12、12/12、10/12；framing 与 representation 主效应都只有 +0.0833，public-nested 相对 exact public-hard 修复 +0.8333（`p=0.0009766`）。因此 framing-only 与一层 nesting-only 不是主要 suppressor，剩余定位停在 exact public interface contract package，下一步直接进入 fresh-seed online repair closure。因此 soft metadata 是接口依赖的行为门，而非零泄漏 safety boundary；pre-context quarantine 仍是更强系统边界，下一步只推进 fresh-seed online minimal-repair closure、独立窗口/跨模型复制或开放权重训练。

**后续解释覆盖（2026-09-13）：** 上段末尾关于“排除主要 suppressor”以及“直接进入 online repair closure”的表述，是 E-BUY-WRAP-D 刚完成时的历史解释，现由本文开头的 EV 设计更新与第 5 节继续条件取代。冻结事实仍是 12/12、12/12、12/12、10/12 与 exact public-hard 0/12；由于所有 factorial contrasts 都由同两个 public-nested failures 驱动，现阶段只能说单独改变 framing 或一层 nesting 没有复现完整 collapse。下一步先做可分离 margin/certainty steps 的 fresh-context EV ladder，再按 strong persistence、partial recovery 或 threshold shift 分流。

---

## 3. 操作化修订

### 3.1 不再用固定接受率 0.4 单独定义 L2

旧门槛保留为历史可比指标，但不再作为主要判据。对每个状态计算持有 mark 的近似价值：

\[
V_t(m\mid b,s) \approx
\Pr(\text{在剩余期限内以 }b\text{ 的接受率花出 mark}\mid s)
\cdot R(p_P-p_H)
\]

其中 `b` 是对未来交易对手接受率的预期，`s` 包含剩余期限、持币量、角色、可匹配人数和匹配过程。Easy 卖方只有在 `V_t` 高于放弃剩余校验的机会成本时，接受 mark 才是结构上合理的货币行为。

实施要求：

1. 先写与引擎角色/配对过程一致的一枚 mark 边际求解器，输出 break-even `b*`；正式均衡主张前再扩展到完整库存状态。
2. 使用智能体自己报告的 `b1` 检查其行动是否跨越 `b*`。
3. 同时报告旧的内部接受率，避免事后改口径。

### 3.2 “共同信念”拆成可测层级

- `b1_i`：智能体 i 预测其他非承诺智能体实际接受 mark 的比例。
- `b2_i`：智能体 i 预测其他智能体所报告的平均 `b1`。
- `CK condition`：环境提供可验证公共发布，且明确所有参与者看到同一记录、知道所有参与者看到同一记录。
- `common p-belief proxy`：一个 seed 中，达到阈值 p 的 `b1` 与 `b2` 报告比例及其连通性；不声称穷尽无限阶共同知识。

信念报告在行动前生成、行动结束前不向其他智能体公开。使用小额 Brier 奖励，并设置无信念引出对照，检查测量本身是否改变交易。

### 3.3 “制度创立”改为结构化提案

广播同时包含结构化字段和自由文本：

```json
{
  "speak": true,
  "proposal": {
    "kind": "money | gift | barter | none",
    "token": "QX-17",
    "units_per_check": 1,
    "transaction_fee": 0,
    "beneficiary": "none | founder | treasury"
  },
  "rationale": "free text"
}
```

主要编码以结构化字段为准；自由文本只分析叙事内容。这样消除一句话同时含 GIFT 与 MONEY 时的冻结分类器歧义。

### 3.4 分开卖方意图、买方意图与成交

引擎审计发现，旧字段 `heAccepts` 只有在 Easy 同时提交 `giveCheck=true, requireChit=true`，且 Hard 同时提交 `giveChits=1` 后才加一。它测到的是**联合成交**，不是卖方单方面“接受 mark”。后续主结果必须分成：

- seller intent：Easy 愿意以一枚 mark 出售校验；
- buyer intent：Hard 愿意支付一枚 mark；
- realized trade：双方意图同时成立并完成转移。

历史结果不重写，但论文中将“接受率”统一更名为“可行 H–E 会面中的成交率”。Study E 的新实现已在 `epistemic.ts` 中分开三项，并以 LLM seller、LLM buyer、LLM–LLM 三个切片报告。

Study E 的主要因果比率使用全部外生 H–E 会面作分母；“Hard 当时持 mark 且 Easy 持 check”的条件比率仅作诊断。否则处理改变 mark 流转后，也会改变谁进入可行机会分母，产生处理后选择。

---

## 4. Study E：共同知识阶梯

### 4.1 核心问题

在每个智能体拥有相同一阶事实时，仅改变“别人是否也知道、以及大家是否知道这一点”，能否改变高阶预期和 nonce 货币采用？

### 4.2 先做构念单元测试

在接入 VBE 前，用两智能体电子邮件式协调博弈检查模型是否能区分：

- 没有确认；
- 一次送达确认；
- 两次确认；
- 多次但有限确认；
- 可验证公共公告。

若模型连简单博弈中的信息层级都不响应，不进入昂贵 VBE 实验；结论转为“该模型/提示接口没有表现出可用的高阶信息敏感性”。

### 4.3 VBE 处理组

先通过动态规划选择承诺接受者数量 `k`，使非承诺者在知道 `k` 人会接受时具有明确正的 mark 期望价值。禁止先固定 k=2 再解释零结果。

所有处理组包含完全相同的客观事实：指定的 k 个机器人会按冻结 KW 策略接受 mark。只改变信息拓扑。

| 组 | 智能体获得的信息 | 知识层级 |
|---|---|---|
| E0 私有事实 | “以下 k 人保证接受”；不说明别人收到什么 | 一阶 |
| E1 共同收到 | 额外说明所有人都收到同一事实 | 二阶起点 |
| E2 回执 | 所有人看到一轮公开回执 | 更高有限阶 |
| E3 多轮回执 | 所有人看到三轮确认链 | 更高有限阶 |
| E∞ 公共记录 | 公共板保证同一内容、同一收件范围和持久可见性 | 操作化共同知识 |
| EX 政策泄漏阳性对照 | 直接写明“应当用 mark 换校验” | 复现旧公告效应，不进入主比较 |

提示编译器必须保证 E0–E∞ 的 token 内容、指定接受者、收益说明和视觉位置尽量一致，唯一实质差异是收件/确认元数据。

### 4.4 主要结果

- `A_s`：每个 seed 的非承诺 LLM 卖方内部接受率。
- `B1_s`：每个 seed 的平均一阶预期。
- `B2_s`：每个 seed 的平均二阶预期。
- `C_s`：完成的 mark 交易数除以所有满足交易条件的 H–E 会面数。
- `W_s`：平均得分；只作次要结果。

主要对比：`E∞ − E0`。阶梯形状 `E0...E∞` 是次要但理论上关键的结果。

### 4.5 成功、失败与解释

**支持共同知识瓶颈：** E∞ 在配对 seed 上同时提高 B2 和 A，且差异超过预注册的最小相关效应；E0 中即使 B1 较高，A 仍明显较低。

**支持有限层级/认知深度模型：** A 与 B2 随确认层数平滑增加，没有 E∞ 跳变。

**推翻该机制：** E∞ 与 E0 在 A、B1、B2 上均达到等效；或者只移动行动、不移动任何预期。后者应解释为公共指令线索，而不是共同信念。

**服从控制：** 在同一信息拓扑下附加严格劣的无关税。若税仍被拒绝而 mark 采用上升，排除全包服从；若整包一起执行，不发布共同知识结论。

---

## 5. Study I：制度创业者与收益内部化

### 5.1 核心问题

旧的付费广播要求一个智能体支付私人成本、创造公共收益。Study I 检验零创立究竟来自制度能力缺失，还是公共品欠供给。

### 5.2 设计

先用机器人与动态规划确保某一货币提案在预期交易量下具有正的群体剩余。随后操纵：

- 广播成本 `ε ∈ {0, 0.5, 1.0}`；
- 创始人收益权 `α ∈ {0, refund, fee, seigniorage}`。

四类 α：

| α | 定义 |
|---|---|
| 0 | 无私人收益；旧设计 |
| refund | 达到预注册交易量后退回广播费 |
| fee | 每笔 mark 交易向创始人支付固定小额手续费 |
| seigniorage | 新发行 mark 的预注册份额初始归创始人 |

第一轮只跑 `ε=1 × {0, refund}` 的最便宜反证。如果确定覆盖成本仍无人创立，再扩展完整矩阵。

### 5.3 对照

- 财富对照：随机给候选人同等预期财富，但不给制度控制权。
- 权力对照：给提案权，但制度收益进入公共金库。
- 外生提案阳性对照：实验者发布候选人本可发布的同一结构化政策。
- 中性频道对照：可付费讲话，但不能写制度字段。

### 5.4 主要结果

- seed 级是否出现合格制度提案；
- 首次提案回合；
- 提案类型 MONEY/GIFT/BARTER；
- 提案后的接受率和交易量变化；
- 创始人净收益、其他代理净收益、总福利；
- 提案承诺与后续自身执行是否一致。

### 5.5 判据

**制度创业支持：** 当创始人私人期望收益安全高于 ε 时，创立概率上升，且财富对照不能解释该差异。

**公共品解释支持：** 创立随私人收益权单调变化，阈值与事前价值计算方向一致。

**能力/界面瓶颈支持：** 外生同一提案能被执行，但在 refund/fee 下仍无人提出。

**停止条件：** 若私人收益在保守估计下仍未超过成本，不得将零创立解释为能力缺失。

---

## 6. Study P：制度载体与“忒修斯之船”

### 6.1 核心问题

制度是否能在创始群体全部离场后继续存在？若能，存续依赖私人记忆、公共记录、强制执行还是参数化策略？

### 6.2 载体条件

本阶段先跑前三个非训练条件：

| 载体 | 规则位置 | 新加入者可见性 |
|---|---|---|
| P0 临时 prompt | 创立时的一次消息 | 不可见 |
| P1 私人长期记忆 | 各代理自己的摘要 | 只见自身 |
| P2 公共只读账本 | 带时间戳、作者和收件范围的记录 | 可见、无强制力 |
| P3 可执行合约 | 公共记录 + 自动转移/处罚 | 可见、有强制力 |
| P4 独立权重巩固 | 每个代理单独训练 | 后续研究 |

P2 与 P3 必须分开。只有 P3 存活时，结论是执行机制有效，不是共同信念持久。

### 6.3 人口替换协议

1. 用同一公共提案安装货币，达到预注册采用门槛后开始计时。
2. 每隔固定轮数随机替换一名原始代理。
3. 新代理只获得该条件允许的载体，不继承被替换者私有历史。
4. 直到全部原始代理被替换。
5. 继续运行一个预注册观察窗口。

另设两个冲击：

- 没收并重新发放 mark；
- 引入一个功能等价、名称随机的新 token。

### 6.4 主要结果

- 制度半衰期：接受率首次跌破状态相关理性门槛的时间；
- 全员替换后存续率；
- 新加入者首次接受所需接触次数；
- 原 token 对新 token 的锁定程度；
- 冲击后的恢复时间；
- 规则文本是否在传播中发生语义漂移。

### 6.5 判据

- P2 > P0/P1：公共持久记录足以构成制度载体。
- P3 > P2 且 P2≈P0：存续主要来自强制执行。
- P1 > P0 但全员替换后归零：惯例依附于个体，不是群体制度。
- 所有非训练条件归零：再考虑 P4 权重巩固。

---

## 7. VBE 2.0：价格形成环境

Study E 可先沿用当前 VBE；Study I/P 的强版本应迁移到 VBE 2.0。

### 7.1 必需修改

- 固定终局改为几何随机终止；每轮结束后以公开概率 δ 继续。
- 匿名或低重复匹配，默认 K=0。
- 三类循环专长：A 能高效校验 B，B 校验 C，C 校验 A，削弱直接互惠。
- mark 可持久、可转移；校验能力每轮过期。
- 买卖双方自行给出整数 bid/ask，实验者不宣布汇率。
- 交易协议只执行双方同意的价格，不推荐价格。

### 7.2 机器人相图先行

在调用 LLM 前扫描：

- `R, v, q, δ, M`；
- 匿名程度和角色比例；
- gifting、barter、reciprocity、KW、strategic founder、Never。

冻结三个区域：

1. 钱不必要；
2. 钱提高福利但不是唯一均衡；
3. 钱在个体激励相容策略中明显占优。

LLM 只在冻结后的三个代表点运行。禁止根据 LLM 结果回调参数。

### 7.3 货币而非“接受协议”的证据

- 价格在无预设汇率时收敛；
- 货币量冲击改变 mark 计价而非只改变成交与否；
- 交易量和任务完成率对供给变化具有方向一致反应；
- 等价货币竞争时出现可重复测量的先发优势、锁定或切换；
- 假币/超发导致折价，而不是机械继续按旧汇率成交。

---

## 8. 统计计划

### 8.1 单位与随机化

- 推断单位：seed；prompt 等义模板作为区组。
- 所有主比较使用 common random numbers：相同 seed 共享角色、匹配、难度和外生随机过程。
- 单个 seed 内的会面只构成结果，不构成独立样本。
- 先跑不少于 12 个配对 seed 的方差 pilot；根据 seed-level 差值方差和预注册最小相关效应计算正式样本。
- pilot 与确认性数据分开；若合并，必须预先采用允许合并的序贯设计。

### 8.2 推断

- 主报告：每个 seed 的点、配对差、均值/中位数和区间。
- 小样本优先配对随机化检验或置换检验；同时给 bootstrap 区间。
- 二元“是否创立”报告 beta-binomial 或精确区间，但不把回合数当 n。
- 所有探索性会面级模型明确标注为描述性。
- 除显著性外，预注册等效界限，用于宣告“没有达到实质相关差异”。

### 8.3 建议最小相关效应

在 pilot 前暂定：

- seed 级接受率差：0.15；
- B1/B2 平均差：0.15；
- 创立概率差：0.25；
- 全员替换后存续率差：0.25。

pilot 只可用于修订可承载性与正式样本量，不能按观察结果改变效应方向或主要结果。

---

## 9. 实现接口与工程约束

### 9.1 必备模块

```text
schedule_generator     生成可跨处理组复用的外生轨迹
prompt_compiler        从同一事实对象编译不同信息拓扑
public_ledger          记录作者、内容、收件范围、确认链和持久性
belief_elicitor        支持行动前引出与行动结束后 sealed replay
proposal_parser        读取结构化制度字段
state_value_solver     计算状态相关 b* 和策略基线
turnover_manager       替换代理且严格控制继承信息
quota_circuit_breaker  任一 API 错误即判整 seed 无效并停止，不用 idle 填充
seed_aggregator        输出 seed-level 结果和配对差
```

### 9.2 数据事件

每个决策至少记录：

- run/seed/treatment/prompt-template/model/version；
- round/agent/partner/role/holdings/private-memory；
- public-ledger hash 与可见条目；
- 当前知识层级元数据；
- b1/b2 及预测奖励；
- bid/ask/accept/gift/proposal；
- 即时分数增量、交易结果和错误码；
- 原始响应与解析状态。

### 9.3 回归测试

- `K=0` 必须断言历史长度严格为 0，防止 `slice(-0)` 回归。
- 任一 4xx/5xx、空响应或 schema failure 使整个 seed 标记 invalid；不得补 idle。
- E0–E∞ 的事实内容做规范化 diff，确保除信息拓扑字段外一致。
- proposal 结构化字段与自由文本冲突时保留二者，主要编码不被人工改写。
- 每种处理先用机器人做 golden trace。

---

## 10. 主张—证据矩阵

| 候选主张 | 最低必要证据 | 不足以支持它的结果 |
|---|---|---|
| 公共可知性促成货币采用 | E∞ 相对 E0 移动 B2 与行动，内容/收益/轨迹匹配 | 单独复现公开政策公告 |
| LLM 能创立制度 | 私人净收益为正时自主付费提案，随后被采用 | 免费频道中每轮发言 |
| 创立零结果来自公共品欠供给 | 创立随 α 上升且财富对照不解释 | 只把 ε 从 1 改成 0 |
| 公共账本是制度载体 | 无强制 P2 在全员替换后仍存续 | P3 自动合约继续执行 |
| 权重巩固是必要条件 | 所有非训练载体失败，独立 P4 成功且能传给未训练者 | 去掉故事后训练代理仍执行 |
| 出现了货币体系 | 内生价格、供给冲击响应和跨期交换同时成立 | 二元接受率超过 0.4 |

---

## 11. 执行顺序与闸门

### Gate 0：理论与机器人校准

1. 实现状态价值求解器。
2. 求出 Study E 的 k 阈值。
3. 生成旧 VBE 与 VBE 2.0 的机器人相图。

**0.1 引擎感知边际检查已完成。** `vbe-engine/src/lib/vbe/value.ts` 和独立复核脚本 `vbe_gate0_value.py` 使用实际角色与配对概率：每轮机会为 `q × P(self=Hard) × P(partner=Easy | self=Hard) × acceptance_share`。一枚 mark 至多使用一次，不含再出售、重复获取和战略反应。冻结参数下，成功花出带来的增量收益为 `3 × (0.93 − 0.32) = 1.83`，获取成本为 0.5。

| 剩余轮数 | break-even 接受份额 | 最小承诺者 k/7 | k=2 时 mark 价值 |
|---:|---:|---:|---:|
| 2 | 不可行 | 不可行 | 0.118 |
| 4 | 0.671 | 5 | 0.228 |
| 6 | 0.453 | 4 | 0.331 |
| 12 | 0.230 | 2 | 0.601 |
| 24 | 0.116 | 1 | 1.005 |

原先忽略 `P(partner=Easy | self=Hard)=4/7` 的 0.927 估计撤回。几何期限 `δ=0.95` 下，break-even 份额约为 0.161，k=2 时价值约 0.738。k=2 在剩余 12 轮时只略高于成本，后半程很快跌破门槛。旧的 0/16 因而同时混合了信息不确定性、实际机会与期限效应。

Study E 使用 k=1，并将第 5–21 轮预注册为协调窗口：这段时间内仅依赖唯一承诺者不值得购买 mark，但若其他代理普遍采用则值得。该窗口由 `src/lib/vbe/value.ts` 自动计算。当前求解器对引擎的角色与配对概率是精确的，但仍是一枚 mark 的边际模型，不含再出售、重复获取、持币拥堵与战略反应；完整状态机价值仍是后续理论工作。

**不过闸条件：** 找不到 mark 对非承诺者明确有正私人价值的处理区。此时先改环境，禁止跑 LLM。

### Gate 1：共同知识最小反证

1. 电子邮件博弈单元测试。
2. VBE E0 vs E∞，12 个配对 pilot seed。
3. 检查信念引出是否反应性过强。

**实现状态（2026-09-03）：** E0/E∞ runner、冻结事实、送达元数据、k=1 协调窗口、严格 JSON 校验、API 失败熔断、二次信念引出与每代理最高 0.5 分的期末二次评分已经实现。电子邮件博弈构念单元测试已通过；`deepseek-v4-flash` 的 k=1 与 k=2 各 12 对 seed API pilot 均已完成。k=1 没有正向交易级共同知识效应，public 条件降低卖方意图；k=2 时 public−private 买方意图增加 0.274，但成交只增加 0.023。k=2 相对 k=1 的 public 效应 DiD 为卖方 +0.185、买方 +0.259、成交 +0.024。2,842 次 B1/B2 报告全部为 0.5。后置校准中，占优买方动作在 mechanics-only 与 explicit-payoff 条件均为 8/8，信念量表在机械固定的 0/6 与 6/6 世界也完全分离。这只能支持“旧引出下的 installed-base 调节行动效应”，不能升级成共同知识机制主张。详见 `VBE-study-E-deepseek-pilot.md`。

**影子引出实施记录（2026-09-03）：** 为检验行动内信念填报的反应性，新 runner 从行动 prompt 中删除所有信念字段，在第 5/10/15/20 轮以不可见、不写记忆、不改状态的旁路探针记录自己出售、同伴出售数和同伴的多数预期。v1 已知真值闸门因一/二阶字段交换只得 10/20，当即停止；v2 语义字段达到 20/20 后才在 8 个新配对 seed 上放行。16 个 runs 共 1,320 次调用，0 API/parse failure，8/8 日程指纹配对一致。public−private 的买方意图为 −0.120（bootstrap 95% [−0.206, −0.042]），成交 −0.089，二阶预期 +0.004。原 k=2 正向买方效应未复现，但新量表在 384 次战略报告中也几乎恒为 3/5，构念效度仍然不足。详见 `VBE-study-E-shadow-pilot.md`。

**引出反应性实施记录（2026-09-03）：** 在 8 个进一步的新 seed 上按首次调用前冻结的独立协议完成 private/public × inline/sealed-replay 四臂实验。32 个 runs 共 1,748 次实时行动调用和 874 次事后回放，0 API/parse failure；sealed 实时响应没有信念字段，所有回放均在环境结束后执行，8/8 四臂结构 hash 一致。买方 public−private 在 inline 为 +0.320，在 sealed 为 −0.112；唯一主 interaction 为 +0.432（bootstrap 95% [+0.324, +0.554]，8/8 seed 为正），按冻结分支判为 `ELICITATION-REACTIVITY CANDIDATE`。四臂 B1/B2 仍全部为 0.5。它识别完整引出 package 的行动反应性，尚未拆分信念语义、奖励和 schema 长度。详见 `VBE-elicitation-reactivity-protocol.md` 与 `VBE-study-E-reactivity-pilot.md`。

**引出反应性独立确认（2026-09-03）：** 在任何确认调用前冻结 `VBE-elicitation-reactivity-confirmatory-protocol.md`、16 个不重叠新 seed、唯一买方 interaction、0.15 MRES 与两个方向护栏；pilot 数据不进入确认估计。64 个 runs 共 3,652 次行动调用和 1,826 次 sealed replay，0 API/schema/parse failure；16/16 block 四臂结构 hash 一致，sealed 行动无信念字段，所有回放都发生在环境结束后。Inline public−private 买方效应 +0.299，sealed −0.117；主 interaction +0.416（bootstrap 95% [+0.319, +0.509]，15/16 为正、1/16 为零；centered one-sided exact `p=0.000183`），两项护栏通过，冻结 verdict 为 `SUPPORTED`。确认信念记录 3,650/3,652 仍为 0.5。结论升级为“完整 inline elicitation package 可复现地改变行动”，但仍不能归因于信念语义或视为信念中介。详见 `VBE-elicitation-reactivity-confirmatory-report.md`。

**引出 package 组件 pilot（2026-09-03）：** 在首次调用前冻结 `VBE-elicitation-disassembly-protocol.md`，用 8 个进一步的新 seed 交叉 private/public 与 action-only、schema-control、belief-unrewarded、belief-rewarded 四种嵌套实时界面。64 个 runs 共 3,400 次调用，0 API/schema/parse failure；8/8 八臂 schedule hash 一致。Rewarded−action-only 总买方 interaction +0.353（bootstrap 95% [+0.230, +0.460]，8/8 为正），通过 bridge。顺序组件增量为 schema +0.042、信念语义 +0.149、奖励文字 +0.162；按 0.15 与 6/8 非负规则返回 `REWARD-TEXT CANDIDATE`。但语义增量只低于门槛 0.0011，且方向更一致，所以奖励尚不是已确认或唯一机制。2,550 条额外数值字段全部为 0.5。详见 `VBE-elicitation-disassembly-pilot-report.md`。

**奖励 transition 独立确认与审计（2026-09-04）：** 在任何 E-RW 调用前冻结 `VBE-reward-transition-confirmatory-protocol.md`、28 个不重叠新 seed、唯一买方 interaction、+0.10 点估计门槛、零中心单侧 exact `p≤0.025` 与两项方向护栏；E-D pilot 不进入估计。112 个 runs 共 6,324 次调用，0 API/schema/parse failure，28/28 四臂 schedule hash 一致。Rewarded/unrewarded 的 public−private 买方效应分别为 +0.298/+0.084，主 interaction +0.215（bootstrap 95% [+0.135,+0.295]，20 正、2 负、6 平；单侧 exact `p=0.00001287`），全部冻结规则通过，verdict 为 `SUPPORTED`。后置审计从四个 rewarded cohorts 的 4,667 个原始报告重算，确认每 agent-run 只结算两个均值字段、上限 0.5 分；实际 forgone bonus 只占经济分的 0.1107%，`pSecond` 又有内生 midpoint 固定点。结论改为“低物质赌注的奖励文字可复现地放大 public 行动反应”；belief null、信念中介、奖励优化与唯一机制均未识别。详见 `VBE-reward-transition-confirmatory-report.md` 与 `VBE-belief-reward-audit.md`。

**修复后 belief instrument 灵敏度闸门（2026-09-04）：** 在目标调用前冻结 `VBE-belief-instrument-sensitivity-protocol.md`，仅运行一个 public `k=4` 条件和 8 个全新 seeds。每份报告分别以两个 0.25 分 proper-score 字段结算；四名机器人提交与 leave-one-out 真值完全一致的 `pAccept` anchor；LLM `pSecond` target 纳入这些 truthful anchors；每名 LLM-run 的满额奖励平均 3.375 分。8/8 seeds 的 target displacement 均超过 0.10，299 次 API 调用无 failure，证明修复实际生效。然而 204/216 记录仍为 `(0.5,0.5)`，216/216 把两个目标不同的字段报成相等；non-midpoint share 0.0556、相对 midpoint 的 mean loss improvement +0.0179、正向 seeds 6/8，三项冻结门全部失败，verdict 为 `MIDPOINT PERSISTS UNDER REPAIRED INSTRUMENT`。旧计分退化不是 midpoint 持续的充分解释；支持的是显式两字段社会预测通道 sensitivity failure，而不是潜在信念不存在。详见 `VBE-belief-instrument-sensitivity-report.md`。

**可信社会信息随机化 ITT（2026-09-04）：** 在目标调用前冻结 `VBE-credible-information-itt-protocol.md`，真实环境始终保留 agents #0–#3 的四名 KW robots，仅随机化公开审计中 0/2/4 个等长 `VERIFIED/WITHHELD` slots。18 个新 seeds 每个运行三臂，六种顺序各重复三次；notice 无推荐、belief 字段或报告奖励。54 runs 共 2,091 次调用无 failure，18/18 schedule 与 call-count blocks 匹配。卖方 intent 为 0.8065/0.8502/0.8223；4−0 主 ITT +0.0158，bootstrap `[−0.0749,+0.1110]`，单侧 exact `p=0.3794`，未达 +0.10 门。Verdict 为 `NO MATERIAL ACTION ITT`。该结果只否定预设幅度的 information-package action ITT，不识别 belief mediation；它触发含 contradicted arm 的 typed consumption 诊断。详见 `VBE-credible-information-itt-report.md`。

**Typed peer probability 冲突诊断（2026-09-04）：** E-CI 的冻结 null 触发 E-TPCD。24 个 sealed blocks 使用全部四臂排列；history-only 与 typed-consistent 均 0/24 卖出，typed-high-control 与 typed-contradicted 均 24/24。冲突臂与 high control 一致 24/24、与四次 K=4 拒绝历史一致 0/24；96 次调用无 failure，verdict 为 `TYPED OBJECT OVERRIDES RECENT HISTORY`。该结果只识别封存接口的行动级来源优先级，不指定冲突中哪一来源为真。详见 `VBE-peer-probability-conflict-report.md`。

**Typed source-validity gating（2026-09-05）：** E-SVG 在 18 个 sealed blocks 中运行 history-only 加 validator `PASS/FAIL` × temporal `CURRENT/EXPIRED` × population `MATCH/MISMATCH` 九臂 factorial；高 q/正净值与四次拒绝历史在 block 内固定，162 次调用全部成功。Fully valid 18/18 卖出；validation fail 1/18；expired、mismatch 与所有多重失效均 0/18。三个 single-veto effects 为 +0.9444/+1.000/+1.000，单侧 exact `p≤0.00000763`；invalid pooled sell 1/126，合同准确率 161/162。全部冻结门通过，verdict 为 `SOURCE VALIDITY GATE SUPPORTED`。唯一错误在最高 q=0.95 的 validator-fail arm，只是后验压力线索；soft gate 仍不能替代 pre-context quarantine 或机械 validation。详见 `VBE-source-validity-gating-report.md`。

**Source-validity 轨迹上下文迁移（2026-09-05）：** E-SVG-CXT 在任何目标调用前冻结，并复用 E-CI disclose-0 的 18 个完整环境轨迹。每个 seed 从四个六轮阶段各确定性抽取一个 LLM 决策前状态，72 个 blocks 使用全部 24 种四臂顺序各三次，共 288 次成功调用。Valid-visible 与 invalid-visible 均 72/72 卖出；history-only 与 invalid-quarantined 均 0/72。`invalid-visible−quarantined=+1.000`，72 个正 discordances，单侧 exact `p=2.12×10⁻²²`；四阶段完全同型。冻结 verdict 为 `VISIBLE FAILED SOURCE CONTAMINATES`。这推翻 soft `FAIL` metadata 可迁移为 runtime safety boundary 的解释，并把 pre-context quarantine 提升为下一在线实验的主处理。详见 `VBE-source-validity-context-transfer-report.md`。

**在线 source quarantine 闭环（2026-09-05）：** E-SVG-ONL 在目标调用前冻结 18 个全新 paired seeds、valid-visible / invalid-visible / invalid-quarantined 三臂与 1–4 pre、5–16 treatment、17–23 withdrawal 窗口。54/54 runs、4,272 次调用全部成功；18/18 schedule 与 call-count blocks 匹配，visible payload identity、quarantine removal 和全 LLM controller 审计通过。Treatment seller intent 为 0.2118/0.0565/0.0043。冻结主差 `invalid-visible−invalid-quarantined=+0.0522`，95% `[+0.0218,+0.0864]`，单侧 exact `p=0.003906`，方向显著但未达 +0.15 MRES；`valid−invalid-visible=+0.1554`。三臂 buyer intent/trade 均为 0，withdrawal 主差为 0，库存分布不变。冻结 verdict 为 `NO MATERIAL ONLINE ACTION CONTAMINATION`；“no material” 不等于零效应或安全证明。详见 `VBE-online-source-quarantine-report.md`。

**买方参与能力闸门（2026-09-05）：** E-BUY 用 24 个 agent×score×history 配对 blocks 比较负收益、低/高 margin、uncertain/guaranteed counterparty 与 compiled-action 六臂。144 次纳入分析的调用全部成功；low-uncertain 为 23/24、low-guaranteed 24/24、high-uncertain 23/24、high-guaranteed 24/24、compiled-low-uncertain 24/24，负收益锚点为 2/24。冻结主能力差为 +0.9167，22 正、0 负、2 ties，单侧 exact `p=2.38×10⁻⁷`；certainty、margin 和 action materialization 三项 rescue 均只有 +0.0417/0/+0.0417，未过冻结门。Verdict 为 `BUYER CAPABILITY PRESENT — ONLINE NULL CONTEXTUAL`：在线 0 buyer intent 不能再归因于这三个孤立能力缺口。首次成功响应因通用 parser 自动附加字段而在写盘前停止；Amendment 1 仅改为专用三字段投影，1 次成功调用排除，prompt、端点、顺序与判据不变。详见 `VBE-buyer-capability-gate-report.md`。

**买方上下文注入（2026-09-05）：** E-BUY-CXT 从冻结 E-SVG-ONL valid-visible corpus 中按预定规则选择 15 个 seeds，每个 seed 取 early/late 两个物质可行 H–E meeting，并在 30 个 contexts 上配对运行 standard-sealed、real-state、real-memory、online-envelope 与 exact online-replay 五臂。150 次调用全部成功、无 amendment。购买率依次为 28/30、16/30、25/30、0/30、0/30；原在线来源动作也为 0/30，replay agreement 30/30。动态状态降幅 +0.4000 方向显著但未达 +0.50 MRES；真实 K=4 记忆使动作回升而非下降。公共总体 envelope 在有/无记忆下的 seed-level 降幅为 +0.8333/+0.5333，单侧 exact `p=0.0000610/0.0001221`，两项冻结门均通过，verdict 为 `PUBLIC POPULATION ENVELOPE SUPPRESSOR`。该包同时改变 target、双角色 nesting、proposal-level materialization 与 public/source framing，尚不能归因于单一组件。详见 `VBE-buyer-context-injection-report.md`。

**Envelope 组件拆解（2026-09-05）：** E-BUY-ENV-D 排除 E-BUY-CXT 的 30 个 contexts，再从全部 18 个来源 seeds 各取一个新 meeting，early/late 各 9。108 次调用全部成功、无 amendment。Narrow anchor 为 16/18；只换成 public envelope 的 hardBuyer-only/current-target/full-fields bridge 即为 0/18，配对差 +0.8889，16 正、0 负、2 ties，单侧 exact `p=0.0000153`。Dual-role nesting、target×materialization 四格与 original envelope 随后全部为 0/18。Verdict 为 `PUBLIC WRAPPER/HARD-ONLY BRIDGE SUPPRESSOR`：collapse 发生在 target、Easy seller nesting 和 proposal fields 之前；但该 bridge 同时改变 framing、schema/nesting、状态重复与行动语义强调，不能解释成 public wording 的纯效应。详见 `VBE-buyer-envelope-disassembly-report.md`。

**Wrapper / representation 最终微拆（2026-09-07）：** E-BUY-WRAP-D 再排除前两轮 48 个 contexts，从 12 个仍有未用 meeting 的 seeds 各取一个新 context，early/late 各 6。72/72 调用成功、无 failure、exclusion 或 amendment。Exact narrow 为 12/12，exact public-hard 为 0/12；统一行动语义和 wrapper 后，sealed-flat、sealed-nested、public-flat 均 12/12，public-nested 为 10/12。Framing 与 representation 主效应均仅 +0.0833（`p=0.25`），interaction 未通过；public-nested−exact-public-hard 为 +0.8333，10 正、0 负、2 ties，单侧 exact `p=0.0009766`。Verdict 为 `HARMONIZED CORE REPAIRS EXACT-PUBLIC BRIDGE`。Public framing-only 与一层 nesting-only 被排除为主要 suppressor；剩余原因属于 exact source-contract/numericPayload/metadata/target locality/action-grounding package，按冻结条件不再继续 prompt 微拆。详见 `VBE-buyer-wrapper-disassembly-report.md`。

结构 RNG 与收益 RNG 已拆分：初始持有者、每轮角色与配对只消费结构流；每轮每名代理的成功抽样在收益流中预生成。每个 E0/E∞ 结果保存日程指纹，配对指纹不一致时报告构建直接失败。旧 runner 的同 seed 不具备这一保证，因为行为会改变结算抽样次数并推动同一 RNG 流。

**继续条件：** Prompt 微拆到此停止。E-BUY-WRAP-D 显示在 harmonized interface 中，单独改变 public framing 或一层 nesting 都没有复现完整 collapse；三个饱和 cells 使全部 factorial contrasts 共享同两个 discordances，不能视作独立 null evidence。下一项先做 12 个未用 contexts 上的 narrow/public-hard × weak/medium/strong EV ladder，不做 residual wording 消融。Weak→medium 只改变 stated margin，medium→strong 只改变 stated certainty；8/12 seeds 与 E-BUY-WRAP-D 重叠，因此 weak-link drift 不能区分 context heterogeneity 与 service-window drift。窄接口三档均须达到 0.75，且相邻步降幅不得超过 0.25，否则判为 manipulation invalid 并停止。Strong robustness 通过才进入 fresh-seed online 三臂 closure；partial EV response 且仍有 residual strong gap 时先做 36-call sealed grounding；full threshold shift 停止归因并把最有根据的 grounding residual 留作未检验命题；descriptive recovery 转入 fresh-seed 或独立窗口 2×3 复制；single-axis reversal 仅报告非单调性；no-localization 关闭旧 corpus 的 wrapper-economic 分支。后三者都不触发 grounding。E-R 已表明 framing 有直接行动路径，所以仍不估计 belief mediation/LATE。

**停止/转向条件：** 简单博弈与 VBE 都对信息层级等效；论文转为“LLM 的公共提示效应不经由可测高阶预期”。

### Gate 2：创始人收益最小反证

1. `ε=1, α=0` 复现。
2. `ε=1, α=refund` 配对运行。
3. 只在出现信号后扩展 fee/seigniorage。

**继续条件：** 创立率、时间或净收益出现实质差异。

**实施结果（2026-09-03）：** 12 个配对 seed 中，`ε=1, α=0` 与立即精确退款条件均为 0/12 创立；退款没有改变卖方、买方、成交或平均分。外生发布完全相同的结构化政策为 12/12 已安装，并相对 costly 使卖方意图增加 0.492，但成交只增加 0.033，平均分降低 4.630。结论限于“移除发布成本不足以诱发作者行为”；refund 不提供正的私人收益，不能替代尚未运行的 fee/seigniorage 检验。

**正租金能力闸门（2026-09-04）：** 在 18 个全新三臂 seed 上，确定即时净赚 1 分的 `profit-bounty` 为 18/18 创立，零净成本 `refund-gate` 与等财富 `wealth-control` 均为 0/18。Profit−wealth 配对创立差为 1.000，零中心单侧 exact `p=0.00000381`，全部冻结护栏通过，verdict 为 `SUPPORTED`。能力/界面前提因此成立；下一步进入交易条件化但不改变交易方收益的外生 royalty，尚不能直接声称 fee/seigniorage 已获支持。详见 `VBE-founder-rent-gate-report.md`。

**交易挂钩 royalty（2026-09-04）：** 按 `VBE-founder-royalty-protocol.md` 在 18 个进一步的新 seed 上完成外部交易 royalty、同分布延迟 lottery 财富控制与退款控制。创立分别为 11/18、0/18、0/18；主配对差 0.611，bootstrap `[0.389,0.833]`，单侧 exact `p=0.000488`。方向检验通过，但 royalty 未达到预冻的 14/18 绝对能力门，verdict 为 `INCENTIVE EFFECT WITHOUT CLEAN RISK SEPARATION`。发布者 11/11 实际净赚，但当前 Easy/3 分状态发布 8/9、Hard/0 分仅 3/9；该角色—财富关联为后验线索。下一步先做 role×score×delay×semantics 单轮微基准，不直接进入参与者付费。详见 `VBE-founder-royalty-report.md`。

**作者决策接口微基准（2026-09-04）：** I-M 用 20×20 循环区组正交 role×score×timing×semantics，并加入确定即时锚点。完整已知分布的最坏净收益为 +1。400/400 主决策全部发布，四个冻结因子差均为零；后置算术仅 80/400 正确，恰好为确定合约 80/80，分布合约 0/320。verdict 为 `ARITHMETIC OR REPRESENTATION FAILURE`。I-T 的角色分裂未复现；下一步改为可验证 payoff compiler 干预。算术量表有四次记录完整的实施修正，不能称为无修正确认。详见 `VBE-founder-decision-microbenchmark-report.md`。

**可验证 payoff compiler（2026-09-04）：** I-C 用 20 个循环 Latin 区组比较 raw、正确未验证摘要、正确摘要加 `PASS`、错误摘要、错误摘要加 `FAIL` 与正确重算。正确摘要与 verified-correct 均为 80/80，raw 为 68/80；compiler rescue +0.150，单侧 exact `p=0.001953`。错误摘要为 0/80，rejected-false 恢复到 52/80；verification recovery +0.650，`p=0.00000095`。两项效应门通过，但 rejected-false 未达到 0.85 绝对护栏，verdict 为 `NOT SUPPORTED`。下一步把验证失败内容在进入模型上下文前删除，并加入确定性 typed action gate，而不是继续堆叠验证措辞。运行有三次透明冻结的输出预算修正，未改 prompt、顺序、终点或判据。详见 `VBE-payoff-compiler-report.md`。

**Pre-context payoff sanitization（2026-09-04）：** I-S 继续使用 20×20 循环区组，比较 raw、错误数字仍可见的 inline-rejected、错误内容被 quarantine 的 redacted-rejected、干净 canonical 与 canonical 加机械推荐。Inline positive 为 0/40；redacted、canonical 和机械推荐均为 80/80。冻结 positive redaction rescue 为 +1.000，bootstrap `[1.000,1.000]`，单侧 exact `p=0.00000095`；三个绝对率护栏均为 1.000，verdict 为 `PRE-CONTEXT SANITIZATION SUPPORTED`。机械推荐相对 canonical 没有增量，说明修复来自删除污染数字而非直接告诉模型动作。确定性 gate 干预 68/400 次并按构造得到执行准确率 1.000，只作为工程边界。400/400 调用成功，无 amendment；其环境迁移由下述 I-TS 完成。详见 `VBE-payoff-sanitization-report.md`。

**规范化 royalty 环境复制（2026-09-04）：** I-TS 在 18 个进一步的新 seed 中比较 verbatim I-T raw、推荐为空的 canonical trade 和同格式 canonical lottery。创立分别为 8/18、18/18、0/18。Canonical−raw 为 +0.556，bootstrap `[+0.333,+0.778]`，单侧 exact `p=0.00097656`；canonical trade−lottery 为 +1.000，`p=0.00000381`。全部冻结效应门与绝对护栏通过，verdict 为 `SUPPORTED`。真实成交不确定性、期末结算和交易双方零费用均保留；4,158 次调用无 API/schema/parse failure 或 amendment。下一步隐藏历史分布，将作者的采用预测、置信度和发布动作分开封存，不直接进入参与者付费。详见 `VBE-sanitized-royalty-replication-report.md`。

**隐藏采用预测与动作置信度（2026-09-04）：** I-TP 在 36 个进一步的新 seed 上先独立封存 cost 1/3/5 的作者动作，再用 stateless audit 预测强制发布的潜在成交桶和每个 chosen action 的胜出概率，最后各跑一次强制公开政策环境。真实桶为 0:2、1:19、2:15、3+:0；模型 Brier 0.746，冻结 climatology 为 0.565，baseline−model bootstrap `[−0.230,−0.125]`，TV 0.365。冻结阈值策略总体一致率 0.731、最低 cell 0.361；动作置信度 Brier/ECE/coherence MAE 为 0.290/0.312/0.170。三模块全部失败，verdict 为 `NOT CALIBRATED`。置信度几乎复制“发布胜出”概率而没有在 chosen action 为沉默时取补集，形成下一轮最窄的接口微基准。2,942 次调用无 API/schema/parse failure。详见 `VBE-hidden-adoption-forecast-report.md`。

**动作条件置信度补集微基准（2026-09-04）：** I-TPC 用 12 个已知分布、全部 8 个三动作 masks 和四种接口拆解 I-TP 的 confidence bug。Derived-vector 准确率 0.490；直接给出三个发布胜率后 compiled-vector 为 0.885，仍未过 0.95 门；明确写出 `publish→q, silent→1−q` 后为 0.983；每次只处理一个标量时为 288/288、MAE 与 complement MAE 均为 0。冻结 verdict 为 `CAPABILITY PRESENT — EXPLICIT VECTOR REPAIR REQUIRED`。部署边界因此收紧为外部 typed complement compiler。研究因重复 `cost5→cost4` 键错误有两次透明 transport 修正；最终 576 次单版本调用进入指标，464 次修正前成功调用归档排除，另披露 2 次 schema failure。详见 `VBE-action-confidence-complement-report.md`。

**Proper-scoring 与历史先验 scaffold（2026-09-04）：** I-TPF 在 36 个进一步的新 seed 上，先封存 raw、proper-score 与 prior-scaffold 三个预测，再运行强制公开环境。Fresh outcome 分布为 `[0.111,0.528,0.361,0.000]`。Proper-score 把 Brier 从 0.8500 降至 0.8289，配对改善 +0.0211 `[+0.0011,+0.0467]`，未达 +0.05 floor。54-run prior scaffold 把 Brier 降至 0.5922，相对 proper 改善 +0.2366 `[+0.1589,+0.3085]`，但 36/36 输出精确复制历史 prior，aggregate TV=0.1019 又略高于 0.10 guard。冻结 verdict 为 `NO FORECAST INTERVENTION SUPPORTED`。108 次预测调用与 2,692 次环境调用全部成功，无 amendment；调用前只修正了一个不满足既有门槛的 synthetic test fixture。下一步不再调整提示措辞，而是在已知生成机制下随机化状态信号，直接检验 posterior likelihood-ratio 更新。详见 `VBE-forecast-scaffold-report.md`。

**随机证据信号 posterior update（2026-09-04）：** I-TPU 用 24 个完全交叉的 prior × sensor × observation cases 和 deterministic Bayes 真值比较 conditional-table、compiled-likelihood 与 explicit-odds。直接条件表准确率 0.542、MAE 0.1028、方向准确率 0.625；其中 GREEN 12/12、RED 1/12。给出实际观测的 LR 后，普通 compiled 与 explicit odds 均为 24/24、MAE 近零，显式公式没有额外增益。冻结 verdict 为 `COMPILED LIKELIHOOD REQUIRED`。72/72 调用成功，无 API/schema/parse failure 或 amendment。下一步把 RED 条件行显式物化但不提供 LR，以区分补集计算与 row selection。详见 `VBE-posterior-update-report.md`。

**RED 分支显式物化消融（2026-09-04）：** I-TPUR 在同一服务窗口复用 12 个 RED cases，比较 implicit complement、显式 GREEN/RED 两行和 observed RED-only。准确率分别为 0/12、11/12、12/12；MAE 为 0.2207、0.0021、0.0001。Two-row 相对 implicit 的准确率 rescue +0.9167，bootstrap `[+0.7500,+1.0000]`，全部冻结绝对与 rescue 门通过，verdict 为 `COMPLEMENT MATERIALIZATION REQUIRED`。唯一 two-row miss 的误差 0.021422 被严格保留。36/36 调用成功，无 failure 或 amendment。下一步不再堆叠同义算术提示，而把 deterministic posterior 接回封存作者阈值决策并加入 matched noninformative signal。详见 `VBE-posterior-red-branch-report.md`。

**Typed posterior 到行动迁移（2026-09-04）：** I-TPUD 在 24 个 prior × signal cases 中比较 prior-only、typed-posterior 与 LR=1 的 matched noninformative control。三臂 own-target 准确率均为 24/24；typed posterior 在 24/24 中翻转 prior 行动，control 在 24/24 中保持 prior policy；posterior-target gain +1.000，bootstrap `[+1.000,+1.000]`。全部冻结门通过，verdict 为 `POSTERIOR-TO-ACTION TRANSFER SUPPORTED`。72/72 调用成功，无 failure 或 amendment。这闭合了合成环境中 `typed likelihood → posterior → expected payoff → sealed action` 的受控链条；下一阶段必须换成外部验证的真实 adoption signal model，而不是继续添加同义 prompt 消融。详见 `VBE-posterior-action-transfer-report.md`。

**真实早期交易信号环境迁移（2026-09-04）：** I-TPUE 用 I-TS/I-TP/I-TPF 共 90 个历史公开政策 rollout 冻结“第 1–4 轮是否已有 qualifying H–E trade”信号，并只在 36 个新 seed 上判定第 5–23 轮交易事件。`NO_EARLY_TRADE` 为 25/25 Y=1，`EARLY_TRADE` 为 4/11；冻结 posterior 相对 prior 的 Brier 改善 +0.0894，bootstrap `[+0.0301,+0.1454]`，fresh 条件率差 +0.6364。三臂 own-target 均 36/36，typed 低后验翻转 11/11、高后验稳定 25/25，LR=1 control 稳定 36/36。全部十一项门通过，verdict 为 `REAL-SIGNAL PIPELINE SUPPORTED`。最终保留 2,884 次成功调用、无失败；另透明排除首个因 K=0 instrument-transport mismatch 停止的 seed 及其 72 次成功调用，以冻结 amendment 加只读 snapshot hook 并替换已暴露 seed。该结果支持预测迁移与可信对象的行动用途，不识别信号因果性、自主学习或政策续期效应。详见 `VBE-real-signal-transfer-report.md`。

**固定供给库存集中度因果干预（2026-09-04）：** 后置检查发现 I-TPUE fresh signal 与 round-4 max holding 完全分离：25 个 `NO_EARLY_TRADE` seeds 均为四名 holder 各 1 枚，11 个 `EARLY_TRADE` seeds 均有一人持 2 枚。C-M 因而直接在 round-5 meetings 前把同四名 support identities 设置为 `[1,1,1,1]` 或 `[2,1,1,0]`，固定前四轮历史、总供给、日程、payoff stream 与 KW robot policy。512 个 seeds 中，每个集中臂先对 12 个 recipient–donor 分配取均值。未来交易效应为 −0.6449、bootstrap `[−0.6978,−0.5916]`，持有者覆盖效应 −0.1992；全部完整性与效应门通过，verdict 为 `MARK CONCENTRATION CAUSALLY REDUCES VELOCITY`。它证明 concentration 是一个真实机械通道，但不使 early trade 成为因果量，也不证明 concentration 完全解释 I-TPUE。详见 `VBE-mark-concentration-report.md`。

### Gate 3：公共账本与全员替换

1. P0 vs P2。
2. 全员替换。
3. 只有 P2 不足时加入 P3；只有非训练载体均失败时讨论 P4。

**实施结果（2026-09-03）：** 已按 12 个配对 seed 跑完 P0–P3。第 9–16 轮每轮替换一个账户控制器，第 17–23 轮全员均已替换。P1 相对 P0 的替换后卖方/买方/成交差为 -0.004/0.000/-0.012。P2 相对 P0 为 +0.671/+0.131/+0.131，但平均分降低 3.521。P3 使用冻结 KW 机器人而非 LLM，仅作为机械可执行上界；相对 P2 的成交增加 0.267、平均分增加 5.208。

随后在调用前冻结 `VBE-persistence-confirmatory-protocol.md`，用 16 个全新 seed 只复制 P0/P2。共同主终点为 P2−P0 卖方效应，以及该卖方效应减去成交效应；两项 MRES 均为 0.25。确认结果分别为 +0.690（95% bootstrap [+0.562, +0.797]，centered one-sided p=0.00009）和 +0.581（[+0.461, +0.682]，p=0.00018），按冻结规则判定 `SUPPORTED`。成交效应为 +0.110，平均分效应为 −3.461 且 16/16 为负。结论可升级为“公共账本可复现地承载卖方语义，但其成交效应显著更小且没有福利改善”；执行层仍是独立变量。详见 `VBE-persistence-confirmatory-report.md`。

**同模型执行层（2026-09-04）：** P-ENF 在目标调用前冻结 18 个 fresh 三臂 blocks。Ledger-only 与 blind-execution 的可见 prompt 逐字相同，三臂全部八个 controller 均为同一 LLM；blind/disclosed 仅由引擎在物质可行的非最终轮 H–E 会面执行 canonical exchange，同时保留原始 proposals。54 runs、4,122 次调用全部成功。Blind−ledger 的替换后成交 ITT 为 +0.2956，bootstrap `[+0.2371,+0.3546]`，单侧 exact `p=0.00000763`；full-run mean score 为 +1.4132，`[+1.0972,+1.7049]`，`p=0.00001526`。Verdict 为 `EXECUTION EFFECT SUPPORTED WITH WELFARE SUPPORT`。Disclosed−blind 提高原始 buyer proposal +0.2769，但不再提高已饱和的实际成交，且 mean score −0.1806。它闭合“执行是否有同模型因果价值”，但不支持 blind deployment、voluntary contract、consent、legitimacy、common belief 或一般均衡 welfare。详见 `VBE-model-preserving-enforcement-report.md`。

---

## 12. 暂缓事项

- 暂缓 CoMAS/LoRA：它首先证明策略持久化，不自动证明共同信念，且成本最高。
- 暂缓扩大少数派 k-sweep：先解析 k 的理性阈值和信息层级。
- 暂缓更多赫拉利故事措辞：故事语义已经不是首要不确定性。
- 暂缓大规模跨模型：先让核心构念在一个模型上可识别；之后模型家族才是推断单位。
- 暂缓把安全攻击作为主线：传播与 mind-virus 方向正在拥挤，除非 E 的机制产生独特攻击/防御预测。

---

## 13. 高风险、高回报扩展

### 13.1 双货币竞争

两位创始人各自发行随机 nonce、选择供给量与手续费并公开游说。测试好制度是否输给强叙事、先发优势和网络中心性。

### 13.2 伪造共同知识

攻击者只能伪造“大家都看见”的回执，不能改变政策事实。若接受率被回执攻击显著移动，说明系统的脆弱点是信息拓扑认证，而非内容审核。

### 13.3 制度纠错能力

传播时随机突变汇率、手续费或 token 名称，测量公共账本、私人记忆和权重载体各自的错误积累与修复速度。

### 13.4 制度的最小描述长度

搜索最短但仍能触发采用的公开消息，并用内容删除、同义替换和随机 token 做因果消融。目标不是制造“病毒”，而是识别共同知识提示的必要语义原子。

---

## 14. 当前论文形态

三个模块都产生了信息，但都不是原先预想的完整正结果。因此选择负结果/系统分层论文：

> **From Public Signals to Executable Institutions: Adoption, Authorship, and Persistence in a Language-Model Economy**

核心贡献是同一 VBE 内的 E–I–P 拆分，以及三个可复现的断裂：行动不等于可测信念、执行不等于创立、语义持久不等于双边交换。P3 被明确降格为机械上界，不能写成 LLM 形成了可执行制度。初稿已生成于 `VBE-paper-draft.md`。

---

## 15. 必补文献与定位

正式投稿前按以下簇补齐最新一手论文，不在本设计稿中宣称“首次”：

1. Rubinstein electronic-mail game、common p-belief、global games 与 public/private signals。
2. LLM higher-order beliefs、theory of mind 与战略推理测量。
3. LLM 社会惯例、少数派 tipping、信息传播与 mind viruses。
4. 制度选择、治理图、公共账本与可执行规则。
5. 内生货币、搜索货币、货币竞争与制度创业者。
6. 多智能体 RL 的独立策略训练与长期信用分配。

当前定位约束：已有命名博弈工作证明简单惯例可收敛；已有治理工作证明制度架构会改变 LLM 行为；已有高阶推理工作构造递归信念。VBE 的独特目标应是把**信息拓扑 → 高阶预期 → 内生创立 → 跨人口存续**放进同一个有经济机会成本的因果链，而不是重复证明“prompt 会改变行动”。
