# VBE 中央 null 结果服务污染审计

**日期：** 2026-09-13  
**方法：** 只读已有产物，零模型调用  
**结论：** E-BIS 与 E-CI 不是在 9 月 13 日观测到的 Flash 单常量塌缩下产生的 null；C-M 为纯 robot 因果干预，与 hosted-model serving 无关。

## 1. 时间边界

| 产物 | `generatedAt` (UTC) | 观察 |
|---|---|---|
| C-M | 2026-09-05 00:47:18 | 512 seeds，零 API |
| E-BIS | 2026-09-05 01:06:50 | 299 次 LLM calls |
| E-CI | 2026-09-05 02:01:17 | 2,091 次 LLM calls |
| E-BUY-WRAP-D | 2026-09-08 06:04:40 | 更晚的健康锚点：exact narrow 12/12，exact public-hard 0/12 |
| E-BUY-EV-L | 2026-09-13 15:26:28 | 72/72 同一 parsed proposal |

E-BIS/E-CI 不仅早于已知塌缩窗口，还早于 9 月 8 日那个明确能区分接口与行动的服务锚点。因此，如果 Flash serving identity 后来发生切换，可支持的时间区间是“9 月 8 日健康锚点之后、9 月 13 日 EV-L 完成之前”。由于旧研究没有 per-call timestamp、returned model 和 fingerprint，这不是权重身份证明。

## 2. E-BIS

299 个 LLM proposals 有 4 种 action patterns，经验熵为 1.478 bits；把行动和可用的 belief fields 合并后，299 条 parsed outputs 有 11 种，熵为 2.491 bits。因此它不是全局单常量输出。

Belief 结果本身仍很集中：216 份报告中 204 份是 `(0.5,0.5)`，另有 8 份 `(0.9,0.9)`、3 份 `(0.93,0.93)` 和 1 份 `(1,1)`；216/216 都使 `pAccept=pSecond`。这保留了原有窄结论：修复后的显式信念通道仍对不同目标不敏感，但不证明潜在信念缺失。

**审计 verdict：** `NOT CONTAMINATED BY THE OBSERVED FLASH CONSTANT COLLAPSE — ORIGINAL NARROW INTERPRETATION STANDS`。

## 3. E-CI

2,091 个 LLM proposals 有 4 种 action patterns，总熵 1.490 bits。更重要的是，0/2/4 三个证书剂量臂各有 697 次调用，每臂内都出现全部 4 种 proposal patterns，熵分别为 1.455、1.415 和 1.581 bits。各臂 seller-intent 计数覆盖 1–6，buyer-intent 覆盖 0–3，trade 覆盖 0–3。

因此 E-CI 的 `NO MATERIAL ACTION ITT` 不是一个“模型什么都输出同一值”的仪器伪 null。模型在每个处理臂内都产生明显行动变异，而冻结 4−0 ITT 仍未达幅度与随机化推断门。

**审计 verdict：** `DISCRIMINATING ACTION OUTPUT CONFIRMED — ITT NULL REMAINS INTERPRETABLE`。

## 4. C-M

C-M 的 runner 只调用 `runMarkConcentrationArm`，execution 使用 `runPopulationAsyncPaired` 与冻结 `kw` robot policy；路径中无 `grokChat`、`observedChat`、`fetch`、API key 或 LLM config。数据为 512 个 seed blocks、6,656 个 robot population-runs，model calls 为 0。

**审计 verdict：** `IMMUNE TO HOSTED-MODEL SERVING COLLAPSE`。

## 5. 边界

- E-BIS/E-CI 没有保存 raw response strings，所以这里是 parsed-output entropy，不是 raw token entropy。
- 它们没有 per-call timestamp、returned model 或 fingerprint，所以无法重建历史 backend weight identity。
- `generatedAt` 是研究完成界，不是每次调用的时间戳。

结构化审计见 `vbe-engine/src/data/central-null-contamination-audit.json`。
