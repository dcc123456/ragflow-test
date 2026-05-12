# 配置重构规范

## Why
项目中存在大量硬编码的敏感信息（账号、密码、API Key）和绝对路径，存在安全风险且不便于不同环境配置。需要将所有敏感配置集中到 `.env` 文件中，并使用相对路径替代绝对路径。

## What Changes

### 1. 创建统一的 `.env` 配置文件
- 将所有测试账号、密码、API Key 等敏感信息迁移到 `.env` 文件
- 为每个配置项添加清晰的用途说明
- 支持不同环境（开发、测试）的配置切换

### 2. 将硬编码凭证迁移到环境变量
需要迁移的敏感信息：

| 文件 | 配置项 | 用途 |
|------|--------|------|
| login-test.playwright.js | TEST_EMAIL | 登录测试账号 |
| login-test.playwright.js | TEST_PASSWORD | 登录密码 |
| add-llm-test.playwright.js | TEST_EMAIL | LLM配置账号 |
| add-llm-test.playwright.js | TEST_PASSWORD | LLM配置密码 |
| add-llm-test.playwright.js | TEST_API_KEY | SILICONFLOW API Key |
| add-llm-test.playwright.js | LLM_MODEL | 默认LLM模型 |
| add-llm-test.playwright.js | EMBEDDING_MODEL | 默认Embedding模型 |
| billing-test.playwright.js | TEST_URL | Billing测试环境URL |
| billing-test.playwright.js | BILLING_EMAIL | Billing测试账号 |
| billing-test.playwright.js | BILLING_PASSWORD | Billing测试密码 |
| billing-test.playwright.js | TEST_CARD_NAME | Stripe测试卡姓名 |
| billing-test.playwright.js | TEST_CARD_NUMBER | Stripe测试卡号 |
| billing-test.playwright.js | TEST_CARD_EXPIRY | Stripe测试卡有效期 |
| billing-test.playwright.js | TEST_CARD_CVC | Stripe测试卡CVC |
| billing-test.playwright.js | TEST_CARD_ZIP | Stripe测试卡邮编 |

### 3. 检查并修复绝对路径
- 检查 `scripts/run-tests.js` 中的路径引用
- 确保所有路径使用 `path.join(__dirname, '..', '相对路径')` 方式
- 截图路径、日志路径统一使用相对路径

## Impact

### 受影响的文件
- `.env` - 新建配置文件
- `test-script/login-test.playwright.js` - 迁移到环境变量
- `test-script/add-llm-test.playwright.js` - 迁移到环境变量
- `test-script/billing-test.playwright.js` - 迁移到环境变量
- `scripts/run-tests.js` - 路径检查和优化

### 安全性提升
- API Key 和密码不再硬编码在代码中
- 支持多环境配置切换
- 便于团队协作（共享模板，各自配置敏感信息）

## ADDED Requirements

### Requirement: .env 配置文件
系统 SHALL 提供 `.env` 配置文件，包含所有测试敏感信息

#### Scenario: 开发环境配置
- **WHEN** 开发者在本地运行测试
- **THEN** 从 `.env` 文件读取测试账号和 API Key

#### Scenario: CI/CD 环境配置
- **WHEN** 在 CI/CD 环境中运行测试
- **THEN** 从环境变量读取配置（优先级高于 .env 文件）

### Requirement: 相对路径支持
系统 SHALL 使用相对路径而非绝对路径

#### Scenario: 跨机器运行
- **WHEN** 测试脚本在不同机器上运行
- **THEN** 使用相对于项目根目录的路径

## MODIFIED Requirements

### Requirement: 测试配置
原有的硬编码配置需要修改为从环境变量读取

| 配置项 | 原值 | 改为 |
|--------|------|------|
| TEST_EMAIL | test4@qq.com | process.env.TEST_EMAIL |
| TEST_PASSWORD | 123456 | process.env.TEST_PASSWORD |
| TEST_API_KEY | sk-mictt... | process.env.TEST_API_KEY |
| TEST_URL | http://192.168.1.23:9223 | process.env.TEST_URL |
