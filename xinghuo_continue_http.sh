#!/bin/bash
# xinghuo_continue_http.sh
# Bash 持续对话 HTTP 调用脚本 (macOS/Linux)

# 默认参数
reason="${1:-任务已完成}"
workspace="${2:-/Users/yunlong.jiang/Downloads/english_cet4_app}"

# 读取端口文件
port_file="${workspace}/.xinghuo_continue_port"
if [ -f "$port_file" ]; then
    port=$(cat "$port_file" | tr -d '\n\r')
else
    port="54424"
fi

# 构建 JSON 请求体
timestamp=$(date +%s%3N)
json_body=$(cat <<EOF
{
    "jsonrpc": "2.0",
    "id": ${timestamp},
    "method": "tools/call",
    "params": {
        "name": "xinghuo_continue",
        "arguments": {
            "reason": "${reason}",
            "workspace": "${workspace}"
        }
    }
}
EOF
)

# 发送 HTTP 请求
response=$(curl -s -X POST "http://localhost:${port}" \
    -H "Content-Type: application/json; charset=utf-8" \
    -d "${json_body}" \
    --max-time 300)

# 解析并输出结果
if [ -n "$response" ]; then
    # 尝试使用 jq 解析 JSON（如果可用）
    if command -v jq &> /dev/null; then
        echo "$response" | jq -r '.result.content[0].text // empty'
    else
        # 没有 jq，直接输出原始响应
        echo "$response"
    fi
else
    echo "调用失败: 无响应"
    exit 1
fi
