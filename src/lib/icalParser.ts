// src/lib/nhfImport.ts
// Parser terminliste-data som brukeren kopierer fra handball.no (lim inn tekst).

export interface ParsedMatch {
    date: string;
    matchNumber: string;
    venue: string;
    homeTeam: string;
    awayTeam: string;
    result: string;
}

/**
 * Parser terminliste-tekst som er kopiert og limt inn fra handball.no.
 * Formatet fra handball.no sin tabell er linjeskilt med kolonnene:
 * Tid | Kampnr | Bane | Hjemmelag | Bortelag | H-B
 *
 * Tekst-kopier fra nettsiden gir tab-separerte kolonner, eller
 * det kan komme som mellomrom-separert tekst med dato-mønster som anker.
 */
export function parseScheduleText(text: string): ParsedMatch[] {
    if (!text || !text.trim()) {
        throw new Error('Ingen tekst å importere. Kopier terminlisten fra handball.no og lim inn her.');
    }

    const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    const matches: ParsedMatch[] = [];

    // Mønster for dato+tid: "06.09.25 13:30" eller "06.09.2025 13:30"
    const datePattern = /^(\d{2})\.(\d{2})\.(\d{2,4})\s+(\d{2}):(\d{2})/;

    for (const line of lines) {
        // Sjekk om linjen starter med et dato-mønster
        const dateMatch = line.match(datePattern);
        if (!dateMatch) continue;

        // Prøv å splitte på tabs først (standard kopier-fra-nettside)
        let parts = line.split('\t').map((p) => p.trim());

        // Hvis det ikke er nok tab-separerte deler, prøv å parse linje-mønsteret
        if (parts.length < 5) {
            parts = splitLineIntelligently(line);
        }

        if (parts.length < 5) continue;

        // Kolonner: Tid, Kampnr, Bane, Hjemmelag, Bortelag, [H-B]
        const tidRaw = parts[0];
        const kampnr = parts[1] || '';
        const bane = parts[2] || '';
        const hjemmelag = parts[3] || '';
        const bortelag = parts[4] || '';
        const resultat = parts[5] || '';

        if (!hjemmelag || !bortelag) continue;

        // Parse dato
        let dateIso = new Date().toISOString();
        try {
            const dm = tidRaw.match(datePattern);
            if (dm) {
                const day = parseInt(dm[1]);
                const month = parseInt(dm[2]) - 1;
                let year = parseInt(dm[3]);
                if (year < 100) year += 2000;
                const hour = parseInt(dm[4]);
                const minute = parseInt(dm[5]);
                const dateObj = new Date(year, month, day, hour, minute);
                if (!isNaN(dateObj.getTime())) {
                    dateIso = dateObj.toISOString();
                }
            }
        } catch {
            // Fallback
        }

        matches.push({
            date: dateIso,
            matchNumber: kampnr,
            venue: bane,
            homeTeam: hjemmelag,
            awayTeam: bortelag,
            result: resultat,
        });
    }

    return matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Forsøker å splitte en linje som ikke er tab-separert.
 * Vi bruker kampnummer-mønsteret (langt tall) som anker.
 */
function splitLineIntelligently(line: string): string[] {
    // Dato+tid-del
    const dateMatch = line.match(/^(\d{2}\.\d{2}\.\d{2,4}\s+\d{2}:\d{2})\s+/);
    if (!dateMatch) return [line];

    const tid = dateMatch[1];
    const rest = line.slice(dateMatch[0].length);

    // Kampnummer er et langt tall (8+ sifre)
    const kampnrMatch = rest.match(/^(\d{5,})\s+/);
    if (!kampnrMatch) {
        // Ingen kampnummer, prøv å splitte resten med to eller flere mellomrom
        const remainingParts = rest.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
        return [tid, '', ...remainingParts];
    }

    const kampnr = kampnrMatch[1];
    const afterKampnr = rest.slice(kampnrMatch[0].length);

    // Resten av linja inneholder: Bane, Hjemmelag, Bortelag, [Resultat]
    // Disse er separert med to+ mellomrom, eller med kjente mønster som resultat (tall-tall)
    const resultMatch = afterKampnr.match(/\s+(\d{1,3}-\d{1,3})\s*$/);
    const resultat = resultMatch ? resultMatch[1] : '';
    const beforeResult = resultMatch ? afterKampnr.slice(0, -resultMatch[0].length) : afterKampnr;

    //Split de gjenværende feltene på 2+ mellomrom
    const fields = beforeResult.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);

    if (fields.length >= 3) {
        return [tid, kampnr, fields[0], fields[1], fields[2], resultat];
    }
    if (fields.length === 2) {
        return [tid, kampnr, '', fields[0], fields[1], resultat];
    }

    return [tid, kampnr, ...fields, resultat];
}
