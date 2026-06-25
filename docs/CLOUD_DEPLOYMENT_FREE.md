# 免费额度云端部署指南

本项目的外部测试环境采用：

- 前端：Render Static Site
- 后端：Render Free Web Service
- 数据库：Neon Free Postgres
- 代码与 CI：GitHub + GitHub Actions

## 免费方案限制

- Render 免费后端连续 15 分钟没有入站流量后会休眠。
- 休眠后的首次访问通常需要等待约 1 分钟。
- 后端休眠期间，进程内定时监测不会执行。
- Render 免费实例的本地文件不持久，因此生产环境必须使用 `DATABASE_URL`。
- Neon 免费数据库空闲时会缩容，首次查询可能有轻微冷启动。

该方案适合内部验证、邀请测试和小规模外部试用。需要稳定定时任务或正式商业运营时，优先升级 Render 后端实例。

## 第一步：创建 Neon 数据库

1. 登录 <https://console.neon.tech>。
2. 创建一个 Free 项目，区域优先选择新加坡或离主要用户较近的区域。
3. 复制 Pooled Connection String。
4. 确认连接串以 `postgresql://` 开头，并包含 SSL 参数。

连接串属于密钥，不要提交到 GitHub。

## 第二步：从 Render Blueprint 部署

1. 登录 <https://dashboard.render.com>。
2. 连接 GitHub 账号并授权 `iboosu/ai-geo-monitoring`。
3. 选择 New → Blueprint。
4. 选择仓库和 `main` 分支。
5. Render 会读取仓库根目录的 `render.yaml`，创建前端和后端。

首次创建时填写后端 Secret：

| 环境变量 | 内容 |
|---|---|
| `DATABASE_URL` | Neon Pooled Connection String |
| `DEFAULT_ADMIN_EMAIL` | 管理员邮箱 |
| `DEFAULT_ADMIN_PASSWORD` | 强密码，建议 16 位以上 |
| `DEEPSEEK_API_KEY` | DeepSeek API Key |
| `DOUBAO_API_KEY` | 火山方舟 API Key |
| `DOUBAO_RESPONSES_MODEL` | 已开通模型或 `ep-` 推理接入点 ID |

`JWT_SECRET` 由 Render 自动生成。

分析报表默认按中国标准时间（UTC+8）划分自然日。需要调整时，在后端环境变量中修改
`ANALYTICS_TIMEZONE_OFFSET_MINUTES`，例如 UTC 使用 `0`。

## 第三步：验证

后端：

```text
https://iboosu-ai-geo-monitoring-api.onrender.com/api/health
https://iboosu-ai-geo-monitoring-api.onrender.com/api/health/ready
```

前端：

```text
https://iboosu-ai-geo-monitoring.onrender.com
```

验证顺序：

1. `/api/health/ready` 返回 `READY`；
2. 前端可以打开；
3. 管理员可以登录；
4. 管理后台“平台配置”中测试 DeepSeek 和豆包；
5. 注册一个普通测试用户；
6. 创建项目和 Prompt；
7. 分别运行 DeepSeek 和豆包；
8. 查看项目看板和来源分析。

## 更新发布

日常开发使用功能分支并创建 Pull Request。GitHub Actions 通过后合并到 `main`，Render 才会自动部署。

不要直接修改 Render 服务器文件，也不要把 `.env`、数据库连接串或 API Key 提交到仓库。

## 后续升级顺序

1. 将 Render 后端从 Free 升级到最低付费常驻实例；
2. 配置自定义域名；
3. 增加数据库自动备份；
4. 将定时任务拆分为独立 Worker；
5. 接入错误监控和外部可用性监控。
