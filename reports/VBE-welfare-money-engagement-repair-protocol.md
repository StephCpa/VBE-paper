# VBE Study W-MER：Engaged-Money 语义修复协议

**Study ID：** `VBE-W-MER-ENGAGED-MONEY-REPAIR`  
**版本：** 1.0  
**日期：** 2026-09-14  
**状态：** 已冻结的项目内部前瞻协议；未外部注册；冻结时 target 与 bracket 调用均为零。

## 1. 问题与证据边界

W-SGB 的 exact-money 臂没有产生任何被点名的 mark sale，因此它的 H–H null 不能区分 priced-semantic boundary 与 treatment 未 engaged。W-MER 检验：**在显式双边 money 指令首先产生被点名的 E→H mark sale 之后**，它是否扩展到未点名的 H–H check circulation。

本研究只能支持或不支持 package-level 边界；不识别 token-level 语义、私人信念、自然中介比例、货币一般均衡或跨模型普遍性。

## 2. 固定环境与模型时代

- 使用完整 VBE `DEFAULT_PARAMS`：`n=8, T=24, R=3, q=0.4, B=1, M=4, pHard=0.32, pPartner=0.93, v=0.5, K=4`。
- 八个控制器全部为 LLM，不允许机器人替代。
- 严格动作 schema：`{"giveCheck":boolean,"giveChits":0|1,"requireChit":boolean}`。
- 所有臂的 execution 均不修改。
- 模型为当前 provider-labeled V4.1 Flash era 的 canonical `deepseek-flash`，temperature 0。
- Provider-health 采用 `compare`，基线为 `src/data/provider-era-baseline-deepseek-v4.1-flash-post-20260914.json`。
- Pre-flight 失败则禁止 target 调用；post-flight 失败或身份不一致则研究无效。

## 3. 五臂与精确 notices

1. `neutral`：W-SGB exact neutral；
2. `gift-exact`：历史 `GIFT_ANNOUNCE`；
3. `money-exact`：历史 `ANNOUNCE`；
4. `gift-bilateral`：

> PUBLIC. It is common knowledge and the recommended transfer protocol: when an Easy agent holding a leftover check meets a Hard agent, the Easy agent gives the check without requiring one mark, and the Hard agent gives no mark. Follow both role-specific actions. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.

5. `money-bilateral`：

> PUBLIC. It is common knowledge and the recommended transfer protocol: when an Easy agent holding a leftover check meets a Hard agent, the Easy agent gives the check while requiring one mark, and the Hard agent gives one mark. Follow both role-specific actions. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.

两个新 notice 均为 65 个空白分词，UTF-8 长度分别为 374 与 373 bytes。它们保持句子结构与角色顺序，但不宣称 token-identical。

## 4. 种子、顺序与调用算术

Fresh seeds：`13513, 13523, 13537, 13553, 13567, 13577, 13591, 13613, 13619, 13627`。

五个循环顺序及其逆序依次分配给十个种子。每臂在每个位置出现两次，任意两臂先后关系均为 5/5。引擎重算为每臂 `786` calls，共 `3,930` target calls；pre/post health 另加 `28`，完整有效 workflow 为 `3,958` calls。每个种子内所有臂的 schedule hash 与 call count 必须相同。

Canonical dry-run SHA-256 为 `61a1bf6a3a781b1a34616e4bae13886be78bbbfaa6f50470a34292f6bbb96aec`。

## 5. 结果变量

推断单位为完整 seed-level population run。

- **Money sale rate：** 非终局 E–H meeting 中 Easy 有 check 且 Hard 有 mark 时，执行 `chit-for-check` 且 Easy 为 seller 的比例。
- **Gift intention rate：** 非终局 E–H meeting 中 Easy 有 check 时，其原始 proposal 为 `giveCheck=true, requireChit=false` 的比例。
- **主要语义结果：** H–H swap rate。
- **次要系统结果：** 每账户最终平均分。
- Hard solve、realized E→H gift、mark holdings 与双边 proposal complementarity 只作依赖描述。

Meeting 事件不是独立推断单位。

## 6. 检验与多重性

所有检验采用 paired seed differences、单侧 exact sign-flip、paired bootstrap interval，并公开完整逐种子差值。

### 6.1 Engagement family

两项检验用 Holm 控制 FWER `0.025`，MRES `+0.25`：

1. `money-bilateral − neutral` 的 money sale rate；
2. `gift-bilateral − neutral` 的 gift intention rate。

Gate 要求十对完整、mean≥MRES 且 Holm-adjusted `p≤0.025`。

### 6.2 H–H semantic family

五项共同以 Holm 控制 FWER `0.025`：

1. `gift-exact − neutral`，MRES `+0.25`；
2. `gift-bilateral − neutral`，MRES `+0.25`；
3. `money-bilateral − neutral`，MRES `+0.25`；
4. `gift-bilateral − money-bilateral`，MRES `+0.25`；
5. `0.25 − (money-bilateral − neutral)` 的反向阈值检验。

边界 verdict 必须通过第 5 项；第 3 项不显著不能单独作为“priced effect 不存在”的证据。

### 6.3 Welfare family

`gift-exact − neutral`、`gift-bilateral − neutral`、`money-bilateral − neutral`、`gift-bilateral − money-bilateral` 以 Holm 控制 FWER `0.05`，MRES `+0.5`。Welfare 不决定语义 headline；family 外结果不得升级。

## 7. Verdict 顺序

1. cell 缺失或结构完整性失败 → `INCOMPLETE` / `INVALID`；
2. post-flight 未完成 → `AWAITING POST-FLIGHT`；
3. provider bracket 失败 → `INVALID`；
4. exact-gift H–H reference 失败 → `REFERENCE GIFT EFFECT NOT ACTIVE`；
5. money engagement 失败 → `MONEY REPAIR NOT ENGAGED — NO SEMANTIC CONCLUSION`；
6. matched-gift engagement 或 H–H response 失败 → `MATCHED CONTROL NOT VALIDATED`；
7. engaged money 通过正向 H–H gate → `ENGAGED PRICED DIRECTIVE GENERALIZES`；
8. engaged money 通过反向阈值且 gift−money 通过 H–H MRES → `ENGAGED PRICED-DIRECTIVE BOUNDARY SUPPORTED`；
9. 其余 → `ENGAGED MONEY SEMANTIC PROFILE UNRESOLVED`。

Exact-money 是 repair anchor，不参与 validity gate。

## 8. 完整性与停止条件

- 严格 raw schema；API/parse failure 不转为 idle action。
- 每个 run 必须全部由 LLM 控制，且每个 meeting 恰有两次调用。
- Notice、顺序、schedule、call count、model、prompt hash 与 mechanism 均重算。
- Analyzer 必须在移除 credential 与 ambient provider config 后运行。
- Freeze 后不得修改 notice 或 threshold。
- Engagement 失败即结束本研究，不授权同协议内继续搜索措辞。
- 若 provider identity、实现审计或时间不足，AAMAS 直接提交现有 W-RG/W-SGB 论文，不等待偏好结果。

## 9. 调用前产物

任何调用前必须具备：最终中英文协议、core、execution、resumable runner、analyzer、tests、provider-health plan、dry-run hash，以及带零调用计数的 SHA-256 manifest。Manifest 必须覆盖所有会改变 stimulus、execution、analysis 或 verdict 的文件。
