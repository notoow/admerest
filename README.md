# admerest

전문의별 총 수술 케이스를 중심으로, 진피 누적 길이를 탑과 랜드마크로 함께 둘러보는 반응형 3D 프로토타입.

실행 사이트: https://notoow.github.io/admerest/

## 배포

`main`에 push하면 `.github/workflows/pages.yml`이 JavaScript와 모델 파일을 검사하고 `dist/`를 GitHub Pages에 자동 배포합니다. 모든 에셋 경로는 `/admerest/` 하위에서도 동작합니다. 이전 Sites 배포는 별도이며 이후 자동 갱신하지 않습니다.

## 실행

`npm run dev` 실행 후 http://127.0.0.1:5173 열기. 정적 파일은 `dist/`에 있으며 빌드 단계 없이 정적 호스팅할 수 있습니다. Three.js, Rapier 및 국가 깃발은 로컬에 포함되어 있습니다.

## 구현

- 한 장 → 도시 → 에베레스트로 이어지는 3단계 스크롤 연출, 실제 ADM 모델과 Imagegen 설산 배경
- 전체 화면 보행: 지면 위 1.7m 눈높이, WASD 이동, 기본 속도 약 2.6배 개선, 마우스 자유 시점
- Q 상승 시 비행 전환, E 하강, Shift 가속, 보행 버튼으로 지면 복귀, Esc 마우스 해제 후 다시 Esc로 종료
- 모바일 왼쪽 아날로그 조이스틱 + 오른쪽 터치 시점, 독립 멀티터치, 상승/하강/가속 버튼
- 도시/에베레스트 산기슭/내 체험 탑 빠른 이동, 이동 속도 조절
- 고도 표시, 대기 원근·하늘·구름·주변 지형을 포함하는 탐색 공간
- 총 수술 케이스가 메인, 진피 길이가 보조인 히어로·합계·전문의 카드·3D 라벨·랭킹
- 수술 건수에 따라 정렬한 랭킹, 국적 필터와 별도 길이 기록
- 전문의별 탑 선택, 카메라 이동, 회전·확대, 자동 회전
- 전문의/내 체험 탑과 랜드마크를 같은 기준선·높이 비율로 나란히 비교, 높이 차이와 비율 실시간 표시
- 탑 화면 안에서 체험 수술 건수 입력·추가·초기화·규격 전환, 아래쪽을 유지하며 위로 자라는 대표 시트
- Sketchfab 공개 모델: 롯데월드타워 555m, 부르즈 칼리파 828m, 상하이타워 632m, 에펠탑 330m. 에베레스트 8,848.86m 비교도 유지
- 제작자 모델의 창문·정상부·철골 보존, 환경 반사, 4개 GLB 합계 약 1.64 MiB. 원본 형상 축소 없이 Draco 압축, 공통 바닥·높이 정규화, 로딩 실패 시 대체 모형
- +10/+100/+500/+1,000, 직접 입력, 초기화, 4×6/5×6/6×8cm 규격 전환
- 사진 기반 ADM 표면과 옆면, 실제 관통 구멍 및 절개 형상
- 사용자 확인 규격 **5×6cm, 두께 3mm**를 적용한 Blender 모델
- 사진에서 추출한 원형 구멍 12개와 절개 83개, 미세한 휘어짐, 섬유 질감의 표면과 절단면
- 정면·사선·뒷면·3mm 옆면 시점, 드래그 회전·확대
- 확대용 81,396개 / 낙하용 12,824개 삼각형 모델, 공유 텍스처와 Draco 압축 GLB
- Rapier 중력·충돌·마찰을 적용한 대표 시트 낙하, 최대 48개 물체로 제한
- 국적 필터, 파란 인증 배지의 hover/focus/tap 설명, 랭킹에서 탑 이동
- WebMCP: 상태 조회, 체험 수량·규격 변경, 전문의 선택, 랜드마크 선택

## 데이터와 표현 범위

전문의 이름, 국적, 인증 상태, 사용 기록은 모두 가상 예시입니다. 실제 회원가입·본인확인·CRM 연결·자격증 심사·기록 저장은 연결하지 않았습니다. 새로고침하면 체험 수량은 초기값으로 돌아옵니다. 체험 조작은 랭킹에 반영되지 않습니다.

보행은 지면 위 1.7m를 유지하며 산의 표면 높이를 따라갑니다. 랜드마크의 단순화한 바닥 영역에는 수평 충돌 제한을 적용합니다. 시야각과 무관하게 WASD는 수평 이동하고 Q/E는 수직 이동합니다. 넓은 공간의 탐색을 위해 이동 속도는 실제 사람의 걸음 속도보다 빠르게 설정했습니다.

PC는 클릭 시 브라우저의 Pointer Lock을 요청하며 마우스 이동만으로 시점을 바꿉니다. 이를 지원하지 않는 내장 브라우저에서는 캔버스에 포커스가 있는 동안 드래그 없이 마우스 이동으로 시점을 바꾸는 대체 동작을 제공합니다. Esc 또는 Tab으로 마우스를 풀고 메뉴를 사용합니다. 창 이탈/숨김, 터치 취소 시 이동을 해제합니다. 모바일은 좌측 아날로그 조이스틱과 우측 터치 시점을 서로 다른 포인터로 관리합니다.

수술 건수와 진피 길이는 `dist/records.js`에 독립적인 필드로 보관합니다. 데모 합계는 가상 전문의 3명의 32,020건 및 2,980m이며 실제 병원 실적이 아닙니다. 랭킹은 수술 건수 기준으로 정렬합니다. 재료 체험만 **1건당 1장이라는 명시된 가정**을 사용하며, 체험 건수 2,000건 = 체험 진피 2,000장 = 120m입니다. 규격을 바꾸면 길이만 바뀌고 수술 건수나 전문의 기록은 바뀌지 않습니다. 실제 CRM을 연결할 때 수술 기록과 규격별 재료 사용 기록을 따로 집계해야 합니다.

길이(m) = 장수 × 선택 규격의 긴 변(cm) ÷ 100. 기본값 2,000장 × 6cm = 120m. 탑은 이 길이를 높이로 표현하며, 옆으로 보이는 폭과 대표 시트 수는 가독성을 위해 확대·축약했습니다. 적층 두께를 길이로 환산하지 않습니다. 에베레스트는 해발고도를 표시하는 개념 지형이며 실제 지형 데이터가 아닙니다.

5×6cm와 3mm는 사용자가 확인한 기준 규격입니다. 4×6cm와 6×8cm는 크기 전환을 위한 예시이며 두께는 3mm로 유지됩니다. 구멍 패턴은 제공된 사진에서 추출했습니다. 사진의 원근·촬영 비율은 확인된 5:6 비율로 보정하며, 뒷면의 표면과 미세한 굽힘은 시각화용 근사입니다. 낙하는 강체 충돌 근사이며 생체 조직의 변형 해석은 아닙니다.

독립 브랜드 `admerest`의 제작자는 `by notoow`로 표기합니다. 회사 로고와 제휴 표기는 제거했습니다. 사용자가 제공한 2D notoow 원본은 웹과 OG 카드에, 3D 원본은 파비콘과 기기 아이콘에 사용합니다. 이 표기는 별도의 권리 귀속 합의를 대신하지 않습니다. 진피 사진은 사용자가 제공한 자료입니다.

## 공유 이미지와 브랜딩

- `dist/assets/brand/og-admerest-notoow-v1.png`: 1200×630 공유 카드. OG 및 X/Twitter 메타데이터는 배포된 절대 HTTPS 주소를 사용하므로 JavaScript 없이도 읽힙니다.
- `dist/assets/brand/notoow-2d.png`, `notoow-3d.png`: 제공한 원본 그대로 보관. 헤더·푸터에는 2D, PNG/ICO 파비콘과 기기 아이콘에는 3D를 사용합니다.
- `design/og-card.html`: OG 카드의 편집 가능한 HTML/CSS 원본. `qa/pages/og-preview.html`로 복사하고 `qa/pages/admerest`를 `dist`에 연결한 로컬 서버에서 1200×630으로 캡처합니다. 글자와 원본 로고를 그대로 합성한 그래픽이며 AI로 로고를 다시 그리지 않습니다.
- `scripts/package-brand-assets.py <3D PNG> <2D PNG>`: 원본 복사, 투명 정사각 여백과 크기별 PNG/ICO 패키징. 원본 내용은 수정하지 않습니다.

## 파일

### 외부 건물 모델

4개 건물은 CC BY 4.0 자산입니다. 사이트 하단 **3D 모델 출처**에 원본 모델, 제작자, 라이선스와 변경 내역을 표시합니다. 원작자의 서비스 보증이나 제휴를 뜻하지 않습니다. 상세 출처와 SHA-256은 [`dist/assets/models/credits.json`](dist/assets/models/credits.json), Blender 재수입 검증은 [`models/landmark-validation.json`](models/landmark-validation.json)에 있습니다.

롯데월드타워는 Sketchfab 공식 GLB 다운로드, 나머지는 원작자 크레딧을 포함하는 [Smart UI 공개 데모](https://www.htmlelements.com/demos/3d-chart/custom-models/index.htm)의 배포본입니다. `scripts/optimize-landmarks.py`는 `qa/<id>-source.glb`를 Blender에서 읽어 변환합니다. 원본은 저장소에 중복 포함하지 않습니다. 에펠탑 모델의 외형은 제작 당시 표현이며, 비교 높이는 [현재 330m](https://www.toureiffel.paris/en/news/history-and-culture/300-330-meters-story-towers-height)로 맞춥니다.

### 구현 파일

- `dist/app.js`: UI, 상태, 계산, 입력 검증, 랭킹, WebMCP
- `dist/records.js`: 독립된 수술 건수·길이 기록, 합계, 수술 건수 랭킹
- `dist/scene.js`: 대체 랜드마크 모형, 조명과 환경 반사
- `dist/landmarks.js`, `dist/landmark-data.js`: 공유 GLB 로딩, 캐시, 재질, 랜드마크 높이
- `dist/explorer.js`: 3D 탐색, 비교 배치, 카메라, 체험 탑 성장
- `dist/flight.js`, `dist/flight-motion.js`: 키보드·터치 자유 이동과 시점 제어
- `dist/journey.js`, `dist/experience.css`: 스크롤 연출과 몰입형 탐색 화면
- `dist/atmosphere.js`: 하늘, 구름, 지면, 주변 지형
- `dist/assets/alpine-panorama.png`: Imagegen 환경 배경 ([프롬프트](models/alpine-art-direction.md))
- `dist/measurements.js`: 장수·길이 환산, 높이 비교, 대표 시트 배치 계산
- `dist/material.js`: 원본 사진 및 ADM 관통 형상
- `dist/physics.js`: 진피 낙하와 상세 보기
- `dist/styles.css`: 반응형 레이아웃
- `models/adm-sheet.blend`: 수정 가능한 Blender 원본과 스튜디오 조명
- `dist/assets/models/adm-sheet.glb`: 브라우저에서 실제로 사용하는 모델
- `scripts/model-adm.py`: 모델 수정 및 GLB 내보내기 재현 스크립트
- `scripts/trace-adm.py`: 원본 사진의 관통 형상 추출
- `scripts/bake-adm-material.py`: Blender 표면 노멀·거칠기 베이크
- `models/model-validation.json`: 원본 및 압축 GLB를 다시 불러와 검사한 결과

Blender 모델 재생성: `npm ci`, `node scripts/export-adm-mesh.mjs`를 실행한 다음 Blender 5.1의 `--background --factory-startup --python scripts/model-adm.py -- <프로젝트 절대 경로>` 옵션으로 실행합니다. 사진 패턴을 다시 추출하려면 먼저 `python scripts/trace-adm.py`를 실행합니다(Pillow, NumPy, OpenCV 필요). 수량·규격 계산은 모델의 두께에 영향을 받지 않습니다.

모델 검사: 두 모델 모두 닫힌 manifold이며 95개 관통부, Euler 특성 −188, 단면 두께 3.00mm를 검사합니다. 압축 GLB를 다시 불러온 후에도 모든 구멍과 단면 두께를 확인합니다. `npm run check`는 이 결과와 GitHub Pages의 상대 경로, 압축 해제 파일, JavaScript 문법, 길이 환산 및 대표 시트 배치 계산을 검사합니다.

검증: 데스크톱과 390×844 모바일 브라우저에서 수량/규격 변경, 잘못된 입력, 국적 필터, 배지 설명, 탑 이동 및 3D 렌더링을 확인했습니다. 데이터는 데모이므로 실제 인증 기능의 검증을 뜻하지 않습니다.

이동 계산 검사는 카메라 방향에 따른 이동, Q/E의 독립 수직 축, 대각선 속도 정규화, 반대 키 상쇄, 지면 및 환경 경계를 포함합니다. 스크롤 배경은 장식용 생성 이미지이며 실제 지형 측량 데이터가 아닙니다. 3D 설산도 해발고도에 맞춘 개념 지형입니다.

랜드마크 참고: [롯데월드타워](https://www.lottecon.co.kr/Medias/tower_intro_stability), [부르즈 칼리파](https://www.burjkhalifa.ae/img/fact-sheet.pdf). 라이브러리 라이선스는 `dist/vendor/`에 포함되어 있습니다.
