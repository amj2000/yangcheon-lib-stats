/**
 * 양천구립도서관 프로그램 통합 대시보드
 * 11개 도서관 운영 현황 (모집 / 참여 / 노쇼)
 */

(function () {
  'use strict';

  const TYPE_PUBLIC = 'public';
  const TYPE_SMALL = 'small';

  const LIBRARIES = [
    { id: 'yangcheon', name: '양천중앙도서관', type: TYPE_PUBLIC, recruit: 320, attend: 298, noshow: 22 },
    { id: 'galsan', name: '갈산도서관', type: TYPE_PUBLIC, recruit: 180, attend: 172, noshow: 8 },
    { id: 'gaeul', name: '개울건강도서관', type: TYPE_PUBLIC, recruit: 150, attend: 141, noshow: 9 },
    { id: 'mokma', name: '목마교육도서관', type: TYPE_PUBLIC, recruit: 220, attend: 208, noshow: 12 },
    { id: 'migam', name: '미감도서관', type: TYPE_PUBLIC, recruit: 140, attend: 135, noshow: 5 },
    { id: 'bangadari', name: '방아다리문학도서관', type: TYPE_PUBLIC, recruit: 190, attend: 178, noshow: 12 },
    { id: 'sinwol', name: '신월음악도서관', type: TYPE_PUBLIC, recruit: 160, attend: 152, noshow: 8 },
    { id: 'english', name: '영어특성화도서관', type: TYPE_PUBLIC, recruit: 200, attend: 188, noshow: 12 },
    { id: 'haemaji', name: '해맞이역사도서관', type: TYPE_PUBLIC, recruit: 170, attend: 162, noshow: 8 },
    { id: 'saeaerum', name: '새아름작은도서관', type: TYPE_SMALL, recruit: 80, attend: 76, noshow: 4 },
    { id: 'mosaemi', name: '모새미작은도서관', type: TYPE_SMALL, recruit: 70, attend: 67, noshow: 3 }
  ];

  const labels = LIBRARIES.map(function (lib) {
    return lib.name.length > 10 ? lib.name.replace('도서관', '') : lib.name;
  });

  var publicLibs = LIBRARIES.filter(function (l) { return l.type === TYPE_PUBLIC; });
  var smallLibs = LIBRARIES.filter(function (l) { return l.type === TYPE_SMALL; });

  function sumStats(libraries) {
    var recruit = 0, attend = 0, noshow = 0;
    for (var i = 0; i < libraries.length; i++) {
      recruit += libraries[i].recruit;
      attend += libraries[i].attend;
      noshow += libraries[i].noshow;
    }
    return { recruit: recruit, attend: attend, noshow: noshow };
  }

  function formatNum(n) {
    return n.toLocaleString('ko-KR');
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

  function updateSummaryBadges() {
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

  function barColorsByType(option) {
    var colors = [];
    for (var i = 0; i < LIBRARIES.length; i++) {
      colors.push(LIBRARIES[i].type === TYPE_PUBLIC ? option.public : option.small);
    }
    return colors;
  }

  function renderCards() {
    var gridPublic = document.getElementById('cardsGridPublic');
    var gridSmall = document.getElementById('cardsGridSmall');
    if (!gridPublic || !gridSmall) return;

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

  function initChart() {
    var canvas = document.getElementById('libraryChart');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var recruitData = LIBRARIES.map(function (l) { return l.recruit; });
    var attendData = LIBRARIES.map(function (l) { return l.attend; });
    var noshowData = LIBRARIES.map(function (l) { return l.noshow; });

    var publicBg = 'rgba(37, 99, 235, 0.45)';
    var publicBorder = 'rgba(37, 99, 235, 0.85)';
    var smallBg = 'rgba(124, 58, 237, 0.45)';
    var smallBorder = 'rgba(124, 58, 237, 0.85)';

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: '모집 현황',
            data: recruitData,
            backgroundColor: barColorsByType({ public: publicBg, small: smallBg }),
            borderColor: barColorsByType({ public: publicBorder, small: smallBorder }),
            borderWidth: 1
          },
          {
            label: '참여 인원',
            data: attendData,
            backgroundColor: barColorsByType({ public: 'rgba(37, 99, 235, 0.35)', small: 'rgba(124, 58, 237, 0.35)' }),
            borderColor: barColorsByType({ public: publicBorder, small: smallBorder }),
            borderWidth: 1
          },
          {
            label: '노쇼',
            data: noshowData,
            backgroundColor: barColorsByType({ public: 'rgba(37, 99, 235, 0.22)', small: 'rgba(124, 58, 237, 0.22)' }),
            borderColor: barColorsByType({ public: 'rgba(37, 99, 235, 0.6)', small: 'rgba(124, 58, 237, 0.6)' }),
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1200
        },
        hover: {
          animationDuration: 0
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 10 },
              maxRotation: 45,
              minRotation: 35
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.06)' },
            ticks: {
              font: { size: 11 },
              stepSize: 50
            }
          }
        }
      }
    });
  }

  function init() {
    renderCards();
    updateSummaryBadges();
    if (typeof Chart !== 'undefined') {
      initChart();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
