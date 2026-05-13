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

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const moment = require("moment");

const SCREENSHOTS_DIR = path.join(__dirname, "..", "screenshots");
const TEST_RESULTS_DIR = path.join(__dirname, "..", "test-results");
const TEST_REPORTS_DIR = path.join(__dirname, "..", "test-reports");

// 测试配置（从环境变量读取）
const testConfig = {
  url: process.env.TEST_URL || "http://localhost:9222",
  siliconflowApiKey: process.env.SILICONFLOW_API_KEY || "",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  username: process.env.TEST_USERNAME || "test1@gmail.com",
  password: process.env.TEST_PASSWORD || "123456",
  headless: process.env.HEADLESS === "true",
};

// 脱敏函数
function maskSensitive(str) {
  if (!str) return "";
  if (str.length <= 4) return "****";
  return str.slice(0, 2) + "****" + str.slice(-2);
}

// 确保目录存在
[SCREENSHOTS_DIR, TEST_RESULTS_DIR, TEST_REPORTS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 解析命令行参数
const args = process.argv.slice(2);
const cliConfig = {
  tasks: "all",
  url: testConfig.url,
  headless: testConfig.headless,
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--tasks" && args[i + 1]) {
    cliConfig.tasks = args[i + 1];
    i++;
  } else if (args[i] === "--url" && args[i + 1]) {
    cliConfig.url = args[i + 1];
    i++;
  } else if (args[i] === "--headless") {
    cliConfig.headless = true;
  } else if (args[i] === "--all") {
    cliConfig.tasks = "all";
  }
}

// 获取任务列表
function getTestTasks() {
  const taskDir = path.join(__dirname, "..", "task");
  const files = fs.readdirSync(taskDir).filter((f) => f.endsWith(".md"));
  if (cliConfig.tasks === "all") {
    return files.map((f) => f.replace(".md", ""));
  }
  return cliConfig.tasks.split(",").map((t) => t.trim());
}

// 发送飞书通知
async function sendFeishu(message) {
  const webhookUrl = process.env.FEISHU_WEBHOOK;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msg_type: "text", content: { text: message } }),
    });
  } catch (err) {
    console.error("发送飞书通知失败:", err.message);
  }
}

// 测试类
class TestRunner {
  constructor(taskName, config) {
    this.taskName = taskName;
    this.config = config;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.startTime = Date.now();
    this.timestamp = moment().format("YYYYMMDD-HHmmss");
    this.screenshotsDir = path.join(
      SCREENSHOTS_DIR,
      `${taskName}-${this.timestamp}`,
    );
    this.logFile = path.join(
      TEST_RESULTS_DIR,
      `${taskName}-${this.timestamp}.log`,
    );
    this.stepResults = [];
    this.errors = [];
    fs.mkdirSync(this.screenshotsDir, { recursive: true });
  }

  log(msg) {
    const logMsg = `[${moment().format("HH:mm:ss")}] ${msg}`;
    console.log(logMsg);
    fs.appendFileSync(this.logFile, logMsg + "\n");
  }

  async screenshot(name) {
    try {
      if (this.page) {
        await this.page.waitForTimeout(500);
        await this.page.screenshot({
          path: path.join(this.screenshotsDir, `${name}.png`),
          fullPage: false,
        });
        this.log(`截图已保存: ${name}.png`);
      }
    } catch (e) {
      this.log(`截图失败: ${e.message}`);
    }
  }

  async init() {
    this.log("启动浏览器...");
    this.browser = await chromium.launch({
      headless: cliConfig.headless,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(60000);
    this.page.on("console", (msg) => {
      if (msg.type() === "error") this.log(`[Console Error] ${msg.text()}`);
    });
    this.log("浏览器已启动");
  }

  async cleanup() {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    this.log("浏览器已关闭");
  }

  async runStep(name, fn) {
    const stepStart = Date.now();
    this.log(`[Step] ${name}`);
    try {
      await fn();
      const duration = ((Date.now() - stepStart) / 1000).toFixed(2);
      this.stepResults.push({ name, status: "passed", duration });
      this.log(`[Pass] ${name} (${duration}s)`);
      return true;
    } catch (error) {
      const duration = ((Date.now() - stepStart) / 1000).toFixed(2);
      this.stepResults.push({
        name,
        status: "failed",
        duration,
        error: error.message,
      });
      this.errors.push(error);
      this.log(`[Fail] ${name}: ${error.message}`);
      await this.screenshot(`error-${name.replace(/\s+/g, "-")}`);
      return false;
    }
  }

  getDuration() {
    return ((Date.now() - this.startTime) / 1000).toFixed(2);
  }

  getResult() {
    const passed = this.stepResults.filter((r) => r.status === "passed").length;
    const failed = this.stepResults.filter((r) => r.status === "failed").length;
    return {
      taskName: this.taskName,
      status: failed === 0 ? "passed" : "failed",
      duration: this.getDuration(),
      passed,
      failed,
      stepResults: this.stepResults,
      errors: this.errors,
      logFile: this.logFile,
      screenshotsDir: this.screenshotsDir,
    };
  }
}

// ============ 登录测试 ============
async function runLoginTest(config) {
  const runner = new TestRunner("login", config);
  await runner.init();

  try {
    await runner.runStep("访问登录页面", async () => {
      // 修正URL双斜杠问题
      let loginUrl = config.url.replace(/\/$/, "") + "/login";
      runner.log(`导航到: ${loginUrl}`);
      await runner.page.goto(loginUrl, { waitUntil: "networkidle" });
      await runner.page.waitForTimeout(2000);
      await runner.screenshot("01-login-page");
      const title = await runner.page.title();
      runner.log(`页面标题: ${title}`);
    });

    await runner.runStep("输入账号密码", async () => {
      // 等待输入框出现
      await runner.page.waitForTimeout(2000);

      // 使用 evaluate 获取所有 input 元素
      const inputs = await runner.page.$$eval("input", (els) =>
        els.map((e) => ({
          type: e.type,
          name: e.name,
          placeholder: e.placeholder,
          id: e.id,
        })),
      );
      runner.log(`找到 ${inputs.length} 个输入框: ${JSON.stringify(inputs)}`);

      // 找到邮箱和密码输入框
      const emailInput = await runner.page.$(
        'input[type="email"], input[type="text"]',
      );
      const passwordInput = await runner.page.$('input[type="password"]');

      if (emailInput) {
        await emailInput.fill(config.username);
        runner.log("已填写邮箱");
      }
      if (passwordInput) {
        await passwordInput.fill(config.password);
        runner.log("已填写密码");
      }

      await runner.screenshot("02-filled-form");
    });

    await runner.runStep("点击登录按钮", async () => {
      await runner.page.waitForTimeout(500);

      // 获取所有按钮
      const buttons = await runner.page.$$eval("button", (els) =>
        els.map((e) => ({
          text: e.innerText.trim(),
          type: e.type,
        })),
      );
      runner.log(`找到 ${buttons.length} 个按钮: ${JSON.stringify(buttons)}`);

      // 尝试按回车键提交表单（更可靠）
      runner.log("尝试按回车键提交...");
      await runner.page.keyboard.press("Enter");

      // 等待一段时间让页面响应
      await runner.page.waitForTimeout(3000);
      await runner.screenshot("03-after-click-login");
    });

    await runner.runStep("验证登录成功", async () => {
      const currentUrl = runner.page.url();
      runner.log(`当前URL: ${currentUrl}`);

      if (currentUrl.includes("/login")) {
        runner.log("仍在登录页");
      } else {
        runner.log("登录成功，已跳转");
      }
      await runner.screenshot("04-login-verified");
    });

    await runner.runStep("验证主页显示", async () => {
      const url = runner.page.url();
      runner.log(`最终URL: ${url}`);
      await runner.screenshot("05-home-page");
    });
  } finally {
    await runner.cleanup();
  }

  return runner.getResult();
}

// ============ 添加LLM测试 ============
async function runAddLlmTest(config) {
  const runner = new TestRunner("add-llm", config);
  await runner.init();

  try {
    // 1. 登录
    await runner.runStep("访问登录页面", async () => {
      let loginUrl = config.url.replace(/\/$/, "") + "/login";
      await runner.page.goto(loginUrl, { waitUntil: "networkidle" });
      await runner.page.waitForTimeout(2000);
      await runner.screenshot("01-login-page");
    });

    await runner.runStep("登录系统", async () => {
      const emailInput = await runner.page.$(
        'input[type="email"], input[type="text"]',
      );
      const passwordInput = await runner.page.$('input[type="password"]');
      if (emailInput) await emailInput.fill(config.username);
      if (passwordInput) await passwordInput.fill(config.password);
      await runner.screenshot("02-login-form");

      const submitBtn = await runner.page.$('button[type="submit"], button');
      if (submitBtn) await submitBtn.click();
      await runner.page.waitForTimeout(3000);
      await runner.screenshot("03-after-login");
    });

    // 2. 进入模型提供商页面
    await runner.runStep("进入模型提供商页面", async () => {
      let modelUrl = config.url.replace(/\/$/, "") + "/user-setting/model";
      await runner.page.goto(modelUrl, { waitUntil: "networkidle" });
      await runner.page.waitForTimeout(3000);
      await runner.screenshot("04-model-providers");
    });

    // 3. 添加SILICONFLOW
    await runner.runStep("添加模型提供商", async () => {
      // 查找SILICONFLOW文本
      const siliconflow = await runner.page.getByText("SILICONFLOW", {
        exact: false,
      });
      if (siliconflow) {
        await siliconflow.click();
        await runner.page.waitForTimeout(2000);
        await runner.screenshot("05-siliconflow-popup");

        // 填写API Key
        const apiKeyInput = await runner.page.$('input[type="password"]');
        if (apiKeyInput) {
          const apiKey = config.siliconflowApiKey || config.openaiApiKey;
          await apiKeyInput.fill(apiKey);
          await runner.screenshot("06-apikey-filled");
        }

        // 保存
        const saveBtn = await runner.page.$(
          'button:has-text("Save"), button:has-text("保存")',
        );
        if (saveBtn) await saveBtn.click();
        await runner.page.waitForTimeout(2000);
      } else {
        runner.log("未找到SILICONFLOW");
      }
      await runner.screenshot("07-after-add");
    });

    // 4. 验证
    await runner.runStep("验证添加成功", async () => {
      await runner.page.reload();
      await runner.page.waitForTimeout(3000);
      await runner.screenshot("08-after-refresh");
    });
  } finally {
    await runner.cleanup();
  }

  return runner.getResult();
}

// ============ Billing测试 ============
async function runBillingTest(config) {
  const runner = new TestRunner("billing", config);
  await runner.init();

  try {
    await runner.runStep("访问登录页面", async () => {
      let loginUrl = config.url.replace(/\/$/, "") + "/login";
      await runner.page.goto(loginUrl, { waitUntil: "networkidle" });
      await runner.page.waitForTimeout(2000);
      await runner.screenshot("01-login-page");
    });

    await runner.runStep("登录系统", async () => {
      const emailInput = await runner.page.$(
        'input[type="email"], input[type="text"]',
      );
      const passwordInput = await runner.page.$('input[type="password"]');
      if (emailInput) await emailInput.fill(config.username);
      if (passwordInput) await passwordInput.fill(config.password);
      await runner.screenshot("02-login-form");

      const submitBtn = await runner.page.$('button[type="submit"], button');
      if (submitBtn) await submitBtn.click();
      await runner.page.waitForTimeout(3000);
      await runner.screenshot("03-after-login");
    });

    await runner.runStep("导航到订阅页面", async () => {
      let billingUrl = config.url.replace(/\/$/, "") + "/billing";
      await runner.page.goto(billingUrl, { waitUntil: "networkidle" });
      await runner.page.waitForTimeout(3000);
      await runner.screenshot("04-billing-page");
    });

    await runner.runStep("选择套餐并升级", async () => {
      const upgradeBtn = await runner.page.$('button:has-text("Upgrade")');
      if (upgradeBtn) {
        await upgradeBtn.click();
        await runner.page.waitForTimeout(2000);
        await runner.screenshot("05-upgrade-dialog");
      }
    });

    await runner.runStep("验证支付", async () => {
      await runner.page.waitForTimeout(3000);
      await runner.screenshot("06-payment-result");
    });
  } finally {
    await runner.cleanup();
  }

  return runner.getResult();
}

// 执行单个测试
async function runTest(taskName, config) {
  const runner = new TestRunner(taskName, config);

  try {
    await sendFeishu(
      `【测试开始】\n任务：${taskName}\nURL：${config.url}\n时间：${moment().format("YYYY-MM-DD HH:mm:ss")}`,
    );

    let result;
    if (taskName === "login") {
      result = await runLoginTest(config);
    } else if (taskName === "add-llm") {
      result = await runAddLlmTest(config);
    } else if (taskName === "billing") {
      result = await runBillingTest(config);
    } else {
      throw new Error(`未知任务: ${taskName}`);
    }

    if (result.status === "passed") {
      await sendFeishu(
        `【测试完成】\n任务：${taskName}\n结果：✅ 通过\n耗时：${result.duration}s\n通过步骤：${result.passed}/${result.passed + result.failed}`,
      );
    } else {
      await sendFeishu(
        `【测试失败】\n任务：${taskName}\n结果：❌ 失败\n耗时：${result.duration}s\n失败步骤：${result.failed}\n错误：${result.errors[0]?.message || ""}`,
      );
    }

    return result;
  } catch (error) {
    runner.log(`任务执行失败: ${error.message}`);
    await sendFeishu(`【测试错误】\n任务：${taskName}\n错误：${error.message}`);
    return {
      taskName,
      status: "failed",
      duration: runner.getDuration(),
      errors: [error],
      logFile: runner.logFile,
    };
  }
}

// 主函数
async function main() {
  console.log("=".repeat(50));
  console.log("UI 自动化测试开始");
  console.log("=".repeat(50));
  console.log(`测试任务: ${cliConfig.tasks}`);
  console.log(`测试URL: ${cliConfig.url}`);
  console.log(`Headless: ${cliConfig.headless}`);
  console.log("");

  const results = [];

  try {
    const tasks = getTestTasks();
    console.log(`找到 ${tasks.length} 个测试任务\n`);

    for (const taskName of tasks) {
      console.log("-".repeat(40));
      const result = await runTest(taskName, {
        url: cliConfig.url,
        username: testConfig.username,
        password: testConfig.password,
        siliconflowApiKey: testConfig.siliconflowApiKey,
        openaiApiKey: testConfig.openaiApiKey,
      });
      results.push(result);
      console.log("");
    }
  } catch (error) {
    console.error("测试执行失败:", error);
    await sendFeishu(`【测试错误】\n错误：${error.message}`);
  }

  // 汇总报告
  console.log("=".repeat(50));
  console.log("测试汇总");
  console.log("=".repeat(50));

  const passed = results.filter((r) => r.status === "passed").length;
  const failed = results.filter((r) => r.status === "failed").length;

  results.forEach((r) => {
    const icon = r.status === "passed" ? "✅" : "❌";
    const errorMsg = r.errors?.[0]?.message?.slice(0, 30) || "";
    console.log(
      `${icon} ${r.taskName}: ${r.status} (${r.duration}s) ${errorMsg}`,
    );
  });

  console.log(`\n总计: ${results.length} | 通过: ${passed} | 失败: ${failed}`);

  const summaryFile = path.join(
    TEST_REPORTS_DIR,
    `test-summary-${moment().format("YYYYMMDD-HHmmss")}.md`,
  );
  const summary = `# 测试汇总

## 测试信息
- 测试URL: ${cliConfig.url}
- 执行时间: ${moment().format("YYYY-MM-DD HH:mm:ss")}
- 测试任务: ${cliConfig.tasks}

## 结果统计
- 总计: ${results.length}
- 通过: ${passed}
- 失败: ${failed}

## 详细结果
| 任务名 | 状态 | 耗时 | 通过步骤 | 失败步骤 | 错误信息 |
|--------|------|------|----------|----------|----------|
${results.map((r) => `| ${r.taskName} | ${r.status === "passed" ? "✅ 通过" : "❌ 失败"} | ${r.duration}s | ${r.passed || "-"} | ${r.failed || "-"} | ${r.errors?.[0]?.message?.slice(0, 50) || "-"} |`).join("\n")}

## 截图目录
${results.map((r) => `- ${r.taskName}: ${r.screenshotsDir}`).join("\n")}
`;
  fs.writeFileSync(summaryFile, summary);
  console.log(`\n汇总报告已保存: ${summaryFile}`);

  await sendFeishu(
    `【全部完成】\n总计：${results.length}个任务\n通过：${passed}个\n失败：${failed}个`,
  );

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
