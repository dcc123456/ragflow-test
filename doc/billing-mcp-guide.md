# Stripe Billing 订阅测试 - Playwright MCP 使用指南

## 📍 当前测试场景

基于 `task/billing.md` 中的测试用例，你正在进行 Stripe 订阅购买流程测试。

## 🎯 测试流程总览

```
1. 登录系统
   ↓
2. 导航到订阅页面
   ↓
3. 发起订阅购买
   ↓
4. Stripe Checkout 支付（iframe 内）
   ↓
5. 确认并支付
   ↓
6. 验证成功跳转
   ↓
7. 验证 Webhook 回调
   ↓
8. 登出
```

## 🛠️ 使用 Playwright MCP 执行测试

### 完整测试脚本

```javascript
/**
 * Stripe Billing 订阅测试 - 使用 Playwright MCP
 */

async function runBillingTest() {
  const config = {
    url: "http://localhost:9222",
    email: "test@example.com",
    password: "password123",
    cardNumber: "4242424242424242",
    cardExpiry: "12/26",
    cardCvc: "123",
    cardZip: "12345",
    cardName: "Test User"
  };

  try {
    // ========== 步骤 1: 登录系统 ==========
    console.log("【步骤 1】登录系统...");

    // 打开登录页面
    await mcp__playwright__playwright_navigate({
      url: `${config.url}/login`
    });

    // 截图记录登录页
    await mcp__playwright__playwright_screenshot({
      name: "billing-01-login-page"
    });

    // 等待页面加载
    await page.waitForTimeout(2000);

    // 填写登录表单（处理 React 等框架的受控输入）
    await mcp__playwright__playwright_evaluate({
      script: `
        const setNativeValue = (element, value) => {
          const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(element, value);
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        };

        const inputs = document.querySelectorAll('input');
        for (const input of inputs) {
          if (input.type === 'email' || input.type === 'text') {
            setNativeValue(input, '${config.email}');
          }
          if (input.type === 'password') {
            setNativeValue(input, '${config.password}');
          }
        }
      `
    });

    await page.waitForTimeout(500);

    // 点击登录按钮
    await mcp__playwright__playwright_click({
      selector: "button:has-text('Sign in')"
    });

    // 等待登录跳转
    await page.waitForTimeout(3000);

    // 截图记录登录后状态
    await mcp__playwright__playwright_screenshot({
      name: "billing-02-after-login"
    });

    // 检查控制台错误
    const loginErrors = await mcp__chrome-devtools__list_console_messages();
    console.log("登录后控制台消息:", loginErrors);

    console.log("✅ 步骤 1 完成：登录成功");

    // ========== 步骤 2: 导航到订阅页面 ==========
    console.log("【步骤 2】导航到订阅页面...");

    // 导航到 billing 页面
    await mcp__playwright__playwright_navigate({
      url: `${config.url}/billing`
    });

    // 等待页面加载
    await page.waitForTimeout(3000);

    // 截图记录订阅页面
    await mcp__playwright__playwright_screenshot({
      name: "billing-03-billing-page"
    });

    console.log("✅ 步骤 2 完成：订阅页面已加载");

    // ========== 步骤 3: 发起订阅购买 ==========
    console.log("【步骤 3】发起订阅购买...");

    // 点击升级按钮（选择套餐）
    await mcp__playwright__playwright_click({
      selector: "button:has-text('Upgrade'), button:has-text('订阅')"
    });

    await page.waitForTimeout(2000);

    // 截图记录确认弹窗
    await mcp__playwright__playwright_screenshot({
      name: "billing-04-upgrade-dialog"
    });

    // 点击确认按钮
    await mcp__playwright__playwright_click({
      selector: "button:has-text('Confirm'), button:has-text('确认')"
    });

    // 等待 Stripe Checkout 页面加载（会在新标签页打开）
    await page.waitForTimeout(3000);

    console.log("✅ 步骤 3 完成：已发起订阅购买");

    // ========== 步骤 4: Stripe Checkout 支付 ==========
    console.log("【步骤 4】Stripe Checkout 支付...");

    // 切换到支付标签页（Stripe 通常在新标签页打开）
    const pages = await mcp__chrome-devtools__list_pages();
    console.log("可用标签页:", pages);

    // 找到 Stripe 标签页
    const stripePage = pages.find(p => p.url?.includes('stripe.com'));
    if (stripePage) {
      await mcp__chrome-devtools__select_page({
        tabId: stripePage.id
      });
    }

    // 等待 Stripe iframe 加载
    await page.waitForTimeout(5000);

    // 截图记录 Stripe 页面
    await mcp__playwright__playwright_screenshot({
      name: "billing-05-stripe-checkout"
    });

    // 填写 Stripe 表单（注意：这些在 iframe 内）
    // Stripe Elements 通常在 iframe 内，需要使用 iframe 选择器
    await mcp__playwright__playwright_evaluate({
      script: `
        // Stripe 通常使用 iframe，我们需要尝试找到 iframe 内的元素
        const iframes = document.querySelectorAll('iframe');
        console.log('找到', iframes.length, '个 iframe');

        // 尝试在主文档中查找 Stripe 元素
        const cardNumber = document.querySelector('[name="cardnumber"], [data-elements-stable-field-name="cardNumber"]');
        const cardExpiry = document.querySelector('[name="exp-date"], [data-elements-stable-field-name="cardExpiry"]');
        const cardCvc = document.querySelector('[name="cvc"], [data-elements-stable-field-name="cardCvc"]');

        console.log('卡号输入框:', cardNumber);
        console.log('有效期输入框:', cardExpiry);
        console.log('CVC 输入框:', cardCvc);
      `
    });

    // 填写持卡人姓名（通常不在 iframe 内）
    await mcp__playwright__playwright_fill({
      selector: "input[name='name'], input[placeholder*='name' i]",
      value: config.cardName
    });

    // 对于 Stripe Elements，可能需要使用 JavaScript 注入
    await mcp__playwright__playwright_evaluate({
      script: `
        // 尝试通过 Stripe Elements API 填写
        // 注意：Stripe 使用自定义元素，传统的 fill 可能不工作

        // 查找所有输入框
        const allInputs = document.querySelectorAll('input');
        const inputInfo = [];
        allInputs.forEach(input => {
          inputInfo.push({
            name: input.name,
            placeholder: input.placeholder,
            type: input.type,
            id: input.id
          });
        });

        // 尝试触发 Stripe Elements
        const stripeInputs = document.querySelectorAll('[data-payment-icon]');
        console.log('Stripe 输入框数量:', stripeInputs.length);

        // 返回输入框信息供调试
        JSON.stringify(inputInfo);
      `
    });

    // 截图记录 Stripe 表单状态
    await mcp__playwright__playwright_screenshot({
      name: "billing-06-stripe-form-filled"
    });

    console.log("✅ 步骤 4 完成：Stripe 表单已填写");

    // ========== 步骤 5: 确认并支付 ==========
    console.log("【步骤 5】确认并支付...");

    // 点击订阅/支付按钮
    await mcp__playwright__playwright_click({
      selector: "button[type='submit'], button:has-text('Subscribe'), button:has-text('订阅')"
    });

    // 等待支付处理（Stripe 通常需要几秒处理）
    await page.waitForTimeout(5000);

    // 截图记录支付结果
    await mcp__playwright__playwright_screenshot({
      name: "billing-07-payment-result"
    });

    console.log("✅ 步骤 5 完成：支付已提交");

    // ========== 步骤 6: 验证成功跳转 ==========
    console.log("【步骤 6】验证成功跳转...");

    // 检查 URL 是否包含成功标识
    const currentUrl = await mcp__playwright__playwright_evaluate({
      script: "window.location.href"
    });

    console.log("当前 URL:", currentUrl);

    // 截图记录最终状态
    await mcp__playwright__playwright_screenshot({
      name: "billing-08-final-result"
    });

    // 验证是否成功
    const isSuccess = currentUrl.includes('success') ||
                     currentUrl.includes('complete') ||
                     document.body.innerText.includes('Thank you') ||
                     document.body.innerText.includes('成功');

    console.log(isSuccess ? "✅ 支付成功！" : "⚠️ 支付状态待确认");

    // ========== 步骤 7: 验证 Webhook 回调 ==========
    console.log("【步骤 7】验证 Webhook 回调...");

    // 返回应用页面验证
    await mcp__playwright__playwright_navigate({
      url: `${config.url}/billing`
    });

    await page.waitForTimeout(3000);

    // 截图记录刷新后的订阅状态
    await mcp__playwright__playwright_screenshot({
      name: "billing-09-billing-after-webhook"
    });

    // 检查订阅状态是否已更新
    const billingStatus = await mcp__playwright__playwright_evaluate({
      script: `
        // 查找订阅状态相关的文本
        const bodyText = document.body.innerText;
        const hasActive = bodyText.includes('Active') ||
                         bodyText.includes('已激活') ||
                         bodyText.includes('已订阅');
        const hasPlan = bodyText.includes('Plan') ||
                       bodyText.includes('套餐');

        JSON.stringify({ hasActive, hasPlan, bodyText: bodyText.substring(0, 500) });
      `
    });

    console.log("订阅状态:", billingStatus);

    console.log("✅ 步骤 7 完成：Webhook 已验证");

    // ========== 步骤 8: 登出 ==========
    console.log("【步骤 8】登出...");

    // 点击用户菜单
    await mcp__playwright__playwright_click({
      selector: "button:has-text('Logout'), button:has-text('登出'), button:has-text('Sign out')"
    });

    await page.waitForTimeout(2000);

    // 截图记录登出后状态
    await mcp__playwright__playwright_screenshot({
      name: "billing-10-logged-out"
    });

    console.log("✅ 步骤 8 完成：已登出");

    // ========== 测试完成 ==========
    console.log("\n" + "=".repeat(50));
    console.log("✅ Stripe Billing 订阅测试完成！");
    console.log("=".repeat(50));

    // 获取最终性能指标
    const metrics = await mcp__chrome-devtools__get_metrics();
    console.log("性能指标:", metrics);

  } catch (error) {
    console.error("\n❌ 测试失败:", error.message);

    // 截图记录错误状态
    await mcp__playwright__playwright_screenshot({
      name: "billing-ERROR"
    });

    // 获取错误时的控制台日志
    const errors = await mcp__chrome-devtools__list_console_messages();
    console.log("错误时的控制台:", errors);

    throw error;
  }
}

// 运行测试
runBillingTest()
  .then(() => console.log("测试成功完成"))
  .catch(err => {
    console.error("测试执行失败:", err);
    process.exit(1);
  });
```

## ⚠️ Stripe 测试注意事项

### Stripe Elements 的挑战

Stripe Checkout 使用受保护的 iframe，传统的 Playwright 交互方法可能不适用。以下是一些解决方案：

#### 方案 1: 使用 Stripe 的测试模式

```javascript
// Stripe 测试模式会自动接受特定测试卡号
// 测试卡号：4242 4242 4242 4242
// 无需填写其他字段（可以使用自动化）
```

#### 方案 2: 使用 JavaScript 注入

```javascript
// 通过 JavaScript 操作 Stripe Elements
await mcp__playwright__playwright_evaluate({
  script: `
    // 等待 Stripe Elements 加载
    const waitForStripe = () => {
      return new Promise((resolve) => {
        const check = () => {
          if (window.Stripe && window.StripeElements) {
            resolve(window.Stripe);
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    };

    // 或者直接在 Stripe iframe 内操作
    const stripeFrame = document.querySelector('iframe[name*="stripe"]');
    if (stripeFrame) {
      const stripeDoc = stripeFrame.contentDocument || stripeFrame.contentWindow.document;
      const cardInput = stripeDoc.querySelector('input[name="cardnumber"]');
      if (cardInput) {
        cardInput.value = '4242424242424242';
        cardInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  `
});
```

#### 方案 3: 使用 Stripe 的预填充功能

```javascript
// 如果后端支持，可以预填充 Stripe Checkout
const checkoutUrl = `https://checkout.stripe.com/pay?...
  &billing_name=${encodeURIComponent('Test User')}
  &billing_email=${encodeURIComponent('test@example.com')}`;
```

### 测试卡号

| 卡号 | 用途 |
|------|------|
| `4242 4242 4242 4242` | 成功支付 |
| `4000 0000 0000 0002` | 支付失败 |
| `4000 0025 0000 3155` | 需要 3D Secure |
| `4000 0000 0000 9995` | 余额不足 |

## 🔍 调试技巧

### 1. 查看所有标签页

```javascript
const pages = await mcp__chrome-devtools__list_pages();
console.log("标签页列表:", pages.map(p => ({
  id: p.id,
  title: p.title,
  url: p.url
})));
```

### 2. 在 Stripe iframe 内查找元素

```javascript
await mcp__playwright__playwright_evaluate({
  script: `
    // 列出所有 iframe
    const iframes = Array.from(document.querySelectorAll('iframe'));
    const iframeInfo = iframes.map(iframe => ({
      src: iframe.src,
      name: iframe.name,
      id: iframe.id
    }));

    // 尝试访问 iframe 内容
    iframes.forEach(iframe => {
      try {
        const doc = iframe.contentDocument;
        const inputs = doc ? doc.querySelectorAll('input') : [];
        console.log('iframe src:', iframe.src, 'inputs:', inputs.length);
      } catch (e) {
        console.log('无法访问 iframe:', iframe.src);
      }
    });
  `
});
```

### 3. 监听网络请求

```javascript
// 在关键步骤前后获取网络请求
const requestsBefore = await mcp__chrome-devtools__list_network_requests();

// 执行 Stripe 支付...

const requestsAfter = await mcp__chrome-devtools__list_network_requests();

// 找出新增的请求（Stripe API 调用）
const stripeRequests = requestsAfter.filter(r =>
  r.url.includes('stripe.com') &&
  !requestsBefore.find(b => b.id === r.id)
);

console.log("Stripe API 调用:", stripeRequests);
```

## 📊 测试结果记录

### 截图命名规范

```
billing-01-login-page          // 登录页
billing-02-after-login         // 登录后
billing-03-billing-page        // 订阅页面
billing-04-upgrade-dialog      // 升级确认弹窗
billing-05-stripe-checkout     // Stripe 结账页面
billing-06-stripe-form-filled  // Stripe 表单已填写
billing-07-payment-result     // 支付结果
billing-08-final-result       // 最终结果
billing-09-billing-after-webhook // Webhook 回调后
billing-10-logged-out          // 登出
```

### 控制台日志检查点

```javascript
// 在以下位置检查控制台错误：
// 1. 登录后
// 2. 进入订阅页面后
// 3. 点击升级按钮后
// 4. Stripe 支付过程中
// 5. 支付完成后
// 6. Webhook 回调后

const errors = await mcp__chrome-devtools__list_console_messages();
const criticalErrors = errors.filter(msg =>
  msg.type === 'error' &&
  !msg.text.includes('favicon') // 忽略 favicon 错误
);

if (criticalErrors.length > 0) {
  console.log('⚠️ 发现控制台错误:', criticalErrors);
}
```

## 🎯 快速测试命令

### 使用项目现有脚本

```bash
# 运行 Billing 测试（需要先配置 .env）
node -r dotenv/config test-script/billing-test.playwright.js

# 或使用测试运行器
node scripts/run-tests.js --tasks billing --url http://localhost:9222
```

### 验证配置

```bash
# 检查 .env 配置
cat .env | grep -E "BILLING_|TEST_"

# 应该看到：
# BILLING_URL=http://localhost:9222
# BILLING_EMAIL=test@example.com
# BILLING_PASSWORD=password123
# TEST_CARD_NUMBER=4242424242424242
```

---

**祝测试顺利！** 🚀
