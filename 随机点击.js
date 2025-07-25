// ==UserScript==
// @name         随机点击器
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在tianai-captcha区域进行多种移动端随机点击
// @author       You
// @match        https://yanzm.gwn81.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // 配置
    const CONFIG = {
        CLICK_INTERVAL: 5000, // 5秒间隔
        TARGET_SELECTOR: '#tianai-captcha',
        LOG_PREFIX: '[随机点击器]'
    };
    
    // 日志函数
    function log(message) {
        console.log(`${CONFIG.LOG_PREFIX} ${new Date().toLocaleTimeString()} - ${message}`);
    }
    
    // 获取随机坐标
    function getRandomCoordinates(element) {
        const rect = element.getBoundingClientRect();
        const x = Math.floor(Math.random() * rect.width) + rect.left;
        const y = Math.floor(Math.random() * rect.height) + rect.top;
        return { x, y };
    }
    
    // 点击方式1：单次触摸点击
    function singleTouchClick(element, x, y) {
        const target = document.elementFromPoint(x, y) || element;
        
        const touchStart = new TouchEvent('touchstart', {
            bubbles: true,
            cancelable: true,
            touches: [new Touch({
                identifier: 0,
                target: target,
                clientX: x,
                clientY: y
            })]
        });
        
        const touchEnd = new TouchEvent('touchend', {
            bubbles: true,
            cancelable: true,
            changedTouches: [new Touch({
                identifier: 0,
                target: target,
                clientX: x,
                clientY: y
            })]
        });
        
        target.dispatchEvent(touchStart);
        setTimeout(() => target.dispatchEvent(touchEnd), 50);
        
        return '单次触摸点击';
    }
    
    // 点击方式2：长按点击
    function longPressClick(element, x, y) {
        const target = document.elementFromPoint(x, y) || element;
        
        const touchStart = new TouchEvent('touchstart', {
            bubbles: true,
            cancelable: true,
            touches: [new Touch({
                identifier: 0,
                target: target,
                clientX: x,
                clientY: y
            })]
        });
        
        const touchEnd = new TouchEvent('touchend', {
            bubbles: true,
            cancelable: true,
            changedTouches: [new Touch({
                identifier: 0,
                target: target,
                clientX: x,
                clientY: y
            })]
        });
        
        target.dispatchEvent(touchStart);
        setTimeout(() => target.dispatchEvent(touchEnd), 800); // 长按800ms
        
        return '长按点击';
    }
    
    // 点击方式3：双击
    function doubleTapClick(element, x, y) {
        const target = document.elementFromPoint(x, y) || element;
        
        // 第一次点击
        const touchStart1 = new TouchEvent('touchstart', {
            bubbles: true,
            cancelable: true,
            touches: [new Touch({
                identifier: 0,
                target: target,
                clientX: x,
                clientY: y
            })]
        });
        
        const touchEnd1 = new TouchEvent('touchend', {
            bubbles: true,
            cancelable: true,
            changedTouches: [new Touch({
                identifier: 0,
                target: target,
                clientX: x,
                clientY: y
            })]
        });
        
        target.dispatchEvent(touchStart1);
        setTimeout(() => {
            target.dispatchEvent(touchEnd1);
            
            // 第二次点击
            setTimeout(() => {
                const touchStart2 = new TouchEvent('touchstart', {
                    bubbles: true,
                    cancelable: true,
                    touches: [new Touch({
                        identifier: 0,
                        target: target,
                        clientX: x,
                        clientY: y
                    })]
                });
                
                const touchEnd2 = new TouchEvent('touchend', {
                    bubbles: true,
                    cancelable: true,
                    changedTouches: [new Touch({
                        identifier: 0,
                        target: target,
                        clientX: x,
                        clientY: y
                    })]
                });
                
                target.dispatchEvent(touchStart2);
                setTimeout(() => target.dispatchEvent(touchEnd2), 50);
            }, 100);
        }, 50);
        
        return '双击';
    }
    
    // 点击方式4：滑动点击
    function swipeClick(element, x, y) {
        const target = document.elementFromPoint(x, y) || element;
        const rect = element.getBoundingClientRect();
        
        // 随机选择滑动方向
        const directions = ['up', 'down', 'left', 'right'];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        
        let endX = x, endY = y;
        const distance = 20; // 滑动距离
        
        switch(direction) {
            case 'up': endY -= distance; break;
            case 'down': endY += distance; break;
            case 'left': endX -= distance; break;
            case 'right': endX += distance; break;
        }
        
        // 确保结束坐标在元素范围内
        endX = Math.max(rect.left, Math.min(rect.right, endX));
        endY = Math.max(rect.top, Math.min(rect.bottom, endY));
        
        const touchStart = new TouchEvent('touchstart', {
            bubbles: true,
            cancelable: true,
            touches: [new Touch({
                identifier: 0,
                target: target,
                clientX: x,
                clientY: y
            })]
        });
        
        const touchMove = new TouchEvent('touchmove', {
            bubbles: true,
            cancelable: true,
            touches: [new Touch({
                identifier: 0,
                target: target,
                clientX: endX,
                clientY: endY
            })]
        });
        
        const touchEnd = new TouchEvent('touchend', {
            bubbles: true,
            cancelable: true,
            changedTouches: [new Touch({
                identifier: 0,
                target: target,
                clientX: endX,
                clientY: endY
            })]
        });
        
        target.dispatchEvent(touchStart);
        setTimeout(() => {
            target.dispatchEvent(touchMove);
            setTimeout(() => target.dispatchEvent(touchEnd), 100);
        }, 50);
        
        return `滑动点击(${direction})`;
    }
    
    // 点击方式5：多指点击
    function multiTouchClick(element, x, y) {
        const target = document.elementFromPoint(x, y) || element;
        const rect = element.getBoundingClientRect();
        
        // 生成第二个触摸点
        const x2 = Math.floor(Math.random() * rect.width) + rect.left;
        const y2 = Math.floor(Math.random() * rect.height) + rect.top;
        
        const touchStart = new TouchEvent('touchstart', {
            bubbles: true,
            cancelable: true,
            touches: [
                new Touch({
                    identifier: 0,
                    target: target,
                    clientX: x,
                    clientY: y
                }),
                new Touch({
                    identifier: 1,
                    target: target,
                    clientX: x2,
                    clientY: y2
                })
            ]
        });
        
        const touchEnd = new TouchEvent('touchend', {
            bubbles: true,
            cancelable: true,
            changedTouches: [
                new Touch({
                    identifier: 0,
                    target: target,
                    clientX: x,
                    clientY: y
                }),
                new Touch({
                    identifier: 1,
                    target: target,
                    clientX: x2,
                    clientY: y2
                })
            ]
        });
        
        target.dispatchEvent(touchStart);
        setTimeout(() => target.dispatchEvent(touchEnd), 100);
        
        return '多指点击';
    }
    
    // 点击方式6：混合点击（触摸+鼠标）
    function hybridClick(element, x, y) {
        const target = document.elementFromPoint(x, y) || element;
        
        // 先触摸事件
        const touchStart = new TouchEvent('touchstart', {
            bubbles: true,
            cancelable: true,
            touches: [new Touch({
                identifier: 0,
                target: target,
                clientX: x,
                clientY: y
            })]
        });
        
        const touchEnd = new TouchEvent('touchend', {
            bubbles: true,
            cancelable: true,
            changedTouches: [new Touch({
                identifier: 0,
                target: target,
                clientX: x,
                clientY: y
            })]
        });
        
        // 再鼠标事件
        const mouseClick = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y
        });
        
        target.dispatchEvent(touchStart);
        setTimeout(() => {
            target.dispatchEvent(touchEnd);
            setTimeout(() => target.dispatchEvent(mouseClick), 50);
        }, 50);
        
        return '混合点击(触摸+鼠标)';
    }
    
    // 所有点击方式
    const clickMethods = [
        singleTouchClick,
        longPressClick,
        doubleTapClick,
        swipeClick,
        multiTouchClick,
        hybridClick
    ];
    
    // 执行随机点击
    function performRandomClick() {
        const targetElement = document.querySelector(CONFIG.TARGET_SELECTOR);
        
        if (!targetElement) {
            log('目标元素未找到: ' + CONFIG.TARGET_SELECTOR);
            return;
        }
        
        // 检查元素是否可见
        const rect = targetElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            log('目标元素不可见');
            return;
        }
        
        // 获取随机坐标
        const { x, y } = getRandomCoordinates(targetElement);
        
        // 随机选择点击方式
        const randomMethod = clickMethods[Math.floor(Math.random() * clickMethods.length)];
        
        // 执行点击
        const clickType = randomMethod(targetElement, x, y);
        
        log(`执行${clickType} - 坐标: (${Math.round(x)}, ${Math.round(y)})`);
    }
    
    // 等待页面加载完成
    function waitForElement(selector, callback) {
        const element = document.querySelector(selector);
        if (element) {
            callback();
        } else {
            setTimeout(() => waitForElement(selector, callback), 1000);
        }
    }
    
    // 初始化
    function initialize() {
        log('随机点击器已启动');
        
        waitForElement(CONFIG.TARGET_SELECTOR, () => {
            log(`找到目标元素: ${CONFIG.TARGET_SELECTOR}`);
            log(`开始每${CONFIG.CLICK_INTERVAL/1000}秒执行一次随机点击`);
            
            // 立即执行一次
            performRandomClick();
            
            // 设置定时器
            setInterval(performRandomClick, CONFIG.CLICK_INTERVAL);
        });
    }
    
    // 页面加载完成后启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
})();