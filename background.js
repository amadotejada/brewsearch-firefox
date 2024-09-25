const FORMULAE_LIST_API = 'https://formulae.brew.sh/api/formula.json';
const CASKS_LIST_API = 'https://formulae.brew.sh/api/cask.json';
const FORMULAE_BASE_URL = 'https://formulae.brew.sh/formula/';
const CASKS_BASE_URL = 'https://formulae.brew.sh/cask/';

let formulae = [];
let casks = [];

// Fetch and store the list of formulae and casks
Promise.all([
  fetch(FORMULAE_LIST_API).then(r => r.json()),
  fetch(CASKS_LIST_API).then(r => r.json())
]).then(([formulaeList, casksList]) => {
  formulae = formulaeList;
  casks = casksList;
});

function filterPackages(packages, query) {
  const lowerQuery = query.toLowerCase();
  return packages.filter(pkg => {
    const searchTerm = (pkg.token || pkg.name || '').toLowerCase();
    return searchTerm.includes(lowerQuery);
  });
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

// Replace chrome.omnibox with browser.omnibox
browser.omnibox.onInputChanged.addListener((text, suggest) => {
  if (text.length < 2) return;

  const matchedFormulae = filterPackages(formulae, text);
  const matchedCasks = filterPackages(casks, text);

  let suggestions = [];

  if (matchedFormulae.length === 0 && matchedCasks.length === 0) {
    browser.omnibox.setDefaultSuggestion({
      description: `No packages found for "${text}".`
    });
  } else {
    browser.omnibox.setDefaultSuggestion({
      description: `Search Homebrew for "${text}"`
    });
    suggestions = [
      ...matchedFormulae.slice(0, 5).map(f => ({
        content: FORMULAE_BASE_URL + (f.token || f.name),
        description: `Formula: ${escapeXml(f.token || f.name)} - ${escapeXml(f.desc || 'No description available')}`
      })),
      ...matchedCasks.slice(0, 5).map(c => ({
        content: CASKS_BASE_URL + (c.token || c.name),
        description: `Cask: ${escapeXml(c.token || c.name)} - ${escapeXml(c.desc || 'No description available')}`
      }))
    ];
  }

  suggest(suggestions);
});

browser.omnibox.onInputEntered.addListener((text, disposition) => {
  const url = text.startsWith('http') ? text : `https://formulae.brew.sh/`;
  switch (disposition) {
    case "currentTab":
      browser.tabs.update({url});
      break;
    case "newForegroundTab":
      browser.tabs.create({url});
      break;
    case "newBackgroundTab":
      browser.tabs.create({url, active: false});
      break;
  }
});
