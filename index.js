// Objective Engine v1.4.0 for SillyTavern (English System Prompts & Macros)
const extensionName = 'objective-engine';

const PRESETS = [
    { 
        id: 'love', 
        name: 'Признание в любви', 
        title: 'Force {{char}} to genuinely confess feelings to {{user}}',
        prompt: '{{char}} suppresses or denies romantic feelings for {{user}}. At 0-30% progress, {{char}} deflects, acts flustered, or denies any romantic interest. At 31-70%, {{char}} shows noticeable emotional tension, slip-ups, and hesitation. At 71-100%, {{char}} crumbles under {{user}}\'s sincerity and fully confesses.'
    },
    { 
        id: 'secret', 
        name: 'Выведать тайну', 
        title: 'Extract a guarded secret from {{char}}',
        prompt: '{{char}} holds a critical secret from {{user}} and defends it fiercely. At 0-30%, {{char}} lies, acts suspicious, or shifts the topic. At 31-70%, {{char}} stumbles over contradictions or exhibits nervousness. Progress increases ONLY through solid evidence, clever pressure, or deep emotional trust built by {{user}}.'
    },
    { 
        id: 'apology', 
        name: 'Искреннее покаяние', 
        title: 'Make {{char}} admit fault and apologize to {{user}}',
        prompt: '{{char}} committed an offense against {{user}} but maintains defensive pride. Initially, {{char}} counter-attacks or shifts blame. Progress increases when {{user}} presents undeniable logic or emotional weight that pierces {{char}}\'s pride.'
    },
    { 
        id: 'seduce', 
        name: 'Соблазнение', 
        title: 'Seduce {{char}} into romantic or physical intimacy',
        prompt: '{{char}} attempts to maintain personal boundaries against {{user}}. At low progress, {{char}} holds strong distance or uses sarcasm. As progress rises, {{char}} loses composure, giving in to the romantic atmosphere, physical cues, and {{user}}\'s initiative.'
    },
    { 
        id: 'deal', 
        name: 'Заключить сделку', 
        title: 'Persuade {{char}} to accept a risky or unfavorable proposal',
        prompt: '{{char}} is pragmatic, cautious, and highly skeptical of {{user}}\'s terms. Progress increases ONLY through strong leverage, clear mutual benefit, or pressing {{char}}\'s personal weaknesses. Idle conversation must not increase progress.'
    },
    { 
        id: 'custom', 
        name: 'Свой вариант (Кастом)', 
        title: '',
        prompt: ''
    }
];

const defaultState = {
    enabled: true,
    presetId: 'love',
    title: PRESETS[0].title,
    customPrompt: PRESETS[0].prompt,
    maxTurns: 10,
    currentTurn: 0,
    progress: 0,
    status: 'IN_PROGRESS',
    lastReason: 'Сцена началась...',
    isCollapsed: false
};

let state = Object.assign({}, defaultState);

function loadSettings() {
    if (window.extension_settings && window.extension_settings[extensionName]) {
        state = Object.assign(state, window.extension_settings[extensionName]);
    }
}

function saveSettings() {
    if (window.extension_settings) {
        window.extension_settings[extensionName] = state;
    }
    if (window.saveSettingsDebounced) {
        window.saveSettingsDebounced();
    }
}

function getCurrentInstruction() {
    if (state.presetId === 'custom') {
        return state.customPrompt || 'Adapt {{char}}\'s behavior dynamically to match the current progress percentage.';
    }
    const preset = PRESETS.find(p => p.id === state.presetId);
    return preset ? preset.prompt : '';
}

function buildSystemPrompt() {
    if (!state.enabled || state.status !== 'IN_PROGRESS') return '';

    return `\n[SYSTEM OBJECTIVE ENGINE ACTIVE]
Target Goal: "${state.title}"
Context: {{char}} is interacting with {{user}}.
Roleplay Scenario Instruction: ${getCurrentInstruction()}
Turns Remaining: ${state.maxTurns - state.currentTurn}/${state.maxTurns}
Current Progress: ${state.progress}%

INSTRUCTIONS FOR {{char}} EVALUATION & BEHAVIOR:
1. Dynamically adapt {{char}}'s response based on current progress (${state.progress}%):
   - 0-30%: {{char}} actively resists, deflects, or maintains strong emotional/logical boundaries against {{user}}.
   - 31-70%: {{char}} shows hesitation, emotional conflict, or cracks in defense.
   - 71-99%: {{char}}'s resistance is almost broken, highly susceptible to {{user}}'s actions.
   - 100%: Goal fully achieved. {{char}} surrenders or completely complies with the goal.
2. Evaluate {{user}}'s latest turn objectively. Increase progress ONLY if {{user}} made a meaningful, effective RP move or persuasive point.
3. At the VERY END of your response, output this EXACT JSON tag on a new line (keep the "reason" field in Russian for the UI):
[OBJ_EVAL: {"progress": <0-100>, "reason": "<1-sentence evaluation of user's action in Russian>", "status": "<IN_PROGRESS|WIN|FAIL>"}]`;
}

function parseBotMessage(text) {
    if (!text) return text;
    const regex = /\[OBJ_EVAL:\s*(\{.*?\})\]/s;
    const match = text.match(regex);

    if (match) {
        try {
            const data = JSON.parse(match[1]);
            state.progress = Math.min(100, Math.max(0, Number(data.progress) || state.progress));
            if (data.reason) state.lastReason = data.reason;
            state.currentTurn += 1;

            if (data.status === 'WIN' || state.progress >= 100) {
                state.status = 'WIN';
                state.progress = 100;
            } else if (data.status === 'FAIL' || state.currentTurn >= state.maxTurns) {
                state.status = 'FAIL';
            }

            saveSettings();
            updateUI();

            return text.replace(regex, '').trim();
        } catch (e) {
            console.error('[Objective Engine] JSON parse error:', e);
        }
    }
    return text;
}

function updateUI() {
    $('#obj-title').text(state.title || 'Без цели');
    $('#obj-progress-bar').css('width', `${state.progress}%`);
    $('#obj-progress-text').text(`${state.progress}%`);
    $('#obj-turns').text(`${state.currentTurn}/${state.maxTurns}`);
    $('#obj-reason').text(state.lastReason);

    let statusBg = '#3b82f6';
    if (state.status === 'WIN') statusBg = '#22c55e';
    if (state.status === 'FAIL') statusBg = '#ef4444';

    $('#obj-status-badge').css('background-color', statusBg).text(state.status);
    $('#obj-mini-text').text(`🎯 ${state.progress}% (${state.currentTurn}/${state.maxTurns})`);

    if (state.isCollapsed) {
        $('#obj-full-view').hide();
        $('#obj-mini-view').show();
        $('#obj-widget').css({'width': 'auto', 'padding': '4px 10px'});
    } else {
        $('#obj-mini-view').hide();
        $('#obj-full-view').show();
        $('#obj-widget').css({'width': '92%', 'padding': '8px 12px'});
    }

    $('#obj-cfg-enabled').prop('checked', state.enabled);
    $('#obj-cfg-preset').val(state.presetId);
    $('#obj-cfg-turns').val(state.maxTurns);
    $('#obj-cfg-custom-title').val(state.title);
    $('#obj-cfg-custom-prompt').val(state.customPrompt);

    if (state.presetId === 'custom') {
        $('#obj-custom-title-block').show();
        $('#obj-custom-prompt-block').show();
    } else {
        $('#obj-custom-title-block').hide();
        $('#obj-custom-prompt-block').hide();
    }
}

const widgetHtml = `
<div id="obj-widget" style="position: fixed; top: 55px; left: 50%; transform: translateX(-50%); width: 92%; max-width: 360px; background: rgba(18, 18, 22, 0.95); border: 1px solid #f39c12; border-radius: 8px; padding: 8px 12px; color: #fff; z-index: 99999; font-family: sans-serif; box-shadow: 0 4px 15px rgba(0,0,0,0.8); backdrop-filter: blur(5px); transition: all 0.2s ease;">
    <div id="obj-mini-view" style="display: none; align-items: center; justify-content: center; cursor: pointer;">
        <span id="obj-mini-text" style="font-size: 11px; font-weight: bold; color: #f39c12;">🎯 0%</span>
    </div>
    <div id="obj-full-view">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong id="obj-title" style="font-size: 11px; color: #f39c12; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">Цель</strong>
            <div style="display: flex; align-items: center; gap: 6px;">
                <span id="obj-status-badge" style="font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: bold; background: #3b82f6;">IN_PROGRESS</span>
                <button id="obj-btn-collapse" style="background: none; border: none; color: #aaa; font-size: 12px; cursor: pointer; padding: 0 2px;">➖</button>
            </div>
        </div>
        <div style="background: #222; height: 7px; border-radius: 4px; overflow: hidden; margin-bottom: 4px; border: 1px solid #333;">
            <div id="obj-progress-bar" style="width: 0%; height: 100%; background: #f39c12; transition: width 0.4s ease;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 10px; color: #aaa; margin-bottom: 3px;">
            <span>Прогресс: <b id="obj-progress-text" style="color:#fff">0%</b></span>
            <span>Ход: <b id="obj-turns" style="color:#fff">0/10</b></span>
        </div>
        <div id="obj-reason" style="font-size: 9px; font-style: italic; color: #bbb; border-top: 1px solid #333; padding-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Сцена началась...</div>
    </div>
</div>
`;

function buildSettingsHtml() {
    const optionsHtml = PRESETS.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    return `
    <div class="extension_settings_block" style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-top: 10px;">
        <h4 style="margin: 0 0 10px 0; color: #f39c12;">🎯 Objective Engine</h4>
        <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12px;">
            <input type="checkbox" id="obj-cfg-enabled">
            <span>Включить движок квестов</span>
        </label>
        
        <label style="display: block; margin-bottom: 8px; font-size: 12px;">
            Выберите готовый пресет:
            <select id="obj-cfg-preset" class="text_pole" style="width: 100%; margin-top: 2px; background: #222; color: #fff;">
                ${optionsHtml}
            </select>
        </label>

        <div id="obj-custom-title-block" style="display: none; margin-bottom: 8px;">
            <label style="display: block; font-size: 12px;">
                Название цели (English / Русский):
                <input type="text" id="obj-cfg-custom-title" class="text_pole" style="width: 100%; margin-top: 2px;" placeholder="Пример: Make {{char}} admit feelings">
            </label>
        </div>

        <div id="obj-custom-prompt-block" style="display: none; margin-bottom: 8px;">
            <label style="display: block; font-size: 12px;">
                Инструкция для ИИ (на английском с {{char}} и {{user}}):
                <textarea id="obj-cfg-custom-prompt" class="text_pole" style="width: 100%; height: 60px; margin-top: 2px; font-size: 11px;" placeholder="{{char}} acts guarded around {{user}}..."></textarea>
            </label>
        </div>

        <label style="display: block; margin-bottom: 10px; font-size: 12px;">
            Лимит ходов:
            <input type="number" id="obj-cfg-turns" class="text_pole" style="width: 100%; margin-top: 2px;" min="1" max="50">
        </label>
        
        <button id="obj-btn-reset" class="menu_button" style="width: 100%; background: #e74c3c; color: white;">
            🔄 Сбросить и начать квест
        </button>
    </div>
    `;
}

function init() {
    loadSettings();

    if ($('#obj-widget').length === 0) {
        $('body').append(widgetHtml);
    }

    $('#obj-btn-collapse').on('click', function(e) {
        e.stopPropagation();
        state.isCollapsed = true;
        saveSettings();
        updateUI();
    });

    $('#obj-mini-view').on('click', function() {
        state.isCollapsed = false;
        saveSettings();
        updateUI();
    });

    const checkSettingsPanel = setInterval(() => {
        if ($('#extensions_settings').length && $('#obj-cfg-preset').length === 0) {
            $('#extensions_settings').append(buildSettingsHtml());

            $('#obj-cfg-enabled').on('change', function() {
                state.enabled = $(this).is(':checked');
                saveSettings();
            });

            $('#obj-cfg-preset').on('change', function() {
                const selectedId = $(this).val();
                state.presetId = selectedId;
                const presetObj = PRESETS.find(p => p.id === selectedId);

                if (selectedId !== 'custom' && presetObj) {
                    state.title = presetObj.title;
                    state.customPrompt = presetObj.prompt;
                }
                state.currentTurn = 0;
                state.progress = 0;
                state.status = 'IN_PROGRESS';
                state.lastReason = 'Новый пресет выбран';

                saveSettings();
                updateUI();
            });

            $('#obj-cfg-custom-title').on('input', function() {
                if (state.presetId === 'custom') {
                    state.title = $(this).val();
                    saveSettings();
                    updateUI();
                }
            });

            $('#obj-cfg-custom-prompt').on('input', function() {
                if (state.presetId === 'custom') {
                    state.customPrompt = $(this).val();
                    saveSettings();
                }
            });

            $('#obj-cfg-turns').on('change', function() {
                state.maxTurns = parseInt($(this).val()) || 10;
                saveSettings();
                updateUI();
            });

            $('#obj-btn-reset').on('click', function() {
                state.currentTurn = 0;
                state.progress = 0;
                state.status = 'IN_PROGRESS';
                state.lastReason = 'Квест сброшен';
                saveSettings();
                updateUI();
            });

            updateUI();
        }
    }, 1000);

    if (window.eventSource && window.event_types) {
        window.eventSource.on(window.event_types.CHARACTER_MESSAGE_RENDERED, (msgId) => {
            const ctx = window.getContext ? window.getContext() : null;
            if (ctx && ctx.chat && ctx.chat[msgId]) {
                const rawText = ctx.chat[msgId].mes;
                const cleanText = parseBotMessage(rawText);
                if (cleanText !== rawText) {
                    ctx.chat[msgId].mes = cleanText;
                    $(`.message[data-id="${msgId}"] .mes_text`).text(cleanText);
                }
            }
        });

        window.eventSource.on(window.event_types.BEFORE_COMPLETION, (data) => {
            const prompt = buildSystemPrompt();
            if (prompt && data && data.prompt) {
                data.prompt += prompt;
            }
        });
    }

    updateUI();
}

$(document).ready(init);