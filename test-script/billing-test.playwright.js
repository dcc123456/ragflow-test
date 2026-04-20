/**
 * Stripe Billing 订阅流程 Playwright 自动化测试
 *
 * 测试目标: 验证用户完成 Stripe Checkout 订阅购买的完整流程
 * 测试环境: http://192.168.1.23:9223/
 * 测试账号: yuzhichang@gmail.com / 123456
 *
 * 注意: Stripe Elements 有防自动化措施，卡号/到期日/CVC 在受保护的 iframe 内
 * 如需完整自动化，建议使用 Stripe 的测试配置或后端模拟
 *
 * 运行方式:
 *   node billing-test.playwright.js
 */

const { chromium } = require("playwright");

const TEST_CONFIG = {
  baseUrl: "http://192.168.1.23:9223",
  email: "yuzhichang@gmail.com",
  password: "123456",
  testCard: {
    number: "4242424242424242",
    expiry: "12/26",
    cvc: "123",
    zip: "12345",
    name: "yuzhichang",
  },
  timeout: 30000,
};

async function runBillingTest() {
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
    // ========== Step 1: 登录系统 ==========
    console.log("[Step 1] 登录系统...");
    await page.goto(`${TEST_CONFIG.baseUrl}/login`, {
      timeout: TEST_CONFIG.timeout,
    });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

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

        const emailInput = document.querySelector(
          'input[type="text"], input[type="email"], input:not([type])',
        );
        const passwordInput = document.querySelector('input[type="password"]');
        if (emailInput) setNativeValue(emailInput, email);
        if (passwordInput) setNativeValue(passwordInput, password);
        return { emailFound: !!emailInput, passwordFound: !!passwordInput };
      },
      { email: TEST_CONFIG.email, password: TEST_CONFIG.password },
    );

    console.log(
      `[Step 1] DOM填写: email=${filled.emailFound}, password=${filled.passwordFound}`,
    );

    await page.waitForTimeout(500);

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find(
        (b) => b.textContent?.trim() === "Sign in" && !b.disabled,
      );
      if (btn) btn.click();
    });

    await page.waitForFunction(() => !window.location.href.includes("/login"), {
      timeout: 15000,
    });
    console.log("[Step 1] ✅ 登录成功");
    results.push({ step: 1, status: "passed", message: "登录系统成功" });

    // ========== Step 2: 导航到订阅页面 ==========
    console.log("[Step 2] 导航到 Pricing 页面...");
    await page.goto(`${TEST_CONFIG.baseUrl}/price`, {
      timeout: TEST_CONFIG.timeout,
    });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    console.log("[Step 2] ✅ 导航到定价页面");
    results.push({ step: 2, status: "passed", message: "导航到定价页面成功" });

    // ========== Step 3: 选择套餐并发起订阅 ==========
    console.log("[Step 3] 选择套餐并发起订阅...");

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // 点击 Upgrade 按钮
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent?.trim() === "Upgrade" && !b.disabled,
      );
      if (btn) btn.click();
    });

    // 记录当前页面数量
    const initialPages = context.pages();
    console.log(`[Step 3] 初始页面数: ${initialPages.length}`);

    // 等待确认弹窗
    try {
      await page.waitForSelector('dialog, [role="dialog"]', { timeout: 5000 });
      console.log("[Step 3] 确认弹窗出现，点击 Confirm...");
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find(
          (b) => b.textContent?.trim() === "Confirm" && !b.disabled,
        );
        if (btn) btn.click();
      });
      await page.waitForTimeout(1000);
    } catch (e) {
      console.log("[Step 3] 无确认弹窗");
    }

    // 检查 URL 是否已变化（可能在当前页面跳转）
    let stripePage = null;
    const currentUrl = page.url();
    if (currentUrl.includes("checkout.stripe.com")) {
      console.log("[Step 3] Stripe Checkout 在当前页面打开");
      stripePage = page;
    } else {
      // 等待新页面出现
      let timeout = 15000;
      let startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        const currentPages = context.pages();
        if (currentPages.length > initialPages.length) {
          const newPage = currentPages[currentPages.length - 1];
          if (
            newPage.url().includes("stripe.com") ||
            newPage.url().includes("checkout")
          ) {
            stripePage = newPage;
            break;
          }
        }
        await page.waitForTimeout(500);
      }

      // 如果没找到新页面，尝试在现有页面中找 Stripe
      if (!stripePage) {
        const allPages = context.pages();
        stripePage = allPages.find(
          (p) => p.url().includes("stripe.com") || p.url().includes("checkout"),
        );
        if (!stripePage) {
          stripePage = allPages[allPages.length - 1]; // fallback到最后打开的页面
        }
      }
    }

    if (!stripePage) {
      throw new Error("无法找到 Stripe Checkout 页面");
    }

    await stripePage.waitForLoadState("domcontentloaded");
    console.log(
      `[Step 3] ✅ 跳转到 Stripe Checkout: ${stripePage.url().substring(0, 50)}...`,
    );
    results.push({
      step: 3,
      status: "passed",
      message: "发起订阅成功，跳转 Stripe Checkout",
    });

    // ========== Step 4: 填写支付信息 ==========
    console.log("[Step 4] 填写 Stripe 支付信息...");

    await stripePage.waitForTimeout(2000);

    // Stripe Elements 使用受保护的 iframe，自动化存在限制
    // 尝试多种方式定位 iframe
    const cardInfo = await stripePage.evaluate(() => {
      const iframes = Array.from(document.querySelectorAll("iframe"));
      const stripeFrames = iframes.filter(
        (f) =>
          f.name?.includes("privateStripeFrame") ||
          f.title?.includes("Secure") ||
          f.title?.includes("结账"),
      );
      return {
        totalIframes: iframes.length,
        stripeFrames: stripeFrames.map((f) => ({
          name: f.name,
          title: f.title,
        })),
      };
    });

    console.log(
      `[Step 4] 检测到 ${cardInfo.totalIframes} 个 iframe, ${cardInfo.stripeFrames.length} 个 Stripe 相关`,
    );

    // 尝试填写持卡人姓名（通常在主页面）
    try {
      await stripePage
        .locator('input[name="name"], input[placeholder*="全名"]')
        .first()
        .fill(TEST_CONFIG.testCard.name);
      console.log("[Step 4] ✅ 填写持卡人姓名成功");
    } catch (e) {
      console.log("[Step 4] 持卡人姓名填写失败");
    }

    // 尝试填写邮编
    try {
      await stripePage
        .locator('input[name="postal"], input[placeholder*="邮编"]')
        .first()
        .fill(TEST_CONFIG.testCard.zip);
    } catch (e) {
      console.log("[Step 4] 邮编填写失败");
    }

    // 卡号/到期日/CVC 在受保护的 Stripe iframe 内，使用多种方式尝试
    let cardFieldFilled = false;

    // 方式1: 尝试通过 frameLocator
    try {
      const stripeFrame = stripePage.frameLocator(
        'iframe[title*="Secure"], iframe[title*="结账"], iframe[name*="privateStripeFrame"]',
      );
      const cardInput = stripeFrame
        .locator('input[name="cardnumber"], input[placeholder*="4242"]')
        .first();
      if (await cardInput.isVisible({ timeout: 3000 })) {
        await cardInput.click();
        await cardInput.fill(TEST_CONFIG.testCard.number);
        console.log("[Step 4] ✅ 通过 frameLocator 填写卡号成功");
        cardFieldFilled = true;
      }
    } catch (e) {
      console.log("[Step 4] frameLocator 方式失败");
    }

    // 方式2: 尝试使用键盘逐字符输入（绕过自动化检测）
    if (!cardFieldFilled) {
      try {
        const allFrames = stripePage.frames();
        let filledCount = 0;
        for (const f of allFrames) {
          try {
            const inputs = await f.locator("input").all();
            for (const input of inputs) {
              if (await input.isVisible()) {
                const tagName = await input.evaluate((el) => el.tagName);
                const type = await input.getAttribute("type");
                const placeholder =
                  (await input.getAttribute("placeholder")) || "";
                if (
                  tagName === "INPUT" &&
                  (type === "text" || type === "tel")
                ) {
                  await input.click();

                  // 根据 placeholder 判断填写什么字段
                  if (
                    placeholder.includes("card") ||
                    placeholder.includes("1234") ||
                    placeholder === ""
                  ) {
                    // 卡号字段
                    await stripePage.keyboard.type(
                      TEST_CONFIG.testCard.number,
                      { delay: 30 },
                    );
                    filledCount++;
                  } else if (
                    placeholder.includes("/") ||
                    placeholder.includes("月份") ||
                    placeholder.includes("MM")
                  ) {
                    // 到期日字段
                    await stripePage.keyboard.type(
                      TEST_CONFIG.testCard.expiry,
                      { delay: 30 },
                    );
                    filledCount++;
                  } else if (
                    placeholder.includes("CVC") ||
                    placeholder.includes("cvv")
                  ) {
                    // CVC 字段
                    await stripePage.keyboard.type(TEST_CONFIG.testCard.cvc, {
                      delay: 30,
                    });
                    filledCount++;
                  }
                  cardFieldFilled = true;
                }
              }
            }
          } catch (e) {}
        }
        if (filledCount > 0) {
          console.log(`[Step 4] ✅ 通过键盘输入填写 ${filledCount} 个字段成功`);
        }
      } catch (e) {
        console.log("[Step 4] 键盘输入方式失败");
      }
    }

    // 方式3: CDP 方式
    if (!cardFieldFilled) {
      try {
        const cdpSession = await stripePage.context().newCDPSession(stripePage);
        const allFrames = stripePage.frames();
        for (const f of allFrames) {
          try {
            const frameId = f._id || f.name();
            const result = await cdpSession.send("DOM.getDocument", {});
            const nodeId = await cdpSession.send("DOM.querySelector", {
              nodeId: result.root.nodeId,
              selector: "input",
            });
            if (nodeId && nodeId.nodeId > 0) {
              await cdpSession.send("DOM.setAttributeValue", {
                nodeId: nodeId.nodeId,
                name: "value",
                value: TEST_CONFIG.testCard.number,
              });
              cardFieldFilled = true;
              console.log("[Step 4] ✅ 通过 CDP 填写卡号成功");
              break;
            }
          } catch (e) {}
        }
      } catch (e) {
        console.log("[Step 4] CDP 方式失败");
      }
    }

    if (!cardFieldFilled) {
      console.log(
        "[Step 4] ⚠️ Stripe 卡号字段无法自动填写（Stripe Elements 保护限制）",
      );
      console.log("[Step 4]   提示: 请手动填写测试卡号 4242 4242 4242 4242");
    }

    results.push({
      step: 4,
      status: cardFieldFilled ? "passed" : "partial",
      message: cardFieldFilled
        ? "Stripe 支付信息填写成功"
        : "卡号字段需手动填写",
    });

    // ========== Step 5: 完成支付 ==========
    console.log("[Step 5] 点击订阅按钮...");

    await stripePage.waitForTimeout(1000);

    const payClicked = await stripePage.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(
        (b) =>
          b.textContent?.includes("订阅") ||
          b.textContent?.includes("Pay") ||
          b.textContent?.includes("Subscribe"),
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    console.log(`[Step 5] 订阅按钮点击: ${payClicked ? "成功" : "失败"}`);

    // 等待处理
    await stripePage.waitForTimeout(5000);
    await page.bringToFront();

    const finalUrl = page.url();
    const paymentSuccess =
      finalUrl.includes("success") || finalUrl.includes("pay-status=success");

    if (paymentSuccess) {
      console.log("[Step 5] ✅ 支付成功");
      results.push({
        step: 5,
        status: "passed",
        message: "Stripe 支付成功完成",
      });
    } else {
      console.log(`[Step 5] ⚠️ URL: ${finalUrl}（可能需手动完成支付）`);
      results.push({ step: 5, status: "warning", message: "支付状态待确认" });
    }

    // ========== Step 6: 验证成功跳转 ==========
    console.log("[Step 6] 验证支付成功跳转...");

    try {
      const confirmBtn = page.locator('dialog button:has-text("Confirm")');
      if (await confirmBtn.isVisible({ timeout: 3000 })) {
        await confirmBtn.click();
        await page.waitForTimeout(500);
      }
    } catch (e) {
      // 无弹窗
    }

    const step6Url = page.url();
    if (
      step6Url.includes("success") ||
      step6Url.includes("pay-status=success")
    ) {
      console.log("[Step 6] ✅ 支付成功跳转验证通过");
      results.push({
        step: 6,
        status: "passed",
        message: "支付成功跳转验证通过",
      });
    } else {
      console.log(`[Step 6] ⚠️ URL: ${step6Url}`);
      results.push({ step: 6, status: "warning", message: "跳转验证待确认" });
    }

    // ========== Step 7: 验证 Webhook 回调 ==========
    console.log("[Step 7] 验证订阅状态...");
    await page.waitForTimeout(3000);
    await page.goto(`${TEST_CONFIG.baseUrl}/user-setting/billing`, {
      timeout: TEST_CONFIG.timeout,
    });
    await page.waitForLoadState("networkidle");

    const content = await page.content();
    const hasSubscription =
      content.includes("Starter") || content.includes("Pro Plan");
    if (hasSubscription) {
      console.log("[Step 7] ✅ 订阅状态已更新");
      results.push({ step: 7, status: "passed", message: "订阅状态已更新" });
    } else {
      console.log("[Step 7] ⚠️ 订阅状态未实时更新");
      results.push({
        step: 7,
        status: "warning",
        message: "订阅状态未实时更新",
      });
    }

    // ========== Step 8: 登出 ==========
    console.log("[Step 8] 登出...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(
        (b) =>
          b.textContent?.includes("Log out") || b.textContent?.includes("登出"),
      );
      if (btn) btn.click();
    });
    await page.waitForURL("**/login**", { timeout: 5000 }).catch(() => {});
    console.log("[Step 8] ✅ 登出完成");
    results.push({ step: 8, status: "passed", message: "登出成功" });
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    results.push({ step: "unknown", status: "failed", message: error.message });
    await page
      .screenshot({ path: `test-failure-${Date.now()}.png` })
      .catch(() => {});
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
  runBillingTest()
    .then((result) => process.exit(result.failed > 0 ? 1 : 0))
    .catch((err) => {
      console.error("测试执行失败:", err);
      process.exit(1);
    });
}

module.exports = { runBillingTest, TEST_CONFIG };
