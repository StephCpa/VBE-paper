# VBE 福利语义泛化边界正式报告

**Study ID:** `VBE-W-SGB-SEMANTIC-GENERALIZATION-BOUNDARY`  
**版本：** 1.0  
**日期：** 2026-09-14  
**状态：** 项目内部前瞻性实验；未外部注册  
**正式 verdict：** `GIFT REFERENCE REPLICATED — GENERIC DIRECTIVE SPILLOVER`  
**语义状态：** `GENERIC DIRECTIVE SPILLOVER`  
**量词状态：** `SUBJECT EXCLUSIVITY BINDS`

## 摘要

W-SGB 在 14 个全新配对种子和七个不改变执行层的公共消息臂上，检验 W-RG 中的 H–H 检查流通究竟来自帮助语义、关于 check movement 的指令、一般指令显著性，还是主体量词的松散泛化。98/98 个 cells、7,602/7,602 次 target calls 全部成功；pre/post 各 14 次 provider-health calls 均健康，模型、指纹、catalog 与 prompt hashes 在 bracket 内一致。

Exact gift 相对 neutral 同时提高 H–H swap rate `+0.6070`（95% bootstrap `[+0.5097,+0.7140]`）和平均福利 `+2.0625`（`[+1.4286,+2.8125]`），两者 Holm-adjusted `p=0.0004883`，14/14 种子同向，因而在新种子中复制了 gift reference。Exact money 相对 neutral 不提高 H–H swaps 或福利，且所有七臂的 mark sales 都为零。

决定机制标签的是机械负福利 E–E 指令：它使被点名的 E–E swaps 达到 113/114，并相对 neutral 将 H–H swap rate 提高 `+0.3777`（`[+0.2875,+0.4745]`，Holm-adjusted `p=0.0004883`），但福利仅 `+0.1875`（`[-0.3393,+0.7098]`），未达到 `+0.5` MRES。公共指令因此可以跨角色泛化，即使其明示内容不是帮助且机械损害福利；然而这种行为泛化本身不保证福利改善。

主体排他性也明确生效：`Easy only` 几乎退回 neutral，而 `any check-holder` 与 `only when the partner is Hard` 都保留强 H–H 流通与福利效应。结论不是模型无条件忽略量词，而是它会服从明确的主体排他约束；若主体未被排他限定，则可能把受益者关系或公共指令结构泛化到未点名角色。

## 1. 设计与冻结边界

- 七臂：no-recommendation neutral、exact historical gift、`Easy only`、`any check-holder`、`only when the partner is Hard`、exact historical money-talk、机械负福利 E–E reciprocal-transfer 指令。
- 14 个全新种子采用循环序列及逆序；每臂在每个位置出现两次，任意两臂先后次序为 7/7。
- H–H swap rate 与平均福利是共同主要结果；每个结果各有八个方向性对比，分别用 Holm 将 familywise alpha 控制在 0.025。
- H–H swap MRES 为 `+0.25`，福利 MRES 为 `+0.5`。负向臂另要求 E–E engagement 至少 `+0.25`。
- exact neutral、gift 和 money packages 与历史版本相同；新语义臂不做 token/长度匹配，因此只支持 package-level 语义边界，不能归因到某个词。
- 冻结 manifest SHA-256：`affb3e0a8d9939a4107630eeb1d39540d02401c77c6613443b5c085e6872b72b`；冻结时 target 与 bracket calls 均为 0。

## 2. 运行与完整性

| 项目 | 结果 |
|---|---:|
| Fresh paired seeds | 14 |
| Arms / complete cells | 7 / 98 |
| Target calls | 7,602 / 7,602 |
| Provider-health calls | 28 / 28 |
| API / schema / parse failures | 0 / 0 / 0 |
| Schedule-matched blocks | 14 / 14 |
| Call-matched blocks | 14 / 14 |
| Notice / historical notice exactness | 通过 |
| Order / pairwise precedence balance | 通过 |
| Negative directive mechanically non-improving | 通过；每次点名交易 `−1.0` 福利 |
| Provider bracket | `BRACKET HEALTHY` |

Pre/post 各有 6 种 raw responses，entropy 均为 2.3249 bits；external controls 为 4/4，dominant-positive buys 为 4/4，dominant-negative buys 为 0/4。两端均返回 `deepseek-flash`，system fingerprint 均为 `aeb56401ca74e127821c4f9126dcb669`，catalog 均精确为 `deepseek-flash, deepseek-v4-pro`，并与既有 serving-era baseline 匹配。

## 3. 各臂汇总

| Arm | Mean score | H–H swaps | H–H rate | E–E swaps | E→H gifts | Mark sales | Hard solves |
|---|---:|---:|---:|---:|---:|---:|---:|
| neutral | 55.2768 | 27/125 | 0.216 | 0/114 | 0 | 0 | 494/1344 |
| gift-exact | 57.3393 | 105/125 | 0.840 | 2/114 | 9 | 0 | 577/1344 |
| gift-easy-only | 55.2277 | 29/125 | 0.232 | 1/114 | 0 | 0 | 490/1344 |
| gift-any-holder | 57.2455 | 111/125 | 0.888 | 0/114 | 7 | 0 | 573/1344 |
| gift-hard-partner-only | 57.6830 | 115/125 | 0.920 | 0/114 | 4 | 0 | 584/1344 |
| money-exact | 55.0714 | 21/125 | 0.168 | 0/114 | 0 | 0 | 487/1344 |
| easy-easy-negative | 55.4643 | 75/125 | 0.600 | 113/114 | 3 | 0 | 535/1344 |

## 4. 冻结对比

| Contrast | H–H swap-rate Δ (95% CI) | Holm p / gate | Welfare Δ (95% CI) | Holm p / gate |
|---|---:|---:|---:|---:|
| gift − neutral | +0.6070 `[+0.5097,+0.7140]` | 0.000488 / 通过 | +2.0625 `[+1.4286,+2.8125]` | 0.000488 / 通过 |
| gift − money | +0.6631 `[+0.5681,+0.7551]` | 0.000488 / 通过 | +2.2679 `[+1.6696,+2.9598]` | 0.000488 / 通过 |
| gift − negative | +0.2293 `[+0.1049,+0.3506]` | 0.005371 / **未过 MRES** | +1.8750 `[+1.3482,+2.4330]` | 0.000488 / 通过 |
| money − neutral | −0.0560 `[−0.1259,−0.0009]` | 0.968750 / 未通过 | −0.2054 `[−0.3393,−0.0714]` | 0.996094 / 未通过 |
| negative − neutral | +0.3777 `[+0.2875,+0.4745]` | 0.000488 / 通过 | +0.1875 `[−0.3393,+0.7098]` | 0.509155 / 未通过 |
| gift − Easy only | +0.5923 `[+0.4820,+0.6974]` | 0.000488 / 通过 | +2.1116 `[+1.4643,+2.8125]` | 0.000488 / 通过 |
| any holder − neutral | +0.6576 `[+0.5488,+0.7713]` | 0.000488 / 通过 | +1.9688 `[+1.2946,+2.6964]` | 0.000488 / 通过 |
| Hard partner only − neutral | +0.7034 `[+0.5956,+0.8100]` | 0.000488 / 通过 | +2.4063 `[+1.7589,+3.1071]` | 0.000488 / 通过 |

负向指令的 E–E engagement 为 `+0.9821`（`[+0.9464,+1.0000]`，Holm-adjusted `p=0.0000610`），通过操纵门。

## 5. 解释

### 5.1 Gift reference 在新种子中复制

Exact gift 相对 neutral 的两个共同主要结果都超过 MRES，且均为 14/14 同向。这复制了 W-CO/W-RG 的福利差异，并同时前瞻确认 H–H circulation 是稳定的行为表型。它支持“公开语言会改变系统行为和福利”，但 neutral 无建议，因此单独这个对比仍混合 gift 内容与“存在指令”的总效应。

### 5.2 泛化不是 helping-specific

负向指令明确要求 Easy–Easy 进行互惠检查转移；该交易每发生一次就机械损失 1.0 福利。模型几乎完全执行了被点名行为（113/114），证明操纵有效；同一指令还使未被点名的 H–H swaps 从 27/125 升到 75/125。因而 H–H 泛化不能仅解释为“帮助 Hard”或“礼物规范”。

正式标签采用 `GENERIC DIRECTIVE SPILLOVER`，因为 gift 相对 negative 的 H–H 差值虽统计显著，但 `+0.2293` 未达到预定 `+0.25` MRES。这里的 generic 指的是本任务内“连一个明确、被执行且机械有害的公共转移指令也产生跨角色流通”，不是宣称任何指令、任何模型或任何环境都会泛化。

### 5.3 行为泛化与福利质量分离

负向臂同时产生两种相反的系统效应：E–E swaps 消耗 Easy 的可保留检查，H–H swaps 提高 Hard 的解题机会。最终 welfare 相对 neutral 只有 `+0.1875` 且区间跨零。因此“会把规则泛化到其他角色”是模型/接口的传播能力；传播的规则是否提高福利，则取决于指令内容、角色结构和执行后果。Harari 式共同故事确实能形成有操作意义的制度表型，但故事的社会价值不能由其传播力推出。

### 5.4 明确的主体排他词会约束泛化

`Easy only` 的 H–H rate 为 0.232，几乎等于 neutral 的 0.216；gift − Easy-only 在 H–H 与福利上均通过。相反，`any check-holder` 和 `only when the partner is Hard` 都产生强 H–H circulation。结果支持 `SUBJECT EXCLUSIVITY BINDS`：显式限制行动主体会阻断角色泛化，而只限制受益者仍允许 Hard 作为行动者把指令应用到 Hard–Hard 配对。

这不是单词级因果归因。新臂在句法、长度和措辞上并未完全匹配；更窄的 lexical/pragmatic 结论需要全新冻结、长度匹配的微拆实验。

### 5.5 Money-talk 不触发同类流通

Exact money 相对 neutral 的 H–H 与福利差异均为负，且所有臂 mark sales 都为零。这排除了“任何关于 check movement 的历史公共文本都会产生同样 H–H circulation”的宽泛版本。结果与 gift/negative 指令的命令结构有关，但当前设计不能把 directive force、互惠结构、动词或价格语义逐一拆开。

## 6. 识别边界

本研究识别七个完整公共消息 package 对种子级人口轨迹的总效应，不识别私有表征、共同信念、自然中介比例、词元级语义、同意、正当性或一般均衡福利。负向臂的净福利是有害 E–E 执行和有利 H–H 流通的合成，不能据此估计二者各自的中介贡献。`gift-hard-partner-only` 的 pooled 数值最高，但协议没有预注册它与 exact gift 的直接推断对比，因此不得宣称它显著优于 exact gift。

## 7. 对论文与下一步的影响

W-RG 证明相同 gift prompt 下 H–H 执行通道承载福利；W-SGB 再证明这一通道不是 literal gift-to-Hard 内容的简单实现，也不是 helping-only 规范。两者组成更强的因果链：**公共语句触发跨角色规则泛化；执行形成 H–H 流通；流通可以提高福利；但错误内容同样能传播而不改善福利。**

这一结果足以作为 Paper 1 的中心发现。下一步优先级应从继续扩大实验树转为论文整合、主图和审稿边界；若以后再做实验，最高价值的补充是一个全新种子、token/长度匹配的 lexical/pragmatic 微拆，区分 directive force、互惠结构、`only` 的主体/受益者作用域与价格语义。Belief-instrument repair 仍然未运行，但不再是 Paper 1 的依赖项。

## 8. 可复核产物

- 正式协议：`VBE-welfare-semantic-generalization-boundary-protocol.md`
- 英文协议：`VBE-welfare-semantic-generalization-boundary-protocol_EN.md`
- 冻结 manifest：`vbe-engine/src/data/welfare-semantic-boundary-freeze.json`
- 结果：`vbe-engine/src/data/welfare-semantic-boundary.json`
- 公共镜像：`vbe-engine/public/data/welfare-semantic-boundary.json`
- Provider bracket：`vbe-engine/src/data/provider-health-welfare-semantic-boundary.json`
- 结果 SHA-256：`f4ab7c137903926871d9d1ef8d163f58d4b14dd60e209341cdf13d0597c09e26`
- Provider bracket SHA-256：`2c58b1de09c979e35ec6e8ac2bc14997f9bce6159363ea4020e506dc488205c1`

