# 德州哲学家 — Tauri .exe 打包指南

## 一次性环境准备 (Windows)

### 1. 安装 Rust

```powershell
winget install Rustlang.Rustup
# 重启终端后
rustup default stable-msvc
rustc --version  # 应输出 rustc 1.x.x
```

### 2. 安装 Microsoft C++ Build Tools

- 打开 Visual Studio Installer
- "Desktop development with C++" 工作负载 → 安装
- 包含：MSVC v143, Windows 10/11 SDK

或单独下载：https://visualstudio.microsoft.com/visual-cpp-build-tools/

### 3. WebView2 Runtime

Win11 已内置。Win10 用户：

```powershell
winget install Microsoft.EdgeWebView2Runtime
```

### 4. 准备图标

`src-tauri/icons/` 需要以下文件：
- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.ico` (Windows 安装包)
- `icon.icns` (macOS, 可选)

用 [tauri-icon](https://tauri.app/v1/guides/features/icons/) CLI 一键生成：

```bash
cd v2
npx @tauri-apps/cli icon path/to/source.png
# 自动生成所有尺寸到 src-tauri/icons/
```

源图建议：1024×1024 PNG，透明背景，黑桃哲学家头像。

---

## 开发模式（带热重载）

```bash
cd v2
npm run tauri:dev
```

首次运行会下载/编译 Rust 依赖（~5 分钟）。后续启动 <10 秒。

应用窗口标题："德州哲学家 — Texas Philosopher"

---

## 打 .exe 安装包

```bash
cd v2
npm run tauri:build
```

产物在 `v2/src-tauri/target/release/bundle/`：

| 文件 | 用途 |
|---|---|
| `msi/TexasPhilosopher_2.0.0_x64_zh-CN.msi` | Windows MSI 安装包 |
| `nsis/TexasPhilosopher_2.0.0_x64-setup.exe` | NSIS 安装程序（推荐分发） |
| `..\..\..\TexasPhilosopher.exe` | 单文件 portable（无安装直接运行） |

包体积：~6 MB（NSIS）/ ~10 MB（MSI），远小于 Electron 的 150+ MB。

---

## 故障排除

### "linker `link.exe` not found"
缺 C++ Build Tools，回到第 2 步。

### "could not find Cargo.toml"
确认 `v2/src-tauri/Cargo.toml` 存在。

### Tauri 启动后白屏
- 检查 `tauri.conf.json` 中 `devUrl: "http://localhost:3000"` 与 vite 端口一致
- 浏览器单独打开 `http://localhost:3000` 验证 Vite 正常

### 国内网络下 cargo 慢
配置 `~/.cargo/config.toml`：

```toml
[source.crates-io]
replace-with = 'rsproxy-sparse'

[source.rsproxy]
registry = "https://rsproxy.cn/crates.io-index"

[source.rsproxy-sparse]
registry = "sparse+https://rsproxy.cn/index/"
```

---

## 自动化 CI 打包 (GitHub Actions)

未来可添加 `.github/workflows/tauri-build.yml`，push tag 自动出 Windows/macOS/Linux 三平台安装包并发布到 GitHub Releases。
