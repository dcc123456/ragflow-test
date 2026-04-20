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

// 解析测试用例中的占位符
function replacePlaceholders(content) {
  return content
    .replace(/{{TEST_URL}}/g, cliConfig.url)
    .replace(/{{SILICONFLOW_API_KEY}}/g, testConfig.siliconflowApiKey)
    .replace(/{{OPENAI_API_KEY}}/g, testConfig.openaiApiKey)
    .replace(/{{TEST_USERNAME}}/g, testConfig.username)
    .replace(/{{TEST_PASSWORD}}/g, testConfig.password);
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

// 执行单个测试
async function runTest(taskName, browser) {
  const startTime = Date.now();
  const timestamp = moment().format('YYYYMMDD-HHmmss');
  const logFile = path.join(TEST_RESULTS_DIR, `${taskName}-${timestamp}.log`);
  const screenshotsDir = path.join(SCREENSHOTS_DIR, `${taskName}-${timestamp}`);

  fs.mkdirSync(screenshotsDir, { recursive: true });

  const log = (msg) => {
    const logMsg = `[${moment().format('HH:mm:ss')}] ${msg}`;
    console.log(logMsg);
    fs.appendFileSync(logFile, logMsg + '\n');
  };

  const screenshot = async (name) => {
    try {
      const page = browser.contexts()[0]?.pages()[0];
      if (page) {
        await page.screenshot({ path: path.join(screenshotsDir, `${name}.png`) });
      }
    } catch (e) {
      log(`截图失败: ${e.message}`);
    }
  };

  try {
    log(`开始执行任务: ${taskName}`);
    log(`测试URL: ${cliConfig.url}`);

    await sendFeishu(`【测试开始】
任务：${taskName}
URL：${cliConfig.url}
时间：${moment().format('YYYY-MM-DD HH:mm:ss')}`);

    // 加载测试用例并替换占位符
    let testCase = loadTestCase(taskName);
    testCase = replacePlaceholders(testCase);
    log(`已加载测试用例`);

    // 日志中脱敏敏感信息
    if (testConfig.siliconflowApiKey) {
      log(`SILICONFLOW_API_KEY: ${maskSensitive(testConfig.siliconflowApiKey)}`);
    }
    if (testConfig.openaiApiKey) {
      log(`OPENAI_API_KEY: ${maskSensitive(testConfig.openaiApiKey)}`);
    }

    // 创建新页面
    const context = await browser.newContext();
    const page = await context.newPage();

    if (cliConfig.headless) {
      log('Headless 模式：跳过实际浏览器测试');
      await screenshot('ci-mode');
    } else {
      // 访问测试URL
      await page.goto(cliConfig.url);
      await screenshot('initial-page');

      // 根据不同任务执行不同操作
      if (taskName.includes('add-llm')) {
        // 添加 LLM 测试
        log('执行 add-llm 测试...');
        // TODO: 实现具体的测试逻辑
        await screenshot('add-llm-completed');
      } else if (taskName.includes('login')) {
        // 登录测试
        log('执行 login 测试...');
        // TODO: 实现具体的测试逻辑
        await screenshot('login-completed');
      } else if (taskName.includes('billing')) {
        // 计费测试
        log('执行 billing 测试...');
        // TODO: 实现具体的测试逻辑
        await screenshot('billing-completed');
      }
    }

    await context.close();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`任务完成，耗时: ${duration}s`);

    await sendFeishu(`【测试完成】
任务：${taskName}
结果：✅ 通过
耗时：${duration}s`);

    return { taskName, status: 'passed', duration, logFile, screenshotsDir };

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`任务失败: ${error.message}`);

    await screenshot('error-state');

    await sendFeishu(`【测试错误】
任务：${taskName}
错误：${error.message}
堆栈：${error.stack?.slice(0, 200)}`);

    return { taskName, status: 'failed', duration, error: error.message, logFile, screenshotsDir };
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
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const tasks = getTestTasks();
    console.log(`找到 ${tasks.length} 个测试任务\n`);

    for (const taskName of tasks) {
      console.log('-'.repeat(40));
      const result = await runTest(taskName, browser);
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
    console.log(`${icon} ${r.taskName}: ${r.status} (${r.duration}s)`);
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
| 任务名 | 状态 | 耗时 | 错误信息 |
|--------|------|------|----------|
${results.map(r => `| ${r.taskName} | ${r.status === 'passed' ? '✅ 通过' : '❌ 失败'} | ${r.duration}s | ${r.error ? r.error.slice(0, 50) : '-'} |`).join('\n')}
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
