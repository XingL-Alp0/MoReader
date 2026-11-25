/* Visual LaTeX palette, templates and source-range scanning. */

const item = (insert, preview, label) => ({
  insert,
  preview: preview === undefined ? insert.replace(/\|/g, "") : preview,
  label: label || ""
});

export const LATEX_GROUPS = [
  {
    id: "structure",
    label: "结构",
    items: [
      item("\\frac{|}{}", "\\frac{a}{b}", "分式"),
      item("\\sqrt{|}", "\\sqrt{x}", "根式"),
      item("\\sqrt[3]{|}", "\\sqrt[3]{x}", "n 次根"),
      item("^{|}", "x^{2}", "上标"),
      item("_{|}", "x_{i}", "下标"),
      item("_{|}^{}", "x_{i}^{2}", "上下标"),
      item("\\left( | \\right)", "\\left( x \\right)", "圆括号"),
      item("\\left[ | \\right]", "\\left[ x \\right]", "方括号"),
      item("\\left\\{ | \\right\\}", "\\left\\{ x \\right\\}", "花括号"),
      item("\\left\\lvert | \\right\\rvert", "\\left\\lvert x \\right\\rvert", "绝对值"),
      item("\\left\\lVert | \\right\\rVert", "\\left\\lVert x \\right\\rVert", "范数"),
      item("\\left\\langle | \\right\\rangle", "\\left\\langle x \\right\\rangle", "尖括号"),
      item("\\binom{|}{}", "\\binom{n}{k}", "组合数"),
      item("\\vec{|}", "\\vec{v}", "向量"),
      item("\\hat{|}", "\\hat{y}", "估计值"),
      item("\\bar{|}", "\\bar{x}", "平均值"),
      item("\\dot{|}", "\\dot{x}", "一阶导"),
      item("\\ddot{|}", "\\ddot{x}", "二阶导"),
      item("\\tilde{|}", "\\tilde{x}", "波浪"),
      item("\\overline{|}", "\\overline{AB}", "上划线"),
      item("\\underline{|}", "\\underline{AB}", "下划线"),
      item("\\overbrace{|}^{}", "\\overbrace{a+b}^{n}", "上花括号"),
      item("\\underbrace{|}_{}", "\\underbrace{a+b}_{n}", "下花括号"),
      item("\\stackrel{|}{=}", "\\stackrel{def}{=}", "堆叠"),
      item("\\text{|}", "\\text{文字}", "文本")
    ]
  },
  {
    id: "basic",
    label: "基础",
    items: [
      item("+", "+"),
      item("-", "-"),
      item("=", "="),
      item("\\times", "\\times"),
      item("\\div", "\\div"),
      item("\\pm", "\\pm"),
      item("\\mp", "\\mp"),
      item("\\cdot", "\\cdot"),
      item("\\neq", "\\neq"),
      item("\\approx", "\\approx"),
      item("\\equiv", "\\equiv"),
      item("\\leq", "\\leq"),
      item("\\geq", "\\geq"),
      item("<", "<"),
      item(">", ">"),
      item("\\%", "\\%"),
      item("\\infty", "\\infty"),
      item("\\partial", "\\partial"),
      item("\\nabla", "\\nabla"),
      item("\\forall", "\\forall"),
      item("\\exists", "\\exists"),
      item("\\emptyset", "\\emptyset"),
      item("\\ldots", "\\ldots"),
      item("\\cdots", "\\cdots")
    ]
  },
  {
    id: "greek",
    label: "希腊",
    items: [
      item("\\alpha", "\\alpha"),
      item("\\beta", "\\beta"),
      item("\\gamma", "\\gamma"),
      item("\\delta", "\\delta"),
      item("\\epsilon", "\\epsilon"),
      item("\\varepsilon", "\\varepsilon"),
      item("\\zeta", "\\zeta"),
      item("\\eta", "\\eta"),
      item("\\theta", "\\theta"),
      item("\\vartheta", "\\vartheta"),
      item("\\iota", "\\iota"),
      item("\\kappa", "\\kappa"),
      item("\\lambda", "\\lambda"),
      item("\\mu", "\\mu"),
      item("\\nu", "\\nu"),
      item("\\xi", "\\xi"),
      item("\\pi", "\\pi"),
      item("\\rho", "\\rho"),
      item("\\sigma", "\\sigma"),
      item("\\tau", "\\tau"),
      item("\\upsilon", "\\upsilon"),
      item("\\phi", "\\phi"),
      item("\\varphi", "\\varphi"),
      item("\\chi", "\\chi"),
      item("\\psi", "\\psi"),
      item("\\omega", "\\omega"),
      item("\\Gamma", "\\Gamma"),
      item("\\Delta", "\\Delta"),
      item("\\Theta", "\\Theta"),
      item("\\Lambda", "\\Lambda"),
      item("\\Xi", "\\Xi"),
      item("\\Pi", "\\Pi"),
      item("\\Sigma", "\\Sigma"),
      item("\\Phi", "\\Phi"),
      item("\\Psi", "\\Psi"),
      item("\\Omega", "\\Omega")
    ]
  },
  {
    id: "relation",
    label: "关系",
    items: [
      item("\\in", "\\in"),
      item("\\notin", "\\notin"),
      item("\\ni", "\\ni"),
      item("\\subset", "\\subset"),
      item("\\supset", "\\supset"),
      item("\\subseteq", "\\subseteq"),
      item("\\supseteq", "\\supseteq"),
      item("\\cup", "\\cup"),
      item("\\cap", "\\cap"),
      item("\\setminus", "\\setminus"),
      item("\\sim", "\\sim"),
      item("\\simeq", "\\simeq"),
      item("\\cong", "\\cong"),
      item("\\propto", "\\propto"),
      item("\\perp", "\\perp"),
      item("\\parallel", "\\parallel"),
      item("\\angle", "\\angle"),
      item("\\triangle", "\\triangle"),
      item("\\because", "\\because"),
      item("\\therefore", "\\therefore")
    ]
  },
  {
    id: "arrow",
    label: "箭头",
    items: [
      item("\\to", "\\to"),
      item("\\leftarrow", "\\leftarrow"),
      item("\\rightarrow", "\\rightarrow"),
      item("\\leftrightarrow", "\\leftrightarrow"),
      item("\\Rightarrow", "\\Rightarrow"),
      item("\\Leftarrow", "\\Leftarrow"),
      item("\\Leftrightarrow", "\\Leftrightarrow"),
      item("\\mapsto", "\\mapsto"),
      item("\\uparrow", "\\uparrow"),
      item("\\downarrow", "\\downarrow"),
      item("\\longrightarrow", "\\longrightarrow"),
      item("\\xrightarrow{|}", "\\xrightarrow{f}", "带标注箭头"),
      item("\\nearrow", "\\nearrow"),
      item("\\searrow", "\\searrow"),
      item("\\implies", "\\implies"),
      item("\\iff", "\\iff")
    ]
  },
  {
    id: "operator",
    label: "运算",
    items: [
      item("\\sum", "\\sum"),
      item("\\sum_{|}^{}", "\\sum_{i=1}^{n}", "求和"),
      item("\\prod", "\\prod"),
      item("\\prod_{|}^{}", "\\prod_{i=1}^{n}", "连乘"),
      item("\\int", "\\int"),
      item("\\int_{|}^{}", "\\int_{a}^{b}", "定积分"),
      item("\\iint", "\\iint"),
      item("\\oint", "\\oint"),
      item("\\lim", "\\lim"),
      item("\\lim_{| \\to 0}", "\\lim_{x \\to 0}", "极限"),
      item("\\sin", "\\sin"),
      item("\\cos", "\\cos"),
      item("\\tan", "\\tan"),
      item("\\cot", "\\cot"),
      item("\\sec", "\\sec"),
      item("\\csc", "\\csc"),
      item("\\arcsin", "\\arcsin"),
      item("\\arccos", "\\arccos"),
      item("\\arctan", "\\arctan"),
      item("\\log", "\\log"),
      item("\\ln", "\\ln"),
      item("\\lg", "\\lg"),
      item("\\exp", "\\exp"),
      item("\\max", "\\max"),
      item("\\min", "\\min"),
      item("\\sup", "\\sup"),
      item("\\inf", "\\inf"),
      item("\\det", "\\det"),
      item("\\gcd", "\\gcd"),
      item("\\operatorname{|}", "\\operatorname{sgn}", "自定义函数名"),
      item("\\partial", "\\partial")
    ]
  },
  {
    id: "env",
    label: "环境",
    items: [
      item(
        "\\begin{matrix}\n| & \\\\\n & \n\\end{matrix}",
        "\\begin{matrix}a & b \\\\ c & d\\end{matrix}",
        "矩阵"
      ),
      item(
        "\\begin{pmatrix}\n| & \\\\\n & \n\\end{pmatrix}",
        "\\begin{pmatrix}a & b \\\\ c & d\\end{pmatrix}",
        "圆括号矩阵"
      ),
      item(
        "\\begin{bmatrix}\n| & \\\\\n & \n\\end{bmatrix}",
        "\\begin{bmatrix}a & b \\\\ c & d\\end{bmatrix}",
        "方括号矩阵"
      ),
      item(
        "\\begin{vmatrix}\n| & \\\\\n & \n\\end{vmatrix}",
        "\\begin{vmatrix}a & b \\\\ c & d\\end{vmatrix}",
        "行列式"
      ),
      item(
        "\\begin{Vmatrix}\n| & \\\\\n & \n\\end{Vmatrix}",
        "\\begin{Vmatrix}a & b \\\\ c & d\\end{Vmatrix}",
        "范数矩阵"
      ),
      item(
        "\\begin{cases}\n| & x > 0 \\\\\n & x \\le 0\n\\end{cases}",
        "\\begin{cases}x & x > 0 \\\\ -x & x \\le 0\\end{cases}",
        "分段函数"
      ),
      item(
        "\\begin{aligned}\n| &= \\\\\n &= \n\\end{aligned}",
        "\\begin{aligned}a &= b \\\\ &= c\\end{aligned}",
        "多行对齐"
      ),
      item(
        "\\begin{cases}\n| + y = 1 \\\\\n - y = 0\n\\end{cases}",
        "\\begin{cases}x + y = 1 \\\\ x - y = 0\\end{cases}",
        "方程组"
      ),
      item(
        "\\begin{array}{|c|c|}\n\\hline\n| & \\\\\n\\hline\n & \\\\\n\\hline\n\\end{array}",
        "\\begin{array}{|c|c|}\\hline a & b \\\\ \\hline c & d \\\\ \\hline\\end{array}",
        "表格"
      ),
      item(
        "\\begin{aligned}| \\end{aligned}",
        "\\begin{aligned}a = b\\end{aligned}",
        "对齐环境"
      )
    ]
  },
  {
    id: "font",
    label: "字体",
    items: [
      item("\\mathbf{|}", "\\mathbf{ABC}", "粗体"),
      item("\\mathit{|}", "\\mathit{ABC}", "斜体"),
      item("\\mathrm{|}", "\\mathrm{d}x", "直立体"),
      item("\\mathbb{|}", "\\mathbb{R}", "黑板体"),
      item("\\mathcal{|}", "\\mathcal{L}", "花体"),
      item("\\mathfrak{|}", "\\mathfrak{g}", "哥特体"),
      item("\\operatorname{|}", "\\operatorname{rank}", "函数名"),
      item("\\text{|}", "\\text{文字}", "文本"),
      item("\\,", "\\,", "细空格"),
      item("\\;", "\\;", "中空格"),
      item("\\quad", "\\quad", "宽空格"),
      item("\\qquad", "\\qquad", "双宽空格"),
      item("\\\\", "\\\\", "换行")
    ]
  }
];

export const LATEX_TEMPLATES = [
  {
    name: "分式",
    tex: "\\frac{a}{b}"
  },
  {
    name: "二次公式",
    tex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"
  },
  {
    name: "求和",
    tex: "\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}"
  },
  {
    name: "积分",
    tex: "\\int_{a}^{b} f(x)\\,dx"
  },
  {
    name: "极限",
    tex: "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1"
  },
  {
    name: "矩阵",
    tex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}"
  },
  {
    name: "行列式",
    tex: "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix} = ad - bc"
  },
  {
    name: "分段函数",
    tex: "f(x) = \\begin{cases} x & x \\ge 0 \\\\ -x & x < 0 \\end{cases}"
  },
  {
    name: "方程组",
    tex: "\\begin{cases} x + y = 1 \\\\ x - y = 0 \\end{cases}"
  },
  {
    name: "向量",
    tex: "\\vec{a} \\cdot \\vec{b} = |\\vec{a}||\\vec{b}|\\cos\\theta"
  },
  {
    name: "矩阵乘法",
    tex: "\\mathbf{A} = \\begin{bmatrix} a_{11} & a_{12} \\\\ a_{21} & a_{22} \\end{bmatrix}"
  },
  {
    name: "欧拉公式",
    tex: "e^{i\\pi} + 1 = 0"
  }
];

export function normalizeTex(tex) {
  return String(tex || "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

/* -------------------------------------------------------------------------- */
/* Source range scanning                                                       */
/* -------------------------------------------------------------------------- */

function pushRange(ranges, text, start, end, display) {
  ranges.push({
    start,
    end,
    display,
    tex: text.slice(start + (display ? 2 : 1), end - (display ? 2 : 1))
  });
}

export function findMathRanges(markdown) {
  const text = String(markdown || "");
  const ranges = [];
  let index = 0;
  let inFence = false;
  let fenceMarker = "";

  while (index < text.length) {
    const atLineStart = index === 0 || text[index - 1] === "\n";
    if (atLineStart) {
      const lineEnd = text.indexOf("\n", index);
      const line = text.slice(index, lineEnd === -1 ? text.length : lineEnd);
      const fenceMatch = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
      if (fenceMatch) {
        const marker = fenceMatch[1][0];
        if (!inFence) {
          inFence = true;
          fenceMarker = marker;
        } else if (fenceMarker === marker) {
          inFence = false;
        }
        index = lineEnd === -1 ? text.length : lineEnd + 1;
        continue;
      }
      if (inFence) {
        index = lineEnd === -1 ? text.length : lineEnd + 1;
        continue;
      }
    }

    if (text.startsWith("$$", index)) {
      const close = text.indexOf("$$", index + 2);
      if (close !== -1) {
        pushRange(ranges, text, index, close + 2, true);
        index = close + 2;
        continue;
      }
    }

    if (text.startsWith("\\[", index)) {
      const close = text.indexOf("\\]", index + 2);
      if (close !== -1) {
        ranges.push({
          start: index,
          end: close + 2,
          display: true,
          tex: text.slice(index + 2, close)
        });
        index = close + 2;
        continue;
      }
    }

    if (text.startsWith("\\(", index)) {
      const close = text.indexOf("\\)", index + 2);
      if (close !== -1) {
        ranges.push({
          start: index,
          end: close + 2,
          display: false,
          tex: text.slice(index + 2, close)
        });
        index = close + 2;
        continue;
      }
    }

    if (text[index] === "$" && text[index + 1] !== "$") {
      const escaped = index > 0 && text[index - 1] === "\\";
      const first = text[index + 1];
      if (!escaped && first && !/\s/.test(first)) {
        let cursor = index + 1;
        let closed = -1;
        while (cursor < text.length) {
          const char = text[cursor];
          if (char === "\\") {
            cursor += 2;
            continue;
          }
          if (char === "\n") break;
          if (char === "$") {
            closed = cursor;
            break;
          }
          cursor += 1;
        }
        if (closed > index + 1 && !/\s/.test(text[closed - 1])) {
          ranges.push({
            start: index,
            end: closed + 1,
            display: false,
            tex: text.slice(index + 1, closed)
          });
          index = closed + 1;
          continue;
        }
      }
    }

    if (text[index] === "`") {
      const run = /^`+/.exec(text.slice(index))[0];
      const close = text.indexOf(run, index + run.length);
      if (close !== -1) {
        index = close + run.length;
        continue;
      }
    }

    index += 1;
  }

  return ranges;
}