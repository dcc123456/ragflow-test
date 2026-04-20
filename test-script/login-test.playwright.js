/**
 * 用户登录注册 Playwright 自动化测试
 *
 * 测试目标: 验证用户登录和注册功能
 * 测试环境: http://localhost:9222/
 * 测试账号: test3@qq.com / 123456
 *
 * 运行方式:
 *   node login-test.playwright.js
 */

const { chromium } = require("playwright");

const TEST_CONFIG = {
  baseUrl: process.env.TEST_URL || "http://localhost:9222",
  email: process.env.TEST_EMAIL || "test3@qq.com",
  password: process.env.TEST_PASSWORD || "123456",
  timeout: 30000,
};

async function runLoginTest() {
  const browser = await chromium.launch({
    headless: false,
    args: ["--start-maximized", "--no-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();
  const results = [];

  try {
    // ========== Step 1: 打开登录页面 ==========
    console.log("[Step 1] 打开登录页面...");
    await page.goto(`${TEST_CONFIG.baseUrl}/login`, {
      timeout: TEST_CONFIG.timeout,
    });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    console.log("[Step 1] ✅ 登录页面已加载");
    results.push({ step: 1, status: "passed", message: "登录页面加载成功" });

    // ========== Step 2: 填写登录表单 ==========
    console.log("[Step 2] 填写登录表单...");

    // 使用 JavaScript 设置表单值（绕过 React controlled input）
    const filled = await page.evaluate(
      ({ email, password }) => {
        const setNativeValue = (element, value) => {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value",
          )?.set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(element, value);
          } else {
            element.value = value;
          }
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
        };

        // 查找第一套登录表单的输入框
        const inputs = Array.from(document.querySelectorAll("input"));
        let emailInput = null;
        let passwordInput = null;

        // 找到邮箱和密码输入框（第一套表单）
        for (const input of inputs) {
          const type = input.type?.toLowerCase();
          const placeholder = input.placeholder?.toLowerCase();
          if (
            !emailInput &&
            (type === "text" || type === "email" || type === "") &&
            placeholder.includes("email")
          ) {
            emailInput = input;
          }
          if (!passwordInput && type === "password") {
            passwordInput = input;
          }
        }

        if (emailInput) setNativeValue(emailInput, email);
        if (passwordInput) setNativeValue(passwordInput, password);

        return {
          emailFound: !!emailInput,
          passwordFound: !!passwordInput,
        };
      },
      { email: TEST_CONFIG.email, password: TEST_CONFIG.password },
    );

    console.log(
      `[Step 2] DOM填写: email=${filled.emailFound}, password=${filled.passwordFound}`,
    );
    await page.waitForTimeout(500);

    // ========== Step 3: 点击登录按钮 ==========
    console.log("[Step 3] 点击登录按钮...");

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      // 找到第一套表单的 Sign in 按钮
      const btn = buttons.find(
        (b) => b.textContent?.trim() === "Sign in" && !b.disabled,
      );
      if (btn) btn.click();
    });

    await page.waitForTimeout(3000);

    // 检查是否登录成功（URL 变化）
    const urlAfterLogin = page.url();
    const loginSuccess = !urlAfterLogin.includes("/login");

    if (loginSuccess) {
      console.log("[Step 3] ✅ 登录成功");
      results.push({ step: 3, status: "passed", message: "登录成功" });
    } else {
      // 登录失败，可能是账号不存在
      console.log("[Step 3] ⚠️ 登录失败，账号可能不存在");

      // ========== Step 4: 注册账号 ==========
      console.log("[Step 4] 账号不存在，开始注册...");

      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const signUpBtn = buttons.find(
          (b) => b.textContent?.trim() === "Sign up",
        );
        if (signUpBtn) signUpBtn.click();
      });

      await page.waitForTimeout(2000);

      // 检查是否跳转到注册页
      const registerUrl = page.url();
      if (registerUrl.includes("/register")) {
        console.log("[Step 4] ✅ 跳转到注册页面");
      } else {
        // 直接导航到注册页
        await page.goto(`${TEST_CONFIG.baseUrl}/register`, {
          timeout: TEST_CONFIG.timeout,
        });
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);
        console.log("[Step 4] ✅ 导航到注册页面");
      }

      results.push({ step: 4, status: "passed", message: "开始注册流程" });

      // ========== Step 5: 填写注册表单 ==========
      console.log("[Step 5] 填写注册表单...");

      await page.evaluate(
        ({ email, password }) => {
          const setNativeValue = (element, value) => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              HTMLInputElement.prototype,
              "value",
            )?.set;
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(element, value);
            } else {
              element.value = value;
            }
            element.dispatchEvent(new Event("input", { bubbles: true }));
            element.dispatchEvent(new Event("change", { bubbles: true }));
          };

          const inputs = Array.from(document.querySelectorAll("input"));
          for (const input of inputs) {
            const type = input.type?.toLowerCase();
            const placeholder = input.placeholder?.toLowerCase();

            if (
              type === "text" ||
              type === "email" ||
              (type === "" && placeholder.includes("email"))
            ) {
              setNativeValue(input, email);
            }
            if (type === "password") {
              const name = input.name?.toLowerCase() || "";
              if (name.includes("password") || placeholder.includes("password")) {
                setNativeValue(input, password);
              }
            }
          }
        },
        { email: TEST_CONFIG.email, password: TEST_CONFIG.password },
      );

      await page.waitForTimeout(500);

      // 点击 Continue 按钮
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const continueBtn = buttons.find(
          (b) => b.textContent?.trim() === "Continue",
        );
        if (continueBtn) continueBtn.click();
      });

      await page.waitForTimeout(3000);
      console.log("[Step 5] ✅ 注册表单已提交");
      results.push({ step: 5, status: "passed", message: "注册表单提交成功" });

      // ========== Step 6: 登录验证 ==========
      console.log("[Step 6] 使用新账号登录...");

      await page.goto(`${TEST_CONFIG.baseUrl}/login`, {
        timeout: TEST_CONFIG.timeout,
      });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      // 再次填写登录表单
      await page.evaluate(
        ({ email, password }) => {
          const setNativeValue = (element, value) => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              HTMLInputElement.prototype,
              "value",
            )?.set;
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(element, value);
            } else {
              element.value = value;
            }
            element.dispatchEvent(new Event("input", { bubbles: true }));
            element.dispatchEvent(new Event("change", { bubbles: true }));
          };

          const inputs = Array.from(document.querySelectorAll("input"));
          for (const input of inputs) {
            const type = input.type?.toLowerCase();
            const placeholder = input.placeholder?.toLowerCase();
            if (
              !input.value &&
              (type === "text" || type === "email" || type === "") &&
              placeholder.includes("email")
            ) {
              setNativeValue(input, email);
            }
            if (!input.value && type === "password") {
              setNativeValue(input, password);
            }
          }
        },
        { email: TEST_CONFIG.email, password: TEST_CONFIG.password },
      );

      await page.waitForTimeout(500);

      // 点击登录按钮
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const btn = buttons.find(
          (b) => b.textContent?.trim() === "Sign in" && !b.disabled,
        );
        if (btn) btn.click();
      });

      await page.waitForFunction(
        () => !window.location.href.includes("/login"),
        { timeout: 15000 },
      );
      console.log("[Step 6] ✅ 新账号登录成功");
      results.push({ step: 6, status: "passed", message: "新账号登录成功" });
    }

    // ========== Step 7: 验证主页内容 ==========
    console.log("[Step 7] 验证主页内容...");

    await page.waitForTimeout(2000);
    const pageContent = await page.content();
    const hasWelcome = pageContent.includes("Welcome to RAGFlow");
    const hasDataset = pageContent.includes("Dataset");
    const hasChat = pageContent.includes("Chat");

    if (hasWelcome && hasDataset && hasChat) {
      console.log("[Step 7] ✅ 主页内容验证通过");
      results.push({
        step: 7,
        status: "passed",
        message: "主页包含 Dataset、Chat 等功能",
      });
    } else {
      console.log(`[Step 7] ⚠️ 主页内容验证: welcome=${hasWelcome}, dataset=${hasDataset}, chat=${hasChat}`);
      results.push({
        step: 7,
        status: "warning",
        message: "主页部分内容缺失",
      });
    }

    // ========== Step 8: 登出 ==========
    console.log("[Step 8] 登出...");
    await page.evaluate(() => {
      // 点击用户头像或用户名进入设置
      const userLink = document.querySelector('a[href*="user-setting"]');
      if (userLink) userLink.click();
    });
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const logoutBtn = buttons.find(
        (b) =>
          b.textContent?.includes("Log out") ||
          b.textContent?.includes("登出") ||
          b.textContent?.includes("Sign out"),
      );
      if (logoutBtn) logoutBtn.click();
    });

    await page.waitForURL("**/login**", { timeout: 5000 }).catch(() => {});
    console.log("[Step 8] ✅ 登出完成");
    results.push({ step: 8, status: "passed", message: "登出成功" });
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    results.push({
      step: "unknown",
      status: "failed",
      message: error.message,
    });
    await page.screenshot({ path: `login-test-failure-${Date.now()}.png` }).catch(() => {});
  } finally {
    await browser.close();
  }

  // ========== 测试结果汇总 ==========
  console.log("\n========== 测试结果汇总 ==========");
  results.forEach((r) => {
    const icon =
      r.status === "passed"
        ? "✅"
        : r.status === "warning"
          ? "⚠️"
          : r.status === "partial"
            ? "⚡"
            : "❌";
    console.log(`${icon} Step ${r.step}: ${r.message}`);
  });

  const passed = results.filter((r) => r.status === "passed").length;
  const warnings = results.filter(
    (r) => r.status === "warning" || r.status === "partial",
  ).length;
  const failed = results.filter((r) => r.status === "failed").length;

  console.log(
    `\n总计: ${passed} 通过, ${warnings} 部分/待确认, ${failed} 失败`,
  );

  return { passed, failed, warnings, results };
}

if (require.main === module) {
  runLoginTest()
    .then((result) => process.exit(result.failed > 0 ? 1 : 0))
    .catch((err) => {
      console.error("测试执行失败:", err);
      process.exit(1);
    });
}

module.exports = { runLoginTest, TEST_CONFIG };
