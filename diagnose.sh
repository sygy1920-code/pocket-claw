#!/bin/bash

echo "=== Pocket Claw 诊断脚本 ==="
echo ""

echo "1. 当前目录:"
pwd
echo ""

echo "2. 检查 out/ 目录:"
ls -la out/ 2>&1 | head -10
echo ""

echo "3. 检查 package.json scripts:"
cat package.json | grep -A 5 '"scripts"'
echo ""

echo "4. 检查 electron-vite 版本:"
cat node_modules/electron-vite/package.json | grep '"version"'
echo ""

echo "5. 检查是否有 dist-electron 目录:"
if [ -d "dist-electron" ]; then
    echo "⚠️  发现旧的 dist-electron 目录！"
    ls -la dist-electron/
else
    echo "✓ 没有旧的 dist-electron 目录"
fi
echo ""

echo "6. 检查运行中的进程:"
ps aux | grep -i "pocket-claw\|electron-vite" | grep -v grep | head -5
echo ""

echo "=== 诊断完成 ==="
echo ""
echo "请运行: npm run dev"
