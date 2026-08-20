# 压测工具：模拟 1亿用户 / 200万商家

用来验证 `/api/businesses`（商家搜索/详情）在 10M→100M 用户规模下能否满足 **查询延迟 <1s** 的目标。分两部分：

1. **数据体量的模拟**：往 Postgres 里灌合成的用户/商家/评论数据，商家按真实城市加权分布（不是全球均匀随机撒点），这样压测查到的结果集才有参考意义
2. **并发流量的模拟**：用 [k6](https://k6.io/) 模拟不同并发档位的请求，压测坐标取自和第一步同一份城市列表，保证打的是真实有数据的区域

k6 通过官方 `grafana/k6` Docker 镜像运行，不需要在本机装 k6。

## 目标规模 vs. 本地验证规模

`.env` 里的默认值就是真实目标（1亿用户 / 200万商家）。**这台开发机的单节点 Postgres 容器不适合真的插入一亿行**——本地验证请用环境变量覆盖成小规模（保持同样的 50:1 用户/商家比例）：

```bash
TOTAL_USERS=500000 TOTAL_BUSINESSES=10000 npm run seed
```

真正跑目标规模的压测，需要在能扛住这个写入量和存储量的 Postgres 实例上跑（多核、更大内存/磁盘的托管实例或专用机器），`npm run seed` 在真实基础设施上跑几十分钟到几小时是正常的，不是脚本卡住了。

## 使用步骤

### 1. 安装依赖

```bash
cd load-test
npm install
cp .env.example .env
```

编辑 `.env`：
- `DATABASE_URL` 指向要压测的 Postgres
- `JWT_SECRET` **必须和 `backend/.env` 里的完全一致**，否则这里签的 token 后端验不过
- 按需调整 `TOTAL_USERS` / `TOTAL_BUSINESSES` / `TOKEN_POOL_SIZE` 等

### 2. 灌数据

```bash
npm run seed
```

用 Postgres `COPY` 流式写入（不是逐条 `INSERT`，千万/亿级规模下只有 `COPY` 能在合理时间内跑完）。所有合成数据的 id 都是 `u_<序号>` / `b_<序号>` / `r_<序号>_<序号>` 这种确定性前缀，不会和真实数据的 UUID 冲突，事后也方便按前缀清理。

### 3. 生成 token 池 + 压测用的城市/商家数据

```bash
npm run generate-tokens
```

会在 `k6/data/` 下生成三个文件：
- `tokens.json`：预签发的 JWT 池（大小 = `TOKEN_POOL_SIZE`，和目标**并发数**对应，不是和总用户数对应——压测不需要、也不可能真的模拟一亿个同时登录的会话，只需要够大的 token 池循环使用）
- `cities.json`：和灌数据时同一份加权城市列表，k6 用它来生成落在真实商家聚集区里的查询坐标
- `businesses-sample.json`：抽样出的真实商家 id + 经纬度，给"查看商家详情"场景用

### 4. 跑压测

```bash
# 先跑一次快速冒烟测试，确认脚本和数据没问题（几十秒）
SMOKE=1 ./run.sh mixed.js

# 冒烟测试通过后，跑完整的并发阶梯（100 → 1000 → 5000 VU，几分钟）
./run.sh mixed.js

# 也可以单独只跑其中一个场景
./run.sh search.js
./run.sh detail.js

# 指定压测目标地址（比如打线上/预发环境而不是本地）
BASE_URL=https://your-staging-api.example.com ./run.sh mixed.js
```

Mac/Windows 用 Docker Desktop 的话，`run.sh` 里的 `--network host` 在这两个平台上不生效，需要改成：
```bash
BASE_URL=http://host.docker.internal:4000 ./run.sh mixed.js
```
并在 `run.sh` 的 `docker run` 里把 `--network host` 换成 `--add-host=host.docker.internal:host-gateway`。

### 5. 看结果

k6 跑完会打印一份汇总，重点看 `http_req_duration` 这一行的 `p(50)` / `p(95)` / `p(99)`（这就是延迟目标要看的三个指标），以及 `http_req_failed` 的比例。`options.thresholds` 里已经把"延迟 <1s"编码成了通过/失败的判定标准（`search`/`detail` 各自的 p50<300ms、p95<800ms、p99<1000ms，可以在 `search.js`/`detail.js`/`mixed.js` 里按需调整），跑完 k6 会直接标出哪些 threshold 没达标。

### 6. 清理测试数据

压测完想把灌进去的假数据清掉：

```bash
npm run clean
```

按 `u_%` / `b_%` / `r_%` 前缀删除，不会碰真实用户/商家数据。

## 目录说明

```
load-test/
  src/
    cities.ts             # ~30 个真实城市，商家按人口权重分布到这些城市附近
    placement.ts           # 根据商家序号确定性算出经纬度/分类（seed 和 generate-tokens 共用，保证数据一致）
    seed.ts                 # COPY 流式写入 User / Business / Review
    generate-tokens.ts       # 签发 token 池 + 导出 k6 用的 JSON 数据
    clean.ts                  # 按前缀删除测试数据
  k6/
    lib/data.js                # k6 侧的 SharedArray 数据加载 + 加权选城市/生成 bbox 的工具函数
    search.js                   # 场景：GET /api/businesses（bbox 搜索）
    detail.js                    # 场景：GET /api/businesses/:id
    mixed.js                      # search + detail 组合场景，是主要压测入口
    data/                          # generate-tokens.ts 的输出（gitignore）
  run.sh                            # 用 Docker 跑 k6 的封装脚本
```
