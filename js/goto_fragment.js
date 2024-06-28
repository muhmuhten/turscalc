/* global getSetOptions, setdex, pokedex, items, abilities, moves, NATURES, $, gen */
(() => {
	"use strict";

	const normalizeName = s => s.replaceAll("’", "'").replaceAll("'", "")
		.replace(/^(Porygon2)\W+/, (_, s) => s) // lol
		.replaceAll(/\d+/g, s => " "+s)
		.replaceAll(/\W+(.?)/g, (_, s) => " " + s.toUpperCase());

	const makePattern = s => RegExp(normalizeName(s).replaceAll(/\W*(?!^)(\d+|[^a-z])/g, (_, s) => ".*"+s));

	const getReferenceSets = o => {
		o ??= getSetOptions();
		let j = 0;
		for (; j < o.length; j++) {
			if (o[j].pokemon && !o[j].set)
				break;
		}

		const index = {};
		for (; j < o.length; j++) {
			let setName = o[j].set;
			if (!setName || o[j].isCustom)
				continue;
			if (setName == "Blank Set")
				setName = o[j].pokemon + "0";
			index[normalizeName(setName)] ??= j;
		}
		return index;
	};

	const normalizeList = xs => xs.map(normalizeName).sort().sort((a, b) => a.length-b.length);

	const minimizeRepresentative = pop => {
		const patternCache = {"": normalizeList(pop)};
		return n => {
			const m = normalizeName(n);
			const seg1 = m.split(" ").map(s => Array.from({"length": s.length+1}, (ch, j) => s.slice(0, j)));
			const seg2 = Array.from(seg1, (xs, j) => {
				const first = new Set();
				for (const x of xs) {
					for (const j in x)
						first.add(x.slice(j));
				}
				return [[...first].sort((a, b) => a.length - b.length), ...seg1.slice(j+1)];
			});

			const allPats = new Set();
			const rec = (acc, fst, ...rst) => {
				if (fst == null)
					return allPats.add(acc);
				for (const s of fst)
					rec(acc+s, ...rst);
			};
			for (const segs of seg2)
				rec("", ...segs);

			const groupedPats = [[""]];
			for (const sub of allPats)
				(groupedPats[sub.length] ??= []).push(sub);

			for (const level of groupedPats) {
				const viable = [];
				for (const pat of level) {
					const matches = patternCache[pat] ??= (rpat => patternCache[pat.slice(1)].filter(e => rpat.test(e)))(makePattern(pat));
					// if (matches.filter(e => e.length <= m.length).length == 1)
					if (matches[0] == m)
						viable.push([pat, matches.length]);
				}

				if (viable.length) {
					viable.sort((...xs) => ((a, b) => b-a)(...xs.map(x => x[0].replaceAll(/[a-z]/g, "").length)));
					viable.sort((a, b) => a[1]-b[1]);
					//viable.sort((a, b) => b[1]-a[1]);
					return viable[0][0];
				}
			}
		};
	};

	const findPattern = (pop, pat) => {
		const index = {};
		pop.forEach(e => index[normalizeName(e)] = e);
		const rpat = makePattern(pat);
		const test = e => rpat.test(e);
		return index[normalizeList(Object.keys(index)).find(test)];
	};

	const makeFragment = () => {
		const setOptions = getSetOptions();
		const refSets = getReferenceSets(setOptions);
		const minRep = {"set": minimizeRepresentative(Object.keys(refSets))};
		const parts = [gen];

		["#p1", "#p2"].forEach(sel => {
			const root = document.querySelector(sel);
			const setText = root.querySelector(".set-selector .select2-chosen").textContent;
			let setName = normalizeName(setText.match(/\((.*)\)/)[1]);
			if (setName == "Blank Set" || !(setName in refSets))
				setName = normalizeName(setText.replace(/ \(.*/, "") + "0");

			const segs = [minRep.set(setName, Object.keys(refSets))];
			const baseOption = setOptions[refSets[setName]];
			const baseSet = setdex[baseOption.pokemon][baseOption.set] ?? {};
			const baseMon = pokedex[baseOption.pokemon];

			const form = root.querySelector(".forme").selectedIndex;
			if (form)
				segs.push("." + form);

			const itemEl = root.querySelector(".item");
			if (itemEl.value != (baseSet?.item ?? ""))
				segs.push("@", (minRep.item ??= minimizeRepresentative(["", ...items]))(itemEl.value));

			const level = +root.querySelector(".level").value;
			if (level != (baseSet?.level ?? 50))
				segs.push("-L", level);

			const abilityEl = root.querySelector(".ability");
			if (abilityEl.value != (baseSet?.ability ?? baseMon.ab ?? ""))
				segs.push("-", (minRep.ability ??= minimizeRepresentative(abilities))(abilityEl.value));

			let needStats = false;
			const statsList = ["hp", "at", "df", "sa", "sd", "sp"].map(st => {
				const row = root.querySelector("tr."+st);
				// XXX XXX XXX
				const baseStat = +row.querySelector(".base").value;
				const expectedBase = st == "hp" && baseStat == 1 ? 1
					: ((2*baseStat + (31 + ((baseSet?.evs ?? {})[st] ?? 0)/4|0)) * level / 100 |0) + (st == "hp" ? 10 + level : 5);
				const nature = NATURES[baseSet?.nature ?? "Bashful"];
				const expected = (nature[0] == st ? 1.1 : nature[1] == st ? 0.9 : 1) * expectedBase |0;

				const total = +row.querySelector(".total").textContent;
				const stage = +row.querySelector(".boost")?.value || 0;
				const out = [];
				if (total != expected || baseStat != baseMon.bs[st])
					out.push(total);
				if (stage < 0)
					out.push(stage);
				else if (stage > 0)
					out.push("+" + stage);
				if (out.length)
					needStats = true;
				return out.join("");
			});
			if (needStats)
				segs.push("/", statsList.join("/"));

			const smoves = Array.from("1234", k => root.querySelector(`.move${k} .select2-chosen`).textContent);
			const expectedMoves = Array.from(baseSet?.moves ?? {"length": 4}, s => s || "(No Move)");
			if (smoves.join() != expectedMoves.join())
				segs.push(",", smoves.map(minRep.move ??= minimizeRepresentative(Object.keys(moves))).join());

			parts.push(segs.join(""));
		});

		const ppImporterText = document.querySelector(".import-team-text")?.value;
		if (ppImporterText)
			parts.push(ppImporterText);

		location.replace("#" + parts.join(";"));
	};

	document.addEventListener("DOMContentLoaded", () => {
		if (location.hash) {
			const parts = location.hash.split(";");

			const genEl = document.querySelector("#gen"+parts[0].slice(1));
			genEl.checked = true;
			genEl.dispatchEvent(new Event("change"));

			const setOptions = getSetOptions();
			const refSets = getReferenceSets(setOptions);

			for (const side of [1, 2]) {
				const root = document.querySelector("#p"+side);
				const part = parts[side] ?? "";
				const match = /^(\w+)(?:\.(\d+))?(?:@(\w*))?(?:-L(\d+))?(?:-(\w+))?((?:\/\d*(?:[+-]\d)?){6})?((?:,\w*){0,4})?/.exec(part);
				if (match) {
					// XXX jquery black magic I don't understand
					const baseOption = setOptions[refSets[findPattern(Object.keys(refSets), match[1])]];
					$(`#p${side} .set-selector .select2-chosen`).text(baseOption.text);
					$(`#p${side} .set-selector`).val(baseOption.id).change();
					$(`#p${side} .set-selector .select2-chosen`).text(baseOption.text);

					if (match[2]) {
						const formEl = root.querySelector(".forme");
						if (formEl.parentElement.style.display == "none")
							formEl.selectedIndex = 0;
						else
							formEl.selectedIndex = match[2];
						formEl.dispatchEvent(new Event("change"));
					}

					if (match[3] != null) // can be empty...
						root.querySelector(".item").value = findPattern(["", ...items], match[3]);

					if (match[4])
						root.querySelector(".level").value = match[4];

					if (match[5] != null)
						root.querySelector(".ability").value = findPattern(abilities, match[5]);

					if (match[7]) {
						const moveList = Object.keys(moves);
						const moveset = match[7].split(",");
						for (let k = 1; k <= 4; k++) {
							// XXX more jquery black magic
							$(`#p${side} .move${k} .move-selector`).val(findPattern(moveList, moveset[k])).change();
						}
					}

					if (match[6]) {
						const STAT_KEYS = ["hp", "at", "df", "sa", "sd", "sp"];
						const demandedStages = match[6].split("/").slice(1).map(s => +s.match(/([+-]\d)?$/)[1] || 0);

						// The hard part
						const baseSet = setdex[baseOption.pokemon][baseOption.set] ?? {};
						const level = +root.querySelector(".level").value;
						const statInfo = STAT_KEYS.map((st, j) => {
							const baseStat = +root.querySelector(`.${st} .base`).value;
							const normalMin = !j && baseStat == 1 ? 1
								: (2*baseStat * level / 100 |0) + (j ? 5 : 10+level);
							const normalUninv = !j && baseStat == 1 ? 1
								: ((2*baseStat + 31) * level / 100 |0) + (j ? 5 : 10+level);
							const normalMax = !j && baseStat == 1 ? 1
								: ((2*baseStat + 94) * level / 100 |0) + (j ? 5 : 10+level);
							const expectedBase = !j && baseStat == 1 ? 1
								: ((2*baseStat + (31 + ((baseSet?.evs ?? {})[st] ?? 0)/4|0)) * level / 100 |0) + (j ? 5 : 10+level);
							const nature = NATURES[baseSet?.nature ?? "Bashful"];
							return [(nature[0] == st ? 1.1 : nature[1] == st ? 0.9 : 1) * expectedBase |0, normalMin, normalMax, baseStat, normalUninv];
						});

						const demandedStats = match[6].split("/").slice(1).map((s, j) => +s.match(/^\d*/) || statInfo[j][0]);
						const nature = [null, null];
						STAT_KEYS.forEach((st, j) => {
							if (demandedStats[j] > statInfo[j][2] && nature[0] == null) {
								nature[0] = st;
								demandedStats[j] = (demandedStats[j]+1)*10/11|0;
							}
							if (demandedStats[j] < statInfo[j][1] && nature[1] == null) {
								nature[1] = st;
								demandedStats[j] = (demandedStats[j]*10+8)/9|0;
							}
						});
						const statOrder = Array.from({"length": 5}, (_, j) => j+1).sort((a, b) => demandedStats[b] - demandedStats[a]);
						if (nature[0] == null) {
							const j = statOrder.find(j => STAT_KEYS[j] != nature[1] && demandedStats[j] >= (statInfo[j][4]*1.1|0));
							nature[0] = STAT_KEYS[j];
							demandedStats[j] = (demandedStats[j]+1)*10/11|0;
						}
						if (nature[1] == null) {
							const j = statOrder.reverse().find(j => STAT_KEYS[j] != nature[0] && demandedStats[j] <= (statInfo[j][2]*0.9|0));
							nature[1] = STAT_KEYS[j];
							demandedStats[j] = (demandedStats[j]*10+8)/9|0;
						}
						root.querySelector(".nature").value = Object.entries(NATURES).find(e => e[1].join() == nature.join())?.[0] ?? "Gentle";

						STAT_KEYS.forEach((st, j) => {
							const row = root.querySelector("tr."+st);
							if (j)
								row.querySelector(".boost").value = demandedStages[j];

							const ivEvDemand = ((demandedStats[j] - (j ? 5 : 10+level))*100+level-1)/level - 2*statInfo[j][3]|0;
							if (ivEvDemand <= 31) {
								row.querySelector(".ivs").value = ivEvDemand;
								row.querySelector(".evs").value = 0;
							}
							else {
								row.querySelector(".ivs").value = 31;
								row.querySelector(".evs").value = 4*(ivEvDemand-31);
							}
						});
						root.querySelector(".hp .evs").dispatchEvent(new Event("change"));
					}
				}
			}

			if (parts[3]) {
				const ppImporter = document.querySelector(".import-team-text");
				if (ppImporter) {
					ppImporter.value = parts[3];
					ppImporter.dispatchEvent(new Event("input"));
				}
			}
		}
	});

	const origCalculate = window.calculate;
	let needsCalculate = true;
	const deferredCalculate = () => {
		if (needsCalculate) {
			needsCalculate = false;
			origCalculate();
			makeFragment();
		}
	};

	window.calculate = () => {
		needsCalculate = true;
		setTimeout(deferredCalculate, 0);
	};
})();
