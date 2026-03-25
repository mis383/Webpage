// ============================================================
//  PROJECTS DASHBOARD — Google Apps Script Backend
//  Deploy as: Web App → Execute as Me → Anyone (or org)
// ============================================================

const SHEET_NAME  = "Projects";
const USERS_SHEET = "Users";   // Sheet with login credentials
const HEADER_ROW  = 2;
const DATA_START  = 3;

// Users sheet layout (row 1 = header):
//   Col A: User ID | Col B: Password | Col C: Name | Col D: Role | Col E: Active

/* ── Entry point ─────────────────────────────────────────── */
function doGet(e) {
  return HtmlService
    .createHtmlOutputFromFile("index")
    .setTitle("Projects Dashboard")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ── LOGIN VERIFICATION ──────────────────────────────────── */
function verifyLogin(userId, password) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(USERS_SHEET);

    if (!sheet) {
      if (userId === "admin" && password === "admin123") {
        return { success: true, name: "Admin", role: "Admin" };
      }
      return { success: false, error: "Users sheet not found. Contact administrator." };
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { success: false, error: "No users configured." };

    const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();

    for (const row of data) {
      const [id, pass, name, role, active] = row;
      const isActive = String(active).toUpperCase() === "TRUE" || active === true;
      if (
        String(id).trim().toLowerCase() === String(userId).trim().toLowerCase() &&
        String(pass).trim()             === String(password).trim() &&
        isActive
      ) {
        logLoginEvent(userId, name, true);
        return { success: true, name: String(name), role: String(role) };
      }
    }

    logLoginEvent(userId, "", false);
    return { success: false, error: "Invalid User ID or password." };
  } catch (err) {
    return { success: false, error: "Login error: " + err.message };
  }
}

function logLoginEvent(userId, name, success) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName("Login Log");
    if (!logSheet) {
      logSheet = ss.insertSheet("Login Log");
      logSheet.appendRow(["Timestamp","User ID","Name","Status","Email"]);
      logSheet.getRange(1,1,1,5).setFontWeight("bold");
    }
    logSheet.appendRow([
      new Date(), userId, name||"—",
      success ? "SUCCESS" : "FAILED",
      Session.getActiveUser().getEmail()||"—"
    ]);
  } catch(e) {}
}

/* ── PROJECTS DATA ───────────────────────────────────────── */
function getProjectsData() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return { success: false, error: `Sheet "${SHEET_NAME}" not found.` };

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < HEADER_ROW) return { success: true, headers: [], rows: [] };

    const headers = sheet.getRange(HEADER_ROW, 1, 1, lastCol)
                         .getValues()[0].map(h => String(h).trim());
    let rows = [];
    if (lastRow >= DATA_START) {
      rows = sheet.getRange(DATA_START, 1, lastRow - DATA_START + 1, lastCol)
                  .getValues().map(r => r.map(cell => {
                    if (cell instanceof Date)
                      return Utilities.formatDate(cell, Session.getScriptTimeZone(), "dd-MMM-yyyy");
                    return cell === null || cell === undefined ? "" : String(cell);
                  }));
    }
    return { success: true, headers, rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getData() { return getProjectsData(); }

/* ── ONE-TIME SETUP HELPER ───────────────────────────────── */
function setupUsersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(USERS_SHEET);
  if (!sheet) sheet = ss.insertSheet(USERS_SHEET);

  sheet.getRange(1,1,1,5).setValues([["User ID","Password","Name","Role","Active"]]);
  sheet.getRange(1,1,1,5).setFontWeight("bold").setBackground("#E84E00").setFontColor("#fff");

  const users = [
    ["admin",   "admin@123",   "Administrator",    "Admin",               true],
    ["tushar",  "tushar@2025", "Tushar",            "Supervisor",          true],
    ["mrm",     "mrm@2025",    "MRM Supervisor",    "Moulding Supervisor", true],
    ["qa_user", "qa@2025",     "QA Inspector",      "QA",                  true],
    ["viewer1", "view@2025",   "View Only User",    "Viewer",              true],
  ];
  sheet.getRange(2,1,users.length,5).setValues(users);
  sheet.autoResizeColumns(1,5);
  SpreadsheetApp.getUi().alert("Users sheet created! Update passwords before going live.");
}
