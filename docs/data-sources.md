# Sproutine — Data Sources

Last verified: 2026-10-15

## Active Sources

### BLS 4.0 (Bundeslebensmittelschluessel)

| Field | Value |
|---|---|
| Provider | Max Rubner-Institut (MRI), Germany |
| URL | https://blsdb.de/ |
| Licence | **CC BY 4.0** (Creative Commons Attribution 4.0 International) |
| Version | 4.0 (released 16 Dec 2025) |
| Items | ~7,140 foods |
| Nutrients | 138 per item |
| Format | ZIP archive (CSV), file `BLS_4_0_2025_DE.zip` |
| Cost | Free of charge |

**Redistribution**: Permitted. CC BY 4.0 allows copying, redistribution, and adaptation for any purpose including commercial, provided attribution is given.

**Storage in own DB**: Permitted. No restriction on storing derived/cached data.

**Commercial use**: Permitted.

**Attribution text** (required):
> Max Rubner-Institut (2025): Bundeslebensmittelschluessel (BLS), Version 4.0 — Deutsche Naehrstoffdatenbank. Karlsruhe. DOI: 10.25826/Data20251217-134202-0

**Notes**: The BLS FAQ states: "Der BLS 4.0 wird kostenfrei und ohne Lizenzbarrieren bereitgestellt. Die Daten koennen frei genutzt werden — fuer wissenschaftliche Forschung und Lehre, Ernaehrungsberatung und -planung, App- und Softwareentwicklung sowie in der Lebensmittelindustrie." (Free of charge, without licence barriers, explicitly allows app/software development and the food industry.)

---

### Open Food Facts (OFF)

| Field | Value |
|---|---|
| Provider | Open Food Facts (community) |
| URL | https://world.openfoodfacts.org |
| Licence | **ODbL 1.0** (Open Database License) for the database; DbCL 1.0 for individual contents; CC BY-SA 3.0 for images |
| Items | >3 million products worldwide |
| Format | API (JSON), bulk CSV/JSONL exports |
| Cost | Free |

**Redistribution**: Permitted under ODbL share-alike. If we redistribute a "derived database" (a substantially modified version of the OFF data), that derived database must also be ODbL-licensed. However, our `foods` table is a cache of individual lookups, not a bulk redistribution of the database — this is "produced work" under ODbL, not a derived database, so the share-alike clause does not apply to Sproutine's own database schema or code.

**Storage in own DB**: Permitted. Caching individual product lookups in our `foods` table is standard API usage. We do not redistribute the OFF database in bulk.

**Commercial use**: Permitted, subject to attribution and share-alike.

**Attribution text** (required):
> Data from Open Food Facts (https://openfoodfacts.org), available under the Open Database License (ODbL).

**ODbL share-alike analysis**: Our `foods` table caches per-100g nutrients for individual foods looked up by the user. This is "produced work" (output from using the database), not a "derivative database" (a modified form of the database itself). ODbL share-alike applies only to derivative databases, not produced works. We are compliant as long as we attribute OFF and do not bulk-extract and republish the database. See: https://opendatacommons.org/licenses/odbl/1-0/ Section 4.4–4.6.

---

### USDA FoodData Central

| Field | Value |
|---|---|
| Provider | U.S. Department of Agriculture |
| URL | https://fdc.nal.usda.gov |
| Licence | **CC0 1.0** (public domain) |
| Items | >1 million (SR Legacy, Foundation, Branded) |
| Format | API (JSON), bulk CSV downloads |
| Cost | Free (API key required: https://api.data.gov/signup) |

**Redistribution**: Unrestricted. Public domain.

**Storage in own DB**: Unrestricted.

**Commercial use**: Unrestricted.

**Attribution text** (requested, not legally required):
> U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, fdc.nal.usda.gov.

---

## Future Sources (not yet integrated)

### Ciqual (France)

| Field | Value |
|---|---|
| Provider | ANSES (Agence nationale de securite sanitaire), France |
| URL | https://ciqual.anses.fr |
| Licence | **Licence Ouverte / Open Licence** (French government open data licence, compatible with CC BY 2.0) |
| Format | Excel (.xls, .xlsx), XML |
| Cost | Free |

**Attribution text**:
> Anses. 2025. Table de composition nutritionnelle des aliments Ciqual. DOI: https://doi.org/10.57745/RDMHWY

**Notes**: Data must not be altered or misrepresented. Source and version must be cited. Download via ciqual.anses.fr or recherche.data.gouv.fr.

---

### Fineli (Finland)

| Field | Value |
|---|---|
| Provider | Finnish Institute for Health and Welfare (THL) |
| URL | https://fineli.fi |
| Licence | **CC BY 4.0** (stated on site, could not verify — site returned HTTP 403 on 2026-10-15) |
| Format | Web interface; bulk download available (verify) |
| Cost | Free |

**Status**: URL confirmed (redirects correctly). Licence could not be independently verified due to 403 response — needs manual check.

---

### NEVO (Netherlands)

| Field | Value |
|---|---|
| Provider | RIVM (Rijksinstituut voor Volksgezondheid en Milieu) |
| URL | https://www.rivm.nl/en/dutch-food-composition-database |
| Licence | Free to access; copyright page returned 404 — licence terms unconfirmed |
| Items | >2,300 foods, 130+ nutrients |
| Format | Dataset download available (format unspecified) |
| Cost | Free |

**Status**: URL confirmed. Database described as "accessible for free." Specific licence terms could not be verified — copyright/disclaimer page not found. Needs manual check before integration.

---

### Frida (Denmark)

| Field | Value |
|---|---|
| Provider | DTU Food (Technical University of Denmark) |
| URL | https://frida.fooddata.dk (redirects to https://fcdb.fooddata.dk/) |
| Licence | Unconfirmed — site renders client-side only, terms page not accessible |
| Format | Unknown |
| Cost | Free |

**Status**: URL redirects to fcdb.fooddata.dk. Site is a JavaScript SPA; content could not be extracted. Licence needs manual verification before integration.

---

### Swiss Food Composition Database

| Field | Value |
|---|---|
| Provider | Federal Food Safety and Veterinary Office (BLV/FSVO), Switzerland |
| URL | https://naehrwertdaten.ch |
| Licence | Free with attribution (likely open government data, not a named licence) |
| Items | 1,246 foods (v7.1) |
| Format | Downloads available (format unspecified) |
| Cost | Free |

**Attribution**: Source must be cited ("Quellenangabe"). Data may be used for commercial and scientific purposes.

**Status**: URL confirmed. Available in German, French, Italian, English.

---

### CoFID (UK)

| Field | Value |
|---|---|
| Provider | Public Health England (now OHID) |
| URL | https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid |
| Licence | **Open Government Licence v3.0** |
| Format | Excel spreadsheets, PDF user guide |
| Cost | Free |

**Attribution text**:
> Contains public sector information licensed under the Open Government Licence v3.0. Source: Public Health England, Composition of Foods Integrated Dataset (CoFID).

**Status**: URL confirmed. OGL v3.0 permits commercial reuse with attribution.
