# VBE Study W-CO：福利挤出效应跨时代复制报告

**版本：** 1.0 · 2026-09-14  
**状态：** 完成；项目内前瞻复制，非外部注册  
**正式 verdict：** `WELFARE CONTRAST WITHOUT JOINT BEHAVIORAL SUBSTITUTION`  
**模型：** provider-labeled V4.1 Flash；canonical API name `deepseek-flash`

## 1. 结论

Gift-talk 相对 money-talk 产生了大且稳定的福利提升，但没有复制历史所暗示的“无偿 gift 替代 mark sale”机制。18 个配对 seeds 中 17 个福利差为正，平均每账户提高 `+2.3333` 分（bootstrap 95% `[+1.7292,+2.9306]`；零中心单侧 exact sign-flip `p=0.00001526`），超过冻结 `+0.5` MRES。

联合行为门失败：内部 Easy→Hard gift-rate 只增加 `+0.03158`，虽方向检验为 `p=0.001953`，远低于冻结 `+0.25` MRES；money-talk 与 gift-talk 的内部 mark sales 都是 `0/198`，sale-rate 差为 0、`p=1`。因此本研究支持两套公共话语包的福利总效应，不支持预定的 crowding-out behavioral substitution。

## 2. 执行与完整性

- 冻结 manifest SHA-256：`af55753acd49f570555c945ff515ed668e00216d5857e32b79ee0b6b82578f2d`；冻结时 target/bridge/bracket calls 均为 0。
- 18 个 fresh seeds 与 838 个历史已用 seeds 的交集为 0；两臂顺序为 9/9。
- 36/36 target cells 完成，2,728/2,728 target calls；12/12 shared-item bridge calls；14-call preflight 与 14-call postflight。
- 18/18 blocks 的 structural schedule hash 和调用数逐 seed 匹配；0 API/schema/parse failure；所有 controllers 均为 LLM。
- private/public 结果 mirrors 字节相同，SHA-256 均为 `f6438915387c05fc1eb1b4a94c9b70ba7ae4a77b0addd0e6bf1ed86d66779c96`。

Provider bracket 为 `BRACKET HEALTHY`：pre/post 均为 4/4 external controls、4/4 dominant positives、0/4 dominant negatives、6 个 unique raw responses、2.3249 bits entropy；catalog、14 个 prompt hashes、returned model `deepseek-flash` 与 fingerprint `aeb56401ca74e127821c4f9126dcb669` 前后一致。该 run 因而建立 `deepseek-v4.1-flash-post-2026-09-14T04:00Z` serving-era baseline。

## 3. 冻结结果

| 指标 | Money-talk | Gift-talk | 配对差（预定方向） | 冻结判断 |
|---|---:|---:|---:|---|
| Mean score | 54.5417 | 56.8750 | gift−money `+2.3333` | 通过 MRES 与 exact gate |
| Interior Easy→Hard gifts | 0/364 | 11/364 | rate `+0.03158` | 方向非零但未达 +0.25 MRES |
| Interior mark sales | 0/198 | 0/198 | money−gift `0` | 未通过 |

主要福利差的 median 为 `+2.5313`，范围 `[−0.6875,+4.6875]`，正向 seed share 为 `17/18`。正式 gates 为：complete、integrity、provider bracket、welfare magnitude、welfare exact 全通过；gift substitution 与 sale substitution 均未通过。

## 4. Shared-item bridge

12 个 prompt 均逐字匹配历史源、instrumentation 完整。8 个历史 positive 项在新 era 中全部由 buy 变为 no-buy；4 个历史 negative exact-public-hard 项维持 no-buy。转移矩阵为：

- prior buy → current buy：0；
- prior buy → current no-buy：8；
- prior no-buy → current buy：0；
- prior no-buy → current no-buy：4。

与此同时 provider health 的独立 dominant-positive controls 为 4/4 buy，所以 bridge 并非全局不行动或 endpoint health failure，而是历史 buyer interface 的跨时代行为漂移。按冻结协议，该 bridge 只作描述，不进入 W-CO verdict，也不建立新旧模型等价性。

## 5. 事后机制审计：福利来自 H–H check swap

冻结的 mechanism gate 只测预定的 Easy→Hard gifts 与 mark sales。结果出来后，对完整 meeting traces 的描述性审计发现了未预定的主要路径：

| 事后指标（24 轮） | Money-talk | Gift-talk | Gift−money |
|---|---:|---:|---:|
| H–H mutual check swaps | 27/154 (0.1753) | 138/154 (0.8961) | seed-rate `+0.7098` |
| Hard solved assignments | 600/1,728 (0.3472) | 723/1,728 (0.4184) | `+0.07118` |
| 全部 non-none transfers | 41 | 378 | +337 |
| Easy→Hard gifts（含最终轮） | 0 | 12 | +12 |
| Hard→Easy gifts | 0 | 146 | +146 |
| Easy→Easy gifts | 1 | 28 | +27 |

H–H swap rate 在 18/18 seeds 都上升，描述性 mean `+0.7098`；Hard solve rate 在 17/18 seeds 上升，mean `+0.07118`。这些是事后指标，相关 exact p 值不属于 confirmatory claims。

福利账目可以机械闭合：gift-talk 比 money-talk 多 123 次 Hard solved assignments，按 `R=3` 贡献 `+369` 总分；全体 18×8 个账户的实际总福利增量为 `+336`，差额 `−33` 是 check salvage 的净损失。因此福利提升几乎完全由更多 Hard 解题所驱动，而不是 mark exchange。

最合理的窄解释是：模型把“无偿给 check”的公共话语泛化到未被文字指定的角色与配对，尤其让两个 Hard agents 互相提交 check，从而把各自较低的 own-check 成功率换成较高的 partner-check 成功率。这是**instruction-induced cooperative check circulation / role-generalization**，不是已识别的 monetary crowding out。

## 6. 可写与不可写的主张

可以写：

> 在健康且身份稳定的 V4.1 Flash serving bracket 中，gift-talk package 相对 money-talk package 显著提高福利；预定的 gift-for-money substitution 未复制。事后 trace audit 将福利提升定位到跨角色泛化引发的 H–H mutual check swaps 与更高 Hard solve rate。

不可写：money 相对 neutral/no-policy 基线降低福利；gift 是已识别中介；模型形成了无偿赠与制度；该效应与旧模型相同；或 public talk 一般提高福利。

## 7. 下一步

最有信息量的后续不是重复 W-CO，而是一个独立冻结的角色泛化分解：neutral、原 gift-talk、严格 Easy-only gift（明确禁止 Hard 给出 check）和 H–H mutual-verification 四臂。它能区分原话术的直接 Easy→Hard 路径、非预期 H–H swap 路径与普通公共合作 framing。该研究必须使用新的 seeds，并把本次 H–H 发现标作 hypothesis-generating；在此之前不升级为中介结论。

数据与可复现分析：`vbe-engine/src/data/welfare-crowding-out.json`、`provider-health-welfare-crowding-out.json`、`provider-era-baseline-deepseek-v4.1-flash-post-20260914.json`、`src/lib/vbe/analyze-welfare-crowding-out.ts` 与 `analyze-welfare-crowding-out-mechanism.ts`。
