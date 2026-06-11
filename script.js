// 전역 변수 및 초기화 설정
let globe;
const container = document.getElementById('globeViz');

// CORS 우회용 프록시 및 API 설정
const BASE_API_URL = 'https://restcountries.com/v3.1/alpha/';
const PROXY_URL = 'https://api.allorigins.win/raw?url='; 

function initGlobe() {
    if (typeof Globe === 'undefined') {
        console.error("Globe 라이브러리가 로드되지 않았습니다.");
        return;
    }

    // 🚨 가짜 명령어(globeColor)를 삭제하고, 무조건 작동하는 맑은 바다 이미지를 씌웠습니다.
    globe = Globe()(container)
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-water.png') 
        .backgroundColor('#F1F2F6') // style.css 배경과 동일한 밝은 톤
        .showAtmosphere(true)
        .atmosphereColor('#4ECDC4')
        .atmosphereAltitude(0.15)
        
        // 아이들을 위한 노란색/코랄색 귀여운 영토 디자인
        .polygonCapColor(() => '#FFE66D') 
        .polygonSideColor(() => '#FF6B6B') 
        .polygonStrokeColor(() => '#2F3542') 
        .polygonAltitude(0.015) 
        
        // 마우스 호버 시 주황색으로 반짝!
        .polygonHoverColor(() => '#FF9F43') 
        .polygonsTransitionDuration(300) 
        
        // 영토 클릭 시 정보창 띄우기
        .polygonClick((polygon) => {
            const countryCode = polygon.properties.ISO_A3 || polygon.properties.iso_a3 || polygon.properties.ADM0_A3;
            if (countryCode && countryCode !== '-99') {
                handleLocationClick(countryCode);
            }
        });

    // 영토 데이터를 가져와서 지도 위에 예쁘게 덮어줍니다.
    fetch('https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
        .then(res => res.json())
        .then(countries => {
            globe.polygonsData(countries.features); 
        })
        .catch(err => {
            console.error("국가 데이터를 불러오는 데 실패했습니다:", err);
            displayErrorMessage("지도");
        });
}

// 브라우저가 완벽히 준비된 후 안전하게 시작
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobe);
} else {
    initGlobe();
}

/**
 * 프록시를 통해 에러 없이 국가 정보를 가져오는 함수
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
            if (!response.ok) throw new Error('CORS 차단');
        } catch (corsError) {
            response = await fetch(backupUrl);
        }

        if (!response || !response.ok) {
            throw new Error('네트워크 오류');
        }

        const data = await response.json();
        renderCountryInfo(data);

    } catch (error) {
        console.error("에러 발생:", error);
        displayErrorMessage(countryCode);
    }
}

/**
 * 지혜님의 예쁜 CSS 디자인을 그대로 살려 모달창에 렌더링
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
 * 모달창 부드럽게 닫기
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
 * 통신 실패 시 귀여운 안내창 출력
 */
function displayErrorMessage(countryCode) {
    const targetContainer = document.getElementById('info-panel');
    if (targetContainer) {
        targetContainer.innerHTML = `
            <h1 id="country-name" style="font-size: 1.8rem; color: #FF6B6B;">⚠️ 연결 실패</h1>
            <div class="capital-container" style="font-size: 1.1rem; text-align: center; margin: 15px 0;">
                <span>정보를 불러오지 못했어요.<br>잠시 후 다시 시도해 주세요!</span>
            </div>
            <button id="close-btn" onclick="closeInfoPanel()">확인</button>
        `;
        targetContainer.classList.remove('hidden');
        targetContainer.style.display = 'flex';
    }
}
