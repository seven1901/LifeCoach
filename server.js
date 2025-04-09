// 导入所需模块
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

// 创建Express应用
const app = express();

// 配置中间件
app.use(cors()); // 解决CORS问题
app.use(express.json()); // 解析JSON请求体

// API密钥
const API_KEY = '92be235f-bd41-4d79-847e-665a2ec61af9';

// 火山方舟API端点
const API_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// 处理聊天请求的路由
app.post('/chat', async (req, res) => {
    try {
        // 获取请求中的消息
        const { messages } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: '请求格式不正确' });
        }
        
        // 设置请求头
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        };
        
        // 准备请求体
        const requestBody = {
            model: 'ep-20250409110620-rd5qd',
            messages: messages,
            stream: true,  // 启用流式输出
            temperature: 0.6  // 设置温度参数
        };
        
        // 设置响应头，启用流式传输
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');
        
        // 发送请求到火山方舟API
        const apiResponse = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody),
            timeout: 60000  // 设置60秒超时
        });
        
        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error('API请求失败:', apiResponse.status, errorText);
            return res.status(apiResponse.status).send('API请求失败: ' + errorText);
        }
        
        // 处理流式响应
        const reader = apiResponse.body;
        
        reader.on('data', (chunk) => {
            // 解析数据块
            const chunkText = chunk.toString();
            
            // 处理SSE格式的数据
            const lines = chunkText.split('\n');
            for (const line of lines) {
                if (line.startsWith('data:')) {
                    try {
                        const data = JSON.parse(line.substring(5));
                        if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                            // 发送内容到客户端
                            res.write(data.choices[0].delta.content);
                        }
                    } catch (e) {
                        console.error('解析数据出错:', e);
                    }
                }
            }
        });
        
        reader.on('end', () => {
            res.end();
        });
        
        reader.on('error', (err) => {
            console.error('读取流出错:', err);
            res.status(500).end('读取流出错');
        });
        
    } catch (error) {
        console.error('处理请求出错:', error);
        res.status(500).send('服务器内部错误: ' + error.message);
    }
});

// 设置服务器端口
const PORT = process.env.PORT || 3000;

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});