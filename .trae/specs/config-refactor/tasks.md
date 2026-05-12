# Tasks

## 任务 1: 创建 .env 配置文件模板

- [x] 创建 `.env.example` 文件作为配置模板
  - 包含所有需要的环境变量
  - 添加清晰的注释说明每个变量的用途
  - 使用占位符替代真实值

## 任务 2: 修改 login-test.playwright.js

- [x] 将硬编码的邮箱 `test4@qq.com` 改为 `process.env.TEST_EMAIL`
- [x] 将硬编码的密码 `123456` 改为 `process.env.TEST_PASSWORD`
- [x] 添加 .env 加载逻辑（使用 dotenv）
- [x] 添加环境变量读取失败时的友好提示
- [x] 更新文件头部的注释说明

## 任务 3: 修改 add-llm-test.playwright.js

- [x] 将硬编码的邮箱 `dcc-test1@gmail.com` 改为 `process.env.TEST_EMAIL`
- [x] 将硬编码的密码 `123456` 改为 `process.env.TEST_PASSWORD`
- [x] 将硬编码的 API Key 改为 `process.env.TEST_API_KEY`
- [x] 将硬编码的 LLM 模型名改为 `process.env.LLM_MODEL`
- [x] 将硬编码的 Embedding 模型名改为 `process.env.EMBEDDING_MODEL`
- [x] 添加 .env 加载逻辑
- [x] 添加默认值说明

## 任务 4: 修改 billing-test.playwright.js

- [x] 将硬编码的 URL `http://192.168.1.23:9223` 改为 `process.env.TEST_URL || process.env.BILLING_URL`
- [x] 将硬编码的邮箱 `yuzhichang@gmail.com` 改为 `process.env.BILLING_EMAIL`
- [x] 将硬编码的密码 `123456` 改为 `process.env.BILLING_PASSWORD`
- [x] 将硬编码的持卡人姓名 `yuzhichang` 改为 `process.env.TEST_CARD_NAME`
- [x] 将硬编码的卡号 `4242424242424242` 改为 `process.env.TEST_CARD_NUMBER`
- [x] 将硬编码的卡有效期 `12/26` 改为 `process.env.TEST_CARD_EXPIRY`
- [x] 将硬编码的 CVC `123` 改为 `process.env.TEST_CARD_CVC`
- [x] 将硬编码的邮编 `12345` 改为 `process.env.TEST_CARD_ZIP`
- [x] 添加 .env 加载逻辑
- [x] 添加 Stripe 测试卡说明

## 任务 5: 修改 scripts/run-tests.js

- [x] 检查并优化路径引用
- [x] 确保所有路径使用相对路径
- [x] 验证截图和日志目录配置

## 任务 6: 更新 .gitignore

- [x] 添加 `.env` 到 .gitignore（防止提交敏感信息）
- [x] 确保 `.env.example` 保留在版本控制中

## 任务 7: 验证配置

- [x] 运行 `npm install dotenv` 安装依赖
- [x] 验证各测试脚本能正确读取环境变量
- [x] 验证相对路径正常工作

# Task Dependencies

- [任务 2] 依赖于 [任务 1]
- [任务 3] 依赖于 [任务 1]
- [任务 4] 依赖于 [任务 1]
- [任务 7] 依赖于 [任务 1, 任务 2, 任务 3, 任务 4, 任务 5, 任务 6]
