// main.js

document.addEventListener('DOMContentLoaded', () => {
    // マップの初期化 (名古屋駅周辺を中心に設定)
    const map = L.map('map', {
        zoomControl: false // デフォルトのズームコントロールを無効化し、後で右下に配置する
    }).setView([35.170915, 136.881537], 15);

    // ズームコントロールを右下に配置
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    // OpenStreetMapのタイルレイヤーを追加
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    // エレベーター用のカスタムアイコン定義
    const elevatorIcon = L.divIcon({
        className: 'elevator-marker',
        html: `<div class="marker-pin"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 4C14.76 4 17 6.24 17 9C17 11.88 14.12 16.19 12 18.88C9.92 16.21 7 11.85 7 9C7 6.24 9.24 4 12 4ZM12 6C10.34 6 9 7.34 9 9C9 10.66 10.34 12 12 12C13.66 12 15 10.66 15 9C15 7.34 13.66 6 12 6Z" fill="white"/></svg></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
    });

    // 現在地用のマーカー
    let userLocationMarker = null;
    let destLocationMarker = null;
    let routeLine = null;
    let routeStepMarkers = L.layerGroup().addTo(map);

    // 稼働状況に応じたスタイル変更用の関数
    function getStatusClass(status) {
        if (!status) return 'status-unknown';
        if (status.includes('稼働中')) return 'status-active';
        if (status.includes('点検中')) return 'status-maintenance';
        return 'status-unknown';
    }

    // パネル要素の取得
    const infoPanel = document.getElementById('info-panel');
    const elevatorDetails = document.getElementById('elevator-details');
    const closePanelBtn = document.getElementById('close-panel');
    const locateBtn = document.getElementById('locate-btn');
    const customStartBtn = document.getElementById('custom-start-btn');
    const customDestBtn = document.getElementById('custom-dest-btn');
    const routeInfoPanel = document.getElementById('route-info');
    const nearbyElevatorsPanel = document.getElementById('nearby-elevators-panel');
    const nearbyElevatorsList = document.getElementById('nearby-elevators-list');
    const clearDestBtn = document.getElementById('clear-dest-btn');
    const routeDistanceText = document.getElementById('route-distance');
    const routeTimeAdultText = document.getElementById('route-time-adult');
    const routeTimeSeniorText = document.getElementById('route-time-senior');
    const routeTaxiFareText = document.getElementById('route-taxi-fare');
    const routeInstructionsList = document.getElementById('route-instructions-list');
    const clearRouteBtn = document.getElementById('clear-route-btn');
    
    // モーダルと検索の要素
    const basisModal = document.getElementById('basis-modal');
    const showBasisBtn = document.getElementById('show-basis-btn');
    const closeBasisModalBtn = document.getElementById('close-basis-modal');
    const searchInput = document.getElementById('station-search-input');
    const searchBtn = document.getElementById('station-search-btn');
    const startSearchInput = document.getElementById('start-search-input');
    const startSearchBtn = document.getElementById('start-search-btn');
    const destSearchInput = document.getElementById('dest-search-input');
    const destSearchBtn = document.getElementById('dest-search-btn');
    
    // 履歴・お気に入り関連の要素
    const historyBtn = document.getElementById('history-btn');
    const historyPanel = document.getElementById('history-panel');
    const closeHistoryBtn = document.getElementById('close-history');
    const historyList = document.getElementById('history-list');
    const tabRecent = document.getElementById('tab-recent');
    const tabFavorites = document.getElementById('tab-favorites');
    const historyEmptyMsg = document.getElementById('history-empty-msg');
    const startAddressDisplay = document.getElementById('start-address-display');
    const destAddressDisplay = document.getElementById('dest-address-display');
    const twoPointRouteBtn = document.getElementById('two-point-route-btn');
    const bulkResetBtnMap = document.getElementById('bulk-reset-btn-map');
    const mapHint = document.getElementById('map-hint');

    // 住所の保持用
    let currentStartAddress = "未設定";
    let currentDestAddress = "未設定";
    let currentHistoryTab = 'recent'; // 'recent' or 'favorites'
    
    // 使い方モーダルの要素
    const howToUseModal = document.getElementById('how-to-use-modal');
    const howToUseBtn = document.getElementById('how-to-use-btn');
    const closeHowToUseModalBtn = document.getElementById('close-how-to-use-modal');
    const closeHowToUseModalBottomBtn = document.getElementById('close-how-to-use-modal-bottom');

    // 使い方モーダルのイベント
    howToUseBtn.addEventListener('click', () => {
        howToUseModal.style.display = 'flex';
    });
    [closeHowToUseModalBtn, closeHowToUseModalBottomBtn].forEach(btn => {
        btn.addEventListener('click', () => {
            howToUseModal.style.display = 'none';
        });
    });
    howToUseModal.addEventListener('click', (e) => {
        if (e.target === howToUseModal) {
            howToUseModal.style.display = 'none';
        }
    });

    // 表示モード切り替え（PC/モバイル）
    const viewToggleBtn = document.getElementById('view-toggle-btn');
    const viewToggleLabel = document.getElementById('view-toggle-label');
    if (viewToggleBtn) {
        viewToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('forced-pc');
            const isForcedPc = document.body.classList.contains('forced-pc');
            if (viewToggleLabel) {
                viewToggleLabel.textContent = isForcedPc ? 'モバイル表示' : 'PC表示';
            }
            // マップサイズを再計算
            setTimeout(() => {
                map.invalidateSize();
            }, 300);
        });
    }

    // 算出根拠モーダルのイベント
    showBasisBtn.addEventListener('click', () => {
        basisModal.style.display = 'flex';
    });
    closeBasisModalBtn.addEventListener('click', () => {
        basisModal.style.display = 'none';
    });
    basisModal.addEventListener('click', (e) => {
        if (e.target === basisModal) {
            basisModal.style.display = 'none';
        }
    });

    // 駅検索機能
    function searchStation() {
        const query = searchInput.value.trim();
        if (!query) return;

        let foundLayer = null;
        map.eachLayer((layer) => {
            if (layer.feature && layer.feature.properties) {
                const props = layer.feature.properties;
                // type='station'かつ駅名にクエリが含まれているか検索
                if (props.type === 'station' && props.station.includes(query)) {
                    // 最初に見つかった駅を優先
                    if (!foundLayer) foundLayer = layer;
                }
            }
        });

        if (foundLayer) {
            map.flyTo(foundLayer.getLatLng(), 16);
            foundLayer.fire('click');
        } else {
            alert('該当する駅が見つかりませんでした。');
        }
    }

    searchBtn.addEventListener('click', searchStation);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchStation();
        }
    });

    // 住所/地名検索機能 (Nominatim API)
    async function searchLocation(query, type) {
        if (!query) return;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=136.7,35.3,137.1,35.0&bounded=1`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data && data.length > 0) {
                const result = data[0];
                const latlng = [parseFloat(result.lat), parseFloat(result.lon)];
                const address = formatAddress(result.address, result.display_name);
                
                if (type === 'start') {
                    currentStartAddress = address;
                    updateAddressUI('start', address);
                    updateStartLocationMarker(latlng, 16);
                } else if (type === 'dest') {
                    currentDestAddress = address;
                    updateAddressUI('dest', address);
                    updateDestLocationMarker(latlng, 16);
                }
            } else {
                alert('場所が見つかりませんでした。別の言葉で試してください。');
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            alert('検索中にエラーが発生しました。');
        }
    }

    // 座標から住所を取得 (逆ジオコーディング)
    async function reverseGeocode(lat, lon, type) {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            const address = formatAddress(data.address, data.display_name);
            if (type === 'start') {
                currentStartAddress = address;
                updateAddressUI('start', address);
            } else if (type === 'dest') {
                currentDestAddress = address;
                updateAddressUI('dest', address);
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
        }
    }

    // 住所を日本向けにフォーマットする
    function formatAddress(addr, displayName) {
        if (!addr) return displayName.split(',')[0];
        
        // 日本の住所順に構成（Nominatimのタグから動的に抽出）
        const parts = [];
        if (addr.province || addr.state) parts.push(addr.province || addr.state);
        if (addr.city) parts.push(addr.city);
        if (addr.city_district) parts.push(addr.city_district);
        if (addr.ward) parts.push(addr.ward);
        if (addr.suburb) parts.push(addr.suburb);
        if (addr.town) parts.push(addr.town);
        if (addr.village) parts.push(addr.village);
        if (addr.neighbourhood) parts.push(addr.neighbourhood);
        if (addr.road) parts.push(addr.road);
        
        // 番地・号を追加
        let houseInfo = "";
        if (addr.house_number) houseInfo = addr.house_number;
        if (addr.block_number) houseInfo += (houseInfo ? "-" : "") + addr.block_number;
        if (houseInfo) parts.push(houseInfo);
        
        if (parts.length > 0) {
            // 重複を除去して結合
            return parts.reduce((acc, curr, idx) => {
                if (acc.includes(curr)) return acc;
                // 最初以外で、前が数字で次も数字ならハイフンで繋ぐ等の処理はhouseInfoで済み
                return acc + curr;
            }, "");
        }
        
        return displayName.split(',')[0];
    }

    function updateAddressUI(type, address) {
        if (type === 'start') {
            startAddressDisplay.textContent = address;
            startSearchInput.value = address === '未設定' ? '' : address;
        } else {
            destAddressDisplay.textContent = address;
            destSearchInput.value = address === '未設定' ? '' : address;
        }
    }

    // コピー機能 (window関数として公開)
    window.copyDisplayAddress = function(elementId) {
        const text = document.getElementById(elementId).textContent;
        if (text === '未設定') return;
        navigator.clipboard.writeText(text).then(() => {
            alert('住所をコピーしました: ' + text);
        });
    };

    startSearchBtn.addEventListener('click', () => searchLocation(startSearchInput.value, 'start'));
    startSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchLocation(startSearchInput.value, 'start');
    });

    destSearchBtn.addEventListener('click', () => searchLocation(destSearchInput.value, 'dest'));
    destSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchLocation(destSearchInput.value, 'dest');
    });

    closePanelBtn.addEventListener('click', () => {
        infoPanel.classList.remove('active');
        if (routeLine) {
            map.removeLayer(routeLine);
            routeLine = null;
        }
        routeStepMarkers.clearLayers();
        routeInfoPanel.style.display = 'none';
        if (nearbyElevatorsPanel) nearbyElevatorsPanel.style.display = 'none';
    });

    // ルート消去
    clearRouteBtn.addEventListener('click', () => {
        if (routeLine) {
            map.removeLayer(routeLine);
            routeLine = null;
        }
        routeStepMarkers.clearLayers();
        routeInfoPanel.style.display = 'none';
        if (destLocationMarker && nearbyElevatorsPanel) {
            nearbyElevatorsPanel.style.display = 'block';
        }
    });

    if (clearDestBtn) {
        clearDestBtn.addEventListener('click', () => {
            if (destLocationMarker) {
                map.removeLayer(destLocationMarker);
                destLocationMarker = null;
            }
            if (routeLine) {
                map.removeLayer(routeLine);
                routeLine = null;
            }
            routeStepMarkers.clearLayers();
            if (nearbyElevatorsPanel) nearbyElevatorsPanel.style.display = 'none';
            routeInfoPanel.style.display = 'none';
        });
    }

    // --- 位置指定・ルート検索モード管理 ---
    let isCustomStartMode = false;
    let isCustomDestMode = false;
    let isTwoPointMode = false;
    let twoPointStep = 0; // 0: inactive, 1: waiting for start, 2: waiting for dest

    // 現在地取得
    locateBtn.addEventListener('click', () => {
        locateBtn.style.color = '#0b57d0';
        if (!navigator.geolocation) {
            alert('お使いのブラウザは現在地取得に対応していません。');
            locateBtn.style.color = '';
            return;
        }
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            updateStartLocationMarker([lat, lon], 16);
            locateBtn.style.color = '';
        }, (error) => {
            console.error('現在地取得に失敗しました:', error);
            alert('現在地を取得できませんでした。位置情報の利用を許可してください。');
            locateBtn.style.color = '';
        });
    });

    customStartBtn.addEventListener('click', () => {
        toggleMode('start');
    });

    customDestBtn.addEventListener('click', () => {
        toggleMode('dest');
    });

    twoPointRouteBtn.addEventListener('click', () => {
        toggleMode('two-point');
    });

    if (bulkResetBtnMap) {
        bulkResetBtnMap.addEventListener('click', () => {
            resetAll();
        });
    }

    function toggleMode(mode) {
        const prevStart = isCustomStartMode;
        const prevDest = isCustomDestMode;
        const prevTwo = isTwoPointMode;

        isCustomStartMode = false;
        isCustomDestMode = false;
        isTwoPointMode = false;
        twoPointStep = 0;
        customStartBtn.classList.remove('active');
        customDestBtn.classList.remove('active');
        twoPointRouteBtn.classList.remove('active');
        hideMapHint();

        if (mode === 'start' && !prevStart) {
            isCustomStartMode = true;
            customStartBtn.classList.add('active');
            map.getContainer().style.cursor = 'crosshair';
            showMapHint("地図をタップして出発地を選択してください");
        } else if (mode === 'dest' && !prevDest) {
            isCustomDestMode = true;
            customDestBtn.classList.add('active');
            map.getContainer().style.cursor = 'crosshair';
            showMapHint("地図をタップして目的地を選択してください");
        } else if (mode === 'two-point' && !prevTwo) {
            isTwoPointMode = true;
            twoPointStep = 1;
            twoPointRouteBtn.classList.add('active');
            map.getContainer().style.cursor = 'crosshair';
            showMapHint("【1点目】地図をタップして出発地を選択してください");
        } else {
            map.getContainer().style.cursor = '';
        }
    }

    function resetTwoPointMode() {
        isTwoPointMode = false;
        twoPointStep = 0;
        twoPointRouteBtn.classList.remove('active');
        map.getContainer().style.cursor = '';
        hideMapHint();
    }

    function showMapHint(text) {
        mapHint.textContent = text;
        mapHint.style.display = 'block';
    }

    function hideMapHint() {
        mapHint.style.display = 'none';
        map.getContainer().style.cursor = '';
    }

    // ナビゲーション誘導表示
    function showNavGuidance(missingType) {
        const label = missingType === 'start' ? '出発地' : '目的地';
        const buttonText = `地図から${label}を選択`;
        
        elevatorDetails.innerHTML = `
            <div class="nav-guide-container">
                <span class="nav-guide-msg">${label}が未設定です。</span>
                <div class="nav-guide-actions" style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px; width: 100%;">
                    <button class="guide-action-btn" id="guide-set-${missingType}-btn">${buttonText}</button>
                    <button class="guide-action-btn manual-search-btn" id="guide-manual-search-btn">ルートを検索</button>
                </div>
            </div>
        `;
        
        document.getElementById(`guide-set-${missingType}-btn`).onclick = () => {
            toggleMode(missingType);
        };

        document.getElementById('guide-manual-search-btn').onclick = () => {
            if (userLocationMarker && destLocationMarker) {
                const startPos = userLocationMarker.getLatLng();
                const destPos = destLocationMarker.getLatLng();
                findRouteBetween(startPos.lat, startPos.lng, destPos.lat, destPos.lng);
            } else {
                alert('出発地と目的地の両方を設定してください。');
            }
        };
        
        infoPanel.classList.add('active');
        routeInfoPanel.style.display = 'none';
        if (nearbyElevatorsPanel) nearbyElevatorsPanel.style.display = 'none';
    }

    // マーカーと住所のリセット機能
    window.resetLocation = function(type) {
        if (type === 'start') {
            if (userLocationMarker) {
                map.removeLayer(userLocationMarker);
                userLocationMarker = null;
            }
            currentStartAddress = "未設定";
            updateAddressUI('start', "未設定");
        } else if (type === 'dest') {
            if (destLocationMarker) {
                map.removeLayer(destLocationMarker);
                destLocationMarker = null;
            }
            currentDestAddress = "未設定";
            updateAddressUI('dest', "未設定");
        }
        
        clearCurrentRoute();
    };

    // すべてリセット
    window.resetAll = function() {
        if (userLocationMarker) { map.removeLayer(userLocationMarker); userLocationMarker = null; }
        if (destLocationMarker) { map.removeLayer(destLocationMarker); destLocationMarker = null; }
        currentStartAddress = "未設定";
        currentDestAddress = "未設定";
        updateAddressUI('start', "未設定");
        updateAddressUI('dest', "未設定");
        clearCurrentRoute();
    };

    function clearCurrentRoute() {
        if (routeLine) {
            map.removeLayer(routeLine);
            routeLine = null;
        }
        if (routeStepMarkers) routeStepMarkers.clearLayers();
        routeInfoPanel.style.display = 'none';
        summaryPanel.style.display = 'none';
        if (nearbyElevatorsPanel) nearbyElevatorsPanel.style.display = 'none';
        hideMapHint();
    }

    map.on('click', (e) => {
        if (isCustomStartMode) {
            updateStartLocationMarker([e.latlng.lat, e.latlng.lng], null);
            isCustomStartMode = false;
            customStartBtn.classList.remove('active');
            hideMapHint();
            
            // 両方の地点が揃っていれば自動検索
            if (destLocationMarker) {
                const startPos = userLocationMarker.getLatLng();
                const destPos = destLocationMarker.getLatLng();
                findRouteBetween(startPos.lat, startPos.lng, destPos.lat, destPos.lng);
            }
        } else if (isCustomDestMode) {
            updateDestLocationMarker([e.latlng.lat, e.latlng.lng], null);
            isCustomDestMode = false;
            customDestBtn.classList.remove('active');
            hideMapHint();

            // 両方の地点が揃っていれば自動検索
            if (userLocationMarker) {
                const startPos = userLocationMarker.getLatLng();
                const destPos = destLocationMarker.getLatLng();
                findRouteBetween(startPos.lat, startPos.lng, destPos.lat, destPos.lng);
            }
        } else if (isTwoPointMode) {
            if (twoPointStep === 1) {
                updateStartLocationMarker([e.latlng.lat, e.latlng.lng], null);
                twoPointStep = 2;
                showMapHint("【2点目】地図をタップして目的地を選択してください");
            } else if (twoPointStep === 2) {
                updateDestLocationMarker([e.latlng.lat, e.latlng.lng], null);
                const startPos = userLocationMarker.getLatLng();
                const destPos = [e.latlng.lat, e.latlng.lng];
                findRouteBetween(startPos.lat, startPos.lng, destPos[0], destPos[1]);
                resetTwoPointMode();
            }
        }
    });

    const startIcon = L.divIcon({
        className: 'start-marker-container',
        html: `<div class="start-pin">出発地</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
    });

    function updateStartLocationMarker(latlng, zoomLvl) {
        if (userLocationMarker) {
            userLocationMarker.setLatLng(latlng);
        } else {
            userLocationMarker = L.marker(latlng, { icon: startIcon }).addTo(map);
        }
        if (zoomLvl) {
            map.setView(latlng, zoomLvl);
        }
        // 位置が更新されたら住所も更新
        reverseGeocode(latlng[0], latlng[1], 'start');
    }

    const destIcon = L.divIcon({
        className: 'dest-marker-container',
        html: `<div class="dest-pin">到着地</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
    });

    function updateDestLocationMarker(latlng, zoomLvl) {
        if (destLocationMarker) {
            destLocationMarker.setLatLng(latlng);
        } else {
            destLocationMarker = L.marker(latlng, { icon: destIcon }).addTo(map);
        }
        if (zoomLvl) {
            map.setView(latlng, zoomLvl);
        }
        // 位置が更新されたら住所も更新
        reverseGeocode(latlng[0], latlng[1], 'dest');
        findNearbyElevators(latlng[0], latlng[1]);
    }

    // 距離計算 (ハバーサイン公式)
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // 地球の半径 km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // タクシー料金の概算計算（95%信頼区間の目安範囲）
    function calculateTaxiFare(distanceKm) {
        // 普通車: 初乗り0.91kmまで500円、以降約232mごとに100円
        let baseFare = 500;
        if (distanceKm > 0.91) {
            const extraDist = distanceKm - 0.91;
            const extraTicks = Math.ceil(extraDist / 0.232);
            baseFare += extraTicks * 100;
        }

        // 深夜料金 (2割増)
        const nightFare = Math.floor((baseFare * 1.2) / 10) * 10;
        
        // 大型車 (目安として1.3倍程度とする)
        const largeFare = Math.floor((baseFare * 1.3) / 10) * 10;

        return { 
            standard: baseFare, 
            night: nightFare, 
            large: largeFare 
        };
    }

    function translateManeuver(step, index) {
        if (!step || !step.maneuver) return '';
        const type = step.maneuver.type;
        const modifier = step.maneuver.modifier || '';
        const name = step.name || '';
        const distance = Math.round(step.distance);
        
        // 番号付きバッジの生成
        const numberBadge = `<span class="step-number-text">${index}</span>`;

        let direction = '';
        if (modifier.includes('left')) direction = '左';
        else if (modifier.includes('right')) direction = '右';
        else if (modifier.includes('straight')) direction = '直進';

        let action = '';
        if (type === 'depart') action = '出発します';
        else if (type === 'arrive') action = '目的地に到着します';
        else if (type === 'turn') action = direction ? `${direction}に曲がります` : '曲がります';
        else if (type === 'new name') action = direction ? `${direction}へ進みます` : '進みます';
        else if (direction) action = `${direction}方向へ進みます`;
        else action = '道なりに進みます';

        let text = action;
        if (name) {
            text = `「<strong>${name}</strong>」を${text}`;
        }
        
        if (distance > 0 && type !== 'arrive') {
            text += ` (約 ${distance}m)`;
        }
        
        return numberBadge + text;
    }

    // 近接エレベーターの検索
    function findNearbyElevators(lat, lon) {
        if (typeof elevatorData === 'undefined' || !elevatorData.features) return;
        
        const elevators = elevatorData.features.filter(f => f.properties.type !== 'station');
        const distances = elevators.map(elevator => {
            const elon = elevator.geometry.coordinates[0];
            const elat = elevator.geometry.coordinates[1];
            const dist = calculateDistance(lat, lon, elat, elon);
            return {
                ...elevator,
                distance: dist
            };
        });

        distances.sort((a, b) => a.distance - b.distance);
        const top5 = distances.slice(0, 5);

        nearbyElevatorsList.innerHTML = '';
        top5.forEach(item => {
            const li = document.createElement('li');
            li.style.cursor = 'pointer';
            li.style.color = '#0b57d0';
            li.innerHTML = `<strong>${item.properties.station}駅</strong>: ${(item.distance * 1000).toFixed(0)}m<br><span style="font-size: 0.75rem; color: #666;">${item.properties.location || item.properties.description || 'エレベーター'}</span>`;
            
            li.addEventListener('click', () => {
                const elon = item.geometry.coordinates[0];
                const elat = item.geometry.coordinates[1];
                map.setView([elat, elon], 17);
                // Trigger route finding from this elevator to destination
                findRouteBetween(elat, elon, lat, lon);
            });
            
            nearbyElevatorsList.appendChild(li);
        });

        infoPanel.classList.add('active');
        routeInfoPanel.style.display = 'none';
        nearbyElevatorsPanel.style.display = 'block';
    }

    // 既存の「現在地／出発地 → エレベーター(目的)」 ルート検索
    async function findRoute(destLat, destLon) {
        if (!userLocationMarker) {
            showNavGuidance('start');
            return;
        }
        const startLat = userLocationMarker.getLatLng().lat;
        const startLon = userLocationMarker.getLatLng().lng;
        return findRouteBetween(startLat, startLon, destLat, destLon);
    }

    // 指定の2点間のルート検索と表示
    async function findRouteBetween(startLat, startLon, destLat, destLon) {
        // OSRM APIを使用して徒歩ルートを検索 (steps=trueに変更)
        const url = `https://router.project-osrm.org/route/v1/foot/${startLon},${startLat};${destLon},${destLat}?overview=full&geometries=geojson&steps=true`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.code !== 'Ok') {
                throw new Error('ルートを検索できませんでした');
            }

            const route = data.routes[0];
            const distanceKm = route.distance / 1000;
            const distanceStr = distanceKm.toFixed(2); // km
            
            // 成人: 4.0km/h, 高齢者: 3.5km/h
            const adultTime = Math.ceil(distanceKm / 4.0 * 60);
            const seniorTime = Math.ceil(distanceKm / 3.5 * 60);
            
            // タクシー料金
            const taxiFare = calculateTaxiFare(distanceKm);

            // ルート案内の作成
            routeInstructionsList.innerHTML = '';
            routeStepMarkers.clearLayers();
            const steps = route.legs && route.legs[0] && route.legs[0].steps ? route.legs[0].steps : [];
            if (steps.length > 0) {
                steps.forEach((step, idx) => {
                    const stepNum = idx + 1;
                    const text = translateManeuver(step, stepNum);
                    if (text) {
                        const li = document.createElement('li');
                        li.innerHTML = text;
                        routeInstructionsList.appendChild(li);

                        // 地図上に番号付きマーカーを表示
                        const coords = step.maneuver.location;
                        const icon = L.divIcon({
                            className: 'step-number-marker',
                            html: `<div class="step-number-icon">${stepNum}</div>`,
                            iconSize: [24, 24],
                            iconAnchor: [12, 12]
                        });
                        L.marker([coords[1], coords[0]], { icon: icon }).addTo(routeStepMarkers);
                    }
                });
            } else {
                routeInstructionsList.innerHTML = '<li>案内データがありません。</li>';
            }

            // 地図上にルートを描画
            if (routeLine) {
                map.removeLayer(routeLine);
            }

            const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            routeLine = L.polyline(coords, { color: '#0b57d0', weight: 6, opacity: 0.7 }).addTo(map);

            map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

            // パネルに情報を表示
            routeDistanceText.textContent = `${distanceStr} km`;
            routeTimeAdultText.textContent = `${adultTime} 分`;
            routeTimeSeniorText.textContent = `${seniorTime} 分`;
            // パネルを表示して結果へ。2点指定の場合も詳細情報を表示
            routeInfoPanel.style.display = 'block';
            infoPanel.classList.add('active'); // パネルを前面に
            
            // 下部（結果）へスムーズにスクロール
            setTimeout(() => {
                routeInfoPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);

            // ルートが正常に見つかったタイミングで履歴に保存
            saveToHistory(currentStartAddress, currentDestAddress);
            
            // 表示方法: 比較表を更新
            document.getElementById('fare-standard-day').textContent = `約${taxiFare.standard}円`;
            document.getElementById('fare-standard-night').textContent = `約${taxiFare.night}円`;
            document.getElementById('fare-large-day').textContent = `約${taxiFare.large}円`;
            
            if (nearbyElevatorsPanel) nearbyElevatorsPanel.style.display = 'none';
            routeInfoPanel.style.display = 'block';

        } catch (error) {
            console.error('Routing error:', error);
            // 代替案として直線を表示し、計算値を出す
            const directDist = calculateDistance(startLat, startLon, destLat, destLon);
            // 直線だとルートが短く計算されすぎるため、実道路距離の概算として1.3倍する
            const estimatedRouteDist = directDist * 1.3;

            const adultTime = Math.ceil(estimatedRouteDist / 4.0 * 60);
            const seniorTime = Math.ceil(estimatedRouteDist / 3.5 * 60);
            const taxiFare = calculateTaxiFare(estimatedRouteDist);

            routeDistanceText.textContent = `${estimatedRouteDist.toFixed(2)} km (直線概算)`;
            routeTimeAdultText.textContent = `${adultTime} 分 (目安)`;
            routeTimeSeniorText.textContent = `${seniorTime} 分 (目安)`;
            
            // 正常なルートが見つからなくても、検索自体は行われたため履歴に保存
            saveToHistory(currentStartAddress, currentDestAddress);

            // 表示方法: 比較表を更新
            document.getElementById('fare-standard-day').textContent = `約${taxiFare.standard}円`;
            document.getElementById('fare-standard-night').textContent = `約${taxiFare.night}円`;
            document.getElementById('fare-large-day').textContent = `約${taxiFare.large}円`;
            
            routeInstructionsList.innerHTML = '<li>直線距離で計算したため、詳細な案内は表示できません。</li>';
            
            if (nearbyElevatorsPanel) nearbyElevatorsPanel.style.display = 'none';
            routeInfoPanel.style.display = 'block';

            if (routeLine) map.removeLayer(routeLine);
            routeLine = L.polyline([[startLat, startLon], [destLat, destLon]], { color: '#FF3B30', dashArray: '10, 10' }).addTo(map);
        }
    }

    // 次発列車を取得する関数 (方面ごとに2-3本表示)
    function getNextTrain(stationName) {
        if (!stationName) return { error: "駅名が不明です" };
        stationName = stationName.trim();
        if (typeof timetableData === 'undefined') return { error: "時刻表ファイルが読み込まれていません" };
        if (!timetableData[stationName]) return { error: "データがありません (" + stationName + ")" };
        
        const now = new Date();
        const hr = now.getHours();
        const min = now.getMinutes();
        
        const day = now.getDay();
        const isWeekend = (day === 0 || day === 6);
        const dayType = isWeekend ? "土休日" : "平日";
        
        const directions = timetableData[stationName];
        let allDirectionsHtml = [];
        
        for (const dir in directions) {
            const timeTable = directions[dir][dayType];
            if (!timeTable) continue;
            
            let currentHr = hr;
            let currentMin = min;
            let dirTrains = [];
            
            // 各方面ごとに直近3本を探す
            while(currentHr < 25 && dirTrains.length < 3) {
                if (timeTable[currentHr]) {
                    for (let m of timeTable[currentHr]) {
                        if (currentHr > hr || m >= currentMin) {
                            let diffMin = (currentHr - hr) * 60 + (m - min);
                            let departStr = `${currentHr}:${String(m).padStart(2, '0')}`;
                            dirTrains.push({
                                timeStr: departStr,
                                diffMin: diffMin
                            });
                            if (dirTrains.length >= 3) break;
                        }
                    }
                }
                currentHr++;
                currentMin = 0;
            }
            
            // 方面ごとのHTML構築
            let dirHtml = `<div style="margin-bottom: 8px;">
                <div style="font-size: 0.8rem; font-weight: bold; color: var(--secondary-color); border-left: 3px solid var(--primary-color); padding-left: 6px; margin-bottom: 4px;">${dir}方面</div>`;
            
            if (dirTrains.length > 0) {
                dirHtml += dirTrains.map(t => {
                    let diffText = t.diffMin === 0 ? "まもなく発車" : `あと ${t.diffMin} 分`;
                    return `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 2px 0; font-size: 0.85rem;">
                                <span>${t.timeStr}発</span>
                                <span style="color: #0b57d0; font-weight: bold;">${diffText}</span>
                            </div>`;
                }).join('');
            } else {
                dirHtml += `<div style="font-size: 0.8rem; color: #999;">本日の運行は終了しました</div>`;
            }
            dirHtml += `</div>`;
            allDirectionsHtml.push(dirHtml);
        }
        
        if (allDirectionsHtml.length > 0) {
            return { info: allDirectionsHtml.join('') };
        }
        return { info: "運行データがありません" };
    }

    // --- 履歴・お気に入り管理ロジック ---
    let searchHistory = JSON.parse(localStorage.getItem('nagoya_elevator_history') || '[]');
    let searchFavorites = JSON.parse(localStorage.getItem('nagoya_elevator_favorites') || '[]');

    function saveToHistory(start, dest) {
        if (start === '未設定' || dest === '未設定') return;
        
        // 重複チェック
        const exists = searchHistory.find(h => h.start === start && h.dest === dest);
        if (exists) return;

        searchHistory.unshift({ start, dest, id: Date.now() });
        if (searchHistory.length > 20) searchHistory.pop();
        
        localStorage.setItem('nagoya_elevator_history', JSON.stringify(searchHistory));
        if (currentHistoryTab === 'recent') renderHistory();
    }



    function renderHistory() {
        historyList.innerHTML = '';
        const items = currentHistoryTab === 'recent' ? searchHistory : searchFavorites;
        
        if (items.length === 0) {
            historyEmptyMsg.style.display = 'block';
            return;
        }
        historyEmptyMsg.style.display = 'none';

        items.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'history-item';
            
            const isFav = searchFavorites.some(f => f.start === item.start && f.dest === item.dest);
            
            li.innerHTML = `
                <div class="history-item-content">
                    <div class="history-item-title">${item.start} → ${item.dest}</div>
                </div>
                <button class="fav-toggle-btn ${isFav ? 'is-fav' : ''}" data-index="${index}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z"/>
                    </svg>
                </button>
            `;
            
            // 履歴クリックで検索実行
            li.querySelector('.history-item-content').addEventListener('click', () => {
                startSearchInput.value = item.start;
                destSearchInput.value = item.dest;
                searchLocation(item.start, 'start');
                searchLocation(item.dest, 'dest');
                historyPanel.style.display = 'none';
            });

            // お気に入りトグル
            li.querySelector('.fav-toggle-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(item);
            });

            historyList.appendChild(li);
        });
    }

    function toggleFavorite(item) {
        const favIndex = searchFavorites.findIndex(f => f.start === item.start && f.dest === item.dest);
        if (favIndex > -1) {
            searchFavorites.splice(favIndex, 1);
        } else {
            searchFavorites.unshift({ ...item, id: Date.now() });
        }
        localStorage.setItem('nagoya_elevator_favorites', JSON.stringify(searchFavorites));
        renderHistory();
    }

    // イベントリスナー
    historyBtn.addEventListener('click', () => {
        historyPanel.style.display = 'flex';
        renderHistory();
    });

    closeHistoryBtn.addEventListener('click', () => {
        historyPanel.style.display = 'none';
    });

    tabRecent.addEventListener('click', () => {
        currentHistoryTab = 'recent';
        tabRecent.classList.add('active');
        tabFavorites.classList.remove('active');
        renderHistory();
    });

    tabFavorites.addEventListener('click', () => {
        currentHistoryTab = 'favorites';
        tabFavorites.classList.add('active');
        tabRecent.classList.remove('active');
        renderHistory();
    });

    // GeoJSONデータの読み込みと描画
    // ローカルファイルでのCORSエラーを回避するため、all-elevators.jsから直接読み込む
    try {
        if (typeof elevatorData === 'undefined') {
            throw new Error('データが見つかりません。');
        }

        const data = elevatorData;

        L.geoJSON(data, {
            pointToLayer: function (feature, latlng) {
                const isStation = feature.properties.type === 'station';
                const isToilet = feature.properties.type === 'toilet';

                if (isStation) {
                    return L.circleMarker(latlng, {
                        radius: 8,
                        fillColor: "#0b57d0",
                        color: "#ffffff",
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    });
                } else if (isToilet) {
                    return L.circleMarker(latlng, {
                        radius: 6,
                        fillColor: "#1aa260", // 緑色
                        color: "#ffffff",
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.9
                    });
                } else {
                    // エレベーター
                    return L.circleMarker(latlng, {
                        radius: 6,
                        fillColor: "#FF3B30", // 赤色
                        color: "#ffffff",
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.9
                    });
                }
            },
            onEachFeature: function (feature, layer) {
                const props = feature.properties;

                // ピンの横に説明文を追加
                let labelText = "";
                if (props.type === 'station') labelText = props.station + "駅";
                else if (props.type === 'toilet') labelText = props.name || "多目的トイレ";
                else labelText = props.station ? props.station + "駅" : "エレベーター";

                if (labelText) {
                    layer.bindTooltip(labelText, {
                        permanent: true,
                        direction: 'right',
                        className: 'pin-label',
                        offset: [10, 0]
                    });
                }

                if (props.type === 'station') {
                    const hasElevatorText = props.has_elevator ? "✔ エレベーター情報あり" : "✖ エレベーター情報なし (OSM)";
                    const statusColor = props.has_elevator ? "#1aa260" : "#d93025";

                    layer.bindPopup(`<div style="font-weight:bold; font-size:14px;">${props.station}駅</div><div style="font-size:11px; color:${statusColor};">${hasElevatorText}</div>`, {
                        closeButton: false,
                        className: 'station-popup'
                    });

                    layer.on('click', () => {
                        let timetableHtml = "";
                        const nextResult = getNextTrain(props.station);
                        if (nextResult && nextResult.info) {
                            timetableHtml = `
                                <div style="margin-top: 10px; padding: 10px; background-color: #f1f3f4; border-radius: 8px;">
                                    <h5 style="margin: 0 0 5px 0; font-size: 0.85rem; color: #444746;">🕒 次発の電車</h5>
                                    <div style="font-size: 0.9rem; font-weight: bold; color: #1f1f1f; line-height: 1.4; max-height: 120px; overflow-y: auto; padding-right: 4px;">${nextResult.info}</div>
                                </div>
                            `;
                        } else if (nextResult && nextResult.error) {
                            timetableHtml = `
                                <div style="margin-top: 10px; padding: 10px; background-color: #f1f3f4; border-radius: 8px;">
                                    <span style="font-size: 0.8rem; color: #d32f2f;">エラー: ${nextResult.error}</span>
                                </div>
                            `;
                        }

                        elevatorDetails.innerHTML = `
                                <div class="detail-card">
                                    <h4><span class="station-tag" style="background-color: #0b57d0;">${props.station}駅</span></h4>
                                    <p class="detail-desc" style="margin-top: 10px;">${hasElevatorText}</p>
                                    ${timetableHtml}
                                    <p style="font-size: 12px; color: #666; margin-top: 15px;">※ このピンは駅の代表点を示しています。<br>周辺の赤いピンがエレベーターの位置です。</p>
                                </div>
                            `;
                        infoPanel.classList.add('active');
                        infoPanel.classList.add('active');
                    });

                } else if (props.type === 'toilet') {
                    layer.bindPopup(`<div style="font-weight:bold;">${props.name}</div><div style="font-size:12px;">${props.location}</div>`, {
                        closeButton: false
                    });

                    layer.on('click', () => {
                        elevatorDetails.innerHTML = `
                            <div class="detail-card">
                                <h4><span class="station-tag" style="background-color: #1aa260;">${props.name}</span></h4>
                                <p style="margin-top:10px;"><strong>場所:</strong> ${props.location}</p>
                                <p><strong>詳細:</strong> ${props.description}</p>
                                <div class="detail-status" style="display: flex; align-items: center; gap: 8px; margin-top: 10px;">
                                    <span style="width: 10px; height: 10px; border-radius: 50%; background-color: #1aa260;"></span>
                                    <span style="font-size: 0.9rem; font-weight: 600;">利用可能</span>
                                </div>
                                <div class="action-area" style="margin-top: 20px;">
                                    <button id="find-route-to-toilet-btn" class="route-btn" style="width: 100%; padding: 10px; background: #0b57d0; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
                                        ここへのルート検索
                                    </button>
                                </div>
                            </div>
                        `;
                        infoPanel.classList.add('active');
                        document.getElementById('find-route-to-toilet-btn').onclick = () => {
                            findRoute(layer.getLatLng().lat, layer.getLatLng().lng);
                        };
                    });
                } else {
                    const statusClass = getStatusClass(props.status);
                    const statusText = props.status || '稼働中';

                    const popupContent = `
                            <div class="custom-popup">
                                <h4 style="margin: 0 0 5px 0;">${props.station}駅</h4>
                                <p style="margin: 0; font-size: 12px; color: #666;">${props.location || props.description || 'エレベーター'}</p>
                            </div>
                        `;
                    layer.bindPopup(popupContent, {
                        closeButton: false,
                        className: 'elevator-popup'
                    });

                    layer.on('click', () => {
                        let timetableHtml = "";
                        const nextResult = getNextTrain(props.station);
                        if (nextResult && nextResult.info) {
                            timetableHtml = `
                                <div style="margin-top: 10px; padding: 10px; background-color: #f1f3f4; border-radius: 8px;">
                                    <h5 style="margin: 0 0 5px 0; font-size: 0.85rem; color: #444746;">🕒 直近の電車 (3本まで)</h5>
                                    <div style="font-size: 0.9rem; color: #1f1f1f; line-height: 1.4; max-height: 120px; overflow-y: auto; padding-right: 4px;">${nextResult.info}</div>
                                </div>
                            `;
                        } else if (nextResult && nextResult.error) {
                            timetableHtml = `
                                <div style="margin-top: 10px; padding: 10px; background-color: #f1f3f4; border-radius: 8px;">
                                    <span style="font-size: 0.8rem; color: #d32f2f;">エラー: ${nextResult.error}</span>
                                </div>
                            `;
                        }

                        const template = `
                            <div class="detail-card">
                                <h4><span class="station-tag">${props.station}駅</span></h4>
                                <h5 class="detail-location-title" style="margin: 10px 0 5px; font-size: 1rem;">${props.location || 'エレベーター位置'}</h5>
                                <p class="detail-desc" style="font-size: 0.9rem; color: #666; margin-bottom: 10px;">${props.description || '地下鉄駅エレベーター'}</p>
                                <div class="detail-status" style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
                                    <span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${statusText === '稼働中' ? '#1aa260' : '#f4b400'};"></span>
                                    <span style="font-size: 0.9rem; font-weight: 600;">${statusText}</span>
                                </div>
                                ${timetableHtml}
                                <div class="action-area" style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px;">
                                    <button id="find-route-btn" class="route-btn" style="width: 100%; padding: 10px; background: #0b57d0; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-bottom: 4px;">
                                        出発地・現在地からここへのルート検索
                                    </button>
                                    <button id="find-dest-route-btn" class="route-btn" style="width: 100%; padding: 10px; background: #0F9D58; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
                                        ここから到着地へのルート検索
                                    </button>
                                    <a href="https://www.kotsu.city.nagoya.jp/jp/pc/subway/timetable.html" target="_blank" rel="noopener noreferrer" style="display: block; width: 100%; padding: 10px; background: #f8f9fa; color: #0b57d0; border: 1px solid #0b57d0; border-radius: 8px; font-weight: bold; text-align: center; text-decoration: none; box-sizing: border-box;">
                                        🚇 時刻表を見る (交通局公式)
                                    </a>
                                </div>
                            </div>
                        `;
                        elevatorDetails.innerHTML = template;
                        infoPanel.classList.add('active');

                        // ルート検索ボタンのイベントリスナー（動的に追加された要素用）
                        document.getElementById('find-route-btn').onclick = () => {
                            const latlng = layer.getLatLng();
                            findRoute(latlng.lat, latlng.lng);
                        };
                        document.getElementById('find-dest-route-btn').onclick = () => {
                            const latlng = layer.getLatLng();
                            if (!destLocationMarker) {
                                showNavGuidance('dest');
                                return;
                            }
                            const destLat = destLocationMarker.getLatLng().lat;
                            const destLon = destLocationMarker.getLatLng().lng;
                            findRouteBetween(latlng.lat, latlng.lng, destLat, destLon);
                        };
                    });
                }
            }
        }).addTo(map);
    } catch (error) {
        console.error('GeoJSONの読み込みに失敗しました:', error);
        elevatorDetails.innerHTML = `<p style="color: red; padding: 15px;">データの読み込みに失敗しました。<br>表示に必要なデータファイルが存在するか確認してください。</p>`;
        infoPanel.classList.add('active'); // エラーが見えるようにパネルを表示
    }
});
