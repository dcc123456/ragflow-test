# Checklist

## 环境配置

- [x] `.env.example` 文件已创建，包含所有配置项及说明
- [x] `.env` 文件已添加到 .gitignore
- [x] `dotenv` 依赖已添加到 package.json

## login-test.playwright.js 修改验证

- [x] `TEST_EMAIL` 从环境变量读取
- [x] `TEST_PASSWORD` 从环境变量读取
- [x] 保留合理的默认值
- [x] 文件头部注释已更新

## add-llm-test.playwright.js 修改验证

- [x] `TEST_EMAIL` 从环境变量读取
- [x] `TEST_PASSWORD` 从环境变量读取
- [x] `TEST_API_KEY` 从环境变量读取
- [x] `LLM_MODEL` 从环境变量读取
- [x] `EMBEDDING_MODEL` 从环境变量读取
- [x] 文件头部注释已更新

## billing-test.playwright.js 修改验证

- [x] `TEST_URL` / `BILLING_URL` 从环境变量读取
- [x] `BILLING_EMAIL` 从环境变量读取
- [x] `BILLING_PASSWORD` 从环境变量读取
- [x] `TEST_CARD_NAME` 从环境变量读取
- [x] `TEST_CARD_NUMBER` 从环境变量读取
- [x] `TEST_CARD_EXPIRY` 从环境变量读取
- [x] `TEST_CARD_CVC` 从环境变量读取
- [x] `TEST_CARD_ZIP` 从环境变量读取
- [x] 文件头部注释已更新

## scripts/run-tests.js 修改验证

- [x] 所有路径使用相对路径
- [x] 无硬编码的绝对路径
- [x] 截图目录配置正确
- [x] 日志目录配置正确

## 代码质量

- [x] 无硬编码的敏感信息残留
- [x] 所有凭证使用环境变量或 .env 配置
- [x] 代码风格一致
- [x] 注释清晰完整

## 测试验证

- [x] dotenv 能正常加载
- [x] 测试脚本能正确读取配置
- [x] 相对路径正常工作
- [x] 默认值在环境变量缺失时生效
