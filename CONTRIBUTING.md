
# 贡献指南 (Contributing Guide)

感谢你对 **lxserver** 项目感兴趣！我们要打造一个优秀的开源项目，离不开每一位开发者的贡献。

在提交代码之前，请花几分钟阅读以下指南，这将有助于我们快速审查和合并你的代码。

## 🌳 分支管理策略 (Branch Strategy)

为了保证主分支的稳定性，我们采用以下分支策略：

*   **`main`**: 生产环境与开发主分支，时刻保持稳定。**所有的 Pull Request (PR) 都必须合并到 `main` 分支**。
*   **`feature/xxx` 或 `fix/xxx`**: 你的开发分支。

> ⚠️ **注意**：请不要直接向 `main` 推送代码，应通过独立开发分支提交 PR。

## 🛠️ 开发流程 (Workflow)

### 1. Fork 本仓库
点击右上角的 "Fork" 按钮，将 `lxserver` 复制到你自己的 GitHub 账号下。

### 2. 克隆到本地
```bash
git clone https://github.com/<你的用户名>/lxserver.git
cd lxserver
```

### 3. 设置上游仓库 (Upstream)
你需要链接到源仓库 (bobcc4/lxserver)，以便同步最新的代码：
```bash
git remote add upstream https://github.com/bobcc4/lxserver.git
```

### 4. 创建分支
在开始工作前，请基于 `main` 分支创建一个新的分支：
```bash
# 先切换到 main 并更新
git checkout main
git pull upstream main

# 创建新分支 (例如: feat/add-login 或 fix/memory-leak)
git checkout -b feat/你的功能名称
```

### 5. 编写代码与提交
请保持代码整洁。提交信息 (Commit Message) 请清晰描述修改内容：
```bash
git add .
git commit -m "feat: 添加了用户登录接口"
```

## ⚔️ 关于合并冲突 (Resolving Conflicts)

在你开发的过程中，源仓库的 `main` 分支可能已经更新了。在提交 PR 之前，**你需要负责解决所有的冲突**，确保你的代码能顺利运行。

如果你提交 PR 后 GitHub 提示 "This branch has conflicts that must be resolved"，请按以下步骤在本地解决：

1.  **拉取上游最新的 main 代码**：
    ```bash
    git fetch upstream
    ```
2.  **将最新的 main 合并到你的分支**：
    ```bash
    # 确保你在你的开发分支上
    git merge upstream/main
    ```
3.  **手动解决冲突**：
    打开编辑器，找到标记为 `<<<<<<<` 和 `>>>>>>>` 的地方，修改代码，保留正确的部分。
4.  **提交解决后的代码**：
    ```bash
    git add .
    git commit -m "chore: resolve merge conflicts with main"
    git push origin feat/你的功能名称
    ```

**请不要在 GitHub 网页端点击 "Resolve conflicts" 按钮**，最好在本地 IDE 中测试无误后再推送。

## 🚀 提交 Pull Request (PR)

1.  将你的分支推送到你 Fork 的仓库：
    ```bash
    git push origin feat/你的功能名称
    ```
2.  在 GitHub 界面上，点击 "Compare & pull request"。
3.  **关键步骤**：确保 `base repository` 的目标分支选择的是 **`main`**。
4.  填写 PR 描述，说明你做了什么修改、解决了什么 Issue。
5.  等待 Maintainer 审查。如果需要修改，请直接在本地修改并 push，PR 会自动更新。

## 📝 提交规范建议
建议遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：
*   `feat`: 新功能
*   `fix`: 修复 Bug
*   `docs`: 文档修改
*   `style`: 代码格式修改 (不影响代码运行)
*   `refactor`: 代码重构
*   `chore`: 构建过程或辅助工具的变动

---
再次感谢你的贡献！Happy Coding! 
```
