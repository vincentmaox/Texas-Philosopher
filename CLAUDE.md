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
