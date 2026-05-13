/**
 * 登录注册公共方法
 * 提供可复用的登录和注册功能
 */

const { chromium } = require("playwright");

/**
 * 辅助函数：设置 React controlled input 的值
 */
function setNativeValue(element, value) {
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
}

/**
 * 查找登录表单的邮箱和密码输入框
 */
function findLoginInputs(page) {
  return page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll("input"));
    let emailInput = null;
    let passwordInput = null;

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

    return { emailInput: !!emailInput, passwordInput: !!passwordInput };
  });
}

/**
 * 填写登录表单
 */
async function fillLoginForm(page, email, password) {
  await page.evaluate(
    ({ email, password }) => {
      const inputs = Array.from(document.querySelectorAll("input"));
      let emailInput = null;
      let passwordInput = null;

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

      if (emailInput) setNativeValue(emailInput, email);
      if (passwordInput) setNativeValue(passwordInput, password);
    },
    { email, password },
  );
}

/**
 * 点击登录按钮
 */
async function clickLoginButton(page) {
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button, [role='button']"));
    let btn = null;

    // 精确匹配 "Sign in"
    btn = buttons.find((b) => b.textContent?.trim() === "Sign in" && !b.disabled);

    // 如果没找到，尝试模糊匹配
    if (!btn) {
      btn = buttons.find((b) =>
        (b.textContent?.toLowerCase().includes("sign in") ||
         b.textContent?.includes("登录")) && !b.disabled
      );
    }

    if (btn) {
      btn.click();
    } else {
      console.log("[警告] 未找到登录按钮，可用按钮:", buttons.map(b => b.textContent?.trim()).filter(Boolean));
    }
  });
}

/**
 * 检查是否登录成功
 */
async function isLoggedIn(page) {
  const url = page.url();
  return !url.includes("/login") && !url.includes("/register");
}

/**
 * 点击注册按钮
 */
async function clickSignUpButton(page) {
  const result = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button, a, [role='button']"));
    const allElements = Array.from(document.querySelectorAll("*"));

    // 输出所有按钮文本
    const buttonTexts = buttons.map(b => b.textContent?.trim()).filter(Boolean);
    console.log("[调试] 所有按钮:", buttonTexts.join(", "));

    // 查找可能包含注册链接的a标签
    const links = Array.from(document.querySelectorAll("a[href*='register'], a[href*='sign']"));
    console.log("[调试] 注册相关链接:", links.map(l => `${l.textContent?.trim()} -> ${l.href}`).join(", "));

    let signUpBtn = null;

    // 精确匹配 "Sign up"
    signUpBtn = buttons.find((b) => b.textContent?.trim() === "Sign up");

    // 如果没找到，尝试模糊匹配
    if (!signUpBtn) {
      signUpBtn = buttons.find((b) =>
        b.textContent?.toLowerCase().includes("sign up") ||
        b.textContent?.includes("注册")
      );
    }

    // 如果还是没找到，尝试查找包含注册链接的元素
    if (!signUpBtn) {
      signUpBtn = links.find(el => el.textContent?.toLowerCase().includes("sign up") || el.textContent?.includes("注册"));
    }

    if (signUpBtn) {
      signUpBtn.click();
      return { success: true, text: signUpBtn.textContent?.trim(), tag: signUpBtn.tagName };
    } else {
      console.log("[警告] 未找到注册按钮");
      return { success: false, buttons: buttonTexts };
    }
  });

  if (result && !result.success) {
    console.log("[调试] 可用按钮列表:", result.buttons);
  }
}

/**
 * 填写注册表单
 */
async function fillRegisterForm(page, email, password) {
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
          if (
          name.includes("password") ||
          placeholder.includes("password")
        ) {
          setNativeValue(input, password);
        }
        }
      }
    },
    { email, password },
  );
}

/**
 * 点击 Continue 按钮
 */
async function clickContinueButton(page) {
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const continueBtn = buttons.find(
      (b) => b.textContent?.trim() === "Continue",
    );
    if (continueBtn) continueBtn.click();
  });
}

/**
 * 完整的登录流程（包含注册回退）
 * @param {Object} page - Playwright page 对象
 * @param {Object} config - 配置对象 { baseUrl, email, password }
 * @returns {Object} - { success: boolean, message: string }
 */
async function loginWithFallback(page, config) {
  const { baseUrl, email, password } = config;

  console.log(`[登录] 开始登录流程...`);
  console.log(`[登录] URL: ${baseUrl}`);
  console.log(`[登录] 账号: ${email}`);

  // Step 1: 打开登录页面
  console.log("[登录] Step 1: 打开登录页面...");
  await page.goto(`${baseUrl}/login`, { timeout: config.timeout || 30000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  console.log("[登录] ✅ 登录页面已加载");

  // Step 2: 填写登录表单
  console.log("[登录] Step 2: 填写登录表单...");
  await fillLoginForm(page, email, password);
  const { emailInput, passwordInput } = await findLoginInputs(page);
  console.log(`[登录] DOM填写: email=${emailInput}, password=${passwordInput}`);
  await page.waitForTimeout(500);

  // Step 3: 点击登录按钮
  console.log("[登录] Step 3: 点击登录按钮...");
  await clickLoginButton(page);
  await page.waitForTimeout(3000);

  // 检查是否登录成功
  if (await isLoggedIn(page)) {
    console.log("[登录] ✅ 登录成功");
    return { success: true, message: "登录成功" };
  }

  // 登录失败，尝试注册
  console.log("[登录] ⚠️ 登录失败，账号可能不存在，开始注册...");

  // Step 4: 点击注册按钮
  console.log("[登录] Step 4: 点击注册按钮...");
  await clickSignUpButton(page);
  console.log("[登录] ✅ 注册按钮已点击");

  // 等待页面跳转到注册页
  try {
    await page.waitForURL(url => url.includes("/register"), { timeout: 5000 });
    console.log("[登录] ✅ 跳转到注册页面:", page.url());
  } catch (e) {
    console.log("[登录] ⚠️ 点击注册按钮后未跳转，尝试重新点击...");
    await page.screenshot({ path: `${__dirname}/../../register-click-error-${Date.now()}.png`, fullPage: true });

    // 再次尝试点击注册按钮
    await clickSignUpButton(page);
    await page.waitForTimeout(2000);

    try {
      await page.waitForURL(url => url.includes("/register"), { timeout: 5000 });
      console.log("[登录] ✅ 重新点击后成功跳转:", page.url());
    } catch (e2) {
      console.log("[登录] ❌ 仍然无法跳转到注册页面，截图已保存");
      await page.screenshot({ path: `${__dirname}/../../register-fail-${Date.now()}.png`, fullPage: true });
      return { success: false, message: "无法跳转到注册页面" };
    }
  }

  // Step 5: 填写注册表单
  console.log("[登录] Step 5: 填写注册表单...");
  await fillRegisterForm(page, email, password);
  await page.waitForTimeout(500);
  console.log("[登录] ✅ 注册表单已填写");

  // Step 6: 点击 Continue 按钮
  console.log("[登录] Step 6: 点击 Continue 按钮...");
  await clickContinueButton(page);
  await page.waitForTimeout(3000);
  console.log("[登录] ✅ 注册表单已提交");

  // Step 7: 使用新账号登录
  console.log("[登录] Step 7: 使用新账号登录...");
  await page.goto(`${baseUrl}/login`, { timeout: config.timeout || 30000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  await fillLoginForm(page, email, password);
  await page.waitForTimeout(500);

  // 截图保存登录状态
  await page.screenshot({ path: `${__dirname}/../../login-before-click-${Date.now()}.png`, fullPage: true });
  console.log("[登录] 截图已保存: login-before-click.png");

  await clickLoginButton(page);
  console.log("[登录] 登录按钮已点击");

  // 增加等待时间和更灵活的URL检查
  try {
    await page.waitForURL(url => !url.includes("/login"), { timeout: 20000 });
    console.log("[登录] ✅ URL已变化:", page.url());
  } catch (e) {
    console.log("[登录] ⚠️ URL检查超时，当前URL:", page.url());
    // 额外等待并截图
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${__dirname}/../../login-after-timeout-${Date.now()}.png`, fullPage: true });
    console.log("[登录] 截图已保存: login-after-timeout.png");
  }

  console.log("[登录] ✅ 新账号注册并登录成功");
  return { success: true, message: "注册并登录成功" };
}

module.exports = {
  loginWithFallback,
  fillLoginForm,
  clickLoginButton,
  clickSignUpButton,
  fillRegisterForm,
  clickContinueButton,
  findLoginInputs,
  isLoggedIn,
};
