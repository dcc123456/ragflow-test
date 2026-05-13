# 测试工具规则

## 工具定位

| 工具 | 用途 | 参与测试记录 |
|------|------|-------------|
| **Playwright 脚本** | 唯一测试执行工具 | ✅ 是 |
| chrome-devtools | **禁止使用**，除非用户明确要求 | ❌ 否 |

## 禁止使用 chrome-devtools

**默认情况下，禁止使用 chrome-devtools MCP 工具执行测试步骤**

- chrome-devtools 只能用于用户明确要求的调试/探索场景
- 测试执行必须通过 Playwright 脚本
- 违反此规则视为测试记录不完整

## 核心原则

**只用 Playwright 脚本作为测试执行工具**

- 测试脚本 `.js` 文件是唯一的测试记录载体
- chrome-devtools 仅用于调试时探索页面元素
- 边测边写 = 直接写 Playwright 代码到脚本

## 执行流程

```
1. 编辑 .js 脚本文件（Playwright 代码）
2. 运行脚本 → node test-script-temp/{任务名}.js
3. 失败 → 用 chrome-devtools 探索页面
4. 修复脚本 → 重新运行
5. 通过 → 测试完成，脚本即记录
```

## 脚本结构模板

```javascript
const { chromium } = require("playwright");
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});
const { loginWithFallback } = require("./utils/login-helper");

const TEST_CONFIG = {
  baseUrl: process.env.TEST_URL || "http://localhost:9222",
  email: process.env.TEST_EMAIL || "dcc-test1@gmail.com",
  password: process.env.TEST_PASSWORD || "123456",
  timeout: 30000,
};

async function runTest() {
  const browser = await chromium.launch({
    headless: false,
    args: ["--start-maximized", "--no-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  try {
    // Step 1: 登录（使用 login-helper）
    const loginResult = await loginWithFallback(page, TEST_CONFIG);
    if (!loginResult.success) {
      throw new Error("登录失败: " + loginResult.message);
    }

    // Step 2: 进入知识库
    await page.goto(`${TEST_CONFIG.baseUrl}/datasets`);
    await page.waitForLoadState("networkidle");

    // ... 更多步骤

    console.log("测试通过");
  } catch (error) {
    console.error("测试失败:", error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = { runTest };
```

**注意**：登录必须使用 `login-helper.js` 的 `loginWithFallback`，禁止手动填写登录表单。

## 注意事项

- **不要**用 chrome-devtools 执行测试步骤
- **不要**测完再补脚本，要边测边写
- 脚本中的选择器要稳定，避免使用随机生成的 uid
- 每次操作后适当等待（`waitForLoadState` / `waitForTimeout`）
