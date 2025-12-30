# Crossword — Outil d’aide aux mots croisés
**Accès direct à l’outil en ligne**  
https://vico-de.github.io/crossword/

---

## Présentation

**Crossword** est un outil open-source, page web navigateur, destiné à aider à :

- enrichir un dictionnaire de mots (ajout / édition / suppression),
- gérer des définitions associées aux mots,
- rechercher des mots par **pattern** (ex: `T__`, `T__*`),
- résoudre des **croisements simples** entre 2 ou 3 mots.

L’application fonctionne **sans serveur**, directement dans le navigateur, grâce à :
- SQLite compilé en WebAssembly (`sql.js`),
- stockage local via IndexedDB,
- export manuel du fichier `.db`.

---

## Principe de fonctionnement

1. Charger un fichier **SQLite (.db)** en local.
2. La base est copiée et stockée **localement dans le navigateur**.
3. Travailler librement (ajouts, modifications, suppressions).
4. Lorsque terminé, **exporter manuellement la base** mise à jour.
5. Le fichier exporté doit remplacer le fichier `.db` original.

**Aucune donnée n’est envoyée sur un serveur.**  
Tout reste local au navigateur tant que ce n'est pas exporter.

---

## Format attendu du fichier `.db`

Le fichier doit être une base SQLite valide contenant **au minimum** les tables suivantes.

### Table `mots_fr_filtre`

```sql
CREATE TABLE mots_fr_filtre (
  base TEXT,
  normalise TEXT,
  longueur INTEGER,
  source INTEGER,
  actif INTEGER,
  favoris INTEGER
);
