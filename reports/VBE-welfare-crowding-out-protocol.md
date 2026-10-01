# VBE Study W-CO：福利挤出效应跨时代复制协议

**版本：** 1.0 · 2026-09-13  
**状态：** 目标调用前冻结的项目内前瞻复制；不作外部注册声明  
**模型时代：** provider-labeled V4.1 Flash era；canonical API model `deepseek-flash`，temperature 0，thinking disabled  
**旧证据边界：** Grok-era 与早期 Flash-era 数字只用于提出假设和描述迁移，不与本研究池化

## 1. 研究问题

历史全 label 环境中，公共 money-talk 产生 24/44 次内部 mark sale、0/76 次无偿 gift；公共 gift-talk 产生 18/50 次 gift、0/28 次 mark sale，并在三个历史 seeds 上显示约 +1.2 分的平均福利差。首个新 serving era 研究检验：在保持引擎、人口、参数和随机日程相同的条件下，gift-talk 相对 money-talk 是否复制更高的 seed-level 平均福利，并伴随 gift 上升与 mark sale 下降。

“挤出”在本协议中是**两套历史话语包之间的动态总效应与行为替代描述**。两臂同时改变多句公共文字，且没有 neutral/no-announcement arm，因此本研究不识别 money 相对无政策的纯抑制效应、natural mediation effect 或唯一心理机制。

## 2. 两臂与精确刺激

18 个 fresh seed blocks 各运行两臂：

1. `money-talk`：逐字使用历史 `ANNOUNCE`；
2. `gift-talk`：逐字使用历史 `GIFT_ANNOUNCE`。

所有 controller 均为同一 LLM；使用 `DEFAULT_PARAMS`：八个账户、24 轮、`R=3,q=.4,B=1,M=4,pHard=.32,pPartner=.93,v=.5,K=4`。两臂都是全 label prompt，没有 Harari story、robot、强制执行、奖励修改或隐藏 treatment。处理在 seed-level population run 随机化；个体会议和 agent 不是独立单位，明确允许人口内部 interference。

## 3. Fresh seeds、配对与顺序

```text
13001, 13003, 13007, 13009, 13033, 13037,
13043, 13049, 13063, 13093, 13099, 13103,
13109, 13121, 13127, 13147, 13151, 13159
```

每个 seed 的两臂使用 `runPopulationAsyncPaired`，共享 initial holders、roles、pairings 与逐 agent/round 预生成 payoff draws。九个 blocks 先 money，九个先 gift。结构 schedule hash 或每 seed 调用数不一致会使研究 invalid。离线枚举固定每臂合计 1,364 次环境决策调用，两臂共 2,728 次。历史 speech/unconfound runners 使用旧的单 RNG 路径；本研究保留刺激与环境分布，却升级为分离 structural/payoff randomness 的严格配对路径。因此它是构念与 workload 的复制，不是假装整个历史生成过程逐字节相同。

任一 API/schema/parse failure 立即停止；不以 idle/robot 行动替代。已成功 cell 可恢复且不得重跑。全部 36 cells 完成前不产生实质 verdict。

## 4. 主要 estimand 与判据

随机化和推断单位均为 seed。主要 estimand 为：

\[
\Delta^{score}_s = \overline{Score}_{s,gift}-\overline{Score}_{s,money}.
\]

`welfare effect` 通过须同时满足：

1. 18/18 完整、schedule/call-matched blocks；0 retained failure；action schema、stimulus 与顺序检查通过；
2. mean \(\Delta^{score}\ge +0.5\) points per account over 24 rounds；
3. 对零中心的单侧 exact paired sign-flip \(p\le0.025\)。

`+0.5` 是本研究独立冻结的最小相关福利差，约为历史平均总分的 0.9%，低于历史三-seed 约 +1.2 的提出假设差，但排除近零、仅方向一致的变化。它不借用其他实验的 0.25 比率阈值。

## 5. 机制一致的联合替代门

对 rounds 1–23：

- gift opportunity：H–E meeting 中 Easy 决策前持有 check；结果为 Easy 无偿给 Hard 时计 gift；
- sale opportunity：上述 meeting 中 Hard 同时在决策前持有 mark；结果为一 mark 换一 Easy check 时计 sale。

先在每 seed/arm 内计算 opportunity rate，再配对：

\[
\Delta^{gift}_s=GiftRate_{gift}-GiftRate_{money},\qquad
\Delta^{sale}_s=SaleRate_{money}-SaleRate_{gift}.
\]

每个方向门分别要求 mean ≥ `+0.25` 且单侧 exact sign-flip `p≤0.025`。只有 welfare 门及两个行为门全部通过，才写 `WELFARE CROWDING-OUT PACKAGE REPLICATED`。福利过而任一行为门不过，则写 `WELFARE CONTRAST WITHOUT JOINT BEHAVIORAL SUBSTITUTION`。机会集合会被先前 treatment 行为改变，因此这些比率是 post-treatment mechanism-consistent 描述，不是已识别中介量。

## 6. 非推断性 shared-item bridge

同一 provider-health bracket 内、目标环境前，运行 12 个历史 prompt bytes：

- E-BUY-WRAP-D blocks 1/4/7/10 的 4 个 `exact-narrow-anchor`，历史 4/4 buy；
- 同 blocks 的 4 个 `exact-public-hard-anchor`，历史 0/4 buy；
- E-BUY blocks 1/4/7/10 的 4 个 `high-guaranteed`，历史 4/4 buy。

三类各四项，块内顺序轮换。保存 prompt hash、raw response/hash、proposal、response ID、returned model 与 fingerprint。只报告每类历史一致率和四格转移计数；bridge 不设通过阈值，不影响研究完整性、有效性、显著性或 verdict，也不能证明新旧模型等价。12 次 bridge 加 2,728 次 target 共 2,740 次研究调用。

## 7. Provider-health bracket 与 serving-era baseline

必须在 DeepSeek 宣布的 2026-09-14 04:00 UTC 路由切换后重新读取 `/models`，将完整 catalog、allowed returned model、run-specific output path 和以下字段写入并冻结 plan：

- `studyId=VBE-W-CO-WELFARE-CROWDING-OUT`；
- `requestedModel=deepseek-flash`；
- `eraBaselineMode=establish`；
- 新的 `servingEraId` 与唯一 baseline path；
- historical sentinels 固定解释为 cross-era descriptive only。

顺序必须是：冻结 → 14-call pre-flight → 12-call bridge → 36 target cells → 立即 14-call post-flight → 零目标调用 finalize。runner 要求健康 pre-flight、通过 first-era baseline check，且目标未完成时尚未出现 post-flight。中断后只恢复成功 cells，不另开或覆盖 bracket。主研究完成但 post-flight 未完成时，报告只能写 `AWAITING POST-FLIGHT`；若 post bracket 不健康或身份改变，正式 verdict 为 `INVALID`。Pre/post catalog、returned-model set、fingerprint set 与 prompt hashes 必须一致；只有健康且身份一致的 post-flight 才建立本 era baseline。全流程预计 2,768 calls。

历史 sentinel 与早期 Flash 的差异在新 era 中是预期可观察量，不进入 health gate。不存在 prior V4.1 Flash baseline 是第一次 `establish` 的正常状态，不得标记 `BRACKET IDENTITY CHANGED`。

## 8. Verdicts 与报告边界

- `INCOMPLETE`：不足 18 complete paired blocks；
- `INVALID`：schedule、call、stimulus、schema、failure 或顺序不变量失败；
- `AWAITING POST-FLIGHT`：目标 blocks 已完成但 provider post-flight 尚未完成；
- `NO WELFARE PACKAGE EFFECT`：主要福利门未通过；
- `WELFARE CONTRAST WITHOUT JOINT BEHAVIORAL SUBSTITUTION`：福利门通过但联合行为门未全过；
- `WELFARE CROWDING-OUT PACKAGE REPLICATED`：福利与两个行为门全部通过。

即使最后一个 verdict 通过，论文也只能写“gift-talk package 相对 money-talk package 提高福利，并伴随 gifts 替代 mark sales”。不得写成 money 本身相对中性基线降低福利、显式信念中介、个体因果效应或一般均衡制度结论。若要识别纯挤出或中介，后续需另行冻结 neutral arm、组件随机化或 sequential mediation intervention。

## 9. 冻结产物

- `VBE-welfare-crowding-out-protocol.md` 与 `_EN.md`
- `vbe-engine/src/lib/vbe/welfare-crowding-out.ts`
- `vbe-engine/src/lib/vbe/welfare-crowding-out-execution.ts`
- `vbe-engine/src/lib/vbe/run-welfare-crowding-out.ts`
- `vbe-engine/src/lib/vbe/analyze-welfare-crowding-out.ts`
- `vbe-engine/src/lib/vbe/welfare-crowding-out.test.ts`
- run-specific provider-health plan
- `vbe-engine/src/data/welfare-crowding-out-freeze.json`
- 运行后 private/public result mirrors 与 provider-health bracket/baseline

manifest 保存上述协议、代码、tests、health plan、共享 env/prompts/speech/unconfound/minority/LLM/observed-chat/provider-health 文件及 dry-run SHA-256。API key 不进入任何产物。
