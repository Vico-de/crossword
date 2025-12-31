// src/App.jsx
import {
  loadDbFromIndexedDb,
  loadDbFromFile,
  exportDbToFile,
  clearIndexedDbDb,
  query,
  exec,
} from "./webdb";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { AgGridReact } from "ag-grid-react";

import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

const WEB_ONLY = true;

const ui = {
  page: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    fontFamily: "system-ui",
    colorScheme: "light dark",
  },
  topbar: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    padding: 12,
    borderBottom: "1px solid",
    borderColor: "CanvasText",
    background: "Canvas",
    color: "CanvasText",
  },
  content: { flex: 1, minHeight: 0 },
  navBtn: (active) => ({
    padding: "6px 10px",
    borderRadius: 0,
    border: "1px solid",
    borderColor: "CanvasText",
    background: active ? "CanvasText" : "Canvas",
    color: active ? "Canvas" : "CanvasText",
    cursor: "pointer",
  }),
  col2: {
    flex: 1,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minWidth: 0,
  },
  rightCol2: {
    flex: 1,
    padding: 16,
    borderLeft: "1px solid",
    borderColor: "CanvasText",
    overflow: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minWidth: 0,
    background: "Canvas",
    color: "CanvasText",
  },
  headerRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  h2: { margin: 0, fontSize: 18, fontWeight: 800 },
  card: {
    border: "1px solid",
    borderColor: "CanvasText",
    padding: 10,
    borderRadius: 0,
    background: "Canvas",
    color: "CanvasText",
  },
  row: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" },
  input: {
    flex: 1,
    minWidth: 260,
    padding: "8px 10px",
    borderRadius: 0,
    border: "1px solid",
    borderColor: "CanvasText",
    boxSizing: "border-box",
    background: "Canvas",
    color: "CanvasText",
  },
  textarea: {
    width: "100%",
    padding: 10,
    borderRadius: 0,
    border: "1px solid",
    borderColor: "CanvasText",
    resize: "vertical",
    boxSizing: "border-box",
    display: "block",
    background: "Canvas",
    color: "CanvasText",
  },
  select: {
    padding: 6,
    borderRadius: 0,
    border: "1px solid",
    borderColor: "CanvasText",
    boxSizing: "border-box",
    background: "Canvas",
    color: "CanvasText",
  },
  button: {
    padding: "6px 10px",
    borderRadius: 0,
    border: "1px solid",
    borderColor: "CanvasText",
    background: "Canvas",
    color: "CanvasText",
    cursor: "pointer",
  },
  gridWrap: { flex: 1, width: "100%", minHeight: 0 },
};

/**
 * WebDbGate
 * - Charge DB depuis IndexedDB si disponible
 * - Sinon propose un picker .db
 * - Expose export/clear/hasDb via render-prop children
 */
function WebDbGate({ children }) {
  const [ready, setReady] = useState(false);
  const [hasDb, setHasDb] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    loadDbFromIndexedDb()
      .then((db) => {
        const ok = Boolean(db);
        setHasDb(ok);
        setReady(ok);
      })
      .catch((e) => {
        setErr(String(e));
        setHasDb(false);
        setReady(false);
      });
  }, []);

  const onPickFile = useCallback(async (e) => {
    setErr("");
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await loadDbFromFile(file);
      setHasDb(true);
      setReady(true);
    } catch (ex) {
      setErr(String(ex));
    }
  }, []);

  const exportDb = useCallback(async () => {
    setErr("");
    try {
      await exportDbToFile();
      return true;
    } catch (ex) {
      setErr(String(ex));
      return false;
    }
  }, []);

  const clearDb = useCallback(async () => {
    setErr("");
    try {
      await clearIndexedDbDb();
      setHasDb(false);
      setReady(false);
      return true;
    } catch (ex) {
      setErr(String(ex));
      return false;
    }
  }, []);

  if (!ready) {
    return (
      <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
        <h2 style={ui.h2}>Crossword — Charger une base</h2>

        <div style={ui.card}>
          <p style={{ marginTop: 0 }}>
            Ce mode fonctionne sans serveur. Charge une base SQLite (.db) une
            première fois, puis elle sera sauvegardée automatiquement dans le
            navigateur (IndexedDB).
          </p>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <label style={{ ...ui.button, cursor: "pointer" }}>
              Charger un fichier .db
              <input
                type="file"
                accept=".db,application/x-sqlite3"
                onChange={onPickFile}
                style={{ display: "none" }}
              />
            </label>

            <button style={ui.button} onClick={exportDb} disabled={!hasDb}>
              Exporter la base
            </button>

            <button style={ui.button} onClick={clearDb}>
              Oublier la base (IndexedDB)
            </button>
          </div>

          {err ? (
            <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{err}</div>
          ) : null}
        </div>
      </div>
    );
  }

  // ready = true => render app
  return children({ hasDb, exportDb, clearDb, err });
}
function buildLikeFromPattern(raw) {
  // Syntaxe:
  // - prefix "-" : match n'importe où (contient)
  // - suffix "*" : ancre fin de mot
  // - "_" : wildcard 1 caractère (SQL LIKE)
  let p = (raw || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!p) return null;

  const contains = p.startsWith("-");
  if (contains) p = p.slice(1);

  const endAnchored = p.endsWith("*");
  const core = endAnchored ? p.slice(0, -1) : p;
  if (!core) return null;

  // Cas:
  // 1) contient + fin:   %core
  // 2) contient + libre: %core%
  // 3) debut + fin:      core
  // 4) debut + libre:    core%
  if (contains && endAnchored) return `%${core}`;
  if (contains && !endAnchored) return `%${core}%`;
  if (!contains && endAnchored) return `${core}`;
  return `${core}%`;
}

/* -----------------------------
   PAGE 1 : MOTS (enrichissement)
------------------------------ */
function PageMots({ onDirty }) {
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);

  const [onlyFav, setOnlyFav] = useState(false);
  const [onlyNoDefs, setOnlyNoDefs] = useState(false);
  const [onlyActif, setOnlyActif] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");

  const [selectedMot, setSelectedMot] = useState(null);
  const selectedMotRef = useRef(null);
  useEffect(() => {
    selectedMotRef.current = selectedMot;
  }, [selectedMot]);

  const [defs, setDefs] = useState([]);
  const [defsStatus, setDefsStatus] = useState("Sélectionne un mot");

  // Ajout définition
  const [newDefText, setNewDefText] = useState("");
  const [newDefLevel, setNewDefLevel] = useState(2);
  const [savingDef, setSavingDef] = useState(false);

  // Edition / suppression définition
  const [editingDefId, setEditingDefId] = useState(null);
  const [editDefText, setEditDefText] = useState("");
  const [editDefLevel, setEditDefLevel] = useState(2);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Ajout mot (source forcé à 1)
  const [newMotBase, setNewMotBase] = useState("");
  const [newMotActif, setNewMotActif] = useState(true);
  const [newMotFavoris, setNewMotFavoris] = useState(false);
  const [addingMot, setAddingMot] = useState(false);
  const [addMotStatus, setAddMotStatus] = useState("");

  const lastReqId = useRef(0);

  const colDefs = useMemo(
    () => [
      { field: "base", headerName: "Mot", flex: 1, minWidth: 240 },
      { field: "longueur", headerName: "L", width: 80 },
      { field: "nb_definitions", headerName: "Defs", width: 90 },
      { field: "favoris", hide: true },
      { field: "actif", hide: true },
      { field: "source", hide: true },
      { field: "normalise", hide: true },
      { field: "rowid", hide: true },
    ],
    [],
  );

  const patchSelectedMot = useCallback((patch) => {
    const cur = selectedMotRef.current;
    if (!cur) return;

    setSelectedMot((prev) => (prev ? { ...prev, ...patch } : prev));
    setRows((prev) =>
      prev.map((r) => (r.rowid === cur.rowid ? { ...r, ...patch } : r)),
    );
  }, []);

  const normalizeForDb = useCallback((s) => {
    return (s || "").trim().toUpperCase().replace(/\s+/g, "");
  }, []);

  const fetchRows = useCallback(() => {
    const reqId = ++lastReqId.current;
    setLoadingRows(true);

    try {
      const q = quickSearch.trim().toUpperCase();

      const where = [];
      const params = [];

      if (onlyFav) where.push("favoris = 1");
      if (onlyActif) where.push("actif = 1");

      if (onlyNoDefs) {
        where.push(
          "(SELECT COUNT(*) FROM definitions d WHERE d.mot_normalise = mots_fr_filtre.normalise) = 0",
        );
      }

      if (q) {
        where.push("(UPPER(base) LIKE ? OR normalise LIKE ?)");
        params.push(`%${q}%`, `%${q}%`);
      }

      const sql = `
        SELECT
          rowid,
          base,
          normalise,
          longueur,
          source,
          actif,
          favoris,
          (SELECT COUNT(*) FROM definitions d WHERE d.mot_normalise = mots_fr_filtre.normalise) AS nb_definitions
        FROM mots_fr_filtre
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY favoris DESC, nb_definitions DESC, base COLLATE NOCASE ASC
        LIMIT 5000
      `;

      const data = query(sql, params);
      if (reqId !== lastReqId.current) return;

      const arr = Array.isArray(data) ? data : data?.rows || [];
      setRows(arr);
    } catch (e) {
      console.error("fetchRows failed:", e);
      if (reqId !== lastReqId.current) return;
      setRows([]);
    } finally {
      if (reqId === lastReqId.current) setLoadingRows(false);
    }
  }, [quickSearch, onlyFav, onlyActif, onlyNoDefs]);

  useEffect(() => {
    const t = setTimeout(fetchRows, 250);
    return () => clearTimeout(t);
  }, [fetchRows]);

  const reloadDefinitions = useCallback((motNormalise) => {
    if (!motNormalise) return [];
    const d = query(
      `SELECT id, mot_normalise, definition, niveau
       FROM definitions
       WHERE mot_normalise = ?
       ORDER BY niveau ASC, id ASC`,
      [motNormalise],
    );
    return Array.isArray(d) ? d : d?.rows || [];
  }, []);

  const loadDefinitions = useCallback(
    (mot) => {
      if (!mot?.normalise) return;

      setSelectedMot(mot);
      setDefs([]);
      setDefsStatus("Chargement...");
      setNewDefText("");
      setNewDefLevel(2);

      // reset édition/suppression quand on change de mot
      setEditingDefId(null);
      setEditDefText("");
      setEditDefLevel(2);
      setDeletingId(null);

      try {
        const d = reloadDefinitions(mot.normalise);
        setDefs(d);
        setDefsStatus(d.length ? "OK" : "Aucune définition");
        patchSelectedMot({ nb_definitions: d.length });
      } catch (e) {
        console.error(e);
        setDefsStatus("Erreur chargement définitions");
      }
    },
    [reloadDefinitions, patchSelectedMot],
  );

  const toggleFavoris = useCallback(async () => {
    const cur = selectedMotRef.current;
    if (!cur) return;

    const next = Number(cur.favoris) === 1 ? 0 : 1;
    try {
      await exec("UPDATE mots_fr_filtre SET favoris = ? WHERE rowid = ?", [
        next,
        cur.rowid,
      ]);
      patchSelectedMot({ favoris: next });
      onDirty?.();
    } catch (e) {
      console.error(e);
    }
  }, [patchSelectedMot, onDirty]);

  const toggleActif = useCallback(async () => {
    const cur = selectedMotRef.current;
    if (!cur) return;

    const next = Number(cur.actif) === 1 ? 0 : 1;
    try {
      await exec("UPDATE mots_fr_filtre SET actif = ? WHERE rowid = ?", [
        next,
        cur.rowid,
      ]);
      patchSelectedMot({ actif: next });
      onDirty?.();
    } catch (e) {
      console.error(e);
    }
  }, [patchSelectedMot, onDirty]);

  const deleteSelectedMot = useCallback(async () => {
    const cur = selectedMotRef.current;
    if (!cur) return;

    const ok = window.confirm(
      `Supprimer définitivement le mot "${cur.base}" ?`,
    );
    if (!ok) return;

    try {
      await exec("DELETE FROM definitions WHERE mot_normalise = ?", [
        cur.normalise,
      ]);
      await exec("DELETE FROM mots_fr_filtre WHERE rowid = ?", [cur.rowid]);

      onDirty?.();

      setSelectedMot(null);
      setDefs([]);
      setDefsStatus("Sélectionne un mot");

      fetchRows();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression (voir console).");
    }
  }, [onDirty, fetchRows]);

  const saveDefinition = useCallback(async () => {
    const cur = selectedMotRef.current;
    if (!cur) return;

    const txt = newDefText.trim();
    if (!txt) return;

    setSavingDef(true);
    try {
      await exec(
        "INSERT INTO definitions (mot_normalise, definition, niveau) VALUES (?, ?, ?)",
        [cur.normalise, txt, Number(newDefLevel)],
      );

      onDirty?.();

      const d = reloadDefinitions(cur.normalise);
      setDefs(d);
      setDefsStatus("OK");
      setNewDefText("");
      patchSelectedMot({ nb_definitions: d.length });
    } catch (e) {
      console.error(e);
      setDefsStatus("Erreur lors de l’ajout");
    } finally {
      setSavingDef(false);
    }
  }, [newDefText, newDefLevel, reloadDefinitions, patchSelectedMot, onDirty]);

  const startEditDef = useCallback((d) => {
    setEditingDefId(d.id);
    setEditDefText(d.definition || "");
    setEditDefLevel(Number(d.niveau) || 2);
  }, []);

  const cancelEditDef = useCallback(() => {
    setEditingDefId(null);
    setEditDefText("");
    setEditDefLevel(2);
  }, []);

  const saveEditDef = useCallback(async () => {
    const cur = selectedMotRef.current;
    if (!cur) return;
    if (!editingDefId) return;

    const txt = editDefText.trim();
    if (!txt) return;

    setSavingEdit(true);
    try {
      await exec(
        "UPDATE definitions SET definition = ?, niveau = ? WHERE id = ?",
        [txt, Number(editDefLevel), editingDefId],
      );

      onDirty?.();

      const d = reloadDefinitions(cur.normalise);
      setDefs(d);
      setDefsStatus("OK");
      patchSelectedMot({ nb_definitions: d.length });

      cancelEditDef();
    } catch (e) {
      console.error(e);
      setDefsStatus("Erreur lors de l’édition");
    } finally {
      setSavingEdit(false);
    }
  }, [
    editingDefId,
    editDefText,
    editDefLevel,
    reloadDefinitions,
    patchSelectedMot,
    onDirty,
    cancelEditDef,
  ]);

  const deleteDef = useCallback(
    async (id) => {
      const cur = selectedMotRef.current;
      if (!cur) return;

      const ok = window.confirm("Supprimer cette définition ?");
      if (!ok) return;

      setDeletingId(id);
      try {
        await exec("DELETE FROM definitions WHERE id = ?", [id]);
        onDirty?.();

        const d = reloadDefinitions(cur.normalise);
        setDefs(d);
        setDefsStatus("OK");
        patchSelectedMot({ nb_definitions: d.length });

        if (editingDefId === id) cancelEditDef();
      } catch (e) {
        console.error(e);
        setDefsStatus("Erreur lors de la suppression");
      } finally {
        setDeletingId(null);
      }
    },
    [reloadDefinitions, patchSelectedMot, onDirty, editingDefId, cancelEditDef],
  );

  const addMot = useCallback(async () => {
    const base = (newMotBase || "").trim();
    if (!base) return;

    const normalise = normalizeForDb(base);
    const longueur = normalise.length;
    if (!normalise || longueur <= 0) return;

    setAddingMot(true);
    setAddMotStatus("");

    try {
      const exists = query(
        `SELECT rowid FROM mots_fr_filtre WHERE normalise = ? LIMIT 1`,
        [normalise],
      );
      const exRow = Array.isArray(exists) ? exists[0] : (exists?.rows || [])[0];
      if (exRow?.rowid) {
        setAddMotStatus("Ce mot existe déjà (normalise identique).");
        return;
      }

      // source forcé à 1 (pas de champ dans l'UI)
      await exec(
        `INSERT INTO mots_fr_filtre (base, normalise, longueur, source, actif, favoris)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          base,
          normalise,
          longueur,
          1,
          newMotActif ? 1 : 0,
          newMotFavoris ? 1 : 0,
        ],
      );

      onDirty?.();
      setAddMotStatus("Mot ajouté.");

      setNewMotBase("");
      setNewMotActif(true);
      setNewMotFavoris(false);

      fetchRows();
    } catch (e) {
      console.error(e);
      setAddMotStatus("Erreur lors de l’ajout du mot.");
    } finally {
      setAddingMot(false);
    }
  }, [
    newMotBase,
    newMotActif,
    newMotFavoris,
    normalizeForDb,
    fetchRows,
    onDirty,
  ]);

  return (
    <div style={{ height: "100%", display: "flex", minHeight: 0 }}>
      <div style={ui.col2}>
        <div style={ui.headerRow}>
          <h2 style={ui.h2}>Mots</h2>
          <button style={ui.button} onClick={fetchRows} disabled={loadingRows}>
            {loadingRows ? "Chargement..." : "Rafraîchir"}
          </button>
        </div>

        <div style={ui.card}>
          <div style={ui.row}>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={onlyFav}
                onChange={(e) => setOnlyFav(e.target.checked)}
              />
              Favoris
            </label>

            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={onlyNoDefs}
                onChange={(e) => setOnlyNoDefs(e.target.checked)}
              />
              Sans définitions
            </label>

            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={onlyActif}
                onChange={(e) => setOnlyActif(e.target.checked)}
              />
              Actifs
            </label>

            <input
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              placeholder="Recherche (mot)…"
              style={ui.input}
            />

            <div style={{ opacity: 0.75, whiteSpace: "nowrap" }}>
              {loadingRows ? "…" : `${rows.length} résultats`}
            </div>
          </div>
        </div>

        <div style={ui.card}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Ajouter un mot</div>

          <div style={ui.row}>
            <input
              value={newMotBase}
              onChange={(e) => setNewMotBase(e.target.value)}
              placeholder="Mot (base) — ex: Écume"
              style={ui.input}
            />

            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={newMotFavoris}
                onChange={(e) => setNewMotFavoris(e.target.checked)}
              />
              Favori
            </label>

            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={newMotActif}
                onChange={(e) => setNewMotActif(e.target.checked)}
              />
              Actif
            </label>

            <button
              style={ui.button}
              onClick={addMot}
              disabled={addingMot || !newMotBase.trim()}
            >
              {addingMot ? "Ajout..." : "Ajouter"}
            </button>

            {addMotStatus ? (
              <div style={{ opacity: 0.8 }}>{addMotStatus}</div>
            ) : null}
          </div>
        </div>

        <div className="ag-theme-quartz" style={ui.gridWrap}>
          <AgGridReact
            theme="legacy"
            rowData={rows}
            columnDefs={colDefs}
            defaultColDef={{ resizable: true, sortable: true, filter: true }}
            pagination={true}
            paginationPageSize={50}
            animateRows={true}
            onRowClicked={(e) => loadDefinitions(e.data)}
          />
        </div>
      </div>

      <div style={ui.rightCol2}>
        <h2 style={ui.h2}>Définitions</h2>

        {selectedMot ? (
          <div style={ui.card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>
                  {selectedMot.base}
                </div>
                <div style={{ opacity: 0.75 }}>
                  L={selectedMot.longueur} — defs: {selectedMot.nb_definitions}
                </div>
              </div>

              <div
                style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
              >
                <button style={ui.button} onClick={toggleFavoris}>
                  {Number(selectedMot.favoris) === 1 ? "★ Favori" : "☆ Favori"}
                </button>

                <button style={ui.button} onClick={toggleActif}>
                  {Number(selectedMot.actif) === 1 ? "Actif" : "Inactif"}
                </button>

                <button
                  style={{
                    ...ui.button,
                    background: "#b00020",
                    color: "white",
                    borderColor: "#b00020",
                    fontWeight: 700,
                  }}
                  onClick={deleteSelectedMot}
                >
                  Supprimer le mot
                </button>
              </div>
            </div>

            <div style={{ marginTop: 10, opacity: 0.8 }}>{defsStatus}</div>
          </div>
        ) : (
          <div style={{ ...ui.card, opacity: 0.75 }}>
            Sélectionne un mot dans la table.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {defs.map((d) => {
            const isEditing = editingDefId === d.id;

            return (
              <div key={d.id} style={ui.card}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: 800 }}>Niveau {d.niveau}</div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      style={ui.button}
                      onClick={() => startEditDef(d)}
                      disabled={savingEdit || deletingId === d.id}
                    >
                      Éditer
                    </button>

                    <button
                      style={{
                        ...ui.button,
                        background: "#b00020",
                        color: "white",
                        borderColor: "#b00020",
                        fontWeight: 800,
                      }}
                      onClick={() => deleteDef(d.id)}
                      disabled={savingEdit || deletingId === d.id}
                    >
                      {deletingId === d.id ? "Suppression..." : "Supprimer"}
                    </button>
                  </div>
                </div>

                {!isEditing ? (
                  <div style={{ marginTop: 8 }}>{d.definition}</div>
                ) : (
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <textarea
                      value={editDefText}
                      onChange={(e) => setEditDefText(e.target.value)}
                      rows={3}
                      style={ui.textarea}
                    />

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                        }}
                      >
                        Niveau
                        <select
                          value={editDefLevel}
                          onChange={(e) =>
                            setEditDefLevel(Number(e.target.value))
                          }
                          style={ui.select}
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                        </select>
                      </label>

                      <button
                        style={ui.button}
                        onClick={saveEditDef}
                        disabled={savingEdit || !editDefText.trim()}
                      >
                        {savingEdit ? "Enregistrement..." : "Sauvegarder"}
                      </button>

                      <button
                        style={ui.button}
                        onClick={cancelEditDef}
                        disabled={savingEdit}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedMot ? (
          <div style={ui.card}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              Ajouter une définition
            </div>

            <textarea
              value={newDefText}
              onChange={(e) => setNewDefText(e.target.value)}
              placeholder="Texte de la définition…"
              rows={3}
              style={ui.textarea}
            />

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginTop: 10,
                flexWrap: "wrap",
              }}
            >
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                Niveau
                <select
                  value={newDefLevel}
                  onChange={(e) => setNewDefLevel(Number(e.target.value))}
                  style={ui.select}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </label>

              <button
                style={ui.button}
                onClick={saveDefinition}
                disabled={savingDef || !newDefText.trim()}
              >
                {savingDef ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* -----------------------------
   PAGE 2 : PATTERN
------------------------------ */
function PagePattern() {
  const [pattern, setPattern] = useState("");
  const [onlyFav, setOnlyFav] = useState(false);
  const [onlyActif, setOnlyActif] = useState(false);
  const [limit, setLimit] = useState(500);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(() => {
    const p = pattern.trim().toUpperCase();
    setLoading(true);

    try {
      if (!p) {
        setRows([]);
        return;
      }

      const like = buildLikeFromPattern(pattern);
      if (!like) {
        setRows([]);
        return;
      }

      const where = ["normalise LIKE ?"];
      const params = [like];

      if (onlyFav) where.push("favoris = 1");
      if (onlyActif) where.push("actif = 1");

      const sql = `
        SELECT
          rowid,
          base,
          normalise,
          longueur,
          source,
          actif,
          favoris,
          (SELECT COUNT(*) FROM definitions d WHERE d.mot_normalise = mots_fr_filtre.normalise) AS nb_definitions
        FROM mots_fr_filtre
        WHERE ${where.join(" AND ")}
        ORDER BY favoris DESC, nb_definitions DESC, base COLLATE NOCASE ASC
        LIMIT ${Number(limit) || 500}
      `;

      const r = query(sql, params);
      setRows(Array.isArray(r) ? r : r?.rows || []);
    } catch (e) {
      console.error("pattern query failed:", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [pattern, onlyFav, onlyActif, limit]);

  useEffect(() => {
    const t = setTimeout(runSearch, 250);
    return () => clearTimeout(t);
  }, [runSearch]);

  const colDefs = useMemo(
    () => [
      { field: "base", headerName: "Mot", flex: 1, minWidth: 240 },
      { field: "longueur", headerName: "L", width: 80 },
      { field: "nb_definitions", headerName: "Defs", width: 90 },
    ],
    [],
  );

  return (
    <div
      style={{
        padding: 16,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 0,
      }}
    >
      <h2 style={ui.h2}>Recherche — Pattern</h2>

      <div style={ui.card}>
        <div style={ui.row}>
          <input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Ex: TE__ ou TE__*"
            style={ui.input}
          />

          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={onlyFav}
              onChange={(e) => setOnlyFav(e.target.checked)}
            />
            Favoris
          </label>

          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={onlyActif}
              onChange={(e) => setOnlyActif(e.target.checked)}
            />
            Actifs
          </label>

          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            Limite
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={{ ...ui.input, minWidth: 120, flex: 0 }}
            />
          </label>

          <button style={ui.button} onClick={runSearch} disabled={loading}>
            {loading ? "Recherche..." : "Rechercher"}
          </button>

          <div style={{ opacity: 0.75 }}>{rows.length} résultats</div>
        </div>
      </div>

      <div className="ag-theme-quartz" style={{ flex: 1, minHeight: 0 }}>
        <AgGridReact
          theme="legacy"
          rowData={rows}
          columnDefs={colDefs}
          defaultColDef={{ resizable: true, sortable: true, filter: true }}
          pagination={true}
          paginationPageSize={50}
        />
      </div>
    </div>
  );
}

/* -----------------------------
   PAGE 3 : CROISEMENT
------------------------------ */
function PageCroisement() {
  const [pattern1, setPattern1] = useState("");
  const [pattern2, setPattern2] = useState("");
  const [pattern3, setPattern3] = useState(""); // optionnel

  const [dir1, setDir1] = useState("H");
  const [dir2, setDir2] = useState("H");
  const [dir3, setDir3] = useState("V");

  const [pos1, setPos1] = useState(null);
  const [pos3a, setPos3a] = useState(null);
  const [pos2, setPos2] = useState(null);
  const [pos3b, setPos3b] = useState(null);

  const [limitCandidates, setLimitCandidates] = useState(1200);
  const [maxSolutions, setMaxSolutions] = useState(500);

  const [loading, setLoading] = useState(false);
  const [solutions, setSolutions] = useState([]);
  const [stats, setStats] = useState({
    cand1: 0,
    cand2: 0,
    cand3: 0,
    returned: 0,
  });

  const p1 = useMemo(
    () => (pattern1 || "").trim().toUpperCase().replace(/\s+/g, ""),
    [pattern1],
  );
  const p2 = useMemo(
    () => (pattern2 || "").trim().toUpperCase().replace(/\s+/g, ""),
    [pattern2],
  );
  const p3 = useMemo(
    () => (pattern3 || "").trim().toUpperCase().replace(/\s+/g, ""),
    [pattern3],
  );

  const cells1 = useMemo(() => (p1.endsWith("*") ? p1.slice(0, -1) : p1), [p1]);
  const cells2 = useMemo(() => (p2.endsWith("*") ? p2.slice(0, -1) : p2), [p2]);
  const cells3 = useMemo(() => (p3.endsWith("*") ? p3.slice(0, -1) : p3), [p3]);

  const useThird = Boolean(p3);

  useEffect(() => {
    if (pos1 && pos1 > cells1.length) setPos1(null);
  }, [cells1.length, pos1]);
  useEffect(() => {
    if (pos2 && pos2 > cells2.length) setPos2(null);
  }, [cells2.length, pos2]);
  useEffect(() => {
    if (pos3a && pos3a > cells3.length) setPos3a(null);
  }, [cells3.length, pos3a]);
  useEffect(() => {
    if (pos3b && pos3b > cells3.length) setPos3b(null);
  }, [cells3.length, pos3b]);

  const dirOk2 = dir1 !== dir2;
  const dirOk13 = dir1 !== dir3;
  const dirOk23 = dir2 !== dir3;

  const constraintsOk = useMemo(() => {
    if (!p1 || !p2) return false;
    if (!useThird) return Boolean(pos1 && pos2 && dirOk2);
    return Boolean(pos1 && pos3a && pos2 && pos3b && dirOk13 && dirOk23);
  }, [p1, p2, useThird, pos1, pos2, pos3a, pos3b, dirOk2, dirOk13, dirOk23]);

  const preview = useMemo(() => {
    if (!constraintsOk) return null;

    const placeWord = (chars, startX, startY, isH) => {
      const pts = [];
      for (let i = 0; i < chars.length; i++) {
        pts.push({
          x: startX + (isH ? i : 0),
          y: startY + (isH ? 0 : i),
          ch: chars[i],
        });
      }
      return pts;
    };

    const cx1 = 12;
    const cy1 = 6;

    const is1H = dir1 === "H";
    const is2H = dir2 === "H";
    const is3H = dir3 === "H";

    const start3x = is3H ? cx1 - (pos3a - 1) : cx1;
    const start3y = is3H ? cy1 : cy1 - (pos3a - 1);

    const start1x = is1H ? cx1 - (pos1 - 1) : cx1;
    const start1y = is1H ? cy1 : cy1 - (pos1 - 1);

    const cx2 = start3x + (is3H ? pos3b - 1 : 0);
    const cy2 = start3y + (is3H ? 0 : pos3b - 1);

    const start2x = is2H ? cx2 - (pos2 - 1) : cx2;
    const start2y = is2H ? cy2 : cy2 - (pos2 - 1);

    const points = [];
    points.push(...placeWord(cells1, start1x, start1y, is1H));
    points.push(...placeWord(cells2, start2x, start2y, is2H));
    if (useThird) points.push(...placeWord(cells3, start3x, start3y, is3H));

    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));

    const W = maxX - minX + 1;
    const H = maxY - minY + 1;

    const grid = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => "·"),
    );

    for (const pt of points) {
      const gx = pt.x - minX;
      const gy = pt.y - minY;
      const prev = grid[gy][gx];
      if (prev !== "·" && prev !== pt.ch) grid[gy][gx] = "!";
      else grid[gy][gx] = pt.ch;
    }

    return grid.map((row) => row.join(" ")).join("\n");
  }, [
    constraintsOk,
    dir1,
    dir2,
    dir3,
    pos1,
    pos2,
    pos3a,
    pos3b,
    cells1,
    cells2,
    cells3,
    useThird,
  ]);

  const fetchCandidates = useCallback(async (pattern, limit) => {
    const p = (pattern || "").trim().toUpperCase();
    if (!p) return [];

    const hasStar = p.endsWith("*");
    const core = hasStar ? p.slice(0, -1) : p;
    const like = buildLikeFromPattern(pattern);
    if (!like) return [];

    const sql = `
      SELECT
        rowid,
        base,
        normalise,
        longueur,
        source,
        actif,
        favoris,
        (SELECT COUNT(*) FROM definitions d WHERE d.mot_normalise = mots_fr_filtre.normalise) AS nb_definitions
      FROM mots_fr_filtre
      WHERE normalise LIKE ?
      ORDER BY favoris DESC, nb_definitions DESC, base COLLATE NOCASE ASC
      LIMIT ${Number(limit) || 1200}
    `;
    const r = query(sql, [like]);
    return Array.isArray(r) ? r : r?.rows || [];
  }, []);

  const solve = useCallback(async () => {
    if (!p1 || !p2 || !constraintsOk) {
      setSolutions([]);
      setStats({ cand1: 0, cand2: 0, cand3: 0, returned: 0 });
      return;
    }

    setLoading(true);
    try {
      if (!useThird) {
        const [cand1, cand2] = await Promise.all([
          fetchCandidates(p1, limitCandidates),
          fetchCandidates(p2, limitCandidates),
        ]);

        const i1 = pos1 - 1;
        const i2 = pos2 - 1;

        const index2 = new Map();
        for (const r of cand2) {
          const n = (r.normalise || "").toUpperCase();
          if (i2 < 0 || i2 >= n.length) continue;
          const L = n[i2];
          if (!index2.has(L)) index2.set(L, []);
          index2.get(L).push(r);
        }

        const out = [];
        for (const a of cand1) {
          const n1 = (a.normalise || "").toUpperCase();
          if (i1 < 0 || i1 >= n1.length) continue;
          const L = n1[i1];
          const matches = index2.get(L) || [];
          for (const b of matches) {
            out.push({
              mot1: a.base,
              mot2: b.base,
              mot3: "",
              l1: a.longueur,
              l2: b.longueur,
              l3: "",
              defs1: a.nb_definitions,
              defs2: b.nb_definitions,
              defs3: "",
            });
            if (out.length >= maxSolutions) break;
          }
          if (out.length >= maxSolutions) break;
        }

        setStats({
          cand1: cand1.length,
          cand2: cand2.length,
          cand3: 0,
          returned: out.length,
        });
        setSolutions(out);
      } else {
        const [cand1, cand2, cand3] = await Promise.all([
          fetchCandidates(p1, limitCandidates),
          fetchCandidates(p2, limitCandidates),
          fetchCandidates(p3, limitCandidates),
        ]);

        const i1 = pos1 - 1;
        const i2 = pos2 - 1;
        const i3a = pos3a - 1;
        const i3b = pos3b - 1;

        const index3 = new Map();
        for (const r of cand3) {
          const n3 = (r.normalise || "").toUpperCase();
          if (i3a < 0 || i3a >= n3.length) continue;
          if (i3b < 0 || i3b >= n3.length) continue;
          const k = `${n3[i3a]}|${n3[i3b]}`;
          if (!index3.has(k)) index3.set(k, []);
          index3.get(k).push(r);
        }

        const index2 = new Map();
        for (const r of cand2) {
          const n2 = (r.normalise || "").toUpperCase();
          if (i2 < 0 || i2 >= n2.length) continue;
          const L2 = n2[i2];
          if (!index2.has(L2)) index2.set(L2, []);
          index2.get(L2).push(r);
        }

        const out = [];
        for (const a of cand1) {
          const n1 = (a.normalise || "").toUpperCase();
          if (i1 < 0 || i1 >= n1.length) continue;
          const L1 = n1[i1];

          for (const [L2, group2] of index2.entries()) {
            const k = `${L1}|${L2}`;
            const group3 = index3.get(k) || [];
            if (!group3.length) continue;

            for (const b of group2) {
              for (const c of group3) {
                out.push({
                  mot1: a.base,
                  mot2: b.base,
                  mot3: c.base,
                  l1: a.longueur,
                  l2: b.longueur,
                  l3: c.longueur,
                  defs1: a.nb_definitions,
                  defs2: b.nb_definitions,
                  defs3: c.nb_definitions,
                });
                if (out.length >= maxSolutions) break;
              }
              if (out.length >= maxSolutions) break;
            }
            if (out.length >= maxSolutions) break;
          }
          if (out.length >= maxSolutions) break;
        }

        setStats({
          cand1: cand1.length,
          cand2: cand2.length,
          cand3: cand3.length,
          returned: out.length,
        });
        setSolutions(out);
      }
    } catch (e) {
      console.error(e);
      setSolutions([]);
      setStats({ cand1: 0, cand2: 0, cand3: 0, returned: 0 });
    } finally {
      setLoading(false);
    }
  }, [
    p1,
    p2,
    p3,
    useThird,
    constraintsOk,
    fetchCandidates,
    limitCandidates,
    maxSolutions,
    pos1,
    pos2,
    pos3a,
    pos3b,
  ]);

  useEffect(() => {
    const t = setTimeout(solve, 250);
    return () => clearTimeout(t);
  }, [solve]);

  const cols = useMemo(() => {
    const base = [
      { field: "mot1", headerName: "Mot 1", flex: 1, minWidth: 160 },
      { field: "mot2", headerName: "Mot 2", flex: 1, minWidth: 160 },
    ];
    if (useThird)
      base.splice(2, 0, {
        field: "mot3",
        headerName: "Mot 3",
        flex: 1,
        minWidth: 160,
      });
    base.push(
      { field: "l1", headerName: "L1", width: 80 },
      { field: "l2", headerName: "L2", width: 80 },
    );
    if (useThird) base.push({ field: "l3", headerName: "L3", width: 80 });
    base.push(
      { field: "defs1", headerName: "Defs1", width: 90 },
      { field: "defs2", headerName: "Defs2", width: 90 },
    );
    if (useThird) base.push({ field: "defs3", headerName: "Defs3", width: 90 });
    return base;
  }, [useThird]);

  const PatternCells = ({ label, cells, selectedPos, onPick }) => {
    const arr = (cells || "").split("");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontWeight: 800 }}>{label}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {arr.map((ch, idx) => {
            const pos = idx + 1;
            const active = selectedPos === pos;
            return (
              <button
                key={idx}
                style={{
                  ...ui.button,
                  width: 34,
                  height: 34,
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: active ? "CanvasText" : "Canvas",
                  color: active ? "Canvas" : "CanvasText",
                }}
                onClick={() => onPick(pos)}
                title={`Position ${pos}`}
              >
                {ch || "_"}
              </button>
            );
          })}
        </div>
        <div style={{ opacity: 0.75 }}>
          {selectedPos
            ? `Croisement: position ${selectedPos}`
            : "Clique une case pour définir le croisement"}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        padding: 16,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 0,
      }}
    >
      <h2 style={ui.h2}>Recherche — Croisement (2 ou 3 mots)</h2>

      <div style={ui.card}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontWeight: 800 }}>Mot 1</div>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                Orientation
                <select
                  value={dir1}
                  onChange={(e) => setDir1(e.target.value)}
                  style={ui.select}
                >
                  <option value="H">Horizontal</option>
                  <option value="V">Vertical</option>
                </select>
              </label>
            </div>
            <input
              value={pattern1}
              onChange={(e) => setPattern1(e.target.value)}
              placeholder="Pattern mot 1 (ex: TE__ ou TE__*)"
              style={ui.input}
            />
            {useThird ? (
              <PatternCells
                label="Croisement Mot 1 ↔ Mot 3 (clic Mot 1)"
                cells={cells1}
                selectedPos={pos1}
                onPick={setPos1}
              />
            ) : (
              <PatternCells
                label="Croisement Mot 1 ↔ Mot 2 (clic Mot 1)"
                cells={cells1}
                selectedPos={pos1}
                onPick={setPos1}
              />
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontWeight: 800 }}>Mot 2</div>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                Orientation
                <select
                  value={dir2}
                  onChange={(e) => setDir2(e.target.value)}
                  style={ui.select}
                >
                  <option value="H">Horizontal</option>
                  <option value="V">Vertical</option>
                </select>
              </label>
            </div>
            <input
              value={pattern2}
              onChange={(e) => setPattern2(e.target.value)}
              placeholder="Pattern mot 2 (ex: _A__* ou ____)"
              style={ui.input}
            />
            {useThird ? (
              <PatternCells
                label="Croisement Mot 2 ↔ Mot 3 (clic Mot 2)"
                cells={cells2}
                selectedPos={pos2}
                onPick={setPos2}
              />
            ) : (
              <PatternCells
                label="Croisement Mot 1 ↔ Mot 2 (clic Mot 2)"
                cells={cells2}
                selectedPos={pos2}
                onPick={setPos2}
              />
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontWeight: 800 }}>Mot 3 (optionnel)</div>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                Orientation
                <select
                  value={dir3}
                  onChange={(e) => setDir3(e.target.value)}
                  style={ui.select}
                >
                  <option value="H">Horizontal</option>
                  <option value="V">Vertical</option>
                </select>
              </label>
            </div>
            <input
              value={pattern3}
              onChange={(e) => setPattern3(e.target.value)}
              placeholder="Pattern mot 3 (si vide => mode 2 mots)"
              style={ui.input}
            />

            {useThird ? (
              <>
                <PatternCells
                  label="Croisement Mot 3 ↔ Mot 1 (clic Mot 3)"
                  cells={cells3}
                  selectedPos={pos3a}
                  onPick={setPos3a}
                />
                <PatternCells
                  label="Croisement Mot 3 ↔ Mot 2 (clic Mot 3)"
                  cells={cells3}
                  selectedPos={pos3b}
                  onPick={setPos3b}
                />
              </>
            ) : (
              <div style={{ opacity: 0.75 }}>
                Remplis Mot 3 pour activer le mode 3 mots (Mot 1 ↔ Mot 3 et Mot
                2 ↔ Mot 3).
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            Candidats max / mot
            <input
              type="number"
              value={limitCandidates}
              onChange={(e) => setLimitCandidates(Number(e.target.value))}
              style={{ ...ui.input, minWidth: 140, flex: 0 }}
            />
          </label>

          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            Solutions max
            <input
              type="number"
              value={maxSolutions}
              onChange={(e) => setMaxSolutions(Number(e.target.value))}
              style={{ ...ui.input, minWidth: 140, flex: 0 }}
            />
          </label>

          <button style={ui.button} onClick={solve} disabled={loading}>
            {loading ? "Recherche..." : "Recalculer"}
          </button>

          <div style={{ opacity: 0.75 }}>
            candidats: {stats.cand1} / {stats.cand2}
            {useThird ? ` / ${stats.cand3}` : ""} — solutions: {stats.returned}
          </div>

          {!useThird && !dirOk2 ? (
            <div style={{ opacity: 0.9 }}>
              Pour un croisement, mets une orientation Horizontal et l’autre
              Vertical.
            </div>
          ) : null}
          {useThird && (!dirOk13 || !dirOk23) ? (
            <div style={{ opacity: 0.9 }}>
              Mot 3 doit croiser Mot 1 et Mot 2 : donc Mot 3 doit être
              d’orientation différente de Mot 1 ET de Mot 2.
            </div>
          ) : null}
        </div>

        {preview ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
              Contrôle visuel
            </div>
            <pre
              style={{
                margin: 0,
                padding: 10,
                border: "1px solid",
                borderColor: "CanvasText",
                background: "Canvas",
              }}
            >
              {preview}
            </pre>
            <div style={{ opacity: 0.75, marginTop: 6 }}>
              “!” = conflit (lettres différentes au même point). “·” = vide.
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 12, opacity: 0.75 }}>
            Renseigne les patterns, mets les orientations, puis clique les cases
            de croisement (et Mot 3 si utilisé).
          </div>
        )}
      </div>

      <div className="ag-theme-quartz" style={{ flex: 1, minHeight: 0 }}>
        <AgGridReact
          theme="legacy"
          rowData={solutions}
          columnDefs={cols}
          defaultColDef={{ resizable: true, sortable: true, filter: true }}
          pagination={true}
          paginationPageSize={50}
        />
      </div>
    </div>
  );
}

/* -----------------------------
   APP
------------------------------ */
export default function App() {
  const [active, setActive] = useState("mots"); // "mots" | "pattern" | "cross"
  const [dirty, setDirty] = useState(false);

  const onDirty = useCallback(() => {
    setDirty(true);
  }, []);

  if (!WEB_ONLY) {
    return <div style={{ padding: 16 }}>WEB_ONLY est désactivé.</div>;
  }

  return (
    <WebDbGate>
      {({ hasDb, exportDb, clearDb }) => (
        <div style={ui.page}>
          <div style={ui.topbar}>
            <button
              style={ui.navBtn(active === "mots")}
              onClick={() => setActive("mots")}
            >
              Mots
            </button>
            <button
              style={ui.navBtn(active === "pattern")}
              onClick={() => setActive("pattern")}
            >
              Pattern
            </button>
            <button
              style={ui.navBtn(active === "cross")}
              onClick={() => setActive("cross")}
            >
              Croisement
            </button>

            <div style={{ flex: 1 }} />

            <button
              style={{
                ...ui.button,
                background: dirty ? "#b00020" : "Canvas",
                color: dirty ? "white" : "CanvasText",
                borderColor: dirty ? "#b00020" : "CanvasText",
                fontWeight: dirty ? 800 : 400,
                opacity: hasDb ? 1 : 0.6,
              }}
              disabled={!hasDb}
              onClick={async () => {
                const ok = await exportDb();
                if (ok) setDirty(false);
              }}
              title={
                !hasDb
                  ? "Charge une base pour pouvoir exporter"
                  : "Exporter la base SQLite"
              }
            >
              Exporter la base{dirty ? " *" : ""}
            </button>

            <button
              style={{
                ...ui.button,
                opacity: hasDb ? 1 : 0.6,
              }}
              disabled={!hasDb}
              onClick={async () => {
                const ok = await clearDb();
                if (ok) setDirty(false);
              }}
              title={
                !hasDb
                  ? "Aucune base chargée"
                  : "Supprime la base stockée dans le navigateur"
              }
            >
              Oublier la base
            </button>
          </div>

          <div style={ui.content}>
            {active === "mots" && <PageMots onDirty={onDirty} />}
            {active === "pattern" && <PagePattern />}
            {active === "cross" && <PageCroisement />}
          </div>
        </div>
      )}
    </WebDbGate>
  );
}
