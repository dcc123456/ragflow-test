# 测试用户登录注册功能

**测试目标**: 验证用户登录和注册功能是否正常

**前置条件**:

- 测试环境：http://localhost:9222
- 测试账号：test1@gmail.com
- 密码：123456

**测试步骤**:

1. **登录**

- 打开浏览器，访问 http://localhost:9222/login
- 输入账号和密码
- 点击登录按钮
- 验证登录成功，跳转到主页（URL 应为 http://localhost:9222/）

2. **注册**（如果登录失败）

- 如果登录失败（提示账号不存在），点击"Sign up"注册按钮
- 页面跳转到注册页（标题为"Create an account"）
- 输入邮箱、昵称和密码（邮箱使用 test1@gmail.com，昵称 test1）
- 点击"Continue"按钮
- 验证注册成功，跳转到登录页面（URL 应为 http://localhost:9222/login）

3. **重新登录**

- 输入刚注册的账号和密码
- 点击登录按钮
- 验证登录成功，跳转到主页
- 确认页面显示"Welcome to RAGFlow"和 Dataset、Chat 等功能区域

**预期结果**:
- 账号不存在时，注册流程正常
- 注册成功后可正常登录
- 登录成功后 URL 变为 http://localhost:9222/，显示主页内容
