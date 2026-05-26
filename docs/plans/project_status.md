# PetMind — 当前状态 & 下一步优化方向

> 最后更新：2026-05-22
> 用途：交接文档，帮助新 Agent 快速理解项目现状并继续优化

---

## 一、项目简介

PetMind 是一个桌面 AI 宠物（类 QQ 宠物），感知用户环境（时间、天气、屏幕使用时长），由 AI 决定宠物状态。支持两种运行模式：

- **Web 版**：`npm run dev` → `http://localhost:5757`
- **桌面浮悬窗**：`npm run electron:dev`（透明 frameless 窗口，猫咪浮在屏幕上可拖动）

---

## 二、技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19, Vite 8, Tailwind CSS v4, Framer Motion |
| AI | OpenAI 兼容 SDK（接阿里云 DashScope / Qwen），环境变量配置 |
| 桌面 | Electron 42 — 透明 frameless, alwaysOnTop, skipTaskbar |
| 持久化 | localStorage（习惯列表、聊天历史、学习摘要缓存、新闻缓存） |

---

## 三、目录结构

```
petmind/
├── electron/
│   ├── main.cjs          # 主进程：透明全屏窗口，默认端口 5757
│   ├── preload.cjs       # contextBridge: isElectron, setMouseIgnore, getScreenSize
│   └── launch.cjs        # 启动前自动 kill 旧 Electron 进程（解决单例锁问题）
├── src/
│   ├── App.jsx           # 路由：isElectron → DesktopApp，否则 WebApp
│   ├── components/
│   │   ├── DesktopApp.jsx     # 桌面浮窗主组件（猫咪 + 气泡）
│   │   ├── HabitsDrawer.jsx   # Web 版习惯配置抽屉
│   │   ├── ChatSection.jsx    # Web 版折叠聊天区
│   │   ├── Pet.jsx            # Web 版宠物组件（9 种状态）
│   │   ├── HabitCard.jsx      # 消息 + 操作按钮
│   │   ├── NurtureMenu.jsx    # 养成菜单（Web 版）
│   │   ├── GrowthPanel.jsx    # 成长面板（Web 版）
│   │   └── AgentLog.jsx       # Agent 日志面板（Web 版）
│   ├── hooks/
│   │   ├── useHabits.js        # 习惯列表（localStorage 持久化）
│   │   ├── useChatHistory.js   # 聊天历史（最多 50 条，localStorage）
│   │   ├── useSensors.js       # 传感器聚合（时间 + 天气 + 屏幕时长）
│   │   ├── useWeather.js       # OpenWeatherMap API
│   │   ├── useScreenTime.js    # 鼠标/键盘空闲检测，5 分钟暂停
│   │   ├── useGrowthSystem.js  # 4 阶段成长、成就、stats 衰减
│   │   ├── useLearningCache.js # 学习摘要每日缓存
│   │   └── useNewsCache.js     # 新闻摘要每日缓存
│   └── services/
│       └── claudeAgent.js      # runAgent（决策循环）+ chatWithPet（对话）
└── public/
    ├── cat_normal.png
    ├── cat_learning.png
    ├── cat_exercise.png
    ├── cat_sleepy.png
    └── cat_thirsty.png
```

---

## 四、当前完成功能

### 桌面浮悬窗（DesktopApp）

| 功能 | 说明 |
|------|------|
| 透明全屏窗口 | 猫咪浮在桌面上，鼠标穿透（`setIgnoreMouseEvents + elementFromPoint`）|
| 可拖动 | Framer Motion drag，可拖到屏幕任意位置 |
| 点击弹出气泡 | 3 个 tab：📅今日 / 🔔提醒 / 💬对话 |
| 今日 tab | 喂食按钮 + 早报（早上 8-10 点 Agent 返回新闻时显示）|
| 提醒 tab | 显示习惯列表，点完成标记并倒计时 |
| 对话 tab | 直接与猫咪 AI 对话（`chatWithPet`），保留单次会话历史 |
| Agent 决策 | 启动时触发，每 10 分钟自动运行，决定宠物状态 |
| 重启修复 | `launch.cjs` 启动前自动 kill 旧进程，解决单例锁和端口问题 |

### Web 版（WebApp）

| 功能 | 说明 |
|------|------|
| 宠物渲染 | 9 种状态（normal/happy/thirsty/sleepy/exercise/rainy/hot/learning/news）|
| 传感器状态栏 | 显示天气、屏幕使用时长、当前时间 |
| Agent 决策 + 日志 | 可视化 Agent 思考日志，手动触发 |
| 习惯配置抽屉 | 左上角 ⚙️ 按钮，可增删提醒任务，localStorage 持久化 |
| 折叠聊天区 | 页面底部「💬 和猫咪聊天」，展开/折叠，带时间戳，localStorage 持久化 |
| 养成系统 | 4 阶段成长、4 个成就、饱食/心情 stats 衰减 |
| 学习摘要 | 每日一次，localStorage 缓存 |
| 新闻摘要 | 早晨 8-10 点，每日缓存 |

---

## 五、环境变量（.env）

```
VITE_AI_API_KEY=sk-...              # 阿里云 DashScope API Key（必填）
VITE_AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
VITE_AI_MODEL=qwen3.5-35b-a3b
VITE_WEATHER_API_KEY=...            # OpenWeatherMap（可选，不填降级为 Clear/22°C）
VITE_WEATHER_CITY=Beijing
```

---

## 六、已知遗留问题

| # | 问题 | 位置 |
|---|------|------|
| 1 | 桌面版提醒 tab 使用硬编码 `DEFAULT_HABITS`，不读 `useHabits` | `DesktopApp.jsx:282` |
| 2 | 桌面版对话 tab 历史不持久化（关闭气泡即清空） | `DesktopApp.jsx` chatMsgs state |
| 3 | `useWeather` 只在挂载时获取一次，长时间运行天气数据会过时 | `useWeather.js` |
| 4 | 桌面版气泡高度固定，对话 tab 消息多时布局拥挤 | `DesktopApp.jsx` POPUP_H |
| 5 | 早报仅在当次 Agent 运行时存在，重启 Electron 后消失 | `DesktopApp.jsx` newsContent state |

---

## 七、下一步优化方向

### 优先级 P0（影响核心体验）

**1. 桌面提醒 tab 接入 useHabits**
- 问题：提醒 tab 显示的是硬编码 `DEFAULT_HABITS`，Web 版配置的习惯无法同步到桌面
- 方案：`DesktopApp` 引入 `useHabits` hook，`RemindTab` 使用 hook 数据
- 文件：`src/components/DesktopApp.jsx`

**2. 桌面对话历史持久化**
- 问题：关闭气泡后聊天记录清空，用户体验割裂
- 方案：`DesktopApp` 引入 `useChatHistory` hook，`ChatTab` 改为读写持久化历史
- 文件：`src/components/DesktopApp.jsx`

**3. 早报持久化到 newsCache**
- 问题：`newsContent` 存在 React state，重启 Electron 后消失
- 方案：启动时从 `getNewsCache()` 读取已有缓存初始化 `newsContent`
- 文件：`src/components/DesktopApp.jsx`，约 2 行改动

---

### 优先级 P1（体验改善）

**4. 天气定时刷新**
- 方案：`useWeather` 加 `setInterval`，每 30 分钟重新请求一次
- 文件：`src/hooks/useWeather.js`

**5. 桌面版用户偏好配置（学习主题）**
- 问题：`DEFAULT_PREFS.learningTopic` 硬编码为"AI大模型"
- 方案：`localStorage` 存储学习偏好，桌面气泡提醒 tab 加简单设置入口
- 文件：新建 `src/hooks/usePrefs.js`，修改 `DesktopApp.jsx`

**6. 气泡高度自适应**
- 问题：对话 tab 消息多时固定高度导致布局拥挤
- 方案：`POPUP_H` 根据 activeTab 动态计算（today: 220, remind: 240, chat: 300）
- 文件：`src/components/DesktopApp.jsx` updateBubblePos 函数

---

### 优先级 P2（新功能）

**7. 提醒推送通知**
- 习惯到时间时通过 Electron `Notification` API 发桌面通知
- 文件：`electron/main.cjs`（新增 IPC），`src/hooks/useHabits.js`（定时检查）

**8. 猫咪皮肤/状态图切换**
- 当前 `rainy`/`happy`/`news` 都复用 `cat_normal.png`
- 方案：补充对应状态图片，更新 `STATE_IMG` 映射
- 文件：`public/` 目录 + `src/components/DesktopApp.jsx:7-17`

**9. Web 版学习偏好配置**
- 在 HabitsDrawer 里加"学习主题"和"新闻偏好"设置
- 接入 `usePrefs` hook，传给 `runAgent`

**10. 多显示器支持**
- 当前窗口初始位置基于主显示器 workArea
- 方案：`getScreenSize` 改为返回所有显示器，用户可选择停靠屏幕

---

## 八、如何启动

```bash
# 安装依赖（首次）
npm install

# 启动 Web 版
npm run dev

# 启动桌面浮悬窗（需要 Vite 先跑起来）
npm run electron:dev

# 如果 Electron 无响应，手动清理
powershell -Command "Stop-Process -Name electron -Force -ErrorAction SilentlyContinue"
powershell -Command "Stop-Process -Name node -Force -ErrorAction SilentlyContinue"
# 然后重新 npm run dev 再 npm run electron:dev
```

---

## 九、关键架构说明（踩坑记录）

| 问题 | 解决方案 |
|------|----------|
| Electron 鼠标穿透后无法点击 | `document.mousemove + elementFromPoint + data-interactive` 属性，不用 onMouseEnter/Leave |
| 重启 Electron 失败 | `launch.cjs` 启动前 `taskkill /F /IM electron.exe`，解决单例锁 |
| Vite 端口与 Electron 不匹配 | `main.cjs` 默认端口改为 5757（与 vite.config.js 一致） |
| VS Code 注入 `ELECTRON_RUN_AS_NODE` | `launch.cjs` 中 `delete env.ELECTRON_RUN_AS_NODE` |
| AI SDK | 使用 `openai` 包（OpenAI 兼容接口），接阿里云 DashScope，不用 `@anthropic-ai/sdk` |
