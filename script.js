// 전역 변수 및 초기화 설정
let globe;
const container = document.getElementById('globeViz');

// CORS 우회용 프록시 및 API 설정
const BASE_API_URL = 'https://restcountries.com/v3.1/alpha/';
const PROXY_URL = 'https://api.allorigins.win/raw?url='; 

function initGlobe() {
    try {
        if (typeof Globe === 'undefined') {
            console.error("Globe 라이브러리가 로드되지 않았습니다.");
            return;
        }

        // [완벽 복구] 칙칙한 흑백 이미지를 없애고, 아이들이 좋아하는 파스텔톤 컬러로 직접 칠합니다!
        globe = Globe()(container)
            .globeColor('#C8E6FF') // 맑고 예쁜 하늘색 바다
            .backgroundColor('#F1F2F6') // style.css의 배경색과 통일
            .showAtmosphere(true)
            .atmosphereColor('#4ECDC4') // 산뜻한 민트색 대기권 후광
            .atmosphereAltitude(0.15)
            
            // 땅(국가) 색상 및 두께 설정
            .polygonCapColor(() => '#FFE66D') // 기본 땅 색상 (따뜻한 노란색)
            .polygonSideColor(() => '#FF6B6B') // 땅 측면 두께 (코랄 핑크)
            .polygonStrokeColor(() => '#2F3542') // 국경선 색상
            .polygonAltitude(0.015) // 땅을 살짝 도톰하게 입체적으로
            
            // [추가] 마우스를 올렸을 때 색상이 변하는 호버 효과! (아이들 호기심 유발)
            .polygonHoverColor(() => '#FF9F43') 
            .polygonsTransitionDuration(300) // 부드러운 애니메이션
            
            // 클릭 이벤트 연결
            .polygonClick((polygon) => {
                const countryCode = polygon.properties.ISO_A3 || polygon.properties.iso_a3 || polygon.properties.ADM0_A3;
                if (countryCode && countryCode !== '-99') {
                    handleLocationClick(countryCode);
                }
            });

        // 🚨 [핵심 해결] 절대 끊기지 않는 가장 안정적인 깃헙 원본 데이터 주소로 교체했습니다.
        // 이 데이터가 로드되어야 노란색 땅이 생기고 클릭이 가능해집니다!
        fetch('https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
            .then(res => res.json())
            .then(countries => {
                globe.polygonsData(countries.features); // 드디어 예쁜 나라들이 지구본 위에 찰싹 붙습니다!
            })
            .catch(err => {
                console.error("국가 형태 데이터를 불러오는 데 실패했습니다:", err);
                // 화면에 에러를 띄워 문제 파악을 돕습니다.
                displayErrorMessage("지도를 불러오는 중");
            });

    } catch (error) {
        console.error("화면 초기화 중 오류 발생:", error);
    }
}

// 브라우저가 완벽히 준비된 후 안전하게 지구본 생성
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobe);
} else {
    initGlobe();
}

/**
 * 프록시로 안전하게 우회하여 국가 상세 정보를 가져오는 통신 함수
 */
async function handleLocationClick(countryCode) {
    if (!countryCode) return;
    
    const fields = '?fields=name,capital,capitalInfo,flags,translations';
    const primaryUrl = `${BASE_API_URL}${countryCode}${fields}`;
    const backupUrl = `${PROXY_URL}${encodeURIComponent(primaryUrl)}`;

    try {
        let response;
        try {
            response = await fetch(primaryUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('CORS 차단 또는 API 에러 발생');
        } catch (corsError) {
            response = await fetch(backupUrl);
        }

        if (!response || !response.ok) {
            throw new Error(`통신 실패. 상태코드: ${response ? response.status : '네트워크 끊김'}`);
        }

        const data = await response.json();
        renderCountryInfo(data);

    } catch (error) {
        console.error("국가 정보 로드 중 최종 에러:", error);
        displayErrorMessage(countryCode);
    }
}

/**
 * 지혜님의 style.css 레이아웃에 맞춰 정보를 예쁘게 렌더링하는 함수
 */
function renderCountryInfo(data) {
    const targetContainer = document.getElementById('info-panel');
    if (!targetContainer) return;

    const countryName = data.translations?.kor?.common || data.name?.common || '정보 없음';
    const capital = data.capital && data.capital[0] ? data.capital[0] : '정보 없음';
    const flagUrl = data.flags?.svg || data.flags?.png || '';

    targetContainer.innerHTML = `
        <h1 id="country-name">${countryName}</h1>
        <img id="country-flag" src="${flagUrl}" alt="${countryName} 국기">
        <div class="capital-container">
            <span class="capital-label">📍 수도 :</span>
            <span>${capital}</span>
        </div>
        <button id="close-btn" onclick="closeInfoPanel()">닫기</button>
    `;
    
    targetContainer.classList.remove('hidden');
    targetContainer.style.display = 'flex';
}

/**
 * 패널을 닫아주는 함수
 */
function closeInfoPanel() {
    const infoPanel = document.getElementById('info-panel');
    if (infoPanel) {
        infoPanel.classList.add('hidden');
        setTimeout(() => {
            if(infoPanel.classList.contains('hidden')) {
                infoPanel.style.display = 'none';
            }
        }, 300);
    }
}

/**
 * 데이터 통신 실패 시 에러창 표시 함수
 */
function displayErrorMessage(countryCode) {
    const targetContainer = document.getElementById('info-panel');
    if (targetContainer) {
        targetContainer.innerHTML = `
            <h1 id="country-name" style="font-size: 1.8rem; color: var(--primary-color);">⚠️ 연결 실패</h1>
            <div class="capital-container" style="font-size: 1.1rem; text-align: center; margin: 15px 0;">
                <span>정보를 불러오지 못했어요.<br>잠시 후 다시 시도해 주세요!</span>
            </div>
            <button id="close-btn" onclick="closeInfoPanel()">확인</button>
        `;
        targetContainer.classList.remove('hidden');
        targetContainer.style.display = 'flex';
    }
}
