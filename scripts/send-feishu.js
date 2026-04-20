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
  console.log(result);

  if (result.code !== 0) {
    console.error("发送失败:", result.msg);
    process.exit(1);
  }

  console.log("发送成功!");
}

sendFeishu(message);
