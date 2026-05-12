## 测试添加大模型

**测试目标**: 添加用户自己的大模型

**前置条件**:

- 测试环境：{{url}}
- 测试账号：{{account}}
- 密码：{{password}}
- 模型提供商：SILICONFLOW
- apikey：{{api_key}}

**测试前判断**:

- 如果 `test-script/add-llm-test.playwright.js` 脚本文件存在，则执行该脚本
- 如果脚本执行全部成功，则跳过当前测试用例的测试步骤
- 否则执行以下测试步骤

**测试脚本**:

```bash
cd D:\projects\dcc\ragflow-test
node test-script/login-test.playwright.js && node test-script/add-llm-test.playwright.js
```

脚本会自动执行：
1. 登录（如未登录）
2. 进入 Model providers 页面
3. 检查并添加 SILICONFLOW 提供商（如已存在则跳过）
4. 设置 LLM 模型
5. 设置 Embedding 模型
6. 刷新页面验证配置持久化

**可用模型**（根据实际API返回）：
- LLM: Qwen/Qwen3-8B, Qwen/Qwen2.5-72B-Instruct-128Kt 等
- Embedding: BAAI/bge-large-en-v1.5, sentence-transformers/all-MiniLM-L12-v2 等

**注意**: SILICONFLOW API Key 可能因无效/过期/余额不足导致下拉框无选项

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
- **注意**：如果 SILICONFLOW 已存在，可跳过此步骤

4. **设置默认模型**（重要：使用 "Set default models" 模块）

- 在页面顶部 "Set default models" 区域设置默认模型
- 设置 LLM 模型：点击 LLM 下拉框（显示 "Select model"），选择 "Qwen/Qwen3-8B"
- 设置 Embedding 模型：点击 Embedding 下拉框，选择 "BAAI/bge-large-en-v1.5"
- **操作方式**：由于 React 下拉框使用 JavaScript 注入，点击下拉框展开后，需要通过 JavaScript 查找并点击对应的 option 元素
  ```javascript
  // 示例：通过文本查找并点击选项
  const listbox = document.querySelector('[role="listbox"]');
  const options = listbox.querySelectorAll('[role="option"]');
  for (const opt of options) {
    if (opt.textContent.includes('Qwen/Qwen3-8B')) {
      opt.click();
      break;
    }
  }
  ```
- 其他模型（VLM/ASR/Rerank/TTS）可保持默认或选择性设置
- 预期：模型选择后下拉框显示对应的模型名称（如 "Qwen/Qwen3-8B"）

5. **验证添加成功**

- 刷新页面（F5 或点击刷新按钮）
- 预期：
  - SILICONFLOW 仍在 "Added models" 列表中
  - LLM 下拉框显示 "Qwen/Qwen3-8B"
  - Embedding 下拉框显示 "BAAI/bge-large-en-v1.5"

**测试环境清理**:

- 测试完成后可选择删除添加的模型提供商以便后续测试

**技术说明**:

- React 下拉框为受控组件，标准 click 可能无法选中选项，需要使用 JavaScript 注入方式直接点击 option 元素
- 页面有两处模型相关区域："Set default models"（设置默认模型）和 "Added models"（查看/管理已添加的提供商）
- 设置默认模型应在 "Set default models" 区域操作，而非 "Added models" 区域
