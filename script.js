/**
 * 양천구립도서관 프로그램 통합 대시보드
 * 구글 스프레드시트 실시간 데이터 기반 (가상 데이터 없음)
 */

(function () {
  'use strict';

  /** Google Apps Script Web App 배포 URL (필요 시 여기만 수정) */
  var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwTDaThDRdfWmD-8jVP1FJ3oP5IPNofpkAxiYNW5IRYheLvirgBWwcpQh1RbNpx4m84lg/exec';
  var CACHE_KEY_DASHBOARD = 'dashboardCache';

  const TYPE_PUBLIC = 'public';
  const TYPE_SMALL = 'small';

  /** 도서관 표시 순서 및 타입(공공/작은). 통계는 시트에서 가져옴 */
  var LIBRARY_META = [
    { id: 'yangcheon', name: '양천중앙도서관', type: TYPE_PUBLIC },
    { id: 'galsan', name: '갈산도서관', type: TYPE_PUBLIC },
    { id: 'gaeul', name: '개울건강도서관', type: TYPE_PUBLIC },
    { id: 'mokma', name: '목마교육도서관', type: TYPE_PUBLIC },
    { id: 'migam', name: '미감도서관', type: TYPE_PUBLIC },
    { id: 'bangadari', name: '방아다리문학도서관', type: TYPE_PUBLIC },
    { id: 'sinwol', name: '신월음악도서관', type: TYPE_PUBLIC },
    { id: 'english', name: '영어특성화도서관', type: TYPE_PUBLIC },
    { id: 'haemaji', name: '해맞이역사도서관', type: TYPE_PUBLIC },
    { id: 'saeaerum', name: '새아름작은도서관', type: TYPE_SMALL },
    { id: 'mosaemi', name: '모새미작은도서관', type: TYPE_SMALL }
  ];

  /** 빈칸·문자 등 예기치 않은 값도 0 이상 정수로 안전 변환 */
  function safeNum(v) {
    if (v == null || v === '') return 0;
    var n = parseInt(String(v).replace(/[^\d-]/g, ''), 10);
    return isNaN(n) || n < 0 ? 0 : n;
  }

  /**
   * dashboardData 배열을 순회해 견고하게 지표 계산.
   * - 참여/노쇼: 매 행마다 participationCount, noShowCount 로 누적.
   * - 프로그램 수·모집: 도서관명_프로그램명 고유 키로 1회만 카운트, 모집은 프로그램당 1값(최댓값)만 합산.
   */
  function computeDashboardFromRows(apiList) {
    var totalProgramCount = 0;
    var totalRecruit = 0;
    var totalAttend = 0;
    var totalNoshow = 0;
    var byKey = {};   // key -> { libraryName, programName, recruit (max) }
    var byLibrary = {}; // libraryName -> { attend, noshow, programKeys: Set, recruitByKey: {} }

    if (!Array.isArray(apiList) || apiList.length === 0) {
      return {
        totalProgramCount: 0,
        totalRecruit: 0,
        totalAttend: 0,
        totalNoshow: 0,
        libraries: LIBRARY_META.map(function (meta) {
          return { id: meta.id, name: meta.name, type: meta.type, programCount: 0, recruit: 0, attend: 0, noshow: 0 };
        })
      };
    }

    apiList.forEach(function (row) {
      var lib = (row.libraryName || row.name || '').trim();
      var prog = (row.programName || row.programId || row.program || '').trim();
      var key = lib && prog ? lib + '_' + prog : '';
      if (!key) return;

      var attendVal = Number(row.participationCount) || Number(row.attend) || 0;
      var noshowVal = Number(row.noShowCount) || Number(row.noshow) || 0;
      var recruitVal = Number(row.recruitmentCount) || Number(row.recruit) || 0;
      if (attendVal < 0) attendVal = 0;
      if (noshowVal < 0) noshowVal = 0;
      if (recruitVal < 0) recruitVal = 0;

      if (!byKey[key]) {
        byKey[key] = { libraryName: lib, programName: prog, recruit: recruitVal };
      } else {
        byKey[key].recruit = Math.max(byKey[key].recruit, recruitVal);
      }

      if (!byLibrary[lib]) {
        byLibrary[lib] = { attend: 0, noshow: 0, programKeys: [], recruitByKey: {} };
      }
      byLibrary[lib].attend += attendVal;
      byLibrary[lib].noshow += noshowVal;
      if (byLibrary[lib].programKeys.indexOf(key) === -1) {
        byLibrary[lib].programKeys.push(key);
      }
      byLibrary[lib].recruitByKey[key] = byKey[key].recruit;

      totalAttend += attendVal;
      totalNoshow += noshowVal;
    });

    totalProgramCount = Object.keys(byKey).length;
    Object.keys(byKey).forEach(function (k) {
      totalRecruit += byKey[k].recruit;
    });

    var libraries = LIBRARY_META.map(function (meta) {
      var L = byLibrary[meta.name] || { attend: 0, noshow: 0, programKeys: [], recruitByKey: {} };
      var programCount = L.programKeys.length;
      var recruit = 0;
      for (var i = 0; i < L.programKeys.length; i++) {
        recruit += L.recruitByKey[L.programKeys[i]] || 0;
      }
      return {
        id: meta.id,
        name: meta.name,
        type: meta.type,
        programCount: programCount,
        recruit: recruit,
        attend: Number(L.attend) || 0,
        noshow: Number(L.noshow) || 0
      };
    });

    return {
      totalProgramCount: totalProgramCount,
      totalRecruit: totalRecruit,
      totalAttend: totalAttend,
      totalNoshow: totalNoshow,
      libraries: libraries
    };
  }

  /** @deprecated 호환용: apiList -> merge 결과만 반환 (computeDashboardFromRows 사용 권장) */
  function mergeDashboardData(apiList) {
    var result = computeDashboardFromRows(apiList);
    return result.libraries;
  }

  /** 전체 고유 프로그램 수 (도서관_프로그램 키 기준) */
  function computeTotalProgramCount(apiList) {
    var result = computeDashboardFromRows(apiList);
    return result.totalProgramCount;
  }

  function sumStats(libraries) {
    var recruit = 0, attend = 0, noshow = 0;
    for (var i = 0; i < (libraries && libraries.length) || 0; i++) {
      recruit += Number(safeNum(libraries[i].recruit));
      attend += Number(safeNum(libraries[i].attend));
      noshow += Number(safeNum(libraries[i].noshow));
    }
    return { recruit: recruit, attend: attend, noshow: noshow };
  }

  function formatNum(n) {
    var num = safeNum(n);
    return num.toLocaleString('ko-KR');
  }

  function animateValue(el, from, to, durationMs, callback) {
    var start = typeof window.performance !== 'undefined' && window.performance.now
      ? window.performance.now()
      : Date.now();
    function tick(now) {
      var elapsed = now - start;
      var progress = Math.min(elapsed / durationMs, 1);
      var eased = 1 - Math.pow(1 - progress, 2);
      var current = Math.round(from + (to - from) * eased);
      el.textContent = formatNum(current);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = formatNum(to);
        if (callback) callback();
      }
    }
    requestAnimationFrame(tick);
  }

  function runCountUpInBadge(badgeEl, durationMs) {
    var nums = badgeEl.querySelectorAll('.summary-num');
    var targets = [];
    for (var i = 0; i < nums.length; i++) {
      targets.push(parseInt(nums[i].getAttribute('data-target'), 10) || 0);
    }
    nums.forEach(function (el, i) {
      el.textContent = '0';
      animateValue(el, 0, targets[i], durationMs);
    });
  }

  function setLoading(show) {
    var el = document.getElementById('dashboardLoading');
    if (!el) return;
    if (show) {
      el.classList.remove('hidden');
      el.style.display = '';
    } else {
      el.classList.add('hidden');
      el.style.display = 'none';
    }
  }

  /** 무한 로딩 방지: 성공/실패와 관계없이 스피너를 반드시 숨김 */
  function forceHideLoading() {
    try {
      var el = document.getElementById('dashboardLoading');
      if (el) {
        el.classList.add('hidden');
        el.style.display = 'none';
      }
    } catch (e) {
      if (typeof console !== 'undefined' && console.error) console.error(e);
    }
  }

  function showErrorToast() {
    var el = document.getElementById('dashboardToast');
    if (!el) return;
    el.textContent = '데이터를 불러오는 데 실패했습니다.';
    el.classList.add('dashboard-toast-visible', 'dashboard-toast-error');
    setTimeout(function () {
      el.classList.remove('dashboard-toast-visible', 'dashboard-toast-error');
    }, 4500);
  }

  function restoreDashboardFromCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY_DASHBOARD);
      if (!raw) return null;
      var data = JSON.parse(raw);
      var list = data && (Array.isArray(data.libraries) ? data.libraries : Array.isArray(data) ? data : null);
      if (!list || list.length === 0) return null;
      var totalProgramCount = data && typeof data.totalProgramCount === 'number' ? data.totalProgramCount : 0;
      return { libraries: list, totalProgramCount: totalProgramCount };
    } catch (e) {
      return null;
    }
  }

  function saveDashboardToCache(payload) {
    try {
      if (payload && payload.libraries && payload.libraries.length) {
        localStorage.setItem(CACHE_KEY_DASHBOARD, JSON.stringify({
          libraries: payload.libraries,
          totalProgramCount: typeof payload.totalProgramCount === 'number' ? payload.totalProgramCount : 0
        }));
      }
    } catch (e) { /* quota 등 무시 */ }
  }

  /** 상단 4대 지표 카드에 계산된 값 주입 (id 정확 매칭) */
  function updateSummaryCards(totals, totalProgramCount) {
    var elProgram = document.getElementById('totalProgramCount');
    var elRecruit = document.getElementById('totalRecruit');
    var elAttend = document.getElementById('totalAttend');
    var elNoshow = document.getElementById('totalNoshow');
    var programVal = totalProgramCount != null ? Number(totalProgramCount) : 0;
    var recruitVal = totals && totals.recruit != null ? Number(totals.recruit) : 0;
    var attendVal = totals && totals.attend != null ? Number(totals.attend) : 0;
    var noshowVal = totals && totals.noshow != null ? Number(totals.noshow) : 0;
    if (elProgram) elProgram.textContent = String(formatNum(programVal));
    if (elRecruit) elRecruit.textContent = String(formatNum(recruitVal));
    if (elAttend) elAttend.textContent = String(formatNum(attendVal));
    if (elNoshow) elNoshow.textContent = String(formatNum(noshowVal));
  }

  function updateSummaryBadges(publicLibs, smallLibs) {
    var badgePublic = document.getElementById('summaryBadgePublic');
    var badgeSmall = document.getElementById('summaryBadgeSmall');
    if (!badgePublic || !badgeSmall) return;

    var statsPublic = sumStats(publicLibs);
    var statsSmall = sumStats(smallLibs);
    var programCountPublic = (publicLibs || []).reduce(function (sum, l) { return sum + Number(safeNum(l.programCount)); }, 0);
    var programCountSmall = (smallLibs || []).reduce(function (sum, l) { return sum + Number(safeNum(l.programCount)); }, 0);

    function makeBadgeHtml(programCount, stats) {
      return '<span class="summary-item">프로그램: <span class="summary-num" data-target="' + Number(programCount) + '">0</span></span>' +
        '<span class="summary-item">모집: <span class="summary-num" data-target="' + Number(stats.recruit) + '">0</span></span>' +
        '<span class="summary-item">참여: <span class="summary-num" data-target="' + Number(stats.attend) + '">0</span></span>' +
        '<span class="summary-item">노쇼: <span class="summary-num" data-target="' + Number(stats.noshow) + '">0</span></span>';
    }

    badgePublic.innerHTML = makeBadgeHtml(programCountPublic, statsPublic);
    badgeSmall.innerHTML = makeBadgeHtml(programCountSmall, statsSmall);

    var duration = 700;
    setTimeout(function () {
      runCountUpInBadge(badgePublic, duration);
      runCountUpInBadge(badgeSmall, duration);
    }, 200);
  }

  function barColorsByType(libraries, option) {
    var colors = [];
    for (var i = 0; i < libraries.length; i++) {
      colors.push(libraries[i].type === TYPE_PUBLIC ? option.public : option.small);
    }
    return colors;
  }

  function renderCards(publicLibs, smallLibs) {
    var gridPublic = document.getElementById('cardsGridPublic');
    var gridSmall = document.getElementById('cardsGridSmall');
    if (!gridPublic || !gridSmall) return;

    gridPublic.innerHTML = '';
    gridSmall.innerHTML = '';

    [publicLibs, smallLibs].forEach(function (list, idx) {
      var grid = idx === 0 ? gridPublic : gridSmall;
      (list || []).forEach(function (lib) {
        var badgeClass = lib.type === TYPE_PUBLIC ? 'card-badge badge-public' : 'card-badge badge-small';
        var badgeText = lib.type === TYPE_PUBLIC ? '공공' : '작은';
        var programCount = Number(safeNum(lib.programCount));
        var recruit = Number(safeNum(lib.recruit));
        var attend = Number(safeNum(lib.attend));
        var noshow = Number(safeNum(lib.noshow));
        var card = document.createElement('article');
        card.className = 'library-card glass';
        card.setAttribute('aria-label', lib.name + ' 운영 현황');
        card.innerHTML =
          '<span class="' + badgeClass + '">' + escapeHtml(badgeText) + '</span>' +
          '<div class="card-name">' + escapeHtml(lib.name) + '</div>' +
          '<div class="stats-row">' +
          '<div class="stat-item">' +
          '<div class="stat-label">프로그램 수</div>' +
          '<div class="stat-value">' + programCount + '</div>' +
          '</div>' +
          '<div class="stat-item">' +
          '<div class="stat-label">모집 인원</div>' +
          '<div class="stat-value">' + recruit + '</div>' +
          '</div>' +
          '<div class="stat-item">' +
          '<div class="stat-label">참여 인원</div>' +
          '<div class="stat-value">' + attend + '</div>' +
          '</div>' +
          '<div class="stat-item muted">' +
          '<div class="stat-label">노쇼</div>' +
          '<div class="stat-value">' + noshow + '</div>' +
          '</div>' +
          '</div>';
        grid.appendChild(card);
      });
    });
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  var libraryChartInstance = null;
  var lastRenderedLibraries = [];

  var CHART_TITLES = {
    programCount: '도서관별 프로그램 수 현황',
    recruit: '도서관별 모집 인원 현황',
    attend: '도서관별 참여자 수 현황',
    noshow: '도서관별 노쇼 현황'
  };

  function getChartTitle(metricType) {
    return CHART_TITLES[metricType] || CHART_TITLES.attend;
  }

  /** 탭 클릭 시 단일 막대 차트 전환 + 제목 변경. metricType: 'programCount' | 'recruit' | 'attend' | 'noshow' */
  function renderChart(metricType, libraries) {
    var canvas = document.getElementById('libraryChart');
    var titleEl = document.getElementById('chartTitle');
    if (!canvas) return;

    var libs = libraries && libraries.length ? libraries : [];
    if (titleEl) titleEl.textContent = getChartTitle(metricType);

    var labels = libs.map(function (lib) {
      return String(lib.name || '').replace(/도서관/g, '');
    });
    var data = libs.map(function (l) {
      var v = l[metricType];
      return Number(safeNum(v));
    });

    if (libraryChartInstance) {
      libraryChartInstance.destroy();
      libraryChartInstance = null;
    }

    if (!libs.length) return;

    var publicBg = 'rgba(37, 99, 235, 0.45)';
    var publicBorder = 'rgba(37, 99, 235, 0.85)';
    var smallBg = 'rgba(124, 58, 237, 0.45)';
    var smallBorder = 'rgba(124, 58, 237, 0.85)';

    var ctx = canvas.getContext('2d');
    libraryChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: getChartTitle(metricType),
          data: data,
          backgroundColor: barColorsByType(libs, { public: publicBg, small: smallBg }),
          borderColor: barColorsByType(libs, { public: publicBorder, small: smallBorder }),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        hover: { animationDuration: 0 },
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 35 }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.06)' },
            ticks: { font: { size: 11 } }
          }
        }
      }
    });
  }

  function setChartTabActive(metricType) {
    var tabs = document.querySelectorAll('.chart-tab');
    tabs.forEach(function (tab) {
      var isActive = (tab.getAttribute('data-metric') === metricType);
      tab.classList.toggle('chart-tab-active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  function bindChartTabs() {
    var container = document.querySelector('.chart-tabs');
    if (!container) return;
    container.querySelectorAll('.chart-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var metric = btn.getAttribute('data-metric');
        if (!metric) return;
        setChartTabActive(metric);
        renderChart(metric, lastRenderedLibraries);
      });
    });
  }

  /** libraries: 도서관별 배열, totalProgramCount: 총 프로그램 수, totalsOverride: { recruit, attend, noshow } (API 직산 결과, 없으면 sumStats 사용) */
  function renderDashboard(libraries, totalProgramCount, totalsOverride) {
    var libs = libraries && libraries.length ? libraries : [];
    var publicLibs = libs.filter(function (l) { return l.type === TYPE_PUBLIC; });
    var smallLibs = libs.filter(function (l) { return l.type === TYPE_SMALL; });

    var totals = totalsOverride || sumStats(libs);
    var totalProgram = totalProgramCount != null ? Number(totalProgramCount) : 0;

    updateSummaryCards(totals, totalProgram);
    updateSummaryBadges(publicLibs, smallLibs);
    renderCards(publicLibs, smallLibs);
    lastRenderedLibraries = libs;
    if (typeof Chart !== 'undefined') {
      setChartTabActive('attend');
      renderChart('attend', libs);
    }
  }

  function initChartSection() {
    bindChartTabs();
  }

  function fetchDashboardData(showSpinner) {
    if (showSpinner) setLoading(true);
    var url = SCRIPT_URL + '?action=getDashboardData';

    fetch(url, { method: 'GET' })
      .then(function (res) { return res.text(); })
      .then(function (text) {
        var data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          if (typeof console !== 'undefined' && console.error) console.error('Dashboard JSON parse error:', e);
          showErrorToast();
          return null;
        }
        if (data && (data.error || data.err)) {
          var errMsg = data.error || data.err || 'Unknown error';
          if (typeof console !== 'undefined' && console.error) console.error('Dashboard API error:', errMsg);
          showErrorToast();
          return null;
        }
        return data;
      })
      .then(function (data) {
        var list = [];
        if (data != null) {
          if (Array.isArray(data)) list = data;
          else if (Array.isArray(data.records)) list = data.records;
          else if (Array.isArray(data.data)) list = data.data;
        }
        var result = computeDashboardFromRows(list);
        var payload = {
          libraries: result.libraries,
          totalProgramCount: result.totalProgramCount
        };
        var totals = {
          recruit: result.totalRecruit,
          attend: result.totalAttend,
          noshow: result.totalNoshow
        };
        try {
          saveDashboardToCache(payload);
          renderDashboard(result.libraries, result.totalProgramCount, totals);
        } catch (e) {
          if (typeof console !== 'undefined' && console.error) console.error('Dashboard render error:', e);
          showErrorToast();
          renderDashboard(result.libraries, result.totalProgramCount, totals);
        }
      })
      .catch(function (err) {
        if (typeof console !== 'undefined' && console.error) console.error('Dashboard fetch error:', err);
        showErrorToast();
        try {
          renderDashboard(mergeDashboardData([]), 0);
        } catch (e) {
          if (typeof console !== 'undefined' && console.error) console.error(e);
        }
      })
      .finally(function () {
        forceHideLoading();
      });
  }

  function init() {
    initChartSection();

    /* 기존 잘못된 0 캐시 제거 후 새 데이터만 사용 (SWR 재사용 시 아래 3줄 삭제) */
    try {
      localStorage.removeItem(CACHE_KEY_DASHBOARD);
    } catch (e) { /* 무시 */ }

    var cached = restoreDashboardFromCache();
    if (cached && cached.libraries && cached.libraries.length) {
      forceHideLoading();
      var totals = sumStats(cached.libraries);
      renderDashboard(cached.libraries, cached.totalProgramCount != null ? cached.totalProgramCount : 0, totals);
      fetchDashboardData(false);
    } else {
      fetchDashboardData(true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
