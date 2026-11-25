// 校验主题包里的自定义按钮脚本：能编译、按预期调用 app API
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pack = JSON.parse(fs.readFileSync(path.join(here, "../theme.json"), "utf8"));

function makeMock(selection) {
  const calls = [];
  const app = {
    content: "# demo",
    selection,
    info: { name: "demo.md", path: "D:\\demo.md", dirty: false, length: 6 },
    insert: async (text) => calls.push(["insert", text]),
    replaceSelection: async (text) => calls.push(["replace", text]),
    toast: (message) => calls.push(["toast", message])
  };
  return { app, calls };
}

async function run(script, selection) {
  const { app, calls } = makeMock(selection);
  const runner = new Function("app", "markdown", `"use strict"; return (async () => {\n${script}\n})();`);
  await runner(app, app);
  return calls;
}

let failed = 0;
for (const button of pack.theme.customButtons) {
  try {
    const calls = await run(button.script, "第一行\n第二行");
    console.log(`✓ ${button.label}`, JSON.stringify(calls, null, 0));
  } catch (error) {
    failed += 1;
    console.error(`✗ ${button.label}: ${error.message}`);
  }
}

// 空选区时第二个按钮应只提示，不改动内容
const quoteButton = pack.theme.customButtons.find((item) => item.label === "月光引用");
const emptyCalls = await run(quoteButton.script, "");
console.log("空选区：", JSON.stringify(emptyCalls));
if (emptyCalls.some(([kind]) => kind === "replace")) {
  failed += 1;
  console.error("✗ 空选区时不应调用 replaceSelection");
}

process.exit(failed ? 1 : 0);
