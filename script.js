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

  /** API 응답을 도서관별로 합치고, META 순서/타입과 병합 (숫자 필드 안전 파싱) */
  function mergeDashboardData(apiList) {
    if (!Array.isArray(apiList) || apiList.length === 0) {
      return LIBRARY_META.map(function (meta) {
        return { id: meta.id, name: meta.name, type: meta.type, recruit: 0, attend: 0, noshow: 0 };
      });
    }
    var byName = {};
    apiList.forEach(function (row) {
      var name = (row.libraryName || row.name || '').trim();
      if (!name) return;
      if (!byName[name]) byName[name] = { recruit: 0, attend: 0, noshow: 0 };
      byName[name].recruit += safeNum(row.recruit);
      byName[name].attend += safeNum(row.attend);
      byName[name].noshow += safeNum(row.noshow);
    });
    return LIBRARY_META.map(function (meta) {
      var stats = byName[meta.name] || { recruit: 0, attend: 0, noshow: 0 };
      return {
        id: meta.id,
        name: meta.name,
        type: meta.type,
        recruit: safeNum(stats.recruit),
        attend: safeNum(stats.attend),
        noshow: safeNum(stats.noshow)
      };
    });
  }

  function sumStats(libraries) {
    var recruit = 0, attend = 0, noshow = 0;
    for (var i = 0; i < (libraries && libraries.length) || 0; i++) {
      recruit += safeNum(libraries[i].recruit);
      attend += safeNum(libraries[i].attend);
      noshow += safeNum(libraries[i].noshow);
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
      var list = JSON.parse(raw);
      if (!Array.isArray(list) || list.length === 0) return null;
      return list;
    } catch (e) {
      return null;
    }
  }

  function saveDashboardToCache(libraries) {
    try {
      if (libraries && libraries.length) {
        localStorage.setItem(CACHE_KEY_DASHBOARD, JSON.stringify(libraries));
      }
    } catch (e) { /* quota 등 무시 */ }
  }

  function updateSummaryCards(totals, avgRate) {
    var totalRecruit = document.getElementById('totalRecruit');
    var totalAttend = document.getElementById('totalAttend');
    var totalNoshow = document.getElementById('totalNoshow');
    var avgEl = document.getElementById('avgParticipationRate');
    if (totalRecruit) totalRecruit.textContent = formatNum(totals.recruit);
    if (totalAttend) totalAttend.textContent = formatNum(totals.attend);
    if (totalNoshow) totalNoshow.textContent = formatNum(totals.noshow);
    if (avgEl) avgEl.textContent = (avgRate != null ? Math.round(avgRate * 10) / 10 : 0) + '%';
  }

  function updateSummaryBadges(publicLibs, smallLibs) {
    var badgePublic = document.getElementById('summaryBadgePublic');
    var badgeSmall = document.getElementById('summaryBadgeSmall');
    if (!badgePublic || !badgeSmall) return;

    var statsPublic = sumStats(publicLibs);
    var statsSmall = sumStats(smallLibs);

    function makeBadgeHtml(stats) {
      return '<span class="summary-item">모집계: <span class="summary-num" data-target="' + stats.recruit + '">0</span></span>' +
        '<span class="summary-item">참여계: <span class="summary-num" data-target="' + stats.attend + '">0</span></span>' +
        '<span class="summary-item">노쇼: <span class="summary-num" data-target="' + stats.noshow + '">0</span></span>';
    }

    badgePublic.innerHTML = makeBadgeHtml(statsPublic);
    badgeSmall.innerHTML = makeBadgeHtml(statsSmall);

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

    [publicLibs, smallLibs].forEach(function (list) {
      var grid = list[0].type === TYPE_PUBLIC ? gridPublic : gridSmall;
      list.forEach(function (lib) {
        var badgeClass = lib.type === TYPE_PUBLIC ? 'card-badge badge-public' : 'card-badge badge-small';
        var badgeText = lib.type === TYPE_PUBLIC ? '공공' : '작은';
        var card = document.createElement('article');
        card.className = 'library-card glass';
        card.setAttribute('aria-label', lib.name + ' 운영 현황');
        card.innerHTML =
          '<span class="' + badgeClass + '">' + escapeHtml(badgeText) + '</span>' +
          '<div class="card-name">' + escapeHtml(lib.name) + '</div>' +
          '<div class="stats-row">' +
          '<div class="stat-item">' +
          '<div class="stat-label">모집 현황</div>' +
          '<div class="stat-value">' + lib.recruit + '</div>' +
          '</div>' +
          '<div class="stat-item">' +
          '<div class="stat-label">참여 인원</div>' +
          '<div class="stat-value">' + lib.attend + '</div>' +
          '</div>' +
          '<div class="stat-item muted">' +
          '<div class="stat-label">노쇼</div>' +
          '<div class="stat-value">' + lib.noshow + '</div>' +
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

  function initChart(libraries) {
    var canvas = document.getElementById('libraryChart');
    if (!canvas || !libraries.length) return;

    var labels = libraries.map(function (lib) {
      return lib.name.length > 10 ? lib.name.replace('도서관', '') : lib.name;
    });
    var recruitData = libraries.map(function (l) { return l.recruit; });
    var attendData = libraries.map(function (l) { return l.attend; });
    var noshowData = libraries.map(function (l) { return l.noshow; });

    var publicBg = 'rgba(37, 99, 235, 0.45)';
    var publicBorder = 'rgba(37, 99, 235, 0.85)';
    var smallBg = 'rgba(124, 58, 237, 0.45)';
    var smallBorder = 'rgba(124, 58, 237, 0.85)';

    if (libraryChartInstance) {
      libraryChartInstance.data.labels = labels;
      libraryChartInstance.data.datasets[0].data = recruitData;
      libraryChartInstance.data.datasets[1].data = attendData;
      libraryChartInstance.data.datasets[2].data = noshowData;
      libraryChartInstance.data.datasets[0].backgroundColor = barColorsByType(libraries, { public: publicBg, small: smallBg });
      libraryChartInstance.data.datasets[0].borderColor = barColorsByType(libraries, { public: publicBorder, small: smallBorder });
      libraryChartInstance.data.datasets[1].backgroundColor = barColorsByType(libraries, { public: 'rgba(37, 99, 235, 0.35)', small: 'rgba(124, 58, 237, 0.35)' });
      libraryChartInstance.data.datasets[1].borderColor = barColorsByType(libraries, { public: publicBorder, small: smallBorder });
      libraryChartInstance.data.datasets[2].backgroundColor = barColorsByType(libraries, { public: 'rgba(37, 99, 235, 0.22)', small: 'rgba(124, 58, 237, 0.22)' });
      libraryChartInstance.data.datasets[2].borderColor = barColorsByType(libraries, { public: 'rgba(37, 99, 235, 0.6)', small: 'rgba(124, 58, 237, 0.6)' });
      libraryChartInstance.update('none');
      return;
    }

    var ctx = canvas.getContext('2d');
    libraryChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: '모집 현황',
            data: recruitData,
            backgroundColor: barColorsByType(libraries, { public: publicBg, small: smallBg }),
            borderColor: barColorsByType(libraries, { public: publicBorder, small: smallBorder }),
            borderWidth: 1
          },
          {
            label: '참여 인원',
            data: attendData,
            backgroundColor: barColorsByType(libraries, { public: 'rgba(37, 99, 235, 0.35)', small: 'rgba(124, 58, 237, 0.35)' }),
            borderColor: barColorsByType(libraries, { public: publicBorder, small: smallBorder }),
            borderWidth: 1
          },
          {
            label: '노쇼',
            data: noshowData,
            backgroundColor: barColorsByType(libraries, { public: 'rgba(37, 99, 235, 0.22)', small: 'rgba(124, 58, 237, 0.22)' }),
            borderColor: barColorsByType(libraries, { public: 'rgba(37, 99, 235, 0.6)', small: 'rgba(124, 58, 237, 0.6)' }),
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1200 },
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
            ticks: { font: { size: 11 }, stepSize: 50 }
          }
        }
      }
    });
  }

  function renderDashboard(libraries) {
    var publicLibs = libraries.filter(function (l) { return l.type === TYPE_PUBLIC; });
    var smallLibs = libraries.filter(function (l) { return l.type === TYPE_SMALL; });

    var totals = sumStats(libraries);
    var avgRate = totals.recruit > 0 ? (totals.attend / totals.recruit) * 100 : 0;

    updateSummaryCards(totals, avgRate);
    updateSummaryBadges(publicLibs, smallLibs);
    renderCards(publicLibs, smallLibs);
    if (typeof Chart !== 'undefined') {
      initChart(libraries);
    }
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
        var libraries = mergeDashboardData(list);
        try {
          saveDashboardToCache(libraries);
          renderDashboard(libraries);
        } catch (e) {
          if (typeof console !== 'undefined' && console.error) console.error('Dashboard render error:', e);
          showErrorToast();
          renderDashboard(mergeDashboardData([]));
        }
      })
      .catch(function (err) {
        if (typeof console !== 'undefined' && console.error) console.error('Dashboard fetch error:', err);
        showErrorToast();
        try {
          renderDashboard(mergeDashboardData([]));
        } catch (e) {
          if (typeof console !== 'undefined' && console.error) console.error(e);
        }
      })
      .finally(function () {
        forceHideLoading();
      });
  }

  function init() {
    var cached = restoreDashboardFromCache();
    if (cached !== null) {
      renderDashboard(cached);
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
