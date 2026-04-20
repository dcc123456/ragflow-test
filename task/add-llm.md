## 测试添加大模型

**测试目标**: 添加用户自己的大模型

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

**测试步骤**:

1. **跳转个人中心页面**

- 登录成功后，点击用户头像或用户名，跳转到个人中心页面
- 预期：进入用户设置页面

2. **进入模型提供商页面**

- 点击左侧菜单 "Model providers" 或右侧模型提供商按钮
- 预期：进入模型提供商管理页面，页面显示 "Model providers"

3. **添加模型提供商**

- 在 "Available models" 列表中找到 "SILICONFLOW"
- 点击 SILICONFLOW 卡片，弹出添加模型弹窗
- 填写 API Key：{{api_key}}
- 点击 "Save" 或 "保存" 按钮
- 预期：弹窗关闭，SILICONFLOW 出现在 "Added models" 列表中

4. **设置默认模型**

- 在 SILICONFLOW 的 "Added models" 卡片中点击 "View models" 展开模型列表
- 设置 LLM 模型：点击 LLM 下拉框，选择 "Qwen/Qwen3-8B"
- 设置 Embedding 模型：点击 Embedding 下拉框，选择 "BAAI/bge-large-en-v1.5"
- 其他模型（VLM/ASR/Rerank/TTS）可保持默认或选择性设置
- **注意**：如果下拉框选项为空，可使用 puppeteer 的 `page.select()` 或直接通过 API 设置
- 预期：模型选择后显示对应的模型名称

5. **验证添加成功**

- 刷新页面（F5 或点击刷新按钮）
- 预期：SILICONFLOW 仍在 "Added models" 列表中，模型设置保持不变

**测试环境清理**:

- 测试完成后可选择删除添加的模型提供商以便后续测试
