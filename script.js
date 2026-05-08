// =================================================================
// E3 - GIS Map & LED Control Demo
// =================================================================

let DATA = {};
let selectedAlertId = null;
let selectedColor = 'amber';

const TAB_TITLES = {
    dashboard: 'Tổng Quan Mạng Lưới',
    map: 'Bản Đồ GIS',
    alerts: 'Cảnh Báo Ùn Tắc',
    led: 'Điều Khiển LED',
    ai: 'AI Dự Đoán',
    stats: 'Thống Kê & Báo Cáo',
    health: 'Giám Sát Hệ Thống'
};

// Bootstrap
fetch('data/mock_data.json')
    .then(r => r.json())
    .then(data => {
        DATA = data;
        initTabs();
        renderAll();
        startAlertTicker();
    })
    .catch(err => console.error('[E3] Failed to load mock_data.json:', err));

function renderAll() {
    renderLicense();
    renderDataSources();
    renderRecentAlerts();
    renderGISMap();
    renderRoutes();
    renderTravelTimes();
    renderLayerToggles();
    renderAlertCards();
    renderLEDBoards();
    renderLEDEditor();
    renderAutopushRules();
    renderAltRoutes();
    renderForecast();
    renderPredictions();
    renderSuggestions();
    renderBlackspots();
    renderHourlyDualChart();
    renderWeeklyChart();
    renderPublicAPI();
    renderInternalAPI();
}

function initTabs() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            switchTab(item.dataset.tab);
        });
    });
}
function switchTab(tabId) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tab === tabId));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === `${tabId}Tab`));
    document.getElementById('pageTitle').textContent = TAB_TITLES[tabId] || '';
}

// ================== LICENSE ==================
function renderLicense() {
    const lic = DATA.license_info;
    if (!lic) return;
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    set('licenseKey', lic.license_key);
    set('licInt', `${lic.active_intersections} / ${lic.max_intersections}`);
    set('licLed', `${lic.active_led_boards} / ${lic.max_led_boards}`);
    const tagsEl = document.getElementById('complianceTags');
    if (tagsEl) tagsEl.innerHTML = lic.compliance.map(c => `<span class="comp-tag">✓ ${c}</span>`).join('');
}

// ================== DATA SOURCES ==================
function renderDataSources() {
    const grid = document.getElementById('dataSourceGrid');
    if (!grid || !DATA.data_sources) return;
    grid.innerHTML = DATA.data_sources.map(s => `
        <div class="sensor-card" style="border-left-color:${s.color}">
            <div class="sensor-icon" style="background:${s.color}22;color:${s.color}">${s.icon}</div>
            <div class="sensor-body">
                <div class="sensor-name">${s.name}</div>
                <div class="sensor-from">⬅ ${s.from}</div>
                <div class="sensor-desc">${s.data}</div>
                <div class="sensor-proto">📡 ${s.protocol} • ${s.freq}</div>
            </div>
        </div>
    `).join('');
}

// ================== RECENT ALERTS (Dashboard) ==================
function renderRecentAlerts() {
    const list = document.getElementById('recentAlertsList');
    if (!list || !DATA.alerts) return;
    list.innerHTML = DATA.alerts.slice(0, 6).map(a => `
        <div class="alert-item ${a.severity}">
            <div class="al-head">
                <span class="al-title">${alertIcon(a.type)} ${a.title}</span>
                <span class="al-time">${a.time}</span>
            </div>
            <div class="al-loc">📍 ${a.location}</div>
            <div class="al-source">${a.source}</div>
        </div>
    `).join('');
}
function alertIcon(t) {
    return { incident: '🚨', congestion: '⚠️', weather: '🌧️', event: '📅' }[t] || '🚨';
}

// ================== GIS MAP ==================
const ROUTE_PATHS = [
    // Pre-defined SVG paths simulating Hà Nội road network (viewBox 1000x500)
    { id: 'R1', path: 'M 50 250 Q 200 240 380 230', name: 'Đại lộ Thăng Long' },
    { id: 'R2', path: 'M 100 80 Q 500 80 900 100 L 920 400 Q 700 460 200 440 Z', name: 'Vành đai 3' },
    { id: 'R3', path: 'M 700 50 L 720 200', name: 'Cầu Nhật Tân' },
    { id: 'R4', path: 'M 380 230 L 580 250', name: 'Phạm Hùng' },
    { id: 'R5', path: 'M 500 250 L 540 350', name: 'Trần Duy Hưng' },
    { id: 'R6', path: 'M 540 350 L 640 380', name: 'Cầu Giấy' },
    { id: 'R7', path: 'M 640 380 L 760 350', name: 'Kim Mã' },
    { id: 'R8', path: 'M 760 350 L 760 250', name: 'Láng Hạ' },
    { id: 'R9', path: 'M 700 350 L 700 220', name: 'Nguyễn Chí Thanh' },
    { id: 'R10', path: 'M 760 350 L 850 350', name: 'Tôn Đức Thắng' },
    { id: 'R11', path: 'M 850 350 L 880 280', name: 'Khâm Thiên' },
    { id: 'R12', path: 'M 700 350 L 850 350', name: 'Xã Đàn' },
    { id: 'R13', path: 'M 640 380 L 720 460', name: 'Giảng Võ' },
    { id: 'R14', path: 'M 580 250 L 640 380', name: 'Đê La Thành' },
    { id: 'R15', path: 'M 850 350 L 870 200', name: 'Lê Duẩn' },
    { id: 'R16', path: 'M 870 200 L 960 250', name: 'Trần Hưng Đạo' },
    { id: 'R17', path: 'M 760 250 L 870 200', name: 'Nguyễn Thái Học' },
    { id: 'R18', path: 'M 870 200 L 960 280', name: 'Hai Bà Trưng' }
];

const INT_POSITIONS = {
    'INT_KIMMA': { x: 70, y: 70 },
    'INT_LANGHA': { x: 76, y: 70 },
    'INT_CAUGIAY': { x: 64, y: 76 },
    'INT_TONDUC': { x: 85, y: 70 },
    'INT_DAOTUAN': { x: 76, y: 50 },
    'INT_TRANDUY': { x: 54, y: 70 },
    'INT_DOIDONG': { x: 76, y: 36 },
    'INT_DAEWOO': { x: 70, y: 50 },
    'INT_GIANG': { x: 72, y: 92 },
    'INT_LEDUAN': { x: 87, y: 56 },
    'INT_HBTRUNG': { x: 96, y: 56 }
};
const LED_POSITIONS = [
    { id: 'LED_GW_BAC', x: 72, y: 12 },
    { id: 'LED_GW_TAY', x: 6, y: 50 },
    { id: 'LED_GW_NAM', x: 50, y: 95 },
    { id: 'LED_R3_KM5', x: 30, y: 16 },
    { id: 'LED_R3_KM12', x: 92, y: 78 },
    { id: 'LED_KIMMA', x: 76, y: 70 },
    { id: 'LED_LANGHA', x: 78, y: 60 },
    { id: 'LED_CAUGIAY', x: 64, y: 76 },
    { id: 'LED_TONDUC', x: 85, y: 65 },
    { id: 'LED_TRANDUY', x: 54, y: 65 }
];

function renderGISMap() {
    const svg = document.getElementById('mapSvg');
    const markers = document.getElementById('mapMarkers');
    if (!svg || !markers) return;

    // Render routes
    svg.innerHTML = ROUTE_PATHS.map(rp => {
        const route = (DATA.routes || []).find(r => r.id === rp.id);
        const lvl = route ? route.level : 'free';
        return `<path class="route-path ${lvl}" d="${rp.path}" data-route="${rp.id}">
            <title>${rp.name} - ${route ? route.speed + ' km/h' : ''}</title>
        </path>`;
    }).join('');

    // Render markers (intersections + LEDs + alerts)
    let html = '';

    // Intersections
    (DATA.intersections || []).forEach(it => {
        const pos = INT_POSITIONS[it.id];
        if (!pos) return;
        html += `<div class="map-marker intersection ${it.status}" style="left:${pos.x}%;top:${pos.y}%;" data-tooltip="${it.name} • Chờ ${it.wait_time}s • ${it.speed_avg} km/h"></div>`;
    });

    // LEDs
    LED_POSITIONS.forEach(lp => {
        const led = (DATA.led_boards || []).find(l => l.id === lp.id);
        if (!led || led.status !== 'online') return;
        html += `<div class="map-marker led" style="left:${lp.x}%;top:${lp.y}%;" data-tooltip="${led.name}: ${led.current_msg}">📺</div>`;
    });

    // Alert markers (just first 3 for visual)
    const alertPositions = [
        { x: 64, y: 76, icon: '🚨' },
        { x: 76, y: 70, icon: '⚠️' },
        { x: 85, y: 65, icon: '⚠️' }
    ];
    alertPositions.forEach((ap, i) => {
        const a = DATA.alerts[i];
        if (!a) return;
        html += `<div class="map-marker alert" style="left:${ap.x}%;top:${ap.y}%;" data-tooltip="${a.title} - ${a.location}">${ap.icon}</div>`;
    });

    markers.innerHTML = html;
}

function renderLayerToggles() {
    document.querySelectorAll('.layer-toggle input').forEach(cb => {
        cb.addEventListener('change', () => {
            const layer = cb.dataset.layer;
            const markers = document.getElementById('mapMarkers');
            const svg = document.getElementById('mapSvg');
            if (!markers || !svg) return;
            if (layer === 'routes') svg.style.display = cb.checked ? '' : 'none';
            else if (layer === 'intersections') markers.querySelectorAll('.intersection').forEach(m => m.style.display = cb.checked ? '' : 'none');
            else if (layer === 'leds') markers.querySelectorAll('.led').forEach(m => m.style.display = cb.checked ? '' : 'none');
            else if (layer === 'alerts') markers.querySelectorAll('.alert').forEach(m => m.style.display = cb.checked ? '' : 'none');
        });
    });
}

function renderRoutes() {
    const list = document.getElementById('routeList');
    if (!list || !DATA.routes) return;
    list.innerHTML = DATA.routes.map(r => `
        <div class="route-card ${r.level}">
            <div class="rc-head">
                <span class="rc-name">${r.name}</span>
                <span class="rc-speed" style="color:${r.color};">${r.speed} km/h</span>
            </div>
            <div class="rc-meta">
                <span>${r.length_km} km • ${r.lanes} làn</span>
                <span>⏱ ${r.travel_time_min} phút</span>
            </div>
            <div class="rc-meta" style="margin-top:4px;">
                <span>${r.vehicles.toLocaleString()} xe/h</span>
                <span>Giới hạn: ${r.speed_limit} km/h</span>
            </div>
        </div>
    `).join('');
}

function renderTravelTimes() {
    const grid = document.getElementById('travelTimeGrid');
    if (!grid || !DATA.travel_times) return;
    grid.innerHTML = DATA.travel_times.map(t => `
        <div class="tt-card">
            <div class="tt-route">📍 ${t.from} → ${t.to}</div>
            <div class="tt-times">
                <div class="tt-time free">
                    <div class="t-label">Tự do</div>
                    <div class="t-val">${t.free_time}p</div>
                </div>
                <span class="tt-arrow">→</span>
                <div class="tt-time current">
                    <div class="t-label">Hiện tại</div>
                    <div class="t-val">${t.current_time}p</div>
                </div>
            </div>
            <div class="tt-delay">${t.distance_km} km • Trễ +${t.delay_pct}%</div>
        </div>
    `).join('');
}

// ================== ALERTS ==================
function renderAlertCards() {
    const list = document.getElementById('alertCardsList');
    if (!list || !DATA.alerts) return;
    list.innerHTML = DATA.alerts.map(a => `
        <div class="alert-card ${a.severity} ${a.id === selectedAlertId ? 'selected' : ''}" onclick="selectAlert('${a.id}')">
            <div class="ac-head">
                <span class="ac-title">${alertIcon(a.type)} ${a.title}</span>
                <span class="ac-sev ${a.severity}">${sevLabel(a.severity)}</span>
            </div>
            <div class="ac-loc">📍 ${a.location}</div>
            <div class="ac-meta">
                <span>⏱ ${a.time}</span>
                ${a.duration ? `<span>Kéo dài: ${a.duration}</span>` : ''}
                ${a.vehicles_affected ? `<span>🚗 ${a.vehicles_affected} xe ảnh hưởng</span>` : ''}
            </div>
        </div>
    `).join('');
    if (!selectedAlertId && DATA.alerts.length) selectAlert(DATA.alerts[0].id);
}
function sevLabel(s) {
    return { critical: 'NGHIÊM TRỌNG', high: 'CAO', medium: 'TB', low: 'THẤP' }[s] || s;
}
window.selectAlert = function (id) {
    selectedAlertId = id;
    renderAlertCards();
    renderAlertDetail();
};
function renderAlertDetail() {
    const el = document.getElementById('alertDetailContent');
    if (!el) return;
    const a = (DATA.alerts || []).find(x => x.id === selectedAlertId);
    if (!a) { el.innerHTML = '<div class="empty-detail">← Chọn 1 cảnh báo</div>'; return; }

    let html = `
        <div class="detail-row"><span>ID</span><span>${a.id}</span></div>
        <div class="detail-row"><span>Loại</span><span>${alertIcon(a.type)} ${a.type.toUpperCase()}</span></div>
        <div class="detail-row"><span>Mức độ</span><span class="ac-sev ${a.severity}">${sevLabel(a.severity)}</span></div>
        <div class="detail-row"><span>Vị trí</span><span>${a.location}</span></div>
        <div class="detail-row"><span>Thời điểm</span><span>${a.time}</span></div>
        <div class="detail-row"><span>Kéo dài</span><span>${a.duration || '—'}</span></div>
        ${a.speed_avg ? `<div class="detail-row"><span>Tốc độ TB</span><span>${a.speed_avg} km/h</span></div>` : ''}
        ${a.queue_length ? `<div class="detail-row"><span>Hàng đợi</span><span>${a.queue_length} xe</span></div>` : ''}
        ${a.vehicles_affected ? `<div class="detail-row"><span>Xe ảnh hưởng</span><span>${a.vehicles_affected}</span></div>` : ''}
        <div class="detail-row"><span>Nguồn phát hiện</span><span>${a.source}</span></div>
    `;
    if (a.evidence_cam) {
        html += `
            <div class="detail-evidence">
                <h5>📸 Ảnh chứng cứ từ ${a.evidence_cam}</h5>
                <img src="data/pexels-tkirkgoz-11546501.jpg" alt="evidence"/>
            </div>
        `;
    }
    html += `
        <div class="detail-actions">
            <button class="btn-led">📺 Push lên LED</button>
            <button class="btn-resolve">✓ Đánh dấu giải quyết</button>
            <button class="btn-escalate">⬆ Báo cáo</button>
        </div>
    `;
    el.innerHTML = html;
}

function startAlertTicker() {
    setInterval(() => {
        // Simulate alert duration progression
        const list = document.getElementById('alertCardsList');
        if (!list) return;
        // Just trigger a re-render with possibly updated time
    }, 10000);
}

// ================== LED ==================
function renderLEDBoards() {
    const grid = document.getElementById('ledBoardsGrid');
    if (!grid || !DATA.led_boards) return;
    grid.innerHTML = DATA.led_boards.map(b => `
        <div class="led-board-card ${b.type} ${b.status}">
            <div class="lb-head">
                <span class="lb-name">${b.name}</span>
                <span class="lb-status ${b.status}">${b.status === 'online' ? '✓ Online' : '✕ Offline'}</span>
            </div>
            <div class="lb-loc">📍 ${b.location} • ${b.size}</div>
            <div class="lb-screen ${b.msg_color}">${b.current_msg}</div>
            <div class="lb-foot">
                <span>${b.type === 'entrance' ? '🚪 Cửa ngõ' : b.type === 'highway' ? '🛣️ Cao tốc' : '📍 Nội đô'}</span>
                ${b.auto_pushed ? '<span class="auto-tag">AUTO</span>' : '<span>Manual</span>'}
            </div>
        </div>
    `).join('');
}

function renderLEDEditor() {
    const targetSel = document.getElementById('ledTarget');
    const tplSel = document.getElementById('ledTemplate');
    const msgInput = document.getElementById('ledMessageInput');
    const preview = document.getElementById('ledPreview');
    const colorBtns = document.querySelectorAll('.color-btn');
    const pushBtn = document.getElementById('btnPushLed');

    if (!targetSel || !tplSel || !msgInput || !preview) return;

    // Populate targets
    if (DATA.led_boards) {
        targetSel.innerHTML = '<option value="all">— Tất cả LED Online —</option>' +
            DATA.led_boards.filter(b => b.status === 'online')
                .map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    }

    // Populate templates
    if (DATA.led_message_templates) {
        tplSel.innerHTML = '<option value="">— Chọn mẫu —</option>' +
            DATA.led_message_templates.map(t => `<option value="${t.id}">${t.icon} ${t.text}</option>`).join('');
    }

    tplSel.addEventListener('change', () => {
        const t = (DATA.led_message_templates || []).find(x => x.id === tplSel.value);
        if (t) {
            msgInput.value = t.text.replace(/{[^}]+}/g, '...');
            setColor(t.color);
            updatePreview();
        }
    });

    msgInput.addEventListener('input', updatePreview);

    colorBtns.forEach(b => {
        b.addEventListener('click', () => {
            setColor(b.dataset.color);
            updatePreview();
        });
    });

    function setColor(c) {
        selectedColor = c;
        colorBtns.forEach(b => b.classList.toggle('active', b.dataset.color === c));
    }

    function updatePreview() {
        const txt = msgInput.value || '— PREVIEW —';
        preview.textContent = txt.toUpperCase();
        preview.className = 'led-screen color-' + selectedColor;
    }

    if (pushBtn) {
        pushBtn.addEventListener('click', () => {
            const target = targetSel.value;
            const txt = msgInput.value.trim();
            if (!txt) { alert('Nhập tin nhắn LED'); return; }
            const targetName = target === 'all' ? 'TẤT CẢ LED ONLINE (138 bảng)' : (DATA.led_boards.find(b => b.id === target)?.name || target);
            alert(`✓ Đã push thành công:\n\n📺 Đích: ${targetName}\n💬 Tin: "${txt.toUpperCase()}"\n🎨 Màu: ${selectedColor}\n\n(Demo - thực tế sẽ gửi qua REST API + RS-485)`);
        });
    }

    updatePreview();
}

function renderAutopushRules() {
    const list = document.getElementById('rulesList');
    if (!list || !DATA.auto_push_rules) return;
    list.innerHTML = DATA.auto_push_rules.map(r => `
        <div class="rule-card">
            <div class="rule-toggle ${r.active ? '' : 'off'}" onclick="this.classList.toggle('off')"></div>
            <div class="rule-body">
                <div class="rule-name">${r.name}</div>
                <div class="rule-cond">⚡ Điều kiện: ${r.condition}</div>
                <div class="rule-action">→ ${r.action}</div>
            </div>
            <div class="rule-stats">
                <div>Hôm nay</div>
                <div style="font-size:18px;">${r.triggered_today}</div>
                <div style="font-size:9px;color:var(--txt2);">lần kích hoạt</div>
            </div>
        </div>
    `).join('');
}

function renderAltRoutes() {
    const list = document.getElementById('altRoutesList');
    if (!list || !DATA.alternative_routes) return;
    list.innerHTML = DATA.alternative_routes.map(r => {
        const isPriRec = r.current_recommended === 'primary';
        return `
            <div class="alt-route-card">
                <div class="ar-head">
                    <div class="ar-od">📍 ${r.from} → ${r.to}</div>
                    <span class="ar-rec-tag ${r.current_recommended}">Đề xuất: ${isPriRec ? 'CHÍNH' : 'THAY THẾ'}</span>
                </div>
                <div class="ar-routes">
                    <div class="ar-route ${isPriRec ? 'recommended' : ''}">
                        <div class="ar-route-label">Tuyến chính</div>
                        <div class="ar-route-path">${r.primary}</div>
                        <div class="ar-route-time">⏱ ${r.primary_time} phút</div>
                    </div>
                    <div class="ar-route ${!isPriRec ? 'recommended' : ''}">
                        <div class="ar-route-label">Tuyến thay thế (Dijkstra/A*)</div>
                        <div class="ar-route-path">${r.alternative}</div>
                        <div class="ar-route-time">⏱ ${r.alt_time} phút</div>
                    </div>
                </div>
                <div class="ar-reason">💡 ${r.reason}</div>
            </div>
        `;
    }).join('');
}

// ================== AI ==================
function renderForecast() {
    const el = document.getElementById('forecastChart');
    if (!el || !DATA.hourly_stats) return;
    const max = Math.max(...DATA.hourly_stats.map(h => h.volume));
    const now = new Date().getHours();
    el.innerHTML = DATA.hourly_stats.map((h, i) => {
        const height = (h.volume / max) * 100;
        const cls = i > now ? 'predicted' : '';
        return `<div class="fc-bar ${cls}" style="height:${height}%" title="${h.hour}:00 - ${h.volume}K xe • ${h.avg_speed} km/h">
            ${i % 4 === 0 ? `<div class="fc-time">${h.hour}h</div>` : ''}
        </div>`;
    }).join('');
}

function renderPredictions() {
    const el = document.getElementById('predictionCards');
    if (!el || !DATA.ai_predictions) return;
    el.innerHTML = DATA.ai_predictions.map(p => `
        <div class="pred-card ${p.level}">
            <div class="pred-head">
                <span class="pred-name">${p.area}</span>
                <span class="pred-level ${p.level}">${sevLabel(p.level)}</span>
            </div>
            <div class="pred-time">⏰ ${p.predicted_in}</div>
            <div class="pred-meta">
                <span>Tốc độ: <strong style="color:var(--danger);">${p.expected_speed} km/h</strong></span>
                <span>Hàng đợi: <strong>${p.expected_queue} xe</strong></span>
            </div>
            <div class="pred-meta" style="margin-top:4px;">
                <span>Mô hình: ${p.model}</span>
                <span>Tin cậy: ${p.confidence}%</span>
            </div>
            <div class="pred-reason">💡 ${p.reason}</div>
        </div>
    `).join('');
}

function renderSuggestions() {
    const el = document.getElementById('suggestionList');
    if (!el || !DATA.decision_suggestions) return;
    el.innerHTML = DATA.decision_suggestions.map(s => `
        <div class="suggest-card">
            <div class="suggest-icon">${s.icon}</div>
            <div class="suggest-body">
                <div class="suggest-title">${s.title}</div>
                <div class="suggest-desc">${s.desc}</div>
                <div class="suggest-meta">
                    <span class="impact">Tác động: ${s.impact}</span>
                    <span class="send-to">Gửi đến: ${s.send_to}</span>
                    <span style="color:var(--txt2);">Module: ${s.module}</span>
                </div>
            </div>
            <button class="suggest-action">✓ Áp dụng</button>
        </div>
    `).join('');
}

function renderBlackspots() {
    const el = document.getElementById('blackspotBody');
    if (!el || !DATA.blackspots) return;
    el.innerHTML = DATA.blackspots.map(b => {
        const trendCls = b.trend === 'tăng' ? 'trend-up' : b.trend === 'giảm' ? 'trend-down' : 'trend-stable';
        const trendIcon = b.trend === 'tăng' ? '📈' : b.trend === 'giảm' ? '📉' : '➡';
        return `
            <tr>
                <td><span class="bs-rank">${b.rank}</span></td>
                <td><strong>${b.name}</strong></td>
                <td><span class="bs-type ${b.type}">${b.type === 'congestion' ? 'Ùn tắc' : b.type === 'accident' ? 'Tai nạn' : 'Cả hai'}</span></td>
                <td><strong style="color:var(--danger);">${b.incidents_per_week}</strong></td>
                <td>${b.avg_duration_min} phút</td>
                <td>${b.peak_hours}</td>
                <td class="${trendCls}">${trendIcon} ${b.trend}</td>
                <td>${b.zone}</td>
            </tr>
        `;
    }).join('');
}

// ================== STATS ==================
function renderHourlyDualChart() {
    const el = document.getElementById('hourlyDualChart');
    if (!el || !DATA.hourly_stats) return;
    const maxVol = Math.max(...DATA.hourly_stats.map(h => h.volume));
    const maxAlert = Math.max(...DATA.hourly_stats.map(h => h.alerts));
    el.innerHTML = DATA.hourly_stats.map((h, i) => {
        const vh = (h.volume / maxVol) * 100;
        const ah = maxAlert > 0 ? (h.alerts / maxAlert) * 50 : 0;
        return `<div class="dc-col" title="${h.hour}h: ${h.volume}K xe • ${h.alerts} cảnh báo">
            <div class="dc-volume" style="height:${vh}%"></div>
            <div class="dc-alerts" style="height:${ah}%;opacity:.7;"></div>
            ${i % 4 === 0 ? `<span class="dc-time">${h.hour}h</span>` : ''}
        </div>`;
    }).join('');
}

function renderWeeklyChart() {
    const el = document.getElementById('weeklyChart');
    if (!el || !DATA.weekly_stats) return;
    const max = Math.max(...DATA.weekly_stats.map(d => d.volume_M));
    el.innerHTML = DATA.weekly_stats.map(d => `
        <div class="wc-bar">
            <div class="wc-fill" style="height:${(d.volume_M / max) * 100}%" title="${d.volume_M}M xe • ${d.alerts} cảnh báo • ${d.avg_speed} km/h">${d.volume_M}M</div>
            <div class="wc-label">${d.day}</div>
        </div>
    `).join('');
}

function renderPublicAPI() {
    const el = document.getElementById('publicApiList');
    if (!el || !DATA.public_api) return;
    el.innerHTML = DATA.public_api.map(a => `
        <div class="api-card">
            <span class="method ${a.method.toLowerCase()}">${a.method}</span>
            <code>${a.path}</code>
            <span class="api-desc">${a.desc}</span>
            <span class="api-calls">${(a.calls_today / 1000).toFixed(0)}K calls/ngày</span>
        </div>
    `).join('');
}

function renderInternalAPI() {
    const el = document.getElementById('internalApiList');
    if (!el || !DATA.internal_api) return;
    el.innerHTML = DATA.internal_api.map(a => `
        <div class="api-card">
            <span class="method ${a.method.toLowerCase()}">${a.method}</span>
            <code>${a.path}</code>
            <span class="api-desc">${a.desc}</span>
        </div>
    `).join('');
}
