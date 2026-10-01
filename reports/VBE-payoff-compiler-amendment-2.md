# VBE Study I-C 实施修正 2

**时间：** 2026-09-04  
**适用协议：** `VBE-payoff-compiler-protocol.md`

在 224/400 个成功记录（11 个完整区组加第 12 区组前四项）后，下一个 raw negative 决策在 256-token 上限内未形成可解析 JSON，未写入数据。累计有 2 次未保留 parse failure。

唯一修正：把后续 I-C 决策 `maxTokens` 从 256 提高到 512。prompt、system message、条件顺序、schema、正确答案、统计量和 verdict 均不变；224 个已保留结果不重跑。

输出预算只控制响应能否闭合，不改变输入处理；但因修正发生在部分结果已观察后，最终报告必须披露两次预算修正，不能称为无修正确认。

