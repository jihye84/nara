// 전체 코드 제공 규칙에 따라 script.js의 전체 소스코드를 작성합니다.

// 전역 변수 및 지도/글로브 초기화 설정
let globe;
const container = document.getElementById('globeViz');

// CORS 문제를 해결하기 위해 기본 URL 외에 프록시 주소를 활용할 수 있도록 설정
const BASE_API_URL = 'https://restcountries.com/v3.1/alpha/';
const PROXY_URL = 'https://api.allorigins.win/raw?url='; // CORS 우회용 프록시

// 3D 라이브러리(Three.js/Three-globe) 안전 초기화 확인
try {
    if (typeof Globe !== 'undefined') {
        globe = Globe()(container)
            .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
            .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
            .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
            .polygonClick((polygon) => {
                // 클릭한 폴리곤(국가)의 ISO 코드 추출 (예: CHN, RUS, KAZ 등)
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

// 지도 이벤트 연결 (기존 Leaflet 등 이벤트가 있다면 활용)
function onMapClick(e) {
    // 기존 클릭 이벤트 발생 시 국가 코드를 판별하는 로직이 있다면 이곳에 연결
    // 예시: fire DOM Event 대응
    if (e.target && e.target.feature && e.target.feature.properties) {
        const code = e.target.feature.properties.ISO_A3;
        if (code) handleLocationClick(code);
    }
}

/**
 * 국가 정보를 API로부터 가져와 화면에 표시하는 핵심 함수 (수정본)
 * @param {string} countryCode - ISO 국가 코드 (3자리)
 */
async function handleLocationClick(countryCode) {
    if (!countryCode) return;
    
    // 요청할 필드 상세 지정
    const fields = '?fields=name,capital,capitalInfo,flags,translations';
    const primaryUrl = `${BASE_API_URL}${countryCode}${fields}`;
    const backupUrl = `${PROXY_URL}${encodeURIComponent(primaryUrl)}`;

    console.log(`국가 데이터 요청 시작: ${countryCode}`);

    try {
        let response;
        
        // 1차 시도: 일반 fetch 요청
        try {
            response = await fetch(primaryUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
        } catch (corsError) {
            console.warn("기본 API 접근 실패(CORS 가능성), 프록시 서버로 우회를 시도합니다.");
            // 2차 시도: CORS 우회 프록시 서버 이용
            response = await fetch(backupUrl);
        }

        if (!response || !response.ok) {
            throw new Error(`HTTP 에러! 상태코드: ${response ? response.status : '네트워크 에러'}`);
        }

        const data = await response.json();
        
        // 가져온 데이터를 화면에 렌더링하는 함수 호출
        renderCountryInfo(data);

    } catch (error) {
        console.error("Error fetching country data:", error);
        // 사용자에게 에러 상황을 인지할 수 있도록 UI에 표시
        displayErrorMessage(countryCode);
    }
}

/**
 * 가져온 국가 데이터를 화면의 모달이나 상세창에 표시하는 함수
 * @param {Object} data - API 응답 데이터
 */
function renderCountryInfo(data) {
    const infoContainer = document.getElementById('countryInfo');
    if (!infoContainer) {
        console.error("국가 정보를 표시할 'countryInfo' 엘리먼트가 없습니다.");
        return;
    }

    // 한국어 번역명이 있으면 사용하고, 없으면 기본 이름 사용
    const countryName = data.translations?.kor?.common || data.name?.common || '정보 없음';
    const capital = data.capital && data.capital[0] ? data.capital[0] : '정보 없음';
    const flagUrl = data.flags?.svg || data.flags?.png || '';

    // 화면 UI 업데이트
    infoContainer.innerHTML = `
        <div class="country-card">
            <h2>${countryName}</h2>
            <img src="${flagUrl}" alt="${countryName} 국기" style="max-width: 150px; border: 1px solid #ccc; display: block; margin: 10px 0;">
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
            <div class="error-card" style="color: red; padding: 10px; border: 1px solid red;">
                <p>⚠️ <strong>${countryCode}</strong> 국가 정보를 불러오는 데 실패했습니다.</p>
                <p style="font-size: 12px; color: #666;">네트워크 연결 혹은 CORS 제한으로 인해 데이터를 가져올 수 없습니다. 잠시 후 다시 시도해 주세요.</p>
            </div>
        `;
        infoContainer.style.display = 'block';
    }
}
