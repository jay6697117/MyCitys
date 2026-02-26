document.addEventListener('DOMContentLoaded', () => {
  let currentSessionId = null;
  let pollInterval = null;
  let isPaused = true;
  let lastTick = -1;

  const form = document.getElementById('sim-form');
  const btnRun = document.getElementById('btn-run');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  
  const sessionControls = document.getElementById('session-controls');
  const btnPauseResume = document.getElementById('btn-pause-resume');
  const btnStep = document.getElementById('btn-step');
  const btnSave = document.getElementById('btn-save');
  const speedSlider = document.getElementById('speed-slider');
  const speedLabel = document.getElementById('speed-label');

  const valSessionIdMain = document.getElementById('val-session-id');

  const valTick = document.getElementById('val-tick');
  const valCities = document.getElementById('val-cities');
  const valCv = document.getElementById('val-cv');
  const valOutcome = document.getElementById('val-outcome');
  const valCvMax = document.getElementById('val-cv-max');

  const valGrain = document.getElementById('val-grain');
  const valGold = document.getElementById('val-gold');
  const valPop = document.getElementById('val-pop');
  const valSec = document.getElementById('val-sec');
  const valArm = document.getElementById('val-arm');

  const valGovSec = document.getElementById('val-gov-sec');
  const valGovMor = document.getElementById('val-gov-mor');
  const valGovCor = document.getElementById('val-gov-cor');

  const tiersContainer = document.getElementById('tiers-container');
  const rulesList = document.getElementById('rules-list');
  const logsContainer = document.getElementById('logs-container');
  const eventsContainer = document.getElementById('events-container');
  const eventsPanel = document.getElementById('events-panel');
  const actionPanel = document.getElementById('action-panel');

  const annexLane = document.getElementById('annex-lane');
  const annexCity = document.getElementById('annex-city');
  const btnDoAnnex = document.getElementById('btn-do-annex');
  const annexFeedback = document.getElementById('annex-feedback');

  const jsonOutput = document.getElementById('json-output');
  const btnCopy = document.getElementById('btn-copy');

  function syntaxHighlight(json) {
    if (typeof json !== 'string') {
      json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      let cls = 'number';
      let style = 'color: #CC7832;';
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'key';
          style = 'color: #9876AA;';
        } else {
          cls = 'string';
          style = 'color: #6A8759;';
        }
      } else if (/true|false/.test(match)) {
        cls = 'boolean';
        style = 'color: #CC7832; font-style: italic;';
      } else if (/null/.test(match)) {
        cls = 'null';
        style = 'color: #CC7832; font-style: italic;';
      }
      return '<span class="' + cls + '" style="' + style + '">' + match + '</span>';
    });
  }

  function setOutcomeStyle(outcome) {
    if (!valOutcome) return;
    valOutcome.className = 'metric-value';
    if (outcome === 'victory') {
      valOutcome.classList.add('outcome-victory');
      valOutcome.innerText = '胜利 (VICTORY)';
    } else if (outcome === 'defeat') {
      valOutcome.classList.add('outcome-defeat');
      valOutcome.innerText = '失败 (DEFEAT)';
    } else {
      valOutcome.classList.add('outcome-ongoing');
      valOutcome.innerText = '进行中 (ONGOING)';
    }
  }

  async function createSession(seed, difficulty) {
    try {
      btnRun.disabled = true;
      statusDot.className = 'status-dot running';
      statusText.innerText = '正在创建会话... (INITIALIZING)';
      
      const response = await fetch(`/api/session/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: parseInt(seed), difficulty })
      });
      
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      const data = await response.json();
      currentSessionId = data.sessionId;
      if (valSessionIdMain) valSessionIdMain.innerText = currentSessionId;
      if (sessionControls) sessionControls.style.display = 'flex';
      if (actionPanel) actionPanel.style.display = 'block';
      
      statusDot.className = 'status-dot running';
      statusText.innerText = '会话运行中... (RUNNING)';
      isPaused = false;
      if (btnPauseResume) btnPauseResume.innerText = '暂停 (PAUSE)';
      
      updateDashboard(data.snapshot);
      startPolling();
    } catch (err) {
      console.error(err);
      statusDot.className = 'status-dot error';
      statusText.innerText = '创建失败 (CREATE_ERROR): ' + err.message;
    } finally {
      btnRun.disabled = false;
    }
  }

  async function pollSession() {
    if (!currentSessionId) return;
    try {
      const response = await fetch(`/api/session/${currentSessionId}`);
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      const data = await response.json();
      updateDashboard(data.snapshot);
    } catch (err) {
      console.error(err);
      statusDot.className = 'status-dot error';
      statusText.innerText = '失去连接 (DISCONNECTED)';
    }
  }

  function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(pollSession, 1000);
  }

  async function controlSession(action, value) {
    if (!currentSessionId) return;
    try {
      const payload = {};
      if (action === 'pause') payload.paused = value;
      if (action === 'step') payload.stepTick = true;
      if (action === 'speed') payload.timeScale = value;

      await fetch(`/api/session/${currentSessionId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      pollSession();
    } catch (err) {
      console.error(err);
    }
  }

  async function performAction(payload) {
    if (!currentSessionId) return;
    try {
      const response = await fetch(`/api/session/${currentSessionId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.ok === false) {
        alert(`Action failed: ${result.message}`);
      }
      pollSession();
      return result;
    } catch (err) {
      console.error(err);
      alert(`Action error: ${err.message}`);
    }
  }

  function updateDashboard(snapshot) {
    if (!snapshot) return;
    const session = snapshot.session;
    
    // Global status
    isPaused = session.paused;
    if (btnPauseResume) btnPauseResume.innerText = isPaused ? '继续 (RESUME)' : '暂停 (PAUSE)';
    if (speedLabel) speedLabel.innerText = `${session.timeScale}x`;
    if (speedSlider) speedSlider.value = session.timeScale;
    
    if (isPaused) {
      statusDot.className = 'status-dot';
      statusDot.style.backgroundColor = 'var(--text-muted)';
      statusDot.style.boxShadow = 'none';
      statusText.innerText = '已暂停 (PAUSED)';
    } else {
      statusDot.className = 'status-dot running';
      statusDot.style.backgroundColor = 'var(--accent-lime)';
      statusDot.style.boxShadow = '0 0 12px var(--accent-lime)';
      statusText.innerText = '运行中... (RUNNING)';
    }

    // Summary
    if (valTick) valTick.innerText = session.tick.toLocaleString();
    if (valCities && snapshot.conquest) valCities.innerText = snapshot.conquest.annexedCities.toLocaleString();
    if (valCv && snapshot.governance) valCv.innerText = snapshot.governance.cv.toFixed(2);
    setOutcomeStyle(session.outcome);

    if (snapshot.fullState) {
      const { resources, governance } = snapshot.fullState;
      if (valGrain) valGrain.innerText = Math.round(resources.grain).toLocaleString();
      if (valGold) valGold.innerText = Math.round(resources.gold).toLocaleString();
      if (valPop) valPop.innerText = Math.round(resources.population).toLocaleString();
      if (valSec) valSec.innerText = Math.round(resources.security).toLocaleString();
      if (valArm) valArm.innerText = Math.round(resources.armament).toLocaleString();
      if (valGovSec) valGovSec.innerText = Math.round(governance.security).toLocaleString();
      if (valGovMor) valGovMor.innerText = Math.round(governance.morale).toLocaleString();
      if (valGovCor) valGovCor.innerText = Math.round(governance.corruption).toLocaleString();
    }

    if (snapshot.rules) {
      if (valCvMax) valCvMax.innerText = snapshot.rules.cvMax;
      if (rulesList) {
        rulesList.innerHTML = `
          <li>1 Tick = <strong>${snapshot.rules.tickSeconds}s</strong> 现实时间</li>
          <li>随机事件周期 = <strong>${snapshot.rules.eventIntervalSeconds}</strong> 秒</li>
          <li>自动存档周期 = <strong>${snapshot.rules.autoSaveIntervalMinutes}</strong> 分钟</li>
          <li>主城崩溃阈值 (CV Max) = <strong>${snapshot.rules.cvMax}</strong></li>
        `;
      }
    }

    // Events
    if (snapshot.event && snapshot.event.pending && snapshot.event.id) {
      if (eventsPanel) eventsPanel.style.display = 'block';
      if (eventsContainer) {
        eventsContainer.innerHTML = `
          <div class="event-card">
            <div class="event-title">${snapshot.event.title}</div>
            <div class="event-choices">
              ${(snapshot.event.choices || []).map(c => `
                <button class="btn-choice" data-choice-id="${c.id}">
                  [选择] ${c.label}
                </button>
              `).join('')}
            </div>
          </div>
        `;
        document.querySelectorAll('.btn-choice').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const choiceId = e.target.getAttribute('data-choice-id');
            performAction({ type: 'event', choiceId });
          });
        });
      }
    } else {
      if (eventsPanel) eventsPanel.style.display = 'none';
      if (eventsContainer) eventsContainer.innerHTML = `<div class="placeholder-text">暂无未决事件...</div>`;
    }

    // Cities
    if (snapshot.cities && tiersContainer) {
      tiersContainer.innerHTML = '';
      const tierNames = [
        { key: 'capital', label: '首都城' },
        { key: 'core', label: '核心城' },
        { key: 'frontier', label: '边城' }
      ];
      
      const citiesByTier = {
        capital: snapshot.cities.filter(c => c.tier === 'capital'),
        core: snapshot.cities.filter(c => c.tier === 'core'),
        frontier: snapshot.cities.filter(c => c.tier === 'frontier')
      };

      tierNames.forEach(t => {
        const list = citiesByTier[t.key];
        if (!list || list.length === 0) return;
        const group = document.createElement('div');
        group.className = 'tier-group';
        group.innerHTML = `<div class="tier-title"><span>${t.label}</span></div><div class="tier-cities" id="tier-cities-${t.key}"></div>`;
        tiersContainer.appendChild(group);
        const citiesWrap = group.querySelector('.tier-cities');
        list.forEach(city => {
          const badge = document.createElement('span');
          badge.className = 'city-badge';
          if (city.isAnnexed) badge.classList.add('annexed');
          badge.innerText = `${city.name} [${city.owner}|ISV:${Math.round(city.isv)}]`;
          if (city.isAnnexed || city.name === session.playerCityName) {
            badge.innerText = `${city.name} (已控制)`;
            badge.classList.add('annexed');
          }
          badge.addEventListener('click', () => {
            if (annexCity) annexCity.value = city.name;
          });
          citiesWrap.appendChild(badge);
        });
      });
    }

    // Logs
    if (snapshot.logs && session.tick !== lastTick && logsContainer) {
      logsContainer.innerHTML = snapshot.logs.map(log => {
        let className = 'log-entry';
        if (log.includes('事件') || log.includes('EVENT')) className += ' event';
        if (log.includes('吞并') || log.includes('ANNEX')) className += ' annex';
        return `<div class="${className}"><span class="tick">[Tick ${session.tick}]</span> ${log}</div>`;
      }).join('');
      lastTick = session.tick;
    }

    if (jsonOutput) jsonOutput.innerHTML = syntaxHighlight(snapshot);
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const seed = document.getElementById('seed').value;
      const difficulty = document.getElementById('difficulty').value;
      createSession(seed, difficulty);
    });
  }

  if (btnPauseResume) {
    btnPauseResume.addEventListener('click', () => {
      controlSession('pause', !isPaused);
    });
  }

  if (btnStep) {
    btnStep.addEventListener('click', () => {
      controlSession('step');
    });
  }

  if (speedSlider) {
    speedSlider.addEventListener('change', (e) => {
      controlSession('speed', parseInt(e.target.value));
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      const res = await performAction({ type: 'save' });
      if (res && res.ok) {
        alert('存档成功 (SAVE_SUCCESS)');
      }
    });
  }

  if (btnDoAnnex) {
    btnDoAnnex.addEventListener('click', async () => {
      const lane = annexLane.value;
      const city = annexCity.value;
      if (!city) {
        alert('请选择目标城市 (Select a target city)');
        return;
      }
      const normalizedLane = lane === 'economy' ? 'economic' : (lane === 'diplomacy' ? 'diplomatic' : 'war');
      const res = await performAction({ type: 'annex', lane: normalizedLane, cityName: city });
      if (res && res.ok) {
        if (annexFeedback) annexFeedback.innerHTML = `<span style="color:var(--accent-lime)">指令已下达 (CMD_ISSUED)</span>`;
      } else {
        if (annexFeedback) annexFeedback.innerHTML = `<span style="color:var(--accent-alert)">指令失败: ${res?.message || 'Unknown Error'}</span>`;
      }
      setTimeout(() => { if (annexFeedback) annexFeedback.innerHTML = ''; }, 3000);
    });
  }

  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const rawText = jsonOutput.innerText;
      navigator.clipboard.writeText(rawText).then(() => {
        const originalTitle = btnCopy.title;
        btnCopy.title = "Copied!";
        btnCopy.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D1FF27" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        setTimeout(() => {
          btnCopy.title = originalTitle;
          btnCopy.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        }, 2000);
      }).catch(err => {
        console.error("Failed to copy", err);
      });
    });
  }
});
