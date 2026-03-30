// src/lib/nhfImport.ts
// Henter terminlisten fra Håndballforbundets "Åpne i Excel"-link
// og parser HTML-tabellen (den returnerer en HTML-tabell, ikke en ekte .xls-fil).

export interface ParsedMatch {
    date: string;
    matchNumber: string;
    venue: string;
    homeTeam: string;
    awayTeam: string;
    result: string; // "H-B" fra tabellen, f.eks "30-19" eller tom streng
}

/**
 * Konverterer en lag-side URL til Excel-eksport URL.
 * Input:  https://www.handball.no/system/kamper/lag/?lagid=821405
 * Output: https://www.handball.no/AjaxData/TerminlisteLag?id=821405
 */
export function buildExcelUrl(lagUrl: string): string {
    const lagidMatch = lagUrl.match(/lagid=(\d+)/i);
    if (!lagidMatch) {
        throw new Error('Kunne ikke finne lag-ID fra lenken. Sørg for at den inneholder "lagid=XXXXX".');
    }
    return `https://www.handball.no/AjaxData/TerminlisteLag?id=${lagidMatch[1]}`;
}

/**
 * Henter terminlisten fra NHF via Excel-URL-en (som returnerer HTML-tabell)
 * og parser ut kampene.
 */
export async function fetchAndParseSchedule(lagUrl: string): Promise<ParsedMatch[]> {
    if (!lagUrl) throw new Error('URL mangler.');

    // Godta enten lag-side-URL eller direkte Excel-URL
    let excelUrl: string;
    if (lagUrl.includes('AjaxData/TerminlisteLag')) {
        excelUrl = lagUrl;
    } else if (lagUrl.includes('lagid=')) {
        excelUrl = buildExcelUrl(lagUrl);
    } else {
        throw new Error('Ugyldig lenke. Lim inn lagets side fra handball.no (den som inneholder "lagid=").');
    }

    try {
        // Bruk allorigins proxy for å omgå CORS
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(excelUrl)}`;
        const res = await fetch(proxyUrl);

        if (!res.ok) {
            throw new Error(`Klarte ikke koble til handball.no (Status: ${res.status})`);
        }

        const htmlText = await res.text();

        if (!htmlText.includes('<table') && !htmlText.includes('<tr')) {
            throw new Error('Svaret fra handball.no inneholdt ingen terminliste-tabell. Sjekk at lenken er riktig.');
        }

        return parseHtmlTable(htmlText);
    } catch (err: any) {
        console.error('NHF Import Error:', err);
        throw new Error(err.message || 'En ukjent feil oppstod ved henting av terminlisten.');
    }
}

/**
 * Parser en HTML-tabell som NHF returnerer fra "Åpne i Excel"-endepunktet.
 * Kolonnene er: Tid | Kampnr | Bane | Hjemmelag | Bortelag | H-B
 */
function parseHtmlTable(html: string): ParsedMatch[] {
    const matches: ParsedMatch[] = [];

    // Bruk DOMParser i nettleseren for å trygt parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('tr');

    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        if (cells.length < 5) continue; // Hopp over header-rader og tomme rader

        const tidRaw = cells[0]?.textContent?.trim() || '';
        const kampnr = cells[1]?.textContent?.trim() || '';
        const bane = cells[2]?.textContent?.trim() || '';
        const hjemmelag = cells[3]?.textContent?.trim() || '';
        const bortelag = cells[4]?.textContent?.trim() || '';
        const resultat = cells[5]?.textContent?.trim() || '';

        if (!hjemmelag || !bortelag) continue;

        // Parse dato: "06.09.25 13:30" → ISO string
        let dateIso = new Date().toISOString();
        try {
            const dateMatch = tidRaw.match(/(\d{2})\.(\d{2})\.(\d{2,4})\s*(\d{2}):(\d{2})/);
            if (dateMatch) {
                const day = parseInt(dateMatch[1]);
                const month = parseInt(dateMatch[2]) - 1;
                let year = parseInt(dateMatch[3]);
                if (year < 100) year += 2000; // 25 → 2025
                const hour = parseInt(dateMatch[4]);
                const minute = parseInt(dateMatch[5]);
                const dateObj = new Date(year, month, day, hour, minute);
                if (!isNaN(dateObj.getTime())) {
                    dateIso = dateObj.toISOString();
                }
            }
        } catch {
            // Fallback til nå-tid
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
