# VBE Study W-MER：Engaged-Money 修复未完成报告

**Study ID：** `VBE-W-MER-ENGAGED-MONEY-REPAIR`  
**冻结协议：** v1.0，manifest SHA-256 `2baaa3c2f011a6a54a15563f482630f97c12c534590c893455e65e592998f62b`  
**执行日期：** 2026-09-14  
**正式 verdict：** `INCOMPLETE`  
**证据后果：** 不产生 priced-semantic 结论，不升级 Paper 1。

## 1. 已完成部分

14-call pre-flight 健康，并在 catalog、请求/返回模型、fingerprint 与全部 health prompt hashes 上匹配既有 V4.1 Flash era baseline。外部 controls 4/4 精确；dominant-positive 为 4/4 buy；dominant-negative 为 0/4 buy；raw-response entropy 为 2.325 bits。

Target runner 原子保留 26/50 个 cells，共 2,100 个完整 cell 逻辑调用。五个种子完成全部五臂；第六个种子只完成其预定第一臂 `money-bilateral`。所有保留 run 均通过 schema、notice、call count、重算 schedule hash、重算 mean score 与 mechanism 检查。

## 2. Transport 中断与调用核算

下一 cell `13577|gift-bilateral` 停止返回进度。冻结的 HTTP adapter 没有 request-level timeout。等待超过三分钟后人工中断，且没有写入 partial cell。随后从同一冻结 cell 重启，再次停滞，依照 [Transport Amendment 1](VBE-welfare-money-engagement-repair-amendment-1.md) 停止。

两次未完成尝试可能包含数量不可恢复的已返回响应，均永久排除。因此 `3,930` 只是完整研究计划的 retained target count，不能再描述为本次 incomplete workflow 的实际尝试调用数。

随后 post-flight 在 model-catalog 请求阶段返回 `ConnectionRefused`，未写出完整 post bracket。Health artifact 只有健康 pre bracket；target window 没有完成身份封闭。

## 3. 部分诊断，不是研究结果

以下数字只用于审计。正式 gate 要求十个完整 paired seeds，因此全部为 false。

五个完整 blocks：

| Arm | Mean score | H–H swaps | 被点名 engagement |
|---|---:|---:|---:|
| neutral | 53.5125 | 8/51 | 0 sales；0 gift intentions |
| gift-exact | 55.8875 | 42/51 | 8/97 Easy gift intentions |
| money-exact | 53.2750 | 6/51 | 0/49 mark sales |
| gift-bilateral | 53.1000 | 10/51 | 1/97 Easy gift intentions |
| money-bilateral | 53.5875 | 5/51 | 2/42 mark sales |

完整 blocks 的 money sale-rate seed-level effect 只有 `+0.0364`，远低于冻结的 `+0.25` engagement MRES；matched gift 相对 neutral 的 gift-intention effect 也只有 `+0.0111`。Exact gift 在描述上仍活跃，但五对数据不能通过冻结的 Holm family，且缺失 post bracket 已独立阻断解释。

这些部分模式提示：显式写出双方角色没有修复操纵，而且可能破坏了原本有效的 gift package。它只能生成假设，不能支持 priced-semantic boundary，也不能支持其不存在。

## 4. 决策

W-MER v1.0 不再恢复。相同 cell 的第二次停滞满足 amendment 停止条件；更晚的 post-flight 也无法恢复被中断的 target window。观察结果后不修改 wording、timeout、seed、threshold 或 verdict。

Paper 1 继续以 W-RG 与 W-SGB 为中心。原结论保持不变：当前 exact-money control 未 engaged，因此不设定 priced-semantic boundary。未来 money study 必须使用新协议和新 bracket era，在调用前冻结 transport timeout，并把本次 explicit-bilateral packages 视为已观测失败操纵，而不是可复用 pilot。

## 5. 不可变 artifacts

- Retained result：`vbe-engine/src/data/welfare-money-engagement-repair.json`，SHA-256 `54a704627347b631592ea34e624604f8ffc6dbb4b44da896d8ae5010a052bb13`。
- 仅健康 pre-flight：`vbe-engine/src/data/provider-health-welfare-money-engagement-repair.json`，SHA-256 `9ac102ed0bdfc0980b767711fa388054f1ce7986e8e47e7584e7a8b9bbca2aae`。
- Transport amendment：`VBE-welfare-money-engagement-repair-amendment-1.md`，SHA-256 `9a0c80d017d77da0726dcfe7598f90c232904f4cf41167051c2a3f93d155e94a`。

