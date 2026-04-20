# GitHub CI/CD 配置说明

## 前提条件

1. 项目已推送到 GitHub
2. 拥有 GitHub 仓库的管理权限

## 配置步骤

### 1. 配置 GitHub Secrets

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加：

| Secret 名称 | 必填 | 说明 | 示例值 |
|-------------|------|------|--------|
| `TEST_URL` | 是 | 测试环境的 URL | `http://192.168.1.23:9222/` |
| `FEISHU_WEBHOOK` | 否 | 飞书 Webhook 地址 | `https://open.feishu.cn/open-apis/bot/v2/hook/xxx` |
| `SILICONFLOW_API_KEY` | 否 | SILICONFLOW 模型 API Key | `sk-micttjpgbylrnravzhocmdwdxwhjydmhwrnmoxlkqrqjkavv` |
| `OPENAI_API_KEY` | 否 | OpenAI API Key | `sk-xxxxxx` |
| `TEST_USERNAME` | 否 | 测试账号用户名 | `test1@gmail.com` |
| `TEST_PASSWORD` | 否 | 测试账号密码 | `123456` |

### 2. 启用 GitHub Actions

Workflow 文件已创建在 `.github/workflows/ui-test.yml`，首次推送后会自动检测并启用。

也可以手动启用：
1. 进入 GitHub 仓库
2. 点击 Actions 标签
3. 选择 "UI Automated Test" workflow
4. 点击 "Enable workflow"

## 触发方式

### 自动触发

| 事件 | 条件 | 说明 |
|------|------|------|
| Push | main 分支 | 代码推送时自动执行 |
| Pull Request | 合并到 main | PR 合并前验证 |
| 手动触发 | 任意条件 | GitHub Actions 页面操作 |

### 手动触发

1. 进入 GitHub 仓库 → Actions 标签
2. 选择 "UI Automated Test"
3. 点击 "Run workflow"
4. 填写参数：
   - **test_tasks**: 测试任务，逗号分隔，如 `billing,login,add-llm`，留空则执行全部
   - **test_url**: 测试 URL，如 `http://192.168.1.23:9222/`

## CI 环境说明

### 限制

| 项目 | 说明 |
|------|------|
| 浏览器 | Headless Chromium（无头模式） |
| 无 GUI | 无法测试需要鼠标悬停等交互 |
| 网络 | 需要测试环境可从 GitHub Actions 网络访问 |
| 显示 | 无显示器，需使用 `headless` 模式 |

### 解决方案

如果测试环境无法从公网访问，考虑：

1. **使用 GitHub Self-hosted Runners**
   - 在内网部署 runner
   - 配置自托管 runners

2. **使用 ngrok 内网穿透**
   - 将内网服务暴露到公网
   - 通过 `TEST_URL` 配置穿透后的 URL

3. **使用 VPN**
   - 配置 GitHub Actions 使用 VPN 连接

## 查看测试结果

### GitHub Actions 日志

1. 进入仓库 → Actions 标签
2. 选择对应的 workflow run
3. 查看每个步骤的日志输出

### 下载产物

测试完成后自动上传：
- **截图**: `test-screenshots-{run_id}.zip`
- **日志**: `test-logs-{run_id}.zip`
- **报告**: `test-reports-{run_id}.zip`

下载位置：Actions 页面 → 对应 run → Artifacts

## 常见问题

### Q: 浏览器启动失败

```
Error: Failed to launch chromium!
```

**解决方案**: 确保 `apt-get install chromium` 在 workflow 中执行成功

### Q: 测试 URL 无法访问

```
net::ERR_CONNECTION_REFUSED
```

**解决方案**:
1. 确认 `TEST_URL` Secret 配置正确
2. 确认测试服务在 CI 环境可访问
3. 考虑使用 ngrok 或 VPN

### Q: 元素定位失败

**解决方案**: CI 环境下页面渲染可能与本地不同，更新定位器使用更稳定的选择器

### Q: 想跳过 CI 测试

可以在 commit message 中添加 `[skip ci]` 或 `[ci skip]`

```bash
git commit -m "docs: update readme [skip ci]"
```

## 本地模拟 CI

```bash
# 使用 headless 模式运行
node scripts/run-tests.js --all --url http://localhost:9222 --headless

# 指定任务
node scripts/run-tests.js --tasks billing,login --url http://localhost:9222
```
