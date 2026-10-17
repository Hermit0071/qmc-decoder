# macOS 自动获取 EKey 测试

首次使用默认开启自动获取；已保存的关闭选择会保留，可手动勾选。
自动获取沿用项目的 QQ 音乐 GetEVkey API，仅适用于带 musicex 尾部的文件。

1. 在本机 QQ 音乐登录拥有对应歌曲访问权限的账号。
2. 打开 QMC Decoder。如提示读取被 macOS 阻止，点击“打开权限设置”。
3. 在“隐私与安全性 → 完全磁盘访问权限”中用 `+` 添加本次构建的
   `target/release/bundle/macos/QMC Decoder.app`，由用户确认开启。
   此权限允许应用读取受保护文件；应用不会自行更改系统权限。
4. 退出并重新打开应用，点击“重新检测”。成功时显示已检测到登录信息。
5. 添加 musicex 格式音乐文件，选择输出目录，勾选自动获取后点击“解密”。
   手动填写的 EKey 仍优先于自动获取。

读取凭据成功不等于 API 一定返回 EKey。登录过期、歌曲访问权限或网络错误
会在实际解密时显示。需用真实文件完成此项验收。

回归验证：

```sh
cargo test --workspace --release --locked
node --test scripts/test-credentials-ui.cjs
node --check frontend/main.js
git diff --check
```

权限回归覆盖 macOS EPERM/EACCES 与配置解析失败的区分；界面测试覆盖权限提示、
设置入口、授权后重试、保留关闭选择及检查失败后的重试。
