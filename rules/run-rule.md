## 执行流程规则

#### 串行执行

```
for each 任务 in 选中任务列表:
    1. 等待上一个任务完成（如有）
    2. 执行任务前检查
    3. 使用 web-test-agent 执行任务
    4. 截图保存
    5. 记录日志
    6. 通知进度/完成
    7. 执行环境清理（如需要）
    8. 汇总结果
```

#### 并行执行

```
for each 任务 in 选中任务列表:
    启动独立线程执行:
        1. 使用独立的浏览器实例
        2. 执行任务
        3. 截图保存
        4. 记录日志
等待所有线程完成
汇总结果
```

#### 任务执行测试前判断

- 如果 `test-script/{任务名}-test.playwright.js` 脚本文件存在，则执行该脚本
- 如果脚本执行全部成功，则跳过当前任务测试用例的测试步骤
- 否则执行对应任务的测试用例的测试步骤

### 测试步骤记录

#### 目的

**边测边写脚本**，生成的脚本本身即为步骤记录。后续执行脚本即可自动测试，无需大模型介入。

#### 执行阶段

**阶段一：创建测试脚本**

- 创建/清空 `test-script-temp/{任务名}-test.playwright.js`
- 脚本文件结构：
  ```javascript
  const { chromium } = require("playwright");
  const TEST_CONFIG = {
    baseUrl: process.env.TEST_URL || "http://localhost:9222",
    email: process.env.TEST_EMAIL || "dcc-test1@gmail.com",
    password: process.env.TEST_PASSWORD || "123456",
    timeout: 30000,
  };

  async function runTest() {
    // 浏览器初始化...
    // 每个步骤的 playwright 代码...
  }

  module.exports = { runTest };
  ```

**阶段二：边测边写（核心）**

每完成一个操作，**立即将对应的 playwright 代码写入脚本文件**，包括：

| 操作 | 写入内容 |
|------|----------|
| 导航到页面 | `await page.goto(...)` |
| 点击元素 | `await page.click('selector')` |
| 填写表单 | `await page.fill('selector', 'value')` |
| 上传文件 | `await page.setInputFiles('input[type=file]', 'path')` |
| 等待加载 | `await page.waitForLoadState('networkidle')` |
| 截图 | `await page.screenshot({ path: '...' })` |
| 断言验证 | `const result = await page.evaluate(...)` |

**禁止**：测完再补脚本、跳过任何步骤、只记录日志不写代码

**阶段三：脚本验证**

1. 运行 `test-script-temp/{任务名}-test.playwright.js`
2. 脚本执行成功（exit code = 0）→ 移动到 `test-script/` 目录
3. 脚本执行失败 → 定位问题、修改脚本、重新运行

#### 脚本即记录

脚本文件 `test-script-temp/{任务名}-test.playwright.js` 是唯一的步骤记录，无需额外日志。每个步骤用代码如实记录，可追溯可重放。

### 资源限制配置

| 资源     | 限制值 | 超过处理           |
| -------- | ------ | ------------------ |
| 单步超时 | 30秒   | 重试或标记失败     |
| 任务超时 | 5分钟  | 强制终止并标记失败 |
| 重试次数 | 3次    | 超过则标记失败     |
| 并行数   | 3个    | 超过则排队等待     |

### 错误恢复

| 错误类型       | 处理方式           | 重试策略             |
| -------------- | ------------------ | -------------------- |
| 页面元素未找到 | 标记可疑元素，重试 | 重试3次，间隔2秒     |
| 网络超时       | 检查网络，重试     | 重试2次，间隔5秒     |
| 浏览器崩溃     | 重启浏览器实例     | 重试1次，仍失败终止  |
| API响应错误    | 记录错误码，重试   | 重试2次，间隔3秒     |
| 断言失败       | 截取当前状态       | 不重试，直接标记失败 |
