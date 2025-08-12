const display = document.getElementById('display');
const secondaryDisplay = document.getElementById('secondaryDisplay');
let lastAnswer = '';
let angleMode = "RAD";
let coordMode = "REC";
let calcMode = "ALGEBRAIC";
let formatMode = "STD";
let historyEntries = [];

function appendToActive(ch) {
  const active = document.activeElement;
  if (active && active.tagName === 'INPUT' && !active.readOnly && (active.type === 'text' || active.type === 'number')) {
    active.value += ch;
    active.dispatchEvent(new Event('input'));
  } else {
    appendNumber(ch);
  }
}

function appendNumber(ch) {
  if (calcMode === "RPN") {
    if (display.value && !display.value.endsWith(' ')) display.value += ' ';
    display.value += ch;
  } else {
    display.value += ch;
  }
}
function appendValue(val) {
  if (val === 'Ans') display.value += lastAnswer;
  else display.value += val;
}
function clearDisplay() {
  const active = document.activeElement;
  if (active && active.tagName === 'INPUT' && !active.readOnly) {
    active.value = '';
  } else {
    display.value = '';
  }
}
function clearAll() { display.value = ''; secondaryDisplay.value = ''; lastAnswer = ''; }
function backspace() {
  const active = document.activeElement;
  if (active && active.tagName === 'INPUT' && !active.readOnly) {
    active.value = active.value.slice(0, -1);
    active.dispatchEvent(new Event('input'));
  } else {
    if (calcMode === "RPN") {
      if (!display.value) return;
      if (display.value.endsWith(' ')) display.value = display.value.slice(0, -1);
      let idx = display.value.lastIndexOf(' ');
      if (idx === -1) display.value = '';
      else display.value = display.value.slice(0, idx+1);
    } else {
      display.value = display.value.slice(0, -1);
    }
  }
}
function toggleSign() {
  const active = document.activeElement;
  if (active && active.tagName === 'INPUT' && !active.readOnly) {
    let val = active.value;
    if (val) {
      if (val.startsWith('-')) {
        active.value = val.slice(1);
      } else {
        active.value = '-' + val;
      }
      active.dispatchEvent(new Event('input'));
    }
  } else {
    if (calcMode === "RPN") {
      let toks = display.value.trim().split(/\s+/);
      if (toks.length === 0) return;
      let last = toks.pop();
      if (!isNaN(last)) last = (-parseFloat(last)).toString();
      toks.push(last);
      display.value = toks.join(' ') + ' ';
      return;
    }
    let val = display.value;
    if (!val) return;
    let match = val.match(/(-?\d*\.?\d+)$/);
    if (match) {
      let num = match[1];
      let start = match.index;
      let toggled = (parseFloat(num) * -1).toString();
      display.value = val.substring(0, start) + toggled;
    }
  }
}
function degToRad(deg) { return deg * Math.PI / 180; }
function radToDeg(rad) { return rad * 180 / Math.PI; }
function gradToRad(grad) { return grad * Math.PI / 200; }
function radToGrad(rad) { return rad * 200 / Math.PI; }
function factorial(n) {
  if (n < 0) return NaN;
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}
function evalAlgebraicExpression(expr) {
  expr = expr.replace(/(\([^()]+\)|\d+(\.\d+)?)!/g, (m, p1) => {
    try { return factorial(Math.floor(Number(Function('"use strict";return (' + p1 + ')')()))); }
    catch { return 'NaN'; }
  });
  function evalInner(s) {
    return Function('"use strict";return (' + s + ')')();
  }
  expr = expr.replace(/asin\(([^)]+)\)/g, (m,p1) => {
    let val = evalInner(p1);
    let res = Math.asin(val);
    if (angleMode === 'DEG') res = radToDeg(res);
    if (angleMode === 'GRAD') res = radToGrad(res);
    return `(${res})`;
  });
  expr = expr.replace(/acos\(([^)]+)\)/g, (m,p1) => {
    let val = evalInner(p1);
    let res = Math.acos(val);
    if (angleMode === 'DEG') res = radToDeg(res);
    if (angleMode === 'GRAD') res = radToGrad(res);
    return `(${res})`;
  });
  expr = expr.replace(/atan\(([^)]+\))/g, (m,p1) => {
    let val = evalInner(p1);
    let res = Math.atan(val);
    if (angleMode === 'DEG') res = radToDeg(res);
    if (angleMode === 'GRAD') res = radToGrad(res);
    return `(${res})`;
  });
  expr = expr.replace(/sin\(([^)]+\))/g, (m,p1) => {
    let v = evalInner(p1);
    if (angleMode === 'DEG') v = degToRad(v);
    if (angleMode === 'GRAD') v = gradToRad(v);
    return `Math.sin(${v})`;
  });
  expr = expr.replace(/cos\(([^)]+\))/g, (m,p1) => {
    let v = evalInner(p1);
    if (angleMode === 'DEG') v = degToRad(v);
    if (angleMode === 'GRAD') v = gradToRad(v);
    return `Math.cos(${v})`;
  });
  expr = expr.replace(/tan\(([^)]+\))/g, (m,p1) => {
    let v = evalInner(p1);
    if (angleMode === 'DEG') v = degToRad(v);
    if (angleMode === 'GRAD') v = gradToRad(v);
    return `Math.tan(${v})`;
  });
  expr = expr.replace(/π/g, 'Math.PI');
  expr = expr.replace(/Math\.PIMath\.PI/g, 'Math.PI');
  expr = expr.replace(/EE/g, '*10**');
  return Function('"use strict";return (' + expr + ')')();
}
function evalRPN(expr) {
  let toks = expr.trim().split(/\s+/).filter(t => t.length);
  let stack = [];
  for (let t of toks) {
    if (!isNaN(t)) { stack.push(parseFloat(t)); continue; }
    if (t === 'π' || t === 'pi' || t === 'Math.PI') { stack.push(Math.PI); continue; }
    if (t === 'Ans') { stack.push(Number(lastAnswer)); continue; }
    if (t === 'sin' || t === 'cos' || t === 'tan' || t === 'asin' || t === 'acos' || t === 'atan' || t === 'sqrt' || t === 'ln' || t === 'log' || t === '!') {
      if (stack.length < 1) return NaN;
      let a = stack.pop();
      switch(t) {
        case 'sin': {
          let v = a;
          if (angleMode === 'DEG') v = degToRad(v);
          if (angleMode === 'GRAD') v = gradToRad(v);
          stack.push(Math.sin(v));
          break;
        }
        case 'cos': {
          let v = a;
          if (angleMode === 'DEG') v = degToRad(v);
          if (angleMode === 'GRAD') v = gradToRad(v);
          stack.push(Math.cos(v));
          break;
        }
        case 'tan': {
          let v = a;
          if (angleMode === 'DEG') v = degToRad(v);
          if (angleMode === 'GRAD') v = gradToRad(v);
          stack.push(Math.tan(v));
          break;
        }
        case 'asin': {
          let res = Math.asin(a);
          if (angleMode === 'DEG') res = radToDeg(res);
          if (angleMode === 'GRAD') res = radToGrad(res);
          stack.push(res);
          break;
        }
        case 'acos': {
          let res = Math.acos(a);
          if (angleMode === 'DEG') res = radToDeg(res);
          if (angleMode === 'GRAD') res = radToGrad(res);
          stack.push(res);
          break;
        }
        case 'atan': {
          let res = Math.atan(a);
          if (angleMode === 'DEG') res = radToDeg(res);
          if (angleMode === 'GRAD') res = radToGrad(res);
          stack.push(res);
          break;
        }
        case 'sqrt': stack.push(Math.sqrt(a)); break;
        case 'ln': stack.push(Math.log(a)); break;
        case 'log': stack.push(Math.log10 ? Math.log10(a) : Math.log(a)/Math.LN10); break;
        case '!': stack.push(factorial(Math.floor(a))); break;
      }
      continue;
    }
    if (['+', '-', '*', '/', '**', '^'].includes(t)) {
      if (stack.length < 2) return NaN;
      let b = stack.pop(), a = stack.pop();
      switch(t) {
        case '+': stack.push(a + b); break;
        case '-': stack.push(a - b); break;
        case '*': stack.push(a * b); break;
        case '/': stack.push(a / b); break;
        case '**':
        case '^': stack.push(Math.pow(a, b)); break;
      }
      continue;
    }
    try {
      let fnRes = Function('"use strict";return (' + t + ')')();
      if (!isNaN(fnRes)) { stack.push(fnRes); continue; }
    } catch(e) {}
    return NaN;
  }
  return stack.length ? stack[stack.length - 1] : NaN;
}
function calculateResult() {
  try {
    let raw = display.value.trim();
    if (!raw) return;
    let decimals = parseInt(document.getElementById('decimals').value) || 2;
    let result;
    if (calcMode === 'RPN') {
      result = evalRPN(raw);
    } else {
      result = evalAlgebraicExpression(raw);
    }
    if (isNaN(result) || !isFinite(result)) {
      display.value = 'Math Error';
      return;
    }
    if (formatMode === 'FIX') {
      result = Number(result).toFixed(decimals);
    } else if (formatMode === 'SCI') {
      result = Number(result).toExponential(decimals);
    } else if (formatMode === 'ENG') {
      let num = Number(result);
      if (num === 0) result = (0).toFixed(decimals);
      else {
        let exp = Math.floor(Math.log10(Math.abs(num))/3)*3;
        let mant = num / Math.pow(10, exp);
        result = mant.toFixed(decimals) + 'e' + exp;
      }
    } else {
      result = Number(Number(result).toFixed(decimals));
    }
    secondaryDisplay.value = raw + ' =';
    display.value = result;
    lastAnswer = result;
    historyEntries.push(`${secondaryDisplay.value} ${result}`);
    if (historyEntries.length > 20) historyEntries.shift();
    updateHistory();
  } catch (e) {
    display.value = "Error";
    console.error(e);
  }
}
function updateHistory() {
  document.getElementById('history').innerHTML = `<strong>History</strong><br>${historyEntries.join('<br>')}`;
}
function convertCoord() {
  if (!display.value.trim()) {
    if (lastAnswer) {
      display.value = lastAnswer.toString();
    } else {
      display.value = 'No value to convert';
      return;
    }
  }
  let txt = display.value.trim();
  let parts = txt.split(',').map(s => s.trim());
  if (parts.length !== 2) {
    display.value = 'Input x,y or r,θ';
    return;
  }
  let a = Number(parts[0]);
  let b = Number(parts[1]);
  if (isNaN(a) || isNaN(b)) { display.value = 'Invalid numbers'; return; }
  if (coordMode === 'REC') {
    let r = a, theta = b;
    if (angleMode === 'DEG') theta = degToRad(theta);
    else if (angleMode === 'GRAD') theta = gradToRad(theta);
    let x = r * Math.cos(theta);
    let y = r * Math.sin(theta);
    display.value = `${Number(x.toFixed(6))}, ${Number(y.toFixed(6))}`;
  } else {
    let x = a, y = b;
    let r = Math.hypot(x, y);
    let th = Math.atan2(y, x);
    if (angleMode === 'DEG') th = radToDeg(th);
    else if (angleMode === 'GRAD') th = radToGrad(th);
    display.value = `${Number(r.toFixed(6))}, ${Number(th.toFixed(6))}`;
  }
}
function openMenu() {
  document.getElementById('menuModal').style.display = 'block';
  document.getElementById('overlay').style.display = 'block';
  document.querySelector(`input[name="angle"][value="${angleMode}"]`).checked = true;
  document.querySelector(`input[name="coord"][value="${coordMode}"]`).checked = true;
  document.querySelector(`input[name="mode"][value="${calcMode}"]`).checked = true;
  document.querySelector(`input[name="format"][value="${formatMode}"]`).checked = true;
}
function closeMenu() {
  document.getElementById('menuModal').style.display = 'none';
  document.getElementById('overlay').style.display = 'none';
}
function applyMenu() {
  angleMode = document.querySelector('input[name="angle"]:checked').value;
  coordMode = document.querySelector('input[name="coord"]:checked').value;
  calcMode = document.querySelector('input[name="mode"]:checked').value;
  formatMode = document.querySelector('input[name="format"]:checked').value;
  closeMenu();
}
function setTheme(color) {
  document.querySelector('.calculator').style.background = color;
}
function toggleDF() {
  convertCoord();
}
document.addEventListener('keydown', (e) => {
  const active = document.activeElement;
  if (active && active.tagName === 'INPUT' && !active.readOnly && (active.type === 'text' || active.type === 'number')) {
    return; 
  }
  if (e.key >= '0' && e.key <= '9') {
    appendNumber(e.key);
  } else if (e.key === '.') {
    appendNumber('.');
  } else if (e.key === '+') {
    appendValue(' + ');
  } else if (e.key === '-') {
    appendValue(' - ');
  } else if (e.key === '*') {
    appendValue(' * ');
  } else if (e.key === '/') {
    appendValue(' / ');
  } else if (e.key === '^') {
    appendValue('**');
  } else if (e.key === '(') {
    appendValue('(');
  } else if (e.key === ')') {
    appendValue(')');
  } else if (e.key === 'Enter' || e.key === '=') {
    calculateResult();
  } else if (e.key === 'Backspace') {
    backspace();
  } else if (e.key === 'Escape') {
    clearAll();
  } else if (e.key === '!') {
    appendValue('!');
  } else if (e.key.toLowerCase() === 'e' && !e.shiftKey) {
    appendValue('E');
  } else if (e.key.toLowerCase() === 'p' && e.shiftKey) {
    appendValue('Math.PI');
  }
});
function init() {
  document.getElementById('decimals').value = 2;
  updateHistory();
  updateUnitOptions(); 
}
document.addEventListener('DOMContentLoaded', init);


function openExtras() {
  document.getElementById('extrasModal').style.display = 'block';
  document.getElementById('overlay').style.display = 'block';
}
function closeExtras() {
  document.getElementById('extrasModal').style.display = 'none';
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('solverForm').innerHTML = '';
}
function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-buttons button').forEach(btn => btn.classList.remove('active'));
  document.getElementById(tabId + 'Tab').classList.add('active');
  document.querySelector(`.tab-buttons button[onclick="showTab('${tabId}')"]`).classList.add('active');
  if (tabId !== 'solve') {
    document.getElementById('solverForm').innerHTML = '';
  }
}
function clearBase() {
  document.getElementById('decInput').value = '';
  document.getElementById('octInput').value = '';
  document.getElementById('hexInput').value = '';
  document.getElementById('binInput').value = '';
  document.getElementById('fracInput').value = '';
  document.getElementById('fracOutput').value = '';
}
function clearExtras() {
  clearBase();
  document.getElementById('unitValue').value = '';
  document.getElementById('unitResult').value = '';
  closeExtras();
}
function convertBase() {
  let dec = parseFloat(document.getElementById('decInput').value) || 0;
  document.getElementById('octInput').value = dec.toString(8);
  document.getElementById('hexInput').value = dec.toString(16).toUpperCase();
  document.getElementById('binInput').value = dec.toString(2);
}
function convertToFraction() {
  let dec = parseFloat(document.getElementById('fracInput').value) || 0;
  let tolerance = 1.0E-10;
  let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
  let b = dec;
  do {
    let a = Math.floor(b);
    let aux = h1; h1 = a * h1 + h2; h2 = aux;
    aux = k1; k1 = a * k1 + k2; k2 = aux;
    b = 1 / (b - a);
  } while (Math.abs(dec - h1 / k1) > dec * tolerance);
  document.getElementById('fracOutput').value = `${h1}/${k1}`;
}
const unitConversions = {
  
  angstrom: 1e-10, mm: 0.001, cm: 0.01, in: 0.0254, ft: 0.3048,
  yd: 0.9144, m: 1, km: 1000, mi: 1609.34, nmi: 1852,
  AU: 1.496e11, ly: 9.461e15,
   
  C: 1, F: 5/9, K: 1, R: 5/9,  
  
  eV: 1.60218e-19, erg: 1e-7, J: 1, ftlb: 1.35582, cal: 4.184,
  kcal: 4184, Btu: 1055.06, kWh: 3.6e6, therm: 1.05506e8,
  
  lx: 1, lmperm2: 1, fc: 10.7639, lmperft2: 10.7639, lmperin2: 1550.003,
  lmpercm2: 10000, ph: 10000, wpercm2: 683 * 10000, 
  
  ug: 1e-9, mg: 1e-6, gr: 6.47989e-5, ct: 0.0002, g: 0.001,
  oz: 0.0283495, kg: 1, lb: 0.453592, slug: 14.5939,
  ton: 907.185, tonne: 1000, tonUK: 1016.05,

  dyn: 1e-5, gf: 0.00980665, pdl: 0.138255, N: 1,
  lbf: 4.44822, kgf: 9.80665, kp: 9.80665, kN: 1000,
  kip: 4448.22, tonf: 8896.44,
  
  fs: 1e-15, ps: 1e-12, ns: 1e-9, us: 1e-6, ms: 0.001,
  s: 1, min: 60, h: 3600, d: 86400, week: 604800,
  mo: 2.628e6, yr: 3.154e7,

  inps: 0.0254, kmph: 0.277778, ftps: 0.3048, mph: 0.44704,
  kn: 0.514444, mps: 1, mach: 343, kmps: 1000, c: 299792458,

  mm2: 1e-6, cm2: 1e-4, in2: 0.00064516, ft2: 0.092903,
  yd2: 0.836127, m2: 1, ac: 4046.86, ha: 10000,
  mi2: 2.58999e6, km2: 1e6,

  mW: 0.001, W: 1, hp: 745.7, kW: 1000, MW: 1e6,

  ml: 0.000001, tsp: 0.00000492892, tbsp: 0.0000147868,
  floz: 0.0000295735, c: 0.000236588, pt: 0.000473176,
  qt: 0.000946353, l: 0.001, gal: 0.00378541,
  galUK: 0.00454609, ft3: 0.0283168, m3: 1,

  Pa: 1, mmHg: 133.322, torr: 133.322, inH2O: 248.843, kPa: 1000,
  inHg: 3386.39, psi: 6894.76, bar: 100000, atm: 101325
};

function updateUnitOptions() {
  const category = document.getElementById('unitCategory').value;
  const fromSelect = document.getElementById('unitFrom');
  const toSelect = document.getElementById('unitTo');


  fromSelect.innerHTML = '';
  toSelect.innerHTML = '';

  
  const unitMap = {
    length: [
      {value: 'angstrom', text: 'Angstrom (å)'},
      {value: 'mm', text: 'Millimeter (mm)'},
      {value: 'cm', text: 'Centimeter (cm)'},
      {value: 'in', text: 'Inch (in)'},
      {value: 'ft', text: 'Foot (ft)'},
      {value: 'yd', text: 'Yard (yd)'},
      {value: 'm', text: 'Meter (m)'},
      {value: 'km', text: 'Kilometer (km)'},
      {value: 'mi', text: 'Mile (mi)'},
      {value: 'nmi', text: 'Nautical Mile (nmi)'},
      {value: 'AU', text: 'Astronomical Unit (AU)'},
      {value: 'ly', text: 'Light-Year (ly)'}
    ],
    temperature: [
      {value: 'C', text: 'Celsius (°C)'},
      {value: 'F', text: 'Fahrenheit (°F)'},
      {value: 'K', text: 'Kelvin (K)'},
      {value: 'R', text: 'Rankine (°R)'}
    ],
    energy: [
      {value: 'eV', text: 'Electron Volt (eV)'},
      {value: 'erg', text: 'Erg (erg)'},
      {value: 'J', text: 'Joule (J)'},
      {value: 'ftlb', text: 'Foot Pound (ft-lb)'},
      {value: 'cal', text: 'Calorie (cal)'},
      {value: 'kcal', text: 'Kilocalorie (kcal)'},
      {value: 'Btu', text: 'British Thermal Unit (Btu)'},
      {value: 'kWh', text: 'Kilowatt Hour (kWh)'},
      {value: 'therm', text: 'Therm (therm)'}
    ],
    light: [
      {value: 'lx', text: 'Lux (lx)'},
      {value: 'lmperm2', text: 'Lumen Per Square Meter (lm/m²)'},
      {value: 'fc', text: 'Foot Candle (fc)'},
      {value: 'lmperft2', text: 'Lumen Per Square Foot (lm/ft²)'},
      {value: 'lmperin2', text: 'Lumen Per Square Inch (lm/in²)'},
      {value: 'lmpercm2', text: 'Lumen Per Square cm (lm/cm²)'},
      {value: 'ph', text: 'Phot (ph)'},
      {value: 'wpercm2', text: 'Watt Per Square cm (w/cm²)'}
    ],
    mass: [
      {value: 'ug', text: 'Microgram (µg)'},
      {value: 'mg', text: 'Milligram (mg)'},
      {value: 'gr', text: 'Grain (gr)'},
      {value: 'ct', text: 'Carat (ct)'},
      {value: 'g', text: 'Gram (g)'},
      {value: 'oz', text: 'Ounce (oz)'},
      {value: 'kg', text: 'Kilogram (kg)'},
      {value: 'lb', text: 'Pound (lb)'},
      {value: 'slug', text: 'Slug (slug)'},
      {value: 'ton', text: 'Ton (ton)'},
      {value: 'tonne', text: 'Metric Ton (tonne)'},
      {value: 'tonUK', text: 'Long Ton (tonUK)'}
    ],
    force: [
      {value: 'dyn', text: 'Dyne (dyn)'},
      {value: 'gf', text: 'Gram-Force (gf)'},
      {value: 'pdl', text: 'Poundal (pdl)'},
      {value: 'N', text: 'Newton (N)'},
      {value: 'lbf', text: 'Pound Force (lbf)'},
      {value: 'kgf', text: 'Kilogram Force (kgf)'},
      {value: 'kp', text: 'Kilopond (kp)'},
      {value: 'kN', text: 'Kilonewton (kN)'},
      {value: 'kip', text: 'Kip (kip)'},
      {value: 'tonf', text: 'Ton-Force (tonf)'}
    ],
    time: [
      {value: 'fs', text: 'Femtosecond (fs)'},
      {value: 'ps', text: 'Picosecond (ps)'},
      {value: 'ns', text: 'Nanosecond (ns)'},
      {value: 'us', text: 'Microsecond (µs)'},
      {value: 'ms', text: 'Millisecond (ms)'},
      {value: 's', text: 'Second (s)'},
      {value: 'min', text: 'Minute (min)'},
      {value: 'h', text: 'Hour (h)'},
      {value: 'd', text: 'Day (d)'},
      {value: 'week', text: 'Week (week)'},
      {value: 'mo', text: 'Month (mo)'},
      {value: 'yr', text: 'Year (yr)'}
    ],
    speed: [
      {value: 'inps', text: 'Inches Per Second (in/s)'},
      {value: 'kmph', text: 'Kilometers Per Hour (km/h)'},
      {value: 'ftps', text: 'Feet Per Second (ft/s)'},
      {value: 'mph', text: 'Miles Per Hour (mi/h)'},
      {value: 'kn', text: 'Knot (kn)'},
      {value: 'mps', text: 'Meters Per Second (m/s)'},
      {value: 'mach', text: 'Mach (mach)'},
      {value: 'kmps', text: 'Kilometers Per Second (km/s)'},
      {value: 'c', text: 'Speed of Light (c)'}
    ],
    area: [
      {value: 'mm2', text: 'Millimeters² (mm²)'},
      {value: 'cm2', text: 'Centimeters² (cm²)'},
      {value: 'in2', text: 'Inches² (in²)'},
      {value: 'ft2', text: 'Feet² (ft²)'},
      {value: 'yd2', text: 'Yards² (yd²)'},
      {value: 'm2', text: 'Meters² (m²)'},
      {value: 'ac', text: 'Acre (ac)'},
      {value: 'ha', text: 'Hectare (ha)'},
      {value: 'mi2', text: 'Miles² (mi²)'},
      {value: 'km2', text: 'Kilometers² (km²)'}
    ],
    power: [
      {value: 'mW', text: 'Milliwatt (mW)'},
      {value: 'W', text: 'Watt (W)'},
      {value: 'hp', text: 'Horsepower (hp)'},
      {value: 'kW', text: 'Kilowatt (kW)'},
      {value: 'MW', text: 'Megawatt (MW)'}
    ],
    volume: [
      {value: 'ml', text: 'Milliliter (ml)'},
      {value: 'tsp', text: 'Teaspoon (tsp)'},
      {value: 'tbsp', text: 'Tablespoon (tbsp)'},
      {value: 'floz', text: 'Fluid Ounce (fl oz)'},
      {value: 'c', text: 'Cup (c)'},
      {value: 'pt', text: 'Pint (pt)'},
      {value: 'qt', text: 'Quart (qt)'},
      {value: 'l', text: 'Liter (l)'},
      {value: 'gal', text: 'US Gallon (gal)'},
      {value: 'galUK', text: 'British Gallon (galUK)'},
      {value: 'ft3', text: 'Cubic Feet (ft³)'},
      {value: 'm3', text: 'Cubic Meter (m³)'}
    ],
    pressure: [
      {value: 'Pa', text: 'Pascal (Pa)'},
      {value: 'mmHg', text: 'Millimeters of Mercury (mmHg)'},
      {value: 'torr', text: 'Torr (torr)'},
      {value: 'inH2O', text: 'Inches of Water (inH2O)'},
      {value: 'kPa', text: 'Kilopascal (kPa)'},
      {value: 'inHg', text: 'Inches of Mercury (inHg)'},
      {value: 'psi', text: 'Pound per Square Inch (psi)'},
      {value: 'bar', text: 'Bar (bar)'},
      {value: 'atm', text: 'Atmosphere (atm)'}
    ]
  };

  
  const units = unitMap[category] || unitMap['length'];
  units.forEach(unit => {
    let optFrom = document.createElement('option');
    optFrom.value = unit.value;
    optFrom.text = unit.text;
    fromSelect.appendChild(optFrom);
    let optTo = document.createElement('option');
    optTo.value = unit.value;
    optTo.text = unit.text;
    toSelect.appendChild(optTo);
  });

  
  fromSelect.value = units[0].value;
  toSelect.value = units[0].value;
  convertUnit();
}

function convertUnit() {
  let fromValue = parseFloat(document.getElementById('unitValue').value) || 0;
  let fromUnit = document.getElementById('unitFrom').value;
  let toUnit = document.getElementById('unitTo').value;
  let result = convertUnits(fromValue, fromUnit, toUnit);
  document.getElementById('unitResult').value = result.toFixed(6);
}

function convertUnits(value, fromUnit, toUnit) {

  if (['C', 'F', 'K', 'R'].includes(fromUnit) && ['C', 'F', 'K', 'R'].includes(toUnit)) {
    let baseValue = convertToBaseTemperature(value, fromUnit);
    return convertFromBaseTemperature(baseValue, toUnit);
  }
  
  let baseValue = value * unitConversions[fromUnit];
  
  return baseValue / unitConversions[toUnit];
}

function convertToBaseTemperature(value, unit) {
  switch (unit) {
    case 'C': return value + 273.15; 
    case 'F': return (value + 459.67) * 5 / 9; 
    case 'K': return value; 
    case 'R': return value * 5 / 9; 
  }
}

function convertFromBaseTemperature(value, unit) {
  switch (unit) {
    case 'C': return value - 273.15; 
    case 'F': return value * 9 / 5 - 459.67; 
    case 'K': return value; 
    case 'R': return value * 9 / 5; 
  }
}

function showInfo() {
  alert("Susovan's All In One Calculator");
}


function loadSolver(type, degree) {
  let html = '';
  if (type === 'linear') {
    html = '<h4>Linear System ' + degree + 'x' + degree + '</h4>';
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < degree; j++) {
        html += '<input type="number" class="matrix-input" id="a_' + i + '_' + j + '" placeholder="a' + (i+1) + (j+1) + '">';
      }
      html += ' = <input type="number" class="matrix-input" id="b_' + i + '" placeholder="b' + (i+1) + '"><br>';
    }
    html += '<button onclick="solveLinearSystem(' + degree + ')">Solve</button>';
    html += '<div id="solverResult"></div>';
  } else if (type === 'poly') {
    let degName = ['', 'Linear', 'Quadratic', 'Cubic', 'Quartic', 'Quintic', 'Hexic'][degree];
    html = '<h4>' + degName + ': a' + degree + ' x^' + degree + ' + ... + a0 = 0</h4>';
    for (let i = degree; i >= 0; i--) {
      html += 'a' + i + ': <input type="number" id="poly_a' + i + '" class="matrix-input">';
    }
    html += '<br><button onclick="solvePoly(' + degree + ')">Solve</button>';
    html += '<div id="solverResult"></div>';
  }
  document.getElementById('solverForm').innerHTML = html;
}

function gaussianElimination(A, B) {
  const M = A.length;
  const N = A[0].length;
  const augmentedMatrix = new Array(M);
  for (let i = 0; i < M; i++) {
    augmentedMatrix[i] = [...A[i], B[i]];
  }
  for (let j = 0; j < N; j++) {
    let maxRow = j;
    for (let i = j + 1; i < M; i++) {
      if (Math.abs(augmentedMatrix[i][j]) > Math.abs(augmentedMatrix[maxRow][j])) {
        maxRow = i;
      }
    }
    if (maxRow !== j) {
      [augmentedMatrix[j], augmentedMatrix[maxRow]] = [augmentedMatrix[maxRow], augmentedMatrix[j]];
    }
    if (Math.abs(augmentedMatrix[j][j]) < 1e-10) {
      return null;
    }
    for (let i = 0; i < M; i++) {
      if (i !== j) {
        const factor = augmentedMatrix[i][j] / augmentedMatrix[j][j];
        for (let k = j; k <= N; k++) {
          augmentedMatrix[i][k] -= factor * augmentedMatrix[j][k];
        }
      }
    }
  }
  const solutions = new Array(N);
  for (let j = 0; j < N; j++) {
    solutions[j] = augmentedMatrix[j][N] / augmentedMatrix[j][j];
  }
  return solutions;
}

function solveLinearSystem(n) {
  let A = [];
  let B = [];
  for (let i = 0; i < n; i++) {
    let row = [];
    for (let j = 0; j < n; j++) {
      row.push(parseFloat(document.getElementById('a_' + i + '_' + j).value) || 0);
    }
    A.push(row);
    B.push(parseFloat(document.getElementById('b_' + i).value) || 0);
  }
  let x = gaussianElimination(A, B);
  let resultDiv = document.getElementById('solverResult');
  if (x) {
    let result = '';
    for (let i = 0; i < n; i++) {
      result += 'x' + (i + 1) + ' = ' + x[i].toFixed(6) + '<br>';
    }
    resultDiv.innerHTML = result;
  } else {
    resultDiv.innerHTML = 'Singular matrix or no unique solution.';
  }
}

function solvePoly(degree) {
  let resultDiv = document.getElementById('solverResult');
  let coeffs = [];
  for (let i = degree; i >= 0; i--) {
    coeffs.push(parseFloat(document.getElementById('poly_a' + i).value) || 0);
  }
  if (coeffs[0] === 0) {
    resultDiv.innerHTML = 'Leading coefficient cannot be zero.';
    return;
  }
  let roots;
  if (degree === 1) {
    let a = coeffs[0];
    let b = coeffs[1];
    if (a === 0) {
      resultDiv.innerHTML = 'Not a linear equation.';
      return;
    }
    roots = [{r: -b / a, i: 0}];
  } else if (degree === 2) {
    let a = coeffs[0];
    let b = coeffs[1];
    let c = coeffs[2];
    if (a === 0) {
      resultDiv.innerHTML = 'Not a quadratic equation.';
      return;
    }
    let disc = b * b - 4 * a * c;
    if (disc < 0) {
      let real = -b / (2 * a);
      let imag = Math.sqrt(-disc) / (2 * a);
      roots = [{r: real, i: imag}, {r: real, i: -imag}];
    } else if (disc === 0) {
      let root = -b / (2 * a);
      roots = [{r: root, i: 0}];
    } else {
      let r1 = (-b + Math.sqrt(disc)) / (2 * a);
      let r2 = (-b - Math.sqrt(disc)) / (2 * a);
      roots = [{r: r1, i: 0}, {r: r2, i: 0}];
    }
  } else if (degree === 3) {
    roots = solveCubic(coeffs[0], coeffs[1], coeffs[2], coeffs[3]);
  } else if (degree === 4) {
    roots = solveQuartic(coeffs[0], coeffs[1], coeffs[2], coeffs[3], coeffs[4]);
  } else {
    roots = durandKerner(coeffs);
  }
  let result = 'Roots:<br>';
  roots.sort((a, b) => b.r - a.r); 
  roots.forEach(root => {
    result += complex.toStr(root) + '<br>';
  });
  resultDiv.innerHTML = result;
}


const complex = {
  add: (a, b) => ({r: a.r + b.r, i: a.i + b.i}),
  sub: (a, b) => ({r: a.r - b.r, i: a.i - b.i}),
  mul: (a, b) => ({r: a.r * b.r - a.i * b.i, i: a.r * b.i + a.i * b.r}),
  div: (a, b) => {
    let den = b.r * b.r + b.i * b.i;
    return {r: (a.r * b.r + a.i * b.i) / den, i: (a.i * b.r - a.r * b.i) / den};
  },
  pow: (a, n) => {
    let res = {r: 1, i: 0};
    for (let k = 0; k < n; k++) res = complex.mul(res, a);
    return res;
  },
  abs: (a) => Math.sqrt(a.r * a.r + a.i * a.i),
  toStr: (a, dec = 6) => {
    let re = a.r.toFixed(dec);
    let im = a.i.toFixed(dec);
    if (Math.abs(a.i) < 1e-10) return re;
    if (Math.abs(a.r) < 1e-10) return (a.i > 0 ? '' : '-') + Math.abs(a.i).toFixed(dec) + 'i';
    return re + (a.i > 0 ? ' + ' : ' - ') + Math.abs(a.i).toFixed(dec) + 'i';
  }
};


function polyEval(coeffs, x) {
  let out = {r: coeffs[0], i: 0};
  for (let k = 1; k < coeffs.length; k++) {
    out = complex.add(complex.mul(out, x), {r: coeffs[k], i: 0});
  }
  return out;
}


function durandKerner(coeffs) {
  let degree = coeffs.length - 1;
  if (coeffs[0] === 0) return [];
  let lead = coeffs[0];
  let norm = coeffs.map(c => c / lead);
  let roots = [];
  let start = {r: 0.4, i: 0.9};
  for (let n = 0; n < degree; n++) {
    roots.push(complex.pow(start, n));
  }
  let delta = Infinity;
  let iter = 0;
  const MAX_ITER = 10000;
  const ACC = 1e-8;
  while (delta > ACC && iter++ < MAX_ITER) {
    delta = 0;
    let newRoots = [];
    for (let n = 0; n < degree; n++) {
      let num = polyEval(norm, roots[n]);
      let den = {r: 1, i: 0};
      for (let j = 0; j < degree; j++) {
        if (j !== n) den = complex.mul(den, complex.sub(roots[n], roots[j]));
      }
      let step = complex.div(num, den);
      newRoots.push(complex.sub(roots[n], step));
      delta += complex.abs(step);
    }
    delta /= degree;
    roots = newRoots;
  }
  return roots;
}


function solveCubic(a, b, c, d) {
  function cuberoot(x) {
    let y = Math.pow(Math.abs(x), 1/3);
    return x < 0 ? -y : y;
  }
  let roots = [];
  if (Math.abs(a) < 1e-8) { 
    a = b; b = c; c = d;
    if (Math.abs(a) < 1e-8) { 
      a = b; b = c;
      if (Math.abs(a) < 1e-8) return [];
      roots.push({r: -b/a, i: 0});
      return roots;
    }
    let D = b*b - 4*a*c;
    if (Math.abs(D) < 1e-8) {
      roots.push({r: -b/(2*a), i: 0});
      return roots;
    } else if (D > 0) {
      roots.push({r: (-b+Math.sqrt(D))/(2*a), i: 0});
      roots.push({r: (-b-Math.sqrt(D))/(2*a), i: 0});
      return roots;
    } else {
      let real = -b/(2*a);
      let imag = Math.sqrt(-D)/(2*a);
      roots.push({r: real, i: imag});
      roots.push({r: real, i: -imag});
      return roots;
    }
  }
  let p = (3*a*c - b*b)/(3*a*a);
  let q = (2*b*b*b - 9*a*b*c + 27*a*a*d)/(27*a*a*a);
  if (Math.abs(p) < 1e-8) {
    roots.push({r: cuberoot(-q), i: 0});
  } else if (Math.abs(q) < 1e-8) {
    roots.push({r: 0, i: 0});
    if (p < 0) {
      let sq = Math.sqrt(-p);
      roots.push({r: sq, i: 0});
      roots.push({r: -sq, i: 0});
    }
  } else {
    let D = q*q/4 + p*p*p/27;
    if (Math.abs(D) < 1e-8) {
      roots.push({r: -1.5*q/p, i: 0});
      roots.push({r: 3*q/p, i: 0});
    } else if (D > 0) {
      let u = cuberoot(-q/2 - Math.sqrt(D));
      let v = cuberoot(-q/2 + Math.sqrt(D));
      let sum = u + v;
      let diff = u - v;
      let half = -0.5 * sum;
      let imag = (Math.sqrt(3)/2) * diff;
      roots.push({r: sum, i: 0});
      roots.push({r: half, i: imag});
      roots.push({r: half, i: -imag});
    } else {
      let u = 2 * Math.sqrt(-p/3);
      let t = Math.acos(3*q / (p * u)) / 3;
      let k = 2 * Math.PI / 3;
      roots.push({r: u * Math.cos(t), i: 0});
      roots.push({r: u * Math.cos(t - k), i: 0});
      roots.push({r: u * Math.cos(t - 2 * k), i: 0});
    }
  }
  let shift = -b / (3 * a);
  roots.forEach(root => root.r += shift);
  return roots;
}


function solveQuartic(aq, bq, cq, dq, eq) {
  let f2 = cq - (3 * bq * bq / 8);
  let g2 = dq + (bq * bq * bq / 8) - (bq * cq / 2);
  let h2 = eq - (3 * bq * bq * bq * bq / 256) + (bq * bq * cq / 16) - (bq * dq / 4);
  f2 /= aq;
  g2 /= aq;
  h2 /= aq;
  aq = 1;
  let perfect = 0;
  if (h2 === 0) perfect = 1;
  let perfectbiquadratic = 0;
  if (f2 * f2 - 4 * h2 === 0 && f2 > 0) perfectbiquadratic = 1;
  if (perfectbiquadratic === 1) {
    let root1 = Math.sqrt(f2 / 2);
    return [{r: root1, i: 0}, {r: -root1, i: 0}, {r: root1, i: 0}, {r: -root1, i: 0}];
  }
  let cubicRoots = solveCubic(1, 0, (f2 * f2 - 4 * h2) / 4, -g2 * g2 / 8);
  let m = cubicRoots[0].r;
  if (m <= 0) {
    return durandKerner([aq, bq, cq, dq, eq]);
  }
  let roots = [];
  let sqrtm = Math.sqrt(m);
  let D1 = f2 / 2 + m;
  let D2 = f2 / 2 - m;
  let E1 = g2 / (2 * sqrtm);
  let E2 = -g2 / (2 * sqrtm);
  let disc1 = D1 * D1 - 4 * (h2 - m * E1);
  let disc2 = D2 * D2 - 4 * (h2 - m * E2);
  let shift = -bq / (4 * aq);
  if (disc1 >= 0) {
    let r1 = (-D1 + Math.sqrt(disc1)) / 2;
    let r2 = (-D1 - Math.sqrt(disc1)) / 2;
    roots.push({r: r1 + shift, i: 0});
    roots.push({r: r2 + shift, i: 0});
  } else {
    let real = -D1 / 2 + shift;
    let imag = Math.sqrt(-disc1) / 2;
    roots.push({r: real, i: imag});
    roots.push({r: real, i: -imag});
  }
  if (disc2 >= 0) {
    let r1 = (-D2 + Math.sqrt(disc2)) / 2;
    let r2 = (-D2 - Math.sqrt(disc2)) / 2;
    roots.push({r: r1 + shift, i: 0});
    roots.push({r: r2 + shift, i: 0});
  } else {
    let real = -D2 / 2 + shift;
    let imag = Math.sqrt(-disc2) / 2;
    roots.push({r: real, i: imag});
    roots.push({r: real, i: -imag});
  }
  return roots;

}
