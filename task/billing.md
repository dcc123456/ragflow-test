# Stripe Billing 订阅流程测试用例

**测试目标**: 验证用户完成 Stripe Checkout 订阅购买的完整流程

**前置条件**:

- 测试环境：https://stage.ragflow.io
- 测试账号：yuzhichang@gmail.com
- 密码：123456
- Stripe 测试模式已启用（`BILLING_ENABLED=1`）
- 所有 billing 环境变量已正确配置

---

## 场景一：订阅页面跳转与 Stripe Checkout 完成

**用户故事**:
作为已登录用户，我希望通过 Stripe Checkout 完成订阅购买，以便升级我的账户套餐。

**测试步骤**:

1. **登录系统**
   - 打开浏览器，访问 `https://stage.ragflow.io`
   - 点击"登录"按钮
   - 使用邮箱和密码登录
   - 验证登录成功，跳转到主控制台
   - 确认页面显示用户头像或用户名

2. **导航到订阅页面**

- 点击用户头像或用户名，跳转到个人中心页面
- 点击左侧billing菜单，跳转到账单页面
  - 验证页面加载，显示可用订阅套餐列表（Level 1, Level 2 等）
  - 确认显示价格和功能描述

3. **发起订阅购买**
   - 选择目标套餐（如 Starter Plan $59/月 或 Pro Plan $159/月）
   - 点击"Upgrade"按钮
   - **注意**：会弹出"Change your plan"确认弹窗，显示按比例收费金额
   - 点击弹窗中的"Confirm"确认
   - 系统会新增支付标签页，跳转到 Stripe Checkout 页面（stripe.com）
   - 切换到支付标签页
   - 验证浏览器 URL 包含 `checkout.stripe.com`

4. **填写支付信息**（Stripe 托管页面）
   - 等待 Stripe 页面完全加载（等待 iframe 加载完成）
   - 点击卡号输入框激活
   - 在卡号输入框填写测试卡号：`4242 4242 4242 4242`
   - 在有效期输入框填写：`12/26` 或 `12/2026`
   - 在 CVC 输入框填写：`123`
   - 邮政编码填写：`12345`
   - 持卡人姓名填写：测试姓名（如 Test User）

5. **确认并支付**
   - 点击"订阅"按钮
   - 按钮会变为"正在处理"状态，等待处理完成
   - 等待自动跳转到成功页面

6. **验证成功跳转**
   - 确认 URL 包含 `/billing/success` 或显示成功参数
   - 或显示"Payment Successful"、"Thank you"等成功提示
   - 验证页面显示订阅详情（套餐名称、价格等）

7. **验证 Webhook 回调**
   - 等待 3-5 秒让服务端处理 Stripe webhook
   - 刷新订阅页面，确认套餐状态已更新为"已激活"
   - 或调用 `/v1/billing/points/balance` API 验证余额变化

8. **登出测试**
   - 点击用户菜单，选择"登出"
   - 验证返回登录页面
