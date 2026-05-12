/**
 * 添加知识库测试
 * 使用公共的 login-helper.js 进行登录
 */

const { chromium } = require("playwright");
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});
const { loginWithFallback } = require("./utils/login-helper.js");

const TEST_CONFIG = {
  baseUrl: process.env.TEST_URL || "http://localhost:9222",
  email: process.env.TEST_EMAIL || "dcc-test1@gmail.com",
  password: process.env.TEST_PASSWORD || "123456",
  timeout: 30000,
};

// 生成唯一的知识库名称
const DATASET_NAME = `测试知识库_${Date.now()}`;

async function runAddDatasetTest() {
  console.log("========== 开始添加知识库测试 ==========\n");
  console.log(`测试URL: ${TEST_CONFIG.baseUrl}`);
  console.log(`测试账号: ${TEST_CONFIG.email}\n`);

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
    // ========== Step 1-3: 登录（使用公共登录方法）============
    console.log("[Step 1-3] 执行登录流程...");
    const loginResult = await loginWithFallback(page, TEST_CONFIG);
    if (loginResult.success) {
      console.log("[Step 1-3] ✅ 登录成功");
      results.push({ step: 1, status: "passed", message: "登录成功" });
      results.push({ step: 2, status: "passed", message: "登录成功" });
      results.push({ step: 3, status: "passed", message: "登录成功" });
    } else {
      console.log("[Step 1-3] ❌ 登录失败:", loginResult.message);
      results.push({ step: 1, status: "failed", message: "登录失败" });
      results.push({ step: 2, status: "failed", message: "登录失败" });
      results.push({ step: 3, status: "failed", message: "登录失败" });
      return results;
    }

    // ========== Step 4: 进入知识库列表页面 ==========
    console.log("[Step 4] 进入知识库列表页面...");
    console.log(`[Step 4] 将要添加的知识库名称: ${DATASET_NAME}`);
    await page.goto(`${TEST_CONFIG.baseUrl}/datasets`, {
      timeout: TEST_CONFIG.timeout,
    });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    const datasetUrl = page.url();
    if (datasetUrl.includes("/dataset")) {
      console.log("[Step 4] ✅ 已进入知识库页面");
      results.push({
        step: 4,
        status: "passed",
        message: "进入知识库页面成功",
      });
    } else {
      console.log(`[Step 4] ⚠️ 当前URL: ${datasetUrl}`);
      results.push({ step: 4, status: "passed", message: "已导航" });
    }

    // ========== Step 5: 点击添加知识库按钮 ==========
    console.log("[Step 5] 点击添加知识库按钮...");
    await page.waitForTimeout(2000);

    const allButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.map((b) => ({
        text: b.textContent?.trim().substring(0, 50),
        disabled: b.disabled,
      }));
    });

    console.log("[调试] 页面上的按钮:");
    allButtons.slice(0, 10).forEach((btn, i) => {
      console.log(`  [${i}] "${btn.text}" (disabled=${btn.disabled})`);
    });

    await page.screenshot({
      path: `add-dataset-before-click-${Date.now()}.png`,
      fullPage: false,
    });

    const addButtonClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));

      // 首先尝试精确匹配 "Create dataset"
      let addBtn = buttons.find(
        (b) => !b.disabled && b.textContent?.trim() === "Create dataset",
      );

      // 如果没找到，尝试其他变体
      if (!addBtn) {
        addBtn = buttons.find(
          (b) =>
            !b.disabled &&
            (b.textContent?.includes("Create dataset") ||
              b.textContent?.includes("创建数据集") ||
              b.textContent?.includes("添加知识库") ||
              b.textContent?.includes("Add knowledge")),
        );
      }

      if (addBtn) {
        addBtn.click();
        return true;
      }
      return false;
    });

    if (addButtonClicked) {
      console.log("[Step 5] ✅ 添加按钮已点击");
      results.push({ step: 5, status: "passed", message: "点击添加按钮成功" });
    } else {
      console.log("[Step 5] ❌ 未找到添加按钮");
      results.push({ step: 5, status: "failed", message: "未找到添加按钮" });
      await page.screenshot({
        path: `add-dataset-step5-${Date.now()}.png`,
        fullPage: true,
      });
      return results;
    }

    await page.waitForTimeout(2000);

    // ========== Step 6: 填写知识库名称 ==========
    console.log("[Step 6] 填写知识库名称...");

    const nameFilled = await page.evaluate((datasetName) => {
      const inputs = Array.from(document.querySelectorAll("input"));
      const nameInput = inputs.find(
        (input) =>
          input.placeholder?.toLowerCase().includes("name") ||
          input.placeholder?.toLowerCase().includes("名称") ||
          input.name?.toLowerCase().includes("name"),
      );

      if (nameInput) {
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

        setNativeValue(nameInput, datasetName);
        return true;
      }
      return false;
    }, DATASET_NAME);

    if (nameFilled) {
      console.log("[Step 6] ✅ 知识库名称已填写");
      results.push({ step: 6, status: "passed", message: "填写名称成功" });
    } else {
      console.log("[Step 6] ⚠️ 未找到名称输入框");
      results.push({ step: 6, status: "warning", message: "未找到名称输入框" });
    }

    // ========== Step 7: 选择解析类型（built-in）============
    console.log("[Step 7] 选择解析类型...");

    const parserSelected = await page.evaluate(() => {
      const options = Array.from(
        document.querySelectorAll("option, [role='option'], div"),
      );
      const builtInOption = options.find(
        (opt) =>
          opt.textContent?.toLowerCase().includes("built") ||
          opt.textContent?.includes("内置"),
      );

      if (builtInOption) {
        if (builtInOption.tagName === "OPTION") {
          builtInOption.selected = true;
          builtInOption.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          builtInOption.click();
        }
        return true;
      }
      return false;
    });

    if (parserSelected) {
      console.log("[Step 7] ✅ 已选择 built-in");
      results.push({ step: 7, status: "passed", message: "选择解析类型成功" });
    } else {
      console.log("[Step 7] ⚠️ 未找到 built-in 选项");
      results.push({
        step: 7,
        status: "warning",
        message: "未找到解析类型选项",
      });
    }

    await page.waitForTimeout(1000);

    // ========== Step 8: 选择 general 模型 ==========
    console.log("[Step 8] 选择 general 模型...");

    await page.screenshot({
      path: `add-dataset-step8-before-${Date.now()}.png`,
      fullPage: true,
    });

    // 先点击 built-in 下拉框让它展开
    const dropdownClicked = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll("*"));
      let targetElement = null;

      for (const el of allElements) {
        if (el.children.length === 0) {
          const text = el.textContent?.trim() || "";
          if (
            text === "built-in" ||
            text === "built in" ||
            text.includes("builtin")
          ) {
            targetElement = el;
            break;
          }
        }
      }

      if (targetElement) {
        let parent = targetElement.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
          const dropdown = parent.querySelector(
            '.ant-select, [class*="select"], [class*="dropdown"], [role="combobox"]',
          );
          if (dropdown) {
            dropdown.click();
            return true;
          }
          if (
            parent.className &&
            (parent.className.includes("select") ||
              parent.className.includes("dropdown"))
          ) {
            parent.click();
            return true;
          }
          parent = parent.parentElement;
        }

        targetElement.click();
        return true;
      }

      const dropdowns = document.querySelectorAll(
        '.ant-select, [role="combobox"], [class*="select-selector"], [class*="select_trigger"]',
      );
      if (dropdowns.length > 0) {
        dropdowns[dropdowns.length - 1].click();
        return true;
      }

      return false;
    });

    console.log(
      `[Step 8] 点击 built-in 下拉框: ${dropdownClicked ? "成功" : "失败"}`,
    );
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: `add-dataset-step8-dropdown-${Date.now()}.png`,
      fullPage: false,
    });

    const modelInfo = await page.evaluate(() => {
      const dropdowns = Array.from(
        document.querySelectorAll(
          '.ant-select-dropdown, [class*="dropdown-menu"], [role="listbox"], [class*="menu"]',
        ),
      );

      let options = [];

      for (const dropdown of dropdowns) {
        const opts = Array.from(
          dropdown.querySelectorAll("li, [role='option'], div"),
        );
        options = opts
          .filter((opt) => {
            const text = opt.textContent?.trim() || "";
            return text.length > 0 && text.length < 100;
          })
          .map((opt) => ({
            text: opt.textContent?.trim().substring(0, 50),
            tag: opt.tagName,
          }));
        if (options.length > 0) break;
      }

      if (options.length === 0) {
        const all = Array.from(
          document.querySelectorAll("li, [role='option']"),
        );
        options = all
          .filter((opt) => {
            const text = opt.textContent?.trim() || "";
            return (
              text.length > 0 &&
              text.length < 50 &&
              !text.includes("header") &&
              !text.includes("Dataset")
            );
          })
          .map((opt) => ({
            text: opt.textContent?.trim().substring(0, 50),
            tag: opt.tagName,
          }));
      }

      return options.slice(0, 20);
    });

    console.log("[调试] 下拉框展开后的选项:");
    modelInfo.forEach((opt, i) => {
      console.log(`  [${i}] <${opt.tag}> ${opt.text}`);
    });

    const modelSelected = await page.evaluate(() => {
      const dropdowns = Array.from(
        document.querySelectorAll(
          '.ant-select-dropdown, [class*="dropdown-menu"], [role="listbox"]',
        ),
      );

      for (const dropdown of dropdowns) {
        const opts = Array.from(
          dropdown.querySelectorAll("li, [role='option'], div"),
        );
        for (const opt of opts) {
          const text = opt.textContent?.toLowerCase() || "";
          if (text.includes("general") && text.length < 50) {
            opt.click();
            return true;
          }
        }
      }

      const allOpts = Array.from(
        document.querySelectorAll("li, [role='option']"),
      );
      for (const opt of allOpts) {
        const text = opt.textContent?.toLowerCase() || "";
        if (
          text.includes("general") &&
          text.length < 50 &&
          !text.includes("header")
        ) {
          opt.click();
          return true;
        }
      }

      return false;
    });

    if (modelSelected) {
      console.log("[Step 8] ✅ 已选择 general");
      results.push({ step: 8, status: "passed", message: "选择模型成功" });
    } else {
      console.log("[Step 8] ⚠️ 未找到 general 选项");
      results.push({
        step: 8,
        status: "warning",
        message: "未找到 general 选项",
      });
    }

    // ========== Step 9: 点击保存按钮 ==========
    console.log("[Step 9] 点击保存按钮...");

    await page.waitForTimeout(1000);

    const saveClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const saveBtn = buttons.find(
        (b) =>
          b.textContent?.toLowerCase().includes("save") ||
          b.textContent?.includes("保存") ||
          b.textContent?.toLowerCase().includes("confirm") ||
          b.textContent?.includes("确认"),
      );

      if (saveBtn) {
        saveBtn.click();
        return true;
      }
      return false;
    });

    if (saveClicked) {
      console.log("[Step 9] ✅ 保存按钮已点击");
      results.push({ step: 9, status: "passed", message: "点击保存成功" });
    } else {
      console.log("[Step 9] ❌ 未找到保存按钮");
      results.push({ step: 9, status: "failed", message: "未找到保存按钮" });
    }

    await page.waitForTimeout(3000);

    // ========== Step 10: 验证结果 ==========
    console.log("[Step 10] 验证添加结果...");
    console.log(`[Step 10] 查找知识库名称: ${DATASET_NAME}`);

    await page.waitForTimeout(2000);

    // 检查知识库列表中是否出现新添加的知识库
    const verifyResult = await page.evaluate((datasetName) => {
      // 查找知识库列表中的所有项目
      const items = Array.from(document.querySelectorAll("div, span, a, li"));
      const datasetItems = items.filter((item) => {
        const text = item.textContent || "";
        // 检查是否包含知识库名称
        return text.includes(datasetName) && text.length < 200;
      });

      if (datasetItems.length > 0) {
        return {
          found: true,
          text: datasetItems[0].textContent?.substring(0, 100),
        };
      }

      return { found: false };
    }, DATASET_NAME);

    await page.screenshot({
      path: `add-dataset-result-${Date.now()}.png`,
      fullPage: true,
    });

    if (verifyResult.found) {
      console.log("[Step 10] ✅ 知识库添加成功");
      console.log(`[Step 10] 找到知识库: ${verifyResult.text}`);
      results.push({ step: 10, status: "passed", message: "知识库添加成功" });
    } else {
      console.log("[Step 10] ⚠️ 未在列表中找到新添加的知识库");
      results.push({
        step: 10,
        status: "warning",
        message: "未找到新添加的知识库",
      });
    }
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    results.push({
      step: "unknown",
      status: "failed",
      message: error.message,
    });
    await page
      .screenshot({ path: `add-dataset-error-${Date.now()}.png` })
      .catch(() => {});
  } finally {
    console.log("\n[完成] 浏览器保持打开，截图已保存");
  }

  // ========== 测试结果汇总 ==========
  console.log("\n========== 测试结果汇总 ==========");
  results.forEach((r) => {
    const icon =
      r.status === "passed" ? "✅" : r.status === "warning" ? "⚠️" : "❌";
    console.log(`${icon} Step ${r.step}: ${r.message}`);
  });

  const passed = results.filter((r) => r.status === "passed").length;
  const warnings = results.filter((r) => r.status === "warning").length;
  const failed = results.filter((r) => r.status === "failed").length;

  console.log(`\n总计: ${passed} 通过, ${warnings} 部分, ${failed} 失败`);

  return results;
}

if (require.main === module) {
  runAddDatasetTest();
}

module.exports = { runAddDatasetTest, TEST_CONFIG };
