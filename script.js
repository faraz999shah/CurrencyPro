let API_KEY, API_BASE;
fetch('config.json')
  .then(response => response.json())
  .then(config => {
    API_KEY = config.API_KEY;
    API_BASE = `https://v6.exchangerate-api.com/v6/${API_KEY}`;
  });

const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const fmtAmt   = (n) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
const parseAmt = (v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);
function pluralizeCurrency(name){
  return /\b(s|es)\b/i.test(name) || /s$/.test(name) ? name : (name.endsWith('Dollar') ? name + 's' : name);
}

const eqAmountEl         = $('#eq-amount');
const eqBaseNameEl       = $('#eq-base-name');
const resultNumEl        = $('#result-number');
const resultTargetNameEl = $('#result-target-name');
const lastUpdatedEl      = $('#last-updated');
const pairLinkEl        = $('#pair-link');
const amountInput       = $('#amount');
const errorEl           = $('#conv-error');

const chipBaseFlag   = $('#chip-base-flag');
const chipBaseCode   = $('#chip-base-code');
const chipBaseName   = $('#chip-base-name');
const chipTargetFlag = $('#chip-target-flag');
const chipTargetCode = $('#chip-target-code');
const chipTargetName = $('#chip-target-name');

const btnSwap     = $('#chip-swap');
const btnRefresh  = $('#btn-refresh');
const btnBack     = $('#btn-back');

let base = 'EUR', baseName = 'Euro', baseFlag = '🇪🇺';
let target = 'USD', targetName = 'US Dollar', targetFlag = '🇺🇸';
let lastRate = null;

function applyPair(){
  chipBaseFlag.textContent   = baseFlag;
  chipBaseCode.textContent   = base;
  chipBaseName.textContent   = `– ${baseName}`;
  chipTargetFlag.textContent = targetFlag;
  chipTargetCode.textContent = target;
  chipTargetName.textContent = `– ${targetName}`;

  eqBaseNameEl.textContent       = baseName;
  resultTargetNameEl.textContent = pluralizeCurrency(targetName);

  pairLinkEl.textContent = `${baseName} to ${targetName} conversion`;
  const u = new URL(window.location.href);
  u.searchParams.set('base', base);
  u.searchParams.set('target', target);
  window.history.replaceState({}, '', u);
  pairLinkEl.href = u.toString();
}

function showError(m){ if (errorEl) errorEl.textContent = m; console.error(m); }
function clearError(){ if (errorEl) errorEl.textContent = ''; }

function fetchAndRender(){
  clearError();
  const amt = parseAmt(amountInput.value);
  eqAmountEl.textContent = fmtAmt(amt);

  const prev = btnRefresh?.textContent;
  if (btnRefresh){ btnRefresh.disabled = true; btnRefresh.textContent = 'Refreshing…'; }

  fetch(`${API_BASE}/pair/${base}/${target}`)
    .then(r => {
      if (!r.ok) throw new Error(`Network error: ${r.status}`);
      return r.json();
    })
    .then(d => {
      if (d.result !== 'success') throw new Error(d['error-type'] || 'API error');
      lastRate = d.conversion_rate;
      resultNumEl.textContent = fmtAmt(amt * lastRate);
      lastUpdatedEl.textContent = new Date(d.time_last_update_utc).toLocaleString();
    })
    .catch(err => showError(err.message))
    .finally(() => {
      if (btnRefresh){ btnRefresh.disabled = false; btnRefresh.textContent = prev || 'Refresh'; }
    });
}

(function initFromURL(){
  const p = new URLSearchParams(location.search);
  const b = (p.get('base')||'').toUpperCase();
  const t = (p.get('target')||'').toUpperCase();
  const ISO3 = /^[A-Z]{3}$/;

  const names = {
    USD: 'US Dollar', EUR: 'Euro', CAD: 'Canadian Dollar', PKR: 'Pakistani Rupee',
    INR: 'Indian Rupee', GBP: 'Pound Sterling', BRL: 'Brazilian Real', IDR: 'Indonesian Rupiah'
  };
  const flags = {
    USD:'🇺🇸', EUR:'🇪🇺', CAD:'🇨🇦', PKR:'🇵🇰', INR:'🇮🇳', GBP:'🇬🇧', BRL:'🇧🇷', IDR:'🇮🇩'
  };

  if (ISO3.test(b) && ISO3.test(t)) {
    base = b; target = t;
    baseName = names[b] || b; targetName = names[t] || t;
    baseFlag = flags[b] || '🏳️'; targetFlag = flags[t] || '🏳️';
  }

  applyPair();
  fetchAndRender();
})();

function updatePickerActiveStates(){
  $$('#picker-base .currency-card').forEach(b => {
    const code = (b.querySelector('strong')?.textContent || '').trim().toUpperCase();
    if (code === base) b.classList.add('is-active'); else b.classList.remove('is-active');
  });
  $$('#picker-target .currency-card').forEach(b => {
    const code = (b.querySelector('strong')?.textContent || '').trim().toUpperCase();
    if (code === target) b.classList.add('is-active'); else b.classList.remove('is-active');
  });
}

$$('.currency-card').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const code = (btn.querySelector('strong')?.textContent || '').trim().toUpperCase();
    const name = (btn.querySelector('.currency-name')?.textContent || '').trim();
    const flag = (btn.querySelector('.flag')?.textContent || '').trim();

    if (btn.closest('#picker-base')){
      base = code || base;
      baseName = name || baseName;
      baseFlag = flag || baseFlag;
    } else if (btn.closest('#picker-target')){
      target = code || target;
      targetName = name || targetName;
      targetFlag = flag || targetFlag;
    }

    updatePickerActiveStates();
    applyPair();
  });
});

const trackBtn = document.querySelector('.btn-round');
trackBtn?.addEventListener('click', (e) => {
  updatePickerActiveStates();

  if (!base){
    const first = $('#picker-base .currency-card strong')?.textContent?.trim()?.toUpperCase();
    if (first) base = first;
  }
  if (!target){
    const first = $('#picker-target .currency-card strong')?.textContent?.trim()?.toUpperCase();
    if (first) target = first;
  }

  const activeBaseBtn = $('#picker-base .currency-card.is-active');
  if (activeBaseBtn){
    baseName = activeBaseBtn.querySelector('.currency-name')?.textContent?.trim() || baseName;
    baseFlag = activeBaseBtn.querySelector('.flag')?.textContent?.trim() || baseFlag;
  }
  const activeTargetBtn = $('#picker-target .currency-card.is-active');
  if (activeTargetBtn){
    targetName = activeTargetBtn.querySelector('.currency-name')?.textContent?.trim() || targetName;
    targetFlag = activeTargetBtn.querySelector('.flag')?.textContent?.trim() || targetFlag;
  }

  applyPair();

  const hero = document.querySelector('.hero');
  const conv = document.querySelector('.converter');
  if (hero) hero.classList.add('is-hidden');
  if (conv) conv.classList.remove('is-hidden');

  fetchAndRender();
});

btnBack?.removeEventListener?.('click', () => {});
btnBack?.addEventListener('click', () => {
  const hero = document.querySelector('.hero');
  const conv = document.querySelector('.converter');
  if (conv) conv.classList.add('is-hidden');
  if (hero) hero.classList.remove('is-hidden');

  const u = new URL(window.location.href);
  u.search = '';
  window.history.replaceState({}, '', u.toString());

  window.scrollTo({ top: 0, behavior: 'smooth' });
});

btnRefresh?.addEventListener('click', fetchAndRender);

btnSwap?.addEventListener('click', () => {
  [base, target] = [target, base];
  const names = { USD:'US Dollar', EUR:'Euro', CAD:'Canadian Dollar', PKR:'Pakistani Rupee', INR:'Indian Rupee', GBP:'Pound Sterling', BRL:'Brazilian Real', IDR:'Indonesian Rupiah' };
  const flags = { USD:'🇺🇸', EUR:'🇪🇺', CAD:'🇨🇦', PKR:'🇵🇰', INR:'🇮🇳', GBP:'🇬🇧', BRL:'🇧🇷', IDR:'🇮🇩' };
  [baseName, targetName] = [names[base] || base, names[target] || target];
  [baseFlag, targetFlag] = [flags[base] || '🏳️', flags[target] || '🏳️'];
  applyPair();
  fetchAndRender();
});

amountInput?.addEventListener('input', () => {
  const amt = parseAmt(amountInput.value);
  eqAmountEl.textContent = fmtAmt(amt);
  if (lastRate != null) resultNumEl.textContent = fmtAmt(amt * lastRate);
});