(function() {
  const UI = {
    // 1. Elements Cache
    els: {},
    
    // 2. Global State
    state: {
      sessionId: null,
      pollInterval: null,
      isPaused: true,
      lastTick: -1,
      prevSnapshot: null
    },

    // 3. Initialization
    init() {
      const ids = [
        'sim-form', 'seed', 'difficulty', 'btn-run',
        'status-dot', 'status-text',
        'val-session-id', 'val-tick', 'val-outcome',
        'val-grain', 'val-gold', 'val-pop', 'val-sec', 'val-arm',
        'val-gov-sec', 'val-gov-mor', 'val-gov-cor', 'val-cv', 'val-cv-max',
        'val-cities',
        'session-controls', 'btn-pause-resume', 'btn-step', 'speed-slider', 'speed-label',
        'btn-save', 'btn-load',
        'action-panel', 'annex-lane', 'annex-city', 'btn-do-annex', 'annex-feedback',
        'tiers-container', 'events-panel', 'events-container',
        'logs-container', 'rules-list', 'json-output', 'btn-copy'
      ];
      
      ids.forEach(id => {
        this.els[id] = document.getElementById(id);
      });

      this.bindEvents();
    },

    // 4. Event Listeners
    bindEvents() {
      const form = this.els['sim-form'];
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.api.createSession(
            this.els['seed'].value, 
            this.els['difficulty'].value
          );
        });
      }

      const btnPause = this.els['btn-pause-resume'];
      if (btnPause) {
        btnPause.addEventListener('click', () => {
          this.api.controlSession('pause', !this.state.isPaused);
        });
      }

      const btnStep = this.els['btn-step'];
      if (btnStep) {
        btnStep.addEventListener('click', () => {
          this.api.controlSession('step');
        });
      }

      const slider = this.els['speed-slider'];
      if (slider) {
        slider.addEventListener('change', (e) => {
          this.api.controlSession('speed', parseInt(e.target.value));
        });
      }

      const btnSave = this.els['btn-save'];
      if (btnSave) {
        btnSave.addEventListener('click', async () => {
          const res = await this.api.performAction({ type: 'save' });
          if (res && res.ok) alert('SAVE_SUCCESS');
        });
      }

      const btnLoad = this.els['btn-load'];
      if (btnLoad) {
        btnLoad.addEventListener('click', async () => {
          const res = await this.api.performAction({ type: 'load' });
          if (res && res.ok) alert('LOAD_SUCCESS');
        });
      }

      const btnAnnex = this.els['btn-do-annex'];
      if (btnAnnex) {
        btnAnnex.addEventListener('click', async () => {
          const laneMap = { economy: 'economic', diplomacy: 'diplomatic', war: 'war' };
          const lane = laneMap[this.els['annex-lane'].value];
          const city = this.els['annex-city'].value;
          
          if (!city) {
            alert('AWAITING_TARGET_CITY');
            return;
          }
          
          const res = await this.api.performAction({ type: 'annex', lane, cityName: city });
          const fb = this.els['annex-feedback'];
          if (fb) {
            if (res && res.ok) {
              fb.innerHTML = `<span style="color:var(--accent-green)">CMD_ISSUED</span>`;
            } else {
              fb.innerHTML = `<span style="color:var(--accent-red)">CMD_FAIL: ${res?.message || 'ERR'}</span>`;
            }
            setTimeout(() => { fb.innerHTML = ''; }, 3000);
          }
        });
      }

      const btnCopy = this.els['btn-copy'];
      if (btnCopy) {
        btnCopy.addEventListener('click', () => {
          const rawText = this.els['json-output'].innerText;
          navigator.clipboard.writeText(rawText).then(() => {
            const orig = btnCopy.innerText;
            btnCopy.innerText = '[COPIED]';
            setTimeout(() => { btnCopy.innerText = orig; }, 2000);
          }).catch(console.error);
        });
      }
      
      const eventsContainer = this.els['events-container'];
      if (eventsContainer) {
        eventsContainer.addEventListener('click', (e) => {
          if (e.target.classList.contains('btn-choice')) {
            const choiceId = e.target.getAttribute('data-choice-id');
            this.api.performAction({ type: 'event', choiceId });
          }
        });
      }

      const tiersContainer = this.els['tiers-container'];
      if (tiersContainer) {
        tiersContainer.addEventListener('click', (e) => {
          if (e.target.classList.contains('city-badge')) {
            const cityName = e.target.getAttribute('data-city-name');
            if (cityName && this.els['annex-city']) {
              this.els['annex-city'].value = cityName;
            }
          }
        });
      }
    },

    // 5. API Communications
    api: {
      async createSession(seed, difficulty) {
        try {
          UI.els['btn-run'].disabled = true;
          UI.renderers.setStatus('INIT_SESSION', 'running');
          
          const response = await fetch('/api/session/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seed: parseInt(seed), difficulty })
          });
          
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          UI.state.sessionId = data.sessionId;
          
          if (UI.els['val-session-id']) UI.els['val-session-id'].innerText = UI.state.sessionId;
          if (UI.els['session-controls']) UI.els['session-controls'].style.display = 'block';
          if (UI.els['action-panel']) UI.els['action-panel'].style.display = 'block';
          
          UI.state.isPaused = false;
          UI.api.startPolling();
          UI.update(data.snapshot);
        } catch (err) {
          console.error(err);
          UI.renderers.setStatus('ERR: ' + err.message, 'error');
        } finally {
          if (UI.els['btn-run']) UI.els['btn-run'].disabled = false;
        }
      },

      async pollSession() {
        if (!UI.state.sessionId) return;
        try {
          const response = await fetch(`/api/session/${UI.state.sessionId}`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          UI.update(data.snapshot);
        } catch (err) {
          console.error(err);
          UI.renderers.setStatus('DISCONNECTED', 'error');
        }
      },

      startPolling() {
        if (UI.state.pollInterval) clearInterval(UI.state.pollInterval);
        UI.state.pollInterval = setInterval(() => this.pollSession(), 1000);
      },

      async controlSession(action, value) {
        if (!UI.state.sessionId) return;
        try {
          const payload = {};
          if (action === 'pause') payload.paused = value;
          if (action === 'step') payload.stepTick = true;
          if (action === 'speed') payload.timeScale = value;

          await fetch(`/api/session/${UI.state.sessionId}/control`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          this.pollSession();
        } catch (err) { console.error(err); }
      },

      async performAction(payload) {
        if (!UI.state.sessionId) return;
        try {
          const response = await fetch(`/api/session/${UI.state.sessionId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const result = await response.json();
          if (result.ok === false) alert(`CMD_FAIL: ${result.message}`);
          this.pollSession();
          return result;
        } catch (err) {
          console.error(err);
          alert(`ERR: ${err.message}`);
        }
      }
    },

    // 6. View Update Orchestrator
    update(snapshot) {
      if (!snapshot || !snapshot.session) return;
      
      this.state.isPaused = snapshot.session.paused;
      
      const vm = this.renderers.viewModel(snapshot, this.state.prevSnapshot);
      
      this.renderers.topBar(vm);
      this.renderers.resources(vm);
      this.renderers.governance(vm);
      this.renderers.events(vm);
      this.renderers.provinces(vm);
      this.renderers.logs(vm);
      this.renderers.rules(vm);
      this.renderers.rawJson(snapshot);
      
      this.state.prevSnapshot = snapshot;
    },

    // 7. UI Renderers
    renderers: {
      setStatus(text, type) {
        const dot = UI.els['status-dot'];
        const txt = UI.els['status-text'];
        if (dot) dot.className = `status-dot ${type}`;
        if (txt) txt.innerText = text;
      },

      setText(id, text) {
        const el = UI.els[id];
        if (el && el.innerText !== String(text)) {
          el.innerText = text;
        }
      },

      viewModel(curr, prev) {
        const newlyAnnexed = new Set();
        if (prev && prev.cities && curr.cities) {
          curr.cities.forEach(c => {
            const p = prev.cities.find(x => x.name === c.name);
            if (p && !p.isAnnexed && c.isAnnexed) newlyAnnexed.add(c.name);
          });
        }
        
        return {
          session: curr.session,
          resources: curr.fullState?.resources || {},
          gov: curr.fullState?.governance || {},
          rules: curr.rules || {},
          conquest: curr.conquest || { annexedCities: 0 },
          event: curr.event || {},
          cities: curr.cities || [],
          logs: curr.logs || [],
          
          isNewEvent: (curr.event?.id && (!prev || !prev.event || prev.event.id !== curr.event.id)),
          hasNewLogs: curr.session.tick !== UI.state.lastTick,
          newlyAnnexed,
          prevLogs: prev?.logs || []
        };
      },

      topBar(vm) {
        UI.renderers.setStatus(vm.session.paused ? 'PAUSED' : 'RUNNING', vm.session.paused ? '' : 'running');
        const btnPause = UI.els['btn-pause-resume'];
        if (btnPause) btnPause.innerText = vm.session.paused ? '[ RESUME ]' : '[ PAUSE ]';
        
        UI.renderers.setText('speed-label', `${vm.session.timeScale}x`);
        const speedSlider = UI.els['speed-slider'];
        if (speedSlider && speedSlider.value != vm.session.timeScale) {
          speedSlider.value = vm.session.timeScale;
        }

        UI.renderers.setText('val-tick', vm.session.tick.toLocaleString());
        UI.renderers.setText('val-cities', vm.conquest.annexedCities);
        UI.renderers.setText('val-outcome', vm.session.outcome.toUpperCase());
      },

      resources(vm) {
        if (typeof vm.resources.grain === 'undefined') return;
        UI.renderers.setText('val-grain', Math.round(vm.resources.grain).toLocaleString());
        UI.renderers.setText('val-gold', Math.round(vm.resources.gold).toLocaleString());
        UI.renderers.setText('val-pop', Math.round(vm.resources.population).toLocaleString());
        UI.renderers.setText('val-sec', Math.round(vm.resources.security).toLocaleString());
        UI.renderers.setText('val-arm', Math.round(vm.resources.armament).toLocaleString());
      },

      governance(vm) {
        if (typeof vm.gov.security === 'undefined') return;
        UI.renderers.setText('val-gov-sec', Math.round(vm.gov.security).toLocaleString());
        UI.renderers.setText('val-gov-mor', Math.round(vm.gov.morale).toLocaleString());
        UI.renderers.setText('val-gov-cor', Math.round(vm.gov.corruption).toLocaleString());
        if (typeof vm.gov.cv !== 'undefined') {
          UI.renderers.setText('val-cv', vm.gov.cv.toFixed(2));
        }
        if (vm.rules.cvMax) {
          UI.renderers.setText('val-cv-max', vm.rules.cvMax);
        }
      },

      events(vm) {
        const panel = UI.els['events-panel'];
        const container = UI.els['events-container'];
        if (!panel || !container) return;

        if (vm.event && vm.event.pending && vm.event.id) {
          panel.style.display = 'block';
          if (vm.isNewEvent) {
            const choicesHtml = (vm.event.choices || []).map(c => `
              <button class="btn-choice" data-choice-id="${c.id}">[ ${c.label} ]</button>
            `).join('');
            
            container.innerHTML = `
              <div class="event-card">
                <div class="event-title">${vm.event.title}</div>
                <div class="event-choices">
                  ${choicesHtml}
                </div>
              </div>
            `;
          }
        } else {
          panel.style.display = 'none';
          container.innerHTML = '';
        }
      },

      provinces(vm) {
        const container = UI.els['tiers-container'];
        if (!container || !vm.cities.length) return;

        const tiers = [
          { key: 'capital', label: 'CAPITAL_REGION' },
          { key: 'core', label: 'CORE_REGION' },
          { key: 'frontier', label: 'FRONTIER_REGION' }
        ];

        let html = '';
        tiers.forEach(t => {
          const list = vm.cities.filter(c => c.tier === t.key);
          if (!list.length) return;
          
          html += `<div class="tier-group"><div class="tier-title">${t.label}</div><div class="tier-cities">`;
          list.forEach(city => {
            const isAnnexed = city.isAnnexed || city.name === vm.session.playerCityName;
            let cls = 'city-badge';
            if (isAnnexed) cls += ' annexed';
            if (vm.newlyAnnexed.has(city.name)) cls += ' annex-burst';
            
            const display = isAnnexed ? `${city.name} [CTRL]` : `${city.name} [${city.owner}|ISV:${Math.round(city.isv)}]`;
            html += `<span class="${cls}" data-city-name="${city.name}">${display}</span>`;
          });
          html += `</div></div>`;
        });
        
        container.innerHTML = html;
      },

      logs(vm) {
        const container = UI.els['logs-container'];
        if (!container || !vm.hasNewLogs) return;

        container.innerHTML = vm.logs.map(log => {
          let cls = 'log-entry';
          if (log.includes('EVENT') || log.includes('事件')) cls += ' event';
          if (log.includes('ANNEX') || log.includes('吞并')) cls += ' annex';
          return `<div class="${cls}"><span class="tick">[T${vm.session.tick}]</span> ${log}</div>`;
        }).join('');
        
        UI.state.lastTick = vm.session.tick;
      },

      rules(vm) {
        const list = UI.els['rules-list'];
        if (!list || !vm.rules.cvMax) return;
        
        list.innerHTML = `
          <li>1 TICK = ${vm.rules.tickSeconds}s</li>
          <li>EVENT_INTERVAL = ${vm.rules.eventIntervalSeconds}s</li>
          <li>AUTO_SAVE = ${vm.rules.autoSaveIntervalMinutes}m</li>
          <li>CV_MAX = ${vm.rules.cvMax}</li>
        `;
      },

      rawJson(snapshot) {
        const out = UI.els['json-output'];
        if (!out) return;
        
        let json = JSON.stringify(snapshot, null, 2);
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const highlighted = json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
          let cls = 'number';
          if (/^"/.test(match)) {
            if (/:$/.test(match)) cls = 'key';
            else cls = 'string';
          } else if (/true|false/.test(match)) {
            cls = 'boolean';
          } else if (/null/.test(match)) {
            cls = 'null';
          }
          return '<span class="' + cls + '">' + match + '</span>';
        });
        
        out.innerHTML = highlighted;
      }
    }
  };

  // Boot up
  document.addEventListener('DOMContentLoaded', () => {
    UI.init();
  });
})();
