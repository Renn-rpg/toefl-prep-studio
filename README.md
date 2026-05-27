# TOEFL Prep Studio

个人 TOEFL 备考全栈 Web 应用，集成 DeepSeek AI 实现智能评分与个性化学习计划。

## 功能概览

| 模块 | 功能 |
|------|------|
| **学习总览** | 雷达图、热力图、各科均分、连续学习天数统计 |
| **备考计划** | 填写水平/目标/日期 → AI 生成逐周中文学习计划 |
| **听力练习** | 浏览器 TTS 朗读 + 4 档语速 + 文本跟读 + 答题评分 |
| **阅读练习** | 文章阅读 + 词汇高亮点击释义 + 选择题 |
| **口语练习** | 录音 + 转录文本 → AI 三维评分（发音/流利度/内容） |
| **写作练习** | 字数统计编辑器 → AI 三维评分 + 修改示例 |
| **模拟考试** | 四节计时模考（阅读54分/听力41分/口语17分/写作50分） |
| **阶段评估** | 周测/月测成绩录入 + Recharts 折线趋势图 |

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + Vite + TypeScript + Tailwind CSS v4 + Recharts |
| 后端 | Python + FastAPI + SQLModel + SQLite |
| AI | DeepSeek API（JSON mode，中文反馈） |
| 语音 | 浏览器 SpeechSynthesis API（听力 TTS） |

## 快速开始

### 前置要求

- Python 3.10+（推荐 Miniconda）
- Node.js 18+
- DeepSeek API Key（[获取地址](https://platform.deepseek.com/)）

### 安装与启动

```bash
git clone https://github.com/Renn-rpg/toefl-prep-studio.git
cd toefl-prep-studio
```

**方式一：一键启动（Windows PowerShell）**

```powershell
powershell -File start.ps1
```

脚本会自动完成：环境检查 → 数据库初始化 → 启动后端 → 启动前端 → 打开浏览器。

**方式二：手动启动**

```bash
# 终端 1 — 后端
cd backend
pip install -r requirements.txt
cp .env.example .env          # 编辑 .env 填入 DEEPSEEK_API_KEY
python seed_db.py              # 首次运行，初始化种子数据
uvicorn main:app --reload --port 8000

# 终端 2 — 前端
cd frontend
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。

### 环境变量

在 `backend/.env` 中配置：

```
DEEPSEEK_API_KEY=your_key_here
```

## 项目结构

```
toefl-prep-studio/
├── backend/
│   ├── main.py                 # FastAPI 入口，注册路由 + CORS
│   ├── models.py               # SQLModel 表定义（10 张表）
│   ├── database.py             # SQLite 引擎 + session 依赖
│   ├── deepseek_client.py      # DeepSeek API 封装
│   ├── seed_db.py              # 种子数据（6听力/3阅读/6口语/6写作）
│   ├── routers/                # 8 个路由模块
│   │   ├── plan.py             # AI 生成学习计划
│   │   ├── listening.py        # 听力 CRUD + 评分
│   │   ├── speaking.py         # AI 口语评分
│   │   ├── reading.py          # 阅读 + 词汇高亮
│   │   ├── writing.py          # AI 写作评分
│   │   ├── mock.py             # 模考流程
│   │   ├── evaluation.py       # 阶段评估
│   │   └── progress.py         # Dashboard 数据聚合
│   └── tests/
│       └── test_routes.py      # 12 项测试（mock DeepSeek）
├── frontend/
│   └── src/
│       ├── pages/              # 8 个页面组件
│       ├── components/         # 侧边栏布局
│       ├── hooks/              # useMediaRecorder, useTimer
│       ├── lib/api.ts          # 类型安全 fetch 封装
│       └── types/index.ts      # TypeScript 接口定义
├── start.ps1                   # Windows 一键启动脚本
└── README.md
```

## 测试

```bash
cd backend
pytest tests/ -v --tb=short    # 12 tests, all pass
```

## API 文档

启动后端后访问 `http://localhost:8000/docs` 查看 Swagger 交互式文档。

## 设计说明

- **单用户设计**：无认证系统，所有数据存储在本地 SQLite 文件
- **AI 中文反馈**：所有 DeepSeek 调用的 system prompt 要求中文回复
- **暖色书斋风 UI**：Stone/Teal 配色 + 纸质纹理 + 中文衬线字体（Noto Serif SC）
- **听力 TTS**：使用浏览器内置 SpeechSynthesis API，零成本无需额外配置

## License

MIT
