# 🚀 Playwright MCP 快速参考

## ⚡ 快速开始

### 1. 验证 MCP 服务

```bash
claude mcp list
```

确认看到：
- ✅ `playwright` - Connected
- ✅ `chrome-devtools` - Connected

### 2. 如果 Playwright MCP 未安装

```bash
claude mcp add -s user playwright -- npx -y @modelcontextprotocol/server-playwright
```

## 🎯 常用操作速查表

### 导航 & 页面控制

| 操作 | MCP 工具 | 示例 |
|------|----------|------|
| 打开页面 | `mcp__playwright__playwright_navigate` | `{url: "http://localhost:9222/login"}` |
| 后退 | `mcp__playwright__playwright_go_back` | `{}` |
| 前进 | `mcp__playwright__playwright_go_forward` | `{}` |
| 刷新 | `mcp__playwright__playwright_reload` | `{}` |

### 元素交互

| 操作 | MCP 工具 | 示例 |
|------|----------|------|
| 点击 | `mcp__playwright__playwright_click` | `{selector: "button.submit"}` |
| 输入 | `mcp__playwright__playwright_type` | `{selector: "input", text: "hello"}` |
| 填写 | `mcp__playwright__playwright_fill` | `{selector: "input", value: "test@example.com"}` |
| 选择 | `mcp__playwright__playwright_select` | `{selector: "select", value: "option1"}` |
| 悬停 | `mcp__playwright__playwright_hover` | `{selector: ".menu-item"}` |

### 截图 & 调试

| 操作 | MCP 工具 | 示例 |
|------|----------|------|
| 截图 | `mcp__playwright__playwright_screenshot` | `{name: "result", fullPage: true}` |
| 执行JS | `mcp__playwright__playwright_evaluate` | `{script: "document.title"}` |

### Chrome DevTools 辅助工具

| 操作 | MCP 工具 | 用途 |
|------|----------|------|
| 性能指标 | `mcp__chrome-devtools__get_metrics` | 获取页面性能数据 |
| 网络请求 | `mcp__chrome-devtools__list_network_requests` | 分析 API 调用 |
| 控制台日志 | `mcp__chrome-devtools__list_console_messages` | 检查 JS 错误 |
| 页面快照 | `mcp__chrome-devtools__take_snapshot` | 获取 DOM 结构 |

## 💡 典型工作流

### 场景 1: 登录并验证

```
1. mcp__playwright__playwright_navigate → 打开登录页
2. mcp__playwright__playwright_screenshot → 记录初始状态
3. mcp__playwright__playwright_fill → 填写邮箱
4. mcp__playwright__playwright_fill → 填写密码
5. mcp__playwright__playwright_click → 点击登录
6. page.waitForTimeout(3000) → 等待加载
7. mcp__playwright__playwright_screenshot → 记录结果
8. mcp__chrome-devtools__list_console_messages → 检查错误
```

### 场景 2: 表单提交测试

```
1. mcp__playwright__playwright_navigate → 打开表单页
2. mcp__playwright__playwright_fill → 填写字段1
3. mcp__playwright__playwright_fill → 填写字段2
4. mcp__playwright__playwright_click → 提交表单
5. mcp__chrome-devtools__list_network_requests → 验证 API 调用
6. mcp__playwright__playwright_screenshot → 记录结果
```

### 场景 3: Stripe 订阅测试

```
1. mcp__playwright__playwright_navigate → 打开订阅页
2. mcp__playwright__playwright_screenshot → 记录页面
3. mcp__playwright__playwright_click → 选择套餐
4. mcp__playwright__playwright_fill → 填写卡号
5. mcp__playwright__playwright_fill → 填写有效期
6. mcp__playwright__playwright_fill → 填写 CVC
7. mcp__playwright__playwright_click → 提交支付
8. page.waitForTimeout(5000) → 等待支付处理
9. mcp__playwright__playwright_screenshot → 记录结果
10. mcp__chrome-devtools__get_metrics → 验证性能
```

## 🔍 调试技巧

### 获取元素信息

```javascript
// 方法 1: 执行 JavaScript
await mcp__playwright__playwright_evaluate({
  script: "JSON.stringify({title: document.title, forms: document.forms.length, buttons: document.querySelectorAll('button').length})"
})

// 方法 2: 使用 Chrome DevTools 获取快照
await mcp__chrome-devtools__take_snapshot()
```

### 检查控制台错误

```javascript
// 在操作前后检查
await mcp__chrome-devtools__list_console_messages()

// 执行操作...

await mcp__chrome-devtools__list_console_messages()
```

### 分析网络请求

```javascript
// 获取所有网络请求
const requests = await mcp__chrome-devtools__list_network_requests()

// 查找失败的请求
const failed = requests.filter(r => r.status >= 400)

// 查找特定 API
const apiCalls = requests.filter(r => r.url.includes('/api/'))
```

## 📋 选择器最佳实践

### ✅ 推荐的选择器

```javascript
// 1. ID（最稳定）
{selector: "#user-email"}

// 2. data-testid（测试专用）
{selector: "[data-testid='submit-btn']"}

// 3. 语义化属性
{selector: "button[type='submit']"}
{selector: "input[placeholder='Email']"}

// 4. 文本内容
{selector: "text=Submit"}
{selector: "text=Sign in"}
```

### ❌ 避免的选择器

```javascript
// 脆弱的 CSS 路径
{selector: "div > div > div > button"}

// 依赖样式的选择器
{selector: ".btn-primary"}
{selector: "[class*='blue']"}

// 位置选择器（不推荐）
{selector: "button:nth-child(3)"}
```

## ⚠️ 常见问题

### Q: 点击没反应？

```javascript
// 尝试 1: 添加延迟
await page.waitForTimeout(1000)
await mcp__playwright__playwright_click({selector: "button"})

// 尝试 2: 使用 JavaScript 点击
await mcp__playwright__playwright_evaluate({
  script: "document.querySelector('button').click()"
})

// 尝试 3: 使用回车键
await mcp__playwright__playwright_press_key({
  selector: "input",
  key: "Enter"
})
```

### Q: 输入框无法输入？

```javascript
// 对于 React 等框架，可能需要使用 JavaScript 设置值
await mcp__playwright__playwright_evaluate({
  script: `
    const input = document.querySelector('input');
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(input, 'your-value');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  `
})
```

### Q: 页面加载慢？

```javascript
// 增加等待时间
await page.waitForTimeout(5000)

// 或者等待网络空闲
await mcp__playwright__playwright_navigate({
  url: "...",
  waitUntil: "networkidle"  // 或 "load", "domcontentloaded"
})
```

## 📝 测试脚本模板

### 基本模板

```javascript
/**
 * Playwright MCP 测试脚本
 */

async function runTest() {
  try {
    // 1. 打开页面
    await mcp__playwright__playwright_navigate({
      url: "http://localhost:9222/login"
    })
    
    // 2. 截图记录
    await mcp__playwright__playwright_screenshot({
      name: "01-login-page"
    })
    
    // 3. 填写表单
    await mcp__playwright__playwright_fill({
      selector: "input[type='email']",
      value: "test@example.com"
    })
    
    await mcp__playwright__playwright_fill({
      selector: "input[type='password']",
      value: "password123"
    })
    
    // 4. 点击提交
    await mcp__playwright__playwright_click({
      selector: "button[type='submit']"
    })
    
    // 5. 等待响应
    await page.waitForTimeout(3000)
    
    // 6. 截图结果
    await mcp__playwright__playwright_screenshot({
      name: "02-result"
    })
    
    // 7. 检查错误
    const errors = await mcp__chrome-devtools__list_console_messages()
    console.log('控制台错误:', errors)
    
  } catch (error) {
    console.error('测试失败:', error.message)
    await mcp__playwright__playwright_screenshot({
      name: "error"
    })
  }
}
```

## 🎓 项目专用示例

### 运行现有测试

```bash
# 运行单个测试
node -r dotenv/config test-script/login-test.playwright.js

# 运行多个测试
node scripts/run-tests.js --tasks login,billing --url http://localhost:9222

# 运行所有测试
node scripts/run-tests.js --all
```

### 使用环境变量

```bash
# 创建 .env 文件
cp .env.example .env

# 编辑 .env 配置测试参数
# TEST_URL=http://localhost:9222
# TEST_EMAIL=your-email@example.com
# TEST_PASSWORD=your-password

# 运行测试
node -r dotenv/config test-script/billing-test.playwright.js
```

---

**记住**: Playwright 是你的主要武器，Chrome DevTools 是你的调试助手！🎯
