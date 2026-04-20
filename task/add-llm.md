## 测试添加大模型

**测试目标**: 添加用户自己的大模型（SILICONFLOW）

**前置条件**:

- 测试环境：{{url}}
- 测试账号：{{account}}
- 密码：{{password}}
- 模型提供商：SILICONFLOW
- apikey：{{api_key}}
- 验证是否已经登录，如果没有登录，使用 login.md 进行登录

**预期结果**:

- 每步操作后应显示成功提示或页面正常跳转
- API Key 保存后对话框应关闭，页面显示该提供商已添加
- 刷新页面后配置应保持不变

**已知限制**:

- 模型选择下拉框存在UI问题：点击下拉框后建议列表可能为空，无法通过UI选择具体模型
- 模型开关启用后默认使用第一个可用模型
- 如需精确设置默认模型，需通过API或其他方式处理

**测试步骤**:

1. **跳转个人中心页面**

- 登录成功后，点击右上角用户名或用户设置链接
- 预期：进入用户设置页面，URL 变为 {{url}}/user-setting/data-source

2. **进入模型提供商页面**

- 点击左侧菜单 "Model providers"
- 预期：进入模型提供商管理页面，URL 变为 {{url}}/user-setting/model

3. **添加模型提供商**

- 在 "Available models" 列表中找到 "SILICONFLOW"
- 点击 SILICONFLOW 卡片的 "Add" 按钮（不是填写表单）
- 弹出添加模型对话框后，填写 API Key：{{api_key}}
- 点击 "Save" 或 "保存" 按钮
- 预期：弹窗关闭，SILICONFLOW 出现在 "Added models" 列表中

4. **启用模型**

- 在 SILICONFLOW 的 "Added models" 卡片中点击 "View models" 展开模型列表
- 确保模型开关已启用（switch checked）
- 注意：由于下拉框UI问题，无法精确选择默认模型，系统可能自动使用第一个可用模型
- 预期：模型列表展开，显示可用模型（Qwen/Qwen3-8B, BAAI/bge-large-en-v1.5 等）

5. **验证添加成功**

- 刷新页面（F5 或点击刷新按钮）
- 预期：SILICONFLOW 仍在 "Added models" 列表中，API Key 配置保持不变

**测试环境清理**:

- 测试完成后可选择删除添加的模型提供商以便后续测试
- 点击 SILICONFLOW 卡片右侧的删除按钮即可移除
