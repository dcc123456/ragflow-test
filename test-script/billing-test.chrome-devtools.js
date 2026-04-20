/**
 * Stripe Billing 订阅流程 - Chrome DevTools MCP 自动化测试
 *
 * 测试目标: 验证用户完成 Stripe Checkout 订阅购买的完整流程
 * 测试环境: http://192.168.1.23:9223/
 * 测试账号: yuzhichang@gmail.com / 123456
 *
 * 使用 Chrome DevTools MCP 服务执行自动化
 *
 * 运行方式:
 *   1. 确保 Chrome DevTools MCP 服务已启动
 *   2. 在 Claude Code 中按顺序执行以下工具调用
 */

const TEST_CONFIG = {
  baseUrl: "http://192.168.1.23:9223",
  email: "yuzhichang@gmail.com",
  password: "123456",
  testCard: {
    number: "4242424242424242",
    expiry: "1226",
    cvc: "123",
    zip: "12345",
    name: "yuzhichang"
  }
};

// ========== 完整自动化流程 ==========

/**
 * Step 1: 登录系统
 * await chrome_devtools.navigate_page("url", "http://192.168.1.23:9223/login");
 * await chrome_devtools.evaluate_script(`...登录脚本...`);
 * await chrome_devtools.wait_for(["Upgrade", "Starter", "Dataset"], { timeout: 15000 });
 */

/**
 * Step 2: 导航到定价页面
 * await chrome_devtools.navigate_page("url", "http://192.168.1.23:9223/price");
 * await chrome_devtools.wait_for(["$59", "Upgrade", "Starter"], { timeout: 15000 });
 */

/**
 * Step 3: 点击 Upgrade 并确认
 * // 点击 Starter Plan Upgrade 按钮 (uid 需通过 take_snapshot 获取)
 * await chrome_devtools.click("Upgrade按钮uid");
 * await chrome_devtools.wait_for(["Confirm", "Cancel"], { timeout: 5000 });
 * await chrome_devtools.click("Confirm按钮uid");
 */

/**
 * Step 4: 等待 Stripe 页面并填写表单
 * await chrome_devtools.list_pages(); // 找到新打开的 Stripe 页面
 * await chrome_devtools.select_page(stripePageId);
 * await chrome_devtools.wait_for(["卡号", "Subscribe"], { timeout: 10000 });
 *
 * // 填写 Stripe 表单 (uid 需通过 take_snapshot 获取)
 * await chrome_devtools.fill("卡号uid", "4242424242424242");
 * await chrome_devtools.fill("到期日uid", "1226");
 * await chrome_devtools.fill("CVCuid", "123");
 * await chrome_devtools.fill("姓名uid", "yuzhichang");
 * await chrome_devtools.fill("邮编uid", "12345");
 */

/**
 * Step 5: 完成支付
 * await chrome_devtools.click("订阅按钮uid");
 * await chrome_devtools.wait_for(["price-pay-status=success"], { timeout: 15000 });
 */

/**
 * Step 6: 验证成功
 * // URL 应为: http://192.168.1.23:9223/price?price-pay-status=success
 * // 成功后可能显示 "Love RAGFlow?" 弹窗而非 "Payment successful"
 */

// ========== 登录脚本 ==========
const LOGIN_SCRIPT = `
const setNativeValue = (element, value) => {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
};

const inputs = document.querySelectorAll('input');
for (const input of inputs) {
  if (input.placeholder === 'Please input email') {
    setNativeValue(input, 'yuzhichang@gmail.com');
  }
  if (input.placeholder === 'Please input password') {
    setNativeValue(input, '123456');
  }
}

const buttons = document.querySelectorAll('button');
for (const btn of buttons) {
  if (btn.textContent.trim() === 'Sign in') {
    btn.click();
    return '登录成功';
  }
}
return '未找到登录按钮';
`;

module.exports = { runBillingTest, TEST_CONFIG, LOGIN_SCRIPT };
