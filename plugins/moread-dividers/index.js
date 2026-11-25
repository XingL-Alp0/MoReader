'use strict';

module.exports = {
  activate(plugin) {
    plugin.log('更多分割线已启用：在 Markdown 中写 [hr style=wave]，或点击格式栏的插件菜单。');
  },

  deactivate() {
    // 没有注册定时器或监听器，无需清理。
  }
};