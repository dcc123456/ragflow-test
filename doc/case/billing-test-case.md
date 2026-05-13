Billing 人工测试流程

文档目的

这份文档把 Billing 人工测试拆成 5 个功能域，每个功能域给出 5 条可执行流程：

1. 主套餐订阅
2. Price point / points 购买
3. Storage add-on 订阅
4. 文档解析 points 计费
5. 资源限制（app、member、file_size / storage 上传相关）

总计 25 条流程。

套餐订阅入口：登录 -》个人中心 -》 billing -》 change plan
测试基线

- 主套餐真实名称是：Trial、Starter、Pro、Enterprise
- 当前配额配置：
  - Trial: 5 apps, 1 member, 100MB storage
  - Starter: 100 apps, 10 members, 10G storage
  - Pro: 999999999 apps, 50 members, 100G storage
- 只有 active 和 trialing 属于有 entitlement 的主订阅状态
- Storage add-on 是单独的一条 recurring Stripe subscription
- Points 充值按 100 的倍数购买
- DeepDoc 当前后端计费模型是 100 points / PDF page
- App quota 不是单一对象，而是 dialogs + KBs + canvases + searches + memories 的总和
- Member quota 会在邀请成员和接受邀请时生效
- Billing 层限制的是租户总 storage；上传传输层还有独立的 request size 上限

通用测试准备

- 使用 Stripe test mode
- 需要验证续费 / 月结 / period end 的流程时，统一使用 Stripe Test Clock
- 除非用例明确要求复用同一租户，否则每条流程尽量使用全新账号 / 全新 tenant
- 每条流程至少保留下列证据：
  - pricing page 状态
  - billing overview 状态
  - billing history 行数据
  - points balance / ledger / holds（需要时）
  - team member 数量（需要时）
  - app 总数（需要时）
  - 上传报错 toast 或 API 返回（需要时）

通用判定规则

- 后端结果正确但前端展示错误，记为 UI bug
- 前端展示正常但 quota / history / points / subscription 状态不对，记为 billing bug
- 若实际结果与本文“预期结果”不一致，需要补充截图、接口返回、Stripe 侧证据

---

1. 主套餐订阅

PLAN-01：Trial -> Pro -> 续费 -> Starter -> 续费 -> Trial -> 续费 -> Starter

目标

覆盖主套餐最完整的一条标准生命周期。

步骤

1. 注册新账号，确认默认是 Trial
2. 打开 billing overview 和 pricing page，记录 billing cycle、plan name、quota
3. 升级到 Pro，确认立即扣款成功
4. Test Clock 快进 1 个 billing period，确认 Pro 续费成功，billing history 出现一条成功的 Pro 续费记录
5. 从 Pro 降级到 Starter，确认不是立即降级，而是显示 scheduled downgrade
6. Test Clock 再快进 1 个 billing period，确认套餐切到 Starter，billing history 出现对应周期的 Starter 扣款
7. 从 Starter 降级到 Trial
8. Test Clock 再快进 1 个 billing period，确认套餐切到 Trial，且该周期不产生付费续费记录
9. 再从 Trial 升级到 Starter，确认立即扣款并立即生效

预期结果

- 新账号默认开通 Trial
- Trial 升级到付费套餐时立即扣款
- 付费套餐降级是 period-end 生效
- 每次续费后 billing cycle 日期正确更新
- Trial 周期不应产生付费续费记录

PLAN-02：续费失败、Attention 提示、补款恢复

目标

验证续费失败、attention banner、invoice 恢复支付、history 行更新。

步骤

1. 注册新账号并升级到 Pro
2. 在 Stripe Customer Portal 中删除或失效当前付款方式
3. Test Clock 快进 1 个 billing period
4. 确认本次续费失败
5. 打开 billing overview，确认出现红色 attention 提示
6. 打开 billing history，定位这条失败续费记录
7. 从前端恢复路径进入 Pay invoice 或 从 billing history 拿invoice,然后从invoice里面的pay进入
8. 完成这张失败 invoice 的补付
9. 刷新 billing overview 和 billing history

预期结果

- 主订阅进入 delinquent 状态
- 页面出现 payment attention 提示
- billing history 先有 1 条 failed 行
- 补款成功后，同一条 invoice/history 行变成成功，而不是新建第二条
- attention 提示消失

PLAN-03：Starter -> Pro，通过 Customer Portal 升级

目标

验证“已激活付费套餐升级到更高付费套餐”走 portal 更新，而不是 direct checkout。

步骤

1. 准备一个当前处于 Starter 的租户
2. 在 pricing page 点击升级到 Pro
3. 确认跳转到 Stripe Customer Portal subscription update，而不是直接 checkout
4. 在 Stripe 完成升级
5. 刷新 current plan、plan overview、billing history
6. 检查升级生效时机和扣款结果

预期结果

- 已激活付费套餐之间的升级走 Customer Portal
- 只有支付成功并完成 webhook 同步后，plan 才切到 Pro
- billing overview quota 更新为 Pro
- billing history 记录本次升级相关 invoice

PLAN-04：已排期的降级可取消

目标

验证 scheduled downgrade 能在 period end 前被取消。

步骤

1. 准备一个当前在 Pro 或 Starter 的租户
2. 发起一次降级
3. 确认 pricing page 出现 downgrade banner，包含目标 plan 和生效时间 （我在改后端的时候已经实现，前端状态目前不知）
4. 在 period end 前点击 Cancel downgrade （同上）
5. 刷新 pricing page 和 current plan API
6. 将 Test Clock 推进到扣费的时间（或者一个月）

预期结果

- 发起降级后能看到 pending downgrade banner
- 取消后 banner 消失
- 到原本的 period end 时，租户仍然留在原套餐
- 不应发生误降级

PLAN-05：升级产生未支付 invoice 时，不应提前授予更高权益

目标

验证 upgrade invoice 未支付前，不能提前拿到更高套餐 entitlement。

步骤

1. 准备一个 Starter 租户
2. 构造默认卡失效或 upgrade invoice 支付失败条件
3. 发起升级到 Pro
4. 让 Stripe 侧产生 unpaid / failed invoice
5. 刷新 current plan、billing overview、plan quota
6. 不应该升级到 Pro
7. 再完成这张 upgrade invoice 的补款
8. 重新刷新上述页面
9. 升级到 Pro

预期结果

- 补款前，租户 entitlement 仍然是 Starter
- 不能提前拿到 Pro 配额
- 补款成功后才切换到 Pro

---

2. Price Point / Points 购买

POINT-01：成功购买 100 points

目标

验证最小合法 points 购买路径。

步骤

1. 打开 Points 页，记录 Available、Held、Total
2. 从前端购买 100 points
3. 完成 Stripe 支付
4. 刷新 points balance、points ledger、billing history

预期结果

- available_points 恰好增加 100
- ledger 新增 1 条 recharge
- billing history 新增 1 条购买记录

POINT-02：连续购买 500 和 1000 points，验证累计结果

目标

验证更大整数倍购买和累计记账。

步骤

1. 从已知 balance 开始
2. 购买 500 points 并完成支付
3. 再购买 1000 points 并完成支付
4. 刷新 points balance 和 points ledger

预期结果

- 总余额累计增加 1500 points
- ledger 中出现两条独立的 recharge
- billing history 中出现两条购买记录

POINT-03：非法购买输入

目标

验证 UI 和 API 都会拒绝非法数量。

步骤

1. 在前端尝试输入 0、-100、50
2. 观察前端是否拦截
3. 直接调 /billing/points/checkout，传 0、-100、50、非整数

预期结果

- 只有正整数且是 100 的倍数时才允许
- 非法请求不创建 checkout session
- 非法请求不会改 balance、ledger、history

POINT-04：Checkout 中途取消

目标

验证 one-time purchase 取消后不会入账，也不会出现订阅式恢复提示。

步骤

1. 发起一次合法 points 购买
2. 在 Stripe Checkout 中取消或放弃支付
3. 刷新 Points 页面和 billing history

预期结果

- 不应增加 points
- 不应新增 recharge ledger
- 不应出现成功 history 行
- 不应出现 subscription failure 那类 recovery banner

POINT-05：重复 webhook / 重放幂等性

目标

验证同一成功购买不会被重复充值。

步骤

1. 完成一笔成功的 points 购买
2. 用测试工具重放同一条 checkout.session.completed
3. 刷新 points balance、ledger、billing history

预期结果

- 同一笔 session 只会充值一次
- ledger 不会因重放重复记账
- billing history 不会出现同一 order 的重复记录

---

3. Storage Add-On 订阅

STORAGE-01：标准生命周期串测 - 先订阅，再减，再加，再取消，再订阅

目标

完整覆盖 storage add-on 的标准生命周期，匹配产品要求。

步骤

1. 准备一个新的 `Starter` 付费租户，先确认 billing overview 中主套餐自带 storage 是 `10G`，当前 storage add-on 是 `0G`，总 quota 是 `10G`。
2. 在 billing 页的 storage `Manage` 中把 target 从 `0G` 设为 `5G`，完成 Stripe checkout；检查支付成功后，billing overview 里 add-on 应立刻显示为 `5G`，总 quota 变成 `15G`，billing history 新增一条 storage 成功扣费记录。
3. 把 storage target 从 `5G` 下调到 `3G`；检查前端 f12 应显示 `future effective date` 或 `period end 生效`，当前 effective quantity 仍然是 `5G`，总 quota 仍然是 `15G`，不能立刻降到 `13G`。
4. 在还没到 period end 前，再把 target 从 `3G` 提高到 `8G`；检查这次 change 会按 increase 处理，需要立即付款，支付前 effective quantity 仍然保持 `5G`，总 quota 仍然是 `15G`。
5. 完成这次付款后刷新 billing 页面；检查 storage add-on 应切换为 `8G`，总 quota 变成 `18G`，billing history 出现本次 `5G -> 8G` increase 对应的成功扣费记录。
6. 把 target 从 `8G` 设为 `0G`；检查前端应明确提示这是 `cancel at period end`，当前 effective quantity 仍然是 `8G`，当前总 quota 仍然是 `18G`。
7. `advance` 时间到当前 billing period 结束；检查 storage add-on 被真正取消，add-on 变回 `0G`，总 quota 回到 `10G`，并且下一期不应再为 storage add-on 续费。
8. 在 add-on 已取消的状态下，再次把 target 从 `0G` 设为 `4G` 并完成付款；检查可以重新订阅成功，add-on 变成 `4G`，总 quota 变成 `14G`，billing history 再新增一条新的 storage 成功扣费记录。

STORAGE-02：首次订阅 storage add-on

目标

单独验证 first subscribe 行为和 billing history。

步骤

1. 准备一个新的 `Starter` 付费租户，确认当前主套餐 storage 是 `10G`，storage add-on 是 `0G`，总 quota 是 `10G`。
2. 在 billing 页面点击 storage `Manage`，把 target 从 `0G` 设为 `5G`；检查前端应打开 Stripe checkout，而不是直接在本地生效。
3. 完成付款后返回 billing 页面；检查 `effective_quantity_gb` 应变成 `5`，billing overview 的总 storage quota 应从 `10G` 增加到 `15G`。
4. 刷新 billing overview、storage current API、billing history；检查前后数据一致，billing history 应出现 1 条 storage 相关 invoice/order，状态是成功，不应出现重复的两条首订记录。

STORAGE-03：中途加量，进入 pending invoice 后走 Pay Now
目前会直接更改add-on

目标

验证 pending increase blocker 和 Pay Now 恢复路径。

步骤

1. 准备一个 `Starter` 租户，确保当前已有 `5G` 的 storage add-on；先确认当前 effective quantity 是 `5G`，总 quota 是 `15G`。
2. 在 billing 页面把 target 从 `5G` 提高到 `8G`，进入 Stripe 支付页后故意不付款直接关闭；回到 billing 页面后检查，这次 increase 应停在 `pending-payment`，但 effective quantity 仍然必须是 `5G`，总 quota 仍然必须是 `15G`。
3. 再尝试把 target 改成 `10G`；检查系统不应直接创建新变更，而是弹出 blocker modal，提示有一笔未支付的 storage increase 待处理。
4. 在 blocker modal 中选择 `Pay now`；检查前端应打开刚才那一笔 `5G -> 8G` 的未支付 invoice，而不是新建一条 `5G -> 10G` invoice。
5. 完成付款后刷新 billing 页面；检查 pending 状态被清空，effective quantity 变成 `8G`，总 quota 变成 `18G`。
6. 查看 billing history；检查刚才那条未支付记录应从待支付变成支付成功，而不是额外再新增一条独立的成功记录；当前生效容量也应是 `8G` 而不是 `10G`。

STORAGE-04：中途加量，进入 pending invoice 后走 Abandon And Apply
目前会直接更改add-on

目标

验证 abandon pending increase 的回滚逻辑。

步骤

1. 准备一个 `Starter` 租户，确保当前已有 `5G` 的 storage add-on；先确认当前 effective quantity 是 `5G`，总 quota 是 `15G`。
2. 把 target 从 `5G` 提高到 `8G`，进入 Stripe 支付页后故意不付款直接关闭；检查这次变更停在 `pending-payment`，但当前 effective quantity 仍然是 `5G`。
3. 再次打开 storage `Manage`，把 target 改成 `6G`；检查系统不应直接提交，而是弹出 blocker modal，因为上一笔 `5G -> 8G` increase 还没支付。
4. 在 blocker modal 中选择 `Abandon and apply`；检查旧的 `5G -> 8G` unpaid invoice 会被作废，当前 effective quantity 仍然保持 `5G`，不会错误切到 `8G`。
5. 继续完成新的 `5G -> 6G` 付款流程；检查支付成功后，effective quantity 变成 `6G`，总 quota 变成 `16G`。
6. 查看 billing history、后台或 Stripe；检查旧的 `5G -> 8G` 记录应是 `void/canceled/abandoned`，新的 `5G -> 6G` 记录应是成功，系统最终只能生效 `6G`，不能生效被放弃的 `8G`。

STORAGE-05：Trial 限制与降级到 Trial 后的自动取消

目标

验证 Trial 上不能加 storage，以及主套餐降到 Trial 时 storage 的 side effect。

步骤

1. 注册一个新的 `Trial` 租户，先确认 billing overview 中主套餐 storage 是 `100MB`，当前 storage add-on 是 `0G`。
2. 在 storage `Manage` 中尝试把 target 从 `0G` 设为 `1G`；检查前端应直接报错或禁止提交，后端也应返回不允许 `Trial` 订阅正数 storage add-on，当前 quota 必须仍然保持 `100MB` 不变。
3. 准备另一个 `Starter` 租户，先成功订阅 `5G` storage add-on；确认此时主套餐 `10G` 加 add-on `5G`，总 quota 是 `15G`。
4. 把主套餐从 `Starter` 降级到 `Trial`；检查前端应显示主套餐降级在 `period end` 生效，同时 storage add-on 也会被安排在同一个 `period end` 自动取消；在真正生效前，当前 effective quantity 仍然是 `5G`，当前总 quota 仍然是 `15G`。
5. `advance` 时间到 period end；检查主套餐真正变成 `Trial` 后，storage add-on 应变成 `0G`，总 quota 应回到 `100MB`，并且 billing history 不应再出现下一期 storage add-on 的续费记录。

---

4. 文档解析 Points 计费

PARSE-01：10 页 PDF 成功解析

目标

验证最基础的 PDF 成功解析扣点是否精确。

步骤

1. 从已知 available points 开始
2. 上传并解析一个恰好 10 页的 PDF
3. 等待任务成功完成
4. 刷新 points balance、ledger、holds、DeepDoc usage

预期结果

- 会创建 1 条恰好 10 \* 100 = 1000 points 的 hold
- ledger 出现 hold_created -1000，随后出现 consume -1000
- hold 最终状态是 committed
- DeepDoc usage 显示 10 paid pages

PARSE-02：解析失败 / 取消后，应整笔 release

目标

验证 parse 未成功完成时的退还逻辑。

步骤

1. 发起一个多页 PDF 解析
2. 在完成前取消任务，或制造解析失败
3. 刷新 points balance、ledger、holds、DeepDoc usage

预期结果

- 进行中会先出现 held points
- 最终结果应是整笔 release，而不是 partial consume
- available points 回到解析前水平
- 任务结束后不应残留 held 状态

PARSE-03：只解析子页范围时，扣点是否按子页还是全 PDF

目标

验证 page-range 解析时的扣点规则是否正确。

步骤

1. 准备一个 50 页 PDF
2. 通过产品实际使用的 page-range / parser config，只解析 1-2 页
3. 记录 billing debit、ledger、hold 数值、DeepDoc usage

预期结果

- 先明确业务期望：
  - 如果按选中页计费，应扣 2 页
  - 如果按整份 PDF 计费，应扣 50 页
- 当前代码风险是：即便只解析子页，也可能按整份 PDF 总页数计费 (对）
- 若业务期望与实际扣点不一致，记为 billing bug

PARSE-04：同一 PDF rerun 是否重复扣点

目标

验证 rerun / reuse path 是否会重复计费。

步骤

1. 成功解析同一个 PDF 一次，并记录本次扣点
2. 以相同配置对该文档执行 rerun
3. 完成后刷新 balance、ledger、holds、usage

预期结果

- 需要先明确业务期望：
  - 如果 rerun 应重新计费，则应再扣一次 （现在应该是再扣一次）
  - 如果复用结果不应重复计费，则不应二次扣点
- 当前代码风险是：即便 chunk 可复用，仍可能新建并 commit 一次完整 hold

---

5. 资源限制

LIMIT-01：Trial app cap，跨多种 app 类型合并计算

目标

验证 app quota 是跨多种对象统一计数。

步骤

1. 准备一个全新的 Trial 租户
2. 混合创建 5 个会计入 app quota 的对象，例如 dialog、KB、canvas/agent、search、memory
3. 在至少两个不同入口继续尝试创建第 6 个对象

预期结果

- App quota 是多种对象合并计算
- 第 6 次创建会失败
- 不同路径返回的 code / message 可能不同，需要一并记录

LIMIT-02：Starter member cap，覆盖 owner invite 和 invitee accept

目标

验证成员上限在“发邀请”和“接受邀请”两个阶段都会生效。

步骤

1. 准备一个 Starter 租户，并把 team 填满到 10 人
2. 以 owner 身份继续邀请第 11 人
3. 如果系统中还能存在待接受 invite，则用 invitee 身份执行 accept
4. 删除 1 个成员
5. 重新测试邀请 / 接受
   Note: 可以超额邀请，但是最终team成员数不得超过限额
   预期结果

- 邀请和接受两个阶段都应在上限时被阻止
- 释放 1 个 seat 后，下一次邀请或接受应恢复可用

LIMIT-03：Trial storage 接近上限时上传超额

目标

验证 storage quota 按租户总 storage 生效，而不是只看单文件。

步骤

1. 准备一个 Trial 租户，把已用 storage 调整到接近 100MB
2. 上传一个会让总量刚好超限的文件
3. 刷新 billing overview 和 document list

预期结果

- 上传被拒绝
- 报错信息包含 current、limit、file size
- 失败上传后 billing overview 的 used storage 不应增加

LIMIT-04：传输层上传上限 vs Billing storage quota

目标

区分 request body 太大和 storage quota 不足这两类错误。

步骤

1. 发起一次超过全局 request body cap 的上传
2. 记录前端错误提示
3. 再发起一次未超过 request body cap，但超过剩余 storage quota 的上传
4. 记录前端 / 后端错误提示

预期结果

- 超 request body cap 走 transport / 413 风格错误
- 超剩余 storage quota 走 billing / storage quota 错误
- 两类错误必须能区分开

LIMIT-05：升级 / 降级后，资源限制应同步变化

目标

验证 plan 变化后，实际操作限制也随之变化。

步骤

1. 在 Trial 上先触发一个资源上限，例如 app cap 或 storage cap
2. 升级到 Starter
3. 重新执行刚才被拦截的动作
4. 再安排降级回 Trial 并让其真正生效
5. 再次执行同一动作

预期结果

- 升级后，之前被挡住的动作应能重新通过
- 降级生效后，低配额再次生效
- 对 storage 来说，如果当前已使用量高于新上限，系统应至少阻止继续增长

---

测试时重点关注的高风险点

- Billing History 前端当前把 product 列写死成了 Chat2DB
- Points 充值记录在 history 里可能没有 invoice link
- DeepDoc usage widget 可能存在前后端 plan name 不一致问题
- Pricing 侧 calculator 的金额公式与后端 DeepDoc 计费公式可能不一致 （calculator 就是 计费）
- 子页解析和 rerun 解析是最容易出计费偏差的两个点
