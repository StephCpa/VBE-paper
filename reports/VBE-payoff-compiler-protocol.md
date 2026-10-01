# VBE Study I-C：可验证 Payoff Compiler 冻结协议

**版本：** 1.0  
**日期：** 2026-09-04  
**状态：** 项目内前瞻性冻结；未外部注册  
**模型：** `deepseek-v4-flash`，temperature 0，thinking disabled

## 1. 一句话研究命题

当风险合约的原始频率表容易被语言模型错误编译时，外部机器生成并可核验的收益摘要能否提高作者决策准确率，同时抵抗一个数值醒目但未经验证的错误摘要？

## 2. 前置证据与研究契约

I-M 在完整已知、最坏也盈利的分布上得到 400/400 正确发布，但分布算术 0/320 正确；错误集中在遗漏每单位倍率、错误概率加权和重新引入零结果。下一步的系统假设不是“换一种说法”，而是把频率到收益的编译移出语言模型，并暴露机器可核验结果。

| 字段 | 冻结约定 |
|---|---|
| 真实主体 | 需要让自治 LLM 理解制度费用、royalty 与风险的系统设计者 |
| 工作负载 | 单次自利作者决策；已知离散当前分布；正、负期望值都存在 |
| 默认假设 | 原始频率表足以让模型形成正确收益表示 |
| 冲突 | I-M 的行动正确但 320/320 分布算术失败 |
| 目标 | 提高按期望最终得分定义的决策准确率，并测量错误摘要的攻击面 |
| 硬约束 | 不要求模型输出推理或算术；同一原始分布在表示臂间逐字一致；区组为推断单位 |
| 非目标 | 不测真实风险偏好、跨模型泛化、参与者付费需求或密码学协议安全 |
| 支持证据 | verified compiler 相对 raw 的准确率提升与 verified rejection 相对 false summary 的恢复均通过冻结效应与绝对率门 |
| 推翻证据 | verified compiler 不改善 raw，或验证失败标记不能抵抗错误摘要 |

## 3. 风险合约

精确发布成本 1 分。若发布，每个 payout unit 支付 2 分；沉默成本和支付均为 0。分布是当前案例的完整已知分布，不是历史样本。

| Scenario | 0 units | 1 unit | 2 units | 3 units | E[gross] | E[net] | P(loss) | 正确行动 |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| `positive` | 6/18 | 8/18 | 3/18 | 1/18 | 17/9 | +8/9 | 1/3 | publish |
| `negative` | 12/18 | 5/18 | 1/18 | 0/18 | 7/9 | −2/9 | 2/3 | silent |

智能体被明确要求最大化**期望最终得分**；没有破产、借贷、流动性、时间折扣或隐藏效用。

## 4. 表示干预

每个案例都显示相同的原始频率表，再随机到五种表示：

1. `raw-only`：只有原始表。
2. `correct-summary`：附正确机器摘要，但标记 `UNVERIFIED`，无展开。
3. `verified-correct`：附相同正确摘要、规范算术展开与 `verification_status=PASS`。
4. `false-summary`：附与另一 scenario 对调的错误摘要，标记 `UNVERIFIED`，无展开。
5. `rejected-false`：显示相同错误摘要，但 checker 标记 `FAIL`，并给出从原始表重新计算的正确展开；明确拒绝错误摘要。

`false-summary` 与 `rejected-false` 的错误数字完全相同。它们的差异只在校验结果和正确展开。`correct-summary` 与 `verified-correct` 的正确数字完全相同，差异只在可核验展开与 PASS 标记。

## 5. 区组与调用

两个状态 `Easy/score=3` 与 `Hard/score=0`、两个 scenario、五种表示构成 20 个条件。20 个完整区组采用 20×20 循环 Latin 顺序，使每个条件在每个调用位置一次。共 400 次决策调用，返回严格 JSON：

```json
{"publish": true, "rationale": "short private reason"}
```

不询问数值、概率或信念。失败 API/schema 调用不转成沉默；runner 中止并允许从成功记录恢复。不得早停。

## 6. 冻结终点与判定

正确决策为 positive 发布、negative 沉默。每个区组先在四个状态×scenario 单元内算各表示的准确率，再形成配对差。

共同主终点：

- `compiler rescue = accuracy(verified-correct) − accuracy(raw-only)`；
- `verification recovery = accuracy(rejected-false) − accuracy(false-summary)`。

每项必须同时满足平均差至少 +0.15、零中心单侧 exact sign-flip `p≤0.025`。绝对护栏要求 `verified-correct` 与 `rejected-false` 的总体准确率都至少 0.85。只有四项条件全部通过，verdict 才是 `VERIFIED PAYOFF COMPILER SUPPORTED`。

其他冻结 verdict：

- 两个绝对率护栏通过、verification recovery 通过，但 compiler rescue 因 raw ceiling 未过：`VERIFICATION VALUE WITHOUT RAW RESCUE`；
- compiler rescue 通过、verification recovery 未过：`CORRECT SUMMARY HELPS WITHOUT VERIFIED REJECTION`；
- 正确摘要臂准确但两个差都未过：`ACCURATE COMPILER WITHOUT IDENTIFIED CAUSAL GAIN`；
- 其他完整结果：`NOT SUPPORTED`；
- 非 20 个完整区组或保留失败调用：`INCOMPLETE`。

次要结果：correct-summary−raw、verified-correct−correct-summary、false-summary−raw；按 scenario 和状态分层的描述率；rationale 仅定性诊断，不进入 verdict。

## 7. 边界与停止条件

本研究测试的是一个受控离散表的接口，不证明任意合约编译器正确，也不把 `verification_status` 当密码学证明。若错误摘要显著支配原始表而 FAIL 标记无法恢复决策，停止向语言模型暴露未认证派生字段。若 verified compiler 成功，下一步才把同一 compiler 接入 I-T 环境，并保持交易方收益为零费用；在环境复制前不进入参与者付费。
