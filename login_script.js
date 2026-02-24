/**
 * 로그인/회원가입 — GAS 백엔드 연동
 */
(function () {
  'use strict';

  var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzqqXTPIpN52xf_gS_TyBCWxEjlFo_2SWIFZx2OmvsRYjXiSwfG35YZvW1l9Ncsk6Kkkg/exec';

  var LIBRARY_LIST = [
    '양천중앙도서관',
    '갈산도서관',
    '개울건강도서관',
    '목마교육도서관',
    '미감도서관',
    '방아다리문학도서관',
    '신월음악도서관',
    '영어특성화도서관',
    '해맞이역사도서관',
    '새아름작은도서관',
    '모새미작은도서관'
  ];

  function escapeAttr(s) {
    if (s == null) return '';
    return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fillLibrarySelect(selectId) {
    var el = document.getElementById(selectId);
    if (!el) return;
    var html = '<option value="">도서관 선택</option>';
    LIBRARY_LIST.forEach(function (lib) {
      html += '<option value="' + escapeAttr(lib) + '">' + escapeAttr(lib) + '</option>';
    });
    el.innerHTML = html;
  }

  function switchTab(tabName) {
    var tabs = document.querySelectorAll('.tabs .tab');
    var panels = document.querySelectorAll('.panel');
    tabs.forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
      t.setAttribute('aria-selected', t.getAttribute('data-tab') === tabName ? 'true' : 'false');
    });
    panels.forEach(function (p) {
      var isLogin = p.id === 'panelLogin';
      var active = (tabName === 'login' && isLogin) || (tabName === 'register' && !isLogin);
      p.classList.toggle('active', active);
      p.hidden = !active;
    });
    document.getElementById('loginError').textContent = '';
    document.getElementById('registerError').textContent = '';
  }

  function showError(panel, message) {
    var el = panel === 'login' ? document.getElementById('loginError') : document.getElementById('registerError');
    if (el) el.textContent = message || '';
  }

  function setSubmitDisabled(panel, disabled) {
    var btn = panel === 'login' ? document.getElementById('btnLoginSubmit') : document.getElementById('btnRegisterSubmit');
    if (btn) btn.disabled = disabled;
  }

  function doRegister() {
    var library = (document.getElementById('registerLibrary') && document.getElementById('registerLibrary').value) || '';
    var name = (document.getElementById('registerName') && document.getElementById('registerName').value.trim()) || '';
    var password = (document.getElementById('registerPassword') && document.getElementById('registerPassword').value) || '';
    showError('register', '');
    if (!library || !name || !password) {
      showError('register', '소속 도서관, 이름, 비밀번호를 모두 입력해 주세요.');
      return;
    }
    setSubmitDisabled('register', true);
    var url = SCRIPT_URL + '?action=register';
    var requestData = { library: library, name: name, password: password };
    var body = JSON.stringify(requestData);
    fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body
    })
      .then(function (res) { return res.text(); })
      .then(function (text) {
        var data;
        try { data = JSON.parse(text); } catch (e) { data = { result: 'error', message: '잠시 후 다시 시도해 주세요.' }; }
        setSubmitDisabled('register', false);
        if (data.result === 'success') {
          showError('register', '');
          alert(data.message || '회원가입이 완료되었습니다. 관리자 승인 후 로그인해 주세요.');
          switchTab('login');
          if (document.getElementById('registerPassword')) document.getElementById('registerPassword').value = '';
          return;
        }
        var errMsg = data.message || '가입이 완료되지 않았습니다. 입력 내용을 확인해 주세요.';
        showError('register', errMsg);
        alert(errMsg);
      })
      .catch(function (err) {
        setSubmitDisabled('register', false);
        showError('register', '연결할 수 없습니다. 다시 시도해 주세요.');
      });
  }

  function doLogin() {
    var library = (document.getElementById('loginLibrary') && document.getElementById('loginLibrary').value) || '';
    var name = (document.getElementById('loginName') && document.getElementById('loginName').value.trim()) || '';
    var password = (document.getElementById('loginPassword') && document.getElementById('loginPassword').value) || '';
    showError('login', '');
    if (!library || !name || !password) {
      showError('login', '소속 도서관, 이름, 비밀번호를 모두 입력해 주세요.');
      return;
    }
    setSubmitDisabled('login', true);
    var url = SCRIPT_URL + '?action=login';
    var requestData = { library: library, name: name, password: password };
    var body = JSON.stringify(requestData);
    fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body
    })
      .then(function (res) { return res.text(); })
      .then(function (text) {
        var data;
        try { data = JSON.parse(text); } catch (e) { data = { result: 'error', message: '잠시 후 다시 시도해 주세요.' }; }
        setSubmitDisabled('login', false);
        if (data.result === 'success' && data.user) {
          try {
            localStorage.setItem('currentUser', JSON.stringify(data.user));
          } catch (e) {}
          showError('login', '');
          setTimeout(function () {
            window.location.href = 'input.html';
          }, 100);
          return;
        }
        var errMsg = data.message || '로그인할 수 없습니다. 입력 내용을 확인해 주세요.';
        showError('login', errMsg);
        alert(errMsg);
      })
      .catch(function (err) {
        setSubmitDisabled('login', false);
        showError('login', '연결할 수 없습니다. 다시 시도해 주세요.');
      });
  }

  function init() {
    fillLibrarySelect('loginLibrary');
    fillLibrarySelect('registerLibrary');

    document.querySelectorAll('.tabs .tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        switchTab(tab.getAttribute('data-tab'));
      });
    });

    var formLogin = document.getElementById('formLogin');
    if (formLogin) {
      formLogin.addEventListener('submit', function (e) {
        e.preventDefault();
        doLogin();
      });
    }

    var formRegister = document.getElementById('formRegister');
    if (formRegister) {
      formRegister.addEventListener('submit', function (e) {
        e.preventDefault();
        doRegister();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
