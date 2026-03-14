#!/bin/bash
# Pocket Claw 启动脚本 - 确保环境正确

echo "=== Pocket Claw 开发模式启动 ==="
echo ""

# 清除可能导致问题的环境变量
unset ELECTRON_RUN_AS_NODE
unset ELECTRON_NO_ATTACH_CONSOLE

# 显示当前环境
echo "当前目录: $(pwd)"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo ""

# 检查 electron-vite
if ! command -v electron-vite &> /dev/null; then
    if [ -f "./node_modules/.bin/electron-vite" ]; then
        echo "✓ 使用本地 electron-vite"
    else
        echo "❌ electron-vite 未安装"
        echo "请运行: npm install"
        exit 1
    fi
fi

# 检查配置文件
if [ ! -f "electron.vite.config.ts" ]; then
    echo "❌ 找不到 electron.vite.config.ts"
    exit 1
fi

echo "✓ 配置检查通过"
echo ""
echo "启动开发模式..."
echo ""

# 运行开发模式
npm run dev
