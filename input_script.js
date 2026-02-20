/**
 * 현장 담당자용 모바일 입력 페이지
 * 마스터 데이터·회차 자동 감지·이전 회차 기록·모집 인원 특수 로직
 */

(function () {
  'use strict';

  /** Google Apps Script Web App URL */
  var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyKYKjtd7VwF62c1pC8PmCgsqGCAqNIuNHRLIyJB6XdpWab9d_6or-13eqUr545V2ChCQ/exec';

  /** SWR 캐시 키 (프로그램 목록) */
  var CACHE_KEY_PROGRAMS = 'cachedPrograms';
  /** 히스토리 캐시 키 접두사. 실제 키: historyCache_도서관명_프로그램명 */
  var CACHE_KEY_HISTORY_PREFIX = 'historyCache_';

  /** 구글 시트에서 가져온 프로그램 목록 (페이지 로드 시 GET ?action=getPrograms 또는 캐시로 채움) */
  var fetchedPrograms = [];

  /** 시트 날짜(ISO 또는 YYYY-MM-DD) → YYYY.MM.DD 표시용 */
  function formatSheetDate(str) {
    if (str == null || str === '') return '';
    var s = String(str).trim();
    var part = s.indexOf('T') !== -1 ? s.substring(0, s.indexOf('T')) : s.substring(0, 10);
    if (part.length >= 10) return part.replace(/-/g, '.');
    return s;
  }

  /** 시트 한 행을 내부 프로그램 객체로 정규화 (period.start/end는 YYYY-MM-DD 유지) */
  function normalizeProgramFromSheet(row) {
    var lib = row.libraryName != null ? row.libraryName : (row.library != null ? row.library : '');
    var prog = row.programName != null ? row.programName : (row.program != null ? row.program : '');
    if (!row || !lib || !prog) return null;
    var startRaw = row.startDate != null ? row.startDate : (row.start_date != null ? row.start_date : '');
    var endRaw = row.endDate != null ? row.endDate : (row.end_date != null ? row.end_date : '');
    var start = startRaw !== '' && startRaw != null ? String(startRaw).trim().substring(0, 10) : '';
    var end = endRaw !== '' && endRaw != null ? String(endRaw).trim().substring(0, 10) : '';
    if (start.length < 10) start = '';
    if (end.length < 10) end = '';
    return {
      id: prog,
      name: prog,
      libraryName: lib,
      period: { start: start || getTodayStr(), end: end || getTodayStr() },
      days: row.days != null ? String(row.days).trim() : '',
      time: row.time != null ? String(row.time).trim() : ''
    };
  }

  /** 프로그램 목록 GET (?action=getPrograms) → fetchedPrograms 저장. 캐시 갱신은 호출부에서 처리 */
  function fetchProgramsList() {
    var url = WEB_APP_URL + '?action=getPrograms';
    return fetch(url, { method: 'GET' })
      .then(function (res) { return res.text(); })
      .then(function (text) {
        try { return JSON.parse(text); } catch (e) { return []; }
      })
      .then(function (data) {
        var list = Array.isArray(data) ? data : (data && Array.isArray(data.records) ? data.records : (data && Array.isArray(data.data) ? data.data : []));
        fetchedPrograms = list.map(normalizeProgramFromSheet).filter(Boolean);
        return fetchedPrograms;
      });
  }

  /** 캐시에서 프로그램 목록 복원. 유효하면 fetchedPrograms 설정 후 true, 아니면 false */
  function restoreProgramsFromCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY_PROGRAMS);
      if (!raw) return false;
      var list = JSON.parse(raw);
      if (!Array.isArray(list) || list.length === 0) return false;
      fetchedPrograms = list;
      return true;
    } catch (e) {
      return false;
    }
  }

  /** 현재 fetchedPrograms를 캐시에 저장 */
  function saveProgramsToCache() {
    try {
      if (fetchedPrograms.length) {
        localStorage.setItem(CACHE_KEY_PROGRAMS, JSON.stringify(fetchedPrograms));
      }
    } catch (e) { /* quota 등 무시 */ }
  }

  /** 도서관·프로그램별 히스토리 캐시 키 (로컬 스토리지용) */
  function getHistoryCacheKey(libraryName, programNameOrId) {
    return CACHE_KEY_HISTORY_PREFIX + (libraryName || '') + '_' + (programNameOrId || '');
  }

  /** 히스토리 캐시에서 복원. 유효하면 정규화된 기록 배열 반환, 없거나 오류면 null */
  function restoreHistoryFromCache(cacheKey) {
    try {
      var raw = localStorage.getItem(cacheKey);
      if (raw == null) return null;
      var list = JSON.parse(raw);
      if (!Array.isArray(list)) return null;
      return list;
    } catch (e) {
      return null;
    }
  }

  /** 히스토리 기록 배열을 해당 키로 캐시에 저장 */
  function saveHistoryToCache(cacheKey, records) {
    try {
      if (cacheKey && Array.isArray(records)) {
        localStorage.setItem(cacheKey, JSON.stringify(records));
      }
    } catch (e) { /* quota 등 무시 */ }
  }

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

  /** 1 ~ (표시회차-1) 전체 표시용 (historyLog만 사용, 샘플 없음) */
  function getDisplayHistory(libraryName, programId) {
    var nextSession = getDisplaySessionNumber(libraryName, programId);
    if (nextSession <= 1) return [];
    var saved = getHistory(libraryName, programId);
    var bySession = {};
    saved.forEach(function (rec) { bySession[rec.session] = rec; });
    var list = [];
    for (var s = 1; s < nextSession; s++) {
      if (bySession[s]) list.push(bySession[s]);
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

  /** 다양한 입력(ISO 문자열, YYYY-MM-DD, Date)을 Date 객체로 안전 변환. 실패 시 오늘 반환 */
  function toDate(value) {
    if (value instanceof Date) return isNaN(value.getTime()) ? new Date() : value;
    if (value == null || value === '') return new Date();
    var s = String(value).trim();
    if (s.length >= 10) {
      var part = s.indexOf('T') !== -1 ? s.substring(0, 10) : s.substring(0, 10);
      var nums = part.split('-').map(Number);
      if (nums.length >= 3 && !isNaN(nums[0]) && !isNaN(nums[1]) && !isNaN(nums[2]))
        return new Date(nums[0], nums[1] - 1, nums[2]);
    }
    var parsed = new Date(s);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  /** 날짜(문자열/Date) → "YYYY.MM.DD (요일)" 표시. ISO는 KST 기준 해석, NaN 방어 */
  function formatDate(value) {
    if (value == null || value === '') return getTodayDisplay() + ' (' + DAY_NAMES_KR[new Date().getDay()] + ')';
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    var s = typeof value === 'string' ? value.trim() : '';
    if (s.indexOf('T') !== -1) {
      var d = new Date(s);
      if (!isNaN(d.getTime())) {
        var kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
        var y = kst.getUTCFullYear(), m = kst.getUTCMonth() + 1, day = kst.getUTCDate();
        var dow = new Date(Date.UTC(y, m - 1, day)).getUTCDay();
        return y + '.' + pad(m) + '.' + pad(day) + ' (' + DAY_NAMES_KR[dow] + ')';
      }
    }
    var d = toDate(value);
    if (isNaN(d.getTime())) return getTodayDisplay() + ' (' + DAY_NAMES_KR[new Date().getDay()] + ')';
    var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    return y + '.' + pad(m) + '.' + pad(day) + ' (' + DAY_NAMES_KR[d.getDay()] + ')';
  }

  function parseDate(str) {
    return toDate(str);
  }

  function dateToStr(d) {
    if (!d || !(d instanceof Date) || isNaN(d.getTime())) return getTodayStr();
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

  /** 오늘 기준 현재 회차 (스프레드시트 프로그램 기간·요일 기반) */
  function getCurrentSession(libraryName, programId) {
    var program = getProgramById(libraryName, programId);
    if (!program || !program.period) return 1;
    var today = getTodayStr();
    if (today < program.period.start) return 0;
    var days = daysBetween(program.period.start, today);
    return Math.floor(days / 7) + 1;
  }

  function isDateInRange(dateStr, start, end) {
    return dateStr >= start && dateStr <= end;
  }

  /** 해당 도서관의 프로그램 목록 (fetchedPrograms에서 필터, 정규화된 형태) */
  function getProgramsForLibrary(libraryName) {
    return fetchedPrograms.filter(function (p) { return p.libraryName === libraryName; });
  }

  /** 해당 도서관의 프로그램 목록 (날짜 필터 없이 전체 반환) */
  function getProgramsRunningToday(libraryName) {
    return getProgramsForLibrary(libraryName);
  }

  /** 도서관명 + 프로그램명(또는 id)으로 프로그램 객체 반환 */
  function getProgramById(libraryName, programId) {
    for (var i = 0; i < fetchedPrograms.length; i++) {
      if (fetchedPrograms[i].libraryName === libraryName && (fetchedPrograms[i].id === programId || fetchedPrograms[i].name === programId))
        return fetchedPrograms[i];
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

  /** fetchedPrograms에서 도서관명 중복 제거 후 도서관 드롭다운 옵션 생성 */
  function buildLibraryOptions() {
    var seen = {};
    var libs = [];
    for (var i = 0; i < fetchedPrograms.length; i++) {
      var lib = fetchedPrograms[i].libraryName;
      if (lib && !seen[lib]) { seen[lib] = true; libs.push(lib); }
    }
    libs.sort();
    var html = '<option value="">도서관을 선택하세요</option>';
    libs.forEach(function (lib) {
      html += '<option value="' + escapeAttr(lib) + '">' + escapeHtml(lib) + '</option>';
    });
    return html;
  }

  /** 해당 도서관 프로그램 목록으로 프로그램 드롭다운 옵션 생성 */
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
    var d = toDate(dateStr);
    return isNaN(d.getTime()) ? '' : DAY_NAMES_KR[d.getDay()];
  }
  /** 현재 회차 날짜 표시: 항상 formatDate 경유 → NaN 방지 */
  function getSessionDateDisplay(libraryName, programId) {
    var dateStr = getSessionDate(libraryName, programId);
    return formatDate(dateStr || getTodayStr());
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
    var startStr = formatSheetDate(program.period.start) || formatPeriodDate(program.period.start);
    var endStr = formatSheetDate(program.period.end) || formatPeriodDate(program.period.end);
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
      var submitBtnReset = document.getElementById('submitBtn');
      if (submitBtnReset) submitBtnReset.disabled = false;
      return;
    }

    var program = getProgramById(libraryName, programId);
    var displaySession = getDisplaySessionNumber(libraryName, programId);
    var total = getTotalSessions(libraryName, programId);
    var theoreticalMax = program ? countSessionDaysInPeriod(program) : 0;
    if (displaySession > 1 && total == null) {
      block.style.display = 'none';
      if (finalNotice) finalNotice.style.display = 'none';
      var submitBtnReset2 = document.getElementById('submitBtn');
      if (submitBtnReset2) submitBtnReset2.disabled = false;
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
      var isOverflow = !isNaN(typed) && typed >= 1 && theoreticalMax >= 1 && typed > theoreticalMax;
      if (isOverflow) {
        summaryEl.textContent = '운영 기간 내 가능한 최대 회수(' + theoreticalMax + '회)를 초과했습니다.';
        summaryEl.classList.add('total-sessions-summary-error');
        if (totalInput) totalInput.classList.add('total-sessions-input-error');
        block.classList.add('total-sessions-block-overflow');
        var submitBtn = document.getElementById('submitBtn');
        if (submitBtn) submitBtn.disabled = true;
      } else {
        summaryEl.classList.remove('total-sessions-summary-error');
        if (totalInput) totalInput.classList.remove('total-sessions-input-error');
        block.classList.remove('total-sessions-block-overflow');
        var submitBtnEl = document.getElementById('submitBtn');
        if (submitBtnEl) submitBtnEl.disabled = false;
        if (!isNaN(typed) && typed >= 1) {
          var rest1 = theoreticalMax - typed;
          if (rest1 < 0) rest1 = 0;
          summaryEl.textContent = '총 운영회수: ' + typed + '회 (기간 중 ' + rest1 + '회 쉼)';
        } else {
          summaryEl.textContent = '총 운영회수를 입력하세요.';
        }
      }
    } else {
      if (inputWrap) inputWrap.style.display = 'none';
      summaryEl.classList.remove('total-sessions-summary-error');
      if (totalInput) totalInput.classList.remove('total-sessions-input-error');
      block.classList.remove('total-sessions-block-overflow');
      var submitBtnElse = document.getElementById('submitBtn');
      if (submitBtnElse) submitBtnElse.disabled = false;
      var userTotal = total;
      if (userTotal != null && userTotal >= 1) {
        var rest = theoreticalMax - userTotal;
        if (rest < 0) rest = 0;
        summaryEl.textContent = '총 운영회수: ' + userTotal + '회 (기간 중 ' + rest + '회 쉼)';
      } else {
        summaryEl.textContent = '총 운영회수를 입력하세요.';
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
      var dateForInput = dateToStr(toDate(currentDate));
      sessionEl.innerHTML =
        '<div class="current-session-edit">' +
        '<input type="date" id="sessionDateInput" class="input-schedule" value="' + escapeAttr(dateForInput) + '" aria-label="해당 회차 날짜">' +
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

  /** 1회차일 때 버튼 '입력', 2회차 이상일 때 '수정'. 모집 버튼은 1회차에서도 표시(입력 유도) */
  function applyRecruitmentUI(displaySession, lastRecruit, recruitInput, wrapEl, reasonBlock, reasonInput) {
    if (!recruitInput || !wrapEl) return;
    var readonly = displaySession >= 2;
    wrapEl.classList.toggle('recruit-readonly', readonly);
    recruitInput.readOnly = readonly;
    recruitInput.value = lastRecruit !== undefined && lastRecruit !== null ? String(lastRecruit) : '';
    var editBtn = document.getElementById('recruitEditBtn');
    if (editBtn) {
      editBtn.textContent = displaySession === 1 ? '입력' : '수정';
      editBtn.style.display = 'inline-flex';
    }
    if (reasonBlock) {
      reasonBlock.classList.remove('visible');
      if (reasonBlock.querySelector('input')) reasonBlock.querySelector('input').value = '';
    }
  }

  /** 해당 회차 기록의 운영 날짜 (저장된 date/sessionDate 또는 스케줄 기반). 항상 formatDate 경유 */
  function getRecordDateDisplay(rec, program) {
    var raw = rec.date || rec.sessionDate || (program ? getSessionDateBySchedule(program, rec.session) : null) || getTodayStr();
    return formatDate(raw);
  }

  function renderHistoryList(libraryName, programId, highlightNew) {
    var container = document.getElementById('historyList');
    var section = document.getElementById('historySection');
    if (!container) return;
    if (!libraryName || !programId) {
      if (section) section.style.display = 'none';
      container.innerHTML = '';
      return;
    }
    var list = getDisplayHistory(libraryName, programId);
    var program = getProgramById(libraryName, programId);
    if (!list.length) {
      if (section) section.style.display = 'none';
      container.innerHTML = '';
      return;
    }
    if (section) section.style.display = '';
    var html = '';
    list.forEach(function (rec, index) {
      var rate = participationRate(rec.recruit, rec.attend);
      var increaseIcon = rec.reason ? '<span class="history-increase-icon" aria-label="인원 증액">↑</span>' : '';
      var isNew = highlightNew && index === list.length - 1;
      var liClass = 'history-item timeline-item' + (isNew ? ' history-item-new' : '');
      var dateDisplay = getRecordDateDisplay(rec, program);
      html += '<li class="' + liClass + '" data-session="' + escapeAttr(String(rec.session)) + '" tabindex="0" role="button">' +
        '<div class="history-item-left">' +
        '<span class="history-session-with-date">' + rec.session + '회차 | ' + dateDisplay + '</span>' + increaseIcon +
        '</div>' +
        '<div class="history-item-right glass">' +
        '<span class="history-stats">모집 ' + rec.recruit + '/참여 ' + rec.attend + '/노쇼 ' + rec.noshow + '</span>' +
        '<span class="history-rate">참여율 ' + rate + '%</span>' +
        (rec.reason ? '<span class="history-reason">' + escapeHtml(rec.reason) + '</span>' : '') +
        '</div>' +
        '</li>';
    });
    container.innerHTML = html;
    bindHistoryItemClicks(libraryName, programId);
  }

  function bindHistoryItemClicks(libraryName, programId) {
    var items = document.querySelectorAll('#historyList li.history-item[data-session]');
    items.forEach(function (li) {
      var sessionNum = parseInt(li.getAttribute('data-session'), 10);
      var openModal = function () { openEditHistoryModal(libraryName, programId, sessionNum); };
      li.addEventListener('click', openModal);
      li.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal();
        }
      });
    });
  }

  function openEditHistoryModal(libraryName, programId, sessionNum) {
    var overlay = document.getElementById('editHistoryModalOverlay');
    var list = getDisplayHistory(libraryName, programId);
    var program = getProgramById(libraryName, programId);
    var rec = list.filter(function (r) { return r.session === sessionNum; })[0];
    if (!rec || !overlay) return;
    var raw = rec.date || rec.sessionDate || (program ? getSessionDateBySchedule(program, rec.session) : null) || getTodayStr();
    document.getElementById('editHistoryDate').value = dateToStr(toDate(raw));
    document.getElementById('editHistoryRecruit').value = rec.recruit;
    document.getElementById('editHistoryAttend').value = rec.attend;
    document.getElementById('editHistoryNoshow').value = rec.noshow;
    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden', 'false');
    overlay._editContext = { libraryName: libraryName, programId: programId, sessionNum: sessionNum };
  }

  function closeEditHistoryModal() {
    var overlay = document.getElementById('editHistoryModalOverlay');
    if (overlay) {
      overlay.classList.remove('visible');
      overlay.setAttribute('aria-hidden', 'true');
      overlay._editContext = null;
    }
  }

  function saveEditHistoryModal() {
    var overlay = document.getElementById('editHistoryModalOverlay');
    if (!overlay || !overlay._editContext) return;
    var ctx = overlay._editContext;
    var libraryName = ctx.libraryName;
    var programId = ctx.programId;
    var sessionNum = ctx.sessionNum;
    var dateVal = (document.getElementById('editHistoryDate') || {}).value || '';
    var recruitVal = parseInt((document.getElementById('editHistoryRecruit') || {}).value, 10);
    var attendVal = parseInt((document.getElementById('editHistoryAttend') || {}).value, 10);
    var noshowVal = parseInt((document.getElementById('editHistoryNoshow') || {}).value, 10);
    if (isNaN(recruitVal)) recruitVal = 0;
    if (isNaN(attendVal)) attendVal = 0;
    if (isNaN(noshowVal)) noshowVal = 0;
    var key = logKey(libraryName, programId);
    var arr = historyLog[key];
    if (!arr) return;
    var rec = arr.filter(function (r) { return r.session === sessionNum; })[0];
    if (!rec) return;
    rec.date = dateVal || rec.date;
    rec.recruit = recruitVal;
    rec.attend = attendVal;
    rec.noshow = noshowVal;
    var programNameForCache = (getProgramById(libraryName, programId) && getProgramById(libraryName, programId).name) || programId;
    saveHistoryToCache(getHistoryCacheKey(libraryName, programNameForCache), historyLog[key]);
    closeEditHistoryModal();
    renderHistoryList(libraryName, programId);
    var attendInput = document.getElementById('attendInput');
    var noshowInput = document.getElementById('noshowInput');
    updateCumulativeDisplay(libraryName, programId, attendInput ? attendInput.value : '', noshowInput ? noshowInput.value : '');
    showToast('해당 회차 기록이 수정되었습니다.');
  }

  function showToast(message, isError) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('toast-error', !!isError);
    el.classList.add('visible');
    clearTimeout(showToast._tid);
    showToast._tid = setTimeout(function () {
      el.classList.remove('visible');
      el.classList.remove('toast-error');
    }, 2500);
  }

  function showSyncLoading() {
    var el = document.getElementById('syncLoadingOverlay');
    if (el) { el.classList.add('visible'); el.setAttribute('aria-hidden', 'false'); }
  }

  function hideSyncLoading() {
    var el = document.getElementById('syncLoadingOverlay');
    if (el) { el.classList.remove('visible'); el.setAttribute('aria-hidden', 'true'); }
  }

  /** 제출·입력창만 잠금(도서관/프로그램 선택은 유지) */
  function setFormDisabled(disabled, recruitInput, attendInput, noshowInput, totalSessionsInput, submitBtn) {
    if (recruitInput) recruitInput.disabled = disabled;
    if (attendInput) attendInput.disabled = disabled;
    if (noshowInput) noshowInput.disabled = disabled;
    if (totalSessionsInput) totalSessionsInput.disabled = disabled;
    if (submitBtn) submitBtn.disabled = disabled;
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

  /** 스프레드시트 응답 레코드를 historyLog 형식으로 정규화 */
  function normalizeHistoryRecord(rec) {
    if (!rec || typeof rec !== 'object') return null;
    var session = rec.session != null ? Number(rec.session) : (rec.currentSession != null ? Number(rec.currentSession) : 0);
    var date = rec.date || rec.sessionDate || '';
    var recruit = rec.recruit != null ? Number(rec.recruit) : (rec.recruitmentCount != null ? Number(rec.recruitmentCount) : 0);
    var attend = rec.attend != null ? Number(rec.attend) : (rec.participationCount != null ? Number(rec.participationCount) : 0);
    var noshow = rec.noshow != null ? Number(rec.noshow) : (rec.noShowCount != null ? Number(rec.noShowCount) : 0);
    var reason = rec.reason != null ? String(rec.reason) : undefined;
    if (isNaN(session) || session < 1) return null;
    return { session: session, date: date || undefined, recruit: recruit, attend: attend, noshow: noshow, reason: reason || undefined };
  }

  /** 구글 스프레드시트에서 해당 도서관·프로그램의 과거 기록 GET 요청 (?action=getHistory) */
  function fetchHistoryFromSheet(libraryName, programName) {
    var url = WEB_APP_URL + '?action=getHistory&libraryName=' + encodeURIComponent(libraryName) + '&programName=' + encodeURIComponent(programName || '');
    return fetch(url, { method: 'GET' })
      .then(function (res) { return res.text(); })
      .then(function (text) {
        try { return JSON.parse(text); } catch (e) { return []; }
      })
      .then(function (data) {
        var list = Array.isArray(data) ? data : (data && Array.isArray(data.records) ? data.records : (data && Array.isArray(data.data) ? data.data : []));
        return list.map(normalizeHistoryRecord).filter(Boolean);
      });
  }

  /** Google 스프레드시트 Web App 전송용 페이로드 (CORS 대응 키 구성) */
  function buildApiPayload(libraryName, programName, totalSessions, currentSession, sessionDate, recruitmentCount, participationCount, noShowCount, participationRate, reason) {
    return {
      libraryName: libraryName,
      programName: programName || '',
      totalSessions: totalSessions != null ? totalSessions : 0,
      currentSession: currentSession,
      sessionDate: sessionDate || '',
      recruitmentCount: recruitmentCount,
      participationCount: participationCount,
      noShowCount: noShowCount,
      participationRate: participationRate,
      reason: reason || ''
    };
  }

  function validate(recruitStr, attendStr, noshowStr, currentSession, prevRecruit, reasonStr) {
    var r = parseInt(recruitStr, 10);
    var a = parseInt(attendStr, 10);
    var n = (noshowStr === '' || noshowStr == null) ? 0 : parseInt(noshowStr, 10);
    if (isNaN(n) || n < 0) n = 0;

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
    if (a > r) {
      return {
        ok: false,
        msg: '오류: 참여자 수는 모집 인원을 초과할 수 없습니다. 현장 접수자가 있다면 모집 인원을 먼저 수정해 주세요.',
        highlightAttend: true
      };
    }
    var absent = r - a;
    if (n > absent) {
      return {
        ok: false,
        msg: '오류: 노쇼 인원(' + n + '명)은 실제 결석 인원(' + absent + '명)보다 많을 수 없습니다.',
        highlightNoshow: true
      };
    }

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

    function renderDropdownsFromFetched() {
      libSelect.innerHTML = buildLibraryOptions();
      progSelect.innerHTML = '<option value="">도서관을 먼저 선택하세요</option>';
      progSelect.disabled = true;
    }

    function onProgramsReady() {
      renderDropdownsFromFetched();
      attachListeners();
    }

    function onProgramsError() {
      libSelect.innerHTML = '<option value="">목록을 불러올 수 없습니다</option>';
      progSelect.innerHTML = '<option value="">도서관을 먼저 선택하세요</option>';
      progSelect.disabled = true;
      attachListeners();
    }

    if (restoreProgramsFromCache()) {
      renderDropdownsFromFetched();
      attachListeners();
      fetchProgramsList()
        .then(function () {
          saveProgramsToCache();
          var lib = libSelect.value.trim();
          var prog = progSelect.value.trim();
          libSelect.innerHTML = buildLibraryOptions();
          if (lib) libSelect.value = lib;
          if (lib) {
            var programs = getProgramsRunningToday(lib);
            progSelect.innerHTML = buildProgramOptions(programs);
            progSelect.disabled = false;
            if (prog) progSelect.value = prog;
          }
        })
        .catch(function () { /* 백그라운드 갱신 실패 시 캐시 화면 유지 */ });
      return;
    }

    showSyncLoading();
    fetchProgramsList()
      .then(function () {
        saveProgramsToCache();
        hideSyncLoading();
        onProgramsReady();
      })
      .catch(function () {
        hideSyncLoading();
        onProgramsError();
      });

    function attachListeners() {
    libSelect.addEventListener('change', function () {
      var lib = libSelect.value.trim();
      progSelect.disabled = true;
      showProgramDetail(null, null, null);
      updateTotalSessionsBlock('', '');
      applyRecruitmentUI(1, '', recruitInput, recruitWrap, reasonBlock, reasonInput);
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
        applyRecruitmentUI(1, '', recruitInput, recruitWrap, reasonBlock, reasonInput);
        renderHistoryList('', '');
        updateCumulativeDisplay('', '', attendInput ? attendInput.value : '', noshowInput ? noshowInput.value : '');
        return;
      }
      var key = logKey(lib, id);
      var programName = program ? program.name : id;
      var historyCacheKey = getHistoryCacheKey(lib, programName);
      var totalSessionsInputEl = document.getElementById('totalSessionsInput');

      function applyHistoryUI() {
        updateSessionDateRow(lib, id);
        updateTotalSessionsBlock(lib, id);
        var displaySession = getDisplaySessionNumber(lib, id);
        var defaultRecruit = getDefaultRecruit(lib, id);
        applyRecruitmentUI(displaySession, defaultRecruit, recruitInput, recruitWrap, reasonBlock, reasonInput);
        renderHistoryList(lib, id);
        updateCumulativeDisplay(lib, id, attendInput ? attendInput.value : '', noshowInput ? noshowInput.value : '');
      }

      var cached = restoreHistoryFromCache(historyCacheKey);
      if (cached !== null) {
        historyLog[key] = cached;
        applyHistoryUI();
        fetchHistoryFromSheet(lib, programName)
          .then(function (records) {
            var list = Array.isArray(records) ? records : [];
            historyLog[key] = list;
            saveHistoryToCache(historyCacheKey, list);
            applyHistoryUI();
          })
          .catch(function () { /* 백그라운드 갱신 실패 시 캐시 화면 유지 */ });
        return;
      }

      showSyncLoading();
      setFormDisabled(true, recruitInput, attendInput, noshowInput, totalSessionsInputEl, submitBtn);
      fetchHistoryFromSheet(lib, programName)
        .then(function (records) {
          var list = Array.isArray(records) ? records : [];
          historyLog[key] = list;
          saveHistoryToCache(historyCacheKey, list);
          hideSyncLoading();
          setFormDisabled(false, recruitInput, attendInput, noshowInput, totalSessionsInputEl, submitBtn);
          applyHistoryUI();
        })
        .catch(function () {
          hideSyncLoading();
          setFormDisabled(false, recruitInput, attendInput, noshowInput, totalSessionsInputEl, submitBtn);
          applyHistoryUI();
        });
    });

    function attachCumulativeListeners() {
      if (attendInput) {
        attendInput.addEventListener('input', function () {
          attendInput.classList.remove('input-error');
          updateCumulativeDisplay(libSelect.value.trim(), progSelect.value.trim(), attendInput.value, noshowInput ? noshowInput.value : '');
        });
      }
      if (noshowInput) {
        noshowInput.addEventListener('input', function () {
          noshowInput.classList.remove('input-error');
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
          if (attendInput) attendInput.classList.remove('input-error');
          if (noshowInput) noshowInput.classList.remove('input-error');
          if (result.highlightAttend && attendInput) attendInput.classList.add('input-error');
          if (result.highlightNoshow && noshowInput) noshowInput.classList.add('input-error');
          showToast(result.msg, true);
          if (result.revertTo != null && recruitInput) {
            recruitInput.value = result.revertTo;
            recruitInput.classList.remove('recruit-success');
          }
          return;
        }
        if (attendInput) attendInput.classList.remove('input-error');
        if (noshowInput) noshowInput.classList.remove('input-error');

        var isRecruitIncreased = prevRecruit != null && result.recruit > prevRecruit;
        var sessionDateStr = getSessionDate(lib, progId);
        var rate = participationRate(result.recruit, result.attend);
        var apiPayload = buildApiPayload(
          lib,
          program ? program.name : '',
          totalSessions,
          sessionToSubmit,
          sessionDateStr,
          result.recruit,
          result.attend,
          result.noshow,
          rate,
          isRecruitIncreased ? reasonStr : ''
        );

        var key = logKey(lib, progId);
        if (!historyLog[key]) historyLog[key] = [];
        var optimisticRecord = {
          session: sessionToSubmit,
          date: sessionDateStr,
          recruit: result.recruit,
          attend: result.attend,
          noshow: result.noshow,
          reason: isRecruitIncreased ? reasonStr : undefined
        };
        historyLog[key].push(optimisticRecord);
        var programNameForCache = (apiPayload && apiPayload.programName) || (getProgramById(lib, progId) && getProgramById(lib, progId).name) || progId;
        saveHistoryToCache(getHistoryCacheKey(lib, programNameForCache), historyLog[key]);
        clearSessionDateOverride(lib, progId);
        renderHistoryList(lib, progId, true);
        if (attendInput) attendInput.value = '0';
        if (noshowInput) noshowInput.value = '0';
        if (recruitInput) {
          recruitInput.value = String(result.recruit);
          recruitInput.classList.remove('recruit-success');
          recruitInput.readOnly = true;
          recruitWrap.classList.add('recruit-readonly');
          if (recruitEditBtn) {
            recruitEditBtn.textContent = getDisplaySessionNumber(lib, progId) === 1 ? '입력' : '수정';
            recruitEditBtn.style.display = 'inline-flex';
          }
        }
        if (reasonBlock) { reasonBlock.classList.remove('visible'); reasonInput.value = ''; }
        var isFinalSession = totalSessions != null && sessionToSubmit === totalSessions;
        if (isFinalSession) {
          var panel = document.getElementById('completionPanel');
          if (panel) {
            panel.style.display = 'block';
            panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        updateSessionDateRow(lib, progId);
        updateCumulativeDisplay(lib, progId, '0', '0');
        updateTotalSessionsBlock(lib, progId);
        showToast('데이터가 성공적으로 저장되었습니다.');

        function rollbackOptimistic() {
          historyLog[key].pop();
          saveHistoryToCache(getHistoryCacheKey(lib, programNameForCache), historyLog[key]);
          renderHistoryList(lib, progId);
          updateSessionDateRow(lib, progId);
          updateTotalSessionsBlock(lib, progId);
          if (attendInput) attendInput.value = String(result.attend);
          if (noshowInput) noshowInput.value = String(result.noshow);
          if (recruitInput) {
            recruitInput.value = String(result.recruit);
            recruitInput.readOnly = false;
            recruitWrap.classList.remove('recruit-readonly');
            if (recruitEditBtn) recruitEditBtn.style.display = 'inline-flex';
          }
          updateCumulativeDisplay(lib, progId, attendInput ? attendInput.value : '', noshowInput ? noshowInput.value : '');
          showToast('오프라인 상태이거나 서버 오류로 방금 입력한 데이터가 저장되지 않았습니다. 다시 확인해 주세요.', true);
        }

        fetch(WEB_APP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(apiPayload)
        })
          .then(function (res) { return res.text(); })
          .then(function (text) {
            try { return JSON.parse(text); } catch (e) { return { result: text }; }
          })
          .then(function (data) {
            if (data && data.result === 'success') {
              return;
            }
            rollbackOptimistic();
          })
          .catch(function () {
            rollbackOptimistic();
          });
      });
    }

    if (modalClose) modalClose.addEventListener('click', hideModal);
    var overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) hideModal(); });

    var editModalOverlay = document.getElementById('editHistoryModalOverlay');
    var editHistoryCancel = document.getElementById('editHistoryCancel');
    var editHistorySave = document.getElementById('editHistorySave');
    if (editHistoryCancel) editHistoryCancel.addEventListener('click', closeEditHistoryModal);
    if (editHistorySave) editHistorySave.addEventListener('click', saveEditHistoryModal);
    if (editModalOverlay) {
      editModalOverlay.addEventListener('click', function (e) {
        if (e.target === editModalOverlay) closeEditHistoryModal();
      });
    }
    }

  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
