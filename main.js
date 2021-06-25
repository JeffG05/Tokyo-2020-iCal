class OlympicSport {
	constructor(name, categories, icon) {
		this.name = name;
		this.url =
			"https://olympics.com/tokyo-2020/en/schedule/" +
			name.toLowerCase().replace(/ /g, "-").split("/")[0] +
			"-schedule/";
		this.icon = "https://olympics.com" + icon;
		this.categories = {};

		for (let category of categories) {
			this.categories[category.name] = category;
		}
	}

	async getEvents() {
		const htmlText = await fetch(this.url).then((response) => {
			return response.text();
		});
		const htmlEvents = $(htmlText).find(".tk-article__part.markdown");

		for (let htmlEvent of htmlEvents) {
			let h4s = $(htmlEvent).find("h4");
			let uls = $(htmlEvent).find("ul");
			let i = 0;
			while (h4s[i]) {
				let datetimeText = h4s[i].innerText;
				let datetimeTextMatch = datetimeText.match(
					/Date and Time: (.+(?= \d{1,2}:\d{1,2} -)) (\d{1,2}:\d{2}) - (\d{1,2}:\d{2})/
				);
				if (datetimeTextMatch) {
					let start = Date.parse(
						datetimeTextMatch[1] + " 2021 " + datetimeTextMatch[2]
					);
					let end = Date.parse(
						datetimeTextMatch[1] + " 2021 " + datetimeTextMatch[3]
					);

					let locationText = h4s[i + 1].innerText;
					let locationTextMatch = locationText.match(/Venues: (.+)/);
					let location = locationTextMatch[1];

					let nameItems = $(uls[i / 2]).find("li");
					for (let nameItem of nameItems) {
						let name = nameItem.innerText;
						let category = this.findCategory(name);
						let event = new OlympicEvent(
							name,
							location,
							start,
							end
						);
						this.categories[category].addEvent(event);
					}
				}
				i += 2;
			}
		}

		return this.categories;
	}

	findCategory(name) {
		for (let category of Object.keys(this.categories)) {
			if (name.startsWith(category)) {
				return category;
			}
		}
		return null;
	}
}

class OlympicCategory {
	constructor(name, redirect = null) {
		this.name = name;
		this.redirect = redirect;
		this.events = [];
	}

	addEvent(event) {
		event.category = this.name;
		this.events.push(event);
	}
}

class OlympicEvent {
	constructor(name, location, start, end) {
		this.name = name;
		this.location = location;
		this.start = start;
		this.end = end;
	}
}

class CustomCalendar {
	constructor(name) {
		this.name = name;
		this.cal = ics();
	}

	addEvent(name, description, location, start, end, url) {
		this.cal.addEvent(name, description, location, start, end, url);
	}

	download() {
		this.cal.download(this.name);
	}
}

const selectedSports = [];
const allSports = {};

function createSportTile(sport) {
	let html = `
    <div class="sport" onclick="onSportTileClicked(this, '${sport.name}')">
				<img
					src="${sport.icon}"
				/>
				<p>${sport.name}</p>
			</div>
    `;

	document
		.getElementById("sport-collection")
		.insertAdjacentHTML("beforeend", html);
}

function onSportTileClicked(tile, sport) {
	if (tile.classList.contains("selected")) {
		selectedSports.splice(selectedSports.indexOf(sport), 1);
		tile.classList.remove("selected");
	} else {
		selectedSports.push(sport);
		tile.classList.add("selected");
	}
}

function groupCategories(sport) {
	let grouped = {};
	for (let category of Object.values(sport.categories)) {
		for (let event of category.events) {
			let startendlocation =
				event.start.toString() +
				"!@£$%" +
				event.end.toString() +
				"!@£$%" +
				event.location;
			let eventCategory = category.redirect
				? category.redirect
				: event.category;
			let eventName = event.name
				.replace(event.category, "")
				.trim()
				.replace(/^.[ ]/g, "");
			if (startendlocation in grouped) {
				if (eventCategory in grouped[startendlocation]) {
					grouped[startendlocation][eventCategory] = grouped[
						startendlocation
					][eventCategory].concat([eventName]);
				} else {
					grouped[startendlocation][eventCategory] = [eventName];
				}
			} else {
				grouped[startendlocation] = {
					[eventCategory]: [eventName],
				};
			}
		}
	}
	return grouped;
}

async function addSportToCal(ical, sport) {
	await sport.getEvents();
	const sportGrouped = groupCategories(sport);

	for (let startendlocation of Object.keys(sportGrouped)) {
		let start = parseInt(startendlocation.split("!@£$%")[0]);
		let end = parseInt(startendlocation.split("!@£$%")[1]);
		let location = startendlocation.split("!@£$%")[2];

		let description = "";
		for (let category of Object.keys(sportGrouped[startendlocation])) {
			description = description.concat("\\n\\n", category);
			let events = [];
			for (let event of sportGrouped[startendlocation][category]) {
				if (event == "") {
					event = "Main Event";
				}
				events.push(event);
			}
			events = events.sort((a, b) => {
				return a.toLowerCase().localeCompare(b.toLowerCase());
			});
			for (let event of events) {
				description = description.concat("\\n- ", event);
			}
		}

		description = description.slice(4);

		ical.addEvent(sport.name, description, location, start, end, sport.url);
	}
}

async function download() {
	let downloadModal = M.Modal.getInstance(
		document.getElementById("download-modal")
	);
	downloadModal.open();

	const ical = new CustomCalendar(
		selectedSports.length == 1
			? "Tokyo 2020 - " + allSports[selectedSports[0]].name
			: "Tokyo 2020"
	);

	for (let sportname of selectedSports) {
		await addSportToCal(ical, allSports[sportname]);
	}

	ical.download();
}

function setupBasketball3x3() {
	let men = new OlympicCategory("Men's");
	let women = new OlympicCategory("Women's");
	let categories = [men, women];

	let sport = new OlympicSport(
		"3x3 Basketball",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-bk3.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupArchery() {
	let menIndividual = new OlympicCategory("Men's Individual");
	let menTeam = new OlympicCategory("Men's Team");
	let womenIndividual = new OlympicCategory("Women's Individual");
	let womenTeam = new OlympicCategory("Women's Team");
	let mixedTeam = new OlympicCategory("Mixed Team");
	let categories = [
		menIndividual,
		menTeam,
		womenIndividual,
		womenTeam,
		mixedTeam,
	];

	let sport = new OlympicSport(
		"Archery",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-arc.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupArtisticGymnastics() {
	let men = new OlympicCategory("Men's");
	let menTeam = new OlympicCategory("Men's Team");
	let women = new OlympicCategory("Women's");
	let womenTeam = new OlympicCategory("Women's Team");
	let categories = [menTeam, womenTeam, men, women];

	let sport = new OlympicSport(
		"Artistic Gymnastics",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-gar.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupArtisticSwimming() {
	let duet = new OlympicCategory("Duet");
	let team = new OlympicCategory("Team");
	let categories = [duet, team];

	let sport = new OlympicSport(
		"Artistic Swimming",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-swa.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupAthletics() {
	let categories = [];
	categories.push(new OlympicCategory("Men's 100m"));
	categories.push(new OlympicCategory("Men's 110m Hurdles"));
	categories.push(new OlympicCategory("Men's 200m"));
	categories.push(new OlympicCategory("Men's 400m"));
	categories.push(new OlympicCategory("Men's 400m Hurdles"));
	categories.push(new OlympicCategory("Men's 800m"));
	categories.push(new OlympicCategory("Men's 1500m"));
	categories.push(new OlympicCategory("Men's 3000m Steeplechase"));
	categories.push(new OlympicCategory("Men's 5000m"));
	categories.push(new OlympicCategory("Men's 10,000m"));
	categories.push(new OlympicCategory("Men's 20km Race Walk"));
	categories.push(new OlympicCategory("Men's 50km Race Walk"));
	categories.push(new OlympicCategory("Men's Marathon"));
	categories.push(new OlympicCategory("Men's High Jump"));
	categories.push(new OlympicCategory("Men's Long Jump"));
	categories.push(new OlympicCategory("Men's Triple Jump"));
	categories.push(new OlympicCategory("Men's Shot Put"));
	categories.push(new OlympicCategory("Men's Discus Throw"));
	categories.push(new OlympicCategory("Men's Hammer Throw"));
	categories.push(new OlympicCategory("Men's Javelin Throw"));
	categories.push(new OlympicCategory("Men's Pole Vault"));
	categories.push(new OlympicCategory("Men's Decathlon"));
	categories.push(new OlympicCategory("Men's 4 x 100m Relay"));
	categories.push(new OlympicCategory("Men's 4 x 400m Relay"));
	categories.push(new OlympicCategory("Women's 100m"));
	categories.push(new OlympicCategory("Women's 100m Hurdles"));
	categories.push(new OlympicCategory("Women's 200m"));
	categories.push(new OlympicCategory("Women's 400m"));
	categories.push(new OlympicCategory("Women's 400m Hurdles"));
	categories.push(new OlympicCategory("Women's 800m"));
	categories.push(new OlympicCategory("Women's 1500m"));
	categories.push(new OlympicCategory("Women's 3000m Steeplechase"));
	categories.push(new OlympicCategory("Women's 5000m"));
	categories.push(new OlympicCategory("Women's 10,000m"));
	categories.push(new OlympicCategory("Women's 20km Race Walk"));
	categories.push(new OlympicCategory("Women's Marathon"));
	categories.push(new OlympicCategory("Women's Triple Jump"));
	categories.push(new OlympicCategory("Women's Long Jump"));
	categories.push(new OlympicCategory("Women's High Jump"));
	categories.push(new OlympicCategory("Women's Shot Put"));
	categories.push(new OlympicCategory("Women's Discus Throw"));
	categories.push(new OlympicCategory("Women's Hammer Throw"));
	categories.push(new OlympicCategory("Women's Javelin Throw"));
	categories.push(new OlympicCategory("Women's Pole Vault"));
	categories.push(new OlympicCategory("Women's Heptathlon"));
	categories.push(new OlympicCategory("Women's 4 x 100m Relay"));
	categories.push(new OlympicCategory("Women's 4 x 400m Relay"));
	categories.push(new OlympicCategory("Mixed 4 x 400m Relay"));

	let sport = new OlympicSport(
		"Athletics",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-ath.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupBadminton() {
	let categories = [];
	categories.push(new OlympicCategory("Men's Singles"));
	categories.push(new OlympicCategory("Men's Doubles"));
	categories.push(new OlympicCategory("Women's Singles"));
	categories.push(new OlympicCategory("Women's Doubles"));
	categories.push(new OlympicCategory("Mixed Doubles"));

	let sport = new OlympicSport(
		"Badminton",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-bdm.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupBaseball() {
	let categories = [];
	categories.push(new OlympicCategory("Softball"));
	categories.push(new OlympicCategory("Baseball"));

	let sport = new OlympicSport(
		"Baseball/Softball",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-bsb.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupBasketball() {
	let categories = [];
	categories.push(new OlympicCategory("Men's"));
	categories.push(new OlympicCategory("Women's"));

	let sport = new OlympicSport(
		"Basketball",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-bkb.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupBeachVolleyball() {
	let categories = [];
	categories.push(new OlympicCategory("Men's"));
	categories.push(new OlympicCategory("Women's"));
	categories.push(new OlympicCategory("Men's or Women's"));

	let sport = new OlympicSport(
		"Beach Volleyball",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-vbv.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupBoxing() {
	let categories = [];
	categories.push(new OlympicCategory("Men's Fly (48-52kg)"));
	categories.push(new OlympicCategory("Men's Feather (52-57kg)"));
	categories.push(new OlympicCategory("Men's Light (57-63kg)"));
	categories.push(new OlympicCategory("Men's Welter (63-69kg)"));
	categories.push(new OlympicCategory("Men's Middle (69-75kg)"));
	categories.push(new OlympicCategory("Men's Light Heavy (75-81kg)"));
	categories.push(new OlympicCategory("Men's Heavy (81-91kg)"));
	categories.push(new OlympicCategory("Men's Super Heavy (+91kg)"));
	categories.push(new OlympicCategory("Women's Fly (48-51kg)"));
	categories.push(new OlympicCategory("Women's Feather (54-57kg)"));
	categories.push(new OlympicCategory("Women's Light (57-60kg)"));
	categories.push(new OlympicCategory("Women's Welter (64-69kg)"));
	categories.push(new OlympicCategory("Women's Middle (69-75kg)"));

	let sport = new OlympicSport(
		"Boxing",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-box.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupCanoeSlalom() {
	let categories = [];
	categories.push(new OlympicCategory("Canoe (C1) Men"));
	categories.push(new OlympicCategory("Kayak (K1) Men"));
	categories.push(new OlympicCategory("Canoe (C1) Women"));
	categories.push(new OlympicCategory("Kayak (K1) Women"));

	let sport = new OlympicSport(
		"Canoe Slalom",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-csl.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupCanoeSprint() {
	let categories = [];
	categories.push(new OlympicCategory("Men's Canoe Single 1000m"));
	categories.push(new OlympicCategory("Men's Canoe Double 1000m"));
	categories.push(new OlympicCategory("Men's Kayak Single 200m"));
	categories.push(new OlympicCategory("Men's Kayak Single 1000m"));
	categories.push(new OlympicCategory("Men's Kayak Double 1000m"));
	categories.push(new OlympicCategory("Men's Kayak Four 500m"));
	categories.push(new OlympicCategory("Women's Canoe Single 200m"));
	categories.push(new OlympicCategory("Women's Canoe Double 500m"));
	categories.push(new OlympicCategory("Women's Kayak Single 200m"));
	categories.push(new OlympicCategory("Women's Kayak Single 500m"));
	categories.push(new OlympicCategory("Women's Kayak Double 500m"));
	categories.push(new OlympicCategory("Women's Kayak Four 500m"));

	let sport = new OlympicSport(
		"Canoe Sprint",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-csp.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupBmxFreestyle() {
	let categories = [];
	categories.push(new OlympicCategory("Men's Park"));
	categories.push(new OlympicCategory("Women's Park"));

	let sport = new OlympicSport(
		"Cycling BMX Freestyle",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-bmf.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupBmxRacing() {
	let categories = [];
	categories.push(new OlympicCategory("Men's"));
	categories.push(new OlympicCategory("Women's"));

	let sport = new OlympicSport(
		"Cycling BMX Racing",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-bmx.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupMtb() {
	let categories = [];
	categories.push(new OlympicCategory("Men's Cross-country"));
	categories.push(new OlympicCategory("Women's Cross-country"));

	let sport = new OlympicSport(
		"Cycling Mountain Bike",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-mtb.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupCyclingRoad() {
	let categories = [];
	categories.push(new OlympicCategory("Men's Road Race"));
	categories.push(new OlympicCategory("Men's Individual Time Trial"));
	categories.push(new OlympicCategory("Women's Road Race"));
	categories.push(new OlympicCategory("Women's Individual Time Trial"));

	let sport = new OlympicSport(
		"Cycling Road",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-crd.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupCyclingTrack() {
	let categories = [];
	categories.push(new OlympicCategory("Men's Sprint"));
	categories.push(new OlympicCategory("Men's Keirin"));
	categories.push(new OlympicCategory("Men's Madison"));
	categories.push(new OlympicCategory("Men's Omnium"));
	categories.push(new OlympicCategory("Men's Team Sprint"));
	categories.push(new OlympicCategory("Men's Team Pursuit"));
	categories.push(new OlympicCategory("Women's Sprint"));
	categories.push(new OlympicCategory("Women's Keirin"));
	categories.push(new OlympicCategory("Women's Madison"));
	categories.push(new OlympicCategory("Women's Omnium"));
	categories.push(new OlympicCategory("Women's Team Sprint"));
	categories.push(new OlympicCategory("Women's Team Pursuit"));

	let sport = new OlympicSport(
		"Cycling Track",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-ctr.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupDiving() {
	let categories = [];
	categories.push(new OlympicCategory("Men's 3m Springboard"));
	categories.push(new OlympicCategory("Men's 10m Platform"));
	categories.push(new OlympicCategory("Men's Synchronised 3m Springboard"));
	categories.push(new OlympicCategory("Men's Synchronised 10m Platform"));
	categories.push(new OlympicCategory("Women's 3m Springboard"));
	categories.push(new OlympicCategory("Women's 10m Platform"));
	categories.push(new OlympicCategory("Women's Synchronised 3m Springboard"));
	categories.push(new OlympicCategory("Women's Synchronised 10m Platform"));

	let sport = new OlympicSport(
		"Diving",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-div.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupEquestrian() {
	let categories = [];
	categories.push(
		new OlympicCategory("Dressage Grand Prix Team and Individual")
	);
	categories.push(
		new OlympicCategory("Eventing Dressage Team and Individual")
	);
	categories.push(
		new OlympicCategory("Eventing Cross Country Team and Individual")
	);
	categories.push(new OlympicCategory("Eventing Jumping Team"));
	categories.push(new OlympicCategory("Eventing Jumping Individual"));
	categories.push(new OlympicCategory("Dressage Individual"));
	categories.push(new OlympicCategory("Dressage Team"));
	categories.push(new OlympicCategory("Eventing Individual"));
	categories.push(new OlympicCategory("Eventing Team"));
	categories.push(new OlympicCategory("Jumping Individual"));
	categories.push(new OlympicCategory("Jumping Team"));

	let sport = new OlympicSport(
		"Equestrian",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-equ.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupFencing() {
	let categories = [];
	categories.push(new OlympicCategory("Men's Epée Individual"));
	categories.push(new OlympicCategory("Men's Foil Individual"));
	categories.push(new OlympicCategory("Men's Sabre Individual"));
	categories.push(new OlympicCategory("Men's Epée Team"));
	categories.push(new OlympicCategory("Men's Foil Team"));
	categories.push(new OlympicCategory("Men's Sabre Team"));
	categories.push(new OlympicCategory("Women's Epée Individual"));
	categories.push(new OlympicCategory("Women's Foil Individual"));
	categories.push(new OlympicCategory("Women's Sabre Individual"));
	categories.push(new OlympicCategory("Women's Epée Team"));
	categories.push(new OlympicCategory("Women's Foil Team"));
	categories.push(new OlympicCategory("Women's Sabre Team"));

	let sport = new OlympicSport(
		"Fencing",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-fen.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupFootball() {
	let categories = [];
	categories.push(new OlympicCategory("Men's"));
	categories.push(new OlympicCategory("Women's"));

	let sport = new OlympicSport(
		"Football",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-fbl.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupGolf() {
	let categories = [];
	categories.push(new OlympicCategory("Men's"));
	categories.push(new OlympicCategory("Women's"));

	let sport = new OlympicSport(
		"Golf",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-glf.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupHandball() {
	let categories = [];
	categories.push(new OlympicCategory("Men's"));
	categories.push(new OlympicCategory("Women's"));

	let sport = new OlympicSport(
		"Handball",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-hbl.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupHockey() {
	let categories = [];
	categories.push(new OlympicCategory("Men's"));
	categories.push(new OlympicCategory("Women's"));

	let sport = new OlympicSport(
		"Hockey",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-hoc.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupJudo() {
	let categories = [];
	categories.push(new OlympicCategory("Men -60 kg"));
	categories.push(new OlympicCategory("Men -66 kg"));
	categories.push(new OlympicCategory("Men -73 kg"));
	categories.push(new OlympicCategory("Men -81 kg"));
	categories.push(new OlympicCategory("Men -90 kg"));
	categories.push(new OlympicCategory("Men -100 kg"));
	categories.push(new OlympicCategory("Men +100 kg"));
	categories.push(new OlympicCategory("Women -48 kg"));
	categories.push(new OlympicCategory("Women -52 kg"));
	categories.push(new OlympicCategory("Women -57 kg"));
	categories.push(new OlympicCategory("Women -63 kg"));
	categories.push(new OlympicCategory("Women -70 kg"));
	categories.push(new OlympicCategory("Women -78 kg"));
	categories.push(new OlympicCategory("Women +78 kg"));
	categories.push(new OlympicCategory("Mixed Team"));

	let sport = new OlympicSport(
		"Judo",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-jud.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupKarate() {
	let categories = [];
	categories.push(new OlympicCategory("Men's Kumite -67 kg"));
	categories.push(new OlympicCategory("Men's Kumite -75 kg"));
	categories.push(new OlympicCategory("Men's Kumite +75 kg"));
	categories.push(new OlympicCategory("Men's Kata"));
	categories.push(new OlympicCategory("Women's Kumite -55 kg"));
	categories.push(new OlympicCategory("Women's Kumite -61 kg"));
	categories.push(new OlympicCategory("Women's Kumite +61 kg"));
	categories.push(new OlympicCategory("Women's Kata"));

	let sport = new OlympicSport(
		"Karate",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-kte.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupMarathonSwimming() {
	let categories = [];
	categories.push(new OlympicCategory("Men's"));
	categories.push(new OlympicCategory("Women's"));

	let sport = new OlympicSport(
		"Marathon Swimming",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-ows.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupPentathlon() {
	let categories = [];
	categories.push(new OlympicCategory("Men's"));
	categories.push(new OlympicCategory("Women's"));

	let sport = new OlympicSport(
		"Modern Pentathlon",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-mpn.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupRhythmicGymnastics() {
	let categories = [];
	categories.push(new OlympicCategory("Individual All-Around"));
	categories.push(new OlympicCategory("Group All-Around"));

	let sport = new OlympicSport(
		"Rhythmic Gymnastics",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-gry.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupRowing() {
	let categories = [];
	categories.push(new OlympicCategory("Men's Single Sculls"));
	categories.push(new OlympicCategory("Men's Double Sculls"));
	categories.push(new OlympicCategory("Lightweight Men's Double Sculls"));
	categories.push(new OlympicCategory("Men's Quadruple Sculls"));
	categories.push(new OlympicCategory("Men's Pair"));
	categories.push(new OlympicCategory("Men's Four"));
	categories.push(new OlympicCategory("Men's Eight"));
	categories.push(new OlympicCategory("Women's Single Sculls"));
	categories.push(new OlympicCategory("Women's Double Sculls"));
	categories.push(new OlympicCategory("Lightweight Women's Double Sculls"));
	categories.push(new OlympicCategory("Women's Quadruple Sculls"));
	categories.push(new OlympicCategory("Women's Pair"));
	categories.push(new OlympicCategory("Women's Four"));
	categories.push(new OlympicCategory("Women's Eight"));

	let sport = new OlympicSport(
		"Rowing",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-row.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupRugby() {
	let categories = [];
	categories.push(new OlympicCategory("Men's"));
	categories.push(new OlympicCategory("Women's"));

	let sport = new OlympicSport(
		"Rugby",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-rug.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupSailing() {
	let categories = [];
	categories.push(new OlympicCategory("RS:X Men"));
	categories.push(new OlympicCategory("Laser Men"));
	categories.push(new OlympicCategory("Finn Men"));
	categories.push(new OlympicCategory("49er Men"));
	categories.push(new OlympicCategory("470 Men"));
	categories.push(new OlympicCategory("RS:X Women"));
	categories.push(new OlympicCategory("Laser Radial Women"));
	categories.push(new OlympicCategory("49er FX Women"));
	categories.push(new OlympicCategory("470 Women"));
	categories.push(new OlympicCategory("Foiling Nacra 17 Mixed"));

	let sport = new OlympicSport(
		"Sailing",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-sal.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupShooting() {
	let categories = [];
	categories.push(new OlympicCategory("10m Air Pistol Men's"));
	categories.push(new OlympicCategory("25m Rapid Fire Pistol Men's"));
	categories.push(new OlympicCategory("10m Air Rifle Men's"));
	categories.push(new OlympicCategory("50m Rifle 3 Positions Men's"));
	categories.push(new OlympicCategory("Skeet Men's"));
	categories.push(new OlympicCategory("Trap Men's"));
	categories.push(new OlympicCategory("10m Air Pistol Women's"));
	categories.push(new OlympicCategory("25m Pistol Women's"));
	categories.push(new OlympicCategory("10m Air Rifle Women's"));
	categories.push(new OlympicCategory("50m Rifle 3 Positions Women's"));
	categories.push(new OlympicCategory("Skeet Women's"));
	categories.push(new OlympicCategory("Trap Women's"));
	categories.push(new OlympicCategory("10m Air Pistol Mixed Team"));
	categories.push(new OlympicCategory("10m Air Rifle Mixed Team"));
	categories.push(new OlympicCategory("Trap Mixed Team"));

	let sport = new OlympicSport(
		"Shooting",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-sho.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupSkateboarding() {
	let categories = [];
	categories.push(new OlympicCategory("Men's Street"));
	categories.push(new OlympicCategory("Men's Park"));
	categories.push(new OlympicCategory("Women's Street"));
	categories.push(new OlympicCategory("Women's Park"));

	let sport = new OlympicSport(
		"Skateboarding",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-skb.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupSportClimbing() {
	let categories = [];
	categories.push(new OlympicCategory("Men's Combined"));
	categories.push(new OlympicCategory("Women's Combined"));

	let sport = new OlympicSport(
		"Sport Climbing",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-clb.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupSurfing() {
	let categories = [];
	categories.push(new OlympicCategory("Men's"));
	categories.push(new OlympicCategory("Women's"));

	let sport = new OlympicSport(
		"Surfing",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-srf.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupSwimming() {
	let categories = [];
	categories.push(new OlympicCategory("Men's 50m Freestyle"));
	categories.push(new OlympicCategory("Men's 100m Freestyle"));
	categories.push(new OlympicCategory("Men's 100m Backstroke"));
	categories.push(new OlympicCategory("Men's 100m Breaststroke"));
	categories.push(new OlympicCategory("Men's 100m Butterfly"));
	categories.push(new OlympicCategory("Men's 200m Freestyle"));
	categories.push(new OlympicCategory("Men's 200m Backstroke"));
	categories.push(new OlympicCategory("Men's 200m Breaststroke"));
	categories.push(new OlympicCategory("Men's 200m Butterfly"));
	categories.push(new OlympicCategory("Men's 200m Individual Medley"));
	categories.push(new OlympicCategory("Men's 400m Freestyle"));
	categories.push(new OlympicCategory("Men's 400m Individual Medley"));
	categories.push(new OlympicCategory("Men's 800m Freestyle"));
	categories.push(new OlympicCategory("Men's 1500m Freestyle"));
	categories.push(new OlympicCategory("Men's 4 x 100m Freestyle Relay"));
	categories.push(new OlympicCategory("Men's 4 x 100m Medley Relay"));
	categories.push(new OlympicCategory("Men's 4 x 200m Freestyle Relay"));
	categories.push(
		new OlympicCategory(
			"Men's 4 x 200m Freestyle",
			"Men's 4 x 200m Freestyle Relay"
		)
	);
	categories.push(new OlympicCategory("Women's 50m Freestyle"));
	categories.push(new OlympicCategory("Women's 100m Freestyle"));
	categories.push(new OlympicCategory("Women's 100m Backstroke"));
	categories.push(new OlympicCategory("Women's 100m Breaststroke"));
	categories.push(new OlympicCategory("Women's 100m Butterfly"));
	categories.push(new OlympicCategory("Women's 200m Freestyle"));
	categories.push(new OlympicCategory("Women's 200m Backstroke"));
	categories.push(new OlympicCategory("Women's 200m Breaststroke"));
	categories.push(new OlympicCategory("Women's 200m Butterfly"));
	categories.push(new OlympicCategory("Women's 200m Individual Medley"));
	categories.push(new OlympicCategory("Women's 400m Freestyle"));
	categories.push(new OlympicCategory("Women's 400m Individual Medley"));
	categories.push(new OlympicCategory("Women's 800m Freestyle"));
	categories.push(new OlympicCategory("Women's 1500m Freestyle"));
	categories.push(new OlympicCategory("Women's 4 x 100m Freestyle Relay"));
	categories.push(new OlympicCategory("Women's 4 x 100m Medley Relay"));
	categories.push(new OlympicCategory("Women's 4 x 200m Freestyle Relay"));
	categories.push(new OlympicCategory("Mixed 4 x 100m Medley Relay"));

	let sport = new OlympicSport(
		"Swimming",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-swm.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupTableTennis() {
	let categories = [];
	categories.push(new OlympicCategory("Men's Singles"));
	categories.push(new OlympicCategory("Men's Team"));
	categories.push(new OlympicCategory("Women's Singles"));
	categories.push(new OlympicCategory("Women's Team"));
	categories.push(new OlympicCategory("Mixed Doubles"));

	let sport = new OlympicSport(
		"Table Tennis",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-tte.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupTaekwondo() {
	let categories = [];
	categories.push(new OlympicCategory("Men -58 kg"));
	categories.push(new OlympicCategory("Men -68 kg"));
	categories.push(new OlympicCategory("Men -80 kg"));
	categories.push(new OlympicCategory("Men +80 kg"));
	categories.push(new OlympicCategory("Women -49 kg"));
	categories.push(new OlympicCategory("Women -57 kg"));
	categories.push(new OlympicCategory("Women -67 kg"));
	categories.push(new OlympicCategory("Women +67 kg"));

	let sport = new OlympicSport(
		"Taekwondo",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-tkw.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupTennis() {
	let categories = [];
	categories.push(new OlympicCategory("Men's Singles"));
	categories.push(new OlympicCategory("Men's Doubles"));
	categories.push(new OlympicCategory("Women's Singles"));
	categories.push(new OlympicCategory("Women's Doubles"));
	categories.push(new OlympicCategory("Mixed Doubles"));

	let sport = new OlympicSport(
		"Tennis",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-ten.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupTrampolineGymnastics() {
	let categories = [];
	categories.push(new OlympicCategory("Men's"));
	categories.push(new OlympicCategory("Women's"));

	let sport = new OlympicSport(
		"Trampoline Gymnastics",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-gtr.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupTriathlon() {
	let categories = [];
	categories.push(new OlympicCategory("Men's"));
	categories.push(new OlympicCategory("Men", "Men's"));
	categories.push(new OlympicCategory("Women's"));
	categories.push(new OlympicCategory("Women", "Women's"));
	categories.push(new OlympicCategory("Mixed Relay"));

	let sport = new OlympicSport(
		"Triathlon",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-tri.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupVolleyball() {
	let categories = [];
	categories.push(new OlympicCategory("Men's"));
	categories.push(new OlympicCategory("Women's"));

	let sport = new OlympicSport(
		"Volleyball",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-vvo.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupWaterPolo() {
	let categories = [];
	categories.push(new OlympicCategory("Men's"));
	categories.push(new OlympicCategory("Women's"));

	let sport = new OlympicSport(
		"Water Polo",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-wpo.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupWeightlifting() {
	let categories = [];
	categories.push(
		new OlympicCategory("Men's 61 kg Group B and Men's 67 kg Group B")
	);
	categories.push(
		new OlympicCategory("Men's 81 kg Group B and Men's 96 kg Group B")
	);
	categories.push(
		new OlympicCategory("Women's 59 kg Group B and Women's 64 kg Group B")
	);
	categories.push(
		new OlympicCategory("Women's 87 kg Group B and Women's +87 kg Group B")
	);
	categories.push(new OlympicCategory("Men's 61 kg"));
	categories.push(new OlympicCategory("Men's 67 kg"));
	categories.push(new OlympicCategory("Men's 73 kg"));
	categories.push(new OlympicCategory("Men's 81 kg"));
	categories.push(new OlympicCategory("Men's 96 kg"));
	categories.push(new OlympicCategory("Men's 109 kg"));
	categories.push(new OlympicCategory("Men's +109 kg"));
	categories.push(new OlympicCategory("Women's 49 kg"));
	categories.push(new OlympicCategory("Women's 55 kg"));
	categories.push(new OlympicCategory("Women's 59 kg"));
	categories.push(new OlympicCategory("Women's 64 kg"));
	categories.push(new OlympicCategory("Women's 76 kg"));
	categories.push(new OlympicCategory("Women's 87 kg"));
	categories.push(new OlympicCategory("Women's +87 kg"));

	let sport = new OlympicSport(
		"Weightlifting",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-wlf.svg"
	);
	createSportTile(sport);

	return sport;
}

function setupWrestling() {
	let categories = [];
	categories.push(new OlympicCategory("Men's Greco-Roman 60 kg"));
	categories.push(new OlympicCategory("Men's Greco-Roman 67 kg"));
	categories.push(new OlympicCategory("Men's Greco-Roman 77 kg"));
	categories.push(new OlympicCategory("Men's Greco-Roman 87 kg"));
	categories.push(new OlympicCategory("Men's Greco-Roman 97 kg"));
	categories.push(new OlympicCategory("Men's Greco-Roman 130 kg"));
	categories.push(new OlympicCategory("Men's Freestyle 57 kg"));
	categories.push(new OlympicCategory("Men's Freestyle 65 kg"));
	categories.push(new OlympicCategory("Men's Freestyle 74 kg"));
	categories.push(new OlympicCategory("Men's Freestyle 86 kg"));
	categories.push(new OlympicCategory("Men's Freestyle 97 kg"));
	categories.push(new OlympicCategory("Men's Freestyle 125 kg"));
	categories.push(new OlympicCategory("Women's Freestyle 50 kg"));
	categories.push(new OlympicCategory("Women's Freestyle 53 kg"));
	categories.push(new OlympicCategory("Women's Freestyle 57 kg"));
	categories.push(new OlympicCategory("Women's Freestyle 62 kg"));
	categories.push(new OlympicCategory("Women's Freestyle 76 kg"));
	categories.push(new OlympicCategory("Women's Freestyle 68 kg"));

	let sport = new OlympicSport(
		"Wrestling",
		categories,
		"/tokyo-2020/en/d3images/pictograms/olympics/picto-wre.svg"
	);
	createSportTile(sport);

	return sport;
}

function setup() {
	document.addEventListener("DOMContentLoaded", function () {
		let elems = document.querySelector(".modal");
		let instances = M.Modal.init(elems, {});
	});

	const basketball3x3 = setupBasketball3x3();
	allSports[basketball3x3.name] = basketball3x3;

	const archery = setupArchery();
	allSports[archery.name] = archery;

	const artisticGymnastics = setupArtisticGymnastics();
	allSports[artisticGymnastics.name] = artisticGymnastics;

	const artisticSwimming = setupArtisticSwimming();
	allSports[artisticSwimming.name] = artisticSwimming;

	const athletics = setupAthletics();
	allSports[athletics.name] = athletics;

	const badminton = setupBadminton();
	allSports[badminton.name] = badminton;

	const baseball = setupBaseball();
	allSports[baseball.name] = baseball;

	const basketball = setupBasketball();
	allSports[basketball.name] = basketball;

	const beachVolleyball = setupBeachVolleyball();
	allSports[beachVolleyball.name] = beachVolleyball;

	const boxing = setupBoxing();
	allSports[boxing.name] = boxing;

	const canoeSlalom = setupCanoeSlalom();
	allSports[canoeSlalom.name] = canoeSlalom;

	const canoeSprint = setupCanoeSprint();
	allSports[canoeSprint.name] = canoeSprint;

	const bmxFreestyle = setupBmxFreestyle();
	allSports[bmxFreestyle.name] = bmxFreestyle;

	const bmxRacing = setupBmxRacing();
	allSports[bmxRacing.name] = bmxRacing;

	const mtb = setupMtb();
	allSports[mtb.name] = mtb;

	const cyclingRoad = setupCyclingRoad();
	allSports[cyclingRoad.name] = cyclingRoad;

	const cyclingTrack = setupCyclingTrack();
	allSports[cyclingTrack.name] = cyclingTrack;

	const diving = setupDiving();
	allSports[diving.name] = diving;

	const equestrian = setupEquestrian();
	allSports[equestrian.name] = equestrian;

	const fencing = setupFencing();
	allSports[fencing.name] = fencing;

	const football = setupFootball();
	allSports[football.name] = football;

	const golf = setupGolf();
	allSports[golf.name] = golf;

	const handball = setupHandball();
	allSports[handball.name] = handball;

	const hockey = setupHockey();
	allSports[hockey.name] = hockey;

	const judo = setupJudo();
	allSports[judo.name] = judo;

	const karate = setupKarate();
	allSports[karate.name] = karate;

	const marathonSwimming = setupMarathonSwimming();
	allSports[marathonSwimming.name] = marathonSwimming;

	const pentathlon = setupPentathlon();
	allSports[pentathlon.name] = pentathlon;

	const rhythmicGymnastics = setupRhythmicGymnastics();
	allSports[rhythmicGymnastics.name] = rhythmicGymnastics;

	const rowing = setupRowing();
	allSports[rowing.name] = rowing;

	const rugby = setupRugby();
	allSports[rugby.name] = rugby;

	const sailing = setupSailing();
	allSports[sailing.name] = sailing;

	const shooting = setupShooting();
	allSports[shooting.name] = shooting;

	const skateboarding = setupSkateboarding();
	allSports[skateboarding.name] = skateboarding;

	const sportClimbing = setupSportClimbing();
	allSports[sportClimbing.name] = sportClimbing;

	const surfing = setupSurfing();
	allSports[surfing.name] = surfing;

	const swimming = setupSwimming();
	allSports[swimming.name] = swimming;

	const tableTennis = setupTableTennis();
	allSports[tableTennis.name] = tableTennis;

	const taekwondo = setupTaekwondo();
	allSports[taekwondo.name] = taekwondo;

	const tennis = setupTennis();
	allSports[tennis.name] = tennis;

	const trampolineGymnastics = setupTrampolineGymnastics();
	allSports[trampolineGymnastics.name] = trampolineGymnastics;

	const triathlon = setupTriathlon();
	allSports[triathlon.name] = triathlon;

	const volleyball = setupVolleyball();
	allSports[volleyball.name] = volleyball;

	const waterPolo = setupWaterPolo();
	allSports[waterPolo.name] = waterPolo;

	const weightlifting = setupWeightlifting();
	allSports[weightlifting.name] = weightlifting;

	const wrestling = setupWrestling();
	allSports[wrestling.name] = wrestling;
}

setup();
