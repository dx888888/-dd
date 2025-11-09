// ==UserScript==
// @name         自动验证码识别脚本
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  自动识别真人验证码并点击
// @author       You
// @match        https://roobotcode.zxca.me/index.php*
// @grant        GM_xmlhttpRequest
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
// ==/UserScript==

(function() {
    'use strict';

    // 配置信息
    const CONFIG = {
        token: 'gP6Ft0Sk6YlgOed4xCOhh56I35IbRkj0KswXlcOwcHQ',
        apiUrl: 'http://api.jfbym.com/api/YmServer/customApi',
        type: '88888'
    };

    // 日志函数
    function log(message) {
        console.log('[验证码识别] ' + message);
    }

    // 创建状态显示面板
    function createStatusPanel() {
        const panel = document.createElement('div');
        panel.id = 'captcha-status-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 10000;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            min-width: 250px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        panel.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px;">🤖 验证码识别状态</div>
            <div id="status-text">等待页面加载...</div>
            <div style="margin-top: 10px;">
                <button id="manual-start" style="padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer;">手动开始</button>
                <button id="manual-sort" style="padding: 5px 10px; background: #FF9800; color: white; border: none; border-radius: 3px; cursor: pointer; margin-left: 5px;">手动排序</button>
                <button id="close-panel" style="padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer; margin-left: 5px;">关闭</button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // 绑定事件
        document.getElementById('manual-start').addEventListener('click', startCaptchaRecognition);
        document.getElementById('manual-sort').addEventListener('click', async () => {
            try {
                await reorderCaptchaImages();
            } catch (error) {
                updateStatus('手动排序失败: ' + error.message);
            }
        });
        document.getElementById('close-panel').addEventListener('click', () => {
            panel.style.display = 'none';
        });
        
        return panel;
    }

    // 更新状态
    function updateStatus(message) {
        const statusText = document.getElementById('status-text');
        if (statusText) {
            statusText.textContent = message;
        }
        log(message);
    }

    // 修改网页文本
    function modifyPageText() {
        try {
            const h3Element = document.querySelector('h3');
            if (h3Element && h3Element.textContent.includes('请按顺序点击以下汉字：')) {
                h3Element.textContent = '请按红色数字顺序点击以下汉字：';
                updateStatus('已修改页面提示文本');
                log('页面文本已修改: ' + h3Element.textContent);
                return true;
            } else {
                log('未找到需要修改的h3元素或文本不匹配');
                return false;
            }
        } catch (error) {
            log('修改页面文本时出错: ' + error.message);
            return false;
        }
    }

    // 截取验证码区域
    function captureVerificationArea() {
        return new Promise((resolve, reject) => {
            const targetElement = document.querySelector('body > div');
            
            if (!targetElement) {
                reject(new Error('未找到验证码区域'));
                return;
            }

            // 先修改页面文本
            modifyPageText();
            
            updateStatus('正在截取验证码图片...');
            
            html2canvas(targetElement, {
                useCORS: true,
                allowTaint: true,
                scale: 1,
                logging: false,
                width: targetElement.scrollWidth,
                height: targetElement.scrollHeight
            }).then(canvas => {
                const base64Image = canvas.toDataURL('image/png');
                // 移除data:image/png;base64,前缀
                const base64Data = base64Image.replace(/^data:image\/png;base64,/, '');
                resolve(base64Data);
            }).catch(error => {
                reject(error);
            });
        });
    }

    // 发送到API识别
    function sendToAPI(base64Image) {
        return new Promise((resolve, reject) => {
            updateStatus('正在发送到API识别...');
            
            const postData = {
                image: base64Image,
                token: CONFIG.token,
                type: CONFIG.type
            };

            // 添加超时处理
            const timeoutId = setTimeout(() => {
                updateStatus('API请求超时，请检查网络连接');
                reject(new Error('API请求超时'));
            }, 60000); // 60秒超时

            GM_xmlhttpRequest({
                method: 'POST',
                url: CONFIG.apiUrl,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(postData),
                timeout: 60000,
                onload: function(response) {
                    clearTimeout(timeoutId);
                    updateStatus('API请求完成，正在处理响应...');
                    
                    try {
                        log('API响应状态: ' + response.status);
                        log('API响应内容: ' + response.responseText);
                        
                        if (response.status !== 200) {
                            reject(new Error('API请求失败，状态码: ' + response.status));
                            return;
                        }
                        
                        const result = JSON.parse(response.responseText);
                        log('解析后的API响应: ' + JSON.stringify(result));
                        
                        if (result.code === 10000) {
                            updateStatus('已接收到坐标: ' + result.data.data);
                            resolve(result.data.data);
                        } else {
                            updateStatus('API返回错误: ' + (result.msg || '未知错误'));
                            reject(new Error('API错误: ' + (result.msg || '未知错误')));
                        }
                    } catch (error) {
                        updateStatus('解析API响应失败: ' + error.message);
                        reject(new Error('解析API响应失败: ' + error.message));
                    }
                },
                onerror: function(error) {
                    clearTimeout(timeoutId);
                    updateStatus('网络请求失败: ' + error.message);
                    reject(new Error('网络请求失败: ' + error.message));
                },
                ontimeout: function() {
                    clearTimeout(timeoutId);
                    updateStatus('API请求超时');
                    reject(new Error('API请求超时'));
                }
            });
        });
    }

    // 解析坐标字符串
    function parseCoordinates(coordString) {
        if (!coordString) {
            throw new Error('坐标字符串为空');
        }
        
        const coordinates = [];
        const pairs = coordString.split('|');
        
        for (const pair of pairs) {
            const [x, y] = pair.split(',').map(coord => parseInt(coord.trim()));
            if (!isNaN(x) && !isNaN(y)) {
                coordinates.push({ x, y });
            }
        }
        
        return coordinates;
    }

    // 点击验证按钮
    async function clickSubmitButton() {
        try {
            updateStatus('正在查找验证按钮...');
            
            // 查找验证按钮
            const submitBtn = document.querySelector('#submitBtn');
            if (!submitBtn) {
                updateStatus('未找到验证按钮');
                console.log('未找到验证按钮 #submitBtn');
                return;
            }
            
            updateStatus('找到验证按钮，准备点击...');
            console.log('找到验证按钮，准备点击');
            
            // 等待一秒后点击验证按钮
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            submitBtn.click();
            updateStatus('验证按钮已点击!');
            console.log('验证按钮已点击');
            
        } catch (error) {
            console.error('点击验证按钮时出错:', error);
            updateStatus('点击验证按钮时出错: ' + error.message);
        }
    }

    // 执行点击
    function performClicks(coordinates) {
        return new Promise((resolve) => {
            updateStatus(`正在点击 ${coordinates.length} 个坐标...`);
            
            const targetElement = document.querySelector('body > div');
            if (!targetElement) {
                throw new Error('未找到目标元素');
            }
            
            const rect = targetElement.getBoundingClientRect();
            let clickIndex = 0;
            
            function clickNext() {
                if (clickIndex >= coordinates.length) {
                    updateStatus('所有坐标点击完成!');
                    resolve();
                    return;
                }
                
                const coord = coordinates[clickIndex];
                const actualX = rect.left + coord.x;
                const actualY = rect.top + coord.y;
                
                updateStatus(`正在点击第 ${clickIndex + 1}/${coordinates.length} 个坐标: (${coord.x}, ${coord.y})`);
                
                // 创建点击事件
                const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    clientX: actualX,
                    clientY: actualY
                });
                
                // 找到实际的点击目标
                const clickTarget = document.elementFromPoint(actualX, actualY);
                if (clickTarget) {
                    clickTarget.dispatchEvent(clickEvent);
                    
                    // 添加视觉反馈
                    showClickFeedback(actualX, actualY);
                } else {
                    log(`警告: 坐标 (${actualX}, ${actualY}) 处未找到可点击元素`);
                }
                
                clickIndex++;
                
                // 延迟执行下一次点击
                setTimeout(clickNext, 500);
            }
            
            clickNext();
        });
    }

    // 显示点击反馈
    function showClickFeedback(x, y) {
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            left: ${x - 10}px;
            top: ${y - 10}px;
            width: 20px;
            height: 20px;
            background: red;
            border-radius: 50%;
            z-index: 10001;
            pointer-events: none;
            animation: clickFeedback 1s ease-out forwards;
        `;
        
        // 添加CSS动画
        if (!document.getElementById('click-feedback-style')) {
            const style = document.createElement('style');
            style.id = 'click-feedback-style';
            style.textContent = `
                @keyframes clickFeedback {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(3); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 1000);
    }

    // 分析图片红色数字特征
    function analyzeRedFeatures(imgElement) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = imgElement.naturalWidth || imgElement.width || 100;
        canvas.height = imgElement.naturalHeight || imgElement.height || 100;
        
        try {
            ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const totalPixels = data.length / 4;
            
            let redPixels = 0;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                if (r > 120 && r > g + 25 && r > b + 25) redPixels++;
            }
            
            return redPixels / totalPixels;
        } catch (error) {
            log('分析图片红色特征失败: ' + error.message);
            return 0;
        }
    }

    // 重新排序验证码图片
    function reorderCaptchaImages() {
        return new Promise((resolve, reject) => {
            try {
                updateStatus('开始验证码图片重新排序...');
                
                const container = document.querySelector('body > div > div.captcha-container');
                if (!container) {
                    reject(new Error('未找到验证码容器'));
                    return;
                }

                const images = container.querySelectorAll('img');
                if (images.length !== 3) {
                    reject(new Error(`图片数量不正确，期望3张，实际找到${images.length}张`));
                    return;
                }

                log('开始红色数字识别排序...');
                
                // 分析每张图片的红色特征
                const imageFeatures = [];
                images.forEach((img, index) => {
                    const redRatio = analyzeRedFeatures(img);
                    imageFeatures.push({
                        element: img.cloneNode(true),
                        index: index,
                        redRatio: redRatio
                    });
                    log(`图片${index + 1}: 红色比例=${redRatio.toFixed(6)}`);
                });

                // 按红色像素比例排序
                const sortedFeatures = [...imageFeatures].sort((a, b) => a.redRatio - b.redRatio);
                
                // 分配标识：01(最少红色) -> 03(中等红色) -> 02(最多红色)
                const results = new Array(3);
                sortedFeatures.forEach((feature, sortIndex) => {
                    let label;
                    if (sortIndex === 0) {
                        label = '01'; // 最少红色
                    } else if (sortIndex === 1) {
                        label = '03'; // 中等红色
                    } else {
                        label = '02'; // 最多红色
                    }
                    results[feature.index] = label;
                    log(`图片${feature.index + 1} -> ${label}`);
                });

                // 按照01、02、03的顺序重新排列
                const orderedImages = new Array(3);
                imageFeatures.forEach((data, index) => {
                    const label = results[index];
                    const targetIndex = parseInt(label) - 1;
                    orderedImages[targetIndex] = data.element;
                });

                // 清空容器并重新添加排序后的图片
                container.innerHTML = '';
                orderedImages.forEach(img => {
                    if (img) container.appendChild(img);
                });

                updateStatus('验证码图片重新排序完成');
                log('图片重新排序完成');
                resolve();
                
            } catch (error) {
                updateStatus('验证码图片排序失败: ' + error.message);
                reject(error);
            }
        });
    }

    // 检查验证码数量
    function checkCaptchaCount() {
        try {
            const captchaContainer = document.querySelector('.captcha-container');
            if (!captchaContainer) {
                log('未找到验证码容器');
                return { valid: false, count: 0, message: '未找到验证码容器' };
            }
            
            const images = captchaContainer.querySelectorAll('img.char-image');
            const imageCount = images.length;
            
            log(`检测到验证码图片数量: ${imageCount}`);
            
            if (imageCount === 3) {
                return { valid: true, count: imageCount, message: '验证码数量正确，可以开始识别' };
            } else if (imageCount > 3) {
                return { valid: false, count: imageCount, message: '验证码数量过多，等待页面刷新' };
            } else {
                return { valid: false, count: imageCount, message: '验证码数量不足，等待加载完成' };
            }
        } catch (error) {
            log('检查验证码数量时出错: ' + error.message);
            return { valid: false, count: 0, message: '检查验证码数量时出错: ' + error.message };
        }
    }

    // 主要识别流程
    async function startCaptchaRecognition() {
        try {
            updateStatus('开始验证码识别流程...');
            
            // 0. 检查验证码数量
            const captchaCheck = checkCaptchaCount();
            if (!captchaCheck.valid) {
                updateStatus(captchaCheck.message);
                log('验证码数量检查失败: ' + captchaCheck.message);
                return;
            }
            
            updateStatus(`验证码数量检查通过 (${captchaCheck.count}个)，开始排序流程`);
            
            // 1. 重新排序验证码图片
            await reorderCaptchaImages();
            
            // 等待排序完成后再截图
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 2. 截取验证码
            const base64Image = await captureVerificationArea();
            updateStatus('截图完成，图片大小: ' + (base64Image.length / 1024).toFixed(2) + 'KB');
            
            // 3. 发送到API
            const coordinateString = await sendToAPI(base64Image);
            
            // 4. 解析坐标
            const coordinates = parseCoordinates(coordinateString);
            updateStatus(`解析到 ${coordinates.length} 个坐标点，准备开始点击`);
            
            // 5. 执行点击
            await performClicks(coordinates);
            
            // 6. 点击验证按钮
            await clickSubmitButton();
            
            updateStatus('验证码识别和点击流程完成!');
            
        } catch (error) {
            updateStatus('错误: ' + error.message);
            log('详细错误信息: ' + error.stack);
        }
    }

    // 检查是否为目标页面
    function isTargetPage() {
        const url = window.location.href;
        return url.includes('roobotcode.zxca.me/index.php') && 
               url.includes('TGID=') && 
               url.includes('Time=') && 
               url.includes('Backid=') && 
               url.includes('Fromid=') && 
               url.includes('Singkey=');
    }

    // 等待页面元素加载
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            function check() {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('等待元素超时: ' + selector));
                } else {
                    setTimeout(check, 100);
                }
            }
            
            check();
        });
    }

    // 初始化脚本
    async function initialize() {
        if (!isTargetPage()) {
            log('当前页面不是目标页面，脚本不会运行');
            return;
        }
        
        log('检测到目标页面，初始化验证码识别脚本...');
        
        // 创建状态面板
        const panel = createStatusPanel();
        
        try {
            // 等待验证码区域加载
            updateStatus('等待验证码区域加载...');
            await waitForElement('body > div');
            
            updateStatus('页面加载完成，可以开始识别');
            
            // 自动延迟3秒后开始识别
            setTimeout(() => {
                updateStatus('自动开始识别...');
                startCaptchaRecognition();
            }, 3000);
            
        } catch (error) {
            updateStatus('初始化失败: ' + error.message);
        }
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();