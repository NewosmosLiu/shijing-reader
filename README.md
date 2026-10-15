<img src="docs/icon.png" width="96" alt="诗经注析图标：左诗右注">

# 诗经注析 · Shijing Reader

一款离线安卓《诗经》阅读应用。收录 305 篇古典诗文，支持全文搜索、收藏、阅读足迹、章句注释和夜间阅读。

**中文名：诗经注析** · 英文名：Shijing Reader · 当前版本：1.2.5 · [MIT 许可证](LICENSE)

项目地址：<https://github.com/NewosmosLiu/shijing-reader>

## 功能

- 国风、小雅、大雅、颂共 305 篇，按篇目与分组浏览。
- 搜索篇名、诗句、已收录的题解及注释。
- 点击诗句查看所在章的注析；公开版附少量自行编写的示例注释，其余章节明确显示尚未收录。
- “我的”集中显示收藏、足迹、关于；收藏、续读位置和阅读设置保存在本机。
- 四档字号、夜间模式；等长诗句按字列对齐，行尾标点悬挂排版。
- 原生 Java + 本地 WebView，无账号、无广告、无应用内联网权限。
- 保留可选的原页 PDF 渲染代码；默认不附扫描文件，也不显示不可用的 PDF 入口。

## 公开版与私人阅读版本

项目起因是把纸质书扫描整理成便于手机阅读的形式。“关于”页保留作者提供的软件缘由。

**公开仓库不含中华书局《诗经注析》的 PDF、OCR、现代题解或注析全文，也不含私人记录、签名密钥及原始安装包。** 本仓库的诗文数据来自采用 MIT 协议的 [chinese-poetry/chinese-poetry](https://github.com/chinese-poetry/chinese-poetry)，保留上游用字及章序。公开版不能视为该出版社原书的电子版，原书的私有校对内容也未纳入此数据集。来源和许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

公开版使用独立包名 `cn.shijing.reader.opensource`，不会覆盖私人阅读版本或其本机记录。

## 构建安卓应用

需要 JDK 17、Android SDK Platform 35、Android SDK Build Tools 35.0.0。项目提供 Gradle 8.9 Wrapper，Android Gradle Plugin 固定为 8.7.3；Wrapper 与发行包均配置 SHA-256 校验。

用 Android Studio 打开本目录，同步后运行 `app`；或者：

```sh
./gradlew assembleDebug
```

Windows：

```powershell
.\gradlew.bat assembleDebug
```

安装包位于 `app/build/outputs/apk/debug/app-debug.apk`，由各自环境的调试密钥签名。首次构建需要下载 Gradle 和构建依赖，应用安装后可离线阅读。

也可使用不依赖 Gradle 的 Windows 构建脚本：

```powershell
powershell -ExecutionPolicy Bypass -File tools/build.ps1 -JavaHome "你的 JDK 目录" -Sdk "你的 Android SDK 目录"
```

该脚本在本地生成独立调试密钥，并将 APK 输出到 `dist/shijing-reader.apk`；密钥和安装包均已列入忽略规则。

## 浏览器预览与检查

```sh
python -m http.server 8080 --directory app/src/main/assets
```

访问 `http://localhost:8080` 可预览阅读界面。PDF 渲染由安卓原生层提供，浏览器预览不支持此接口。

```sh
python tools/build_data.py
python tests/check_public.py
npm ci
npx playwright install chromium
npm test
```

浏览器测试可通过 `CHROME_PATH` 指定已有 Chrome。测试截图输出到 `tests/artifacts`，不会提交个人设备截图或阅读记录。

## 补充注释与可选 PDF

修改 `data/annotations.json` 后执行 `python tools/build_data.py`。键为篇目 ID，`stanzas` 的键为从 0 开始的章序；例子见该文件。请仅提交自行编写或有兼容授权的内容。

个人注释可写到被忽略的 `data/annotations.local.json`，格式相同。本地数据会覆盖同篇目的对应字段，**不要把私人文件提交到仓库**。

如自行使用有权使用的 PDF，可把它放到 `app/src/main/assets/source-book.pdf`，在被忽略的 `data/local-config.json` 写入 `{"sourcePageCount":820}`（页数应与实际文件一致），并在本地注释中配置篇目和章节的 `page` 字段。重新生成数据后会显示 PDF 入口。PDF 页码从 1 开始；未配置页码的篇目不显示入口。PDF 和 OCR 文件默认被忽略。

## 项目结构

```text
app/src/main/java/       安卓 WebView、外部链接、PDF 渲染
app/src/main/assets/     阅读界面、样式、编译后的诗文数据
app/src/main/res/        左“诗”右“注”的对称书页图标
data/                   MIT 来源诗文、项目示例注释、来源记录
tools/                  数据生成和 Windows 构建脚本
tests/                  数据、发布文件与浏览器交互检查
```

## 反馈与贡献

欢迎提交 Issue 或 Pull Request。诗文勘误请附出处，功能问题请说明操作步骤、安卓版本及应用版本。详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

联系作者：<newcosmosliu@outlook.com>。

代码按 MIT 协议开源。第三方数据及构建工具保留其原始许可声明。
