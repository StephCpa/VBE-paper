# VBE Study I-C：可验证 Payoff Compiler 报告

**日期：** 2026-09-04  
**模型：** `deepseek-v4-flash`，temperature 0，thinking disabled  
**证据等级：** 项目内前瞻性冻结；运行中仅三次透明记录的输出预算修正；未外部注册  
**冻结 verdict：** `NOT SUPPORTED`

## 1. 结论

外部 payoff compiler 对正确决策有明显价值，但当前“把正确展开和 PASS/FAIL 状态写进同一个自然语言上下文”的接口还不够安全。

- 原始频率表准确率为 68/80（0.850）。
- 未验证的正确摘要与带 `PASS` 的正确摘要均为 80/80（1.000）；相对 raw 的 compiler rescue 为 +0.150，bootstrap 95% `[+0.075,+0.237]`，零中心单侧 exact sign-flip `p=0.001953`。
- 未验证的错误摘要为 0/80：它把正、负两类决策全部翻到错误方向。
- checker 标记 `FAIL`、拒绝错误摘要并给出正确重算后，准确率恢复到 52/80（0.650）；相对错误摘要的 verification recovery 为 +0.650，`[+0.575,+0.738]`，`p=0.00000095`。
- 但 `rejected-false` 没达到预冻的 0.85 绝对安全门，因此不能宣称“可验证 payoff compiler 获支持”。

这里的关键区分是：**正确编译结果是一种有效决策辅助；自然语言中的验证标签却还不是可靠的安全边界。**

## 2. 设计

每次发布成本 1 分，每个 payout unit 支付 2 分；沉默的成本和支付均为 0。两个完整当前分布分别为：

| Scenario | 0/1/2/3 units 频数 | E[gross] | E[net] | 正确行动 |
|---|---|---:|---:|---|
| positive | 6/8/3/1（共 18） | 17/9 | +8/9 | publish |
| negative | 12/5/1/0（共 18） | 7/9 | −2/9 | silent |

同一原始表随机配五种表示：`raw-only`、未验证正确摘要、带展开和 `PASS` 的正确摘要、未验证错误摘要、以及带 `FAIL` 和正确重算的同一错误摘要。Easy/3 与 Hard/0 两个状态、两个 scenario、五种表示构成 20 个条件；20 个循环 Latin 区组使每个条件占据每个调用位置一次，共 400 次决策。

共同主终点是 `verified-correct − raw-only` 与 `rejected-false − false-summary` 的区组配对准确率差。每项要求差至少 +0.15、单侧 exact `p≤0.025`；同时 `verified-correct` 与 `rejected-false` 的总体准确率都必须至少 0.85。

## 3. 主结果

| 表示 | n | 准确率 | 发布率 |
|---|---:|---:|---:|
| raw-only | 80 | 0.850 | 0.650 |
| correct-summary | 80 | 1.000 | 0.500 |
| verified-correct | 80 | 1.000 | 0.500 |
| false-summary | 80 | 0.000 | 0.500 |
| rejected-false | 80 | 0.650 | 0.150 |

| 冻结效应 | Mean Δ | Bootstrap 95% | 单侧 exact p | 效应门 |
|---|---:|---:|---:|---|
| compiler rescue | +0.150 | [+0.075,+0.237] | 0.00195313 | PASS |
| verification recovery | +0.650 | [+0.575,+0.738] | 0.00000095 | PASS |
| correct summary − raw | +0.150 | [+0.075,+0.237] | 0.00195313 | PASS |
| verified correct − correct summary | 0.000 | [0.000,0.000] | 1.00000000 | — |
| false summary − raw | −0.850 | [−0.925,−0.762] | 1.00000000 | — |

`verified-correct=1.000` 通过绝对门，`rejected-false=0.650` 未通过；冻结总 verdict 因而是 `NOT SUPPORTED`。

## 4. 非对称错误与去锚定失败

| Scenario | raw-only | correct-summary | verified-correct | false-summary | rejected-false |
|---|---:|---:|---:|---:|---:|
| positive（应发布） | 40/40 | 40/40 | 40/40 | 0/40 | 12/40 |
| negative（应沉默） | 28/40 | 40/40 | 40/40 | 0/40 | 40/40 |

错误摘要具有完全支配力：它把 positive 写成负期望时，40/40 沉默；把 negative 写成正期望时，40/40 发布。`FAIL` 与正确重算能完全修复后一类错误，却只能修复前一类的 12/40。这不是一般的验证无效，而是明显的**保守方向滞后**：一旦上下文先出现“负期望”摘要，后续拒绝与重算仍常留下沉默动作。

状态分层没有解释该故障。Easy/3 与 Hard/0 的 `rejected-false` 准确率分别为 0.600 与 0.700；positive 修复率分别为 4/20 与 8/20。两者都远低于安全门。

Rationale 只作事后诊断，不进入 verdict。值得注意的是，28 个 `rejected-false/positive` 错误动作中，有 26 个 rationale 实际写出了正确的 +8/9 或 +0.89，并在文字中明确倾向发布，却返回 `publish=false`。这提示故障不止是算术或相信错误摘要，还可能位于**自然语言理由到结构化动作字段的最后编译边界**。该模式需用新的预冻量表复核，不能从本研究直接断言内部因果。

## 5. 对系统设计的更新

I-M 的结论是“不要让 LLM 自己编译概率收益”；I-C 增加了第二条：**也不要把未经认证的派生数字和可信结果同时交给同一个上下文，再期待一个 `FAIL` 字符串完成隔离。**

当前更安全的结构应是：

```text
原始合约 → 确定性 compiler → 独立验证/类型检查 → 只把通过后的规范对象交给决策模型
                                           ↘ FAIL 时硬拒绝，不把坏摘要送入模型
```

下一实验应比较两种执行边界：

1. `sanitize-before-context`：验证器在模型调用前删除失败摘要，只暴露可信重算；
2. `typed-action-gate`：模型给出动作后，由确定性策略检查其是否与已验证的期望值符号一致；不一致时拒绝执行或要求重新决策。

核心检验应保留本研究的 false-summary 攻击，但把“模型被告知忽略它”改成“模型根本看不到它”。若这能把 positive 修复率从 0.30 提高到至少 0.85，贡献将从 prompt engineering 升级为清晰的系统边界结果。环境级 I-T 复制应等这一门通过后再做；参与者付费仍应暂停。

## 6. 实施完整性

400/400 个预定结果全部保留，20/20 区组完整，源数据与 public 镜像逐字节一致。运行中出现三次 provider 输出超过预算后的 parse failure，分别在已有 4、224、271 个成功结果时，把后续调用预算由 96→256→512→1024 token。每次都先写 amendment 和新冻结清单；失败调用未保留，既有结果未重跑，prompt、顺序、schema、真值、终点和判据未改。

因此本研究是带三次输出预算实施修正的项目内前瞻性检验，不应写成“无修正确认”。最终保留 400 次成功调用，另有 3 次未保留 parse failure。147/147 单元测试通过。

| 产物 | SHA-256 |
|---|---|
| `src/data/founder-payoff-compiler.json` | `96f667fe1cbed12c0ff8feb9c03d0a07b3ba6f0c0e8d0c779c2f93e76097df91` |
| 初始冻结清单 | `9fdd5eb71e2d11cea91ebedf69e631914fbe52c7f86c1a634323a8cf37cdb5fa` |
| Amendment 1–3 冻结清单 | `c3d3dc…`、`da7b19…`、`14a7c3…` |

密钥未写入源码、结果或报告。
