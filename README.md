# QMC Decoder · Blue Edition

基于 [ownlight6/qmc-decoder](https://github.com/ownlight6/qmc-decoder) 的桌面音频解密工具。本 fork 保留上游 Rust 解密核心，加入蓝色系深浅主题、外观偏好记忆，以及 macOS 自动获取 EKey 的权限引导与重新检测。

当前应用版本：**1.3.0**。支持 macOS / Windows；本 fork 的本地编译与界面验证在 **macOS Apple Silicon** 上完成。Windows 实现和打包工作流沿用上游，本轮未在 Windows 实机验证。

> 本项目还原本地加密文件中的音频数据，不负责下载歌曲，也不进行音频转码。自动获取 EKey 依赖已登录的 QQ 音乐账号、歌曲访问权限和服务端响应。

## 目录

- [功能与本 fork 的改动](#功能与本-fork-的改动)
- [支持格式](#支持格式)
- [使用方式](#使用方式)
- [技术栈与架构](#技术栈与架构)
- [算法与文件处理流程](#算法与文件处理流程)
- [开发与构建](#开发与构建)
- [测试与验证范围](#测试与验证范围)
- [常见问题](#常见问题)
- [项目结构](#项目结构)
- [数据与网络行为](#数据与网络行为)
- [来源与许可证](#来源与许可证)

## 功能与本 fork 的改动

| 功能 | 说明 |
| --- | --- |
| 文件与文件夹导入 | 原生文件选择、文件夹选择、拖放；递归发现支持的音乐文件 |
| 批量处理 | 逐文件展示状态、错误信息、输出路径与整体进度 |
| 文件信息 | 查看格式、大小、尾部类型和相应元数据 |
| 自动获取 EKey | 读取本机 QQ 音乐登录信息，按文件元数据请求 GetEVkey API |
| 手动 EKey | musicex 文件可手动填写 Base64 编码 EKey |
| 蓝色双主题 | 浅色为冰蓝与湖蓝，深色为午夜蓝与晴空蓝 |
| 外观切换 | 右上角选择“自动 / 浅色 / 深色”；自动响应系统外观变化 |
| 偏好记忆 | 本地保存外观、输出目录、手动 EKey 和自动获取开关 |
| macOS 权限引导 | 区分读取权限拒绝与配置解析失败；提供系统设置入口和重新检测 |

本 fork 的主要改动位于 `frontend/`、`src/ekey_fetch.rs` 和 `src-tauri/src/`。QMC1/QMC2 核心算法沿用上游，没有在此次界面定制中替换。

## 支持格式

| 算法族 | 输入扩展名 | 输出格式 | 密钥来源 |
| --- | --- | --- | --- |
| QMC1 | `.qmc0`、`.qmc3` | `.mp3` | 内置固定掩码，无需手动 EKey |
| QMC1 | `.qmc2`、`.qmcogg` | `.ogg` | 内置固定掩码，无需手动 EKey |
| QMC1 | `.qmcflac` | `.flac` | 内置固定掩码，无需手动 EKey |
| QMC2 | `.mgg`、`.mgg0`、`.mgg1`、`.mggl` | `.ogg` | 文件尾部，或手动 / 自动获取 EKey |
| QMC2 | `.mflac`、`.mflac0`、`.mflach` | `.flac` | 文件尾部，或手动 / 自动获取 EKey |

扩展名用于选择处理分支，QMC2 的密钥来源还取决于实际尾部。仅修改扩展名不能完成解密。输出扩展名按上述映射生成，不代表已额外验证所有输出音频都能播放。

## 使用方式

### 1. 启动与添加文件

构建完成后，macOS 打开 `target/release/bundle/macos/QMC Decoder.app`；Windows 使用本机构建得到的应用或安装包。

点击“选择文件”“选择文件夹”，或将文件 / 文件夹拖到添加区域。文件夹会展开为支持的歌曲列表。可使用每个文件的信息按钮查看尾部类型。

### 2. 设置输出位置

使用“浏览…”选择输出目录，或输入目录路径。留空时输出到每个输入文件所在目录。输出文件使用原文件名主体加 `.mp3`、`.ogg` 或 `.flac` 扩展名。

**现有实现会覆盖同名输出文件，且不同子目录中的同名歌曲集中输出时可能冲突。** 建议测试时使用独立空目录；目前没有自动重命名或覆盖确认。

### 3. 选择密钥获取方式

- **QMC1：** 不需要 EKey，直接解密。
- **带 QTag / V1 尾部的 QMC2：** 程序从尾部读取密钥材料。
- **带 musicex 尾部的 QMC2：** 勾选自动获取，或手动填写 EKey。手动填写的非空 EKey 优先于自动获取。
- **未知尾部的 QMC2：** 需要手动 EKey，无法仅凭文件扩展名自动获取。

自动获取在首次使用时默认开启；如果之前手动关闭，程序会保留该选择。开启开关时会重新检查登录信息，也可点击“重新检测”。

### 4. macOS 自动获取 EKey 的权限配置

1. 在本机 QQ 音乐客户端登录拥有对应歌曲访问权限的账号。
2. 打开 QMC Decoder，查看登录信息检测结果。
3. 如果提示 macOS 阻止读取，点击“打开权限设置”。
4. 在“系统设置 → 隐私与安全性 → 完全磁盘访问权限”中点击 `+`，添加**实际运行的** `QMC Decoder.app` 并由用户开启权限。
5. 退出并重新打开应用，点击“重新检测”。
6. 检测成功后添加 musicex 文件，勾选自动获取并点击“解密”。

完全磁盘访问权限允许应用访问受系统保护的数据，需用户主动确认。程序只打开设置页面，不会自动修改权限。更换应用位置或重新签名后，如仍被拒绝，请核对授权项是否对应当前构建。

读取登录信息成功仅表示具备请求条件，不保证服务端一定返回 EKey。登录过期、订阅 / 歌曲访问权限、区域限制、网络或客户端格式变化都可能使请求失败。

### 5. 切换外观与查看结果

右上角的“自动 / 浅色 / 深色”立即生效并在本地记忆。“自动”跟随系统；手动选择不受系统外观变化影响。

点击“解密”后，逐文件查看成功或失败结果。完成后可在输出目录使用播放器检查实际音频。批量处理不是事务：某个文件失败时，已生成的成功输出不会回滚。

## 技术栈与架构

| 层次 | 技术 | 用途 |
| --- | --- | --- |
| 核心库 | Rust 2021 edition | 文件格式、尾部解析、密钥派生、解密及输出 |
| 桌面外壳 | Tauri 2 | 原生窗口、WebView、命令调用和事件通知 |
| 前端 | 原生 HTML / CSS / JavaScript | 文件列表、表单、进度和主题，无前端构建步骤 |
| 文件选择 | `rfd` 0.15 | 原生文件与文件夹对话框 |
| 外部链接 | `tauri-plugin-opener` 2 | 打开外部链接 |
| HTTP | `reqwest` 0.12 + `rustls-tls` | HTTPS 请求 QQ 音乐 API |
| 异步任务 | Tokio 1 / Tauri runtime | API 调用和后台任务 |
| 序列化 | Serde 1 / `serde_json` 1 | 前后端数据和 API JSON |
| 密钥工具 | `base64` 0.22 / `tc_tea` 0.1 | Base64 解码和 TC-TEA 处理 |
| 系统配置 | `plist` 1 / `dirs` 6 | macOS plist 解析和用户目录定位 |
| 界面测试 | Node.js 内置 `node:test` / `vm` | 在模拟 Tauri/DOM 边界中测试登录检测交互 |

具体补丁版本以 [Cargo.lock](Cargo.lock) 为准。前端不依赖 React、Vue、Vite 或 Node.js 运行时；Node.js 仅用于可选的 Tauri CLI 安装方式和界面回归测试。

```text
HTML / CSS / JavaScript
        │ Tauri invoke / progress events
        ▼
Tauri commands（原生选择器、后台任务、结果序列化）
        │
        ▼
qmc_decoder 核心库
        ├── 格式 / 尾部识别 → QMC1 或 QMC2 → 输出音频
        └── musicex → 本机登录信息 → QQ 音乐 API → EKey
```

## 算法与文件处理流程

### QMC1：固定掩码 XOR

实现见 [src/qmc1.rs](src/qmc1.rs)。程序维护一个固定 64 字节表，按文件偏移计算索引：先对 `0x7fff` 取模，再使用低 7 位，并将大于 `0x3f` 的索引折回表范围。每个字节与对应掩码 XOR，得到还原数据。

XOR 具有对称性，因此同一处理执行两遍可还原原数据；它不需要用户账号或逐曲密钥。

### QMC2：EKey 解析与派生

实现见 [src/qmc2.rs](src/qmc2.rs)。处理顺序为：

1. 对 EKey 做 Base64 解码。
2. 如带 `QQMusic EncV2,Key:` 前缀，先执行两层 TC-TEA 解包，再对结果做 Base64 解码。
3. 对 EncV1 路径，将前 8 字节头部与固定生成序列交错组成 16 字节 TEA 密钥，再解密剩余部分。
4. 如果 EncV1 的 TC-TEA 解密不成功，当前实现尝试将整个 Base64 解码结果作为原始密钥；这是一条兼容分支，不是对任意损坏 EKey 的有效性保证。
5. 按最终派生密钥长度选择 Map 或修改版 RC4。

### QMC2 Map 与修改版 RC4

| 分支 | 条件 | 实现概要 |
| --- | --- | --- |
| Map | 派生密钥长度 ≤ 300 字节 | 根据偏移选择、扰动密钥字节，生成 XOR 掩码 |
| 修改版 RC4 | 派生密钥长度 > 300 字节 | 基于密钥进行状态初始化、分段计算与密钥流 XOR |

RC4 分支对前 `0x80`（128）字节使用独立逻辑，后续按 `0x1400`（5120）字节分段，结合片段编号、哈希和丢弃计数产生密钥流。它不是可直接替换为通用 RC4 库的标准 RC4 实现。

### 文件尾部与自动获取链路

尾部解析见 [src/lib.rs](src/lib.rs)：

- **QTag：** 解析尾部元数据和其中的 EKey。
- **V1：** 根据末尾长度字段提取密钥材料。
- **musicex：** 解析歌曲 ID、媒体 MID、文件名和尾部长度；该分支不从尾部直接取得 EKey。
- **Unknown：** 未识别尾部，是否可处理取决于算法族和手动密钥。

自动获取实现见 [src/ekey_fetch.rs](src/ekey_fetch.rs)：

1. 从 musicex 尾部取得媒体 MID 与文件名，并按需补全扩展名。
2. macOS 读取 QQ 音乐偏好 plist 中的 `AutoLoginUserInfo`，解析 NSKeyedArchiver 对象引用，提取 UIN 与登录凭据。
3. Windows 沿用上游实现，读取客户端配置，并从本地 cookie 文件或运行中的 QQ 音乐进程寻找登录信息。
4. 使用 HTTPS 向 `https://u.y.qq.com/cgi-bin/musicu.fcg` 请求 `music.vkey.GetEVkey / CgiGetEVkey`。
5. 检查响应结果，得到 EKey 后交给 QMC2 核心进行派生和解密。
6. 按尾部类型移除相应尾部数据，写出音频。

当前单文件处理会将文件整体读入内存；批量逐文件处理，不是流式解密或并行转码。

## 开发与构建

### 环境准备

- 安装近期稳定版 Rust / Cargo。本地已使用 Rust/Cargo **1.96.1** 完成构建；当前锁文件未验证兼容原上游 README 所称的 Rust 1.70。
- 安装对应平台的 [Tauri 2 系统前置依赖](https://v2.tauri.app/start/prerequisites/)。本地 macOS 使用 Xcode 开发工具；Windows 构建需要对应原生工具链和 WebView 环境。
- 若要执行 JavaScript 回归测试，另装 Node.js。

本 fork 的定制源码及此 README 位于默认分支 `codex/fork-readme`：

```sh
git clone --branch codex/fork-readme https://github.com/Hermit0071/qmc-decoder.git
cd qmc-decoder
```

### 方式 A：Cargo 安装 Tauri CLI

```sh
cargo install tauri-cli --version '^2' --locked
cargo tauri dev
```

前端直接读取 `frontend/` 静态文件，不需要 `npm install` 或前端打包。根包是 Rust 库，当前没有独立的命令行解密入口；桌面程序由 `src-tauri/` 提供。

```sh
# 仅编译核心库
cargo build -p qmc-decoder --release --locked

# 构建桌面应用并生成当前平台的默认安装产物
cargo tauri build -- --locked

# macOS 仅生成 .app
cargo tauri build --bundles app -- --locked
```

### 方式 B：项目旁隔离安装 Node 版 Tauri CLI

以下命令在仓库根目录执行，工具目录位于仓库旁边：

```sh
npm install --prefix ../qmc-build-tools --no-audit --no-fund @tauri-apps/cli@2
```

macOS / Linux shell：

```sh
../qmc-build-tools/node_modules/.bin/tauri dev
../qmc-build-tools/node_modules/.bin/tauri build -- --locked
```

Windows PowerShell：

```powershell
..\qmc-build-tools\node_modules\.bin\tauri.cmd dev
..\qmc-build-tools\node_modules\.bin\tauri.cmd build -- --locked
```

### 产物与架构

- macOS `.app`：`target/release/bundle/macos/QMC Decoder.app`。
- 其他安装包：查看 `target/release/bundle/`，具体子目录和格式由平台及打包选项决定。
- 默认构建面向当前主机架构。Apple Silicon 上的普通构建不会自动生成 Intel 或 Universal 应用。
- 若安装了目标 Rust 标准库及所需系统工具，可使用 `--target x86_64-apple-darwin` 等目标参数；本轮没有执行 Intel 交叉编译。
- 本地测试包不是 Apple 公证发行包；公开发行需要另行配置签名和公证。

如本地 `.app` 的签名校验失败，可为自己构建的测试包重新进行 ad-hoc 签名：

```sh
codesign --force --deep --sign - 'target/release/bundle/macos/QMC Decoder.app'
codesign --verify --deep --strict 'target/release/bundle/macos/QMC Decoder.app'
```

此操作只处理本地签名一致性，不等于 Apple 开发者签名或公证。

### GitHub Actions

仓库保留上游打包工作流：匹配 `v*` 的标签推送或手动 `workflow_dispatch` 可触发 macOS ARM64、macOS x64、Windows 打包与 Release 发布。fork 中需先确认 Actions 已启用及工作流写权限设置。创建 fork、推送普通分支本身不代表已有安装包或 Release。

## 测试与验证范围

```sh
cargo test --workspace --release --locked
node --test scripts/test-credentials-ui.cjs
node --check frontend/main.js
node --check frontend/theme.js
git diff --check
```

| 检查 | 已完成范围 |
| --- | --- |
| Rust 回归 | 21 项通过：核心算法、musicex 解析、macOS 权限错误分类和文件夹展开等 |
| JavaScript 回归 | 3 项通过：权限提示、设置入口、检测重试及自动获取开关行为；使用模拟边界 |
| 桌面构建 | macOS ARM64 release `.app` 已构建并启动，本地签名校验通过 |
| 外观交互 | 浏览器验证深浅切换、跟随系统、刷新后记忆；桌面界面已查看 |
| 布局 | 840 像素及 560 像素宽度已检查，无横向溢出 |
| 对比度 | 蓝色主按钮文字 / 背景：浅色约 5.34:1，深色约 6.78:1 |
| 尚未完成 | 当前受 macOS 凭据访问权限阻断，尚未实测成功获取 EKey 或真实歌曲完整解密；未验证 Windows / Intel Mac 实机 |

测试通过不等于所有 QQ 音乐客户端版本、文件变体或歌曲均兼容。更多本机步骤见 [LOCAL_TESTING.md](LOCAL_TESTING.md)。

## 常见问题

**提示 `Operation not permitted` 或 macOS 阻止读取？**

使用应用中的权限设置入口，对当前 `.app` 授权，退出重开后重新检测。程序将 EPERM / EACCES 区分为权限错误，而非泛称为解析失败。

**已登录，仍未检测到凭据？**

先区分文件访问权限与解析失败。确认客户端登录状态，使用“重新检测”；QQ 音乐更新也可能改变本地配置结构。Windows 路径还依赖客户端文件 / 进程的可访问性。

**API 返回空 EKey？**

查看单文件错误。服务端 `104003` 可能与歌曲访问权限或区域有关，`104005` 可能与登录过期或歌曲权限有关；这些是错误提示中的排查方向，不是对原因的确定诊断。重新登录或换一个有权限的文件验证。

**拖到普通浏览器中打不开解密功能？**

界面通过 Tauri 的 `window.__TAURI__` 调用 Rust。HTTP 静态预览可以检查布局和外观，但不具备本机文件与解密命令；请使用 `tauri dev` 或桌面 `.app`。

**手动填写 EKey 仍不能解密？**

确认密钥对应当前文件。musicex 分支中手动 EKey 优先，不会自动改用 API 替换一个非空但错误的手动值；希望自动获取时先清空手动输入。

**输出失败或同名文件丢失？**

检查目录写权限和磁盘空间。当前输出使用普通文件写入，同名目标会被覆盖；集中输出前检查同名歌曲。

## 项目结构

```text
qmc-decoder/
├── Cargo.toml / Cargo.lock       # Rust workspace 与锁定依赖
├── src/
│   ├── lib.rs                    # 公共 API、格式 / 尾部识别、文件处理
│   ├── qmc1.rs                   # 固定掩码 XOR
│   ├── qmc2.rs                   # EKey 派生、Map、修改版 RC4
│   └── ekey_fetch.rs             # 登录信息、musicex 元数据、GetEVkey 请求
├── src-tauri/
│   ├── tauri.conf.json           # 窗口、资源和打包配置
│   ├── capabilities/             # WebView 能力声明
│   ├── icons/                    # 桌面图标
│   └── src/
│       ├── lib.rs                # 注册 Tauri 命令
│       ├── commands.rs           # 原生对话框、批量任务、状态 / 权限入口
│       └── main.rs               # 桌面入口
├── frontend/
│   ├── index.html                # 界面结构
│   ├── styles.css                # 蓝色双主题与布局
│   ├── theme.js                  # 首屏主题、系统监听、外观持久化
│   └── main.js                   # 文件、选项、进度、Tauri 调用
├── scripts/
│   ├── generate-icons.py         # 图标生成（Python 标准库）
│   └── test-credentials-ui.cjs    # 登录 / 权限界面回归
├── .github/workflows/            # 跨平台构建与 Release 工作流
├── LOCAL_TESTING.md              # macOS 自动 EKey 验证步骤
├── TECHNICAL_DETAILS.md          # 上游算法技术文档
├── MGG_DECRYPTION_FLOW.md         # 上游 MGG 流程文档
└── LICENSE
```

## 数据与网络行为

- 音频解密在本地执行，GetEVkey 请求只发送登录凭据及歌曲相关元数据，不上传音频内容。
- 启动应用及点击“重新检测”会尝试读取本地登录信息；获取 EKey 时才请求 QQ 音乐 API。
- 账号登录凭据由 Rust 读取，不通过此界面的状态结果暴露 authst；本 fork 移除了获取链路中的 UIN 日志。
- 手动 EKey、输出目录、自动获取开关和主题保存在 WebView `localStorage` 中。**手动 EKey 的密码输入框仅遮蔽显示，localStorage 不是加密保险库。** 不要将 WebView 数据目录、登录配置或真实 EKey 提交到仓库。
- GitHub 链接会打开外部浏览器。构建时需要从包仓库下载依赖，首次构建通常耗时更长。

## 来源与许可证

上游项目：[ownlight6/qmc-decoder](https://github.com/ownlight6/qmc-decoder)。本 fork 保留原有版权声明与 [LICENSE](LICENSE)，许可证为 GNU GPL v3 或其后续版本，以许可证原文为准。

算法源码中的上游来源包括 `presburger/qmc-decoder`、`bczhc/qmc-decrypt` 和 `jixunmoe/qmc2-rust`。详细实现与历史说明请参阅源码注释及 [TECHNICAL_DETAILS.md](TECHNICAL_DETAILS.md)、[MGG_DECRYPTION_FLOW.md](MGG_DECRYPTION_FLOW.md)。
