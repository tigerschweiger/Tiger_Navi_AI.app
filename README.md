# Navi

一个类似 TomTom 的基础导航网站：用户注册/登录后，输入起点和终点即可在地图上看到路线、距离和预计用时。

## 技术栈

- 前端：React + TypeScript + Vite + Leaflet（地图展示）
- 后端：Node.js + Express + TypeScript
- 数据库：PostgreSQL（Prisma ORM）
- 地图服务：OpenStreetMap 生态
  - [Nominatim](https://nominatim.org/)：地址 -> 经纬度（地理编码）
  - [OSRM](http://project-osrm.org/)：经纬度 -> 路线规划

当前使用的是这两个服务的**公共免费服务器**，无需注册、无需 API key，但有使用政策限制（约 1 请求/秒，禁止重负载/生产级滥用）。后端已经做了请求节流来遵守这个限制，10 人左右规模完全没问题。用户量变大之后必须迁移，见下方"未来扩展"。

## 本地运行

### 1. 启动数据库

```bash
cd navi-app
docker compose up -d
```

如果本机没有装 `docker compose` 插件（`docker: unknown command: docker compose`），可以直接用 `docker run` 代替：

```bash
docker run -d --name navi_postgres \
  -e POSTGRES_USER=navi -e POSTGRES_PASSWORD=navi -e POSTGRES_DB=navi \
  -p 5432:5432 postgres:16-alpine
```

### 2. 启动后端

```bash
cd backend
cp .env.example .env   # 按需修改 JWT_SECRET 等
npm install
npx prisma migrate dev --name init
npm run dev             # http://localhost:4000
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173，/api 请求会自动代理到后端
```

浏览器打开 http://localhost:5173，注册一个账号，登录后进入导航页面，输入起点终点（或点击"使用当前位置"），即可看到地图上的路线。

## API 概览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | /api/auth/register | 注册，返回 JWT |
| POST | /api/auth/login | 登录，返回 JWT |
| GET | /api/auth/me | 获取当前用户信息（需要 Bearer token） |
| POST | /api/navigate | 传入 `{ origin, destination }`（地址字符串或 `{lat, lon}`），返回路线（需要 Bearer token） |

## 未来扩展性（v1 暂不实现，但架构已考虑）

当前规模（约10人）下，这套架构够用。用户量增长后，建议按下面顺序改造：

1. **地图服务迁移**：公共 Nominatim/OSRM 服务器有严格限速，不适合大规模生产流量。迁移到自建实例，或改用有明确 SLA 的付费方案（LocationIQ、Geoapify、Mapbox 等）。代码里 `NOMINATIM_BASE_URL` / `OSRM_BASE_URL` 是环境变量，切换服务商不需要改代码。
2. **缓存层**：加 Redis，缓存常见地址的地理编码结果和热门路线，减少对外部服务的依赖、降低延迟。
3. **数据库扩展**：Postgres 加连接池（如 PgBouncer）、读写分离；如果之后要做"附近的人/POI"之类的地理位置查询，引入 PostGIS。
4. **后端水平扩展**：认证用 JWT（无状态），天然支持多实例 + 负载均衡，不需要共享 session store。加 API 层限流防止滥用。
5. **前端**：静态资源上 CDN。

## 已知限制（v1）

- 未做密码找回、邮箱验证等账号安全功能。
- 路线规划固定为"驾车"模式，未提供步行/骑行选项。
- 未持久化历史导航记录。
