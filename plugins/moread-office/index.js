'use strict';

/**
 * 办公格式工具：命令都在 plugin.json 的 commands 里，入口脚本只做启用日志。
 * 命令脚本在渲染进程执行，桌面端与 Android 使用同一套 app API：
 * app.pickFile / app.importDocx / app.createDocument / app.exportPdf / app.insert。
 */
module.exports = {
  activate(plugin) {
    plugin.log('办公格式工具已启用：更多菜单里可导入 Word 文档或导出 PDF。');
  },

  deactivate() {
    // 没有定时器或监听器需要清理。
  }
};
