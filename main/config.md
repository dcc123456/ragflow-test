# 测试配置

## 测试环境

| 环境     | 用途     | URL                      |
| -------- | -------- | ------------------------ |
| 开发环境 | 本地开发 | http://localhost:9222    |
| 测试环境 | QA测试   | http://192.168.1.23:9222 |

**默认测试URL**: http://localhost:9222

---

## 测试账号

| 账号                | 密码   | 说明         |
| ------------------- | ------ | ------------ |
| dcc-test1@gmail.com | 123456 | 公共测试账号 |
| dcc-test2@gmail.com | 123456 | 备用测试账号 |

---

## 测试数据

| 变量名        | 值                                  | 说明           |
| ------------- | ----------------------------------- | -------------- |
| url           | http://localhost:9222               | 测试环境URL    |
| account       | dcc-test1@gmail.com                 | 主测试账号     |
| backup_account| dcc-test2@gmail.com                 | 备用测试账号   |
| password      | 123456                              | 账号密码       |
| api_key       | sk-micttjpgbylrnravzhocmdwdxwhjydmhwrnmoxlkqrqjkavv | SILICONFLOW API Key |

---

## 路径配置

| 类型 | 路径              |
| ---- | ----------------- |
| 截图 | ./screenshots     |
| 日志 | ./test-results    |
| 报告 | ./test-reports    |

---

## 资源限制

| 资源     | 限制值 |
| -------- | ------ |
| 单步超时 | 30秒   |
| 任务超时 | 5分钟  |
| 重试次数 | 3次    |
| 并行数   | 3个    |

---

## 任务依赖

| 任务    | 依赖任务 |
| ------- | -------- |
| add-llm | login    |
| billing | login    |
