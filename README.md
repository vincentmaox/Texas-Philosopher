# 德州哲学家 · Texas Philosopher

> 一款让人上瘾的真实感德州扑克哲学训练模拟器。  
> 对标 Duolingo 的日活粘性 + Balatro 的视觉冲击 + 杀戮尖塔的爬塔成长 + PokerSnowie 的专业训练。

---

## 双版本架构

| 版本 | 路径 | 技术栈 | 用途 |
|---|---|---|---|
| **v1** | `web_app/` | 纯 HTML + Vanilla JS（零依赖） | 双击 HTML 即玩，MVP |
| **v2** | `v2/` | Vite + TypeScript + Canvas + Tauri | AAA 视觉，可打包 .exe |

---

## v2 快速开始

### 浏览器开发模式

```bash
cd v2
npm install
npm run dev          # → http://localhost:3000
```

### 打包桌面应用（.exe）

```bash
cd v2
# 一次性环境：安装 Rust + MSVC Build Tools（详见 v2/TAURI_BUILD.md）
winget install Rustlang.Rustup

# 生成图标（需准备 1024×1024 PNG）
npx @tauri-apps/cli icon path/to/icon-1024.png

# 打包
npm run tauri:build  # → src-tauri/target/release/bundle/
```

产物：
- `nsis/TexasPhilosopher_2.0.0_x64-setup.exe` — Windows 安装程序，~6 MB
- `msi/TexasPhilosopher_2.0.0_x64_zh-CN.msi` — MSI 安装包
- `TexasPhilosopher.exe` — portable 单文件版本

---

## 核心特性

### v2 已完成（Phase 0-7 + AAA 升级）

| 模块 | 内容 |
|---|---|
| **扑克引擎** | 状态机驱动，盲注/边池/Monte Carlo EV 计算 |
| **16 型 MBTI AI** | NT/NF/SJ/SP 四组架构差异 + DeepSeek V4 增强 |
| **训练反馈** | Balatro 风 EV 管道 + 漏洞检测 + 报告卡 + 辅助渐降 |
| **Roguelike 进度** | 5 层分支地图 + 20 级飞升 + 10 哲学工具 + 5 Boss |
| **Duolingo 粘性** | 连胜 / 联赛 / 红心 / 每日任务 |
| **AAA 视觉** | Canvas 2D + 径向晕影 + 木质金边 + 130×182 大牌面 |
| **音效** | Web Audio API 程序化合成（零依赖） |
| **持久化** | IndexedDB（profile / current_run / llm_config） |
| **新手教学** | 5 步 Balatro 风引导首次自动弹出 |
| **桌面打包** | Tauri 2，~6 MB .exe |

---

## 文档导航

### 用户文档
- `web_app/README.md` — v1 玩家使用说明
- `web_app/玩家指南.md` — v1 完整玩家手册
- `v2/TAURI_BUILD.md` — v2 桌面打包指南

### 开发文档
- `CLAUDE.md` — Claude Code 项目级指令（必读）
- `v2/DEV_MANUAL.md` — v2 开发手册（架构 / 添加新功能 / 调试）
- `v2/MANUAL_TEST_PLAN.md` — QA 人工测试方案（12 章）
- `docs/德州哲学家 v2 — 完全重建方案.md` — v2 完整设计方案
- `DEVLOG.md` — 项目宏观日志（按日期阶段更新）
- `conversation_log/YYYY-MM-DD.md` — 每日会话详细记录

---

## 项目目录

```
TexasPhilosopher/
├── README.md                      ← 本文件
├── CLAUDE.md                      Claude Code 指令
├── DEVLOG.md                      宏观开发日志
├── conversation_log/              每日会话日志
│   ├── 2026-06-08.md
│   └── 2026-06-09.md
├── docs/                          设计文档
│   └── 德州哲学家 v2 — 完全重建方案.md
├── web_app/                       v1 纯前端版本
│   ├── index.html
│   ├── styles.css
│   ├── 启动游戏.bat
│   ├── README.md
│   ├── 玩家指南.md
│   └── js/                        12 个 JS 模块
└── v2/                            v2 Vite + TS + Canvas
    ├── package.json
    ├── DEV_MANUAL.md
    ├── MANUAL_TEST_PLAN.md
    ├── TAURI_BUILD.md
    ├── src/                       33 个 TS 文件
    │   ├── ai/                    16 MBTI × 4 组架构
    │   ├── engine/                扑克引擎 + EV 计算
    │   ├── training/              反馈系统
    │   ├── progression/           Roguelike
    │   ├── engagement/            Duolingo 粘性
    │   ├── ui/                    Canvas + DOM 组件
    │   ├── audio/                 Web Audio 合成
    │   └── persistence/           IndexedDB
    └── src-tauri/                 Rust 桌面壳
```

---

## 模型路由

通过火山方舟代理（CC Switch）：

| 别名 | 实际模型 | 用途 |
|---|---|---|
| `sonnet` | GLM-5.1 | 主力编程 |
| `opus` | Kimi K2.6 | 视觉/截图/PDF 分析 |
| `haiku` | DeepSeek V4 Pro | 中文写作/复盘/文档 |

---

## 关键架构原则

1. **核心-增强双层**：规则引擎完整可玩，DeepSeek 仅是增强层
2. **状态机驱动**：所有牌局阶段显式 `phaseChange` 事件
3. **统一 Seat 模型**：人类和 AI 同一数组，消除状态不一致
4. **不引入框架**：Vanilla TS，禁止 React/Vue/Svelte
5. **打开即玩**：v1 无 build，v2 npm run dev 一键

---

## License

MIT
