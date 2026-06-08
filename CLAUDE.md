# 德州哲学家 · Texas Philosopher — Claude Code 项目指令

## 项目概述

一款纯前端、零安装的德州扑克哲学训练游戏。通过游戏机制训练"独立事件思维 / 鱼塘密度探测 / 捡钱而非挣钱 / 低成本试错"。

**核心约束：打开 HTML 即玩，无需 npm/build/server。**

## 技术栈

- 纯 HTML + CSS + Vanilla JS（零依赖）
- localStorage 持久化
- 可选 OpenAI-compatible LLM 接口增强 AI 对话
- 模块化：12 个 JS 文件，全部挂载到全局

## 文件结构

```
web_app/
├── index.html            # 单页应用入口
├── styles.css            # 深海主题样式
├── 启动游戏.bat           # Windows 一键启动
├── README.md             # 玩家使用说明
└── js/
    ├── cards.js          # 牌组 & 渲染
    ├── handeval.js       # 7选5 + 手牌强度评估
    ├── ai_engine.js      # 6 AI 角色 + 规则决策
    ├── llm.js            # OpenAI 兼容客户端（可选）
    ├── mutations.js      # 12 突变规则
    ├── scoring.js        # 决策评分引擎
    ├── skills.js         # 思维技能树
    ├── map.js            # 鱼塘节点 & 港口事件
    ├── daily.js          # 每日系统
    ├── game.js           # 核心引擎
    ├── ui.js             # DOM 渲染
    └── main.js           # 启动 & 事件绑定
```

## 关键架构决策

### 统一座位模型 (Unified Seats)

人类和 AI 存储在同一 `Game.seats[]` 数组，结构完全一致：
```js
{ id, isHuman, chips, holeCards, currentBet, folded, allIn, actedThisRound, name, opponent?, hiddenCardIndex }
```

**原因**：早期分别存储 player/opponent 状态导致同步 bug。统一后消除了所有状态不一致问题。

### 下注轮转

`activeSeatIndex` 设为 UTG 前一位，`_proceedToNextActor()` 的 +1 递增正好落在 UTG 上。同理 `_advanceStreet()` 的 post-flop 首位行动也用相同模式。

### AI 对手去重

`generateNode()` 中的对手选择尝试避免重复角色，只有在角色池耗尽时才允许重复。

## 已知问题 & 待测

- River → 摊牌 + 手牌评估完整流程未在 E2E 中验证
- All-in 场景（玩家或 AI）未完整测试
- 12 种突变效果大部分未触发测试
- 每日任务完成流未验证
- LLM 集成需配置 API Key 才能测试

## 开发约定

- **不引入任何 npm 依赖**——这是硬约束
- 新增 seat 级状态必须同时在 `enterTable()` 的人类和 AI 创建代码中添加
- 编辑 game.js 时注意 `_proceedToNextActor` 的循环递增逻辑，off-by-one 是高频 bug 源
- AI 对话先走规则台词（`getReactionLine`），LLM 可用时降级回规则台词
- localStorage key 前缀 `tp_`：`tp_save`, `tp_daily`, `tp_llm_config`, `tp_intro_done`

## 快速本地测试

```bash
cd web_app
python -m http.server 8765
# 浏览器打开 http://localhost:8765
```

或直接双击 `web_app/index.html`（部分浏览器 file:// 协议限制不影响核心功能）。

---

## v2 (`v2/`) — Vite + TypeScript + Canvas 重构

完整重构版本，2026-06-08 完成 Phase 0-7，2026-06-09 完成 AAA 视觉升级 + Tauri 打包。

### 技术栈

- Vite 6 + TypeScript 5 + Tailwind CSS 3
- Canvas 2D 牌桌 + DOM UI
- IndexedDB 持久化（3 表：profile/current_run/llm_config）
- Web Audio API 程序化合成音效
- DeepSeek V4 增强 + 完整规则引擎降级
- **Tauri 2** 桌面打包（~6 MB .exe）

### 快速本地测试

```bash
cd v2
npm install
npm run dev          # http://localhost:3000
npm run build        # → dist/，~135 KB JS

# 桌面打包（需 Rust + MSVC，详见 v2/TAURI_BUILD.md）
npm run tauri:dev
npm run tauri:build
```

### 关键文档

| 文档 | 用途 |
|---|---|
| `v2/DEV_MANUAL.md` | 开发者手册（架构 + 添加新功能 + 调试） |
| `v2/MANUAL_TEST_PLAN.md` | QA 人工测试方案（INIT/MAP/GAME/DAILY/LEAGUE/SETTINGS/PERSIST/AI/PROG/RESP/PERF/EDGE） |
| `v2/TAURI_BUILD.md` | 桌面 .exe 打包指南（Rust 安装 / 图标生成 / 故障排除 / 国内镜像） |
| `docs/德州哲学家 v2 — 完全重建方案.md` | 完整重建方案（7 阶段） |
| `DEVLOG.md` | 项目宏观日志 |
| `conversation_log/YYYY-MM-DD.md` | 每日会话日志 |

### v2 开发约定

- **不引入框架**：保持 Vanilla TS，禁止 React/Vue/Svelte
- **核心-增强双层**：LLM 是增强，规则引擎必须独立可用
- **事件驱动**：PokerEngine emit 事件，UI 订阅响应，不直接耦合
- **状态机驱动牌局**：所有阶段显式 `phaseChange` 事件
- **统一 Seat 模型**：人类和 AI 同一数组（沿用 v1 经验）
- **类型严格**：所有 public API 显式类型注解
- **PALETTE 集中管理**：颜色全部走 `v2/src/ui/theme/palette.ts`，禁止硬编码
- **Action Bar 必须跟随 phase**：进入 showdown/result/dealing/idle 必须 `hideActionBar`，否则会出现"过牌后按钮不消失"bug

### v2 关键架构组件

| 模块 | 入口文件 | 备注 |
|---|---|---|
| 扑克引擎 | `src/engine/poker-engine.ts` | 状态机驱动，事件订阅模式 |
| EV 计算 | `src/engine/ev-calc.ts` | preflop 查表 + postflop Monte Carlo 300 次 |
| 边池 | `src/engine/pot-manager.ts` | calculatePots + distributePot |
| 16 MBTI AI | `src/ai/personas/` + `decision-engine.ts` | NT/NF/SJ/SP 4 组架构差异 |
| Canvas 牌桌 | `src/ui/canvas/table-renderer.ts` | 径向晕影 + 木质金边 + 聚光渐变 |
| 持久对话面板 | `src/ui/components/dialogue-panel.ts` | 320px sidebar，8 条历史 |
| 新手教学 | `src/ui/components/tutorial-overlay.ts` | 5 步 Balatro 风首次自动弹出 |
| 结算弹窗 | `src/ui/views/game-screen.ts#showHandResult` | 居中大弹窗显示摊牌结果 |
| Tauri 壳 | `src-tauri/` | Cargo + tauri.conf.json |

### 已修复的高频 bug（不要再犯）

- **盲注下标错位**：破产座位（chips=0）会让 `activeSeats` 与 `state.seats` 不对齐 — 任何盲注/位置计算必须基于 `state.seats` 索引
- **街道提前推进**：`notAllIn ≤ 1` 不能直接 advanceStreet，最后一个非 all-in 玩家必须先 actedThisRound 且 currentBet 已 match
- **加注 max 错**：UI 加注 slider max 是 `chips + currentBet`（总下注目标），不是 chips
- **河牌不结算**：phase=showdown/result 必须主动隐藏 action bar，引擎不会主动通知 UI 清空

---

## 会话日志约定

每次开发会话结束前，将会话要点写入：

```
conversation_log/YYYY-MM-DD.md
```

**格式**：
- 顶部：会话概要（主题 + 状态）
- 主体：完成内容 + 关键决策 + 文件清单 + commit 引用
- 底部：剩余工作 + 项目统计

**保存内容**：
- ✅ 架构决策与理由
- ✅ 新增/修改文件清单
- ✅ Git commit hash
- ✅ 测试结果
- ✅ 模型路由信息（如使用了 subagent）
- ❌ 不保存逐字对话（用户已读过）
- ❌ 不保存密钥/token

**同日多次会话**：追加到同一文件，用 `---` + `## 续：...` 分段。

---

## 模型路由（CC Switch）

通过火山方舟代理：
- `sonnet` → **GLM-5.1**（主力编程）
- `opus` → **kimi-k2.6**（视觉/截图/PDF 分析）
- `haiku` → **deepseek-v4-pro**（中文写作/复盘/文档）

子 agent 自动路由：视觉任务 dispatch opus 子 agent，中文文档 dispatch haiku 子 agent。
