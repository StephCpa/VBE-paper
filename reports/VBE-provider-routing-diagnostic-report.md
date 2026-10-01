# VBE DeepSeek 模型路由诊断事件报告

**日期：** 2026-09-13  
**性质：** 事后 scratch diagnostic；不属于 E-BUY-EV-L 或 E-BUY-TEMP-R 的冻结调用  
**结论：** `DOCUMENTED V4-TO-V4.1 FLASH ALIAS PLUS V4.1-FLASH-SERVING-IDENTITY-SPECIFIC OUTPUT COLLAPSE`

## 1. 一句话结论

DeepSeek 于 2026-09-10 正式发布 V4.1 Flash，并声明 API canonical name 为 `deepseek-flash`；旧 `deepseek-v4-flash` 暂时路由到 V4.1 Flash。因此当前 `/models` 只公布 `deepseek-flash` 并不是未解释的 account anomaly，而是与官方迁移一致。任意乱写的模型名仍明确报 400。显式使用 `deepseek-flash` 在历史正控上返回同一常量；但在官方计划把 Pro 也改路由到 V4.1 Flash 之前，同一 prompt 在 `deepseek-v4-pro` 上返回合理购买动作，同一 RULES 前缀加无关算术后缀也返回预定的不同 JSON。因此 harness、parser、RULES 前缀和 provider 平台整体均不是充分解释；塌缩定位到 provider-labeled V4.1 Flash serving identity。

## 2. 诊断结果

| 检查 | 结果 | 含义 |
|---|---|---|
| DeepSeek V4.1 官方公告 | canonical API name 为 `deepseek-flash`；旧 V4 Flash 名称暂时路由到 V4.1 Flash | 解释当前 alias 与目录结构 |
| 账户 `/models`（2026-09-14 01:23 UTC） | 仅 `deepseek-flash`、`deepseek-v4-pro` | 与迁移期官方命名一致 |
| 故意不存在的名称 | HTTP 400，错误显式列出上述两个支持名称 | 排除 generic silent fallback |
| `deepseek-v4-flash`，去掉 `thinking` | HTTP 200，返回 `deepseek-flash`，fingerprint `aeb56401…cb669` | 去掉 `thinking` 会产生 reasoning tokens，但不改变身份映射 |
| `deepseek-flash`，thinking disabled | HTTP 200，同 fingerprint | 两个名称当前进入同一可观测 serving identity |
| `deepseek-flash` 重放一条历史 exact-narrow prompt | 同一常量 JSON，18 completion tokens | 排除请求别名单独造成常量输出 |
| `deepseek-v4-pro` 重放同一历史 prompt（00:44 UTC） | `giveChits=1`，不同 fingerprint | 在 04:00 UTC 计划改路由之前，harness、prompt、schema 与 parser 在同 endpoint/account 上健康 |
| Pro + 同 RULES + 无关算术后缀 | 精确返回外部预定的另一 JSON | 共享 RULES/cache prefix 不支配输出，suffix 被读取 |

官方参考：[V4.1 Flash 发布公告](https://deepseek.com/news/deepseek-v4-1-flash/)、[Lists Models](https://api-docs.deepseek.com/api/list-models)、[Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/)。

账户显式拒绝未知名称，而对旧 Flash 名称保留兼容映射。后者现已由官方公告确认，不再只是路由假设。需要保留的不可验证边界是：历史调用没有 returned model/fingerprint，故不能把 9 月 8 日及更早的 Flash 结果与当前 V4.1 Flash 对齐到同一权重身份。

## 3. 对 96/96 常量的正确定性

保留的事实是：同一 endpoint 与同一请求名下，历史 12/12 正例在当前窗口变为 0/12；EV-L + TEMP-R 的 96 个不同 prompts 返回一个字节级常量。新诊断表明，该常量在显式请求账户目录中的 `deepseek-flash` 时仍出现。

但我们不再把它提升为一个新研究主线，也不将其表述为某个可验证权重模型的 drift。最强可支持表述是：

1. 发生了官方记录的 V4→V4.1 Flash alias 迁移；
2. provider-labeled V4.1 Flash serving identity 在该工作负载上出现跨家族零熵 output collapse，而 04:00 UTC 改路由前的 Pro 正控没有；
3. 历史回包未保存 returned model/fingerprint，因而无法确认两个时间窗口的后端身份相同；
4. 这是方法学与工程警报，不是对 wrapper economics 或底层模型能力的发现。

## 4. 对研究路线的影响

- 撤回“把 temporal reproducibility 转为首要研究对象”的优先级提升；
- E-BUY-EV-L 仍是 `TIER MANIPULATION NOT VALIDATED`，不恢复 grounding 归因；
- E-BUY-TEMP-R 作为一个可审计的 endpoint-level temporal instability / output-collapse 记录保留，但降为 methods/limitations 素材；
- 原始主线并未等待 E-BIS、E-CI 或 C-M：三者已分别完成，结果为显式信念通道不敏感、无实质行动 ITT、以及固定供给下集中度因果降低流通速度。

xAI 跨供应商对照未运行，因为执行环境中没有 `XAI_API_KEY`。同账户、同 endpoint、且发生在官方 Pro 改路由截止点之前的 Pro 对照已提供更强定位，因而 xAI 不再是当前诊断的必要缺口。截止点后 `deepseek-v4-pro` 也将路由到 V4.1 Flash，不能再充当独立 Pro 身份。

## 5. 治理修复

1. 每个新研究在冻结前保存账户 `/models` 目录、请求名称和允许的 returned-model 集合；意外映射必须在首次 target call 前 abort。
2. 所有新调用保存 returned model、fingerprint、response ID、usage、白名单 headers、raw structured output 与 hash，不保存密钥。
3. 所有分析器必须是冻结产物的纯函数，在无任何凭证或 ambient LLM config 时完成。`analysis-keyless.test.ts` 已编码该约束，并对全部 37 个 analyzer 通过。

## 6. 可复核产物

- 结构化诊断：`vbe-engine/src/data/provider-routing-diagnostic.json`；
- 中央 null 污染审计：`VBE-central-null-contamination-audit.md`；
- 无凭证 analyzer 测试：`vbe-engine/src/lib/vbe/analysis-keyless.test.ts`；
- 受影响的冻结结果仍保持字节不变：`buyer-wrapper-ev-ladder.json` 与 `buyer-temporal-replay.json`。
