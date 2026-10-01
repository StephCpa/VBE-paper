# VBE Study W-SGB：福利语义泛化边界协议

**版本：** 1.0 · 2026-09-14  
**状态：** 项目内前瞻性实验；在首次 target call 前冻结；不声称外部注册  
**模型时代：** 请求 `deepseek-flash`，serving era 为 `deepseek-v4.1-flash-post-2026-09-14T04:00Z`；temperature 0；thinking disabled  
**先验证据边界：** W-CO 与 W-RG 只用于提出假说与设定 MRES，不与 W-SGB 池化。

## 1. 研究契约

| 字段 | 冻结答案 |
|---|---|
| 真实主体 | 在公共 cheap talk 下反复分配会过期 verification checks 的八账户 LLM population |
| 工作负载 | 24 轮、Easy/Hard 角色变化、随机会面、marks 跨轮持久、四轮记忆及 population 内 interference |
| 被挑战的默认假设 | 公共指令字面点名的交易，就是承载福利效应的行为机制 |
| 冲突 | W-RG 点名 Easy→Hard giving，但 26 个可行 E→H 意图中 25 个被 Hard 互惠吸收，因果福利路径是 H–H circulation |
| 目标 | 识别哪条可观察语义边界预测 H–H circulation，以及同一边界是否承载系统福利 |
| 硬约束 | 不做 execution transform；保留历史 gift、money、neutral 原文；全新 seeds；完整配对 blocks；provider bracket；familywise error control |
| 非目标 | 私有推理、token 级词汇因果、自然中介、同意、合法性、部署福利或跨模型等价 |
| 推翻条件 | 若 exact gift reference 未同时提高 H–H swap 与 welfare，本研究停止实质语义定位 |

## 2. 竞争机制假说

1. **Helping-semantic generalization：** 无定价帮助指令跨 donor roles 泛化；exact money-talk 与一个已行为激活的有害转移指令不产生可比 H–H circulation。
2. **Check-movement directive generalization：** 任何组织 check movement 的公共指令，包括有价交换，都可能引起 H–H circulation。
3. **Generic directive spillover：** 即使指令点名的是机械上损失 salvage 的 Easy–Easy 交易，也会引起 H–H circulation。
4. **Subject-quantifier binding：** 原始不定主体 “an Easy agent” 容许语用角色泛化；明确 `only Easy` 会抑制它，而明确放宽 donor 或保留 Hard-partner predicate 会维持它。

这些是可观察 response profiles，不是对唯一内部表征的主张。

## 3. 七个实验臂

14 个 seed block 均运行以下七臂，执行层不做任何干预：

1. `neutral`：W-RG 的无建议 neutral 原文；
2. `gift-exact`：历史 `GIFT_ANNOUNCE` 原文，字节一致；
3. `gift-easy-only`：明确只允许 Easy 为 donor，并声明 Hard 不按此指令给出；
4. `gift-any-holder`：明确将 donor 放宽至任意 check-holder，同时保留 Hard 为 beneficiary；
5. `gift-hard-partner-only`：只在当前 partner 为 Hard 时允许无价给出，不限制 donor role；
6. `money-exact`：历史 money-talk `ANNOUNCE` 原文，字节一致；
7. `easy-easy-negative`：指令两个 Easy agents 互相给出 checks。

四条新增 notice 的英文原文冻结如下：

```text
PUBLIC. It is common knowledge: only an Easy agent gives a leftover check to a Hard agent without requiring a mark. A Hard agent does not give a leftover check under this statement. Do not sell checks for marks. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.

PUBLIC. It is common knowledge: any agent who holds a leftover check gives it to a Hard agent without requiring a mark. Do not sell checks for marks. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.

PUBLIC. It is common knowledge: an agent gives a leftover check without requiring a mark only when the current partner is Hard. Under this statement, do not give a leftover check when the current partner is Easy. Do not sell checks for marks. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.

PUBLIC. It is common knowledge: when two Easy agents meet and each has a leftover check, each gives that check to the other without requiring a mark. Do not sell checks for marks. This is not an engine rule — only a public statement. You may follow it or ignore it. Maximize your own score.
```

在冻结引擎中，两个 Easy 同时给出会失去本可各自兑现 0.5 的两张检查，因此一次被点名的 E–E swap 对总福利的机械变化恰为 `−1.0`。最后一臂由此是负福利 named-transaction control，而不只是换一种说法的建议。

## 4. 工作负载、seeds、顺序与调用算术

研究保留 `DEFAULT_PARAMS`：八账户、24 轮、`R=3,q=.4,B=1,M=4,pHard=.32,pPartner=.93,v=.5,K=4`。同一 seed 内所有臂共享初始持有、角色、配对以及预生成的 account×round payoff draws。随机化与推断单位是 seed-level population run；meetings 与 accounts 不是独立样本。

冻结 14 个此前未用于 LLM experiment 的 seeds：

```text
13331, 13337, 13339, 13367, 13381, 13397, 13411,
13417, 13421, 13441, 13451, 13457, 13463, 13469
```

前七个 blocks 使用七臂列表的全部循环移位，后七个使用对应逆序。每臂在每个位置出现两次；任意两臂先后为 7/7。离线枚举固定每臂 1,086 次、目标调用共 7,602 次；pre/post 各 14 次 health 后完整 workflow 为 7,630 次。任何 API、schema 或 parse failure 都停止执行；已完成 cell 可恢复但不得重跑。

## 5. 共同主要结果与冻结对比 families

共同主要结果是：

- seed-level H–H swap rate：更近端的机制判别量；
- 完整 24 轮的每账户 population mean welfare：系统后果。

两个 outcome 均计算以下八个方向性配对对比：

| 对比 | 识别作用 |
|---|---|
| `gift-exact − neutral` | reference activation 与 fresh-seed replication |
| `gift-exact − money-exact` | helping 内容相对有价 check movement |
| `gift-exact − easy-easy-negative` | helping 内容相对已激活的有害转移指令 |
| `money-exact − neutral` | check-movement directive generalization |
| `easy-easy-negative − neutral` | generic directive 对 H–H 的 spillover |
| `gift-exact − gift-easy-only` | restrictive subject quantifier attenuation |
| `gift-any-holder − neutral` | 明确放宽 donor 后的响应 |
| `gift-hard-partner-only − neutral` | 明确 Hard-beneficiary predicate 下的响应 |

H–H swap rate 的 MRES 为 `+0.25`，welfare 为每账户 `+0.5`。每个效应报告 matched-seed mean、paired bootstrap interval 及以 0 为中心的单侧 exact sign-flip p-value。八个 H–H tests 与八个 welfare tests 分别使用 Holm adjustment，将各自 familywise error 控制在 `0.025`。方向性 gate 仅在 14 个 pairs 全部存在、mean 达 MRES、Holm-adjusted p 不高于 `0.025` 时通过。

所有实验臂的 H–H、E–E、E→H gifts、mark sales、Hard solves 与 transfers 均报告，但不能替代失败的共同主要 gate。

## 6. 负向对照的行为激活

只有当 `easy-easy-negative − neutral` 使 seed-level E–E swap rate 至少提高 `+0.25`，且单侧 exact p 不高于 `0.025`，负向指令才算 behaviorally engaged。该单一 validity check 位于两个八检验 substantive families 之外。失败不使整个研究无效，但会阻止 `HELPING-SEMANTIC SPECIFICITY` 标签：一个没有引起自身点名行为的负向指令，不能排除 generic salience。

## 7. 冻结分类

Reference 只有在 `gift-exact − neutral` 对 H–H swap 与 welfare 两项都通过时才 active。否则 headline 为 `REFERENCE GIFT EFFECT NOT REPLICATED`，所有语义定位仅作描述。

Reference active 后，H–H profile 按下列优先级分类：

1. negative-minus-neutral H–H 通过：`GENERIC DIRECTIVE SPILLOVER`；
2. money-minus-neutral H–H 通过：`CHECK-MOVEMENT DIRECTIVE GENERALIZATION`；
3. gift-minus-money 与 gift-minus-negative H–H 均通过，且负向指令 engaged：`HELPING-SEMANTIC SPECIFICITY`；
4. 其余：`MIXED OR UNRESOLVED`。

优先级避免用较窄标签遮蔽更宽的正向 spillover。八个 welfare 结果仍是共同主要结果，并与机制 profile 同时输出；机制标签刻意由更近端的 H–H outcome 驱动。

Quantifier status 单独输出。`SUBJECT EXCLUSIVITY BINDS` 要求 gift-minus-Easy-only、any-holder-minus-neutral、Hard-partner-minus-neutral 的两个共同主要 outcomes 全部通过。若仅 gift-minus-Easy-only 两项通过，则为 `SUBJECT EXCLUSIVITY ATTENUATES`。否则为 `SUBJECT-QUANTIFIER SEPARATION NOT SUPPORTED`；这不是等价性声明。

## 8. 完整性与 provider bracket

必要 invariants：零 retained failures；全部 controllers 为同一 LLM；14 个 schedule/call-matched 完整 blocks；arm notices 精确；neutral、gift、money 与历史常量字节一致；严格三字段 action schema；位置和两两先后精确平衡；14 个 unique fresh seeds；目标调用恰为 7,602；E–E named transaction 的机械福利变化恰为 `−1.0`。

Provider health 以 `eraBaselineMode=compare` 对照既有 V4.1 Flash baseline。顺序为 freeze → 14-call pre-flight → 98 target cells → 立即 14-call post-flight → 零 target-call finalization。Pre-flight 必须健康且与 baseline 一致；pre/post catalog、returned-model、fingerprint 与 prompt-hash sets 必须相同。只有 `BRACKET HEALTHY` 允许实质解释；historical sentinels 只描述跨时代 drift，不进入 health gates。

## 9. Verdict tree

依次为：

1. `INCOMPLETE`；
2. `INVALID`；
3. `AWAITING POST-FLIGHT`；
4. `REFERENCE GIFT EFFECT NOT REPLICATED`；
5. `GIFT REFERENCE REPLICATED — GENERIC DIRECTIVE SPILLOVER`；
6. `GIFT REFERENCE REPLICATED — CHECK-MOVEMENT GENERALIZATION`；
7. `GIFT REFERENCE REPLICATED — HELPING-SEMANTIC SPECIFICITY`；
8. `GIFT REFERENCE REPLICATED — SEMANTIC PROFILE UNRESOLVED`。

独立 quantifier status 与所有 adjusted effects 随 headline 一并输出。

## 10. 边界与停止条件

本研究识别的是该 workload 中七个公共语言 packages 的 population-level dynamic total effects。新增变体未做 token/length matching，因此差异定位到 semantic packages，而不是单个词。设计不识别私有信念、唯一内部抽象、自然中介、个体效应、同意、合法性、部署福利或跨模型等价。

若 reference 不 active，不在本研究内修 prompt 或换 endpoint。若 provider bracket 无效，保留 calls 但不解释。任何未注册 arm、seed、threshold、contrast 或事后 upgrade 都不得进入 verdict。后续 lexical micro-disassembly 必须另行冻结并使用新 seeds。

## 11. 冻结产物

- 本协议及英文对应版；
- semantic core、execution、runner、analyzer 与 tests；
- run-specific provider-health plan；
- 共享 env、params、prompt、speech、inference、LLM、observation 与 provider-health code；
- SHA-256 manifest 与 dry-run hash；
- 运行后的 private/public result mirrors 与 provider bracket。

任何 artifact 不得包含 API key。
