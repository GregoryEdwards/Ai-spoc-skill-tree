const SAVE_KEY = "aispoc.save.v1";
const SAVE_VERSION = 1;

function emptySave() {
  return {
    version: SAVE_VERSION,
    profile: {
      name: "",
      createdAt: new Date().toISOString(),
      totalXP: 0,
      level: 1
    },
    nodes: {},
    quests: {
      active: [],
      completed: [],
      lastRotatedAt: null
    }
  };
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return emptySave();
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch (e) {
    console.warn("Failed to load save, starting fresh:", e);
    return emptySave();
  }
}

function migrate(save) {
  if (!save.version) save.version = SAVE_VERSION;
  if (!save.profile) save.profile = emptySave().profile;
  if (!save.nodes) save.nodes = {};
  if (!save.quests) save.quests = { active: [], completed: [], lastRotatedAt: null };
  return save;
}

export function createStore() {
  let state = loadFromStorage();
  const listeners = new Set();

  function notify() {
    for (const fn of listeners) fn(state);
  }
  function persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to persist save:", e);
    }
  }
  function commit(next) {
    state = next;
    persist();
    notify();
  }

  return {
    get state() { return state; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    setProfileName(name) {
      commit({ ...state, profile: { ...state.profile, name } });
    },

    addXP(amount) {
      const totalXP = state.profile.totalXP + amount;
      commit({ ...state, profile: { ...state.profile, totalXP } });
    },

    setLevel(level) {
      commit({ ...state, profile: { ...state.profile, level } });
    },

    getNode(nodeId) {
      return state.nodes[nodeId] ?? { status: "locked", evidence: [] };
    },

    setNodeStatus(nodeId, status) {
      const prev = state.nodes[nodeId] ?? { status: "locked", evidence: [] };
      const next = { ...prev, status };
      if (status === "in-progress" && !prev.startedAt) next.startedAt = new Date().toISOString();
      if (status === "mastered") next.masteredAt = new Date().toISOString();
      commit({ ...state, nodes: { ...state.nodes, [nodeId]: next } });
    },

    addEvidence(nodeId, entry) {
      const prev = state.nodes[nodeId] ?? { status: "unlocked", evidence: [] };
      const evidence = [
        ...prev.evidence,
        { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...entry }
      ];
      commit({ ...state, nodes: { ...state.nodes, [nodeId]: { ...prev, evidence } } });
    },

    removeEvidence(nodeId, evidenceId) {
      const prev = state.nodes[nodeId];
      if (!prev) return;
      const evidence = prev.evidence.filter((e) => e.id !== evidenceId);
      commit({ ...state, nodes: { ...state.nodes, [nodeId]: { ...prev, evidence } } });
    },

    setActiveQuests(ids) {
      commit({
        ...state,
        quests: { ...state.quests, active: ids, lastRotatedAt: new Date().toISOString() }
      });
    },

    completeQuest(questId, xp) {
      const active = state.quests.active.filter((id) => id !== questId);
      const completed = [
        ...state.quests.completed,
        { id: questId, completedAt: new Date().toISOString(), xp }
      ];
      const totalXP = state.profile.totalXP + xp;
      commit({
        ...state,
        profile: { ...state.profile, totalXP },
        quests: { ...state.quests, active, completed }
      });
    },

    exportJSON() {
      return JSON.stringify(state, null, 2);
    },

    importJSON(json) {
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      commit(migrate(parsed));
    },

    reset() {
      localStorage.removeItem(SAVE_KEY);
      commit(emptySave());
    }
  };
}
