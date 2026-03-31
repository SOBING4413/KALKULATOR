/**
 * SobingGanteng — Premium Calculator
 * Pure JavaScript calculator with scientific mode, history, themes,
 * keyboard support, copy/paste, animated particles, and wave background.
 */

// ===== Particle System =====
class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: -1000, y: -1000 };
        this.resize();
        this.createParticles();
        this.bindEvents();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticles() {
        const count = Math.min(60, Math.floor((this.canvas.width * this.canvas.height) / 15000));
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                radius: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.5 + 0.1,
                pulseSpeed: Math.random() * 0.02 + 0.005,
                pulsePhase: Math.random() * Math.PI * 2,
            });
        }
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            this.resize();
            this.createParticles();
        });

        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
    }

    getParticleColor() {
        const style = getComputedStyle(document.documentElement);
        return style.getPropertyValue('--particle-color').trim() || 'rgba(108, 99, 255, 0.4)';
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const color = this.getParticleColor();
        const time = Date.now() * 0.001;

        this.particles.forEach((p, i) => {
            // Update position
            p.x += p.vx;
            p.y += p.vy;

            // Wrap around
            if (p.x < 0) p.x = this.canvas.width;
            if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height;
            if (p.y > this.canvas.height) p.y = 0;

            // Mouse interaction - gentle push
            const dx = p.x - this.mouse.x;
            const dy = p.y - this.mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150) {
                const force = (150 - dist) / 150 * 0.02;
                p.vx += dx * force * 0.01;
                p.vy += dy * force * 0.01;
            }

            // Dampen velocity
            p.vx *= 0.99;
            p.vy *= 0.99;

            // Pulse opacity
            const pulse = Math.sin(time * p.pulseSpeed * 60 + p.pulsePhase) * 0.3 + 0.7;
            const currentOpacity = p.opacity * pulse;

            // Draw particle
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = color.replace(/[\d.]+\)$/, `${currentOpacity})`);
            this.ctx.fill();

            // Draw connections
            for (let j = i + 1; j < this.particles.length; j++) {
                const p2 = this.particles[j];
                const cdx = p.x - p2.x;
                const cdy = p.y - p2.y;
                const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
                if (cdist < 120) {
                    const lineOpacity = (1 - cdist / 120) * 0.15;
                    this.ctx.beginPath();
                    this.ctx.moveTo(p.x, p.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.strokeStyle = color.replace(/[\d.]+\)$/, `${lineOpacity})`);
                    this.ctx.lineWidth = 0.5;
                    this.ctx.stroke();
                }
            }
        });

        requestAnimationFrame(() => this.animate());
    }
}

// ===== Calculator =====
class Calculator {
    constructor() {
        // State
        this.currentInput = '0';
        this.expression = '';
        this.fullExpression = '';
        this.lastResult = null;
        this.operator = null;
        this.previousValue = null;
        this.waitingForOperand = false;
        this.history = [];
        this.scientificOpen = false;
        this.historyOpen = false;
        this.parenthesesCount = 0;

        // DOM Elements
        this.resultEl = document.getElementById('result');
        this.expressionEl = document.getElementById('expression');
        this.scientificPanel = document.getElementById('scientificPanel');
        this.historyPanel = document.getElementById('historyPanel');
        this.historyList = document.getElementById('historyList');
        this.keyboardHint = document.getElementById('keyboardHint');
        this.copyBtn = document.getElementById('copyBtn');
        this.copyToast = document.getElementById('copyToast');

        this.init();
    }

    init() {
        this.bindButtons();
        this.bindKeyboard();
        this.bindThemeSwitcher();
        this.bindHistoryToggle();
        this.bindScientificToggle();
        this.bindCopyPaste();
        this.loadHistory();
        this.loadTheme();
    }

    // ===== Button Binding =====
    bindButtons() {
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.createRipple(e, btn);
                const action = btn.dataset.action;
                this.handleAction(action);
            });

            btn.addEventListener('mousedown', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                btn.style.setProperty('--ripple-x', `${x}%`);
                btn.style.setProperty('--ripple-y', `${y}%`);
            });
        });
    }

    createRipple(e, btn) {
        const ripple = document.createElement('span');
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 2.5;
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            border-radius: 50%;
            background: var(--ripple);
            transform: scale(0);
            animation: rippleAnim 0.6s ease-out forwards;
            pointer-events: none;
            z-index: 1;
        `;

        if (!document.getElementById('rippleStyle')) {
            const style = document.createElement('style');
            style.id = 'rippleStyle';
            style.textContent = `
                @keyframes rippleAnim {
                    to { transform: scale(1); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }

    // ===== Keyboard Binding =====
    bindKeyboard() {
        let hintTimeout;
        document.addEventListener('keydown', (e) => {
            const key = e.key;

            // Allow Ctrl+C and Ctrl+V
            if ((e.ctrlKey || e.metaKey) && (key === 'c' || key === 'v')) {
                if (key === 'c') {
                    e.preventDefault();
                    this.copyResult();
                }
                if (key === 'v') {
                    e.preventDefault();
                    this.pasteValue();
                }
                return;
            }

            e.preventDefault();

            // Show keyboard hint
            this.keyboardHint.classList.add('show');
            clearTimeout(hintTimeout);
            hintTimeout = setTimeout(() => {
                this.keyboardHint.classList.remove('show');
            }, 1500);

            // Map keys to actions
            const keyMap = {
                '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
                '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
                '.': 'decimal', ',': 'decimal',
                '+': 'add', '-': 'subtract', '*': 'multiply', '/': 'divide',
                '%': 'percent',
                'Enter': 'equals', '=': 'equals',
                'Backspace': 'backspace', 'Delete': 'clear',
                'Escape': 'clear',
                '(': 'paren-open', ')': 'paren-close',
            };

            if (keyMap[key]) {
                this.handleAction(keyMap[key]);
                // Highlight corresponding button
                const btn = document.querySelector(`[data-action="${keyMap[key]}"]`);
                if (btn) {
                    btn.classList.add('calculating');
                    setTimeout(() => btn.classList.remove('calculating'), 200);
                }
            }
        });
    }

    // ===== Copy / Paste =====
    bindCopyPaste() {
        this.copyBtn.addEventListener('click', () => {
            this.copyResult();
        });
    }

    copyResult() {
        const value = this.currentInput === 'Error' ? '' : this.currentInput;
        if (!value) return;

        navigator.clipboard.writeText(value).then(() => {
            // Show toast
            this.copyToast.classList.add('show');
            this.copyBtn.classList.add('copied');
            setTimeout(() => {
                this.copyToast.classList.remove('show');
                this.copyBtn.classList.remove('copied');
            }, 1500);
        }).catch(() => {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = value;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);

            this.copyToast.classList.add('show');
            this.copyBtn.classList.add('copied');
            setTimeout(() => {
                this.copyToast.classList.remove('show');
                this.copyBtn.classList.remove('copied');
            }, 1500);
        });
    }

    pasteValue() {
        navigator.clipboard.readText().then(text => {
            const cleaned = text.trim().replace(/[^0-9.\-]/g, '');
            if (cleaned && !isNaN(parseFloat(cleaned))) {
                this.currentInput = cleaned;
                this.waitingForOperand = false;
                this.updateDisplay();

                // Animate paste
                this.resultEl.classList.add('bounce');
                setTimeout(() => this.resultEl.classList.remove('bounce'), 400);
            }
        }).catch(() => {
            // Clipboard not available
        });
    }

    // ===== Theme Switcher =====
    bindThemeSwitcher() {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                document.documentElement.setAttribute('data-theme', theme);
                document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                localStorage.setItem('SobingGanteng-theme', theme);
            });
        });
    }

    loadTheme() {
        const saved = localStorage.getItem('SobingGanteng-theme');
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
            document.querySelectorAll('.theme-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.theme === saved);
            });
        }
    }

    // ===== Scientific Toggle =====
    bindScientificToggle() {
        const toggle = document.getElementById('sciToggle');
        toggle.addEventListener('click', () => {
            this.scientificOpen = !this.scientificOpen;
            this.scientificPanel.classList.toggle('open', this.scientificOpen);
            toggle.classList.toggle('active', this.scientificOpen);
        });
    }

    // ===== History Toggle =====
    bindHistoryToggle() {
        const toggle = document.getElementById('historyToggle');
        toggle.addEventListener('click', () => {
            this.historyOpen = !this.historyOpen;
            this.historyPanel.classList.toggle('open', this.historyOpen);
            toggle.classList.toggle('active', this.historyOpen);
        });

        document.getElementById('clearHistory').addEventListener('click', () => {
            this.history = [];
            this.saveHistory();
            this.renderHistory();
        });
    }

    // ===== Action Handler =====
    handleAction(action) {
        // Numbers
        if (/^[0-9]$/.test(action)) {
            this.inputNumber(action);
            return;
        }

        switch (action) {
            case 'decimal': this.inputDecimal(); break;
            case 'add': this.inputOperator('+'); break;
            case 'subtract': this.inputOperator('-'); break;
            case 'multiply': this.inputOperator('×'); break;
            case 'divide': this.inputOperator('÷'); break;
            case 'equals': this.calculate(); break;
            case 'clear': this.clear(); break;
            case 'backspace': this.backspace(); break;
            case 'percent': this.percent(); break;
            // Scientific
            case 'sin': this.scientificFunc('sin'); break;
            case 'cos': this.scientificFunc('cos'); break;
            case 'tan': this.scientificFunc('tan'); break;
            case 'log': this.scientificFunc('log'); break;
            case 'ln': this.scientificFunc('ln'); break;
            case 'sqrt': this.scientificFunc('sqrt'); break;
            case 'pow': this.scientificPow(2); break;
            case 'cube': this.scientificPow(3); break;
            case 'factorial': this.factorial(); break;
            case 'pi': this.inputConstant(Math.PI, 'π'); break;
            case 'e': this.inputConstant(Math.E, 'e'); break;
            case 'abs': this.scientificFunc('abs'); break;
            case 'inv': this.inverse(); break;
            case 'exp': this.inputOperator('E'); break;
            case 'mod': this.inputOperator('mod'); break;
            case 'paren-open': this.inputParen('('); break;
            case 'paren-close': this.inputParen(')'); break;
            case 'pow-y': this.inputOperator('^'); break;
        }
    }

    // ===== Input Methods =====
    inputNumber(num) {
        if (this.waitingForOperand) {
            this.currentInput = num;
            this.waitingForOperand = false;
        } else {
            this.currentInput = this.currentInput === '0' ? num : this.currentInput + num;
        }
        this.updateDisplay();
    }

    inputDecimal() {
        if (this.waitingForOperand) {
            this.currentInput = '0.';
            this.waitingForOperand = false;
        } else if (!this.currentInput.includes('.')) {
            this.currentInput += '.';
        }
        this.updateDisplay();
    }

    inputOperator(op) {
        const current = parseFloat(this.currentInput);

        if (this.previousValue !== null && !this.waitingForOperand) {
            const result = this.compute(this.previousValue, current, this.operator);
            this.previousValue = result;
            this.currentInput = this.formatNumber(result);
        } else {
            this.previousValue = current;
        }

        const displayOp = op;
        this.expression = `${this.formatDisplay(this.previousValue)} ${displayOp}`;
        this.operator = op;
        this.waitingForOperand = true;
        this.updateDisplay();
        this.highlightOperator(op);
    }

    inputConstant(value, symbol) {
        this.currentInput = String(value);
        if (this.waitingForOperand) {
            this.waitingForOperand = false;
        }
        this.updateDisplay();
    }

    inputParen(paren) {
        if (paren === '(') {
            if (!this.waitingForOperand && this.currentInput !== '0') {
                this.inputOperator('×');
            }
            this.expression += ' (';
            this.parenthesesCount++;
            this.waitingForOperand = true;
        } else if (paren === ')' && this.parenthesesCount > 0) {
            this.expression += ` ${this.currentInput} )`;
            this.parenthesesCount--;
        }
        this.updateDisplay();
    }

    // ===== Computation =====
    compute(a, b, op) {
        switch (op) {
            case '+': return a + b;
            case '-': return a - b;
            case '×': return a * b;
            case '÷': return b !== 0 ? a / b : NaN;
            case '^': return Math.pow(a, b);
            case 'mod': return a % b;
            case 'E': return a * Math.pow(10, b);
            default: return b;
        }
    }

    calculate() {
        if (this.operator === null && this.lastResult === null) return;

        const current = parseFloat(this.currentInput);
        let result;
        let fullExpr;

        if (this.previousValue !== null) {
            result = this.compute(this.previousValue, current, this.operator);
            fullExpr = `${this.expression} ${this.formatDisplay(current)}`;
        } else {
            return;
        }

        // Animate result
        this.resultEl.classList.add('bounce');
        setTimeout(() => this.resultEl.classList.remove('bounce'), 400);

        // Add to history
        if (!isNaN(result) && isFinite(result)) {
            this.addHistory(fullExpr, result);
        }

        this.expression = '';
        this.currentInput = this.formatNumber(result);
        this.lastResult = result;
        this.previousValue = null;
        this.operator = null;
        this.waitingForOperand = true;
        this.clearOperatorHighlight();
        this.updateDisplay();
    }

    // ===== Scientific Functions =====
    scientificFunc(func) {
        const current = parseFloat(this.currentInput);
        let result;
        let expr;

        switch (func) {
            case 'sin':
                result = Math.sin(current * Math.PI / 180);
                expr = `sin(${this.formatDisplay(current)}°)`;
                break;
            case 'cos':
                result = Math.cos(current * Math.PI / 180);
                expr = `cos(${this.formatDisplay(current)}°)`;
                break;
            case 'tan':
                result = Math.tan(current * Math.PI / 180);
                expr = `tan(${this.formatDisplay(current)}°)`;
                break;
            case 'log':
                result = Math.log10(current);
                expr = `log(${this.formatDisplay(current)})`;
                break;
            case 'ln':
                result = Math.log(current);
                expr = `ln(${this.formatDisplay(current)})`;
                break;
            case 'sqrt':
                result = Math.sqrt(current);
                expr = `√(${this.formatDisplay(current)})`;
                break;
            case 'abs':
                result = Math.abs(current);
                expr = `|${this.formatDisplay(current)}|`;
                break;
            default:
                return;
        }

        this.addHistory(expr, result);
        this.expression = expr;
        this.currentInput = this.formatNumber(result);
        this.waitingForOperand = true;

        // Animate
        this.resultEl.classList.add('bounce');
        setTimeout(() => this.resultEl.classList.remove('bounce'), 400);

        this.updateDisplay();
    }

    scientificPow(power) {
        const current = parseFloat(this.currentInput);
        const result = Math.pow(current, power);
        const expr = `${this.formatDisplay(current)}${power === 2 ? '²' : '³'}`;

        this.addHistory(expr, result);
        this.expression = expr;
        this.currentInput = this.formatNumber(result);
        this.waitingForOperand = true;

        this.resultEl.classList.add('bounce');
        setTimeout(() => this.resultEl.classList.remove('bounce'), 400);

        this.updateDisplay();
    }

    factorial() {
        const current = parseInt(this.currentInput);
        if (current < 0 || current > 170) {
            this.currentInput = 'Error';
            this.updateDisplay();
            return;
        }
        let result = 1;
        for (let i = 2; i <= current; i++) {
            result *= i;
        }
        const expr = `${current}!`;
        this.addHistory(expr, result);
        this.expression = expr;
        this.currentInput = this.formatNumber(result);
        this.waitingForOperand = true;

        this.resultEl.classList.add('bounce');
        setTimeout(() => this.resultEl.classList.remove('bounce'), 400);

        this.updateDisplay();
    }

    inverse() {
        const current = parseFloat(this.currentInput);
        if (current === 0) {
            this.currentInput = 'Error';
            this.updateDisplay();
            return;
        }
        const result = 1 / current;
        const expr = `1/${this.formatDisplay(current)}`;
        this.addHistory(expr, result);
        this.expression = expr;
        this.currentInput = this.formatNumber(result);
        this.waitingForOperand = true;

        this.resultEl.classList.add('bounce');
        setTimeout(() => this.resultEl.classList.remove('bounce'), 400);

        this.updateDisplay();
    }

    percent() {
        const current = parseFloat(this.currentInput);
        if (this.previousValue !== null) {
            const result = (this.previousValue * current) / 100;
            this.currentInput = this.formatNumber(result);
        } else {
            this.currentInput = this.formatNumber(current / 100);
        }
        this.updateDisplay();
    }

    // ===== Clear / Backspace =====
    clear() {
        this.currentInput = '0';
        this.expression = '';
        this.previousValue = null;
        this.operator = null;
        this.waitingForOperand = false;
        this.lastResult = null;
        this.parenthesesCount = 0;
        this.clearOperatorHighlight();
        this.updateDisplay();
    }

    backspace() {
        if (this.waitingForOperand) return;
        if (this.currentInput.length > 1) {
            this.currentInput = this.currentInput.slice(0, -1);
        } else {
            this.currentInput = '0';
        }
        this.updateDisplay();
    }

    // ===== Display =====
    updateDisplay() {
        const displayValue = this.currentInput === 'Error' ? 'Error' : this.formatDisplayValue(this.currentInput);
        this.resultEl.textContent = displayValue;
        this.expressionEl.textContent = this.expression;

        // Auto-shrink font
        const len = displayValue.length;
        this.resultEl.classList.remove('shrink', 'shrink-more');
        if (len > 12) {
            this.resultEl.classList.add('shrink-more');
        } else if (len > 9) {
            this.resultEl.classList.add('shrink');
        }
    }

    formatNumber(num) {
        if (isNaN(num) || !isFinite(num)) return 'Error';
        const str = parseFloat(num.toPrecision(12)).toString();
        return str;
    }

    formatDisplay(num) {
        if (typeof num === 'string') return num;
        return this.formatNumber(num);
    }

    formatDisplayValue(value) {
        if (value === 'Error') return value;
        const parts = value.split('.');
        const intPart = parts[0];
        const decPart = parts[1];

        if (!intPart.includes('e') && !intPart.includes('E')) {
            const isNeg = intPart.startsWith('-');
            const absInt = isNeg ? intPart.slice(1) : intPart;
            const formatted = absInt.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            const result = isNeg ? '-' + formatted : formatted;
            return decPart !== undefined ? `${result}.${decPart}` : result;
        }
        return value;
    }

    highlightOperator(op) {
        this.clearOperatorHighlight();
        const opMap = { '+': 'add', '-': 'subtract', '×': 'multiply', '÷': 'divide' };
        const action = opMap[op];
        if (action) {
            const btn = document.querySelector(`.btn-operator[data-action="${action}"]`);
            if (btn) btn.classList.add('active-op');
        }
    }

    clearOperatorHighlight() {
        document.querySelectorAll('.btn-operator').forEach(b => b.classList.remove('active-op'));
    }

    // ===== History =====
    addHistory(expression, result) {
        const item = {
            expression,
            result: this.formatNumber(result),
            timestamp: Date.now()
        };
        this.history.unshift(item);
        if (this.history.length > 50) this.history.pop();
        this.saveHistory();
        this.renderHistory();
    }

    renderHistory() {
        if (this.history.length === 0) {
            this.historyList.innerHTML = `
                <div class="history-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <p>Belum ada riwayat</p>
                </div>
            `;
            return;
        }

        this.historyList.innerHTML = this.history.map((item, i) => `
            <div class="history-item" data-index="${i}" style="animation-delay: ${i * 0.05}s">
                <div class="history-expr">${this.escapeHtml(item.expression)}</div>
                <div class="history-result">= ${this.formatDisplayValue(item.result)}</div>
            </div>
        `).join('');

        // Click to reuse result
        this.historyList.querySelectorAll('.history-item').forEach(el => {
            el.addEventListener('click', () => {
                const index = parseInt(el.dataset.index);
                const item = this.history[index];
                this.currentInput = item.result;
                this.waitingForOperand = true;

                this.resultEl.classList.add('bounce');
                setTimeout(() => this.resultEl.classList.remove('bounce'), 400);

                this.updateDisplay();
            });
        });
    }

    saveHistory() {
        try {
            localStorage.setItem('SobingGanteng-history', JSON.stringify(this.history));
        } catch (e) {
            this.history = this.history.slice(0, 25);
            localStorage.setItem('SobingGanteng-history', JSON.stringify(this.history));
        }
    }

    loadHistory() {
        try {
            const saved = localStorage.getItem('SobingGanteng-history');
            if (saved) {
                this.history = JSON.parse(saved);
                this.renderHistory();
            }
        } catch (e) {
            this.history = [];
        }
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    // Init particle system
    const canvas = document.getElementById('particleCanvas');
    if (canvas) {
        new ParticleSystem(canvas);
    }

    // Init calculator
    new Calculator();
});