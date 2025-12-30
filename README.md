# Crossword — Outil d’aide aux mots croisés

👉 **Accès direct à l’outil en ligne**  
https://vico-de.github.io/crossword/

---

## Présentation

**Crossword** est un outil open-source, 100 % côté navigateur, destiné à aider à :

- enrichir un dictionnaire de mots (ajout / édition / suppression),
- gérer des définitions associées aux mots,
- rechercher des mots par **pattern** (ex: `TE__`, `TE__*`),
- résoudre des **croisements simples** entre 2 ou 3 mots.

L’application fonctionne **sans serveur**, directement dans le navigateur, grâce à :
- SQLite compilé en WebAssembly (`sql.js`),
- stockage local via IndexedDB,
- export manuel du fichier `.db`.

---

## Principe de fonctionnement

1. Tu charges un fichier **SQLite (.db)** depuis ton ordinateur.
2. La base est copiée et stockée **localement dans ton navigateur**.
3. Tu travailles librement (ajouts, modifications, suppressions).
4. Lorsque tu as terminé, tu **exportes manuellement la base** mise à jour.
5. Le fichier exporté remplace ton fichier `.db` original si besoin.

👉 **Aucune donnée n’est envoyée sur un serveur.**  
Tout reste local à ton navigateur tant que tu n’exportes pas.

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
