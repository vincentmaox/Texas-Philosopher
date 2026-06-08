# 德州哲学家 v2 · 开发手册

> 给开发者 / 维护者的工程指引。玩家请看 `web_app/玩家指南.md`。

---

## 1. 技术栈

| 层级 | 技术 |
|---|---|
| 构建 | Vite 6.x + TypeScript 5.x |
| 样式 | Tailwind CSS 3 + 主题 token (`src/ui/theme/palette.ts`) |
| 渲染 | Canvas 2D（牌桌）+ DOM（UI 控件） |
| 状态 | 自研 Store（无框架） |
| 音效 | Web Audio API（程序化合成，零依赖） |
| 持久化 | IndexedDB（3 表） |
| AI | DeepSeek V4（增强）+ 规则引擎（降级） |

---

## 2. 快速开始

```bash
cd v2
npm install        # 首次
npm run dev        # 本地开发：默认 http://localhost:3000（端口被占自动跳 3001/3002...）
npm run build      # 生产构建 → dist/，约 112 KB JS（gzip 39 KB）
npm run preview    # 本地预览生产产物
```

### 推荐 IDE

VS Code + 插件：
- **Tailwind CSS IntelliSense**
- **TypeScript Vue Plugin (Volar)**（即使是 Vanilla TS，也可借鉴）

---

## 3. 目录结构

```
v2/
├── index.html                # 入口 HTML（仅 #app 壳）
├── package.json              # 依赖 + 脚本
├── tsconfig.json             # TS 配置（含 path alias @/*）
├── vite.config.ts            # Vite 配置
├── tailwind.config.js        # Tailwind 主题
├── public/                   # 静态资源
├── dist/                     # 构建产物（git 忽略）
└── src/
    ├── main.ts               # 入口：异步 bootstrap，挂载 App + 5 个视图
    ├── App.ts                # 顶层 shell：header + nav + 视图切换
    ├── style.css             # 全局样式 + Tailwind 入口
    ├── types/                # 全部 TS 类型定义
    │   ├── card.ts           # Suit/Rank/Card
    │   ├── game.ts           # GameState/Seat/Action/HandResult/DecisionRecord
    │   ├── ai.ts             # MBTIType/PersonaProfile/AIDecision/LLMConfig
    │   ├── training.ts       # FeedbackItem/Verdict/SessionReport
    │   └── progression.ts    # MapNode/RunState/PlayerProfile
    ├── engine/               # 纯逻辑（零 DOM）
    │   ├── deck.ts           # 洗牌、抽牌
    │   ├── hand-eval.ts      # 7 选 5 + 牌力评估（复用 v1）
    │   ├── ev-calc.ts        # EV 计算器（preflop 查表 + Monte Carlo）
    │   ├── pot-manager.ts    # 边池计算 + All-in 分配
    │   ├── poker-engine.ts   # 状态机引擎（事件订阅模式）
    │   └── constants.ts
    ├── ai/                   # AI 模块
    │   ├── personas/
    │   │   ├── nt-strategists.ts    # INTJ/INTP/ENTJ/ENTP
    │   │   ├── nf-empaths.ts        # INFJ/INFP/ENFJ/ENFP
    │   │   ├── sj-traditionalists.ts # ISTJ/ISFJ/ESTJ/ESFJ
    │   │   ├── sp-improvisers.ts    # ISTP/ISFP/ESTP/ESFP
    │   │   └── index.ts             # ALL_PERSONAS + getPersona()
    │   ├── decision-engine.ts # AIDecisionEngine：LLM 优先，规则降级
    │   ├── deepseek-client.ts # DeepSeek V4 客户端（JSON Schema 强制）
    │   ├── prompt-builder.ts  # MBTI 感知提示词
    │   └── rule-fallback.ts   # 4 组结构不同的规则决策函数
    ├── training/             # 训练反馈
    │   ├── feedback-engine.ts # EV → 评级 + 一句话总结
    │   ├── ev-reveal.ts       # Balatro 管道动画
    │   ├── leak-detector.ts   # 按街/动作分类漏洞 + S/A/B/C/D 评分
    │   ├── report-card.ts     # 报告卡渲染
    │   └── aid-controller.ts  # 学习→训练→竞技自动降级
    ├── progression/          # Roguelike
    │   ├── ascension.ts          # 20 级飞升表
    │   ├── map-generator.ts      # 5 层地图生成 + Run 状态机
    │   ├── philosophy-tools.ts   # 10 个工具定义
    │   ├── boss-encounters.ts    # 5 个 Boss 机制
    │   └── meta-unlocks.ts       # XP/等级/工具池/PlayerProfile
    ├── engagement/           # Duolingo 粘性
    │   ├── streak.ts             # 连胜 + 火焰里程碑
    │   ├── leagues.ts            # 6 级联赛 + 周排行
    │   ├── hearts.ts             # 红心系统
    │   └── daily.ts              # 每日任务 + 每日一手
    ├── audio/
    │   └── sound-manager.ts      # Web Audio 程序化合成
    ├── persistence/
    │   └── save-system.ts        # IndexedDB 三表持久化
    └── ui/
        ├── canvas/               # 牌桌渲染（Canvas 层）
        │   ├── table-renderer.ts
        │   ├── card-sprite.ts
        │   ├── chip-sprite.ts
        │   └── animation-loop.ts
        ├── components/           # DOM 组件
        │   ├── toast.ts
        │   ├── report-modal.ts
        │   └── dialogue-bubble.ts
        ├── views/                # 5 大视图
        │   ├── map-screen.ts
        │   ├── game-screen.ts
        │   ├── daily-screen.ts
        │   ├── league-screen.ts
        │   └── settings-screen.ts
        └── theme/
            └── palette.ts        # 主题颜色 token
```

---

## 4. 核心架构

### 4.1 数据流

```
用户操作 / AI 决策
       ↓
GameScreen.playerAction(payload)
       ↓
PokerEngine.playerAction()
       ↓
状态机推进（executeAction → proceedToNextActor → advanceStreet）
       ↓
emit(EngineEvent) — phaseChange / cardDealt / action / turnStarted / feedback / handResult
       ↓
GameScreen.bindEngine() 订阅 → 触发 UI 更新 + 音效 + EV 揭示 + 报告
       ↓
离桌时：completeNode → saveRun → awardRunCompletion → saveProfile
```

### 4.2 状态机阶段

```
idle → dealing → preflop → flop → turn → river → showdown → result
                    ↑___________________________________________|
```

每个状态显式可动画化。`PokerEngine.setPhase()` 触发 `phaseChange` 事件。

### 4.3 AI 决策链

```
AIDecisionEngine.decide(seat, state)
   ↓
1. 先跑规则引擎 → fallback（即时可用，保证不卡）
2. 异步请求 DeepSeek V4
3. LLM 返回 → 替换规则结果；超时 → 用 fallback
```

**保证**：无 LLM 时也能完整对局，LLM 仅增强对话风味。

### 4.4 EV 计算

- **Preflop**：查 169 起手牌 vs 对手范围的预计算 equity 表
- **Postflop**：Monte Carlo 300 次随机发剩余街
- **输出**：`{ fold, call, raiseHalfPot, raisePot, raiseAllIn, optimal, equity, potOdds }`

### 4.5 持久化

IndexedDB 3 表：

| Store | Key | Value |
|---|---|---|
| `profile` | `'main'` | `PlayerProfile`（xp/level/streak/hearts/tools/ascension/league） |
| `current_run` | `'current'` | `RunState`（floor/pool/floors/completedNodeIds/tools/ascension） |
| `llm_config` | `'main'` | `LLMConfig`（endpoint/apiKey/model/enabled） |

API 见 `src/persistence/save-system.ts`：`saveProfile/loadProfile/saveRun/loadRun/saveLLMConfig/loadLLMConfig/clearAll`。

---

## 5. 添加新功能

### 5.1 新增 MBTI 人格

文件：`src/ai/personas/{group}.ts`

```typescript
export const INTJ: PersonaProfile = {
  type: 'INTJ',
  name: '棋局设计师',
  cognitiveStack: ['Ni', 'Te', 'Fi', 'Se'],
  bio: '冷静的GTO追随者，将牌局视为可求解的方程。',
  bettingStyle: { tightness: 0.78, aggression: 0.65, bluffRate: 0.10 },
  speechStyle: '简练、克制、偶尔抛出冷峻的概率断言',
  dialogueTemplates: { open: [...], showdownWin: [...], fold: [...] },
};
```

在 `personas/index.ts` 注册到 `ALL_PERSONAS`。

### 5.2 新增哲学工具

文件：`src/progression/philosophy-tools.ts`

```typescript
{ id: 'new_tool', name: '...', description: '...', icon: '🔮', rarity: 'rare' }
```

在 `types/progression.ts` 的 `PhilosophyToolId` 联合类型中加上新 ID。

实际效果需在引擎里挂钩（如 `pond_radar` 在 MapScreen 中显示对手 MBTI）。

### 5.3 新增引擎事件

文件：`src/engine/poker-engine.ts`

```typescript
export type EngineEvent =
  | { type: 'phaseChange'; phase: GamePhase }
  | { type: 'newEventType'; payload: ... }   // 新增
  | ...;
```

GameScreen.bindEngine() 中订阅响应。

---

## 6. 调试 & 测试

### 6.1 浏览器开发者工具

- **Network → Fetch/XHR**：观察 DeepSeek 调用
- **Application → IndexedDB → texas_philosopher_v2**：查看 3 表数据
- **Console**：启动横幅 `♠ 德州哲学家 v2 已启动`，无错误即正常

### 6.2 重置存档

```javascript
// 浏览器 Console
indexedDB.deleteDatabase('texas_philosopher_v2');
location.reload();
```

或在 Settings 中点击「重置数据」（待添加）。

### 6.3 强制 LLM 启用

Settings → AI 增强 → 填入 DeepSeek endpoint/model/apiKey → 启用开关。

注意：apiKey 仅存本地 IndexedDB，不上传。

---

## 7. 部署

### GitHub Pages 静态部署

```bash
cd v2
npm run build
# dist/ 目录即可静态托管
```

`vite.config.ts` 已配置 `base: './'`，支持任意子路径部署。

### PWA（计划中）

`public/manifest.json` 已预留，Service Worker 待补。

---

## 8. 编码规范

- **零硬约束**：不引入新框架（React/Vue/Svelte）。Vanilla TS + Tailwind 是终态。
- **类型先行**：所有 public API 必须有显式类型注解。
- **事件驱动**：引擎和 UI 解耦，不直接调用 DOM。
- **测试优先**：每个 Phase 完成必须浏览器实测 + `npm run build` 通过。
- **中文优先**：UI 文案和注释优先中文，代码标识符英文。

---

## 9. 常见陷阱

| 陷阱 | 解决方案 |
|---|---|
| Vite HMR WebSocket 失败（控制台 3 条警告） | 仅开发期，不影响产品。忽略。 |
| TypeScript 严格模式 + `as const` 数组推断错误 | 显式类型注解 `Seat[]`，或用 `as 'SB' \| 'BB' \| ...` 收窄 |
| IndexedDB 第一次启动空状态 | `loadProfile()` 内置默认 `createDefaultProfile()` 兜底 |
| LLM 慢导致 UI 卡顿 | `AIDecisionEngine` 先返回 fallback，LLM 结果到了再替换台词 |
| 牌桌 Canvas 模糊 | `TableRenderer.resize()` 使用 `devicePixelRatio` 适配 |

---

## 10. 资源

- 玩家入门 → `web_app/玩家指南.md`
- 完整重建方案 → `docs/德州哲学家 v2 — 完全重建方案.md`
- 项目对话日志 → `conversation_log/YYYY-MM-DD.md`
- 项目宏观日志 → `DEVLOG.md`
- 项目指令 → `CLAUDE.md`

---

## 11. 联系

GitHub Issues：https://github.com/vincentmaox/Texas-Philosopher/issues
