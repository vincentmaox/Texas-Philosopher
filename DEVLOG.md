# 项目开发日志

## 2026-06-08 — 项目创建 & E2E 验证

### 完成内容

1. **完整游戏开发**：12 个 JS 模块 + HTML + CSS，纯前端零依赖
2. **核心引擎**：德州扑克完整规则（盲注/下注轮/翻牌/转牌/河牌/摊牌）
3. **6 个 AI 角色**：老渔夫、梭哈狂人、密度探测者、学院派、后浪、虚空建筑师
4. **12 种突变**：小丑牌风格规则修改器
5. **决策评分系统**：5 大哲学原则实时反馈
6. **每日系统**：连胜、3 个每日任务、每周事件
7. **技能树**：9 个被动技能
8. **地图系统**：6 片海域 + 港口随机事件
9. **可选 LLM 集成**：OpenAI 兼容 API，AI 可即兴对话

### E2E 验证结果

| 功能 | 状态 |
|---|---|
| 页面加载 + 介绍 Modal | ✅ |
| 地图渲染（6 节点 + 密度 + 突变） | ✅ |
| 进入训练码头 | ✅ |
| Preflop/Flop/Turn 推进 | ✅ |
| 玩家加注 → AI 响应 → 赢底池 | ✅ |
| 弃牌弱牌 → 思维评分 +5 | ✅ |
| 结算 Modal → 下一手 → 庄位轮转 | ✅ |
| AI 角色对话触发 | ✅ |
| 位置标签动态显示 (BB/SB) | ✅ |

### 修复的 Bug

1. **对手重复**：`generateNode()` 随机选对手时可重复 → 加入去重逻辑
2. **位置标签硬编码**：HTML 写死 BTN → 改为 `startHand()` 动态计算 SB/BB/BTN/UTG
3. **UTG 跳过**：`activeSeatIndex` 直接设 UTG 导致 +1 递增跳过 → 改为设 UTG 前一位

### 待测项目

- River → 摊牌完整流程
- All-in 场景
- 突变效果（密度迷雾、盲眼河牌、强制 All-in 等）
- 每日任务完成流
- 技能树解锁
- LLM 集成
- 港口事件
- 时间池/资金池耗尽 → Game Over

---

## 2026-06-08 — v2 完全重建（Vite + TS + Canvas）— Phase 0-7 全部完成

### 动机

v1 三大痛点：
1. 牌面动画用旋转 CSS keyframe，不真实
2. 6 AI 只有参数差异，无人格深度
3. 启动 bat 杀进程，无 Build 流程

v2 目标：对标 Duolingo 粘性 + Balatro 视觉 + 杀戮尖塔进度 + PokerSnowie 训练，一款让人上瘾的真实感德州扑克哲学训练模拟器。

### 技术栈

| 层 | 选型 |
|---|---|
| 构建 | Vite + TypeScript |
| 样式 | Tailwind CSS + CSS Vars |
| 图形 | Canvas 2D（牌桌）+ DOM（UI） |
| 状态 | 自研响应式 Store |
| 音效 | Web Audio API（程序化合成） |
| 持久化 | IndexedDB |
| AI | DeepSeek V4（增强）+ 规则引擎（降级） |
| 部署 | GitHub Pages 静态 |

### 七阶段交付

| Phase | 内容 | Commit |
|---|---|---|
| 0-1 | 项目基建 + 状态机扑克引擎 + Canvas 牌桌 | `0742a99` |
| 2 | 16型 MBTI AI（4组架构差异 + DeepSeek V4 + 规则降级） | `7213541` |
| 3 | 训练反馈（Balatro EV 管道 + 漏洞检测 + 报告卡 + 辅助渐降） | `c12e111` |
| 4 | Roguelike（5层分支地图 + 20级飞升 + 10哲学工具 + 5 Boss） | `d2296d3` |
| 5 | Duolingo 粘性（连胜 + 联赛 + 红心 + 每日任务） | `a942e3b` |
| 6 | Web Audio 音效 + 设置面板 | `a6e838a` |
| 7 | IndexedDB 持久化 + 端到端集成 | `94b1a2a` |

### 关键技术决策

1. **核心-增强双层架构**：规则引擎完整可玩，DeepSeek V4 仅是增强层
2. **状态机驱动牌局**：IDLE→DEALING→PREFLOP→FLOP→TURN→RIVER→SHOWDOWN→RESULT，每个状态可动画化
3. **EV 计算器**：preflop 查表 + postflop Monte Carlo 300 次
4. **边池管理**：calculatePots + distributePot 正确处理多 All-in 场景
5. **统一 Seat 模型**：人类和 AI 同一数组，消除状态不一致

### 最终构建

```
npm run build → 112.39 KB JS（gzip 39 KB），0 TS 错误，48 modules
```

### E2E 通过

map → 鱼塘 → 牌桌（fold/call/check/raise/allin） → 报告卡（D 等级 EV -10.1 BB） → 离桌（1000→975 + 已完成） → 刷新 → **持久化生效**

