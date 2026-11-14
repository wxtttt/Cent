# 不做历史数据迁移

应用尚未上线、没有真实用户数据，因此标签分普通/特殊、预算改月度记录、成员实体等改动都直接按新模型落地，不写兼容旧结构或迁移旧数据的代码。

## Status

Accepted

## Consequences

- `GlobalMeta` 里旧的 `budgets`（单条规则式）、`personal[uid].tagGroups`、`onlyTags` / `excludeTags` 等字段可以直接删除或改义，不需要保留读取分支。
- 未来看到缺失的迁移路径，不应视为遗漏：这是本决定的结果。等真正上线、有存量数据后，本 ADR 失效，届时需要重新评估。
