// --- 1. 전역 변수 및 API 설정 ---
const BASE_API_URL = 'https://restcountries.com/v3.1/alpha/';
const PROXY_URL = 'https://api.allorigins.win/raw?url=';
let map, globe;
let isGlobeMode = false;

// --- 2. 2D 지도(Leaflet) 초기화 (지혜님의 진짜 클릭 무대 복구!) ---
function initMap() {
    // 2D 맵 생성 및 초기 위치 설정
    map = L.map('map').setView([20, 0], 2);
    
    // 지혜님 디자인에 어울리는 파스텔톤 배경 지도 불러오기
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // 국가 경계선 데이터를 불러와 2D 지도에 예쁘게 입히기
    fetch('https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
        .then(res => res.json())
        .then(data => {
            L.geoJSON(data, {
                style: {
                    color: '#2F3542',     // 국경선 색상
                    weight: 1,
                    fillColor: '#FFE66D', // 땅 색상 (노란색)
                    fillOpacity: 0.6
                },
                onEachFeature: function (feature, layer) {
                    // 마우스 올리면 주황색으로 반짝!
                    layer.on('mouseover', function () {
                        this.setStyle({ fillColor: '#FF9F43', fillOpacity: 0.8 });
                    });
                    // 마우스 떼면 원상복구
                    layer.on('mouseout', function () {
                        this.setStyle({ fillColor: '#FFE66D', fillOpacity: 0.6 });
                    });
                    // 🚨 [가장 중요] 클릭했을 때 국가 코드 전달!
                    layer.on('click', function (e) {
                        const code = feature.properties.ISO_A3 || feature.properties.ADM0_A3;
                        if (code && code !== '-99') handleLocationClick(code);
                    });
                }
            }).addTo(map);
        })
        .catch(err => console.error("2D 맵 데이터 로드 실패:", err));
}

// --- 3. 3D 지구본 초기화 ---
function initGlobe() {
    const container = document.getElementById('globe');
    globe = Globe()(container)
        .globeColor('#C8E6FF') 
        .backgroundColor('#F1F2F6') 
        .showAtmosphere(true)
        .atmosphereColor('#4ECDC4') 
        .atmosphereAltitude(0.15)
        .polygonCapColor(() => '#FFE66D') 
        .polygonSideColor(() => '#FF6B6B') 
        .polygonStrokeColor(() => '#2F3542') 
        .polygonAltitude(0.015) 
        .polygonHoverColor(() => '#FF9F43') 
        .polygonsTransitionDuration(300) 
        .polygonClick((polygon) => {
            const countryCode = polygon.properties.ISO_A3 || polygon.properties.ADM0_A3;
            if (countryCode && countryCode !== '-99') handleLocationClick(countryCode);
        });

    fetch('https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
        .then(res => res.json())
        .then(countries => {
            globe.polygonsData(countries.features); 
        });
}

// --- 4. 화면 로드 완료 시 기능 연결 ---
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initGlobe();
    
    // 모드 전환(Toggle) 버튼 이벤트
    const modeBtn = document.getElementById('mode-toggle');
    const mapDiv = document.getElementById('map');
    const globeDiv = document.getElementById('globe');
    
    modeBtn.addEventListener('click', () => {
        isGlobeMode = !isGlobeMode;
        if (isGlobeMode) {
            mapDiv.classList.add('hidden');
            globeDiv.classList.remove('hidden');
            modeBtn.innerText = '지도 모드';
        } else {
            globeDiv.classList.add('hidden');
            mapDiv.classList.remove('hidden');
            modeBtn.innerText = '지구본 모드';
        }
    });
});

// --- 5. 국가 정보 불러오기 및 UI 함수 (CORS 에러 완벽 해결본) ---
async function handleLocationClick(countryCode) {
    if (!countryCode) return;
    const primaryUrl = `${BASE_API_URL}${countryCode}?fields=name,capital,capitalInfo,flags,translations`;
    const backupUrl = `${PROXY_URL}${encodeURIComponent(primaryUrl)}`;

    try {
        let response;
        try {
            response = await fetch(primaryUrl, { headers: { 'Accept': 'application/json' }});
            if (!response.ok) throw new Error('CORS 차단');
        } catch (e) {
            response = await fetch(backupUrl);
        }
        if (!response.ok) throw new Error('네트워크 오류');

        const data = await response.json();
        renderCountryInfo(data);
    } catch (error) {
        displayErrorMessage(countryCode);
    }
}

function renderCountryInfo(data) {
    const panel = document.getElementById('info-panel');
    if (!panel) return;
    const countryName = data.translations?.kor?.common || data.name?.common || '정보 없음';
    const capital = data.capital && data.capital[0] ? data.capital[0] : '정보 없음';
    const flagUrl = data.flags?.svg || data.flags?.png || '';

    panel.innerHTML = `
        <h1 id="country-name">${countryName}</h1>
        <img id="country-flag" src="${flagUrl}" alt="${countryName} 국기">
        <div class="capital-container">
            <span class="capital-label">📍 수도 :</span>
            <span>${capital}</span>
        </div>
        <button id="close-btn" onclick="closeInfoPanel()">닫기</button>
    `;
    panel.classList.remove('hidden');
    panel.style.display = 'flex';
}

function closeInfoPanel() {
    const panel = document.getElementById('info-panel');
    if (panel) {
        panel.classList.add('hidden');
        setTimeout(() => { if(panel.classList.contains('hidden')) panel.style.display = 'none'; }, 300);
    }
}

function displayErrorMessage(countryCode) {
    const panel = document.getElementById('info-panel');
    if (panel) {
        panel.innerHTML = `
            <h1 id="country-name" style="font-size: 1.8rem; color: #FF6B6B;">⚠️ 연결 실패</h1>
            <div class="capital-container" style="font-size: 1.1rem; text-align: center; margin: 15px 0;">
                <span>정보를 불러오지 못했어요.</span>
            </div>
            <button id="close-btn" onclick="closeInfoPanel()">확인</button>
        `;
        panel.classList.remove('hidden');
        panel.style.display = 'flex';
    }
}
