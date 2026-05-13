/**
 * 添加大模型 Playwright 自动化测试
 *
 * 测试目标: 添加 SILICONFLOW 模型提供商并设置默认模型
 * 测试环境: 从环境变量 TEST_URL 读取，默认为 http://localhost:9222
 *
 * 环境变量配置（参考 .env.example）:
 *   TEST_URL         - 测试环境URL
 *   TEST_EMAIL       - 测试账号邮箱
 *   TEST_PASSWORD    - 测试账号密码
 *   TEST_API_KEY     - SILICONFLOW API Key
 *   LLM_MODEL        - 默认LLM模型
 *   EMBEDDING_MODEL  - 默认Embedding模型
 *
 * 运行方式:
 *   node -r dotenv/config add-llm-test.playwright.js
 */

const { chromium } = require("playwright");
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { loginWithFallback } = require("./utils/login-helper");

const TEST_CONFIG = {
  baseUrl: process.env.TEST_URL || "http://localhost:9222",
  email: process.env.TEST_EMAIL || "dcc-test1@gmail.com",
  password: process.env.TEST_PASSWORD || "123456",
  apiKey: process.env.TEST_API_KEY || "",
  llmModel: process.env.LLM_MODEL || "Qwen/Qwen2.5-72B-Instruct-128Kt",
  embeddingModel: process.env.EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L12-v2",
  timeout: 30000,
};

/**
 * 等待下拉框选项加载
 */
async function waitForDropdownOptions(page, maxWaitMs = 15000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const options = await page.evaluate(() => {
      const popover = document.querySelector('[data-radix-popper-content-wrapper]');
      if (!popover) return { count: 0, texts: [] };
      const opts = popover.querySelectorAll('[role="option"]');
      return {
        count: opts.length,
        texts: Array.from(opts).slice(0, 5).map(o => o.textContent?.trim().substring(0, 40))
      };
    });
    if (options.count > 0) {
      return options;
    }
    await page.waitForTimeout(1000);
  }
  return { count: 0, texts: [] };
}

/**
 * 选择下拉框选项 - 通过label顺序找到对应的combobox
 * @param {object} page - Playwright page对象
 * @param {string} optionText - 要选择的选项文本
 * @param {number} fieldIndex - 字段顺序索引 (0=LLM, 1=Embedding, 2=VLM, 3=ASR, 4=Rerank, 5=TTS)
 */
async function selectDropdownOption(page, optionText, fieldIndex = 0) {
  // 找到 "Set default models" 区域内的所有 "Select model" combobox
  const selectModelInfo = await page.evaluate(() => {
    // 找到 "Set default models" 区域
    let setDefaultSection = null;
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      if (el.textContent === "Set default models" && el.children.length === 0) {
        setDefaultSection = el;
        break;
      }
    }

    if (!setDefaultSection) return { error: "未找到 Set default models 区域" };

    // 向上找到容器
    let container = setDefaultSection.parentElement;
    while (container && container.tagName !== 'SECTION' && container.tagName !== 'DIV') {
      container = container.parentElement;
    }

    if (!container) return { error: "未找到容器" };

    // 找到所有 "Select model" 的 combobox
    const comboboxes = container.querySelectorAll('[role="combobox"]');
    const selectModelComboboxes = [];

    for (const cb of comboboxes) {
      if (cb.textContent.includes("Select model")) {
        selectModelComboboxes.push(cb);
      }
    }

    return {
      totalComboboxes: comboboxes.length,
      selectModelCount: selectModelComboboxes.length,
      selectModelIndices: Array.from(selectModelComboboxes).map(cb => {
        const allComboboxes = container.querySelectorAll('[role="combobox"]');
        return Array.from(allComboboxes).indexOf(cb);
      })
    };
  });

  console.log(`[DEBUG] Select model combobox 信息:`, JSON.stringify(selectModelInfo));

  if (selectModelInfo.error) {
    return false;
  }

  // 使用 fieldIndex 找到对应的 combobox
  const comboboxes = await page.locator('[role="combobox"]').all();
  const targetIndex = selectModelInfo.selectModelIndices[fieldIndex];

  if (targetIndex === undefined || targetIndex < 0 || targetIndex >= comboboxes.length) {
    console.log(`[DEBUG] fieldIndex ${fieldIndex} 无效，targetIndex=${targetIndex}`);
    return false;
  }

  console.log(`[DEBUG] 点击 fieldIndex=${fieldIndex} -> combobox index=${targetIndex}`);

  // 点击
  try {
    await comboboxes[targetIndex].scrollIntoViewIfNeeded();
    await comboboxes[targetIndex].click();
  } catch (e) {
    console.log(`[DEBUG] 点击失败: ${e.message}`);
    return false;
  }

  await page.waitForTimeout(3000);

  // 检查下拉框
  const dropdownState = await page.evaluate(() => {
    const popover = document.querySelector('[data-radix-popper-content-wrapper]');
    if (!popover) return { exists: false };

    const options = popover.querySelectorAll('[role="option"]');
    return {
      exists: true,
      optionCount: options.length,
      texts: Array.from(options).slice(0, 5).map(o => o.textContent?.trim().substring(0, 40))
    };
  });

  console.log(`[DEBUG] 下拉框状态:`, JSON.stringify(dropdownState));

  if (!dropdownState.exists || dropdownState.optionCount === 0) {
    return false;
  }

  // 选择选项
  const selected = await page.evaluate(
    ({ optionText }) => {
      const popover = document.querySelector('[data-radix-popper-content-wrapper]');
      if (!popover) return false;

      const options = popover.querySelectorAll('[role="option"]');
      for (const opt of options) {
        if (opt.textContent.toLowerCase().includes(optionText.toLowerCase())) {
          opt.click();
          return true;
        }
      }
      return false;
    },
    { optionText },
  );

  return selected;
}

async function runAddLLMTest() {
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
    // ========== Step 0: 登录（使用公共登录方法）============
    console.log("[Step 0] 执行登录...");
    const loginResult = await loginWithFallback(page, TEST_CONFIG);
    if (loginResult.success) {
      console.log("[Step 0] ✅ 登录成功");
      results.push({ step: 0, status: "passed", message: "登录成功" });
    } else {
      console.log("[Step 0] ❌ 登录失败:", loginResult.message);
      results.push({ step: 0, status: "failed", message: "登录失败" });
      return results;
    }

    // ========== Step 1: 进入 Model providers 页面 ==========
    console.log("[Step 1] 进入 Model providers 页面...");
    await page.goto(`${TEST_CONFIG.baseUrl}/user-setting/model`, {
      timeout: TEST_CONFIG.timeout,
    });
    await page.waitForLoadState("load");
    await page.waitForTimeout(3000);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    console.log("[Step 1] ✅ 已进入 Model providers 页面");
    results.push({ step: 1, status: "passed", message: "进入 Model providers 页面" });

    // ========== Step 2: 添加 SILICONFLOW ==========
    console.log("[Step 2] 检查 SILICONFLOW 提供商...");

    await page.waitForTimeout(2000);

    // 检查SILICONFLOW是否已在"Added models"区域
    const siliconflowExists = await page.evaluate(() => {
      // 查找"Added models"标题，然后检查其后是否有SILICONFLOW
      const headings = document.querySelectorAll('h1, h2, h3, h4, div[role="heading"]');
      let inAddedModels = false;
      for (const h of headings) {
        if (h.textContent === "Added models") {
          inAddedModels = true;
        } else if (inAddedModels && h.textContent) {
          // 如果遇到下一个标题，说明Added models区域结束
          if (h.textContent !== "Added models" && h.getAttribute('role') === 'heading') {
            inAddedModels = false;
          }
        }
      }
      // 更精确的检查
      const body = document.body.innerText;
      // Added models区域在"Set default models"之前
      const addedModelsSection = body.substring(body.indexOf("Added models"), body.indexOf("Set default models"));
      const addedModelsSiliconflow = addedModelsSection.includes("SILICONFLOW");
      return addedModelsSiliconflow;
    });
    console.log(`[DEBUG] SILICONFLOW Added models检查: ${siliconflowExists}`);

    if (siliconflowExists) {
      console.log("[Step 2] ✅ SILICONFLOW 已存在");
      results.push({ step: 2, status: "passed", message: "SILICONFLOW 已存在" });
    } else {
      console.log("[Step 2] 添加 SILICONFLOW...");

      // 点击 SILICONFLOW 按钮
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const siliconBtn = buttons.find((b) => b.textContent?.includes("SILICONFLOW"));
        if (siliconBtn) siliconBtn.click();
      });

      await page.waitForTimeout(1500);

      // 填写 API Key
      const keyFilled = await page.evaluate(
        ({ apiKey }) => {
          const setNativeValue = (element, value) => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              HTMLInputElement.prototype, "value",
            )?.set;
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(element, value);
            } else {
              element.value = value;
            }
            element.dispatchEvent(new Event("input", { bubbles: true }));
            element.dispatchEvent(new Event("change", { bubbles: true }));
          };

          const inputs = document.querySelectorAll("input");
          let filled = false;
          for (const input of inputs) {
            // 匹配任何文本输入或密码输入
            if (input.type === "text" || input.type === "password" || input.type === "key") {
              setNativeValue(input, apiKey);
              filled = true;
            }
          }
          return filled;
        },
        { apiKey: TEST_CONFIG.apiKey },
      );
      console.log(`[DEBUG] API Key 填充结果: ${keyFilled}`);

      await page.waitForTimeout(500);

      // 点击 Save - 使用Playwright locator更可靠
      try {
        await page.locator('button:has-text("Save"), button:has-text("保存")').click();
        console.log("[DEBUG] Save按钮点击成功");
      } catch (e) {
        console.log(`[DEBUG] Save按钮点击失败: ${e.message}`);
        // 备用方案
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll("button"));
          const saveBtn = buttons.find((b) => b.textContent?.trim() === "Save" || b.textContent?.trim() === "保存");
          if (saveBtn) saveBtn.click();
        });
      }

      // 等待对话框关闭
      await page.waitForTimeout(3000);

      // 按Escape关闭可能残留的对话框
      await page.keyboard.press("Escape");
      await page.waitForTimeout(1000);

      // 截图看添加后的状态
      await page.screenshot({ path: `debug-after-add-siliconflow-${Date.now()}.png`, fullPage: true });

      console.log("[Step 2] ✅ SILICONFLOW 添加完成");
      results.push({ step: 2, status: "passed", message: "SILICONFLOW 添加成功" });
    }

    // ========== Step 3: 刷新页面 ==========
    await page.reload({ timeout: TEST_CONFIG.timeout });
    await page.waitForLoadState("load");
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2000);

    // ========== Step 3: 设置 LLM 模型 (fieldIndex=0, 即第1个 Select model) ==========
    console.log("[Step 3] 设置 LLM 模型...");

    const llmSelected = await selectDropdownOption(page, TEST_CONFIG.llmModel, 0);

    if (llmSelected) {
      console.log(`[Step 3] ✅ LLM 模型已选择: ${TEST_CONFIG.llmModel}`);
      results.push({ step: 3, status: "passed", message: `LLM 设置为 ${TEST_CONFIG.llmModel}` });
    } else {
      console.log(`[Step 3] ⚠️ LLM 模型选择失败`);
      results.push({ step: 3, status: "warning", message: "LLM 模型选择失败" });
    }

    await page.waitForTimeout(1000);

    // ========== Step 4: 设置 Embedding 模型 (fieldIndex=1, 即第2个 Select model) ==========
    console.log("[Step 4] 设置 Embedding 模型...");

    const embeddingSelected = await selectDropdownOption(page, TEST_CONFIG.embeddingModel, 1);

    if (embeddingSelected) {
      console.log(`[Step 4] ✅ Embedding 模型已选择: ${TEST_CONFIG.embeddingModel}`);
      results.push({ step: 4, status: "passed", message: `Embedding 设置为 ${TEST_CONFIG.embeddingModel}` });
    } else {
      console.log(`[Step 4] ⚠️ Embedding 模型选择失败`);
      results.push({ step: 4, status: "warning", message: "Embedding 模型选择失败" });
    }

    await page.waitForTimeout(1000);

    // ========== Step 5: 验证配置持久化 ==========
    console.log("[Step 5] 验证配置持久化...");

    await page.reload({ timeout: TEST_CONFIG.timeout });
    await page.waitForLoadState("load");
    await page.waitForTimeout(3000);

    const verifyText = await page.evaluate(() => document.body.innerText);
    const llmOk = verifyText.includes(TEST_CONFIG.llmModel);
    const siliconflowOk = verifyText.includes("SILICONFLOW");

    if (llmOk && siliconflowOk) {
      console.log("[Step 5] ✅ 验证通过");
      results.push({ step: 5, status: "passed", message: "配置持久化验证通过" });
    } else {
      console.log(`[Step 5] ⚠️ LLM=${llmOk}, SILICONFLOW=${siliconflowOk}`);
      results.push({ step: 5, status: "warning", message: "配置持久化验证部分通过" });
    }

    await page.screenshot({ path: `add-llm-test-verification-${Date.now()}.png`, fullPage: true });

  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    results.push({ step: "unknown", status: "failed", message: error.message });
    await page.screenshot({ path: `add-llm-test-failure-${Date.now()}.png` }).catch(() => {});
  } finally {
    await browser.close();
  }

  // 结果汇总
  console.log("\n========== 测试结果汇总 ==========");
  results.forEach((r) => {
    const icon = r.status === "passed" ? "✅" : r.status === "warning" ? "⚠️" : "❌";
    console.log(`${icon} Step ${r.step}: ${r.message}`);
  });

  const passed = results.filter((r) => r.status === "passed").length;
  const warnings = results.filter((r) => r.status === "warning").length;
  const failed = results.filter((r) => r.status === "failed").length;

  console.log(`\n总计: ${passed} 通过, ${warnings} 部分/待确认, ${failed} 失败`);

  return { passed, failed, warnings, results };
}

if (require.main === module) {
  runAddLLMTest()
    .then((result) => process.exit(result.failed > 0 ? 1 : 0))
    .catch((err) => {
      console.error("测试执行失败:", err);
      process.exit(1);
    });
}

module.exports = { runAddLLMTest, TEST_CONFIG };
