const gamepadFuncs = {
    cursorPos: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    lastButtonState: {},
    isUpper: false,
    activeInput: null,
    currentMode: 'chars',
    lastTime: 0,
    buttonMaps: {
        ps: { "CROSS": 0, "CIRCLE": 1, "SQUARE": 2, "TRIANGLE": 3, "L1": 4, "R1": 5, "L2": 6, "R2": 7, "SHARE": 8, "OPTIONS": 9, "L3": 10, "R3": 11, "UP": 12, "DOWN": 13, "LEFT": 14, "RIGHT": 15, "PS": 16 },
        nintendo: { "A": 1, "B": 0, "X": 3, "Y": 2, "L": 4, "R": 5, "ZL": 6, "ZR": 7, "MINUS": 8, "PLUS": 9, "LS": 10, "RS": 11, "UP": 12, "DOWN": 13, "LEFT": 14, "RIGHT": 15, "HOME": 16 },
        xbox: { "A": 0, "B": 1, "X": 2, "Y": 3, "LB": 4, "RB": 5, "LT": 6, "RT": 7, "VIEW": 8, "MENU": 9, "LS": 10, "RS": 11, "UP": 12, "DOWN": 13, "LEFT": 14, "RIGHT": 15, "XBOX": 16 }
    },

    getControllerLayout() {
        const gp = navigator.getGamepads()[0];
        if (!gp) return { back: "-", space: "-", caps: "-", sym: "-", help: "SELECT" };
        const profile = gamepad.getProfile();
        if (profile === "ps") return { back: "▢", space: "△", caps: "L2", sym: "R2", help: "SHARE" };
        if (profile === "nintendo") return { back: "Y", space: "X", caps: "ZL", sym: "ZR", help: "MINUS" };
        return { back: "X", space: "Y", caps: "LT", sym: "RT", help: "VIEW" };
    },

    init() {
        window.addEventListener("gamepadconnected", () => {
            if (gamepad.settings.connectAlert) gamepad.message("Gamepad Connected!");
            this.lastTime = performance.now();
            this.startLoop();
        });
        this.checkOverlay();
    },

    checkOverlay() {
        let overlay = document.getElementById('gp-only-overlay');
        const gp = navigator.getGamepads()[0];
        if (gamepad.settings.onlyWithGamepad && !gp) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'gp-only-overlay';
                overlay.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);color:white;display:flex;justify-content:center;align-items:center;z-index:999999;font-family:sans-serif;text-align:center;";
                overlay.innerHTML = "<div><h1>🎮 GAMEPAD REQUIRED</h1><p>Please connect a controller to continue.</p></div>";
                document.body.appendChild(overlay);
            }
        } else if (overlay) overlay.remove();
    },

    startLoop() {
        const loop = (currentTime) => {
            const gp = navigator.getGamepads()[0];
            this.checkOverlay();
            const dt = (currentTime - this.lastTime) / 16.67;
            this.lastTime = currentTime;

            if (!gp) return requestAnimationFrame(loop);

            if (gamepad.settings.cursor) {
                const deadzone = gamepad.settings.deadzone || 0.4;
                let rx = gp.axes[2]; 
                let ry = gp.axes[3]; 
                let magnitude = Math.sqrt(rx * rx + ry * ry);
                
                if (magnitude < deadzone) { rx = 0; ry = 0; } 
                else {
                    const normalizedMag = (magnitude - deadzone) / (1 - deadzone);
                    rx = (rx / magnitude) * normalizedMag;
                    ry = (ry / magnitude) * normalizedMag;
                }

                const baseSpeed = 18;
                let nextX = this.cursorPos.x + (rx * baseSpeed * dt);
                let nextY = this.cursorPos.y + (ry * baseSpeed * dt);

                if (gamepad.settings.overflowWithCursor) {
                    if (nextY >= window.innerHeight) window.scrollBy(0, baseSpeed * dt);
                    if (nextY <= 0) window.scrollBy(0, -baseSpeed * dt);
                }

                this.cursorPos.x = Math.max(0, Math.min(window.innerWidth, nextX));
                this.cursorPos.y = Math.max(0, Math.min(window.innerHeight, nextY));
                
                const cur = document.getElementById('gp-cursor');
                if (cur) {
                    cur.style.left = this.cursorPos.x + 'px';
                    cur.style.top = this.cursorPos.y + 'px';
                }
            }

const lx = gp.axes[0], ly = gp.axes[1];
const deadzone = gamepad.settings.deadzone || 0.25;

if (Math.abs(lx) > deadzone || Math.abs(ly) > deadzone) {
    const degrees = Math.atan2(ly, lx) * (180 / Math.PI);
    const normalizedDegrees = degrees < 0 ? degrees + 360 : degrees;
    if (gamepad.joystickEvent) gamepad.joystickEvent(normalizedDegrees);
    this.wasJoystickMoving = true; 
} else {
    if (this.wasJoystickMoving && gamepad.joystickReleaseEvent) {
        gamepad.joystickReleaseEvent();
    }
    this.wasJoystickMoving = false;
}
            gp.buttons.forEach((b, i) => {
                const pressed = b.pressed;
                const last = this.lastButtonState[i];
                
                if (pressed && !last) {
                    const keyName = this.getKeyNameById(i);
                    if (gamepad.pressEvents[keyName]) gamepad.pressEvents[keyName]();
                    
                    const clickBtn = gamepad.settings.invertSelectMode ? 1 : 0;
                    if (i === clickBtn) this.processClick();
                    if (i === 2) this.handleSpecial("BACKSPACE");
                    if (i === 3) this.handleSpecial(" ");
                    if (i === 6) { this.isUpper = !this.isUpper; this.renderKeys(); }
                    if (i === 7) { this.currentMode = (this.currentMode === 'chars' ? 'sym' : 'chars'); this.renderKeys(); }
                    if (i === 8) gamepad.toggleHelp();
                } else if (!pressed && last) {
                    const keyName = this.getKeyNameById(i);
                    if (gamepad.releaseEvents[keyName]) gamepad.releaseEvents[keyName]();
                }
                this.lastButtonState[i] = pressed;
            });

            this.updateHelpVisual(gp);
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    },

    getKeyNameById(id) {
        const layout = gamepad.settings.devLayout || 'xbox';
        const map = this.buttonMaps[layout] || this.buttonMaps.xbox;
        return Object.keys(map).find(key => map[key] === id) || id.toString();
    },

    processClick() {
        const { x, y } = this.cursorPos;
        const kb = document.getElementById('gp-keyboard');
        if (kb && !this.isColliding(x, y, kb)) {
             let inputClicked = false;
             document.querySelectorAll('input, textarea').forEach(i => { if(this.isColliding(x,y,i)) inputClicked = true; });
             if(!inputClicked) kb.remove();
        }
        for (let id in gamepad.clickEvents) {
            const el = document.getElementById(id);
            if (el && this.isColliding(x, y, el)) gamepad.clickEvents[id]();
        }
        if (gamepad.settings.textInput) {
            document.querySelectorAll('input, textarea').forEach(i => {
                if (this.isColliding(x, y, i)) this.openKeyboard(i);
            });
            document.querySelectorAll('.gp-key').forEach(k => {
                if (this.isColliding(x, y, k)) {
                    this.activeInput.value += k.innerText;
                    gamepad.vibrate(25);
                }
            });
        }
    },

    openKeyboard(target) {
        this.activeInput = target;
        const layout = this.getControllerLayout();
        if (document.getElementById('gp-keyboard')) return;
        const kb = document.createElement('div');
        kb.id = 'gp-keyboard';
        kb.style = "position:fixed;bottom:0;left:0;width:100%;background:#111;padding:15px;z-index:10000;border-top:3px solid cyan;display:flex;flex-direction:column;align-items:center;";
        kb.innerHTML = `
            <div style="color:cyan; font-size:12px; margin-bottom:10px; font-family:sans-serif; text-transform:uppercase;">
                ${layout.back}: Backspace | ${layout.space}: Space | ${layout.caps}: Caps | ${layout.sym}: Symbols | ${layout.help}: Help
            </div>
            <div id="gp-keys-container" style="display:grid; grid-template-columns: repeat(10, 1fr); gap:5px; width:95%; max-width:900px;"></div>
        `;
        document.body.appendChild(kb);
        this.renderKeys();
    },

    renderKeys() {
        const container = document.getElementById('gp-keys-container');
        if (!container) return;
        const sets = {
            chars: "1234567890qwertyuiopasdfghjklzxcvbnm".split(""),
            sym: "!@#$%*()-=_+[]{}<>;:/?".split("")
        };
        container.innerHTML = "";
        sets[this.currentMode].forEach(c => {
            const k = document.createElement('div');
            k.className = "gp-key";
            k.innerText = this.isUpper ? c.toUpperCase() : c;
            k.style = "background:#222;color:white;padding:12px;text-align:center;border-radius:4px;font-family:sans-serif;font-weight:bold;border:1px solid #333;user-select:none;";
            container.appendChild(k);
        });
    },

    handleSpecial(v) {
        if (!this.activeInput) return;
        if (v === "BACKSPACE") this.activeInput.value = this.activeInput.value.slice(0,-1);
        else this.activeInput.value += v;
        gamepad.vibrate(30);
    },

    updateHelpVisual(gp) {
        const help = document.getElementById('gp-help-ui');
        if (!help) return;
        gp.buttons.forEach((b, i) => {
            const ind = document.getElementById(`btn-ind-${i}`);
            if (ind) ind.style.background = b.pressed ? "cyan" : "#444";
        });
    },

    isColliding(x, y, el) {
        const r = el.getBoundingClientRect();
        return (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
    }
};

const gamepad = {
    settings: { deadzone: 0.4 }, 
    clickEvents: {}, 
    pressEvents: {}, 
    releaseEvents: {},
    joystickEvent: null,

    config(s) {
        this.settings = { ...this.settings, ...s };
        if (s.cursor) {
            const c = document.createElement('div');
            c.id = 'gp-cursor';
            c.style = "position:fixed;width:18px;height:18px;background:cyan;border:2px solid white;border-radius:50%;pointer-events:none;z-index:999999;transform:translate(-50%,-50%);box-shadow:0 0 10px rgba(0,255,255,0.5);";
            document.body.appendChild(c);
        }
        gamepadFuncs.init();
    },

    getProfile() {
        const gp = navigator.getGamepads()[0];
        if (!gp) return "generic";
        const id = gp.id.toLowerCase();
        if (id.includes("playstation") || id.includes("dualshock") || id.includes("dualsense")) return "ps";
        if (id.includes("nintendo") || id.includes("pro controller") || id.includes("joy-con")) return "nintendo";
        if (id.includes("xbox") || id.includes("xinput")) return "xbox";
        return "generic";
    },

    onKeyPressed(key, cb) { this.pressEvents[key] = cb; },
    
    onKeyReleased(key, cb) { this.releaseEvents[key] = cb; },

    onJoystickMovement(cb) { this.joystickEvent = cb; },

    setJoystickDeadzone(v) { this.settings.deadzone = v; },

    message(t) {
        const m = document.createElement('div');
        m.innerText = t;
        m.style = "position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#222;color:cyan;padding:10px 30px;border:1px solid cyan;z-index:100001;border-radius:30px;font-family:sans-serif;font-weight:bold;";
        document.body.appendChild(m);
        setTimeout(() => m.remove(), 3000);
    },

    toggleHelp() {
        let h = document.getElementById('gp-help-ui');
        if (h) return h.remove();
        const layout = gamepadFuncs.getControllerLayout();
        h = document.createElement('div');
        h.id = 'gp-help-ui';
        h.style = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(10,10,10,0.95);padding:30px;border-radius:15px;color:white;z-index:100002;font-family:sans-serif;text-align:center;border:2px solid cyan;";
        let btns = "";
        for(let i=0; i<17; i++) btns += `<div id="btn-ind-${i}" style="display:inline-block;width:25px;height:25px;margin:3px;background:#444;border-radius:50%;font-size:11px;line-height:25px;">${i}</div>`;
        h.innerHTML = `<h3>Input Diagnostics</h3>${btns}<div style="text-align:left; margin-top:15px; text-transform:uppercase;">A/B: Select | ${layout.back}: Backspace | ${layout.space}: Space | ${layout.caps}: Caps | ${layout.sym}: Symbols</div>`;
        document.body.appendChild(h);
    },

    onclick(id, cb) { this.clickEvents[id] = cb;},
    
vibrate(d, intensity = 0.5) { 
    navigator.getGamepads()[0]?.vibrationActuator?.playEffect("dual-rumble", {
        duration: d, 
        strongMagnitude: intensity, 
        weakMagnitude: intensity 
    }); 
},

onJoystickRelease(cb) { this.joystickReleaseEvent = cb; },
};
