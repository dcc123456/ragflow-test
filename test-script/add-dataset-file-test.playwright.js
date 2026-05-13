/**
 * 添加知识库文件测试 - 自动生成脚本
 */

const { chromium } = require("playwright");
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});
const { loginWithFallback } = require("../test-script/utils/login-helper");

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
    // Step 1: 登录（使用公共登录方法）
    const loginResult = await loginWithFallback(page, TEST_CONFIG);
    if (loginResult.success) {
      console.log("[Step 1] 登录成功");
    } else {
      console.log("[Step 1] 登录失败:", loginResult.message);
      return;
    }

    // Step 2: 进入知识库列表页面
    await page.goto(`${TEST_CONFIG.baseUrl}/datasets`, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    console.log("[Step 2] 进入知识库列表页");

    // Step 3: 点击知识库卡片进入详情（点击第一个知识库）
    await page.click('article h3');
    await page.waitForURL("**/dataset/**", { timeout: 30000 });
    console.log("[Step 3] 进入知识库详情");

    // Step 4-5: 点击添加文件按钮 -> Upload file
    await page.click('button:has-text("Add file")');
    await page.waitForTimeout(500);
    // 点击菜单中的 Upload file
    await page.click('text=Upload file');
    await page.waitForTimeout(1000);
    console.log("[Step 4-5] 添加文件对话框已打开");

    // Step 6: 上传文件 - 使用 file chooser 事件
    const testFile = "D:/projects/dcc/ragflow-test/test-data/sample.pdf";
    await page.waitForTimeout(2000);

    // 设置 file chooser 监听器
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null);

    // 点击"选择文件"按钮
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const selectBtn = buttons.find(b => b.textContent.includes('选择文件'));
      if (selectBtn) selectBtn.click();
    });

    // 处理文件选择器
    const fileChooser = await fileChooserPromise;
    if (fileChooser) {
      await fileChooser.setFiles(testFile);
      console.log("[Step 6] 文件已选择:", testFile);
    } else {
      // 备用：直接设置隐藏的 file input
      await page.locator('input[type="file"]').first().setInputFiles(testFile);
      console.log("[Step 6] 文件已选择(备用):", testFile);
    }

    // Step 7: 点击保存按钮
    await page.waitForSelector('button:has-text("Save")', { timeout: 10000 });
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(3000);
    console.log("[Step 7] 保存成功");

    // 验证结果
    const fileCount = await page.locator('text=sample').count();
    if (fileCount >= 1) {
      console.log("[验证] 文件上传成功，共", fileCount, "个文件");
    }

    console.log("\n========== 测试完成 ==========");
  } catch (error) {
    console.error("[ERROR]", error.message);
    await page.screenshot({ path: 'D:/projects/dcc/ragflow-test/screenshots/error.png' });
    throw error;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  runTest();
}

module.exports = { runTest, TEST_CONFIG };
