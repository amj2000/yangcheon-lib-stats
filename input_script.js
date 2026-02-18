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

  /** 1 ~ (현재회차-1) 전체 표시용. 없으면 샘플 데이터로 채움 (테스트/화면 확인용) */
  function getDisplayHistory(libraryName, programId) {
    var current = getCurrentSession(libraryName, programId);
    if (current <= 1) return [];
    var saved = getHistory(libraryName, programId);
    var bySession = {};
    saved.forEach(function (rec) { bySession[rec.session] = rec; });
    var list = [];
    for (var s = 1; s < current; s++) {
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

  // 예시 데이터: 일부 프로그램에 1~2회차 기록 있음
  (function seedHistory() {
    var key1 = logKey('양천중앙도서관', 'yc01');
    historyLog[key1] = [
      { session: 1, recruit: 20, attend: 18, noshow: 2 }
    ];
    var key2 = logKey('갈산도서관', 'gs02');
    historyLog[key2] = [
      { session: 1, recruit: 15, attend: 14, noshow: 1 },
      { session: 2, recruit: 15, attend: 15, noshow: 0 }
    ];
  })();

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

  function daysBetween(startStr, endStr) {
    var start = parseDate(startStr);
    var end = parseDate(endStr);
    return Math.floor((end - start) / (24 * 60 * 60 * 1000));
  }

  /** 오늘 기준 현재 회차 (1회차 = 첫 주) */
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

  function showProgramDetail(libraryName, programId, program) {
    var el = document.getElementById('programDetail');
    if (!el) return;
    var sessionEl = document.getElementById('currentSession');
    if (!sessionEl) return;
    if (!program || !libraryName || !programId) {
      el.textContent = '';
      el.classList.remove('visible');
      sessionEl.textContent = '';
      return;
    }
    var startStr = formatPeriodDate(program.period.start);
    var endStr = formatPeriodDate(program.period.end);
    el.innerHTML = '운영 기간: ' + startStr + ' ~ ' + endStr + ' | ' +
      escapeHtml(program.days) + ' | ' + escapeHtml(program.time);
    el.classList.add('visible');
    var session = getCurrentSession(libraryName, programId);
    sessionEl.textContent = '현재 ' + session + '회차';
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

  function renderHistoryList(libraryName, programId) {
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
    list.forEach(function (rec) {
      var rate = participationRate(rec.recruit, rec.attend);
      html += '<li class="history-item timeline-item">' +
        '<div class="timeline-marker">' +
        '<span class="history-session">' + rec.session + '회차</span>' +
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

  function buildSubmitPayload(libraryName, programId, program, recruit, attend, noshow, reason) {
    return {
      library: libraryName,
      programId: programId,
      programName: program ? program.name : '',
      days: program ? program.days : '',
      time: program ? program.time : '',
      session: getCurrentSession(libraryName, programId),
      recruit: recruit,
      attend: attend,
      noshow: noshow,
      recruitChangeReason: reason || null,
      submittedAt: new Date().toISOString()
    };
  }

  function validate(recruitStr, attendStr, noshowStr, isRecruitModified, reasonStr) {
    var r = parseInt(recruitStr, 10);
    var a = parseInt(attendStr, 10);
    var n = parseInt(noshowStr, 10);
    if (isNaN(r) || r < 0) return { ok: false, msg: '모집 인원을 올바르게 입력하세요.' };
    if (isNaN(a) || a < 0) return { ok: false, msg: '참여 인원을 올바르게 입력하세요.' };
    if (isNaN(n) || n < 0) return { ok: false, msg: '노쇼 인원을 올바르게 입력하세요.' };
    if (a > r) return { ok: false, msg: '참여 인원은 모집 인원을 초과할 수 없습니다.' };
    if (n > r) return { ok: false, msg: '노쇼 인원은 모집 인원을 초과할 수 없습니다.' };
    if (isRecruitModified && (!reasonStr || !reasonStr.trim())) {
      return { ok: false, msg: '모집 인원을 수정한 경우 수정 사유를 입력해 주세요.' };
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
      applyRecruitmentUI(true, '', recruitInput, recruitWrap, reasonBlock, reasonInput);
      renderHistoryList('', '');
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
        return;
      }
      var session = getCurrentSession(lib, id);
      var last = getLastRecord(lib, id);
      var isFirst = session <= 1 || !last;
      var defaultRecruit = last ? last.recruit : '';
      applyRecruitmentUI(!isFirst, defaultRecruit, recruitInput, recruitWrap, reasonBlock, reasonInput);
      renderHistoryList(lib, id);
    });

    if (recruitEditBtn && recruitInput && recruitWrap && reasonBlock && reasonInput) {
      recruitEditBtn.addEventListener('click', function () {
        recruitWrap.classList.remove('recruit-readonly');
        recruitInput.readOnly = false;
        recruitEditBtn.style.display = 'none';
        recruitInput.focus();
      });
      recruitInput.addEventListener('input', function () {
        var last = getLastRecord(libSelect.value.trim(), progSelect.value.trim());
        var prevVal = last ? last.recruit : '';
        var changed = recruitInput.value.trim() !== String(prevVal);
        if (changed) reasonBlock.classList.add('visible');
        else reasonBlock.classList.remove('visible');
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
        var isRecruitModified = recruitStr !== '' && prevRecruit !== null && parseInt(recruitStr, 10) !== prevRecruit;

        var result = validate(recruitStr, attendStr, noshowStr, isRecruitModified, reasonStr);
        if (!result.ok) {
          alert(result.msg);
          return;
        }

        var payload = buildSubmitPayload(lib, progId, program, result.recruit, result.attend, result.noshow, isRecruitModified ? reasonStr : null);
        console.log('Submit payload (for Sheets):', payload);

        var key = logKey(lib, progId);
        if (!historyLog[key]) historyLog[key] = [];
        var session = getCurrentSession(lib, progId);
        historyLog[key].push({
          session: session,
          recruit: result.recruit,
          attend: result.attend,
          noshow: result.noshow,
          reason: isRecruitModified ? reasonStr : undefined
        });

        showModal();
        renderHistoryList(lib, progId);
        if (reasonBlock) { reasonBlock.classList.remove('visible'); reasonInput.value = ''; }
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
