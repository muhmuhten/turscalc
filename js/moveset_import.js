function placeBsBtn() {
	$("#import.bs-btn").click(function () {
		var pokes = document.getElementsByClassName("import-team-text")[0].value;
		addSets(pokes);
	});
}

function ExportPokemon(pokeInfo) {
	var pokemon = new Pokemon(pokeInfo);
	var EV_counter = 0;
	var finalText = "";
	finalText = pokemon.name + (pokemon.item ? " @ " + pokemon.item : "") + "\n";
	finalText += pokemon.nature && gen > 2 ? pokemon.nature + " Nature" + "\n" : "";
	finalText += pokemon.ability ? "Ability: " + pokemon.ability + "\n" : "";
	if (gen > 2) {
		finalText += "EVs: ";
		var EVs_Array = [];
		if (pokemon.HPEVs && pokemon.HPEVs > 0) { // Do HP EVs exist and are they greater than 0?
			EV_counter += pokemon.HPEVs;
			EVs_Array.push(pokemon.HPEVs + " HP");
		}
		for (var stat in pokemon.evs) {
			EV_counter += pokemon.evs[stat];
			if (EV_counter > 510) {
				break;
			} else if (pokemon.evs[stat]) {
				EVs_Array.push(pokemon.evs[stat] + " " + toSmogonStat(stat));
			}
		}
		finalText += serialize(EVs_Array, " / ");
		finalText += "\n";
	}
	var movesArray = [];
	for (var i = 0; i < 4; i++) {
		var moveName = pokemon.moves[i].name;
		if (moveName !== "(No Move)") {
			finalText += "- " + moveName + "\n";
		}
	}
	finalText = finalText.trim();
	$("textarea.import-team-text").val(finalText);
}

$("#exportL").click(function () {
	ExportPokemon($("#p1"));
});

$("#exportR").click(function () {
	ExportPokemon($("#p2"));
});

function serialize(array, separator) {
	var text = "";
	for (var i = 0; i < array.length; i++) {
		if (i < array.length - 1) {
			text += array[i] + separator;
		} else {
			text += array[i];
		}
	}
	return text;
}

function getAbility(row) {
	var ability = row[1] ? row[1].trim() : '';
	if (ABILITIES_SM.indexOf(ability) !== -1) {
		return (ability);
	} else {
		return;
	}

}

function statConverter(stat) {
	switch (stat) {
	case 'hp':
		return "hp";
	case 'atk':
		return "at";
	case 'def':
		return "df";
	case 'spa':
		return "sa";
	case 'spd':
		return "sd";
	case 'spe':
		return "sp";

	}


}

function getStats(currentPoke, rows, offset) {
	currentPoke.nature = "Serious";
	var currentEV;
	var currentIV;
	var currentNature;
	currentPoke.level = 100;
	for (var x = offset; x < offset + 7; x++) {
		var currentRow = rows[x] ? rows[x].split(/[/:]/) : '';
		var evs = {};
		var ivs = {};
		var ev;
		var j;

		switch (currentRow[0]) {
		case 'Level':
			currentPoke.level = parseInt(currentRow[1].trim());
			break;
		case 'EVs':
			for (j = 1; j < currentRow.length; j++) {
				currentEV = currentRow[j].trim().split(" ");
				currentEV[1] = statConverter(currentEV[1].toLowerCase());
				evs[currentEV[1]] = parseInt(currentEV[0]);
			}
			currentPoke.evs = evs;
			break;
		case 'IVs':
			for (j = 1; j < currentRow.length; j++) {
				currentIV = currentRow[j].trim().split(" ");
				currentIV[1] = statConverter(currentIV[1].toLowerCase());
				ivs[currentIV[1]] = parseInt(currentIV[0]);
			}
			currentPoke.ivs = ivs;
			break;

		}
		currentNature = rows[x] ? rows[x].trim().split(" ") : '';
		if (currentNature[1] == "Nature") {
			currentPoke.nature = currentNature[0];

		}
	}
	return currentPoke;


}

function getItem(currentRow, j) {
	for (;j < currentRow.length; j++) {
		var item = currentRow[j].trim();
		if (ITEMS_SM.indexOf(item) != -1) {
			return item;

		}
	}
	return;

}

function getMoves(currentPoke, rows, offset) {
	var movesFound = false;
	var moves = [];
	for (var x = offset; x < offset + 12; x++) {

		if (rows[x]) {
			if (rows[x][0] == "-") {
				movesFound = true;

				var move = rows[x].substr(2, rows[x].length - 2).replace("[", "").replace("]", "").replace("  ", "");
				moves.push(move);

			} else {
				if (movesFound == true) {
					break;

				}

			}
		}
	}
	currentPoke.moves = moves;
	return currentPoke;


}

function addToDex(poke) {
	var dexObject = {};
	if (SETDEX_SM[poke.name] == undefined) SETDEX_SM[poke.name] = {};
	if (SETDEX_XY[poke.name] == undefined) SETDEX_XY[poke.name] = {};
	if (SETDEX_BW[poke.name] == undefined) SETDEX_BW[poke.name] = {};
	if (SETDEX_DPP[poke.name] == undefined) SETDEX_DPP[poke.name] = {};
	if (SETDEX_ADV[poke.name] == undefined) SETDEX_ADV[poke.name] = {};
	if (SETDEX_GSC[poke.name] == undefined) SETDEX_GSC[poke.name] = {};
	if (SETDEX_RBY[poke.name] == undefined) SETDEX_RBY[poke.name] = {};

	if (poke.ability !== undefined) {
		dexObject.ability = poke.ability;

	}
	dexObject.level = poke.level;
	dexObject.evs = poke.evs;
	dexObject.ivs = poke.ivs;
	dexObject.moves = poke.moves;
	dexObject.nature = poke.nature;
	dexObject.item = poke.item;
	dexObject.isCustomSet = poke.isCustomSet;
	var customsets;
	if (localStorage.customsets) {
		customsets = JSON.parse(localStorage.customsets);
	} else {
		customsets = {};
	}
	if (!customsets[poke.name]) {
		customsets[poke.name] = {};
	}
	customsets[poke.name][poke.nameProp] = dexObject;
	if (poke.name === "Aegislash-Blade") {
		if (!customsets["Aegislash-Shield"]) {
			customsets["Aegislash-Shield"] = {};
		}
		customsets["Aegislash-Shield"][poke.nameProp] = dexObject;
	}
	updateDex(customsets);
}

function updateDex(customsets) {
	for (var pokemon in customsets) {
		for (var setdex of [SETDEX_SM, SETDEX_XY, SETDEX_BW, SETDEX_DPP, SETDEX_ADV, SETDEX_GSC, SETDEX_RBY]) {
			if (pokemon in setdex)
				setdex[pokemon] = {...setdex[pokemon], ...customsets[pokemon]}
		}
	}
	setdex = customsets;
	setOptions = getSetOptions();
	localStorage.customsets = JSON.stringify(customsets);
}

function addSets(pokes) {
	localStorage.removeItem("customsets");
	var rows = pokes.split("\n");
	var currentRow;
	var currentPoke;
	var addedpokes = 0;
	for (var i = 0; i < rows.length; i++) {
		currentRow = rows[i].split(/[()@]/);
		for (var j = 0; j < currentRow.length; j++) {
			currentRow[j] = checkExeptions(currentRow[j].trim());
			if (POKEDEX_SM[currentRow[j].trim()] !== undefined) {
				currentPoke = POKEDEX_SM[currentRow[j].trim()];
				currentPoke.name = currentRow[j].trim();
				currentPoke.item = getItem(currentRow, j + 1);
				if (j === 1 && currentRow[0].trim()) {
					currentPoke.nameProp = currentRow[0].trim();
				} else {
					currentPoke.nameProp = "Custom Set";
				}
				currentPoke.isCustomSet = true;
				currentPoke.ab = getAbility(rows[i + 1].split(":"));
				currentPoke = getStats(currentPoke, rows, i + 1);
				currentPoke = getMoves(currentPoke, rows, i);
				addToDex(currentPoke);
				addedpokes++;
			}
		}
	}
	if (addedpokes > 0) {
		alert("Successfully imported " + addedpokes + " set(s)");
		$(bothPokemon(".importedSetsOptions")).css("display", "inline");
	} else {
		alert("No sets imported, please check your syntax and try again");
	}
}

function checkExeptions(poke) {
	switch (poke) {
	case 'Aegislash':
		poke = "Aegislash-Blade";
		break;
	case 'Basculin-Blue-Striped':
		poke = "Basculin";
		break;
	case 'Keldeo-Resolute':
		poke = "Keldeo";
		break;
	case 'Mimikyu-Busted-Totem':
		poke = "Mimikyu-Totem";
		break;
	case 'Mimikyu-Busted':
		poke = "Mimikyu";
		break;
	case 'Pikachu-Alola':
	case 'Pikachu-Belle':
	case 'Pikachu-Cosplay':
	case 'Pikachu-Hoenn':
	case 'Pikachu-Kalos':
	case 'Pikachu-Libre':
	case 'Pikachu-Original':
	case 'Pikachu-Partner':
	case 'Pikachu-PhD':
	case 'Pikachu-Pop-Star':
	case 'Pikachu-Rock-Star':
	case 'Pikachu-Sinnoh':
	case 'Pikachu-Unova':
		poke = "Pikachu";
		break;
	case 'Vivillon-Fancy':
	case 'Vivillon-Pokeball':
		poke = "Vivillon";
		break;
	}
	return poke;

}

$("#clearSets").click(function () {
	if (confirm("Are you sure you want to delete your custom sets? This action cannot be undone.")) {
		localStorage.removeItem("customsets");
		alert("Custom Sets successfully cleared. Please refresh the page.");
		$(bothPokemon(".importedSetsOptions")).hide();
		loadDefaultLists();
	}
});

$(bothPokemon(".importedSets")).click(function () {
	var pokeID = $(this).parent().parent().prop("id");
	var showCustomSets = $(this).prop("checked");
	if (showCustomSets) {
		loadCustomList(pokeID);
	} else {
		loadDefaultLists();
	}
});

$(document).ready(function () {
	var customSets = CUSTOM_SETS || {};
	if (localStorage.customsets)
		customSets = JSON.parse(localStorage.customsets);
	placeBsBtn();
	updateDex(customSets);

	if (customSets.Gliscor) {
		var id = "Gliscor (" + Object.keys(customSets.Gliscor)[0] + ")";
		// XXX just fake it lol
		$(".set-selector .select2-chosen").text(id);
		$(".set-selector").val(id);
		$(".set-selector").change();
		$(".set-selector .select2-chosen").text(id);
	}

	$(bothPokemon(".importedSetsOptions")).css("display", "inline");

	document.querySelector("textarea.import-team-text").oninput = evt => {
		const selectors = {
			"1": "#p1 .move1 input.move-pp",
			"2": "#p1 .move2 input.move-pp",
			"3": "#p1 .move3 input.move-pp",
			"4": "#p1 .move4 input.move-pp",
			"q": "#p2 .move1 input.move-pp",
			"w": "#p2 .move2 input.move-pp",
			"e": "#p2 .move3 input.move-pp",
			"r": "#p2 .move4 input.move-pp",
		};
		const counts = {"z": 0, "x": 0, "c": 0, "v": 0};
		for (const ch in selectors)
			counts[ch] = 0;
		for (const ch of evt.target.value)
			counts[ch] = (counts[ch] || 0) + 1;
		for (const ch in selectors) {
			const el = document.querySelector(selectors[ch]);
			el.value = el.max - counts[ch];
		}
		if (counts.x || counts.c) {
			const el = document.querySelector("#p2 .at .boost");
			el.selectedIndex = el.querySelector("[selected]").index + counts.x - counts.c;
		}
		if (counts.z || counts.v) {
			const el = document.querySelector("#p1 .at .boost");
			el.selectedIndex = el.querySelector("[selected]").index + counts.z - counts.v;
		}
	};
});
