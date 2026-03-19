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
                if (type === 'start') {
                    updateStartLocationMarker(latlng, 16);
                } else if (type === 'dest') {
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

    // 現在地取得
    locateBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert('お使いのブラウザは現在地取得に対応していません。');
            return;
        }

        locateBtn.style.color = '#0b57d0';

        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const latlng = [lat, lon];
            
            updateStartLocationMarker(latlng, 16);
            locateBtn.style.color = '';
        }, (error) => {
            console.error('現在地取得に失敗しました:', error);
            alert('現在地を取得できませんでした。位置情報の利用を許可してください。');
            locateBtn.style.color = '';
        });
    });

    // 出発地点・到着地点を手動指定モード
    let isCustomStartMode = false;
    let isCustomDestMode = false;

    customStartBtn.addEventListener('click', () => {
        isCustomStartMode = !isCustomStartMode;
        isCustomDestMode = false;
        if (customDestBtn) customDestBtn.classList.remove('active');
        
        if (isCustomStartMode) {
            customStartBtn.classList.add('active');
            map.getContainer().style.cursor = 'crosshair';
            alert('地図上をタップ（クリック）して出発地点を設定してください。');
        } else {
            customStartBtn.classList.remove('active');
            map.getContainer().style.cursor = '';
        }
    });

    if (customDestBtn) {
        customDestBtn.addEventListener('click', () => {
            isCustomDestMode = !isCustomDestMode;
            isCustomStartMode = false;
            customStartBtn.classList.remove('active');
            
            if (isCustomDestMode) {
                customDestBtn.classList.add('active');
                map.getContainer().style.cursor = 'crosshair';
                alert('地図上をタップ（クリック）して到着地点(目的地)を設定してください。');
            } else {
                customDestBtn.classList.remove('active');
                map.getContainer().style.cursor = '';
            }
        });
    }

    map.on('click', (e) => {
        if (isCustomStartMode) {
            updateStartLocationMarker([e.latlng.lat, e.latlng.lng], null);
            isCustomStartMode = false;
            customStartBtn.classList.remove('active');
            map.getContainer().style.cursor = '';
        } else if (isCustomDestMode) {
            updateDestLocationMarker([e.latlng.lat, e.latlng.lng], null);
            isCustomDestMode = false;
            if (customDestBtn) customDestBtn.classList.remove('active');
            map.getContainer().style.cursor = '';
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
        if (distanceKm <= 0.91) {
            return { base: 500, min: 500, max: 500 };
        }
        // 初乗り0.91km以降、約232m (0.232km) ごとに100円
        const extraDist = distanceKm - 0.91;
        const extraTicks = Math.ceil(extraDist / 0.232);
        const baseFare = 500 + extraTicks * 100;

        // ±約10%で変動幅（信頼区間目安）を作成する
        const minFare = Math.max(500, Math.floor((baseFare * 0.9) / 100) * 100);
        const maxFare = Math.ceil((baseFare * 1.15) / 100) * 100;

        return { base: baseFare, min: minFare, max: maxFare };
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
            alert('まず出発地点を設定してください（現在地ボタン、または出発地点を手動指定ボタンを使用）。');
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
            
            // 表示方法: 例 "約800円 〜 1000円" 
            const fareDisplay = taxiFare.min === taxiFare.max ? `約${taxiFare.base}円` : `約${taxiFare.min}円 ～ ${taxiFare.max}円`;
            routeTaxiFareText.textContent = fareDisplay;
            
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
            
            const fareDisplay = taxiFare.min === taxiFare.max ? `約${taxiFare.base}円` : `約${taxiFare.min}円 ～ ${taxiFare.max}円`;
            routeTaxiFareText.textContent = `${fareDisplay} (目安)`;
            
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
                                alert('まず到着地点(目的地)を設定してください（到着地点を手動指定ボタンを使用）。');
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
