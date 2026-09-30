# admerest

ADM 누적 길이를 전문의별 탑과 랜드마크로 둘러보는 반응형 3D 프로토타입.

실행 사이트: https://notoow.github.io/admerest/

## 배포

`main`에 push하면 `.github/workflows/pages.yml`이 JavaScript와 모델 파일을 검사하고 `dist/`를 GitHub Pages에 자동 배포합니다. 모든 에셋 경로는 `/admerest/` 하위에서도 동작합니다. 이전 Sites 배포는 별도이며 이후 자동 갱신하지 않습니다.

## 실행

`npm run dev` 실행 후 http://127.0.0.1:5173 열기. 정적 파일은 `dist/`에 있으며 빌드 단계 없이 정적 호스팅할 수 있습니다. Three.js, Rapier 및 국가 깃발은 로컬에 포함되어 있습니다.

## 구현

- 전문의별 탑 선택, 카메라 이동, 회전·확대, 자동 회전
- 전문의/내 체험 탑과 랜드마크를 같은 기준선·높이 비율로 나란히 비교, 높이 차이와 비율 실시간 표시
- 탑 화면 안에서 장수 입력·추가·초기화·규격 전환, 아래쪽을 유지하며 위로 자라는 대표 시트
- 롯데월드타워 555m, 부르즈 칼리파 828m, 에베레스트 8,848.86m 비교
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

길이(m) = 장수 × 선택 규격의 긴 변(cm) ÷ 100. 기본값 2,000장 × 6cm = 120m. 탑은 이 길이를 높이로 표현하며, 옆으로 보이는 폭과 대표 시트 수는 가독성을 위해 확대·축약했습니다. 적층 두께를 길이로 환산하지 않습니다. 에베레스트는 해발고도를 표시하는 개념 지형이며 실제 지형 데이터가 아닙니다.

5×6cm와 3mm는 사용자가 확인한 기준 규격입니다. 4×6cm와 6×8cm는 크기 전환을 위한 예시이며 두께는 3mm로 유지됩니다. 구멍 패턴은 제공된 사진에서 추출했습니다. 사진의 원근·촬영 비율은 확인된 5:6 비율로 보정하며, 뒷면의 표면과 미세한 굽힘은 시각화용 근사입니다. 낙하는 강체 충돌 근사이며 생체 조직의 변형 해석은 아닙니다.

독립 브랜드 `admerest`에 `with HIGHST`를 보조 표기했습니다. 이 표기가 권리 귀속을 확정하지는 않습니다. 사진과 병원 로고는 사용자가 제공한 자료입니다.

## 파일

- `dist/app.js`: UI, 상태, 계산, 입력 검증, 랭킹, WebMCP
- `dist/scene.js`: 전문의 데이터, 랜드마크 모형, 조명
- `dist/explorer.js`: 3D 탐색, 비교 배치, 카메라, 체험 탑 성장
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

랜드마크 참고: [롯데월드타워](https://www.lottecon.co.kr/Medias/tower_intro_stability), [부르즈 칼리파](https://www.burjkhalifa.ae/img/fact-sheet.pdf). 라이브러리 라이선스는 `dist/vendor/`에 포함되어 있습니다.
