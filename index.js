// Подключаем консоль Eruda для отладки
(function () {
    const src = 'https://cdn.jsdelivr.net/npm/eruda';
    if (!window.eruda) {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => eruda.init();
        document.body.appendChild(script);
    }
})();

const widgetHtml = `
<div id="obj-widget" style="position: fixed; top: 10px; left: 50%; transform: translateX(-50%); width: 90%; max-width: 340px; background: rgba(20, 20, 24, 0.95); border: 2px solid #f39c12; border-radius: 10px; padding: 10px; color: #fff; z-index: 9999999; font-family: sans-serif; box-shadow: 0 4px 20px rgba(0,0,0,0.9); backdrop-filter: blur(5px);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <strong id="obj-title" style="font-size: 12px; color: #f39c12; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">🎯 Цель: Заставить признаться</strong>
        <span id="obj-status-badge" style="font-size: 9px; background: #3b82f6; padding: 2px 6px; border-radius: 4px; font-weight: bold;">IN_PROGRESS</span>
    </div>
    <div style="background: #333; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 6px;">
        <div id="obj-progress-bar" style="width: 10%; height: 100%; background: #f39c12; transition: width 0.3s;"></div>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 10px; color: #aaa;">
        <span>Прогресс: <b id="obj-progress-text" style="color:#fff">10%</b></span>
        <span>Ход: <b id="obj-turns" style="color:#fff">1/10</b></span>
    </div>
</div>
`;

// Гарантированный рендер плашки
function initEngine() {
    if (window.jQuery) {
        if ($('#obj-widget').length === 0) {
            $('body').append(widgetHtml);
            console.log('[Objective Engine] UI Widget mounted successfully!');
        }
    } else {
        setTimeout(initEngine, 500);
    }
}

initEngine();