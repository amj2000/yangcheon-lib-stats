# [TRD] 양천구립도서관 프로그램 실시간 통계 관리 시스템

**기술 요구사항·설계 문서 (Technical Requirements Document)**  
완성 버전 기준

---

## 1. 시스템 구성 개요

| 구분 | 기술 | 비고 |
|------|------|------|
| **프론트엔드** | HTML5, CSS3, JavaScript(ES5 호환) | 로그인·대시보드·통계 입력 페이지 |
| **백엔드 API** | Google Apps Script (GAS) Web App | doGet / doPost, JSON 요청·응답 |
| **데이터 저장소** | Google Spreadsheet | 사용자관리, 프로그램목록, 입력기록 시트 |
| **호스팅** | 정적 호스팅 (Vercel/Netlify 등) | 파일명·경로 소문자 권장 |

---

## 2. 파일 구조

```
프로그램 통계 실시간 관리/
├── login.html          # 로그인·회원가입 페이지
├── login.css
├── login_script.js     # 로그인/회원가입 API 호출, GAS URL
├── index.html          # 대시보드 페이지
├── style.css
├── script.js           # getDashboardData 호출, Chart.js, 카드 렌더링
├── input.html          # 통계 입력 페이지 (로그인 필수)
├── input_style.css
├── input_script.js     # getPrograms/getHistory, 제출/updateHistory, 캐시·정규화
├── gas_backend_update.js  # GAS 배포용 스크립트 (doGet/doPost 핸들러)
├── PRD.md
├── TRD.md
└── plan.md
```

---

## 3. Google Apps Script (GAS) Web App

### 3.1 배포 URL

- **형식:** `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`
- **설정:** Web App으로 배포, 실행 사용자: 나, 액세스: 모든 사용자(또는 도메인 정책에 맞게)
- **프론트엔드 연동:** `login_script.js`, `script.js`, `input_script.js` 내 `WEB_APP_URL` 변수에 동일 URL 사용

### 3.2 doGet(e) — GET 요청

| action (parameter) | 설명 | 응답 |
|--------------------|------|------|
| `getDashboardData` | 입력기록 시트 전체에서 도서관별 집계용 행 목록 조회 | `[{ libraryName, programName, recruitmentCount, participationCount, noShowCount }, ...]` |
| `getPrograms` | 프로그램목록(또는 프로그램) 시트에서 도서관·프로그램 목록 조회 | `[{ libraryName, programName, library, program }, ...]` |
| `getHistory` | 입력기록 시트에서 특정 도서관·프로그램의 회차별 기록 조회 | `[{ session, date, recruit, attend, noshow, reason }, ...]` (session 오름차순) |

**getHistory 파라미터**

- `libraryName` (필수)
- `programName` (선택, 비면 해당 도서관 전체)

**입력기록 시트 읽기 규칙**

- 1행이 헤더(두 번째 컬럼이 '도서관명')면 `startRow = 1`, 아니면 `startRow = 0`
- 열 인덱스(0-based): B=1 도서관명, C=2 프로그램명, D=총운영회수, E=현재회차, F=운영일자, G=모집, H=참여, I=노쇼, J=참여율, K=변경사유

### 3.3 doPost(e) — POST 요청

Body: `Content-Type: application/json`, JSON 객체.  
URL parameter로 `action`을 넘길 수도 있음.

| action | 설명 | Body 필드 (요약) | 응답 |
|--------|------|------------------|------|
| `register` | 회원가입 | library(소속도서관), name(이름), password(비밀번호) | `{ result: 'success'|'error', message }` |
| `login` | 로그인 | library, name, password | 성공 시 `{ result: 'success', success: true, user: { library, name, role } }` |
| `submit_data` | 회차별 입력 저장(append) | libraryName, programName, totalSessions, currentSession, sessionDate, recruitmentCount, participationCount, noShowCount, participationRate, reason(선택), **submittedBy** | `{ result: 'success' }` 또는 error |
| `updateHistory` | 과거 회차 수정 | libraryName, programName, currentSession, sessionDate, recruitmentCount, participationCount, noShowCount, **changeReason**(필수), 수정자 정보는 changeReason 문자열 내 포함 | `{ result: 'success' }` 또는 error |

- **updateHistory:** 해당 행의 F~J(운영일자, 모집, 참여, 노쇼, 참여율) 갱신, K열(변경사유)에 클라이언트에서 만든 `changeReason` 문자열을 기존 값 뒤에 `\n`으로 이어 붙여 누적 저장.

---

## 4. 시트·열 매핑

### 4.1 사용자관리

| 열(예시) | 필드명 | 설명 |
|----------|--------|------|
| A | 소속도서관 | 도서관명 |
| B | 이름 | 사용자 이름 |
| C | 비밀번호 | 평문 저장 (운영 환경에서는 암호화 검토) |
| D | 승인상태 | '대기' | '승인' |
| E | 역할 | '일반' | '관리자' |

- 회원가입 시: `appendRow([소속도서관, 이름, 비밀번호, '대기', '일반'])`
- 로그인: 헤더에서 '소속도서관','이름','비밀번호','승인상태','역할' 컬럼 인덱스 찾아 매칭. 승인상태가 '승인'인 경우만 성공.

### 4.2 프로그램목록 (또는 프로그램)

| 열 | 용도 | 비고 |
|----|------|------|
| A | 도서관명 | |
| B | 프로그램명 | |
| C | 시작일 | 날짜 형식(YYYY-MM-DD 등)이면 A·B만 사용; 그렇지 않으면 B=도서관, C=프로그램으로 읽는 폴백 |
| D~ | 종료일, 운영요일, 운영시간, 총운영회수 등 | GAS는 A,B(및 필요 시 C) 위주로 사용, 나머지는 프론트/시트 관리용 |

- **readProgramsFromSheet:** C열이 날짜 패턴(`/^\d{4}[-.]\d{1,2}[-.]\d{1,2}/`)이면 A=도서관명, B=프로그램명; 그 외에는 B=도서관, C=프로그램으로 해석.
- 프로그램 목록은 **프로그램목록(또는 프로그램) 시트만** 사용. 입력기록 시트에서는 조회하지 않음.

### 4.3 입력기록 (또는 통계)

| 열 인덱스(1-based) | 필드 | 설명 |
|--------------------|------|------|
| A (1) | 타임스탬프 | 제출 시각 |
| B (2) | 도서관명 | |
| C (3) | 프로그램명 | |
| D (4) | 총운영회수 | |
| E (5) | 현재회차 | |
| F (6) | 운영일자 | |
| G (7) | 모집인원 | |
| H (8) | 참여인원 | |
| I (9) | 노쇼 | |
| J (10) | 참여율 | (숫자, %) |
| K (11) | 변경사유 | 과거 회차 수정 시 누적. 형식: `[항목] 사유(수정자), YYYYMMDD HH:mm:ss` |
| L (12) | 입력자 | 제출 시 로그인 사용자 이름(submittedBy) |

- **handleGetDashboardData:** B, C, G, H, I만 사용해 행 배열로 반환.
- **handleGetHistory:** B, C, E, F, G, H, I, K 사용.
- **handleSubmitData:** appendRow로 위 12열 순서로 한 행 추가.
- **handleUpdateHistory:** 도서관명+프로그램명+현재회차로 행 찾아 F, G, H, I, J 갱신, K에 changeReason 누적.

---

## 5. 프론트엔드 기술 사양

### 5.1 접근 제어

- **input.html:** `localStorage.currentUser` 없으면 `login.html`로 리다이렉트. 로그인 성공 시 `currentUser`에 `{ library, name, role }` 저장.

### 5.2 통계 입력 페이지 (input_script.js)

- **WEB_APP_URL:** GAS Web App 배포 URL (동일 URL 일원화)
- **캐시**
  - `cachedPrograms`: 프로그램 목록 로컬 캐시 키
  - `historyCache_{도서관명}_{프로그램명}`: 히스토리 캐시 키
  - 로딩 시 캐시 우선 표시 후 백그라운드에서 API로 갱신·캐시 덮어쓰기
- **도서관명 정규화:** `normalizeLibraryName` 등으로 공백·제로너비 문자 정리 후 매칭
- **자동 선택:** 로그인 사용자 `library`와 일치하는 도서관을 도서관 셀렉트에 자동 선택
- **제출 페이로드:** `libraryName, programName, totalSessions, currentSession, sessionDate, recruitmentCount, participationCount, noShowCount, participationRate, reason(증액 시), submittedBy(로그인 사용자 이름)`
- **과거 회차 수정**
  - 모달에서 변경사유 필수 입력
  - 변경사유 문자열 형식: `[변경한 항목] 변경사유(수정자이름), YYYYMMDD HH:mm:ss` (클라이언트에서 생성)
  - `updateHistory` 호출 실패 시 클라이언트 상태 롤백

### 5.3 대시보드 (script.js)

- **getDashboardData:** GET `?action=getDashboardData` → 반환 배열을 집계해 총 프로그램 수, 전체 누적 모집/참여/노쇼 계산
- **Chart.js:** 도서관별 막대 차트, 탭별 지표(프로그램 수, 모집, 참여, 노쇼) 전환
- **로딩 UI:** 점 3개 튀는 스피너, 사용자 안내 문구는 「오류」「에러」 없이 안내만 표시

### 5.4 로그인 페이지 (login_script.js)

- **getPrograms:** 로그인/회원가입 화면의 도서관 드롭다운 옵션 생성용(필요 시)
- **register:** POST body `{ library, name, password }`
- **login:** POST body `{ library, name, password }` → 성공 시 `localStorage.currentUser` 저장 후 `input.html`로 이동
- 사용자 대상 메시지에서 「오류」「에러」 제거, 네트워크/파싱 실패 시에도 안내 문구만 표시

### 5.5 UI/UX 규칙

- **로딩 표시:** 빨간 원 대신 점 3개가 순서대로 튀는 애니메이션 사용 (오류와 혼동 방지)
- **에러/안내 문구:** 사용자 노출 문구에서 「오류」「에러」 단어 제거, 「연결할 수 없습니다. 다시 시도해 주세요.» 등으로 통일

---

## 6. 변경사유 형식 및 누적 규칙

- **형식:** `[변경한 항목] 변경사유(수정자이름), YYYYMMDD HH:mm:ss`
- **예:** `[참석자수] 입력오류(안미정), 20260101 10:10:00`
- **저장:** 입력기록 시트 K열. 기존 값이 있으면 그 뒤에 줄바꿈(`\n`) 후 새 문자열 추가 (GAS `handleUpdateHistory`에서 처리).

---

## 7. 검증 규칙 (클라이언트·서버)

- **모집 인원:** 1회차 필수; 2회차 이후는 이전 회차 모집 이상만 허용 (감소 불가). 증액 시 사유 필수.
- **참여·노쇼:** 참여 ≤ 모집, 노쇼 ≤ (모집 − 참여).
- **과거 회차 수정:** changeReason 필수; 미입력 시 GAS가 `{ result: 'error', message: '변경사유를 입력해 주세요.' }` 반환.

---

## 8. 환경·배포

- **GAS:** 스크립트 편집기에서 `gas_backend_update.js` 내용을 프로젝트에 반영 후 Web App으로 배포. 배포 URL을 프론트엔드 세 파일의 `WEB_APP_URL`에 동일하게 설정.
- **프론트:** 정적 파일만 배포. CORS는 GAS Web App이 응답하는 쪽에서 처리(필요 시).
- **시트:** 동일 스프레드시트 내에 사용자관리, 프로그램목록(또는 프로그램), 입력기록(또는 통계) 시트 존재해야 함.

---

## 9. 참고 — 기존 plan.md

- 상위 요구·배경은 `plan.md` 참고.
- 본 TRD는 **현재 구현된 동작과 시트·API 스펙**을 기준으로 작성되었으며, 알림톡 발송·URL 토큰 자동 채움 등 미구현 항목은 PRD와 동일하게 별도 검토 대상이다.
