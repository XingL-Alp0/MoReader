// 用 App 自己的注册表（theme.js）交叉检查 theme.json
import fs from "node:fs";
import * as theme from "./theme.mjs";

const pack = JSON.parse(fs.readFileSync(new URL("../theme.json", import.meta.url), "utf8"));
const ids = new Set(theme.COMPONENT_COLORS.map((item) => item.id));
const uiIds = new Set(theme.UI_ITEM_MAP.keys());
let failures = 0;

for (const [key, value] of Object.entries(pack.theme.componentColors)) {
  if (!ids.has(key)) {
    console.log("✗ 未知组件颜色键", key);
    failures += 1;
  }
  if (theme.normalizeHex(value, "") !== value) {
    console.log("✗ 颜色不合法", key, value);
    failures += 1;
  }
}
for (const id of pack.theme.uiHidden) {
  if (!uiIds.has(id)) {
    console.log("✗ 未知界面元素", id);
    failures += 1;
  }
}

const missing = [...ids].filter((id) => !(id in pack.theme.componentColors));
console.log("组件颜色：", Object.keys(pack.theme.componentColors).length, "/", ids.size, "| 未覆盖：", missing.length ? missing : "无");
console.log("界面隐藏：", pack.theme.uiHidden.join(", ") || "无", "| 合法：", pack.theme.uiHidden.every((id) => uiIds.has(id)));
console.log("图标/贴纸：", pack.theme.brandIcon.type, pack.theme.stickers.map((item) => item.type).join("/"));
console.log("结果：", failures ? `FAIL (${failures})` : "OK");
process.exit(failures ? 1 : 0);
