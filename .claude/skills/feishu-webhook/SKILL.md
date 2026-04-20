---
name: feishu-webhook
description: 飞书机器人 Webhook 通知 Skill。当需要通知用户任务进度、状态更新或提醒时使用此 Skill。通过飞书机器人 Webhook 发送富文本消息到飞书群或个人。
---

# 飞书机器人 Webhook 通知

## 概述

此 Skill 用于通过飞书机器人的 Webhook 功能发送通知消息。可以发送任务进度更新、状态提醒、错误通知等到飞书群或用户。

## Webhook 配置

- **Webhook 地址**：`https://open.feishu.cn/open-apis/bot/v2/hook/8230b60f-4105-4a06-b522-6a4537bdad15`
- **通知脚本**：`scripts/send-feishu.js`

## 发送方式

**直接告诉我发送什么内容，我会帮你发送通知。**

常用场景：

| 场景 | 消息示例 |
|------|----------|
| 进度通知 | `【进度】任务已完成 50%` |
| 完成通知 | `【完成】任务已全部完成！🎉` |
| 错误告警 | `【告警】出现错误请检查` |
| 开始通知 | `【开始】正在处理xxx任务...` |

## 发送命令

```bash
node scripts/send-feishu.js "你的消息内容"
```

## 脚本源码

`scripts/send-feishu.js`:

```javascript
/**
 * 飞书 Webhook 通知脚本
 * 用法: node send-feishu.js "消息内容"
 */

const WEBHOOK_URL = "https://open.feishu.cn/open-apis/bot/v2/hook/8230b60f-4105-4a06-b522-6a4537bdad15";

const message = process.argv[2] || "测试消息";

async function sendFeishu(text) {
  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      msg_type: "text",
      content: { text }
    })
  });

  const result = await response.json();
  if (result.code !== 0) {
    console.error("发送失败:", result.msg);
    process.exit(1);
  }
  console.log("发送成功!");
}

sendFeishu(message);
```

## 卡片消息 (Interactive)

```javascript
const card = {
  msg_type: "interactive",
  card: {
    header: {
      title: { tag: "plain_text", content: "任务进度提醒" },
      template: "blue"
    },
    elements: [
      { tag: "div", text: { tag: "text", content: "任务已完成 80%" } },
      { tag: "hr" },
      { tag: "note", elements: [{ tag: "text", text: "预计剩余时间：2小时" }] }
    ]
  }
};

await fetch(WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(card)
});
```

## 技术说明

- 使用 Node.js 原生 fetch API（Node.js 18+）
- 消息最大长度：4096 字符
