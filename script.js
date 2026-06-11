// 전역 변수 및 지도/글로브 초기화 설정
let globe;
const container = document.getElementById('globeViz');

// CORS 문제를 해결하기 위해 기본 URL 외에 프록시 주소를 활용할 수 있도록 설정
const BASE_API_URL = 'https://restcountries.com/v3.1/alpha/';
const PROXY_URL = 'https://api.allorigins.win/raw?url='; // CORS 우회용 프록시

// 라이브러리 초기화 타이밍 문제를 해결하기 위한 함수
function initGlobe() {
    try {
        if (typeof Globe !== 'undefined') {
            globe = Globe()(container)
                // [수정] 기존의 칙칙한 우주 야경 이미지 대신, 초등학생들이 보기 좋은 밝고 귀여운 세계지도 스타일로 변경합니다.
                // 만약 폴더 내에 직접 만든 귀여운 이미지(예: 'images/cute-map.png')가 있다면 그 경로를 적어주셔도 됩니다!
                .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg') 
                .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png') // 밤하늘 배경
                .polygonSideColor(() => 'rgba(0, 100, 0, 0.15)') // 국경선 안쪽 색상 (부드러운 녹색 톤)
                .polygonStrokeColor(() => '#111') // 국경선 테두리 선 (선명하게)
                .polygonClick((polygon) => {
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

// 브라우저가 HTML과 라이브러리를 모두 읽은 뒤 안정적으로 지구본을 그리도록 이벤트를 연결
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobe);
} else {
    initGlobe();
}

// 지도 이벤트 연결
function onMapClick(e) {
    if (e.target && e.target.feature && e.target.feature.properties) {
        const code = e.target.feature.properties.ISO_A3;
        if (code) handleLocationClick(code);
    }
}

/**
 * 국가 정보를 API로부터 가져와 화면에 표시하는 핵심 함수
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
            if (!response.ok) throw new Error('Primary API failed');
        } catch (corsError) {
            console.warn("기본 API 접근 실패(CORS 가능성), 프록시 서버로 우회를 시도합니다.");
            response = await fetch(backupUrl);
        }

        if (!response || !response.ok) {
            throw new Error(`HTTP 에러! 상태코드: ${response ? response.status : '네트워크 에러'}`);
        }

        const data = await response.json();
        renderCountryInfo(data);

    } catch (error) {
        console.error("Error fetching country data:", error);
        displayErrorMessage(countryCode);
    }
}

/**
 * 가져온 국가 데이터를 화면의 모달이나 상세창에 표시하는 함수
 */
function renderCountryInfo(data) {
    const infoContainer = document.getElementById('countryInfo');
    if (!infoContainer) return;

    const countryName = data.translations?.kor?.common || data.name?.common || '정보 없음';
    const capital = data.capital && data.capital[0] ? data.capital[0] : '정보 없음';
    const flagUrl = data.flags?.svg || data.flags?.png || '';

    infoContainer.innerHTML = `
        <div class="country-card">
            <h2>${countryName}</h2>
            <img src="${flagUrl}" alt="${countryName} 국기" style="max-width: 150px; border: 1px solid #ccc; display: block; margin: 10px 0; border-radius: 4px;">
            <p><strong>수도:</strong> ${capital}</p>
        </div>
    `;
    infoContainer.style.display = 'block';
}

/**
 * 데이터 로드 실패 시 화면에 안내 메시지를 출력하는 함수
 */
function displayErrorMessage(countryCode) {
    const infoContainer = document.getElementById('countryInfo');
    if (infoContainer) {
        infoContainer.innerHTML = `
            <div class="error-card" style="color: #ff4d4d; padding: 15px; border: 1px solid #ff4d4d; border-radius: 4px; background: #fff5f5;">
                <p>⚠️ <strong>${countryCode}</strong> 정보를 가져오지 못했습니다.</p>
                <p style="font-size: 12px; color: #666; margin: 5px 0 0 0;">잠시 후 다시 클릭해 주세요.</p>
            </div>
        `;
        infoContainer.style.display = 'block';
    }
}
