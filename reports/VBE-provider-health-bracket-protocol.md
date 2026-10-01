# VBE Provider-Health Bracket 协议

**版本：** 1.1  
**日期：** 2026-09-13  
**性质：** 通用服务健康闸；不是实验 treatment，不进入目标 estimand  
**冻结 dry-run SHA-256：** `1b96cff9ea31349a9b51c3c3b7ee3e5476e0a0c9ca692ffe1bbddb9569b9219d`
**修订：** 首次 bracket 调用前的 baseline-only 修订；anchors、数值闸和 dry run 均未改变。

## 1. 目标

每个 provider-facing 研究首次 target call 前和最后一次 target call 后，用同一组冻结 anchors 验证：账户模型目录与身份映射稳定；外部可判定的 JSON 任务正常；明确正、负收益产生分离行动；raw responses 不处于常量塌缩。该闸区分“服务健康但历史 VBE 行为改变”与“服务/接口退化”。

## 2. 运行级冻结计划

每项目标研究必须在自身 manifest 中冻结 `ProviderHealthPlan`，包含 `studyId`、`servingEraId`、`eraBaselineMode`、`eraBaselinePath`、`requestedModel`、`allowedReturnedModels`、完整 `expectedCatalogModels`、是否要求 fingerprint、historical-sentinel 解读，以及唯一 output path。冻结 plan 后才能运行 pre-flight；CLI 临时参数不能替代该计划。

某个新 serving era 的第一项研究使用 `eraBaselineMode=establish`。不存在旧 baseline 是正常状态，不与历史模型 fingerprint 比较；只有该研究的 pre/post 均健康且身份一致，runner 才创建 era baseline。后续研究必须使用 `eraBaselineMode=compare`，其 pre-flight catalog、请求名称、returned-model set、fingerprint set 和 prompt hashes 必须与 baseline 一致，否则不得开始 target calls。baseline 不证明权重恒定，只固定可观察服务身份。

## 3. 每个 bracket 的 14 个 anchors

| 组 | N | 用途 | 依赖历史 VBE 结果 |
|---|---:|---|---|
| External controls | 4 | 算术、大小比较、字符计数、奇偶，映射到四种精确 JSON | 否 |
| Dominant positive | 4 | 立即结束，购买确定得分且保留得 0 | 否 |
| Dominant negative | 4 | 立即结束，购买得 0 且保留确定得分 | 否 |
| Historical sentinels | 2 | E-BUY-WRAP-D exact narrow 与 E-BUY high-guaranteed 的逐字 prompt | 是，但不进入 health gate |

External controls 使用同一 `RULES` system prefix 与三字段 schema，但正确答案由基本算术/逻辑外部决定。Historical sentinels 只记录 behavioral drift，其改变不能单独使 health gate 失败。跨模型或跨 provider-labeled era 时，它们预期可能偏离旧 Flash 结果；这种偏离只描述模型迁移差异，不能解释为服务退化或模型等价性证据。

## 4. 事前数值闸

每个 pre/post bracket 必须同时满足：

- 14/14 调用成功，14 个 anchor IDs 唯一；
- 账户 catalog 与 `expectedCatalogModels` 完全相等；
- 14/14 prompt hashes 等于冻结 builders；raw hashes 可重算；response ID 和 returned model 非空；
- returned model 均在 `allowedReturnedModels` 中；
- 若 plan 要求 fingerprint，14/14 非空，且 bracket 内只有一个 fingerprint；
- external-control exact rate = 4/4；
- dominant-positive buy rate ≥ 0.75（至少 3/4）；
- dominant-negative buy rate ≤ 0.25（至多 1/4）；
- unique raw responses ≥ 4；raw-response entropy ≥ 1.25 bits。

任一项失败即 bracket unhealthy，不允许事后人工 override。

## 5. 决策树

1. **Pre-flight unhealthy：** 不允许 target calls，保留失败记录。
2. **Pre healthy，post unhealthy：** 保留 target calls，但标记 `POST-FLIGHT FAILED — NOT SUBSTANTIVELY INTERPRETABLE`，不补跑。
3. **两端 healthy，但 prompt hashes、returned-model set 或 fingerprint set 改变：** 标记 `BRACKET IDENTITY CHANGED`，不池化为同一稳定窗口。实现明确比较 pre/post fingerprint sets；这正是 mid-study rollout guard。
4. **两端 healthy 且 identity 相同：** 只有 `BRACKET HEALTHY` 允许解释 target contrasts。

Pre-flight 必须紧邻首次 target call，post-flight 必须紧邻最后一次 target call；两者之间不可插入其他 provider-facing 研究调用。

## 6. 产物与边界

每次保存 catalog、raw response、prompt/request/raw hashes、response ID、returned model、fingerprint、usage 与白名单 headers，不保存密钥。第一项健康研究结束后另存 serving-era baseline；后续 preflight 必须机器比较。该闸不证明权重不变，不排除同一 fingerprint 下的隐藏 rollout，也不把历史行为改变自动当作服务故障。

## 7. 运行约定

命令为 `run-provider-health.ts --plan <frozen-plan.json> --phase pre|post`。Example plan 只是 schema 模板，不是已授权的运行计划：`vbe-engine/src/data/provider-health-plan.example.json`。
