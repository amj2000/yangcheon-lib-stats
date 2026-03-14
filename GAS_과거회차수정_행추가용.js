/**
 * GAS 배포용: 과거 회차 수정 시 "새 행 추가"만 하도록 하는 handleUpdateHistory
 * 
 * 사용 방법:
 * 1. Google Apps Script 편집기에서 기존 handleUpdateHistory 함수 전체를 찾습니다.
 * 2. 기존 함수가 getRange(rowIndex+1, 6).setValue(...) 또는 existingReason + changeReason 을 사용하면
 *    예전 방식(기존 행 수정 + K열에 변경사유만 추가)입니다.
 * 3. 아래 함수 전체로 교체한 뒤 저장·배포(새 버전 배포)합니다.
 * 
 * 결과: 수정할 때마다 입력기록 시트에 새 행이 추가되고,
 *       각 행에 타임스탬프·수정된 값(접수/참여/노쇼)·변경사유·입력자가 기록됩니다.
 */

// --- 과거 회차 수정 (action === 'updateHistory') ---
// [수정이력=행추가] 기존 행은 수정하지 않음. 매번 새 행만 appendRow.
function handleUpdateHistory(e) {
  var body = parsePostBody(e) || {};
  var libraryName = (body.libraryName || '').toString().trim();
  var programName = (body.programName || '').toString().trim();
  var currentSession = body.currentSession != null ? Number(body.currentSession) : 0;
  var changeReason = (body.changeReason || '').toString().trim();
  var submittedBy = (body.submittedBy != null) ? String(body.submittedBy).trim() : '';
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
  var existingRow = data[rowIndex];
  var totalSessions = existingRow[3] != null && existingRow[3] !== '' ? existingRow[3] : '';
  var sessionDate = (body.sessionDate != null) ? String(body.sessionDate).trim() : '';
  var recruit = body.recruitmentCount != null ? Number(body.recruitmentCount) : 0;
  var attend = body.participationCount != null ? Number(body.participationCount) : 0;
  var noshow = body.noShowCount != null ? Number(body.noShowCount) : 0;
  if (isNaN(recruit)) recruit = 0;
  if (isNaN(attend)) attend = 0;
  if (isNaN(noshow)) noshow = 0;
  var rate = (recruit > 0) ? Math.round((attend / recruit) * 100) : 0;
  var timestamp = new Date();
  sheet.appendRow([
    timestamp,
    libraryName,
    programName,
    totalSessions,
    currentSession,
    sessionDate,
    recruit,
    attend,
    noshow,
    rate,
    changeReason,
    submittedBy
  ]);
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
