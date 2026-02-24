/**
 * Google Apps Script (GAS) Web App — doPost(e) / doGet(e)
 * - doGet: getDashboardData, getPrograms, getHistory (대시보드·통계입력 페이지)
 * - doPost: register, login, submit_data
 * 시트: 사용자관리, 입력기록(또는 통계)
 */

function doGet(e) {
  var result = [];
  var action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action).trim() : '';
  try {
    if (action === 'getDashboardData') {
      result = handleGetDashboardData();
    } else if (action === 'getPrograms') {
      result = handleGetPrograms();
    } else if (action === 'getHistory') {
      var lib = (e.parameter.libraryName || '').toString().trim();
      var prog = (e.parameter.programName || '').toString().trim();
      result = handleGetHistory(lib, prog);
    } else {
      result = { error: 'Invalid or missing action. Use getDashboardData, getPrograms, or getHistory.' };
    }
  } catch (err) {
    result = { error: err.message || String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// 입력기록 시트 열: A=타임스탬프, B=도서관명, C=프로그램명, D=총운영회수, E=현재회차, F=운영일자, G=모집인원, H=참여인원, I=노쇼, J=참여율, K=모집인원 변경사유
function handleGetDashboardData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('입력기록') || ss.getSheetByName('통계');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var startRow = 1;
  if (data[0] && String(data[0][1] || '').trim() === '도서관명') startRow = 1;
  else startRow = 0;
  var out = [];
  for (var i = startRow; i < data.length; i++) {
    var row = data[i];
    var libraryName = (row[1] != null) ? String(row[1]).trim() : '';
    var programName = (row[2] != null) ? String(row[2]).trim() : '';
    if (!libraryName || !programName) continue;
    var recruitmentCount = row[6] != null ? Number(row[6]) : 0;
    var participationCount = row[7] != null ? Number(row[7]) : 0;
    var noShowCount = row[8] != null ? Number(row[8]) : 0;
    if (isNaN(recruitmentCount)) recruitmentCount = 0;
    if (isNaN(participationCount)) participationCount = 0;
    if (isNaN(noShowCount)) noShowCount = 0;
    out.push({
      libraryName: libraryName,
      programName: programName,
      recruitmentCount: recruitmentCount,
      participationCount: participationCount,
      noShowCount: noShowCount
    });
  }
  return out;
}

function handleGetPrograms() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('프로그램목록') || ss.getSheetByName('프로그램');
  if (!sheet) return [];
  return readProgramsFromSheet(sheet);
}

/** 시트에서 도서관·프로그램 목록 읽기.
 *  - A=도서관명, B=프로그램명, C=시작일(날짜) 인 경우: lib=A, prog=B (프로그램목록 시트)
 *  - B=도서관, C=프로그램 인 경우: lib=B, prog=C (입력기록 등) */
function readProgramsFromSheet(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var firstRow = data[0] || [];
  var isHeader = firstRow.some ? firstRow.some(function (cell) { return String(cell || '').indexOf('도서관') !== -1; }) : (String(firstRow[0] || '').indexOf('도서관') !== -1);
  var startRow = isHeader ? 1 : 0;
  var seen = {};
  var out = [];
  for (var i = startRow; i < data.length; i++) {
    var row = data[i];
    var lib = '';
    var prog = '';
    var cell2 = row[2] != null ? String(row[2]).trim() : '';
    var looksLikeDate = /^\d{4}[-.]\d{1,2}[-.]\d{1,2}/.test(cell2);
    if (cell2 !== '' && !looksLikeDate) {
      lib = String(row[1] != null ? row[1] : '').trim();
      prog = cell2;
    } else {
      lib = String(row[0] != null ? row[0] : '').trim();
      prog = String(row[1] != null ? row[1] : '').trim();
    }
    if (!lib || !prog) continue;
    if (lib === '도서관' || prog === '프로그램' || lib === '도서관명' || prog === '프로그램명') continue;
    var key = lib + '|' + prog;
    if (seen[key]) continue;
    seen[key] = true;
    out.push({ libraryName: lib, programName: prog, library: lib, program: prog });
  }
  return out;
}

function handleGetHistory(libraryName, programName) {
  if (!libraryName) return [];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('입력기록') || ss.getSheetByName('통계');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var startRow = (data[0] && String(data[0][1] || '').trim() === '도서관명') ? 1 : 0;
  var out = [];
  for (var i = startRow; i < data.length; i++) {
    var row = data[i];
    var lib = (row[1] != null) ? String(row[1]).trim() : '';
    var prog = (row[2] != null) ? String(row[2]).trim() : '';
    if (lib !== libraryName || (programName && prog !== programName)) continue;
    var currentSession = row[4] != null ? Number(row[4]) : 0;
    var sessionDate = (row[5] != null) ? String(row[5]) : '';
    var recruit = row[6] != null ? Number(row[6]) : 0;
    var attend = row[7] != null ? Number(row[7]) : 0;
    var noshow = row[8] != null ? Number(row[8]) : 0;
    var reason = (row[10] != null) ? String(row[10]).trim() : '';
    out.push({ session: currentSession, date: sessionDate, recruit: recruit, attend: attend, noshow: noshow, reason: reason || undefined });
  }
  out.sort(function (a, b) { return (a.session || 0) - (b.session || 0); });
  return out;
}

function doPost(e) {
  var result = { result: 'error', message: 'Unknown action' };
  var action = (e.parameter && e.parameter.action) ? String(e.parameter.action).trim() : '';

  // URL에 action이 없으면 body에서 확인
  if (!action && e.postData && e.postData.contents) {
    try {
      var body = JSON.parse(e.postData.contents);
      if (body.action === 'updateHistory') action = 'updateHistory';
      else if (body.libraryName != null && body.currentSession != null) action = 'submit_data';
    } catch (err) {
      // ignore
    }
  }

  try {
    switch (action) {
      case 'register':
        result = handleRegister(e);
        break;
      case 'login':
        result = handleLogin(e);
        break;
      case 'submit_data':
        result = handleSubmitData(e);
        break;
      case 'updateHistory':
        result = handleUpdateHistory(e);
        break;
      default:
        result = { result: 'error', message: 'Invalid or missing action. Use register, login, submit_data, or updateHistory.' };
    }
  } catch (err) {
    result = { result: 'error', message: err.message || String(err) };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- 회원가입 (action === 'register') ---
function handleRegister(e) {
  var body = parsePostBody(e);
  var library = (body.library || body.소속도서관 || '').toString().trim();
  var name = (body.name || body.이름 || '').toString().trim();
  var password = (body.password || body.비밀번호 || '').toString();

  if (!library || !name || !password) {
    return { result: 'error', message: '소속도서관, 이름, 비밀번호를 모두 입력해 주세요.' };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('사용자관리');
  if (!sheet) {
    return { result: 'error', message: '사용자관리 시트를 찾을 수 없습니다.' };
  }

  function normStr(s) {
    if (s == null || s === undefined) return '';
    var t = String(s).trim().replace(/\s+/g, '').replace(/\u200B|\uFEFF/g, '');
    return t;
  }
  var libraryNorm = normStr(library);
  var nameNorm = normStr(name);
  if (!libraryNorm || !nameNorm) {
    return { result: 'error', message: '소속도서관과 이름을 입력해 주세요.' };
  }
  var data = sheet.getDataRange().getValues();
  var lastRow = data.length;
  var colLibrary = 0;
  var colName = 1;
  var colStatus = 3;
  var startRow = 1;
  if (lastRow > 0) {
    var first = (data[0] || []).map(function (c) { return String(c || '').trim(); });
    if (first[0] === '소속도서관' || first[colLibrary] === '소속도서관') {
      startRow = 1;
    } else {
      startRow = 0;
    }
  }
  for (var i = startRow; i < lastRow; i++) {
    var row = data[i];
    var rowLibrary = row[colLibrary] != null ? String(row[colLibrary]) : '';
    var rowName = row[colName] != null ? String(row[colName]) : '';
    if (normStr(rowLibrary) === libraryNorm && normStr(rowName) === nameNorm) {
      var status = (row[colStatus] != null) ? String(row[colStatus]).trim() : '';
      if (status === '승인') {
        return { result: 'error', message: '이미 가입되어 있습니다. 로그인해 주세요.' };
      }
      return { result: 'error', message: '승인 대기 중입니다. 관리자 승인 후 로그인해 주세요.' };
    }
  }

  sheet.appendRow([library.trim(), name.trim(), password, '대기', '일반']);
  return { result: 'success', message: '회원가입이 완료되었습니다. 관리자 승인 후 이용 가능합니다.' };
}

// --- 로그인 (action === 'login') ---
function handleLogin(e) {
  var body = parsePostBody(e);
  var library = (body.library || body.소속도서관 || '').toString().trim();
  var name = (body.name || body.이름 || '').toString().trim();
  var password = (body.password || body.비밀번호 || '').toString();

  if (!library || !name) {
    return { result: 'error', message: '소속도서관과 이름을 입력해 주세요.' };
  }

  function normStr(s) {
    return String(s || '').trim().replace(/\s+/g, '');
  }
  var libraryNorm = normStr(library);
  var nameNorm = normStr(name);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('사용자관리');
  if (!sheet) {
    return { result: 'error', message: '사용자관리 시트를 찾을 수 없습니다.' };
  }

  var data = sheet.getDataRange().getValues();
  var header = (data[0] || []).map(function (c) { return String(c || '').trim(); });
  var colLibrary = header.indexOf('소속도서관') >= 0 ? header.indexOf('소속도서관') : 0;
  var colName = header.indexOf('이름') >= 0 ? header.indexOf('이름') : 1;
  var colPassword = header.indexOf('비밀번호') >= 0 ? header.indexOf('비밀번호') : 2;
  var colStatus = header.indexOf('승인상태') >= 0 ? header.indexOf('승인상태') : 3;
  var colRole = header.indexOf('역할') >= 0 ? header.indexOf('역할') : 4;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowLibrary = (row[colLibrary] != null) ? String(row[colLibrary]).trim() : '';
    var rowName = (row[colName] != null) ? String(row[colName]).trim() : '';
    if (normStr(rowLibrary) !== libraryNorm || normStr(rowName) !== nameNorm) continue;

    var rowPassword = (row[colPassword] != null) ? String(row[colPassword]) : '';
    if (rowPassword !== password) {
      return { result: 'error', message: '비밀번호가 일치하지 않습니다.' };
    }

    var status = (row[colStatus] != null) ? String(row[colStatus]).trim() : '';
    if (status !== '승인') {
      return { result: 'error', message: '관리자의 승인을 기다리고 있습니다.' };
    }

    var role = (row[colRole] != null) ? String(row[colRole]).trim() : '일반';
    return {
      result: 'success',
      success: true,
      user: { library: rowLibrary, name: rowName, role: role }
    };
  }

  return { result: 'error', message: '등록되지 않은 사용자입니다.' };
}

// --- 기존 통계 저장 (action === 'submit_data') ---
// 입력기록 시트: A=타임스탬프, B=도서관명, C=프로그램명, D=총운영회수, E=현재회차, F=운영일자, G=모집인원, H=참여인원, I=노쇼, J=참여율, K=모집인원 변경사유, L=입력자
function handleSubmitData(e) {
  if (typeof handleSubmitDataExisting === 'function') {
    return handleSubmitDataExisting(e);
  }
  try {
    var body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('입력기록') || ss.getSheetByName('통계');
    if (!sheet) {
      return { result: 'error', message: '입력기록 또는 통계 시트를 찾을 수 없습니다.' };
    }
    var reason = body.reason || body.recruitChangeReason || '';
    var submittedBy = (body.submittedBy != null) ? String(body.submittedBy).trim() : '';
    var timestamp = new Date();
    sheet.appendRow([
      timestamp,
      body.libraryName || '',
      body.programName || '',
      body.totalSessions != null ? body.totalSessions : '',
      body.currentSession != null ? body.currentSession : '',
      body.sessionDate || '',
      body.recruitmentCount != null ? body.recruitmentCount : '',
      body.participationCount != null ? body.participationCount : '',
      body.noShowCount != null ? body.noShowCount : '',
      body.participationRate != null ? body.participationRate : '',
      reason,
      submittedBy
    ]);
    return { result: 'success' };
  } catch (err) {
    return { result: 'error', message: err.message || String(err) };
  }
}

// --- 과거 회차 수정 (action === 'updateHistory') ---
// 입력기록 시트에서 해당 행 찾아 F~I 수정, K(변경사유)에 형식으로 누적: [항목] 사유(수정자), YYYYMMDD HH:mm:ss
function handleUpdateHistory(e) {
  var body = parsePostBody(e) || {};
  var libraryName = (body.libraryName || '').toString().trim();
  var programName = (body.programName || '').toString().trim();
  var currentSession = body.currentSession != null ? Number(body.currentSession) : 0;
  var changeReason = (body.changeReason || '').toString().trim();
  if (!libraryName || !programName || currentSession < 1) {
    return { result: 'error', message: '도서관명, 프로그램명, 회차가 필요합니다.' };
  }
  if (!changeReason) {
    return { result: 'error', message: '변경사유를 입력해 주세요.' };
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('입력기록') || ss.getSheetByName('통계');
  if (!sheet) {
    return { result: 'error', message: '입력기록 시트를 찾을 수 없습니다.' };
  }
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return { result: 'error', message: '입력기록이 비어 있습니다.' };
  var startRow = (data[0] && String(data[0][1] || '').trim() === '도서관명') ? 1 : 0;
  var rowIndex = -1;
  for (var i = startRow; i < data.length; i++) {
    var row = data[i];
    var lib = (row[1] != null) ? String(row[1]).trim() : '';
    var prog = (row[2] != null) ? String(row[2]).trim() : '';
    var session = row[4] != null ? Number(row[4]) : 0;
    if (lib === libraryName && prog === programName && session === currentSession) {
      rowIndex = i;
      break;
    }
  }
  if (rowIndex < 0) {
    return { result: 'error', message: '해당 회차 기록을 찾을 수 없습니다.' };
  }
  var sessionDate = (body.sessionDate != null) ? String(body.sessionDate).trim() : '';
  var recruit = body.recruitmentCount != null ? Number(body.recruitmentCount) : 0;
  var attend = body.participationCount != null ? Number(body.participationCount) : 0;
  var noshow = body.noShowCount != null ? Number(body.noShowCount) : 0;
  if (isNaN(recruit)) recruit = 0;
  if (isNaN(attend)) attend = 0;
  if (isNaN(noshow)) noshow = 0;
  var rate = (recruit > 0) ? Math.round((attend / recruit) * 100) : 0;
  sheet.getRange(rowIndex + 1, 6).setValue(sessionDate);
  sheet.getRange(rowIndex + 1, 7).setValue(recruit);
  sheet.getRange(rowIndex + 1, 8).setValue(attend);
  sheet.getRange(rowIndex + 1, 9).setValue(noshow);
  sheet.getRange(rowIndex + 1, 10).setValue(rate);
  var existingReason = (data[rowIndex][10] != null) ? String(data[rowIndex][10]).trim() : '';
  var newReason = existingReason ? existingReason + '\n' + changeReason : changeReason;
  sheet.getRange(rowIndex + 1, 11).setValue(newReason);
  return { result: 'success' };
}

function parsePostBody(e) {
  if (e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (err) {
      return {};
    }
  }
  return (e.parameter || {});
}
