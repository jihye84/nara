// 전역 변수 및 지도/글로브 초기화 설정
let globe;
const container = document.getElementById('globeViz');

// CORS 문제를 해결하기 위해 기본 URL 외에 프록시 주소를 활용할 수 있도록 설정
const BASE_API_URL = 'https://restcountries.com/v3.1/alpha/';
const PROXY_URL = 'https://api.allorigins.win/raw?url='; 

function initGlobe() {
    try {
        if (typeof Globe === 'undefined') {
            console.error("Globe 라이브러리가 로드되지 않았습니다.");
            return;
        }

        // [수정] 새까만 공 대신 맑고 산뜻한 파란색 바다 이미지를 덮어씌웁니다.
        globe = Globe()(container)
            .globeImageUrl('//unpkg.com/three-globe/example/img/earth-water.png')
            .backgroundColor('#F1F2F6') // 우주 배경 대신 CSS의 연한 회백색 배경 적용
            .showAtmosphere(true)
            .atmosphereColor('#4ECDC4') // 대기권 후광을 산뜻한 민트색으로
            .atmosphereAltitude(0.15)
            
            // 땅(국가) 색상 설정: CSS 파스텔톤 컬러 적극 활용
            .polygonCapColor(() => '#FFE66D') // 기본 땅 색상 (노란색)
            .polygonSideColor(() => '#FF6B6B') // 땅 측면 두께 색상 (코랄 핑크)
            .polygonStrokeColor(() => '#2F3542') // 국경선 색상 (진한 회색)
            .polygonAltitude(0.01) // 땅을 아주 살짝 입체적으로 튀어나오게 설정
            
            // 클릭 이벤트
            .polygonClick((polygon) => {
                const countryCode = polygon.properties.ISO_A3 || polygon.properties.iso_a3 || polygon.properties.ADM0_A3;
                if (countryCode && countryCode !== '-99') {
                    handleLocationClick(countryCode);
                }
            });

        // 🚨 [수정] 파일이 누락되지 않는 가장 안정적인 GitHub CDN 주소로 데이터를 가져옵니다.
        fetch('https://cdn.jsdelivr.net/gh/vasturiano/globe.gl@master/example/datasets/ne_110m_admin_0_countries.geojson')
            .then(res => res.json())
            .then(countries => {
                globe.polygonsData(countries.features); // 이제 까만 바다 위에 노란 땅들이 예쁘게 올라갑니다!
            })
            .catch(err => console.error("국가 형태 데이터를 불러오는 데 실패했습니다:", err));

    } catch (error) {
        console.error("화면 초기화 중 오류 발생:", error);
    }
}

// 브라우저가 준비된 후 안전하게 지구본 생성
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobe);
} else {
    initGlobe();
}

/**
 * CORS 차단 정책을 프록시로 안전하게 우회하여 국가 정보를 가져오는 핵심 함수
 */
async function handleLocationClick(countryCode) {
    if (!countryCode) return;
    
    const fields = '?fields=name,capital,capitalInfo,flags,translations';
    const primaryUrl = `${BASE_API_URL}${countryCode}${fields}`;
    const backupUrl = `${PROXY_URL}${encodeURIComponent(primaryUrl)}`;

    console.log(`국가 데이터 요청 시작: ${countryCode}`);

    try {
        let response;
        try {
            response = await fetch(primaryUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('CORS 차단 또는 API 에러 발생');
        } catch (corsError) {
            console.warn("CORS 제한 우회 프록시 서버 가동 중...");
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
 * 레이아웃에 맞춰 정보를 렌더링하는 함수
 */
function renderCountryInfo(data) {
    const targetContainer = document.getElementById('info-panel');
    
    if (!targetContainer) {
        console.error("#info-panel 요소를 찾을 수 없습니다.");
        return;
    }

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
                <span>${countryCode} 정보를 불러오지 못했어요.<br>잠시 후 다시 시도해 주세요!</span>
            </div>
            <button id="close-btn" onclick="closeInfoPanel()">확인</button>
        `;
        targetContainer.classList.remove('hidden');
        targetContainer.style.display = 'flex';
    }
}
