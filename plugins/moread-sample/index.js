'use strict';

module.exports = {
  activate(plugin) {
    plugin.log('示例插件已启用：在 Markdown 中写 [note title="提示" content="你好"]');
  },

  deactivate() {
    // 插件没有注册定时器或监听器，无需清理。
  }
};