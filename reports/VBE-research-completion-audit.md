# VBE 预设研究目标完成度审计

**日期：** 2026-09-07  
**审计对象：** E–I–P 最小研究闭环、belief instrument、typed source precedence/validity 与在线隔离、买方 sealed→online 能力、上下文迁移及 wrapper repair、I 线 forecast-repair 依赖链、真实信号迁移、库存机制与同模型执行层  
**结论：** 原有窄行动主张与同模型执行主线已完成；修复后的 belief 灵敏度 gate 与可信社会信息 ITT 均未通过。E-SVG 在短接口中达到 161/162 合同一致，E-SVG-CXT 却显示失败数值在轨迹上下文中 72/72 污染。E-SVG-ONL 在线闭环检测到低于 MRES 的小卖方意图效应，且无买方、成交或撤除后效应；pre-context quarantine 仍是更强边界。E-BUY 证明弱正期望 sealed buyer 已能行动；E-BUY-CXT 与 E-BUY-ENV-D 把在线 null 缩到 public wrapper bridge。E-BUY-WRAP-D 随后得到 exact narrow 12/12、exact public-hard 0/12，而 harmonized public-nested 恢复到 10/12；public framing 与一层 nesting 主效应均未过门槛。因此瓶颈属于 exact public interface contract package，而不是 framing-only 或 nesting-only。Prompt 微拆已到停止点，下一步是 fresh-seed online minimal-repair closure。P-ENF 显示同模型窄执行层把成交提高 +0.2956、平均分提高 +1.4132。当前仍不识别潜在 belief 是否存在或变化。

## 1. 按预设问题审计

| 研究链 | 预设最小问题 | 已完成证据 | 状态与边界 |
|---|---|---|---|
| E：信息拓扑与来源 | public/private 信息是否改变高阶预期、双边行动与成交；typed source 是否按 validity metadata 被门控 | 行动反应性被拆分；E-BIS/E-CI 完成反证；E-TPCD/E-SVG/E-SVG-CXT/E-SVG-ONL 定位来源边界；E-BUY 校准能力；E-BUY-CXT/ENV-D 定位 envelope bridge；E-BUY-WRAP-D 用 12 个新 contexts 拆 framing/representation | **显式报告 sensitivity 与原始可信信息 ITT 均失败；soft validity gate 不具零泄漏安全性，潜在 belief 未识别；harmonized interface package 足以修复 sealed buyer action**。E-BUY-WRAP-D 的 exact narrow/public-hard 为 12/12 与 0/12；harmonized public-nested 为 10/12，repair +0.8333、`p=0.0009766`，framing/representation 主效应均仅 +0.0833。支持调用前隔离与 harmonized repair 作为更强工程边界，不支持密码学 privacy、soft label 零风险、单一 residual component 或在线成交效应 |
| I：内生作者 | 移除成本或内部化收益能否使智能体发布制度 | refund 0/12；确定净赏金 18/18；原始交易 royalty 11/18；canonical fresh-seed trade 18/18、raw 8/18、matched lottery 0/18 | **完成**。支持确定正租金能力和编译后交易风险迁移；不支持参与者付费、机构盈利或福利改善 |
| I：预测与接口 | 原始风险缺口来自哪一层，能否建立可用的信号→行动边界 | I-TP 发现 forecast/threshold/confidence 均失败；I-TPC 定位 complement 接口；I-TPF 排除 proper-score 且发现 prior copying；I-TPU/TPUR 定位 likelihood 分支；I-TPUD 实现 24/24 typed action flips；I-TPUE 在 36 个 fresh rollouts 上使 Brier 改善 +0.0894，并实现 typed 低后验翻转 11/11、control 稳定 36/36 | **完成真实环境闭环**。支持 `observed event → frozen signal model → deterministic posterior → compiled payoff → sealed action`；signal 是 early-trade/inventory-concentration 复合代理，不支持自主 signal learning、early-trade 因果性或真实政策续期效应 |
| C-M：库存机制 | 固定总供给时，mark 集中度是否降低未来交易速度 | 512 seeds × 每 seed 12 个集中分配；`[2,1,1,0]−[1,1,1,1]` 的未来交易效应 −0.6449，95% [−0.6978,−0.5916] | **完成 robot 因果机制**。支持集中度的机械效应；不支持它是 I-TPUE 关联的唯一来源、LLM 机制或一般均衡结论 |
| P：持久载体 | 全员替换后什么载体保存制度 | 独立 16-seed P0/P2 确认：ledger seller effect +0.690，seller-minus-trade +0.581 | **完成**。支持语义持久；不支持完整交换制度或福利有效性 |
| P-ENF：执行层 | 保持模型与可见语义不变时，窄执行保证是否提高成交 | 18 个三臂 fresh blocks；blind−ledger trade +0.2956、mean score +1.4132，均通过冻结 exact gates | **完成并获福利支持**。支持同模型执行 transform 的动态总效应；不支持 voluntary contract、consent、legitimacy、common belief 或一般均衡 welfare |

## 2. Proof–implementation–evaluation 闭环

- **Proof / 反事实逻辑：** 每项冻结研究明确 estimand、统计单位、成功门、推翻条件和不可越界主张。
- **Implementation：** 协议、runner、analyzer、strict schema、顺序平衡、调度 hash、public data mirror 与 freeze hash 均在工作区保留。API/schema/parse failure 不被默认填成空行动。
- **Evaluation：** 892 个 LLM 环境 treatment-runs 和全部接口 blocks/cases 共保留 65,778 次成功模型调用；C-M 另含 6,656 次零 API robot population-runs；当前全套测试 280/280 通过。I-TPUE 另有 72 次成功调用按冻结 transport amendment 排除；E-BUY 另有首次 transport mismatch 后 1 次成功调用未记录并按 Amendment 1 排除；E-BUY-CXT、E-BUY-ENV-D 与 E-BUY-WRAP-D 的 150/108/72 次调用全部成功且无 amendment。
- **Boundary：** 论文把“行动反应”与“信念改变”、“语义持久”与“执行持久”、“外部编译能力”与“自主预测”分开报告。

## 3. 下一阶段的有序扩展

1. **时间/模型外部效度：** 原样复制 E-SVG-ONL、I-TPUE 与 P-ENF；跨模型时把模型家族或独立服务窗口作为推断单位。
2. **Fresh-seed online minimal-repair closure：** 不再拆 prompt；比较原 exact public envelope 与冻结 harmonized public-nested repair，以 buyer intent 为 primary、seller intent 与 realized trade 为 bilateral endpoints。使用全新环境 seeds 或独立服务窗口。
3. **开放权重 DCPO-style 训练：** 分离 forecast、policy、calibration 与 complement-consistency loss。API prompt 结果不能代替训练证据。
4. **制度经济扩展：** 参与者付费、内生价格、供给冲击、货币竞争与更强福利分析。

## 4. 停止判据

当前行动、作者、持久性、typed signal→action、同模型 enforcement、第一轮在线 source closure、sealed buyer capability 和 envelope localization 均达到合理停止点。E-BUY-WRAP-D 已完成最后一次 prompt 微拆：framing-only 与 nesting-only 未获支持，harmonized package 修复获冻结支持。后续不得用 sealed 同义词消融继续追逐 residual component；只允许 fresh-seed online repair closure、独立窗口/跨模型复制或开放权重训练扩展。
