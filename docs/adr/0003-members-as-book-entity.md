# 成员是账本内的独立实体

账本成员登记在 `GlobalMeta.members` 中，随账本的 `meta.json` 一起同步；所有同步端点的预算参与者都只读这份名单，不再依赖各自实现的 `getCollaborators()`。

## Status

Accepted

## Considered Options

- **从账单的 creatorId 反推成员**：不用新增实体，但账单越多越难维护，且无法登记「还没有记过账的人」。否决。
- **独立 entry 数据**：隔离最好，但要改 SyncEndpoint、导出结构与调度器，成本与收益不匹配。否决。
- **只在本机 localStorage 存名单**：多端成员不一致，预算的 joiners 会在另一台设备指向不存在的成员。否决。
- **GlobalMeta.members + 统一名单**：采用。`getCollaborators()` 保留为「导入协作者」的一次性来源，GitHub/Gitee 端提供一个手动同步按钮。

## Consequences

- 新预算的 `joiners` 留空表示「全部成员、且自动包含以后新增的成员」；原表单的「至少选择一位参与者」校验必须移除，统计侧 `joiners.includes(creatorId)` 要改成空数组即不过滤。
- 换同步端点不会导致参与者口径漂移；代价是远端仓库新增协作者后不会自动出现在成员表里，需要用户手动同步。
