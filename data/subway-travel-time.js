// subway-travel-time.js
// 名古屋市営地下鉄 駅間所要時間データ（分）
// 出典: 名古屋市営地下鉄 所要時間マップ

const subwayTravelTimeData = {
    lines: {
        // 東山線 (H01-H22)
        "東山線": {
            color: "#FFD700",
            stations: [
                "高畑", "八田", "岩塚", "中村公園", "中村日赤",
                "本陣", "亀島", "名古屋", "伏見", "栄",
                "新栄町", "千種", "今池", "池下", "覚王山",
                "本山", "東山公園", "星ヶ丘", "一社", "上社",
                "本郷", "藤が丘"
            ],
            // 各区間の所要時間（分）: stations[i] ↔ stations[i+1]
            intervals: [
                2, 2, 2, 2, 2,
                1, 2, 2, 2, 2,
                2, 2, 2, 2, 2,
                2, 2, 2, 1, 2,
                2
            ]
        },
        // 名城線 (M01-M28 + 右回り左回りの環状)
        "名城線": {
            color: "#9400D3",
            stations: [
                "金山", "東別院", "上前津", "矢場町", "栄",
                "久屋大通", "市役所", "名古屋城", "黒川", "志賀本通",
                "平安通", "大曽根", "ナゴヤドーム前矢田", "砂田橋", "茶屋ヶ坂",
                "本山", "自由ヶ丘", "星ヶ丘", "東山公園", "一社",
                "上社", "本郷", "藤が丘", "新瑞橋", "瑞穂運動場西",
                "瑞穂区役所", "新瑞橋", "堀田", "伝馬町", "神宮西",
                "熱田神宮伝馬町", "熱田神宮西", "金山"
            ],
            // 環状線のため配列で管理（時計回り順）
            // 実際の接続は stationConnections で管理
            intervals: []
        },
        // 名港線 (E01-E07)
        "名港線": {
            color: "#808080",
            stations: [
                "金山", "日比野", "六番町", "東海通", "港区役所",
                "築地口", "名古屋港"
            ],
            intervals: [
                4, 6, 2, 2, 1, 2
            ]
        },
        // 鶴舞線 (T01-T20)
        "鶴舞線": {
            color: "#0000FF",
            stations: [
                "上小田井", "庄内緑地公園", "庄内通", "浄心", "浅間町",
                "丸の内", "伏見", "大須観音", "上前津", "鶴舞",
                "荒畑", "御器所", "川名", "いりなか", "八事",
                "塩釜口", "植田", "原", "平針", "赤池",
                "日進"
            ],
            intervals: [
                2, 2, 2, 2, 2,
                2, 3, 1, 1, 4,
                1, 1, 1, 2, 2,
                1, 1, 1, 2, 9
            ]
        },
        // 桜通線 (S01-S21)
        "桜通線": {
            color: "#FF0000",
            stations: [
                "中村区役所", "名古屋", "国際センター", "丸の内", "久屋大通",
                "高岳", "車道", "今池", "吹上", "御器所",
                "桜山", "瑞穂区役所", "瑞穂運動場西", "新瑞橋", "神沢",
                "徳重"
            ],
            intervals: [
                2, 2, 2, 2, 2,
                2, 2, 2, 2, 2,
                2, 2, 2, 2, 2
            ]
        },
        // 上飯田線 (K01-K02)
        "上飯田線": {
            color: "#FF69B4",
            stations: [
                "上飯田", "平安通"
            ],
            intervals: [
                2
            ]
        }
    },
    
    // 駅間接続データ（双方向）
    // { from: "駅名", to: "駅名", time: 分, line: "路線名" }
    connections: []
};

// 各路線の接続データを自動生成
(function buildConnections() {
    const lines = subwayTravelTimeData.lines;
    const connections = subwayTravelTimeData.connections;
    
    for (const lineName in lines) {
        const line = lines[lineName];
        const stations = line.stations;
        const intervals = line.intervals;
        
        if (stations.length < 2) continue;
        
        // 名城線は環状線のため特別処理（後述）
        if (lineName === "名城線") continue;
        
        for (let i = 0; i < stations.length - 1; i++) {
            const travelTime = intervals[i] || 2; // デフォルト2分
            connections.push({
                from: stations[i],
                to: stations[i + 1],
                time: travelTime,
                line: lineName
            });
            connections.push({
                from: stations[i + 1],
                to: stations[i],
                time: travelTime,
                line: lineName
            });
        }
    }
    
    // 名城線（環状線）の駅間データを手動追加
    const meijyoConnections = [
        // 右回り（名古屋城 → 久屋大通 → 栄 → ... → 金山 → ... → 大曽根 → 名古屋城）
        { from: "金山", to: "東別院", time: 2 },
        { from: "東別院", to: "上前津", time: 2 },
        { from: "上前津", to: "矢場町", time: 2 },
        { from: "矢場町", to: "栄", time: 2 },
        { from: "栄", to: "久屋大通", time: 1 },
        { from: "久屋大通", to: "市役所", time: 2 },
        { from: "市役所", to: "名古屋城", time: 2 },
        { from: "名古屋城", to: "黒川", time: 2 },
        { from: "黒川", to: "志賀本通", time: 1 },
        { from: "志賀本通", to: "平安通", time: 1 },
        { from: "平安通", to: "大曽根", time: 3 },
        { from: "大曽根", to: "ナゴヤドーム前矢田", time: 2 },
        { from: "ナゴヤドーム前矢田", to: "砂田橋", time: 1 },
        { from: "砂田橋", to: "茶屋ヶ坂", time: 2 },
        { from: "茶屋ヶ坂", to: "本山", time: 4 },
        { from: "本山", to: "自由ヶ丘", time: 2 },
        { from: "自由ヶ丘", to: "星ヶ丘", time: 6 },
        { from: "星ヶ丘", to: "一社", time: 6 },
        { from: "一社", to: "上社", time: 2 },
        { from: "上社", to: "新瑞橋", time: 2 },
        { from: "新瑞橋", to: "瑞穂運動場東", time: 2 },
        { from: "瑞穂運動場東", to: "新瑞橋", time: 2 },
        { from: "新瑞橋", to: "堀田", time: 2 },
        { from: "堀田", to: "伝馬町", time: 2 },
        { from: "伝馬町", to: "神宮西", time: 1 },
        { from: "神宮西", to: "熱田神宮伝馬町", time: 2 },
        { from: "熱田神宮伝馬町", to: "熱田神宮西", time: 2 },
        { from: "熱田神宮西", to: "金山", time: 2 }
    ];
    
    meijyoConnections.forEach(c => {
        connections.push({ ...c, line: "名城線" });
        connections.push({ from: c.to, to: c.from, time: c.time, line: "名城線" });
    });
    
    // 乗り換え可能駅（同一駅で複数路線が交差）
    // 乗り換え時間は一般的に2〜3分と仮定
    // ※ 実際の乗換時間はホームによって異なる
})();

// 駅名から路線と接続情報を検索するヘルパー関数
function findSubwayRoute(fromStation, toStation) {
    const connections = subwayTravelTimeData.connections;
    
    if (fromStation === toStation) return { found: true, time: 0, route: [] };
    
    // BFS（幅優先探索）でダイクストラ的に最短ルートを探す
    const visited = new Set();
    const queue = [{ station: fromStation, time: 0, path: [fromStation], lines: [] }];
    
    while (queue.length > 0) {
        // 最小時間のノードを取り出す
        queue.sort((a, b) => a.time - b.time);
        const current = queue.shift();
        
        if (current.station === toStation) {
            return {
                found: true,
                time: current.time,
                route: current.path,
                lines: current.lines
            };
        }
        
        if (visited.has(current.station)) continue;
        visited.add(current.station);
        
        // 隣接駅を探す
        const neighbors = connections.filter(c => c.from === current.station);
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor.to)) {
                queue.push({
                    station: neighbor.to,
                    time: current.time + neighbor.time,
                    path: [...current.path, neighbor.to],
                    lines: [...current.lines, neighbor.line]
                });
            }
        }
    }
    
    return { found: false, time: null, route: [], lines: [] };
}

// 最寄り駅検索ヘルパー（緯度経度から近い駅を返す）
function findNearestStation(lat, lon) {
    if (typeof elevatorData === 'undefined') return null;
    
    const stations = elevatorData.features.filter(f => f.properties.type === 'station');
    if (stations.length === 0) return null;
    
    let nearest = null;
    let minDist = Infinity;
    
    stations.forEach(station => {
        const slon = station.geometry.coordinates[0];
        const slat = station.geometry.coordinates[1];
        const dist = Math.sqrt(Math.pow(lat - slat, 2) + Math.pow(lon - slon, 2));
        if (dist < minDist) {
            minDist = dist;
            nearest = {
                name: station.properties.station,
                lat: slat,
                lon: slon,
                distDeg: dist
            };
        }
    });
    
    return nearest;
}
