# Navi

一个类似 Google Maps 的网站：用户注册/登录后可以

- **导航**：输入起点和终点，在地图上看到路线、距离和预计用时（类似 TomTom）
- **商家与点评**：在地图上添加商家（名称、分类、简介、地址），搜索/浏览地图上的商家，给商家写星级评分 + 文字评论

## 技术栈

- 前端：React + TypeScript + Vite + Leaflet（地图展示）
- 后端：Node.js + Express + TypeScript
- 数据库：PostgreSQL（Prisma ORM）
- 地图服务：OpenStreetMap 生态
  - [Nominatim](https://nominatim.org/)：地址 -> 经纬度（地理编码）
  - [OSRM](http://project-osrm.org/)：经纬度 -> 路线规划

当前使用的是这两个服务的**公共免费服务器**，无需注册、无需 API key，但有使用政策限制（约 1 请求/秒，禁止重负载/生产级滥用）。后端已经做了请求节流来遵守这个限制，十几人规模完全没问题。用户量变大之后必须迁移，见下方"未来扩展"。

## 本地运行

### 1. 启动数据库

```bash
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
npx prisma migrate dev
npm run dev             # http://localhost:4000
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173，/api 请求会自动代理到后端
```

浏览器打开 http://localhost:5173，注册一个账号，登录后顶部导航可以在"导航"和"商家"两个功能间切换。

## API 概览

### 认证

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | /api/auth/register | 注册，返回 JWT |
| POST | /api/auth/login | 登录，返回 JWT |
| GET | /api/auth/me | 获取当前用户信息（需要 Bearer token） |

### 导航

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | /api/navigate | 传入 `{ origin, destination }`（地址字符串或 `{lat, lon}`），返回路线（需要 Bearer token） |

### 商家与点评

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | /api/businesses?minLat&minLon&maxLat&maxLon&category?&q? | 按地图可视范围（必填）+ 可选分类/关键词列出商家 |
| POST | /api/businesses | 创建商家：`{name, category, description, address}`（需要 Bearer token，服务端会把 address 地理编码成经纬度） |
| GET | /api/businesses/:id | 商家详情，含平均分、评论数、完整评论列表 |
| PUT | /api/businesses/:id | 编辑商家（需要 Bearer token，仅创建者本人） |
| DELETE | /api/businesses/:id | 删除商家（需要 Bearer token，仅创建者本人） |
| POST | /api/businesses/:id/reviews | 新增/更新自己对该商家的评论：`{rating, comment}`（需要 Bearer token，一人一店一条，重复提交即更新） |
| DELETE | /api/businesses/:id/reviews/:reviewId | 删除自己的评论（需要 Bearer token，仅本人） |

商家分类（`category`）目前是固定枚举：`RESTAURANT` 餐厅、`CAFE` 咖啡厅、`GROCERY` 超市、`GAS_STATION` 加油站、`RETAIL` 零售、`HEALTHCARE` 医疗、`ENTERTAINMENT` 娱乐、`LODGING` 住宿、`OTHER` 其他。

## 未来扩展性（v1 暂不实现，但架构已考虑）

当前规模（十几人）下，这套架构够用。用户量增长后，建议按下面顺序改造：

1. **地图服务迁移**：公共 Nominatim/OSRM 服务器有严格限速，不适合大规模生产流量。迁移到自建实例，或改用有明确 SLA 的付费方案（LocationIQ、Geoapify、Mapbox 等）。代码里 `NOMINATIM_BASE_URL` / `OSRM_BASE_URL` 是环境变量，切换服务商不需要改代码。
2. **商家地理搜索升级到 PostGIS**：现在 `/api/businesses` 是简单的经纬度 bounding box 查询（b-tree 索引），商家量小时够用；量大了以后应该给 Postgres 装 PostGIS 扩展，用真正的地理空间索引（GiST）做半径/多边形查询，效率更高。
3. **地图标记聚合（clustering）**：商家数量变多后，地图上密集的 marker 应该做聚合展示（如 `react-leaflet-cluster`），避免地图卡顿和视觉拥挤。
4. **评论统计预计算**：现在商家的平均分/评论数是每次读取时实时用 SQL 聚合算出来的，评论量非常大之后可以改成异步预计算存储（写路径算好存一份），减少读延迟。
5. **缓存层**：加 Redis，缓存常见地址的地理编码结果、热门路线、热门商家查询，减少对外部服务的依赖、降低延迟。
6. **数据库扩展**：Postgres 加连接池（如 PgBouncer）、读写分离。
7. **后端水平扩展**：认证用 JWT（无状态），天然支持多实例 + 负载均衡，不需要共享 session store。加 API 层限流防止滥用。
8. **前端**：静态资源上 CDN。

## 已知限制（v1）

- 未做密码找回、邮箱验证等账号安全功能。
- 路线规划固定为"驾车"模式，未提供步行/骑行选项。
- 未持久化历史导航记录。
- 商家没有审核流程，任何登录用户创建后立即公开可见；也没有图片上传，只有文字简介。
- 商家搜索按当前地图可视范围查询，还没有"附近排序"（按距离由近到远）能力。
