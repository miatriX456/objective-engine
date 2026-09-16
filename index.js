import { setExtensionPrompt, extension_prompt_types, eventSource, event_types } from '../../../../script.js';
import { extension_settings, saveSettingsDebounced } from '../../../extensions.js';

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

extension_settings[extensionName] = extension_settings[extensionName] || defaultState;
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
    setExtensionPrompt(extensionName, buildPrompt(), extension_prompt_types.IN_CHAT, 0);
}

function parseBotResponse(messageText) {
    const regex = /\[OBJ_EVAL:\s*(\{.*?\})\]/s;
    const match = messageText.match(regex);

    if (match) {
        try {
            const data = JSON.parse(match[1]);
            state.progress = Math.min(100, Math.max(0, data.progress));
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
}

const panelHtml = `
<div id="obj-widget" style="position: fixed; top: 60px; right: 20px; width: 280px; background: rgba(20,20,20,0.9); border: 1px solid #444; border-radius: 8px; padding: 12px; color: #fff; z-index: 9999; font-family: sans-serif; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong id="obj-title" style="font-size: 12px; color: #f39c12;">Цель</strong>
        <span id="obj-status-badge" style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold;">IN_PROGRESS</span>
    </div>
    <div style="background: #333; height: 10px; border-radius: 5px; overflow: hidden; margin-bottom: 6px;">
        <div id="obj-progress-bar" style="width: 0%; height: 100%; background: #3b82f6; transition: width 0.3s;"></div>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa; margin-bottom: 6px;">
        <span>Прогресс: <b id="obj-progress-text" style="color:#fff">0%</b></span>
        <span>Ход: <b id="obj-turns" style="color:#fff">0/10</b></span>
    </div>
    <div id="obj-reason" style="font-size: 10px; font-style: italic; color: #ccc; border-top: 1px solid #333; padding-top: 4px;">Сцена началась...</div>
</div>
`;

jQuery(async () => {
    $('body').append(panelHtml);
    updateUI();
    applyPrompt();

    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (msgId) => {
        const ctx = window.getContext();
        if (ctx && ctx.chat && ctx.chat[msgId]) {
            const cleanText = parseBotResponse(ctx.chat[msgId].mes);
            if (cleanText !== ctx.chat[msgId].mes) {
                ctx.chat[msgId].mes = cleanText;
                $(`.message[data-id="${msgId}"] .mes_text`).text(cleanText);
            }
        }
    });
});