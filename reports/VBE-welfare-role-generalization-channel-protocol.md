# VBE 研究 W-RG：福利角色泛化执行通道实验协议

**版本：** 1.0 · 2026-09-14  
**状态：** 项目内部前瞻性机制实验；目标调用前冻结；不声称外部预注册  
**模型时代：** `deepseek-flash`，服务时代 `deepseek-v4.1-flash-post-2026-09-14T04:00Z`；temperature 0；thinking disabled  
**既有证据边界：** W-CO 的 H–H 互换、Hard 解题和福利结果只用于提出假设，不与本研究合并推断

## 1. 研究问题与突破口

W-CO 的正式结果显示 gift-talk 相对 money-talk 提高平均福利，但预先冻结的 Easy→Hard gift 与 mark sale 联合替代门槛没有通过。事后机制审计发现，最大的行为差异反而是 Hard–Hard 之间的互赠检查（swap）：gift-talk 为 138/154，money-talk 为 27/154；Hard 解题率也同步上升。这提示模型可能把“Easy 帮助 Hard”的公开规范泛化为“任何有检查的人都应帮助 Hard”，并通过 H–H 检查循环创造福利。

本实验把这一解释变成可干预、可证伪的因果问题：在模型看到完全相同 gift-talk 提示的条件下，执行层分别切断 H–H 检查转移通道或预期的 Easy→Hard 无条件赠予通道。核心问题不是模型“心里为什么”这么做，而是哪个可观测执行通道承载了动态福利效应。

## 2. 四个实验臂与精确干预

每个 seed block 运行四臂：

1. `neutral-standard`：可见文本固定为 `NEUTRAL_ANNOUNCE`；引擎不修改 proposal；
2. `gift-standard`：可见文本逐字使用历史 `GIFT_ANNOUNCE`；引擎不修改 proposal；
3. `gift-hh-blocked`：可见文本与 `gift-standard` 字节相同；模型完成响应后，若持有检查的 H 面对 H 且原始 proposal 试图给出检查，则引擎只把执行 proposal 的 `giveCheck` 改为 `false`；
4. `gift-eh-gift-blocked`：可见文本与 `gift-standard` 字节相同；模型完成响应后，若持有检查的 Easy 面对 Hard 且原始 proposal 是不要求 mark 的检查赠予，则引擎只把执行 proposal 的 `giveCheck` 改为 `false`。

三条 gift 臂的 system prompt、user prompt、模型、参数和 JSON schema 均相同。原始与执行后 proposal 都逐次保存。干预覆盖 24 轮，包括最后一轮，因为最后一轮收到检查仍可当轮解题。所有 controller 都是同一 LLM，没有 robot 或失败后替代动作。

中性文本为：

```text
PUBLIC. It is common knowledge: this message announces no exchange recommendation and changes no engine rule. You may choose any valid action. Maximize your own score.
```

它只用于估计 gift-talk 相对无交换建议的动态总效应，不承担文本匹配或纯语义成分识别。

## 3. 工作负载、随机单位与调用算术

保持 `DEFAULT_PARAMS`：8 个账户、24 轮、`R=3,q=.4,B=1,M=4,pHard=.32,pPartner=.93,v=.5,K=4`。使用 `runPopulationAsyncPaired`，让同一 seed 的四臂共享初始持有、角色、配对以及预生成的 agent×round payoff draws。随机与推断单位是 seed-level population run；meeting 与 agent 不独立，种群内干扰是研究对象的一部分。

12 个此前未用于 LLM 实验的新 seed：

```text
13217, 13219, 13229, 13241, 13249, 13259,
13267, 13291, 13297, 13309, 13313, 13327
```

四臂在每个位置各出现 3 次，每对臂的先后顺序为 6/6。离线枚举确定每臂 920 次决策调用，四臂共 3,680 次目标调用。任一 API、schema 或 parse failure 立即停止；不保留替代动作。完成的 cell 可续跑，不得重跑。完整工作流另含 14 次 pre-flight 和 14 次 post-flight，共 3,708 次调用。

## 4. 主要因果估计量

第一主要估计量是切断 H–H 通道的福利损失：

\[
\Delta^{HH}_s=Score_{s,gift\text{-}standard}-Score_{s,gift\text{-}hh\text{-}blocked}.
\]

`HH welfare contribution` 通过需同时满足：12 个匹配 block 完整、平均值至少 `+0.5` 分/账户，且以零为中心的单侧精确配对 sign-flip `p≤0.025`。

第二主要估计量比较保留哪个通道更有价值：

\[
\Delta^{dominance}_s=Score_{s,gift\text{-}eh\text{-}gift\text{-}blocked}-Score_{s,gift\text{-}hh\text{-}blocked}.
\]

它通过同样要求平均至少 `+0.5` 且单侧精确 `p≤0.025`。这相当于比较“保留 H–H、切断 E→H gift”与“切断 H–H、保留 E→H gift”两种动态制度路径，不是自然中介比例。

辅助总效应为 `gift-standard − neutral-standard`，使用相同 `+0.5` 与 `p≤0.025` 门槛。它只升级最终标签；即便不通过，H–H 通道的受控效应仍可单独成立。

## 5. 通道操纵有效性

实质性结论前必须通过四项操纵检查：

1. `gift-standard − gift-hh-blocked` 的 seed-level H–H swap rate 平均差至少 `+0.50` 且单侧精确 `p≤0.025`，并且标准臂实际发生至少一次 H–H swap；
2. `gift-hh-blocked` 的已执行 H–H swap 精确为 0，且至少阻断一个原始给检查 proposal；
3. `gift-standard` 实际发生至少一次 Easy→Hard gift；
4. `gift-eh-gift-blocked` 的已执行 Easy→Hard gift 精确为 0，且至少阻断一个对应原始 proposal。

任一项失败，结论固定为 `CHANNEL MANIPULATION NOT VALIDATED`，而非机制零效应。变换 fidelity 逐条从原始 proposal 重算；不允许无关角色、要求 mark 的出售 proposal、`giveChits` 或 `requireChit` 被改写。

## 6. 测量与辅助机制量

每臂报告：平均福利、H–H meeting 与 swap、具有 Easy 检查的 H–E opportunity 与 Easy→Hard gift、Hard assignment 与 solve、全部非空转移、原始互赠意图及被阻断 proposal 数。预先冻结的辅助配对效应包括：

- gift-standard 相对 neutral-standard 的 H–H swap rate；
- gift-standard 相对 neutral-standard 的 Hard solve rate；
- gift-standard 相对 gift-eh-gift-blocked 的 E→H gift rate。

这些量解释依赖路径，但除第 5 节的有效性条件外不进入主要 verdict。福利是所有 8 个账户在完整 24 轮中的平均总分。

## 7. 完整性与 provider bracket

必须满足：零保留失败；全部 controller 为 LLM；每个 block 的结构 schedule hash 与调用数一致；三条 gift prompt 字节相同；所有 proposal schema 有效；所有变换可重算；位置和平衡先后关系精确；12 个 seed 唯一；目标调用数精确为 3,680。

冻结后使用既有服务时代 baseline 的 `compare` 模式。顺序为：冻结 → 14-call pre-flight → 48 个目标 cell → 立即 14-call post-flight → 零目标调用最终化。pre-flight 必须健康并与服务时代 baseline 一致；pre/post 的 catalog、returned model、fingerprint 与 prompt hash 必须匹配。目标完成但 post-flight 未完成时只输出 `AWAITING POST-FLIGHT`；bracket 不健康或身份变化时输出 `INVALID`。历史 sentinel 仅描述跨时代漂移，不进入健康门槛。

## 8. 判决树

按顺序：

1. `INCOMPLETE`：少于 12 个完整四臂 block；
2. `INVALID`：完整性或 provider bracket 失败；
3. `AWAITING POST-FLIGHT`：目标完整但 post-flight 尚未完成；
4. `CHANNEL MANIPULATION NOT VALIDATED`：第 5 节任一操纵条件失败；
5. `NO MATERIAL HH EXECUTION-CHANNEL CONTRIBUTION`：操纵有效但 H–H 福利贡献门槛失败；
6. `HH EXECUTION CHANNEL CONTRIBUTES WITHOUT DOMINANCE`：H–H 福利贡献通过、通道优势未通过；
7. `HH EXECUTION CHANNEL DOMINATES UNDER GIFT TALK`：贡献与优势通过、gift 相对 neutral 总福利门槛未通过；
8. `HH EXECUTION CHANNEL DOMINATES REPLICATED GIFT-TALK WELFARE EFFECT`：三项福利门槛全部通过。

## 9. 解释边界

三条 gift 臂的同提示执行干预识别：在该有限种群、该动态和该 gift-talk 制度下，阻断指定执行通道造成的种群总效应。它不识别自然中介效应、模型私有心理状态、个体层因果效应、同意或合法性，也不证明一般均衡福利。执行层阻断会改变后续状态与后续模型响应；这正是动态通道总效应，而不是需要“控制掉”的污染。H–H 通道若贡献福利，也只能支持“公开规范发生了可观测的角色泛化”，不能证明模型采用了某个唯一的抽象规则。

## 10. 冻结工件

- 本协议与英文版；
- `welfare-role-channel.ts`、execution、runner、analyzer、tests；
- run-specific provider-health plan；
- 共享 env、params、prompts、speech、LLM、provider-health 与 observed-chat 代码；
- SHA-256 manifest 与 dry-run hash；
- 运行后的 private/public 结果镜像及 provider bracket。

任何 API key 都不得进入工件。
