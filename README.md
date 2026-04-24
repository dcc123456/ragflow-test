# RagFlow UI 自动化测试

基于 Playwright 的 RagFlow Web UI 自动化测试框架，支持登录、LLM 模型添加、订阅计费等功能的端到端测试。

## 功能特性

- **多浏览器支持**：基于 Playwright，支持 Chrome/Chromium 自动化
- **MCP 工具集成**：支持通过 Chrome DevTools Protocol 和 Puppeteer MCP 工具执行测试
- **测试任务管理**：支持按任务名选择性执行测试（login / add-llm / billing）
- **截图与日志**：自动保存测试截图、执行日志和测试报告
- **飞书通知**：测试开始/结束/失败时自动发送飞书机器人通知
- **任务依赖处理**：自动分析任务依赖（如 add-llm 依赖 login）

## 项目结构

```
ragflow-test/
├── main/
│   ├── index.md      # 测试流程主文档
│   └── config.md     # 测试配置（账号、URL、API Key 等）
├── task/             # 测试任务定义（.md 格式）
│   ├── login.md      # 登录测试
│   ├── add-llm.md    # 添加 LLM 模型测试
│   └── billing.md    # 订阅计费测试
├── test-script/      # 自动化脚本
│   ├── login-test.playwright.js
│   ├── add-llm-test.playwright.js
│   └── billing-test.playwright.js
├── scripts/
│   ├── run-tests.js  # 测试执行入口
│   └── send-feishu.js # 飞书通知脚本
├── screenshots/      # 测试截图输出
├── test-results/     # 测试日志输出
└── test-reports/     # 测试报告输出
```

## 环境要求

- Node.js >= 16
- npm
- Chromium / Chrome 浏览器
- 飞书 Webhook URL（可选，用于通知）

## 安装

```bash
npm install
```

## 配置

编辑 `main/config.md` 或设置环境变量：

| 配置项 | 环境变量 | 说明 | 默认值 |
|--------|---------|------|--------|
| 测试 URL | `TEST_URL` | RagFlow 服务地址 | http://localhost:9222 |
| 用户名 | `TEST_USERNAME` | 测试账号邮箱 | test1@gmail.com |
| 密码 | `TEST_PASSWORD` | 测试账号密码 | 123456 |
| SILICONFLOW API Key | `SILICONFLOW_API_KEY` | 添加 LLM 用 | - |
| 飞书 Webhook | `FEISHU_WEBHOOK` | 通知地址 | - |
| Headless 模式 | `HEADLESS` | 无头运行 | false |

## 启动测试

### 方式一：使用测试脚本（推荐）

运行所有测试：
```bash
node scripts/run-tests.js
```

运行指定任务：
```bash
node scripts/run-tests.js --tasks login,add-llm
```

指定测试 URL：
```bash
node scripts/run-tests.js --url http://192.168.1.23:9222
```

无头模式运行：
```bash
node scripts/run-tests.js --headless
```

### 方式二：使用 MCP 工具

通过 Claude Code 的 MCP 工具（如 `web-test-agent`、`chrome-devtools`）执行测试。参考 `doc/mcp-web-testing-setup/SKILL.md`。

## 测试任务

| 任务 | 说明 | 依赖 |
|------|------|------|
| `login` | 登录功能测试 | - |
| `add-llm` | 添加 SILICONFLOW LLM 模型提供商 | login |
| `billing` | 订阅/计费页面测试 | login |

## 测试输出

- **截图**：`screenshots/{任务名}-{时间戳}/`
- **日志**：`test-results/{任务名}-{时间戳}.log`
- **报告**：`test-reports/test-summary-{时间戳}.md`

## 飞书通知

配置 `FEISHU_WEBHOOK` 环境变量后，测试会自动发送通知：

- 测试开始
- 单个任务完成（通过/失败）
- 全部测试完成

## 添加新测试

1. 在 `task/` 目录创建 `{name}.md` 测试用例文件
2. 在 `test-script/` 目录创建对应的 Playwright 脚本
3. 在 `scripts/run-tests.js` 的 `runTest` 函数中添加任务处理逻辑
