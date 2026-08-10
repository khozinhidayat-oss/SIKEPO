/**
 * SMART POINT SISWA - Google Apps Script Entry Point & REST API Router
 * Serves REST API endpoints via doGet / doPost for Decoupled Vercel Frontend
 */

function doGet(e) {
  e = e || { parameter: {} };
  // If an action or api parameter is passed, treat as REST API request
  if (e.parameter && (e.parameter.action || e.parameter.api === 'true' || e.parameter.v === 'rest')) {
    return handleApiRequest(e);
  }

  // Handle standard REST GET request
  if (e.parameter && Object.keys(e.parameter).length > 0) {
    return handleApiRequest(e);
  }

  // Fallback to REST API Status JSON
  return responseJSON({
    success: true,
    message: 'SMART POINT SISWA REST API is Online',
    architecture: 'Vercel Frontend + Google Apps Script REST API Backend',
    timestamp: new Date().toISOString()
  });
}

function doPost(e) {
  e = e || { parameter: {} };
  return handleApiRequest(e);
}

function include(filename) {
  try {
    var template = HtmlService.createTemplateFromFile(filename);
    try {
      template.userSession = Auth.getCurrentUserSession();
    } catch(sErr) {
      template.userSession = { name: 'Pengguna', role: 'Admin', isLoggedIn: true };
    }
    return template.evaluate().getContent();
  } catch(e) {
    console.error('Error loading template file: ' + filename, e);
    try {
      return HtmlService.createHtmlOutputFromFile(filename).getContent();
    } catch(fErr) {
      return '<!-- Error loading file: ' + filename + ' -->';
    }
  }
}

/**
 * Global RPC Handlers for legacy compatibility
 */
function loginUser(email, password) {
  return Auth.login(email, password);
}

function logoutUser() {
  return Auth.logout();
}

function getUserSession() {
  return Auth.getCurrentUserSession();
}

function getDashboardDataRPC() {
  return getDashboardMetrics();
}

function runSetupDatabaseRPC() {
  return setupDatabase();
}


