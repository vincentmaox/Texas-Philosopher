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


---

## 2026-06-08 — 项目文档化：CLAUDE.md / 重建方案 / 开发手册 / 测试方案

| 文件 | 用途 |
|---|---|
| `CLAUDE.md` | 项目级 Claude Code 指令（v1+v2 双版本规则、会话日志约定、模型路由） |
| `docs/德州哲学家 v2 — 完全重建方案.md` | 7 阶段完整重建方案存档 |
| `v2/DEV_MANUAL.md` | v2 开发手册（架构 + 添加新功能 + 调试） |
| `v2/MANUAL_TEST_PLAN.md` | QA 人工测试方案 12 章 |
| `conversation_log/2026-06-08.md` | 当日会话日志 |

Commit: `519358f docs: v2 开发手册 + 人工测试方案 + 会话日志约定`

---

## 2026-06-09 — AAA 视觉升级 + Tauri .exe + 引擎 bug 修复

### 用户反馈起点

> 进入后感觉就是一个网页版的 20 年前游戏，画面粗糙……牌显示很小让人没有沉浸感……对话一闪而过……打牌规则有时候也会错乱……缺乏新手训练模式……最后是一个 exe 文件点击就可以打开一个专业游戏界面。

### 完成内容

| Commit | 摘要 |
|---|---|
| `eb5d559` | AAA 视觉升级 + Tauri .exe 打包 + 新手教学 |
| `949b2c0` | 修复 3 个扑克引擎规则 bug |
| `56ff15c` | 河牌后牌局不结束 + 加大胜负反馈 |

**1. AAA 视觉升级**
- 牌面 56×80 → 130×182 px
- 调色板：GitHub 编辑色 → 暖色赌场木纹 + 金边
- 牌桌：径向晕影 + 木质外环 + 金色内环 + 聚光渐变 + 隐式品牌字
- 活跃座位脉冲金光
- AI 思考 450ms → 1200ms（读小动作窗口）

**2. 持久化对话面板**（替代一闪而过的 Toast）
- 320 px 右侧 sidebar，8 条历史保留
- MBTI 头像 + 16 色徽章 + 行动徽章 + 思考过程
- 旧消息淡化 + 新消息高亮+滑入动画

**3. 5 步 Balatro 风新手教学**
- 欢迎 → 底牌 → 行动栏 → 公共牌 → 学习模式
- 首次进入自动弹出，localStorage `tp_v2_tutorial_done` 记忆

**4. Tauri 2 .exe 打包**
- `v2/src-tauri/` Rust 项目结构
- `v2/TAURI_BUILD.md` 完整打包指南
- 产物 ~6 MB NSIS / 10 MB MSI / portable .exe（vs Electron 150+ MB）

**5. 引擎 3 bug 修复**
- 盲注下标错位（破产座位导致 activeSeats 与 state.seats 不对齐）
- 街道提前推进（notAllIn ≤ 1 时未给最后玩家决策机会）
- 加注上限错（max 应为 chips + currentBet）

**6. 河牌结算可见性**
- phase = showdown/result 时强制隐藏 action bar
- 3 秒 Toast → 居中大弹窗（标题 + 牌型 + 底池 + 摊牌列表）

### 验证

| 验证 | 状态 |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npm run build` | 135.82 KB JS / 45.76 KB gzip |
| 浏览器加载 + 教学 | ✅ 用户实测 |
| 牌面大小观感 | ✅ "牌变大了沉浸感变强了" |

### 待办

- All-in 边池场景未测
- DeepSeek V4 API key 配置后实测对话质量
- 一次性 Rust 安装 + Tauri 首次打包（需用户提供 1024×1024 图标）
