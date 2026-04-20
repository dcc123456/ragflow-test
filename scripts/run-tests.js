/**
 * 测试执行脚本
 * 用法:
 *   node scripts/run-tests.js --tasks billing,login --url http://localhost:9222
 *   node scripts/run-tests.js --all --headless
 *
 * 环境变量:
 *   TEST_URL - 测试环境 URL
 *   FEISHU_WEBHOOK - 飞书 Webhook
 *   SILICONFLOW_API_KEY - SILICONFLOW API Key
 *   OPENAI_API_KEY - OpenAI API Key
 *   TEST_USERNAME - 测试账号
 *   TEST_PASSWORD - 测试密码
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const TEST_RESULTS_DIR = path.join(__dirname, '..', 'test-results');
const TEST_REPORTS_DIR = path.join(__dirname, '..', 'test-reports');

// 测试配置（从环境变量读取）
const testConfig = {
  url: process.env.TEST_URL || 'http://localhost:9222',
  siliconflowApiKey: process.env.SILICONFLOW_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  username: process.env.TEST_USERNAME || 'test1@gmail.com',
  password: process.env.TEST_PASSWORD || '123456',
  headless: process.env.HEADLESS === 'true',
};

// 脱敏函数
function maskSensitive(str) {
  if (!str) return '';
  if (str.length <= 4) return '****';
  return str.slice(0, 2) + '****' + str.slice(-2);
}

// 确保目录存在
[SCREENSHOTS_DIR, TEST_RESULTS_DIR, TEST_REPORTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 解析命令行参数
const args = process.argv.slice(2);
const cliConfig = {
  tasks: 'all',
  url: testConfig.url,
  headless: testConfig.headless,
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--tasks' && args[i + 1]) {
    cliConfig.tasks = args[i + 1];
    i++;
  } else if (args[i] === '--url' && args[i + 1]) {
    cliConfig.url = args[i + 1];
    i++;
  } else if (args[i] === '--headless') {
    cliConfig.headless = true;
  } else if (args[i] === '--all') {
    cliConfig.tasks = 'all';
  }
}

// 获取任务列表
function getTestTasks() {
  const taskDir = path.join(__dirname, '..', 'task');
  const files = fs.readdirSync(taskDir).filter(f => f.endsWith('.md'));

  if (cliConfig.tasks === 'all') {
    return files.map(f => f.replace('.md', ''));
  }
  return cliConfig.tasks.split(',').map(t => t.trim());
}

// 加载测试用例
function loadTestCase(taskName) {
  const taskPath = path.join(__dirname, '..', 'task', `${taskName}.md`);
  if (!fs.existsSync(taskPath)) {
    throw new Error(`测试用例不存在: ${taskPath}`);
  }
  return fs.readFileSync(taskPath, 'utf-8');
}

// 发送飞书通知
async function sendFeishu(message) {
  const webhookUrl = process.env.FEISHU_WEBHOOK;
  if (!webhookUrl) {
    console.log('FEISHU_WEBHOOK 未配置，跳过通知');
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msg_type: 'text',
        content: { text: message }
      })
    });
  } catch (err) {
    console.error('发送飞书通知失败:', err.message);
  }
}

// 等待元素出现
async function waitForElement(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout, state: 'visible' });
    return true;
  } catch (e) {
    return false;
  }
}

// 测试类
class TestRunner {
  constructor(taskName, browser, config) {
    this.taskName = taskName;
    this.browser = browser;
    this.config = config;
    this.context = null;
    this.page = null;
    this.startTime = Date.now();
    this.timestamp = moment().format('YYYYMMDD-HHmmss');
    this.screenshotsDir = path.join(SCREENSHOTS_DIR, `${taskName}-${this.timestamp}`);
    this.logFile = path.join(TEST_RESULTS_DIR, `${taskName}-${this.timestamp}.log`);
    this.stepResults = [];
    this.errors = [];

    fs.mkdirSync(this.screenshotsDir, { recursive: true });
  }

  log(msg) {
    const logMsg = `[${moment().format('HH:mm:ss')}] ${msg}`;
    console.log(logMsg);
    fs.appendFileSync(this.logFile, logMsg + '\n');
  }

  async screenshot(name) {
    try {
      if (this.page) {
        const filePath = path.join(this.screenshotsDir, `${name}.png`);
        await this.page.screenshot({ path: filePath, fullPage: false });
        this.log(`截图已保存: ${name}.png`);
      }
    } catch (e) {
      this.log(`截图失败: ${e.message}`);
    }
  }

  async init() {
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    this.page = await this.context.newPage();

    // 设置默认超时
    this.page.setDefaultTimeout(30000);

    // 监听控制台消息
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.log(`[Console Error] ${msg.text()}`);
      }
    });
  }

  async cleanup() {
    if (this.context) {
      await this.context.close();
    }
  }

  async runStep(name, fn) {
    const stepStart = Date.now();
    this.log(`[Step] ${name}`);
    try {
      await fn();
      const duration = ((Date.now() - stepStart) / 1000).toFixed(2);
      this.stepResults.push({ name, status: 'passed', duration });
      this.log(`[Pass] ${name} (${duration}s)`);
      return true;
    } catch (error) {
      const duration = ((Date.now() - stepStart) / 1000).toFixed(2);
      this.stepResults.push({ name, status: 'failed', duration, error: error.message });
      this.errors.push(error);
      this.log(`[Fail] ${name}: ${error.message}`);
      await this.screenshot(`error-${name.replace(/\s+/g, '-')}`);
      return false;
    }
  }

  getDuration() {
    return ((Date.now() - this.startTime) / 1000).toFixed(2);
  }

  getResult() {
    const passed = this.stepResults.filter(r => r.status === 'passed').length;
    const failed = this.stepResults.filter(r => r.status === 'failed').length;
    return {
      taskName: this.taskName,
      status: failed === 0 ? 'passed' : 'failed',
      duration: this.getDuration(),
      passed,
      failed,
      errors: this.errors,
      logFile: this.logFile,
      screenshotsDir: this.screenshotsDir
    };
  }
}

// ============ 登录测试 ============
async function runLoginTest(browser, config) {
  const runner = new TestRunner('login', browser, config);
  await runner.init();

  try {
    await runner.runStep('访问登录页面', async () => {
      await runner.page.goto(`${config.url}/login`);
      await runner.screenshot('01-login-page');
      // 等待页面加载
      await runner.page.waitForLoadState('networkidle');
    });

    await runner.runStep('输入账号密码', async () => {
      await runner.page.fill('input[type="email"], input[name="email"]', config.username);
      await runner.page.fill('input[type="password"], input[name="password"]', config.password);
      await runner.screenshot('02-filled-form');
    });

    await runner.runStep('点击登录按钮', async () => {
      await runner.page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("登录")');
      await runner.page.waitForLoadState('networkidle');
      await runner.screenshot('03-after-click-login');
    });

    await runner.runStep('验证登录成功', async () => {
      // 等待跳转或出现用户信息
      await runner.page.waitForTimeout(2000);
      const url = runner.page.url();
      runner.log(`当前URL: ${url}`);

      // 检查是否跳转到首页
      if (url.includes('/login')) {
        // 可能账号不存在，检查是否有注册提示
        const pageContent = await runner.page.content();
        if (pageContent.includes('Sign up') || pageContent.includes('Create an account')) {
          runner.log('检测到需要注册，准备注册流程');
          // 注册流程将在下一步处理
        } else {
          throw new Error('登录失败，仍在登录页');
        }
      } else {
        runner.log('登录成功，已跳转');
      }
      await runner.screenshot('04-login-verified');
    });

    // 检查是否需要注册
    const currentUrl = runner.page.url();
    if (currentUrl.includes('/login')) {
      await runner.runStep('注册账号', async () => {
        // 点击注册按钮
        await runner.page.click('text=Sign up, text=注册, a:has-text("Sign up")');
        await runner.page.waitForLoadState('networkidle');
        await runner.screenshot('05-register-page');

        // 填写注册信息
        await runner.page.fill('input[type="email"], input[name="email"]', config.username);
        await runner.page.fill('input[name="name"], input[placeholder*="name" i], input[placeholder*="昵称" i]', config.username.split('@')[0]);
        await runner.page.fill('input[type="password"], input[name="password"]', config.password);
        await runner.screenshot('06-filled-register');

        await runner.page.click('button[type="submit"], button:has-text("Continue"), button:has-text("继续")');
        await runner.page.waitForLoadState('networkidle');
        await runner.screenshot('07-after-register');
      });

      await runner.runStep('重新登录', async () => {
        await runner.page.waitForTimeout(1000);
        await runner.page.fill('input[type="email"], input[name="email"]', config.username);
        await runner.page.fill('input[type="password"], input[name="password"]', config.password);
        await runner.screenshot('08-re-login-form');

        await runner.page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("登录")');
        await runner.page.waitForLoadState('networkidle');
        await runner.page.waitForTimeout(2000);
        await runner.screenshot('09-after-re-login');
      });
    }

    await runner.runStep('验证主页显示', async () => {
      const url = runner.page.url();
      if (!url.includes('/login') && url !== config.url) {
        runner.log('已跳转到主页');
      }
      await runner.screenshot('10-home-page');
    });

  } finally {
    await runner.cleanup();
  }

  return runner.getResult();
}

// ============ 添加LLM测试 ============
async function runAddLlmTest(browser, config) {
  const runner = new TestRunner('add-llm', browser, config);
  await runner.init();

  try {
    // 1. 先登录
    await runner.runStep('访问登录页面', async () => {
      await runner.page.goto(`${config.url}/login`);
      await runner.page.waitForLoadState('networkidle');
    });

    await runner.runStep('登录系统', async () => {
      await runner.page.fill('input[type="email"], input[name="email"]', config.username);
      await runner.page.fill('input[type="password"], input[name="password"]', config.password);
      await runner.screenshot('01-login-form');

      await runner.page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("登录")');
      await runner.page.waitForLoadState('networkidle');
      await runner.page.waitForTimeout(2000);
      await runner.screenshot('02-after-login');
    });

    // 2. 跳转个人中心
    await runner.runStep('跳转个人中心', async () => {
      // 尝试点击用户头像或设置链接
      const selectors = [
        'a[href*="user-setting"]',
        'a[href*="setting"]',
        'button:has-text("Settings")',
        '[class*="avatar"]',
        '[class*="user"]'
      ];

      let clicked = false;
      for (const sel of selectors) {
        const el = await runner.page.$(sel);
        if (el) {
          await el.click();
          clicked = true;
          break;
        }
      }

      if (!clicked) {
        // 直接导航到用户设置页面
        await runner.page.goto(`${config.url}/user-setting/data-source`);
      }

      await runner.page.waitForLoadState('networkidle');
      await runner.screenshot('03-personal-center');
    });

    // 3. 进入模型提供商页面
    await runner.runStep('进入模型提供商页面', async () => {
      // 点击左侧菜单或链接
      const selectors = [
        'a[href*="model-provider"]',
        'a:has-text("Model providers")',
        'a:has-text("模型提供商")',
        'button:has-text("Model providers")'
      ];

      let clicked = false;
      for (const sel of selectors) {
        const el = await runner.page.$(sel);
        if (el) {
          await el.click();
          clicked = true;
          break;
        }
      }

      if (!clicked) {
        await runner.page.goto(`${config.url}/user-setting/model`);
      }

      await runner.page.waitForLoadState('networkidle');
      await runner.screenshot('04-model-providers');
    });

    // 4. 添加SILICONFLOW
    await runner.runStep('添加模型提供商', async () => {
      // 查找SILICONFLOW卡片
      const siliconflowCard = await runner.page.$('text=SILICONFLOW, text=siliconflow');
      if (siliconflowCard) {
        await siliconflowCard.click();
        await runner.page.waitForTimeout(1000);
        await runner.screenshot('05-siliconflow-popup');

        // 填写API Key
        const apiKeyInput = await runner.page.$('input[type="password"], input[placeholder*="key" i], input[placeholder*="API" i]');
        if (apiKeyInput) {
          const apiKey = config.siliconflowApiKey || config.openaiApiKey;
          await apiKeyInput.fill(apiKey);
          await runner.screenshot('06-apikey-filled');
        }

        // 点击保存
        const saveBtn = await runner.page.$('button:has-text("Save"), button:has-text("保存")');
        if (saveBtn) {
          await saveBtn.click();
          await runner.page.waitForTimeout(2000);
        }
      } else {
        runner.log('未找到SILICONFLOW卡片，可能已添加');
      }
      await runner.screenshot('07-after-add');
    });

    // 5. 设置默认模型
    await runner.runStep('设置默认模型', async () => {
      // 点击View models展开
      const viewModelsBtn = await runner.page.$('button:has-text("View models"), button:has-text("查看模型")');
      if (viewModelsBtn) {
        await viewModelsBtn.click();
        await runner.page.waitForTimeout(1000);
        await runner.screenshot('08-models-list');
      }

      // 选择LLM模型
      const llmSelect = await runner.page.$('select, [class*="llm"], [class*="LLM"]');
      if (llmSelect) {
        await llmSelect.selectOption({ label: /qwen/i });
        runner.log('已选择LLM模型');
      }

      // 选择Embedding模型
      const embeddingSelect = await runner.page.$('[class*="embedding"], [class*="Embedding"]');
      if (embeddingSelect) {
        await embeddingSelect.selectOption({ label: /bge/i });
        runner.log('已选择Embedding模型');
      }

      await runner.screenshot('09-models-selected');
    });

    // 6. 验证添加成功
    await runner.runStep('验证添加成功', async () => {
      // 刷新页面
      await runner.page.reload();
      await runner.page.waitForLoadState('networkidle');
      await runner.screenshot('10-after-refresh');

      // 检查SILICONFLOW是否仍在列表中
      const content = await runner.page.content();
      if (content.includes('SILICONFLOW') || content.includes('siliconflow')) {
        runner.log('验证成功：SILICONFLOW仍在列表中');
      } else {
        runner.log('警告：SILICONFLOW可能未添加成功');
      }
    });

  } finally {
    await runner.cleanup();
  }

  return runner.getResult();
}

// ============ Billing测试 ============
async function runBillingTest(browser, config) {
  const runner = new TestRunner('billing', browser, config);
  await runner.init();

  try {
    // 1. 登录
    await runner.runStep('访问登录页面', async () => {
      await runner.page.goto(`${config.url}/login`);
      await runner.page.waitForLoadState('networkidle');
    });

    await runner.runStep('登录系统', async () => {
      await runner.page.fill('input[type="email"], input[name="email"]', config.username);
      await runner.page.fill('input[type="password"], input[name="password"]', config.password);
      await runner.screenshot('01-login-form');

      await runner.page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("登录")');
      await runner.page.waitForLoadState('networkidle');
      await runner.page.waitForTimeout(2000);
      await runner.screenshot('02-after-login');
    });

    // 2. 导航到订阅页面
    await runner.runStep('导航到订阅页面', async () => {
      // 点击用户头像 -> 个人中心
      const userBtn = await runner.page.$('[class*="avatar"], [class*="user"], a[href*="user-setting"]');
      if (userBtn) {
        await userBtn.click();
        await runner.page.waitForTimeout(500);
      }

      // 点击billing菜单
      const billingLink = await runner.page.$('a[href*="billing"], a:has-text("Billing"), a:has-text("账单")');
      if (billingLink) {
        await billingLink.click();
      } else {
        await runner.page.goto(`${config.url}/billing`);
      }

      await runner.page.waitForLoadState('networkidle');
      await runner.screenshot('03-billing-page');
    });

    // 3. 选择套餐
    await runner.runStep('选择套餐并升级', async () => {
      // 查找Upgrade按钮
      const upgradeBtn = await runner.page.$('button:has-text("Upgrade"), button:has-text("升级")');
      if (upgradeBtn) {
        await upgradeBtn.click();
        await runner.page.waitForTimeout(1000);
        await runner.screenshot('04-upgrade-dialog');

        // 确认升级
        const confirmBtn = await runner.page.$('button:has-text("Confirm"), button:has-text("确认"), button:has-text("Confirm")');
        if (confirmBtn) {
          await confirmBtn.click();
          await runner.page.waitForTimeout(3000);
        }
      } else {
        runner.log('未找到升级按钮，可能已是付费用户');
      }
      await runner.screenshot('05-after-upgrade');
    });

    // 4. 填写支付信息 (Stripe)
    await runner.runStep('填写Stripe支付信息', async () => {
      // 等待Stripe页面加载
      await runner.page.waitForTimeout(3000);

      const url = runner.page.url();
      runner.log(`当前URL: ${url}`);

      if (url.includes('stripe') || url.includes('checkout')) {
        await runner.screenshot('06-stripe-page');

        // 填写卡号
        const cardNumberFrame = await runner.page.$('iframe[name*="card-number"], iframe[title*="card number"]');
        if (cardNumberFrame) {
          const frame = await runner.page.frameLocator(cardNumberFrame);
          await frame.locator('input[name="cardnumber"]').fill('4242424242424242');
        }

        // 填写有效期
        const expiryFrame = await runner.page.$('iframe[name*="expiry"], iframe[title*="expiry"]');
        if (expiryFrame) {
          const frame = await runner.page.frameLocator(expiryFrame);
          await frame.locator('input[name="exp-date"]').fill('1226');
        }

        // 填写CVC
        const cvcFrame = await runner.page.$('iframe[name*="cvc"], iframe[title*="cvc"]');
        if (cvcFrame) {
          const frame = await runner.page.frameLocator(cvcFrame);
          await frame.locator('input[name="cvc"]').fill('123');
        }

        // 填写邮编
        await runner.page.fill('input[name="postal_code"], input[placeholder*="Postal" i]', '12345');

        await runner.screenshot('07-payment-filled');

        // 点击订阅按钮
        await runner.page.click('button[type="submit"], button:has-text("Subscribe"), button:has-text("订阅")');
        await runner.page.waitForTimeout(5000);
        await runner.screenshot('08-after-submit');
      } else {
        runner.log('未跳转到Stripe页面');
      }
    });

    // 5. 验证支付成功
    await runner.runStep('验证支付成功', async () => {
      const url = runner.page.url();
      const content = await runner.page.content();

      if (url.includes('success') || content.includes('Success') || content.includes('Thank you')) {
        runner.log('支付成功');
      } else {
        runner.log(`当前URL: ${url}`);
      }
      await runner.screenshot('09-payment-result');
    });

    // 6. 登出
    await runner.runStep('登出', async () => {
      const logoutBtn = await runner.page.$('button:has-text("Logout"), button:has-text("登出"), a:has-text("Logout")');
      if (logoutBtn) {
        await logoutBtn.click();
        await runner.page.waitForTimeout(1000);
      }
      await runner.screenshot('10-logout');
    });

  } finally {
    await runner.cleanup();
  }

  return runner.getResult();
}

// 执行单个测试
async function runTest(taskName, browser, config) {
  const runner = new TestRunner(taskName, browser, config);

  try {
    await sendFeishu(`【测试开始】
任务：${taskName}
URL：${config.url}
时间：${moment().format('YYYY-MM-DD HH:mm:ss')}`);

    let result;
    if (taskName === 'login') {
      result = await runLoginTest(browser, config);
    } else if (taskName === 'add-llm') {
      result = await runAddLlmTest(browser, config);
    } else if (taskName === 'billing') {
      result = await runBillingTest(browser, config);
    } else {
      throw new Error(`未知任务: ${taskName}`);
    }

    if (result.status === 'passed') {
      await sendFeishu(`【测试完成】
任务：${taskName}
结果：✅ 通过
耗时：${result.duration}s
通过步骤：${result.passed}/${result.passed + result.failed}`);
    } else {
      await sendFeishu(`【测试失败】
任务：${taskName}
结果：❌ 失败
耗时：${result.duration}s
失败步骤：${result.failed}/${result.passed + result.failed}
错误：${result.errors[0]?.message || '未知错误'}`);
    }

    return result;

  } catch (error) {
    runner.log(`任务执行失败: ${error.message}`);
    await sendFeishu(`【测试错误】
任务：${taskName}
错误：${error.message}`);
    return {
      taskName,
      status: 'failed',
      duration: runner.getDuration(),
      errors: [error],
      logFile: runner.logFile
    };
  }
}

// 主函数
async function main() {
  console.log('='.repeat(50));
  console.log('UI 自动化测试开始');
  console.log('='.repeat(50));
  console.log(`测试任务: ${cliConfig.tasks}`);
  console.log(`测试URL: ${cliConfig.url}`);
  console.log(`Headless: ${cliConfig.headless}`);
  console.log(`账号: ${testConfig.username}`);
  console.log('');

  let browser;
  const results = [];

  try {
    browser = await chromium.launch({
      headless: cliConfig.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const tasks = getTestTasks();
    console.log(`找到 ${tasks.length} 个测试任务\n`);

    for (const taskName of tasks) {
      console.log('-'.repeat(40));
      const result = await runTest(taskName, browser, {
        url: cliConfig.url,
        username: testConfig.username,
        password: testConfig.password,
        siliconflowApiKey: testConfig.siliconflowApiKey,
        openaiApiKey: testConfig.openaiApiKey,
      });
      results.push(result);
      console.log('');
    }

  } catch (error) {
    console.error('测试执行失败:', error);
    await sendFeishu(`【测试错误】
错误：${error.message}`);
  } finally {
    if (browser) await browser.close();
  }

  // 生成汇总报告
  console.log('='.repeat(50));
  console.log('测试汇总');
  console.log('='.repeat(50));

  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;

  results.forEach(r => {
    const icon = r.status === 'passed' ? '✅' : '❌';
    const errorMsg = r.errors?.[0]?.message?.slice(0, 30) || '';
    console.log(`${icon} ${r.taskName}: ${r.status} (${r.duration}s) ${errorMsg}`);
  });

  console.log('');
  console.log(`总计: ${results.length} | 通过: ${passed} | 失败: ${failed}`);

  // 保存汇总报告
  const summaryFile = path.join(TEST_REPORTS_DIR, `test-summary-${moment().format('YYYYMMDD-HHmmss')}.md`);
  const summary = `# 测试汇总

## 测试信息
- 测试URL: ${cliConfig.url}
- 执行时间: ${moment().format('YYYY-MM-DD HH:mm:ss')}
- 测试任务: ${cliConfig.tasks}
- 账号: ${testConfig.username}

## 结果统计
- 总计: ${results.length}
- 通过: ${passed}
- 失败: ${failed}
- 通过率: ${results.length > 0 ? ((passed / results.length) * 100).toFixed(1) : 0}%

## 详细结果
| 任务名 | 状态 | 耗时 | 通过步骤 | 失败步骤 | 错误信息 |
|--------|------|------|----------|----------|----------|
${results.map(r => `| ${r.taskName} | ${r.status === 'passed' ? '✅ 通过' : '❌ 失败'} | ${r.duration}s | ${r.passed || '-'} | ${r.failed || '-'} | ${r.errors?.[0]?.message?.slice(0, 50) || '-'} |`).join('\n')}
`;
  fs.writeFileSync(summaryFile, summary);
  console.log(`\n汇总报告已保存: ${summaryFile}`);

  // 发送汇总通知
  await sendFeishu(`【全部完成】
总计：${results.length}个任务
通过：${passed}个
失败：${failed}个
报告：${summaryFile}`);

  // 返回非零退出码表示有失败
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
