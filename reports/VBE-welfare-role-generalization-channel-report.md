# VBE 研究 W-RG：福利角色泛化执行通道正式报告

**报告版本：** 1.1 · 2026-09-14  
**协议：** `VBE-welfare-role-generalization-channel-protocol.md` v1.0  
**状态：** 完成；项目内部前瞻性机制实验；无外部预注册声明  
**模型：** `deepseek-flash`（provider 标注的 V4.1 Flash 服务时代）  
**正式判决：** `HH EXECUTION CHANNEL DOMINATES REPLICATED GIFT-TALK WELFARE EFFECT`
**判决命名边界：** 这是冻结机器标签；其中 “replicated gift-talk welfare effect” 指该臂在本研究相对“无交换建议”中性臂的福利优势，以及与 W-CO 的方向一致，并不识别 gift 语义相对任意公共 directive 的独有增量。

## 摘要

本研究把 W-CO 事后发现的 H–H 检查互换机制升级为前瞻性执行层干预。在 12 个全新 seed、四个配对臂中，三条 gift 臂向模型展示完全相同的提示，只在模型完成原始 proposal 后分别切断 H–H 检查转移或 Easy→Hard 无条件 gift。48 个 cell、3,680 次目标调用全部完成，零 API、schema 或 parse failure；pre/post provider bracket 健康且身份一致。

Gift-talk 相对“无交换建议”的 neutral 臂将平均福利提高 `+1.6823` 分/账户，95% paired bootstrap `[+0.8542,+2.4635]`，单侧精确 `p=0.00341797`；该对比包含“存在一条 directive”本身的效应，不能单独归因于 gift 语义。在相同 gift prompt 下切断 H–H 通道使福利平均下降 `3.2083`，区间 `[2.4688,3.8906]`，12/12 seed 同向，`p=0.00024414`。保留 H–H 而切断 E→H gift 的制度，比切断 H–H 而保留 E→H gift 的制度高 `2.7604`，区间 `[2.0938,3.4115]`，12/12 同向，`p=0.00024414`。

因此，W-CO 的福利效应并非主要由提示字面指定的单向 Easy→Hard gift 承载，而主要通过模型泛化产生的 H–H 检查循环实现。这是可观测动态执行通道的因果证据，不是对模型私有心理状态或自然中介比例的识别。

## 1. 设计与完整性

四臂为 `neutral-standard`、`gift-standard`、`gift-hh-blocked`、`gift-eh-gift-blocked`。12 个 seed 内共享结构随机性与 agent×round payoff draws；每臂在每个执行位置出现 3 次，每对臂的先后为 6/6。所有运行使用 8 个账户、24 轮和冻结的 `DEFAULT_PARAMS`。

完整性检查全部通过：

- 12/12 schedule-matched blocks，12/12 call-matched blocks；
- 3 条 gift prompt 字节相同；
- 变换 fidelity、action schema、位置和平衡先后关系全部通过；
- 48 个 cell 共 3,680 次目标调用，全部由 LLM controller 完成；
- private/public 结果镜像 SHA-256 均为 `45cfd56b…612c0c`；
- 冻结 manifest SHA-256 为 `134ad109…57cb2`。

Provider pre/post 均有 6 种 raw response，正向控制 4/4、负向控制 0/4，returned model 均为 `deepseek-flash`，fingerprint 均为 `aeb56401ca74e127821c4f9126dcb669`。catalog、prompt hash、returned model 和 fingerprint 在 baseline、pre 与 post 之间全部匹配；bracket 为 `BRACKET HEALTHY`。

## 2. 各臂结果

| 实验臂 | 平均福利 | H–H swap | E→H gift | Hard solve | 全部转移 | 阻断 proposal |
|---|---:|---:|---:|---:|---:|---:|
| neutral-standard | 53.6146 | 24/107 (0.224) | 0/262 (0.000) | 370/1152 (0.321) | 38 | 0 |
| gift-standard | 55.2969 | 83/107 (0.776) | 1/262 (0.004) | 429/1152 (0.372) | 242 | 0 |
| gift-hh-blocked | 52.0885 | 0/107 (0.000) | 3/262 (0.011) | 327/1152 (0.284) | 108 | 214 |
| gift-eh-gift-blocked | 54.8490 | 84/107 (0.785) | 0/262 (0.000) | 409/1152 (0.355) | 226 | 20 |

Gift prompt 虽然明示“Easy 给 Hard 检查”，但标准臂实际单向 E→H gift 仅 1/262。与此同时，H–H swap 为 83/107。原始 proposal 中存在 26 个物质可行的 E→H gift intent；其中 25 个遇到 Hard 同时无条件给检查并被引擎解析为 swap，只有 1 个成为单向 gift。

这 25/26 不是“Easy 很少愿意帮助”的证据，恰恰相反：Easy 的目标意图存在，但几乎每次都被 Hard 的无条件回赠吸收为双向 swap。因而 `gift-eh-gift-blocked` 不应被解释成移除了一个本来就弱的 Easy 意图通道；它移除的是一个在实现层已经几乎完全被互惠吸收的单向制度路径。冻结 dominance 对比仍然有效，因为它比较两个完整动态制度，但其正确因果阅读是“一个互惠循环吞并了字面单向通道”，而不是“两条独立中介的强弱分解”。

## 3. 冻结估计量与判据

| 冻结对比 | 均值 | 95% bootstrap | 单侧精确 p | 判据 |
|---|---:|---:|---:|---|
| gift − neutral 福利 | +1.6823 | [+0.8542, +2.4635] | 0.00341797 | 通过 |
| gift − H–H-blocked 福利 | +3.2083 | [+2.4688, +3.8906] | 0.00024414 | 通过；12/12 正向 |
| E→H-blocked − H–H-blocked 福利 | +2.7604 | [+2.0938, +3.4115] | 0.00024414 | 通过；12/12 正向 |
| gift − H–H-blocked swap rate | +0.7525 | [+0.6327, +0.8615] | 0.00024414 | 通过；操纵有效 |
| gift − neutral H–H swap rate | +0.5450 | [+0.4516, +0.6428] | 0.00024414 | 辅助支持 |
| gift − neutral Hard solve rate | +0.0512 | [+0.0269, +0.0747] | 0.00390625 | 辅助支持 |

四项通道有效性 gate 均通过：标准 gift 臂的 H–H 通道活跃；H–H blocked 臂将实际 swap 降为精确 0；标准 gift 臂出现 E→H gift；E→H blocked 臂将其降为精确 0，且两臂都实际阻断了对应的物质可行原始 proposal。

未预先指定为主要统计量的描述性对比 `gift-standard − gift-eh-gift-blocked` 为 `+0.4479`，区间 `[-0.0469,+0.9479]`，单侧精确 `p=0.0625`。它没有达到主要研究统一使用的 `+0.5` 与 `p≤0.025` 门槛；不得事后升级为确认性零效应，也不能用来声称 Easy 意图无效。它只描述标准 gift 制度与阻断单向实现路径制度之间的差异。

## 4. 福利依赖路径

切断 H–H 通道相对标准 gift 减少 102 次 Hard solve。按每次成功 `R=3` 计算，Hard solve 少带来 306 个总分损失；观测到的总福利损失为 `3.2083×12×8=308`，余下检查 salvage 净变化仅约 2 分。由此，福利损失几乎全部沿“更少 H–H 检查循环 → 更少 Hard solve”路径闭合。

相比之下，保留 H–H、切断 E→H gift 相对切断 H–H、保留 E→H gift 多 82 次 Hard solve，对应 246 分；观测总福利优势为 `2.7604×12×8=265`，其余约 19 分来自检查 salvage 与其他转移状态。这是依赖路径的确定性记账，不是额外的中介显著性检验。

## 5. 研究含义

最强结论是：在公开 gift directive 下，互惠检查循环的福利作用发生了角色泛化。Easy 几乎总是产生字面目标意图，但 Hard 的同步回赠把它吸收为 swap；与此同时，“给需要者检查”的模式扩展到文本未提及的 H–H 相遇。当 H–H 执行通道被切断，即使模型看到的提示完全不变，福利仍在每个 seed 中下降。

这对整体 VBE 研究有三个推进：

1. 它把“语言是否改变行为”的相关结果推进为“哪条执行依赖路径承载福利”的受控因果结果；
2. 它表明制度文本的真实机制可能来自模型的语义泛化，而不是文本直接命名的交易；
3. 它提示后续制度设计不应只审计目标行为，还要审计角色外溢、互惠循环和动态状态反馈。

## 6. 边界与下一步

该实验识别的是有限种群、强干扰、24 轮环境中的执行通道动态总效应。它不识别模型的私有信念、自然中介比例、个体处理效应、同意、合法性或一般均衡福利。H–H blocking 同时阻断该角色对中的所有物质可行检查给出，因此结论针对 H–H 检查转移通道整体，而不是某个唯一心理动机。

下一步最有价值的不是再重复“是否有 H–H 效应”，而是做语义泛化边界实验，并把 H–H swap rate 与福利设为共同主要结果。固定执行层不干预，至少比较：无建议 neutral、当前 gift directive、明确 `Easy only`、`any check-holder`、`only when partner is Hard`、历史 money-talk，以及一个指向确定性非福利改善交易的负向 directive（例如 Easy–Easy 互换会销毁剩余检查的 salvage value）。预注册预测是：若泛化对象是“帮助”，gift 与受益者为 Hard 的变体应提高 H–H swap，而 money-talk 不应；若 money-talk 同样提高 H–H swap，则更窄结论是“关于检查移动的公共 directive”发生泛化；若负福利 directive 也普遍提高 H–H swap，则一般 directive salience 尚未排除。该实验应使用新 seed、独立冻结，并把本研究作为效应量先验而非合并数据。
