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
    const buttons = Array.from(document.querySelectorAll("button"));
    const btn = buttons.find(
      (b) => b.textContent?.trim() === "Sign in" && !b.disabled,
    );
    if (btn) btn.click();
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
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const signUpBtn = buttons.find((b) => b.textContent?.trim() === "Sign up");
    if (signUpBtn) signUpBtn.click();
  });
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
  await page.waitForTimeout(2000);

  // 检查是否跳转到注册页
  let registerUrl = page.url();
  if (!registerUrl.includes("/register")) {
    await page.goto(`${baseUrl}/register`, { timeout: config.timeout || 30000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    console.log("[登录] ✅ 导航到注册页面");
  } else {
    console.log("[登录] ✅ 跳转到注册页面");
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

  await clickLoginButton(page);
  await page.waitForFunction(
    () => !window.location.href.includes("/login"),
    { timeout: 15000 },
  );

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
