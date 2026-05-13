# 📚 Playwright + Chrome DevTools MCP 文档索引

> 本项目配置了 Playwright MCP 和 Chrome DevTools MCP，用于浏览器自动化测试和调试。

## 🚀 快速开始

### 1. 验证 MCP 配置

```bash
claude mcp list
```

确保看到：
- ✅ `playwright` - Connected
- ✅ `chrome-devtools` - Connected

### 2. 如果未安装 Playwright MCP

```bash
claude mcp add -s user playwright -- npx -y @modelcontextprotocol/server-playwright
```

## 📖 文档指南

### 新手入门

| 文档 | 内容 | 适合对象 |
|------|------|----------|
| **[playwright-quick-ref.md](./playwright-quick-ref.md)** | Playwright MCP 快速参考卡片 | 所有用户 |
| **[playwright-usage-guide.md](./playwright-usage-guide.md)** | 完整使用指南和最佳实践 | 开发者 |

### 专项测试指南

| 文档 | 内容 | 测试场景 |
|------|------|----------|
| **[billing-mcp-guide.md](./billing-mcp-guide.md)** | Stripe Billing 订阅测试 | 订阅/支付流程 |
| **test-script/\*.playwright.js** | 自动化测试脚本 | 回归测试 |

## 🎯 工具角色

### Playwright MCP（🟢 主要工具）

用于所有浏览器自动化操作：

- ✅ 页面导航和交互
- ✅ 表单填写和提交
- ✅ 元素点击和悬停
- ✅ 截图和视觉验证
- ✅ JavaScript 执行

### Chrome DevTools MCP（🔵 辅助工具）

用于调试和诊断：

- ✅ 性能指标分析
- ✅ 网络请求监控
- ✅ 控制台日志检查
- ✅ 页面快照获取
- ✅ 高级调试功能

## 💡 典型使用场景

### 场景 1: 快速浏览器交互

使用 Playwright MCP 进行简单的浏览器操作：

```
1. mcp__playwright__playwright_navigate → 打开页面
2. mcp__playwright__playwright_fill → 填写表单
3. mcp__playwright__playwright_click → 点击按钮
4. mcp__playwright__playwright_screenshot → 截图记录
```

### 场景 2: 调试和诊断

结合 Chrome DevTools MCP 进行深度调试：

```
1. Playwright 打开页面并操作
2. mcp__chrome-devtools__list_console_messages → 检查错误
3. mcp__chrome-devtools__list_network_requests → 分析网络
4. mcp__chrome-devtools__get_metrics → 获取性能数据
```

### 场景 3: 完整测试流程

结合两者进行端到端测试：

```
1. Playwright: 导航到登录页
2. Playwright: 填写并提交表单
3. Chrome DevTools: 检查控制台错误
4. Playwright: 验证登录成功
5. Playwright: 导航到目标功能页
6. Chrome DevTools: 分析网络请求
7. Playwright: 执行功能操作
8. Playwright: 截图记录结果
```

## 🔧 项目测试脚本

### 运行现有测试

```bash
# 单个测试
node -r dotenv/config test-script/login-test.playwright.js

# 多个测试
node scripts/run-tests.js --tasks login,billing

# 所有测试
node scripts/run-tests.js --all
```

### 测试脚本列表

- `test-script/login-test.playwright.js` - 登录/注册流程
- `test-script/billing-test.playwright.js` - Stripe 订阅流程
- `test-script/add-dataset-test.playwright.js` - 添加数据集
- `test-script/add-llm-test.playwright.js` - 添加 LLM 提供商

## 📁 项目目录结构

```
ragflow-test/
├── doc/                          # 文档目录
│   ├── README.md                 # 本索引文档
│   ├── playwright-usage-guide.md # 完整使用指南
│   ├── playwright-quick-ref.md   # 快速参考
│   ├── billing-mcp-guide.md      # Billing 测试指南
│   ├── mcp-web-testing-setup/   # MCP 配置指南
│   │   └── SKILL.md
│   └── ...
├── test-script/                  # Playwright 测试脚本
│   ├── login-test.playwright.js
│   ├── billing-test.playwright.js
│   ├── add-dataset-test.playwright.js
│   ├── add-llm-test.playwright.js
│   └── utils/
│       └── login-helper.js
├── scripts/
│   ├── run-tests.js             # 测试运行器
│   └── send-feishu.js           # 飞书通知
├── task/                         # 测试用例定义
│   ├── billing.md
│   ├── login.md
│   ├── add-dataset.md
│   └── add-llm.md
└── .claude/                      # Agent 配置
    ├── agents/
    │   └── web-test-agent.md     # Web 测试 Agent
    ├── skills/
    │   └── feishu-webhook/
    │       └── SKILL.md
    └── rule.md
```

## 🆘 常见问题

### Q: Playwright MCP 和 Chrome DevTools MCP 的区别？

**A:**
- **Playwright MCP**: 专为浏览器自动化设计，API 友好，适合执行测试步骤
- **Chrome DevTools MCP**: 提供底层浏览器协议访问，适合调试和分析

**推荐**: 主要使用 Playwright，需要诊断时使用 Chrome DevTools。

### Q: 如何调试选择器不工作？

**A:**
1. 使用 Chrome DevTools 获取页面快照
2. 使用 Playwright 截图查看实际页面
3. 使用 JavaScript 评估查找元素

详见 [playwright-usage-guide.md](./playwright-usage-guide.md) 的调试部分。

### Q: Stripe/iframe 内元素无法操作？

**A:**
这是常见挑战。解决方案：
1. 使用 JavaScript 注入
2. 使用 Stripe 的测试模式
3. 考虑后端 API 集成

详见 [billing-mcp-guide.md](./billing-mcp-guide.md) 的 Stripe 测试注意事项。

## 📚 外部资源

- [Playwright 官方文档](https://playwright.dev/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Stripe 测试指南](https://stripe.com/docs/testing)

## 🔄 更新日志

- **2024**: 初始配置
- 添加 Playwright MCP 支持
- 添加 Chrome DevTools MCP 支持
- 创建测试脚本和文档

---

**提示**: 从 [playwright-quick-ref.md](./playwright-quick-ref.md) 开始，快速掌握常用操作！
