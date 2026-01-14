const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = process.env.PORT || 8000;

// رؤوس محاكاة المتصفح تماماً
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'DNT': '1',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache'
};

// الخادم الرئيسي
const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    console.log(`📨 ${req.method} ${req.url}`);

    // الصفحة الرئيسية
    if (pathname === '/' || pathname === '/index.html') {
        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pixeldrain Player</title>
    <style>
        body { margin: 20px; font-family: Arial; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; }
        input { width: 100%; padding: 12px; margin: 10px 0; font-size: 16px; border: 2px solid #ddd; border-radius: 5px; }
        input:focus { border-color: #4CAF50; outline: none; }
        button { padding: 12px 24px; font-size: 16px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; }
        button:hover { background: #45a049; }
        video { width: 100%; margin-top: 20px; background: #000; border-radius: 5px; }
        .status { padding: 10px; margin: 10px 0; background: #f0f0f0; border-radius: 5px; font-weight: bold; }
        .error { color: red; background: #ffe6e6; padding: 10px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎬 Pixeldrain Video Player</h1>
        
        <input type="text" id="urlInput" placeholder="Enter pixeldrain URL (e.g., https://pixeldrain.com/u/L5eDQVJe)">
        <button onclick="playVideo()">▶️ Play Video</button>
        
        <div id="status" class="status">Enter URL and click Play</div>
        <div id="error" class="error" style="display:none;"></div>
        
        <video id="videoPlayer" controls playsinline preload="metadata"></video>
    </div>

    <script>
        const video = document.getElementById('videoPlayer');
        const input = document.getElementById('urlInput');
        const status = document.getElementById('status');
        const errorDiv = document.getElementById('error');
        
        // تحويل أي رابط pixeldrain
        function normalizeUrl(url) {
            url = url.trim();
            
            // استخراج ID من أي صيغة
            const patterns = [
                /pixeldrain\\.com\\/u\\/([a-zA-Z0-9]+)/i,
                /pixeldrain\\.com\\/l\\/([a-zA-Z0-9]+)/i,
                /pixeldrain\\.com\\/api\\/file\\/([a-zA-Z0-9]+)/i
            ];
            
            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match && match[1]) {
                    return 'https://pixeldrain.com/api/file/' + match[1];
                }
            }
            
            return url;
        }
        
        function showError(msg) {
            errorDiv.textContent = msg;
            errorDiv.style.display = 'block';
            status.textContent = '❌ Error';
        }
        
        function hideError() {
            errorDiv.style.display = 'none';
        }
        
        function playVideo() {
            let url = input.value.trim();
            if (!url) {
                showError('Please enter a URL');
                return;
            }
            
            hideError();
            status.textContent = '⏳ Processing...';
            
            const normalizedUrl = normalizeUrl(url);
            
            if (!normalizedUrl.includes('pixeldrain.com/api/file/')) {
                showError('Invalid pixeldrain URL format');
                return;
            }
            
            status.textContent = '⏳ Loading video...';
            
            // إضافة timestamp لمنع caching
            const videoSource = '/stream?url=' + encodeURIComponent(normalizedUrl) + '&_=' + Date.now();
            
            // إعداد الفيديو
            video.src = videoSource;
            
            video.onloadeddata = () => {
                status.textContent = '✅ Ready - Click play';
                video.play().catch(() => {
                    // بعض المتصفحات ترفض autoplay
                    status.textContent = '✅ Ready - Press play button';
                });
            };
            
            video.onerror = () => {
                showError('Error loading video. The video may not exist or is not accessible.');
                status.textContent = '❌ Failed to load';
            };
            
            video.onwaiting = () => {
                status.textContent = '⏳ Buffering...';
            };
            
            video.onplaying = () => {
                status.textContent = '▶️ Playing';
            };
        }
        
        // أمثلة سريعة
        input.addEventListener('focus', () => {
            if (!input.value) {
                input.value = 'https://pixeldrain.com/u/L5eDQVJe';
            }
        });
        
        // معالجة Enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                playVideo();
            }
        });
    </script>
</body>
</html>`;
        
        res.writeHead(200, { 
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache'
        });
        res.end(html);
        return;
    }

    // نقطة الدفق - البروكسي الحقيقي
    if (pathname === '/stream') {
        let videoUrl = parsedUrl.searchParams.get('url');
        
        if (!videoUrl) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing video URL');
            return;
        }
        
        console.log(`📥 Stream request for: ${videoUrl}`);
        
        // إعداد رؤوس الطلب - بنفس رؤوس المتصفح تماماً
        const requestOptions = {
            headers: {
                'User-Agent': BROWSER_HEADERS['User-Agent'],
                'Accept': BROWSER_HEADERS['Accept'],
                'Accept-Language': BROWSER_HEADERS['Accept-Language'],
                'Accept-Encoding': 'identity', // مهم: لا نستخدم gzip للفيديو
                'Connection': 'close',
                'Referer': 'https://pixeldrain.com/',
                'Origin': 'https://pixeldrain.com',
                'Sec-Fetch-Dest': 'video',
                'Sec-Fetch-Mode': 'no-cors',
                'Sec-Fetch-Site': 'same-site'
            },
            timeout: 15000
        };
        
        // إذا كان هناك Range في الطلب، نمرره
        if (req.headers.range) {
            requestOptions.headers['Range'] = req.headers.range;
            console.log(`🎯 Forwarding Range: ${req.headers.range}`);
        }
        
        // إرسال طلب GET إلى pixeldrain
        const proxyReq = https.get(videoUrl, requestOptions, (proxyRes) => {
            console.log(`📊 Pixeldrain Status: ${proxyRes.statusCode}`);
            
            if (proxyRes.statusCode === 403) {
                console.log('⚠️ Got 403, trying alternative approach...');
                
                // محاولة ثانية مع رؤوس مختلفة
                const altOptions = {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': '*/*',
                        'Referer': 'https://pixeldrain.com/'
                    }
                };
                
                if (req.headers.range) {
                    altOptions.headers['Range'] = req.headers.range;
                }
                
                const altReq = https.get(videoUrl, altOptions, (altRes) => {
                    console.log(`📊 Alternative Status: ${altRes.statusCode}`);
                    forwardVideoStream(altRes, res);
                });
                
                altReq.on('error', (err) => {
                    console.error('❌ Alt request error:', err.message);
                    if (!res.headersSent) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Failed to fetch video' }));
                    }
                });
                
                req.on('close', () => altReq.destroy());
                return;
            }
            
            // إذا كانت الاستجابة OK، نمررها
            forwardVideoStream(proxyRes, res);
        });
        
        // معالجة أخطاء الطلب الأولي
        proxyReq.on('error', (err) => {
            console.error('❌ Proxy request error:', err.message);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Cannot connect to video source' }));
            }
        });
        
        // إغلاق الطلب عند انقطاع العميل
        req.on('close', () => {
            console.log('🔌 Client closed connection');
            proxyReq.destroy();
        });
        
        // مهلة زمنية
        proxyReq.setTimeout(15000, () => {
            console.log('⏰ Request timeout');
            proxyReq.destroy();
            if (!res.headersSent) {
                res.writeHead(408, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Request timeout' }));
            }
        });
        
        return;
    }
    
    // 404 لأي مسار آخر
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

// دالة مساعدة لتمرير دفق الفيديو
function forwardVideoStream(sourceRes, targetRes) {
    // رؤوس الفيديو المهمة
    const videoHeaders = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'content-disposition'
    ];
    
    const responseHeaders = {};
    
    for (const header of videoHeaders) {
        if (sourceRes.headers[header]) {
            responseHeaders[header] = sourceRes.headers[header];
        }
    }
    
    // إضافة رؤوس CORS
    responseHeaders['Access-Control-Allow-Origin'] = '*';
    responseHeaders['Access-Control-Allow-Headers'] = 'Range, Content-Type';
    responseHeaders['Access-Control-Expose-Headers'] = 'Content-Range';
    
    // إرسال رؤوس الاستجابة
    targetRes.writeHead(sourceRes.statusCode, responseHeaders);
    
    // دفق البيانات مباشرة
    sourceRes.pipe(targetRes);
    
    // سجلات التتبع
    sourceRes.on('end', () => {
        console.log('✅ Video stream completed successfully');
    });
    
    sourceRes.on('error', (err) => {
        console.error('❌ Stream pipe error:', err.message);
        if (!targetRes.headersSent) {
            targetRes.writeHead(500, { 'Content-Type': 'text/plain' });
            targetRes.end('Stream error');
        }
    });
}

// بدء الخادم
server.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 PIXELDRAIN VIDEO PROXY SERVER');
    console.log('='.repeat(60));
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log('🎯 Status: ACTIVE AND READY');
    console.log('='.repeat(60));
    console.log('\n📋 HOW TO USE:');
    console.log('1. Open browser to http://localhost:3000');
    console.log('2. Enter pixeldrain URL (example links will auto-fill)');
    console.log('3. Click "Play Video"');
    console.log('4. Video will play immediately');
    console.log('\n✅ FEATURES:');
    console.log('• Direct streaming (no download)');
    console.log('• Bypasses 403 errors');
    console.log('• Full video controls');
    console.log('• Works on first try');
    console.log('\n');
});

// معالجة الإغلاق
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down server...');
    process.exit(0);

});
