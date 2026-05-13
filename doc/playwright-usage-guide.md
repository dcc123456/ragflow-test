# Playwright + Chrome DevTools MCP 使用指南

## 📌 工具角色定位

| 工具 | 角色 | 用途 |
|------|------|------|
| **Playwright** | 🟢 **主要工具** | 导航、点击、输入、表单填写、截图等核心操作 |
| **Chrome DevTools** | 🔵 **辅助工具** | 性能监控、网络请求分析、控制台日志、详细调试 |

## 🔧 添加 Playwright MCP 到你的 MCP 配置

首先，你需要在 Trae 中添加 Playwright MCP 服务。根据系统文档，执行以下命令：

```bash
claude mcp add -s user playwright -- npx -y @modelcontextprotocol/server-playwright
```

验证安装：

```bash
claude mcp list
```

应该看到：

```
playwright: npx -y @modelcontextprotocol/server-playwright - ✓ Connected
chrome-devtools: npx -y chrome-devtools-mcp@latest - ✓ Connected
puppeteer: npx -y @modelcontextprotocol/server-puppeteer - ✓ Connected
```

## 🎮 可用的工具集

### Playwright MCP 工具（主要使用）

#### 导航操作

```javascript
// 导航到 URL
mcp__playwright__playwright_navigate({
  url: "http://localhost:9222/login"
})

// 后退/前进
mcp__playwright__playwright_go_back()
mcp__playwright__playwright_go_forward()

// 刷新页面
mcp__playwright__playwright_reload()
```

#### 元素交互

```javascript
// 点击元素
mcp__playwright__playwright_click({
  selector: "button.sign-in-btn"
})

// 输入文本
mcp__playwright__playwright_type({
  selector: "input[type='email']",
  text: "test@example.com"
})

// 填写表单字段
mcp__playwright__playwright_fill({
  selector: "input[name='password']",
  value: "mypassword"
})

// 下拉选择
mcp__playwright__playwright_select({
  selector: "select#country",
  value: "China"
})

// 悬停
mcp__playwright__playwright_hover({
  selector: ".menu-item"
})
```

#### 截图和执行

```javascript
// 截图
mcp__playwright__playwright_screenshot({
  name: "login-page",
  fullPage: true  // 可选：截取整个页面
})

// 执行 JavaScript
mcp__playwright__playwright_evaluate({
  script: "document.querySelector('input').value"
})
```

### Chrome DevTools MCP 工具（辅助使用）

#### 性能和分析

```javascript
// 获取性能指标
mcp__chrome-devtools__get_metrics()

// 获取网络请求
mcp__chrome-devtools__list_network_requests()

// 获取控制台日志
mcp__chrome-devtools__list_console_messages()

// Lighthouse 审计
mcp__chrome-devtools__lighthouse_audit({
  url: "http://localhost:9222"
})
```

#### 高级调试

```javascript
// 获取标签页列表
mcp__chrome-devtools__list_pages()

// 选择标签页
mcp__chrome-devtools__select_page({
  tabId: "tab-id-here"
})

// 执行自定义 DevTools 命令
mcp__chrome-devtools__send_command({
  command: "Network.enable"
})
```

## 📝 实际使用示例

### 场景 1: 登录流程测试

**使用 Playwright 作为主要工具：**

```javascript
// 步骤 1: 打开登录页面
await mcp__playwright__playwright_navigate({
  url: "http://localhost:9222/login"
})

// 步骤 2: 截图记录初始状态
await mcp__playwright__playwright_screenshot({
  name: "login-page-initial"
})

// 步骤 3: 填写表单
await mcp__playwright__playwright_fill({
  selector: "input[type='email']",
  value: "test@example.com"
})

await mcp__playwright__playwright_fill({
  selector: "input[type='password']",
  value: "password123"
})

// 步骤 4: 点击登录按钮
await mcp__playwright__playwright_click({
  selector: "button[type='submit']"
})

// 步骤 5: 等待导航完成
await page.waitForTimeout(3000)

// 步骤 6: 截图记录结果
await mcp__playwright__playwright_screenshot({
  name: "login-page-result"
})

// 辅助：检查控制台错误
await mcp__chrome-devtools__list_console_messages()
```

### 场景 2: Stripe 订阅测试

```javascript
// 导航到订阅页面
await mcp__playwright__playwright_navigate({
  url: "http://localhost:9222/billing"
})

// 截图记录页面
await mcp__playwright__playwright_screenshot({
  name: "billing-page"
})

// 点击订阅按钮
await mcp__playwright__playwright_click({
  selector: "button.subscribe"
})

// 填写 Stripe 表单
await mcp__playwright__playwright_fill({
  selector: "input[name='cardName']",
  value: "Test User"
})

await mcp__playwright__playwright_fill({
  selector: "input[name='cardNumber']",
  value: "4242424242424242"
})

await mcp__playwright__playwright_fill({
  selector: "input[name='expiry']",
  value: "12/26"
})

await mcp__playwright__playwright_fill({
  selector: "input[name='cvc']",
  value: "123"
})

// 提交表单
await mcp__playwright__playwright_click({
  selector: "button.submit-payment"
})

// 等待处理
await page.waitForTimeout(5000)

// 截图记录结果
await mcp__playwright__playwright_screenshot({
  name: "billing-result"
})

// 辅助：获取性能指标
await mcp__chrome-devtools__get_metrics()
```

### 场景 3: 数据集创建测试

```javascript
// 导航到数据集页面
await mcp__playwright__playwright_navigate({
  url: "http://localhost:9222/datasets"
})

// 点击添加数据集按钮
await mcp__playwright__playwright_click({
  selector: "button.add-dataset"
})

// 输入数据集名称
await mcp__playwright__playwright_type({
  selector: "input.dataset-name",
  text: "Test Dataset"
})

// 截图记录
await mcp__playwright__playwright_screenshot({
  name: "dataset-created"
})

// 辅助：分析网络请求
const requests = await mcp__chrome-devtools__list_network_requests()
const datasetUploads = requests.filter(r => 
  r.url.includes('/api/datasets')
)
```

## 🐛 调试技巧

### 1. 使用 Chrome DevTools 获取元素选择器

```javascript
// 使用 Chrome DevTools 获取页面快照，找到元素选择器
const snapshot = await mcp__chrome-devtools__take_snapshot()

// 或者截图快速查看
await mcp__chrome-devtools__take_screenshot({
  name: "debug-screenshot"
})
```

### 2. 监听控制台错误

```javascript
// 在关键操作前后检查控制台
await mcp__chrome-devtools__list_console_messages()

// 执行测试操作
await mcp__playwright__playwright_click({
  selector: "button.submit"
})

// 再次检查是否有新错误
await mcp__chrome-devtools__list_console_messages()
```

### 3. 分析网络请求

```javascript
// 获取所有网络请求
const requests = await mcp__chrome-devtools__list_network_requests()

// 查找失败的请求
const failedRequests = requests.filter(r => r.status >= 400)

// 查找特定的 API 调用
const apiCalls = requests.filter(r => r.url.includes('/api/'))
```

## ⚡ 最佳实践

### ✅ 应该做的

1. **优先使用 Playwright 工具**
   - 导航、点击、输入等核心操作使用 Playwright
   - Playwright 专门为浏览器自动化设计，API 更友好

2. **使用 Chrome DevTools 进行诊断**
   - 性能问题分析
   - 控制台错误检查
   - 网络请求分析

3. **每个关键步骤都截图**
   ```javascript
   await mcp__playwright__playwright_screenshot({
     name: "step-1-initial"
   })
   ```

4. **使用 page.waitForTimeout() 处理动态内容**
   ```javascript
   await page.waitForTimeout(2000) // 等待 2 秒
   ```

### ❌ 避免做的

1. **不要用 Chrome DevTools 做主要导航**
   - chrome-devtools 适合分析和调试
   - Playwright 更适合自动化操作流程

2. **不要忽略控制台错误**
   ```javascript
   // 定期检查
   const errors = await mcp__chrome-devtools__list_console_messages()
   if (errors.length > 0) {
     console.log('发现控制台错误:', errors)
   }
   ```

3. **不要硬编码选择器**
   - 使用更稳定的选择器（data-testid, aria-label）
   - 避免依赖 HTML 结构的选择器

## 🔄 从项目现有脚本迁移

项目现有的测试脚本使用 Playwright 的 Node.js API，你可以将其转换为 MCP 工具调用：

### 原有方式（Node.js）

```javascript
const { chromium } = require("playwright");

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:9222/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.click('button[type="submit"]');
  
  await page.screenshot({ path: 'result.png' });
  
  await browser.close();
}
```

### MCP 工具方式（推荐用于 Agent）

```javascript
// 导航
await mcp__playwright__playwright_navigate({
  url: "http://localhost:9222/login"
})

// 填写
await mcp__playwright__playwright_fill({
  selector: "input[type='email']",
  value: "test@example.com"
})

// 点击
await mcp__playwright__playwright_click({
  selector: "button[type='submit']"
})

// 截图
await mcp__playwright__playwright_screenshot({
  name: "result"
})
```

## 📚 相关资源

- **Playwright 官方文档**: https://playwright.dev/
- **Chrome DevTools Protocol**: https://chromedevtools.github.io/devtools-protocol/
- **项目测试脚本**: `./test-script/*.playwright.js`
- **Agent 配置**: `.claude/agents/web-test-agent.md`

## 🆘 常见问题

### Q: Playwright MCP 和项目中的 Playwright npm 包有什么区别？

**A:**
- **npm 包** (`playwright`): 用于编写和运行独立的测试脚本（Node.js）
- **MCP 服务** (`@modelcontextprotocol/server-playwright`): 为 AI Agent 提供浏览器自动化工具

两者都使用 Playwright，但用途不同：
- npm 包：运行预先编写的测试脚本
- MCP：让 AI Agent 动态控制浏览器

### Q: Chrome DevTools MCP 和 Puppeteer MCP 有什么区别？

**A:**
- **Chrome DevTools**: 提供 DevTools Protocol 的底层访问，适合性能分析和调试
- **Puppeteer**: 提供更高级的浏览器控制 API，类似 Playwright

**推荐**: 使用 Playwright MCP 作为主要工具，因为它更现代、API 更友好。

### Q: 如何调试选择器不工作的问题？

**A:**
1. 使用 Chrome DevTools 获取页面快照
   ```javascript
   const snapshot = await mcp__chrome-devtools__take_snapshot()
   ```

2. 截图查看实际页面
   ```javascript
   await mcp__playwright__playwright_screenshot({ name: "debug" })
   ```

3. 使用 JavaScript 评估查找元素
   ```javascript
   await mcp__playwright__playwright_evaluate({
     script: "document.querySelectorAll('button').map(b => b.textContent)"
   })
   ```

---

**记住**: Playwright 是你的主要工具，Chrome DevTools 是你的调试利器！🚀
