# 墨阅文档导航

> 项目事实以 [`项目说明.md`](项目说明.md) 为准；硬性规则以 [`../Agent.md`](../Agent.md) 为准；本文只负责「读哪份、改哪份、怎么保持一致」。

## 怎么读（按角色）

| 角色 | 先读 | 再读 |
| --- | --- | --- |
| 第一次接触 / 换对话接手 | [`项目说明.md`](项目说明.md) | [`../Agent.md`](../Agent.md) |
| 只想使用墨阅 | [`../README.md`](../README.md) | [`使用指南.md`](使用指南.md)、[`../插件制作指导.md`](../插件制作指导.md)、[`主题包制作指导.md`](主题包制作指导.md) |
| 改代码 | [`../Agent.md`](../Agent.md)、项目说明 §3 目录、§9 坑 | 对应源码文件 |
| 写插件 | [`../插件制作指导.md`](../插件制作指导.md) | [`../plugins/moread-sample/README.md`](../plugins/moread-sample/README.md)、[`../plugins/moread-dividers/README.md`](../plugins/moread-dividers/README.md)、项目说明 §6.6 |
| 做主题包 | [`主题包制作指导.md`](主题包制作指导.md) | README「主题包库」一节 |
| 打 Android 包 / 排移动端问题 | [`移动端打包踩坑记录.md`](移动端打包踩坑记录.md) | 项目说明 §8、§10 |
| 查历史改动 | [`../IMPLEMENTATION_NOTES.md`](../IMPLEMENTATION_NOTES.md) | 项目说明 §12 |

## 文档清单

| 文档 | 内容 | 谁维护 |
| --- | --- | --- |
| [`../README.md`](../README.md) | 面向用户：功能、运行、快捷键、插件/主题包使用、Android 差异 | 功能变化时更新 |
| [`介绍.md`](介绍.md) | 墨阅是什么、能做什么、数据与隐私、上手三步 | 产品定位变化时更新 |
| [`使用指南.md`](使用指南.md) | 打开保存、视图、公式图表、主题、插件、笔记夹、导出与快捷键 | 用户可见行为变化时更新 |
| [`../Agent.md`](../Agent.md) | 给 Agent 的硬性规则：不擅自打包、编码纪律、架构约定 | 约定变化时更新 |
| [`项目说明.md`](项目说明.md) | 交接文档：目录、架构、IPC、数据模型、构建、约定与坑、验证、已知限制 | 代码/架构变化时更新 |
| [`../插件制作指导.md`](../插件制作指导.md) | 插件作者教程：目录、`plugin.json`、自定义元素、脚本按钮、菜单命令（导入/导出/工具）、安装/卸载/调试、Android 端、安全 | 插件系统变化时更新 |
| [`主题包制作指导.md`](主题包制作指导.md) | 主题包字段、完整示例、排错 | 主题包格式变化时更新 |
| [`移动端打包踩坑记录.md`](移动端打包踩坑记录.md) | 工具链、SAF 授权、大文件 Base64、兼容层 | Android 构建变化时更新 |
| [`../plugins/moread-sample/README.md`](../plugins/moread-sample/README.md) | 示例插件（提示卡）：用法、定制与安全说明 | 示例插件变化时更新 |
| [`../plugins/moread-dividers/README.md`](../plugins/moread-dividers/README.md) | 示例插件（更多分割线）：用法、资源引用演示 | 示例插件变化时更新 |
| [`../plugins/moread-office/README.md`](../plugins/moread-office/README.md) | 示例插件（办公格式工具）：Word 导入、PDF 导出、双端说明 | 示例插件变化时更新 |
| [`../plugins/moread-en/README.md`](../plugins/moread-en/README.md) | 示例插件（English UI）：渲染层 `renderer` 脚本、界面翻译与中英切换 | 示例插件变化时更新 |
| [`wiki/README.md`](wiki/README.md) | 面向 GitHub Wiki 的中英双语页面（介绍 / 使用指南 / 主题包 / 插件）与上传说明 | 四份指南变化时同步中英两版 |
| [`../IMPLEMENTATION_NOTES.md`](../IMPLEMENTATION_NOTES.md) | 按轮次的变更记录（最新在最后）；只记「这轮改了什么」，不承担事实说明 | 每轮开发追加 |

## 维护规则

1. **一个主题只有一个主文档**：功能看 README，事实看项目说明，规则看 Agent.md，插件看插件制作指导。其他文档只链接，不复述细节。
2. **改代码同步改文档**（最小映射）：
   - 插件系统 → `插件制作指导.md` + 项目说明 §6.6 / §7 / §12
   - IPC / 设置项 → 项目说明 §5 / §6.1
   - 主题包格式 → README 主题包库 + 主题包制作指导
   - 打包 / Android → 项目说明 §4 / §8 + 移动端踩坑记录
3. **数量与行号以源码为准**：文档里写「约 / 见 xxx」比写死行号更耐用；引用行号时先 `grep` 确认。
4. **变更只追加到 `IMPLEMENTATION_NOTES.md`**，不写进项目说明；项目说明只描述「现在是什么」。
5. **四份内置指南由构建生成**：`docs/介绍.md`、`docs/使用指南.md`、`插件制作指导.md`、`docs/主题包制作指导.md` 会被 `npm run build:guides`（`npm run build` 自动执行）打包进 `src/renderer/guides.generated.js`，首次启动写入笔记夹。不要手改生成文件；改完这四份源文档后跑一次 build。
5. **术语统一**：使用「插件」「主题包」「设置 → 插件管理」「脚本按钮」；不混用「扩展 / 皮肤 / 脚本按钮 / 自定义按钮」以外的叫法。

## 一致性检查清单

改完功能或文档后按顺序过一遍：

- [ ] README 功能表与实际一致（尤其插件安装/卸载、脚本按钮确认、Android 限制）
- [ ] 项目说明的 IPC 列表包含新 channel，设置默认值表包含新键
- [ ] 项目说明 §12 没有过期断言（测试、CI、插件平台、签名）
- [ ] 插件制作指导里的安装/重扫/沙箱/权限描述与 `src/main/plugins.js` 一致
- [ ] 本文档清单里的相对链接都能打开
- [ ] `npm run test:plugins` 与 `npm run build` 通过

## 已知文档债务

- 截图仍来自较早版本：设置页的插件管理（安装/卸载/状态标签）、脚本确认框没有新截图。
- `docs/wiki/` 的中英页面是独立副本，功能变化时需要手工同步两边；目前没有自动校验（可先跑 `node tmp/check-wiki-links.js` 检查链接/围栏/语言配对）。
- 没有文档自动校验，靠上面的清单人工过一遍。