/**
 * 현장 담당자용 모바일 입력 페이지
 * 마스터 데이터·회차 자동 감지·이전 회차 기록·모집 인원 특수 로직
 */

(function () {
  'use strict';

  var TYPE_PUBLIC = 'public';
  var TYPE_SMALL = 'small';

  // ——— 11개 도서관별 연간 프로그램 마스터 (단일 원천)
  var programMasterData = [
    { library: '양천중앙도서관', type: TYPE_PUBLIC, programs: [
      { id: 'yc01', name: '겨울방학 코딩 교실', period: { start: '2026-01-06', end: '2026-02-28' }, days: '월, 수', time: '14:00~16:00' },
      { id: 'yc02', name: '그림책 놀이터', period: { start: '2026-02-01', end: '2026-06-30' }, days: '화, 목', time: '10:00~11:00' },
      { id: 'yc03', name: '성인 독서회', period: { start: '2026-01-01', end: '2026-12-31' }, days: '금', time: '19:00~21:00' },
      { id: 'yc04', name: '영어 그림책 스토리텔링', period: { start: '2026-02-10', end: '2026-05-31' }, days: '토', time: '11:00~12:00' }
    ]},
    { library: '갈산도서관', type: TYPE_PUBLIC, programs: [
      { id: 'gs01', name: '키즈 북아트', period: { start: '2026-02-01', end: '2026-04-30' }, days: '월', time: '15:00~16:00' },
      { id: 'gs02', name: '창의 수학 놀이', period: { start: '2026-01-15', end: '2026-06-15' }, days: '수, 금', time: '14:00~15:00' },
      { id: 'gs03', name: '다문화 동화 구연', period: { start: '2026-02-01', end: '2026-12-31' }, days: '토', time: '10:00~11:00' }
    ]},
    { library: '개울건강도서관', type: TYPE_PUBLIC, programs: [
      { id: 'gh01', name: '건강 독서 클럽', period: { start: '2026-01-01', end: '2026-12-31' }, days: '화', time: '14:00~15:30' },
      { id: 'gh02', name: '어린이 인문학', period: { start: '2026-02-15', end: '2026-05-31' }, days: '목', time: '16:00~17:00' },
      { id: 'gh03', name: '시니어 낭독회', period: { start: '2026-02-01', end: '2026-06-30' }, days: '수', time: '10:00~11:30' }
    ]},
    { library: '목마교육도서관', type: TYPE_PUBLIC, programs: [
      { id: 'mm01', name: '독서 논술 교실', period: { start: '2026-02-01', end: '2026-07-31' }, days: '월, 수', time: '15:00~16:30' },
      { id: 'mm02', name: '과학 그림책 실험', period: { start: '2026-01-10', end: '2026-04-30' }, days: '금', time: '14:00~15:00' },
      { id: 'mm03', name: '부모와 함께하는 동화여행', period: { start: '2026-02-01', end: '2026-12-31' }, days: '토', time: '11:00~12:00' }
    ]},
    { library: '미감도서관', type: TYPE_PUBLIC, programs: [
      { id: 'mg01', name: '미감 북스타트', period: { start: '2026-02-01', end: '2026-05-31' }, days: '화, 목', time: '10:30~11:30' },
      { id: 'mg02', name: '역사 인물 읽기', period: { start: '2026-01-01', end: '2026-12-31' }, days: '수', time: '16:00~17:00' },
      { id: 'mg03', name: '청소년 글쓰기 워크숍', period: { start: '2026-02-10', end: '2026-04-30' }, days: '토', time: '14:00~16:00' }
    ]},
    { library: '방아다리문학도서관', type: TYPE_PUBLIC, programs: [
      { id: 'bd01', name: '문학 감상 모임', period: { start: '2026-01-01', end: '2026-12-31' }, days: '목', time: '19:00~21:00' },
      { id: 'bd02', name: '시 쓰기 교실', period: { start: '2026-02-01', end: '2026-05-31' }, days: '월', time: '14:00~16:00' },
      { id: 'bd03', name: '동시 낭송회', period: { start: '2026-02-15', end: '2026-06-15' }, days: '토', time: '10:00~11:00' }
    ]},
    { library: '신월음악도서관', type: TYPE_PUBLIC, programs: [
      { id: 'sw01', name: '음악과 함께하는 동화', period: { start: '2026-02-01', end: '2026-06-30' }, days: '화', time: '15:00~16:00' },
      { id: 'sw02', name: '악기 체험 교실', period: { start: '2026-01-15', end: '2026-04-30' }, days: '수, 금', time: '14:00~15:00' },
      { id: 'sw03', name: '클래식 감상 독서회', period: { start: '2026-01-01', end: '2026-12-31' }, days: '일', time: '15:00~16:30' }
    ]},
    { library: '영어특성화도서관', type: TYPE_PUBLIC, programs: [
      { id: 'en01', name: 'English Story Time', period: { start: '2026-02-01', end: '2026-12-31' }, days: '화, 목', time: '11:00~12:00' },
      { id: 'en02', name: '영어 그림책 읽기', period: { start: '2026-01-10', end: '2026-05-31' }, days: '토', time: '10:00~11:00' },
      { id: 'en03', name: '원서 읽기 클럽', period: { start: '2026-02-15', end: '2026-06-30' }, days: '수', time: '16:00~17:30' }
    ]},
    { library: '해맞이역사도서관', type: TYPE_PUBLIC, programs: [
      { id: 'hm01', name: '역사 토론 모임', period: { start: '2026-01-01', end: '2026-12-31' }, days: '금', time: '19:00~20:30' },
      { id: 'hm02', name: '어린이 역사 탐험', period: { start: '2026-02-01', end: '2026-05-31' }, days: '토', time: '14:00~15:00' },
      { id: 'hm03', name: '지역사 자료 읽기', period: { start: '2026-02-10', end: '2026-06-30' }, days: '월', time: '14:00~15:30' }
    ]},
    { library: '새아름작은도서관', type: TYPE_SMALL, programs: [
      { id: 'sa01', name: '동화 구연 교실', period: { start: '2026-02-01', end: '2026-04-30' }, days: '화, 목', time: '15:00~16:00' },
      { id: 'sa02', name: '작은도서관 독서회', period: { start: '2026-01-01', end: '2026-12-31' }, days: '수', time: '10:00~11:00' }
    ]},
    { library: '모새미작은도서관', type: TYPE_SMALL, programs: [
      { id: 'ms01', name: '그림책 놀이', period: { start: '2026-02-15', end: '2026-05-31' }, days: '월, 수', time: '10:30~11:30' },
      { id: 'ms02', name: '가족 독서 캠프', period: { start: '2026-02-01', end: '2026-12-31' }, days: '토', time: '14:00~15:30' }
    ]}
  ];

  // ——— 누적 기록: 키 = "도서관명|programId", 값 = [{ session, recruit, attend, noshow, reason? }, ...]
  var historyLog = {};
  /** 1회차 제출 시 확정된 '총 운영 회수' (키 = logKey, 값 = 숫자). 이후 회차에서 수정 불가 */
  var totalSessionsByProgram = {};
  function logKey(library, programId) { return library + '|' + programId; }
  function getHistory(library, programId) {
    var key = logKey(library, programId);
    if (!historyLog[key]) historyLog[key] = [];
    return historyLog[key];
  }
  function getLastRecord(library, programId) {
    var h = getHistory(library, programId);
    return h.length ? h[h.length - 1] : null;
  }

  /** 프로그램 선택 시 모집 인원 기본값: historyLog 마지막 회차(n-1)의 모집 인원. 없으면 표시용 히스토리 마지막 값 사용 */
  function getDefaultRecruit(libraryName, programId) {
    var last = getLastRecord(libraryName, programId);
    if (last != null) return last.recruit;
    var session = getCurrentSession(libraryName, programId);
    if (session <= 1) return '';
    var list = getDisplayHistory(libraryName, programId);
    return list.length ? list[list.length - 1].recruit : '';
  }

  /** 1 ~ (표시회차-1) 전체 표시용. 없으면 샘플 데이터로 채움 (테스트/화면 확인용) */
  function getDisplayHistory(libraryName, programId) {
    var nextSession = getDisplaySessionNumber(libraryName, programId);
    if (nextSession <= 1) return [];
    var saved = getHistory(libraryName, programId);
    var bySession = {};
    saved.forEach(function (rec) { bySession[rec.session] = rec; });
    var list = [];
    for (var s = 1; s < nextSession; s++) {
      if (bySession[s]) {
        list.push(bySession[s]);
      } else {
        var base = 18 + (s % 5);
        var attend = Math.max(0, base - (s % 3));
        var noshow = Math.max(0, base - attend);
        list.push({ session: s, recruit: base, attend: attend, noshow: noshow });
      }
    }
    list.sort(function (a, b) { return a.session - b.session; });
    return list;
  }

  function participationRate(recruit, attend) {
    if (!recruit || recruit <= 0) return 0;
    return Math.round((attend / recruit) * 100);
  }

  function updateCumulativeDisplay(libraryName, programId, attendValue, noshowValue) {
    var attendEl = document.getElementById('cumulativeAttend');
    var noshowEl = document.getElementById('cumulativeNoshow');
    if (!attendEl || !noshowEl) return;
    var prevAttend = 0;
    var prevNoshow = 0;
    if (libraryName && programId) {
      var list = getDisplayHistory(libraryName, programId);
      list.forEach(function (rec) {
        prevAttend += rec.attend;
        prevNoshow += rec.noshow;
      });
    }
    var currentAttend = parseInt(attendValue, 10);
    var currentNoshow = parseInt(noshowValue, 10);
    if (isNaN(currentAttend)) currentAttend = 0;
    if (isNaN(currentNoshow)) currentNoshow = 0;
    attendEl.textContent = '누적 참여: ' + (prevAttend + currentAttend) + '명';
    noshowEl.textContent = '누적 노쇼: ' + (prevNoshow + currentNoshow) + '명';
  }

  // 테스트용: 시드 데이터 비움 → 모든 프로그램이 1회차부터 입력 가능
  // (필요 시 아래처럼 채워서 2회차·3회차부터 테스트 가능)
  // (function seedHistory() {
  //   var key1 = logKey('양천중앙도서관', 'yc01');
  //   historyLog[key1] = [ { session: 1, recruit: 20, attend: 18, noshow: 2 } ];
  // })();

  function getTodayStr() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function parseDate(str) {
    var parts = str.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function dateToStr(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function daysBetween(startStr, endStr) {
    var start = parseDate(startStr);
    var end = parseDate(endStr);
    return Math.floor((end - start) / (24 * 60 * 60 * 1000));
  }

  var DAY_NAMES_KR = ['일', '월', '화', '수', '목', '금', '토'];

  /** program.days(예: "화, 목") → 해당 요일의 getDay() 배열 [2, 4] */
  function parseDaysToWeekdays(daysStr) {
    if (!daysStr || !daysStr.trim()) return [0, 1, 2, 3, 4, 5, 6];
    var tokens = daysStr.split(/[,，\s]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    var out = [];
    for (var i = 0; i < tokens.length; i++) {
      var idx = DAY_NAMES_KR.indexOf(tokens[i]);
      if (idx !== -1) out.push(idx);
    }
    return out.length ? out : [1, 2, 3, 4, 5, 6];
  }

  /** 운영 기간 내 요일(days)에 해당하는 이론적 전체 운영 일수 */
  function countSessionDaysInPeriod(program) {
    if (!program || !program.period) return 0;
    var weekdays = parseDaysToWeekdays(program.days);
    var start = parseDate(program.period.start);
    var end = program.period.end ? parseDate(program.period.end) : start;
    var d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    var count = 0;
    var maxDays = 366 * 2;
    var safety = 0;
    while (d <= end && safety < maxDays) {
      safety++;
      if (weekdays.indexOf(d.getDay()) !== -1) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  }

  function getTotalSessions(libraryName, programId) {
    var key = logKey(libraryName, programId);
    var n = totalSessionsByProgram[key];
    return n != null && n >= 1 ? n : null;
  }

  /** 시작일부터 요일(days)만 카운트한 N회차의 정확한 운영 날짜 (YYYY-MM-DD) */
  function getSessionDateBySchedule(program, sessionNum) {
    if (!program || sessionNum < 1) return getTodayStr();
    var weekdays = parseDaysToWeekdays(program.days);
    var start = parseDate(program.period.start);
    var end = program.period.end ? parseDate(program.period.end) : null;
    var d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    var count = 0;
    var maxDays = 366 * 2;
    var safety = 0;
    while (count < sessionNum && safety < maxDays) {
      safety++;
      if (weekdays.indexOf(d.getDay()) !== -1) {
        count++;
        if (count === sessionNum) return dateToStr(d);
      }
      d.setDate(d.getDate() + 1);
      if (end && d > end) break;
    }
    return dateToStr(start);
  }

  /** 화면에 표시할 회차 = 다음에 입력할 회차 (히스토리 마지막+1, 없으면 1회차) */
  function getDisplaySessionNumber(libraryName, programId) {
    var h = getHistory(libraryName, programId);
    if (h.length === 0) return 1;
    var maxSession = 0;
    h.forEach(function (rec) { if (rec.session > maxSession) maxSession = rec.session; });
    return maxSession + 1;
  }

  /** 오늘 기준 현재 회차 (1회차 = 첫 주, 주 단위) */
  function getCurrentSession(libraryName, programId) {
    var row = programMasterData.find(function (r) { return r.library === libraryName; });
    if (!row) return 1;
    var program = row.programs.find(function (p) { return p.id === programId; });
    if (!program) return 1;
    var today = getTodayStr();
    if (today < program.period.start) return 0;
    var days = daysBetween(program.period.start, today);
    return Math.floor(days / 7) + 1;
  }

  function isDateInRange(dateStr, start, end) {
    return dateStr >= start && dateStr <= end;
  }

  function getProgramsForLibrary(libraryName) {
    var row = programMasterData.find(function (r) { return r.library === libraryName; });
    return row ? row.programs : [];
  }

  function getProgramsRunningToday(libraryName) {
    var programs = getProgramsForLibrary(libraryName);
    var today = getTodayStr();
    return programs.filter(function (p) {
      return isDateInRange(today, p.period.start, p.period.end);
    });
  }

  function getProgramById(libraryName, programId) {
    var programs = getProgramsForLibrary(libraryName);
    for (var i = 0; i < programs.length; i++) {
      if (programs[i].id === programId) return programs[i];
    }
    return null;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function escapeAttr(text) {
    return String(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function buildLibraryOptions() {
    var publicLibs = programMasterData.filter(function (r) { return r.type === TYPE_PUBLIC; });
    var smallLibs = programMasterData.filter(function (r) { return r.type === TYPE_SMALL; });
    var html = '<option value="">도서관을 선택하세요</option>';
    html += '<optgroup label="공공도서관">';
    publicLibs.forEach(function (r) {
      html += '<option value="' + escapeAttr(r.library) + '">' + escapeHtml(r.library) + '</option>';
    });
    html += '</optgroup><optgroup label="작은도서관">';
    smallLibs.forEach(function (r) {
      html += '<option value="' + escapeAttr(r.library) + '">' + escapeHtml(r.library) + '</option>';
    });
    html += '</optgroup>';
    return html;
  }

  function buildProgramOptions(programs) {
    var opts = '<option value="">프로그램을 선택하세요</option>';
    programs.forEach(function (p) {
      opts += '<option value="' + escapeAttr(p.id) + '">' + escapeHtml(p.name) + '</option>';
    });
    return opts;
  }

  function formatPeriodDate(str) {
    return str ? str.replace(/-/g, '.') : '';
  }

  function getTodayDisplay() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '.' + m + '.' + day;
  }

  var sessionDateOverride = {};
  function getSessionDate(libraryName, programId) {
    var key = logKey(libraryName, programId);
    if (sessionDateOverride[key]) return sessionDateOverride[key];
    var program = getProgramById(libraryName, programId);
    var sessionNum = getDisplaySessionNumber(libraryName, programId);
    return program ? getSessionDateBySchedule(program, sessionNum) : getTodayStr();
  }
  function setSessionDateOverride(libraryName, programId, dateStr) {
    var key = logKey(libraryName, programId);
    if (dateStr) sessionDateOverride[key] = dateStr;
    else delete sessionDateOverride[key];
  }
  function clearSessionDateOverride(libraryName, programId) {
    setSessionDateOverride(libraryName, programId, null);
  }
  function getDayOfWeekKr(dateStr) {
    if (!dateStr) return '';
    var parts = dateStr.split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    var dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    return dayNames[d.getDay()];
  }
  function getSessionDateDisplay(libraryName, programId) {
    var dateStr = getSessionDate(libraryName, programId);
    var display = dateStr ? formatPeriodDate(dateStr) : getTodayDisplay();
    var 요일 = getDayOfWeekKr(dateStr || getTodayStr());
    return display + (요일 ? ' (' + 요일 + ')' : '');
  }

  var currentProgramInfo = { library: '', programId: '', program: null };

  function showProgramDetail(libraryName, programId, program) {
    var el = document.getElementById('programDetail');
    if (!el) return;
    var sessionEl = document.getElementById('currentSession');
    if (!sessionEl) return;
    currentProgramInfo.library = libraryName || '';
    currentProgramInfo.programId = programId || '';
    currentProgramInfo.program = program || null;
    if (!program || !libraryName || !programId) {
      el.textContent = '';
      el.classList.remove('visible');
      sessionEl.textContent = '';
      return;
    }
    var startStr = formatPeriodDate(program.period.start);
    var endStr = formatPeriodDate(program.period.end);
    el.innerHTML =
      '<div class="program-detail-row">' +
      '<span class="program-detail-text">운영 기간: ' + startStr + ' ~ ' + endStr + ' | ' +
      escapeHtml(program.days) + ' | ' + escapeHtml(program.time) + '</span>' +
      '</div>';
    el.classList.add('visible');
    updateSessionDateRow(libraryName, programId);
    updateTotalSessionsBlock(libraryName, programId);
  }

  function updateSessionDateRow(libraryName, programId) {
    var sessionEl = document.getElementById('currentSession');
    if (!sessionEl) return;
    var session = getDisplaySessionNumber(libraryName, programId);
    var dateDisplay = getSessionDateDisplay(libraryName, programId);
    sessionEl.innerHTML =
      '<div class="current-session-row">' +
      '<span class="current-session-text">현재 ' + session + '회차 | ' + dateDisplay + '</span>' +
      '<button type="button" class="btn-session-date-edit" id="sessionDateEditBtn">수정</button>' +
      '</div>';
    bindSessionDateEdit(libraryName, programId);
  }

  /** 총 운영회수 블록: 1회차일 때만 입력 필드 표시, 이후 회차는 문구만 표시(고정) */
  function updateTotalSessionsBlock(libraryName, programId) {
    var block = document.getElementById('totalSessionsBlock');
    var summaryEl = document.getElementById('totalSessionsSummary');
    var inputWrap = document.getElementById('totalSessionsInputWrap');
    var totalInput = document.getElementById('totalSessionsInput');
    var finalNotice = document.getElementById('finalSessionNotice');
    var completionPanel = document.getElementById('completionPanel');
    if (!block || !summaryEl) return;

    if (!libraryName || !programId) {
      block.style.display = 'none';
      if (inputWrap) inputWrap.style.display = 'none';
      if (finalNotice) finalNotice.style.display = 'none';
      if (completionPanel) completionPanel.style.display = 'none';
      return;
    }

    var program = getProgramById(libraryName, programId);
    var displaySession = getDisplaySessionNumber(libraryName, programId);
    var total = getTotalSessions(libraryName, programId);
    var theoreticalMax = program ? countSessionDaysInPeriod(program) : 0;
    if (displaySession > 1 && total == null) {
      block.style.display = 'none';
      if (finalNotice) finalNotice.style.display = 'none';
      return;
    }
    block.style.display = 'block';

    if (displaySession === 1 && total == null) {
      if (inputWrap) inputWrap.style.display = 'block';
      if (totalInput) {
        if (totalInput.value.trim() === '') totalInput.value = '';
        totalInput.removeAttribute('readonly');
      }
      var typed = totalInput && totalInput.value.trim() !== '' ? parseInt(totalInput.value.trim(), 10) : NaN;
      if (!isNaN(typed) && typed >= 1) {
        var rest1 = theoreticalMax - typed;
        if (rest1 < 0) rest1 = 0;
        summaryEl.textContent = '총 운영회수: ' + typed + '회 (기간 중 ' + rest1 + '회 쉼)';
      } else {
        summaryEl.textContent = '총 운영 회수를 아래에 입력하세요. (기간 중 이론적 운영일: ' + theoreticalMax + '일)';
      }
    } else {
      if (inputWrap) inputWrap.style.display = 'none';
      var userTotal = total;
      if (userTotal != null && userTotal >= 1) {
        var rest = theoreticalMax - userTotal;
        if (rest < 0) rest = 0;
        summaryEl.textContent = '총 운영회수: ' + userTotal + '회 (기간 중 ' + rest + '회 쉼)';
      } else {
        summaryEl.textContent = '총 운영 회수를 입력하세요.';
      }
    }

    if (finalNotice) {
      var effectiveTotal = total != null ? total : (displaySession === 1 && totalInput && totalInput.value.trim() !== '' ? parseInt(totalInput.value.trim(), 10) : null);
      if (effectiveTotal != null && displaySession === effectiveTotal) {
        finalNotice.style.display = 'block';
      } else {
        finalNotice.style.display = 'none';
      }
    }
    if (completionPanel) completionPanel.style.display = 'none';
  }

  function bindSessionDateEdit(libraryName, programId) {
    var btn = document.getElementById('sessionDateEditBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var currentDate = getSessionDate(libraryName, programId);
      var sessionEl = document.getElementById('currentSession');
      if (!sessionEl) return;
      sessionEl.innerHTML =
        '<div class="current-session-edit">' +
        '<input type="date" id="sessionDateInput" class="input-schedule" value="' + escapeAttr(currentDate) + '" aria-label="해당 회차 날짜">' +
        '<button type="button" class="btn-schedule-apply" id="sessionDateApplyBtn">적용</button>' +
        '</div>';
      var dateInput = document.getElementById('sessionDateInput');
      var applyBtn = document.getElementById('sessionDateApplyBtn');
      if (dateInput) dateInput.focus();
      if (applyBtn) {
        applyBtn.addEventListener('click', function () {
          var newDate = dateInput ? dateInput.value.trim() : currentDate;
          if (newDate) {
            setSessionDateOverride(libraryName, programId, newDate);
          }
          updateSessionDateRow(libraryName, programId);
        });
      }
    });
  }

  function applyRecruitmentUI(isFirstSession, lastRecruit, recruitInput, wrapEl, reasonBlock, reasonInput) {
    if (!recruitInput || !wrapEl) return;
    var readonly = !isFirstSession;
    wrapEl.classList.toggle('recruit-readonly', readonly);
    recruitInput.readOnly = readonly;
    recruitInput.value = lastRecruit !== undefined && lastRecruit !== null ? String(lastRecruit) : '';
    var editBtn = document.getElementById('recruitEditBtn');
    if (editBtn) {
      editBtn.style.display = readonly ? 'inline-flex' : 'none';
    }
    if (reasonBlock) {
      reasonBlock.classList.remove('visible');
      reasonBlock.querySelector('input').value = '';
    }
  }

  function renderHistoryList(libraryName, programId, highlightNew) {
    var container = document.getElementById('historyList');
    if (!container) return;
    if (!libraryName || !programId) {
      container.innerHTML = '<li class="history-empty">도서관과 프로그램을 선택하면 이전 회차 기록이 표시됩니다.</li>';
      return;
    }
    var list = getDisplayHistory(libraryName, programId);
    if (!list.length) {
      container.innerHTML = '<li class="history-empty">이전 회차 기록이 없습니다.</li>';
      return;
    }
    var html = '';
    list.forEach(function (rec, index) {
      var rate = participationRate(rec.recruit, rec.attend);
      var increaseIcon = rec.reason ? '<span class="history-increase-icon" aria-label="인원 증액">↑</span>' : '';
      var isNew = highlightNew && index === list.length - 1;
      var liClass = 'history-item timeline-item' + (isNew ? ' history-item-new' : '');
      html += '<li class="' + liClass + '">' +
        '<div class="timeline-marker">' +
        '<span class="history-session">' + rec.session + '회차</span>' + increaseIcon +
        '</div>' +
        '<div class="timeline-content glass">' +
        '<span class="history-stats">모집 ' + rec.recruit + ' / 참여 ' + rec.attend + ' / 노쇼 ' + rec.noshow + '</span>' +
        '<span class="history-rate">참여율 ' + rate + '%</span>' +
        (rec.reason ? '<span class="history-reason">' + escapeHtml(rec.reason) + '</span>' : '') +
        '</div>' +
        '</li>';
    });
    container.innerHTML = html;
  }

  function showToast(message) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(showToast._tid);
    showToast._tid = setTimeout(function () {
      el.classList.remove('visible');
    }, 2500);
  }

  function showModal() {
    var overlay = document.getElementById('modalOverlay');
    if (!overlay) return;
    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function hideModal() {
    var overlay = document.getElementById('modalOverlay');
    if (overlay) {
      overlay.classList.remove('visible');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  function buildSubmitPayload(libraryName, programId, program, sessionNum, recruit, attend, noshow, reason) {
    return {
      library: libraryName,
      programId: programId,
      programName: program ? program.name : '',
      days: program ? program.days : '',
      time: program ? program.time : '',
      session: sessionNum,
      recruit: recruit,
      attend: attend,
      noshow: noshow,
      recruitChangeReason: reason || null,
      submittedAt: new Date().toISOString()
    };
  }

  function validate(recruitStr, attendStr, noshowStr, currentSession, prevRecruit, reasonStr) {
    var r = parseInt(recruitStr, 10);
    var a = parseInt(attendStr, 10);
    var n = parseInt(noshowStr, 10);

    var recruitMissing = recruitStr === '' || isNaN(r) || r < 0;
    if (recruitMissing) {
      if (currentSession === 1) {
        return { ok: false, msg: '1회차는 모집 인원을 반드시 입력해 주세요.' };
      }
      return { ok: false, msg: '모집 인원을 반드시 입력해 주세요.' };
    }

    if (currentSession >= 2 && prevRecruit != null && r < prevRecruit) {
      return {
        ok: false,
        msg: '모집 인원은 이전 회차(' + prevRecruit + '명)보다 줄어들 수 없습니다.',
        revertTo: prevRecruit
      };
    }

    if (isNaN(a) || a < 0) return { ok: false, msg: '참여 인원을 올바르게 입력하세요.' };
    if (isNaN(n) || n < 0) return { ok: false, msg: '노쇼 인원을 올바르게 입력하세요.' };
    if (a > r) return { ok: false, msg: '참여 인원은 모집 인원을 초과할 수 없습니다.' };
    if (n > r) return { ok: false, msg: '노쇼 인원은 모집 인원을 초과할 수 없습니다.' };

    var isRecruitIncreased = prevRecruit != null && r > prevRecruit;
    if (isRecruitIncreased && (!reasonStr || !reasonStr.trim())) {
      return { ok: false, msg: '인원 증액 시 증액 사유를 입력해 주세요.' };
    }
    return { ok: true, recruit: r, attend: a, noshow: n };
  }

  function init() {
    var libSelect = document.getElementById('librarySelect');
    var progSelect = document.getElementById('programSelect');
    var programDetail = document.getElementById('programDetail');
    var currentSessionEl = document.getElementById('currentSession');
    var recruitInput = document.getElementById('recruitInput');
    var recruitWrap = document.getElementById('recruitWrap');
    var recruitEditBtn = document.getElementById('recruitEditBtn');
    var reasonBlock = document.getElementById('reasonBlock');
    var reasonInput = document.getElementById('reasonInput');
    var attendInput = document.getElementById('attendInput');
    var noshowInput = document.getElementById('noshowInput');
    var submitBtn = document.getElementById('submitBtn');
    var modalClose = document.getElementById('modalClose');

    if (!libSelect || !progSelect) return;

    libSelect.innerHTML = buildLibraryOptions();
    progSelect.innerHTML = '<option value="">도서관을 먼저 선택하세요</option>';
    progSelect.disabled = true;

    libSelect.addEventListener('change', function () {
      var lib = libSelect.value.trim();
      progSelect.disabled = true;
      showProgramDetail(null, null, null);
      updateTotalSessionsBlock('', '');
      applyRecruitmentUI(true, '', recruitInput, recruitWrap, reasonBlock, reasonInput);
      renderHistoryList('', '');
      updateCumulativeDisplay('', '', '', '');
      if (!lib) {
        progSelect.innerHTML = '<option value="">도서관을 먼저 선택하세요</option>';
        return;
      }
      var programs = getProgramsRunningToday(lib);
      progSelect.innerHTML = buildProgramOptions(programs);
      progSelect.disabled = false;
    });

    progSelect.addEventListener('change', function () {
      var lib = libSelect.value.trim();
      var id = progSelect.value.trim();
      var program = lib && id ? getProgramById(lib, id) : null;
      showProgramDetail(lib, id, program);
      if (!lib || !id) {
        applyRecruitmentUI(true, '', recruitInput, recruitWrap, reasonBlock, reasonInput);
        renderHistoryList('', '');
        updateCumulativeDisplay('', '', attendInput ? attendInput.value : '', noshowInput ? noshowInput.value : '');
        return;
      }
      var displaySession = getDisplaySessionNumber(lib, id);
      var defaultRecruit = getDefaultRecruit(lib, id);
      var isFirst = displaySession === 1 && defaultRecruit === '';
      applyRecruitmentUI(!isFirst, defaultRecruit, recruitInput, recruitWrap, reasonBlock, reasonInput);
      renderHistoryList(lib, id);
      updateCumulativeDisplay(lib, id, attendInput ? attendInput.value : '', noshowInput ? noshowInput.value : '');
    });

    function attachCumulativeListeners() {
      if (attendInput) {
        attendInput.addEventListener('input', function () {
          updateCumulativeDisplay(libSelect.value.trim(), progSelect.value.trim(), attendInput.value, noshowInput ? noshowInput.value : '');
        });
      }
      if (noshowInput) {
        noshowInput.addEventListener('input', function () {
          updateCumulativeDisplay(libSelect.value.trim(), progSelect.value.trim(), attendInput ? attendInput.value : '', noshowInput.value);
        });
      }
    }
    attachCumulativeListeners();

    var totalSessionsInputEl = document.getElementById('totalSessionsInput');
    if (totalSessionsInputEl) {
      totalSessionsInputEl.addEventListener('input', function () {
        updateTotalSessionsBlock(libSelect.value.trim(), progSelect.value.trim());
      });
    }

    if (recruitEditBtn && recruitInput && recruitWrap && reasonBlock && reasonInput) {
      recruitEditBtn.addEventListener('click', function () {
        recruitWrap.classList.remove('recruit-readonly');
        recruitInput.readOnly = false;
        recruitEditBtn.style.display = 'none';
        recruitInput.classList.remove('recruit-success');
        recruitInput.focus();
      });
      recruitInput.addEventListener('input', function () {
        var last = getLastRecord(libSelect.value.trim(), progSelect.value.trim());
        var prevVal = last ? last.recruit : null;
        var num = parseInt(recruitInput.value.trim(), 10);
        var isIncreased = prevVal != null && !isNaN(num) && num > prevVal;
        if (isIncreased) {
          reasonBlock.classList.add('visible');
          recruitInput.classList.add('recruit-success');
        } else {
          reasonBlock.classList.remove('visible');
          recruitInput.classList.remove('recruit-success');
        }
      });
      recruitInput.addEventListener('blur', function () {
        var lib = libSelect.value.trim();
        var progId = progSelect.value.trim();
        if (!lib || !progId) return;
        var last = getLastRecord(lib, progId);
        var prevRecruit = last ? last.recruit : null;
        if (prevRecruit == null) return;
        var r = parseInt(recruitInput.value.trim(), 10);
        if (isNaN(r)) return;
        if (r < prevRecruit) {
          alert('모집 인원은 이전 회차(' + prevRecruit + '명)보다 줄어들 수 없습니다.');
          recruitInput.value = prevRecruit;
          recruitInput.classList.remove('recruit-success');
          reasonBlock.classList.remove('visible');
          reasonInput.value = '';
        }
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', function () {
        var lib = libSelect.value.trim();
        var progId = progSelect.value.trim();
        var program = lib && progId ? getProgramById(lib, progId) : null;
        var recruitStr = recruitInput ? recruitInput.value.trim() : '';
        var attendStr = attendInput ? attendInput.value.trim() : '';
        var noshowStr = noshowInput ? noshowInput.value.trim() : '';
        var reasonStr = reasonInput ? reasonInput.value.trim() : '';
        var last = lib && progId ? getLastRecord(lib, progId) : null;
        var prevRecruit = last ? last.recruit : null;
        var sessionToSubmit = lib && progId ? getDisplaySessionNumber(lib, progId) : 1;
        var totalSessions = getTotalSessions(lib, progId);
        var totalSessionsInputEl = document.getElementById('totalSessionsInput');
        if (sessionToSubmit === 1 && totalSessions == null && totalSessionsInputEl) {
          var totalStr = totalSessionsInputEl.value.trim();
          var totalNum = parseInt(totalStr, 10);
          if (totalStr === '' || isNaN(totalNum) || totalNum < 1) {
            alert('1회차 제출 시 총 운영 회수를 입력해 주세요. (1 이상)');
            return;
          }
          totalSessionsByProgram[logKey(lib, progId)] = totalNum;
          totalSessions = totalNum;
        }

        var result = validate(recruitStr, attendStr, noshowStr, sessionToSubmit, prevRecruit, reasonStr);
        if (!result.ok) {
          alert(result.msg);
          if (result.revertTo != null && recruitInput) {
            recruitInput.value = result.revertTo;
            recruitInput.classList.remove('recruit-success');
          }
          return;
        }

        var isRecruitIncreased = prevRecruit != null && result.recruit > prevRecruit;
        var payload = buildSubmitPayload(lib, progId, program, sessionToSubmit, result.recruit, result.attend, result.noshow, isRecruitIncreased ? reasonStr : null);
        console.log('Submit payload (for Sheets):', payload);

        var key = logKey(lib, progId);
        if (!historyLog[key]) historyLog[key] = [];
        historyLog[key].push({
          session: sessionToSubmit,
          recruit: result.recruit,
          attend: result.attend,
          noshow: result.noshow,
          reason: isRecruitIncreased ? reasonStr : undefined
        });

        clearSessionDateOverride(lib, progId);
        renderHistoryList(lib, progId, true);
        if (attendInput) attendInput.value = '0';
        if (noshowInput) noshowInput.value = '0';
        if (recruitInput) {
          recruitInput.value = String(result.recruit);
          recruitInput.classList.remove('recruit-success');
          recruitInput.readOnly = true;
          recruitWrap.classList.add('recruit-readonly');
          if (recruitEditBtn) recruitEditBtn.style.display = 'inline-flex';
        }
        if (reasonBlock) { reasonBlock.classList.remove('visible'); reasonInput.value = ''; }
        var isFinalSession = totalSessions != null && sessionToSubmit === totalSessions;
        if (isFinalSession) {
          var panel = document.getElementById('completionPanel');
          if (panel) {
            panel.style.display = 'block';
            panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          showToast('전체 운영 보고가 완료되었습니다.');
        } else {
          updateSessionDateRow(lib, progId);
          updateCumulativeDisplay(lib, progId, '0', '0');
          updateTotalSessionsBlock(lib, progId);
          showToast(sessionToSubmit + '회차 보고가 완료되었습니다.');
        }
      });
    }

    if (modalClose) modalClose.addEventListener('click', hideModal);
    var overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) hideModal(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
