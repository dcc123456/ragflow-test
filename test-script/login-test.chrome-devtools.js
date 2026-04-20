/**
 * 用户登录注册 - Chrome DevTools MCP 自动化测试
 *
 * 测试目标: 验证用户登录和注册功能
 * 测试环境: http://localhost:9222/
 * 测试账号: test3@qq.com / 123456
 *
 * 使用 Chrome DevTools MCP 服务执行自动化
 *
 * 运行方式:
 *   1. 确保 Chrome DevTools MCP 服务已启动
 *   2. 使用 web-test-agent 执行自动化流程
 */

const TEST_CONFIG = {
  baseUrl: process.env.TEST_URL || "http://localhost:9222",
  email: process.env.TEST_EMAIL || "test3@qq.com",
  password: process.env.TEST_PASSWORD || "123456",
};

// ========== 完整自动化流程 ==========

/**
 * Step 1: 打开登录页面
 * await chrome_devtools.navigate_page("url", "http://localhost:9222/login");
 * await chrome_devtools.wait_for(["Sign in", "Sign up"], { timeout: 15000 });
 */

/**
 * Step 2: 填写登录表单（第一套表单）
 * // 使用 JavaScript 方式填写，绕过 React controlled input
 * await chrome_devtools.evaluate_script(LOGIN_FORM_FILL_SCRIPT);
 */

/**
 * Step 3: 点击登录按钮
 * await chrome_devtools.evaluate_script(CLICK_SIGNIN_SCRIPT);
 * await chrome_devtools.wait_for(["Welcome", "Dataset"], { timeout: 15000 });
 *
 * // 如果登录失败（账号不存在），跳转到注册流程
 */

/**
 * Step 4: 注册 - 点击 Sign up
 * await chrome_devtools.evaluate_script(CLICK_SIGNUP_SCRIPT);
 */

/**
 * Step 5: 填写注册表单
 * await chrome_devtools.evaluate_script(REGISTER_FORM_FILL_SCRIPT);
 */

/**
 * Step 6: 点击 Continue
 * await chrome_devtools.evaluate_script(CLICK_CONTINUE_SCRIPT);
 */

/**
 * Step 7: 登录验证 - 使用新账号登录
 * await chrome_devtools.navigate_page("url", "http://localhost:9222/login");
 * await chrome_devtools.evaluate_script(LOGIN_FORM_FILL_SCRIPT);
 * await chrome_devtools.evaluate_script(CLICK_SIGNIN_SCRIPT);
 */

/**
 * Step 8: 验证主页
 * await chrome_devtools.wait_for(["Welcome to RAGFlow", "Dataset", "Chat"], { timeout: 10000 });
 */

// ========== JavaScript 脚本 ==========

/**
 * 填写登录表单脚本
 * 关键点：使用 setNativeValue 绕过 React controlled input
 */
const LOGIN_FORM_FILL_SCRIPT = `
const setNativeValue = (element, value) => {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(element, value);
  } else {
    element.value = value;
  }
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

// 查找第一套登录表单的输入框
const inputs = Array.from(document.querySelectorAll("input"));
let emailInput = null;
let passwordInput = null;

for (const input of inputs) {
  const type = input.type?.toLowerCase();
  const placeholder = input.placeholder?.toLowerCase();

  // 找到邮箱输入框（第一套表单）
  if (
    !emailInput &&
    (type === "text" || type === "email" || type === "") &&
    placeholder.includes("email")
  ) {
    emailInput = input;
  }

  // 找到密码输入框
  if (!passwordInput && type === "password") {
    passwordInput = input;
  }
}

if (emailInput) setNativeValue(emailInput, '${TEST_CONFIG.email}');
if (passwordInput) setNativeValue(passwordInput, '${TEST_CONFIG.password}');

return {
  emailFound: !!emailInput,
  passwordFound: !!passwordInput
};
`;

/**
 * 点击登录按钮脚本
 */
const CLICK_SIGNIN_SCRIPT = `
const buttons = Array.from(document.querySelectorAll("button"));
const btn = buttons.find(
  (b) => b.textContent?.trim() === "Sign in" && !b.disabled
);
if (btn) {
  btn.click();
  return "登录按钮已点击";
}
return "未找到登录按钮";
`;

/**
 * 点击 Sign up 按钮脚本
 */
const CLICK_SIGNUP_SCRIPT = `
const buttons = Array.from(document.querySelectorAll("button"));
const signUpBtn = buttons.find(
  (b) => b.textContent?.trim() === "Sign up"
);
if (signUpBtn) {
  signUpBtn.click();
  return "Sign up 按钮已点击";
}
return "未找到 Sign up 按钮";
`;

/**
 * 填写注册表单脚本
 */
const REGISTER_FORM_FILL_SCRIPT = `
const setNativeValue = (element, value) => {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
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
let emailFilled = false;
let passwordFilled = false;

for (const input of inputs) {
  const type = input.type?.toLowerCase();
  const placeholder = input.placeholder?.toLowerCase();
  const name = input.name?.toLowerCase() || "";

  // 填写邮箱
  if (
    !emailFilled &&
    (type === "text" || type === "email" || type === "") &&
    (placeholder.includes("email") || placeholder.includes("邮箱"))
  ) {
    setNativeValue(input, '${TEST_CONFIG.email}');
    emailFilled = true;
  }

  // 填写密码
  if (
    !passwordFilled &&
    type === "password" &&
    (name.includes("password") || placeholder.includes("password"))
  ) {
    setNativeValue(input, '${TEST_CONFIG.password}');
    passwordFilled = true;
  }
}

return {
  emailFilled,
  passwordFilled
};
`;

/**
 * 点击 Continue 按钮脚本
 */
const CLICK_CONTINUE_SCRIPT = `
const buttons = Array.from(document.querySelectorAll("button"));
const continueBtn = buttons.find(
  (b) => b.textContent?.trim() === "Continue"
);
if (continueBtn) {
  continueBtn.click();
  return "Continue 按钮已点击";
}
return "未找到 Continue 按钮";
`;

/**
 * 验证主页脚本
 */
const VERIFY_HOMEPAGE_SCRIPT = `
const content = document.body.innerText || document.body.textContent;
return {
  hasWelcome: content.includes("Welcome to RAGFlow"),
  hasDataset: content.includes("Dataset"),
  hasChat: content.includes("Chat"),
  hasAgent: content.includes("Agent"),
  hasMemory: content.includes("Memory"),
  url: window.location.href
};
`;

/**
 * 登出脚本
 */
const LOGOUT_SCRIPT = `
const buttons = Array.from(document.querySelectorAll("button"));
const logoutBtn = buttons.find(
  (b) =>
    b.textContent?.includes("Log out") ||
    b.textContent?.includes("登出") ||
    b.textContent?.includes("Sign out")
);
if (logoutBtn) {
  logoutBtn.click();
  return "登出按钮已点击";
}

// 尝试点击用户头像进入设置
const userLink = document.querySelector('a[href*="user-setting"]');
if (userLink) {
  userLink.click();
  return "已点击用户设置链接";
}
return "未找到登出按钮";
`;

module.exports = {
  runLoginTest,
  TEST_CONFIG,
  LOGIN_FORM_FILL_SCRIPT,
  CLICK_SIGNIN_SCRIPT,
  CLICK_SIGNUP_SCRIPT,
  REGISTER_FORM_FILL_SCRIPT,
  CLICK_CONTINUE_SCRIPT,
  VERIFY_HOMEPAGE_SCRIPT,
  LOGOUT_SCRIPT,
};
