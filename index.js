alert('🎯 Objective Engine загрузился!');
import { setExtensionPrompt, extension_prompt_types, eventSource, event_types } from '/script.js';
import { extension_settings, saveSettingsDebounced } from '/scripts/extensions.js';

const extensionName = 'objective-engine';

const defaultState = {
    enabled: true,
    title: 'Заставить признаться в грехе',
    maxTurns: 10,
    currentTurn: 0,
    progress: 0,
    status: 'IN_PROGRESS',
    lastReason: 'Сцена началась'
};

extension_settings[extensionName] = Object.assign({}, defaultState, extension_settings[extensionName] || {});
let state = extension_settings[extensionName];

function save() {
    extension_settings[extensionName] = state;
    saveSettingsDebounced();
}

function buildPrompt() {
    if (!state.enabled || state.status !== 'IN_PROGRESS') return '';

    return `[OOC: SYSTEM OBJECTIVE ENGINE ACTIVE]
Current Target Goal: "${state.title}"
Turns Left: ${state.maxTurns - state.currentTurn}/${state.maxTurns}
Current Progress: ${state.progress}%

CRITICAL INSTRUCTION:
Analyze the user's last message and evaluate if they moved closer to the target goal.
At the VERY END of your response, append this EXACT hidden JSON tag:
[OBJ_EVAL: {"progress": <0-100>, "reason": "<short 1-sentence explanation>", "status": "<IN_PROGRESS|WIN|FAIL>"}]

Rules:
- Increase progress if user makes strong logical, emotional, or RP moves toward the goal.
- If progress reaches 100%, set status to WIN. If turns run out or user fails, set status to FAIL.`;
}

function applyPrompt() {
    try {
        setExtensionPrompt(extensionName, buildPrompt(), extension_prompt_types.IN_CHAT, 0);
    } catch (e) {
        console.error('[Objective Engine] Error applying prompt:', e);
    }
}

function parseBotResponse(messageText) {
    if (!messageText) return messageText;
    const regex = /\[OBJ_EVAL:\s*(\{.*?\})\]/s;
    const match = messageText.match(regex);

    if (match) {
        try {
            const data = JSON.parse(match[1]);
            state.progress = Math.min(100, Math.max(0, Number(data.progress) || 0));
            state.lastReason = data.reason || state.lastReason;
            if (data.status) state.status = data.status;
            state.currentTurn += 1;

            if (state.currentTurn >= state.maxTurns && state.progress < 100) {
                state.status = 'FAIL';
            }

            save();
            updateUI();
            applyPrompt();

            return messageText.replace(regex, '').trim();
        } catch (e) {
            console.error('[Objective Engine] Parse error:', e);
        }
    }
    return messageText;
}

function updateUI() {
    $('#obj-title').text(state.title);
    $('#obj-progress-bar').css('width', `${state.progress}%`);
    $('#obj-progress-text').text(`${state.progress}%`);
    $('#obj-turns').text(`${state.currentTurn}/${state.maxTurns}`);
    $('#obj-reason').text(state.lastReason);

    let statusColor = '#3b82f6';
    if (state.status === 'WIN') statusColor = '#22c55e';
    if (state.status === 'FAIL') statusColor = '#ef4444';

    $('#obj-status-badge').css('background-color', statusColor).text(state.status);

    $('#obj-input-title').val(state.title);
    $('#obj-input-turns').val(state.maxTurns);
    $('#obj-checkbox-enabled').prop('checked', state.enabled);
}

const widgetHtml = `
<div id="obj-widget" style="position: fixed; top: 5px; left: 50%; transform: translateX(-50%); width: 92%; max-width: 360px; background: rgba(18, 18, 18, 0.95); border: 1px solid #444; border-radius: 8px; padding: 8px 12px; color: #fff; z-index: 999999; font-family: sans-serif; box-shadow: 0 4px 15px rgba(0,0,0,0.8); backdrop-filter: blur(5px);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <strong id="obj-title" style="font-size: 11px; color: #f39c12; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">Цель</strong>
        <span id="obj-status-badge" style="font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: bold;">IN_PROGRESS</span>
    </div>
    <div style="background: #222; height: 7px; border-radius: 4px; overflow: hidden; margin-bottom: 4px; border: 1px solid #333;">
        <div id="obj-progress-bar" style="width: 0%; height: 100%; background: #3b82f6; transition: width 0.3s;"></div>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 10px; color: #aaa; margin-bottom: 3px;">
        <span>Прогресс: <b id="obj-progress-text" style="color:#fff">0%</b></span>
        <span>Ход: <b id="obj-turns" style="color:#fff">0/10</b></span>
    </div>
    <div id="obj-reason" style="font-size: 9px; font-style: italic; color: #bbb; border-top: 1px solid #333; padding-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Сцена началась...</div>
</div>
`;

const settingsHtml = `
<div class="objective-engine-settings" style="padding: 10px; background: rgba(0,0,0,0.2); border-radius: 5px; margin-top: 10px;">
    <h4>🎯 Objective Engine</h4>
    <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <input type="checkbox" id="obj-checkbox-enabled">
        <span>Включить движок квестов</span>
    </label>
    
    <label style="display: block; margin-bottom: 6px; font-size: 12px;">
        Название цели / квеста:
        <input type="text" id="obj-input-title" class="text_pole" style="width: 100%; margin-top: 2px;">
    </label>
    
    <label style="display: block; margin-bottom: 10px; font-size: 12px;">
        Лимит ходов:
        <input type="number" id="obj-input-turns" class="text_pole" style="width: 100%; margin-top: 2px;" min="1" max="50">
    </label>
    
    <button id="obj-btn-reset" class="menu_button" style="width: 100%; background: #e74c3c; color: white;">
        🔄 Сбросить квест
    </button>
</div>
`;

jQuery(() => {
    if ($('#obj-widget').length === 0) {
        $('body').append(widgetHtml);
    }

    const injectSettings = () => {
        if ($('#extensions_settings').length && $('.objective-engine-settings').length === 0) {
            $('#extensions_settings').append(settingsHtml);
            bindMenuEvents();
        }
    };

    injectSettings();
    const observer = new MutationObserver(injectSettings);
    observer.observe(document.body, { childList: true, subtree: true });

    function bindMenuEvents() {
        $('#obj-checkbox-enabled').off('change').on('change', function() {
            state.enabled = $(this).is(':checked');
            save();
            applyPrompt();
        });

        $('#obj-input-title').off('input').on('input', function() {
            state.title = $(this).val();
            save();
            updateUI();
            applyPrompt();
        });

        $('#obj-input-turns').off('change').on('change', function() {
            state.maxTurns = parseInt($(this).val()) || 10;
            save();
            updateUI();
            applyPrompt();
        });

        $('#obj-btn-reset').off('click').on('click', function() {
            state.currentTurn = 0;
            state.progress = 0;
            state.status = 'IN_PROGRESS';
            state.lastReason = 'Квест сброшен';
            save();
            updateUI();
            applyPrompt();
            alert('Квест сброшен!');
        });
    }

    updateUI();
    applyPrompt();

    if (window.eventSource && window.event_types) {
        eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (msgId) => {
            const ctx = window.getContext ? window.getContext() : null;
            if (ctx && ctx.chat && ctx.chat[msgId]) {
                const cleanText = parseBotResponse(ctx.chat[msgId].mes);
                if (cleanText !== ctx.chat[msgId].mes) {
                    ctx.chat[msgId].mes = cleanText;
                    $(`.message[data-id="${msgId}"] .mes_text`).text(cleanText);
                }
            }
        });
    }
});