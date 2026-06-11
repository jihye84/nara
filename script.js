// 지혜님의 style.css 레이아웃 및 디자인 가이드라인에 완벽히 호환되도록 수정한 전체 소스코드입니다.

// 전역 변수 및 지도/글로브 초기화 설정
let globe;
const container = document.getElementById('globeViz');

// 외부 API 및 CORS 우회용 프록시 설정
const BASE_API_URL = 'https://restcountries.com/v3.1/alpha/';
const PROXY_URL = 'https://api.allorigins.win/raw?url='; // CORS 우회용 프록시

/**
 * 3D 라이브러리(Three-globe) 안전 초기화 함수
 * 지혜님의 귀여운 맵 스타일에 맞게 화사한 블루 마블 지구본 테마를 적용했습니다.
 */
function initGlobe() {
    try {
        if (typeof Globe !== 'undefined') {
            globe = Globe()(container)
                // [귀여운 디자인 복구] 칙칙한 우주선 뷰 대신 아이들이 좋아하는 밝고 화사한 지구본 이미지 매칭
                .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
                .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png') // 밤하늘 배경
                
                // CSS 테마 컬러인 연한 파스텔톤 녹색/하늘색 구획 스타일 적용
                .polygonSideColor(() => 'rgba(78, 205, 196, 0.2)') // --secondary-color 활용한 투명도 설정
                .polygonStrokeColor(() => '#FF6B6B') // --primary-color 활용한 아기자기한 국경선 테두리
                
                .polygonClick((polygon) => {
                    // 클릭한 국가의 ISO 3자리 코드 판별
                    const countryCode = polygon.properties.ISO_A3 || polygon.properties.dataset?.iso_a3;
                    if (countryCode) {
                        handleLocationClick(countryCode);
                    }
                });
        } else {
            console.error("Globe 라이브러리가 로드되지 않았습니다.");
        }
    } catch (error) {
        console.error("화면 초기화 중 오류 발생 (Three-globe 관련):", error);
    }
}

// 브라우저가 라이브러리와 돔 요소를 완벽히 준비한 시점에 지구본 생성 (타이밍 에러 완벽 차단)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobe);
} else {
    initGlobe();
}

// 2D 지도 모드가 따로 있을 경우 호환성 유지를 위한 이벤트 연결
function onMapClick(e) {
    if (e.target && e.target.feature && e.target.feature.properties) {
        const code = e.target.feature.properties.ISO_A3;
        if (code) handleLocationClick(code);
    }
}

/**
 * CORS 차단 정책을 프록시로 안전하게 우회하여 국가 정보를 가져오는 핵심 함수
 * @param {string} countryCode - ISO 국가 코드 (3자리)
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
            // 1차 시도: 일반 API fetch
            response = await fetch(primaryUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('CORS 차단 또는 API 에러 발생');
        } catch (corsError) {
            console.warn("CORS 제한이 감지되어 프록시 서버 우회망을 가동합니다.");
            // 2차 시도: 차단막을 우회하는 백업 프록시 요청
            response = await fetch(backupUrl);
        }

        if (!response || !response.ok) {
            throw new Error(`데이터를 가져오는 데 실패했습니다. 상태코드: ${response ? response.status : '네트워크 끊김'}`);
        }

        const data = await response.json();
        renderCountryInfo(data);

    } catch (error) {
        console.error("국가 정보 로드 중 최종 에러:", error);
        displayErrorMessage(countryCode);
    }
}

/**
 * 지혜님이 style.css에 정의해 두신 #info-panel 규칙을 100% 활용하는 렌더링 함수
 * @param {Object} data - 외부 API 응답 데이터
 */
function renderCountryInfo(data) {
    // 지혜님의 CSS에 정의된 핵심 컨테이너 가져오기
    const infoPanel = document.getElementById('info-panel');
    
    // 혹시 HTML의 대소문자나 ID명이 다를 경우를 위한 예외 처리 백업
    const targetContainer = infoPanel || document.getElementById('countryInfo');
    
    if (!targetContainer) {
        console.error("국가 정보를 표시할 패널(#info-panel)이 HTML에 존재하지 않습니다.");
        return;
    }

    // 아이들이 보기 편하게 번역 데이터 가공 (한국어 우선, 없으면 영문명)
    const countryName = data.translations?.kor?.common || data.name?.common || '정보 없음';
    const capital = data.capital && data.capital[0] ? data.capital[0] : '정보 없음';
    const flagUrl = data.flags?.svg || data.flags?.png || '';

    // 지혜님의 귀여운 CSS 스타일 클래스명 구조 그대로 바인딩
    targetContainer.innerHTML = `
        <h1 id="country-name">${countryName}</h1>
        <img id="country-flag" src="${flagUrl}" alt="${countryName} 국기">
        <div class="capital-container">
            <span class="capital-label">📍 수도 :</span>
            <span>${capital}</span>
        </div>
        <button id="close-btn" onclick="closeInfoPanel()">닫기</button>
    `;
    
    // CSS 효과가 자연스럽게 먹히도록 클래스 제어 (.hidden 제거)
    targetContainer.classList.remove('hidden');
    targetContainer.style.display = 'flex'; // Flex 정렬 유지
}

/**
 * 패널을 닫을 때 부드러운 애니메이션을 주며 숨겨주는 함수
 */
function closeInfoPanel() {
    const infoPanel = document.getElementById('info-panel') || document.getElementById('countryInfo');
    if (infoPanel) {
        infoPanel.classList.add('hidden');
        // 애니메이션 트랜지션이 끝난 후 완전히 숨김 처리
        setTimeout(() => {
            if(infoPanel.classList.contains('hidden')) {
                infoPanel.style.display = 'none';
            }
        }, 300);
    }
}

/**
 * 데이터 통신 실패 시 지혜님의 CSS 카드 스타일을 유지하면서 에러를 띄워주는 함수
 */
function displayErrorMessage(countryCode) {
    const targetContainer = document.getElementById('info-panel') || document.getElementById('countryInfo');
    if (targetContainer) {
        targetContainer.innerHTML = `
            <h1 id="country-name" style="font-size: 1.8rem; color: #FF6B6B;">⚠️ 연결 실패</h1>
            <div class="capital-container" style="font-size: 1.1rem; text-align: center; margin: 15px 0;">
                <span>${countryCode} 정보를 불러오지 못했어요.<br>잠시 후 다시 시도해 주세요!</span>
            </div>
            <button id="close-btn" onclick="closeInfoPanel()">확인</button>
        `;
        targetContainer.classList.remove('hidden');
        targetContainer.style.display = 'flex';
    }
}
