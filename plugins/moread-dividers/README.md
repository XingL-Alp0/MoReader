# 更多分割线（moread-dividers）

墨阅自带的第二个示例插件：给文档增加三种分隔线，同时演示**插件如何携带图片资源**。

## 用法

在 Markdown 文档里写：

```md
[hr style=wave]
[hr style=dots]
[hr style=double]
```

- `wave`：波浪线（SVG 资源）
- `dots`：圆点线（SVG 资源）
- `double`：双线（纯 CSS）
- 不写 `style` 时使用默认值 `wave`

插件启用后，桌面格式栏会多出一个属于本插件的波浪图标（`assets/icon.svg`）：点开只列本插件的动作，可以直接选「波浪 / 圆点 / 双线」三种分割线；选元素「分割线」时会先弹出表单，选择样式（波浪线 / 圆点线 / 双线）后再插入。手机端这个插件会归入「插件」总下拉。

## 资源是怎么带上的

`plugin.json` 里用 `resources` 声明插件目录内的文件：

```json
"resources": {
  "wave": "assets/wave.svg",
  "dots": "assets/dots.svg"
}
```

模板（`elements[].html` / `elements[].css`）里用 `{resource:key}` 引用：

```css
.moread-divider-wave { mask-image: url({resource:wave}); }
```

墨阅会把声明过的资源解析成插件目录内的文件 URL，未声明、缺失或越出插件目录的文件不会暴露；插件安装到用户目录后，资源也一起存放在应用内部（`<userData>/plugins/moread-dividers/assets/`）。

## 自定义

- 改 `assets/*.svg` 可替换纹理；换成自己的文件后重新「安装插件（.zip）」或重新扫描即可。
- 改 `elements[0].css` 可调整高度、间距、透明度、颜色（默认跟随主题强调色 `--accent`）。
- 三个按钮的 `script` 可以改成插入其他内容。

## 安全

插件是本地代码，脚本按钮第一次运行会显示来源与脚本内容并请求确认；只启用可信来源的插件。