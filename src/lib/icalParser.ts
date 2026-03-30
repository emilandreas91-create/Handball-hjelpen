// src/lib/icalParser.ts
export interface ParsedMatch {
    date: string;
    homeTeam: string;
    awayTeam: string;
    location: string;
    description: string;
}

export async function fetchAndParseIcal(url: string): Promise<ParsedMatch[]> {
    if (!url) throw new Error("URL mangler.");

    if (!url.toLowerCase().startsWith('http')) {
        throw new Error("Ugyldig lenke. Den må starte med http:// eller https://");
    }

    try {
        // Vi bruker allorigins for å unngå CORS nettleser-restriksjoner fra handball.no
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        
        if (!res.ok) {
            throw new Error(`Klarte ikke koble til kalenderen (Status: ${res.status})`);
        }
        
        const icalText = await res.text();
        
        if (!icalText.includes('BEGIN:VCALENDAR')) {
            throw new Error("Lenken inneholder ikke en gyldig kalender-fil.");
        }

        return parseIcalText(icalText);
    } catch (err: unknown) {
        console.error("iCal Fetch Error:", err);
        throw new Error(err instanceof Error ? err.message : "En ukjent feil oppstod ved nedlasting av kalender.");
    }
}

function parseIcalText(text: string): ParsedMatch[] {
    const matches: ParsedMatch[] = [];
    
    // iCal bruker ofte lange linjer som "brettes" (folded lines) med mellomrom/tab i starten.
    // Vi reparerer dette først slik at hvert nøkkelord står på én linje.
    const unfoldedText = text.replace(/\r?\n[ \t]/g, '');
    
    const events = unfoldedText.split("BEGIN:VEVENT");
    events.shift(); // Første element er pre-event meta-data
    
    for (const event of events) {
        if (!event.includes("END:VEVENT")) continue;
        
        const summaryMatch = event.match(/SUMMARY:([^\r\n]*)/)?.[1]?.trim() || "";
        const dtstartMatch = event.match(/DTSTART(?:;TZID=[^:]+)?:([^\r\n]*)/)?.[1]?.trim() || "";
        const locationMatch = event.match(/LOCATION:([^\r\n]*)/)?.[1]?.trim() || "";
        const descMatch = event.match(/DESCRIPTION:([^\r\n]*)/)?.[1]?.trim() || "";

        if (!summaryMatch || !dtstartMatch) continue;

        // Tittelen er formatert "Lag A - Lag B" i Håndballforbundet.
        const teams = summaryMatch.split(" - ");
        const homeTeam = teams[0]?.trim() || "Hjemme";
        const awayTeam = teams[1]?.trim() || "Borte";

        let dateIsoStr = new Date().toISOString();
        try {
            // iCal Format: 20240915T180000 eller 20240915T180000Z
            const year = parseInt(dtstartMatch.substring(0, 4));
            const month = parseInt(dtstartMatch.substring(4, 6)) - 1;
            const day = parseInt(dtstartMatch.substring(6, 8));
            
            let dateObj;
            if (dtstartMatch.length >= 15) {
                const hour = parseInt(dtstartMatch.substring(9, 11));
                const minute = parseInt(dtstartMatch.substring(11, 13));
                const second = parseInt(dtstartMatch.substring(13, 15));
                
                if (dtstartMatch.endsWith('Z')) {
                    dateObj = new Date(Date.UTC(year, month, day, hour, minute, second));
                } else {
                    // Vi antar lokaltid Norge (ofte uten Z i TA)
                    dateObj = new Date(year, month, day, hour, minute, second);
                }
            } else {
                // Bare dato uten tid (Sjeldent for kamper, men guard)
                dateObj = new Date(year, month, day);
            }
            
            // Sjekk at datoen er gyldig
            if (!isNaN(dateObj.getTime())) {
                dateIsoStr = dateObj.toISOString();
            }
        } catch {
            // Fallback hvis parset krasjet
        }

        matches.push({
            date: dateIsoStr,
            homeTeam,
            awayTeam,
            location: locationMatch,
            description: descMatch
        });
    }
    
    return matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
