# 第三方来源

## 古典诗文数据

`data/shijing.json` 来自 [chinese-poetry/chinese-poetry](https://github.com/chinese-poetry/chinese-poetry) 的 [诗经数据](https://github.com/chinese-poetry/chinese-poetry/blob/master/诗经/shijing.json)。按上游 MIT 协议使用，版权声明见 [LICENSES/chinese-poetry-MIT.txt](LICENSES/chinese-poetry-MIT.txt)。数据转换器保持原文用字与章序，未把私人扫描校订或现代注析加入其中；个别异体字、标点仍可提交勘误。

## Gradle Wrapper

Gradle Wrapper 来自 Gradle 8.9 官方仓库，采用 Apache-2.0 协议；见 `LICENSES/Gradle-Apache-2.0.txt`。下载文件的 SHA-256 及来源记录在 `gradle/wrapper/checksums.json`，发行包校验值写入 `gradle-wrapper.properties`。

## 原书 PDF 与安装包内书籍内容

仓库现随附用户提供的中华书局2017年版《诗经注析》（程俊英、蒋见元著）原书 PDF，路径为 `app/src/main/assets/source-book.pdf`。页码映射与文件 SHA-256 见 `data/pdf-pages.json`。Releases 中的完整 APK 还包含整理后的题解与章句注析。

原书及相关内容的著作权归相应权利人所有，不属于本项目 MIT 开源许可范围。有关交流学习、非商业用途及侵权删除的说明见 [使用声明](DISCLAIMER.md)。此说明不表示已取得版权授权。请不要把代码的 MIT 许可解释为对原书内容的再许可。

源代码默认生成的列表正文仍来自 MIT 授权的古典诗文数据，并只附少量自行编写的弹窗示例注释；它与 Releases 完整安装包的数据范围不同。仓库未另行提交整书 OCR 文本或私人阅读记录。
