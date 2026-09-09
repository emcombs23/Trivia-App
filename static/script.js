const QUESTION_COUNT = 10;
const state = {
	screen: "intro",
	teams: [],
	answers: [],
	committedAnswers: [],
	question: 0,
	completed: 0,
	editing: false,
};

const app = document.querySelector("#app");

function esc(value) {
	return value.replace(/[&<>'"]/g, (character) => ({
		"&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
	}[character]));
}

function scoreFor(teamIndex, through = state.completed) {
	return state.committedAnswers.slice(0, through).reduce((score, question, questionIndex) => {
		if (state.teams[teamIndex].joinedQuestion > questionIndex) return score;
		return score + pointsFor(question, question.results[teamIndex]);
	}, 0);
}

function pointsFor(question, result) {
	if (!result) return 0;
	if (question.type === "normal") return Number(result) || 0;
	if (question.type === "song") return (result.artist ? 2 : 0) + (result.title ? 2 : 0) + ({ exact: 3, within1: 2, within2: 1 }[result.year] || 0);
	if (question.type === "wager") return result.answer === "correct" ? Number(result.wager) : result.answer === "incorrect" ? -Number(result.wager) : 0;
	return 0;
}

function newQuestion() {
	return { type: null, results: state.teams.map(() => null) };
}

function resultComplete(question, teamIndex) {
	if (state.teams[teamIndex].joinedQuestion > state.question) return true;
	const result = question.results[teamIndex];
	if (!result || !question.type) return false;
	if (question.type === "song") return Boolean(result.artist && result.title && result.year);
	if (question.type === "wager") return Boolean(result.wager !== undefined && result.answer);
	return Boolean(result);
}

function rankings() {
	return state.teams.map((team, index) => ({ ...team, score: scoreFor(index) }))
		.sort((a, b) => b.score - a.score || a.joined - b.joined);
}

function render() {
	if (state.screen === "intro") renderIntro();
	if (state.screen === "setup") renderSetup();
	if (state.screen === "game") renderGame();
}

function renderIntro() {
	app.innerHTML = `
		<section class="intro-screen">
			<div class="intro-mark">Q<span>N</span></div>
			<p class="eyebrow">TRIVIA HOST CONSOLE</p>
			<h1>Make some<br><em>noise.</em></h1>
			<p class="intro-copy">A clean, live scoreboard for the loudest table in the room.</p>
			<button class="button button-primary button-large" data-action="create">Create a game <span>→</span></button>
			<div class="intro-footer"><span>10 ROUNDS</span><span>+10 / −5 SCORING</span><span>LIVE LEADERBOARD</span></div>
		</section>`;
}

function renderSetup() {
	app.innerHTML = `
		<section class="setup-screen page-wrap">
			<header class="simple-header"><button class="text-button" data-action="back-intro">← Back</button><span class="brand">QUIZ<span>NIGHT</span></span><span class="round-count">10 ROUNDS</span></header>
			<div class="setup-content">
				<div class="section-kicker">01 / THE TEAMS</div>
				<h1>Who’s playing<br><em>tonight?</em></h1>
				<p class="muted">Name every team before the first question. You can add more from the host screen.</p>
				<div id="team-inputs" class="team-inputs">${state.teams.map((team, index) => teamInput(team.name, index)).join("")}</div>
				<button class="add-team-link" data-action="add-setup-team">+ Add another team</button>
				<div class="setup-actions"><span class="team-hint">${state.teams.length} ${state.teams.length === 1 ? "TEAM" : "TEAMS"} READY</span><button class="button button-primary" data-action="start">Start game <span>→</span></button></div>
			</div>
		</section>`;
}

function teamInput(name, index) {
	return `<label class="team-input"><span>${String(index + 1).padStart(2, "0")}</span><input data-team-index="${index}" value="${esc(name)}" placeholder="Team ${index + 1}" maxlength="28"><button aria-label="Remove team" data-remove-team="${index}">×</button></label>`;
}

function renderLeaderboard() {
	const rows = rankings().map((team, index) => `
		<div class="leader-row ${index === 0 ? "leader-first" : ""}">
			<span class="rank">${String(index + 1).padStart(2, "0")}</span><span class="team-name">${esc(team.name)}</span><strong>${team.score}</strong>
		</div>`).join("");
	return `<aside class="leaderboard"><div class="leader-head"><div><p class="section-kicker">AUDIENCE VIEW</p><h2>Leaderboard</h2></div><span class="live-dot">LIVE</span></div><div class="leader-list">${rows}</div><div class="leader-foot"><span>POINTS</span><span>UPDATED AFTER EACH ROUND</span></div></aside>`;
}

function renderGame() {
	const isFinished = state.completed >= QUESTION_COUNT && !state.editing;
	const currentQuestion = state.answers[state.question] || newQuestion();
	const eligibleTeams = state.teams.filter((team) => state.question >= team.joinedQuestion);
	const answered = Boolean(currentQuestion.type) && eligibleTeams.length > 0 && eligibleTeams.every((team) => resultComplete(currentQuestion, state.teams.indexOf(team)));
	const title = isFinished ? "Game complete" : state.editing ? `Edit question ${state.question + 1}` : `Question ${state.question + 1}`;
	const actionLabel = state.editing ? "Save changes" : state.question === QUESTION_COUNT - 1 ? "Finish game" : "Next question";

	app.innerHTML = `<section class="game-shell">
		<header class="game-header"><span class="brand">QUIZ<span>NIGHT</span></span><div class="progress"><span>ROUND ${String(Math.min(state.completed + 1, QUESTION_COUNT)).padStart(2, "0")} / ${QUESTION_COUNT}</span><div class="progress-track"><i style="width:${(state.completed / QUESTION_COUNT) * 100}%"></i></div></div><button class="button button-outline" data-action="add-game-team">+ Add team</button></header>
		<div class="game-layout"><section class="host-panel"><div class="host-heading"><div><p class="section-kicker">HOST CONTROL</p><h1>${title}</h1><p class="muted">Mark each team’s answer. Correct is <b class="positive">+10</b>, incorrect is <b class="negative">−5</b>.</p></div><span class="question-badge">${String(Math.min(state.question + 1, QUESTION_COUNT)).padStart(2, "0")}</span></div>
			${isFinished ? `<div class="finish-card"><span class="finish-icon">✓</span><h2>That’s a wrap.</h2><p>Final scores are locked in and on display.</p></div>` : `${state.editing ? "" : `<div class="type-picker"><span class="table-labels">QUESTION TYPE</span><div class="type-buttons">${["normal", "song", "wager"].map((type) => `<button class="type-button ${currentQuestion.type === type ? "selected" : ""}" data-question-type="${type}">${type[0].toUpperCase() + type.slice(1)}</button>`).join("")}</div></div>`}<div class="score-table"><div class="table-labels"><span>TEAM</span><span>ANSWER</span></div>${state.teams.map((team, index) => teamRow(team, index, currentQuestion)).join("")}</div><div class="question-actions"><span class="answered-count">${eligibleTeams.filter((team) => resultComplete(currentQuestion, state.teams.indexOf(team))).length} / ${eligibleTeams.length} MARKED</span><button class="button button-primary" data-action="next" ${answered ? "" : "disabled"}>${actionLabel} <span>→</span></button></div>`}
			${historyMarkup()}
		</section>${renderLeaderboard()}</div></section>`;
}

function teamRow(team, index, question) {
	const eligible = state.question >= team.joinedQuestion;
	return `<div class="score-row"><span class="row-team"><i class="team-number">${String(index + 1).padStart(2, "0")}</i>${esc(team.name)}<small>${scoreFor(index)} pts</small></span><span class="answer-buttons">${eligible && question.type ? answerControls(question, index) : eligible ? `<span class="not-playing">Choose a question type</span>` : `<span class="not-playing">Joined after this round</span>`}</span></div>`;
}

function answerControls(question, index) {
	const result = question.results[index] || {};
	if (question.type === "normal") return [
		["6", "+6"], ["4", "+4"], ["2", "+2"], ["incorrect", "Incorrect"],
	].map(([value, label]) => `<button class="answer ${result === value ? "selected" : ""}" data-answer="${value}" data-index="${index}">${label}</button>`).join("");
	if (question.type === "song") return `<div class="song-controls"><div><small>ARTIST</small>${songButton(result.artist, "artist", index, "correct", "Correct")}${songButton(result.artist, "artist", index, "incorrect", "Incorrect")}</div><div><small>TITLE</small>${songButton(result.title, "title", index, "correct", "Correct")}${songButton(result.title, "title", index, "incorrect", "Incorrect")}</div><div><small>YEAR</small>${[["exact", "Exact", "+3"], ["within1", "Within 1", "+2"], ["within2", "Within 2", "+1"], ["incorrect", "Incorrect", "0"]].map(([value, label, points]) => `<button class="answer ${result.year === value ? "selected" : ""}" data-answer="${value}" data-section="year" data-index="${index}">${label}<b>${points}</b></button>`).join("")}</div></div>`;
	return `<div class="wager-controls"><div><small>WAGER</small>${[0, 1, 2, 3].map((value) => `<button class="answer ${Number(result.wager) === value ? "selected" : ""}" data-wager="${value}" data-index="${index}">${value}</button>`).join("")}</div><div><small>ANSWER</small>${songButton(result.answer, "answer", index, "correct", "Correct")}${songButton(result.answer, "answer", index, "incorrect", "Incorrect")}</div></div>`;
}

function songButton(selected, section, index, value, label) {
	return `<button class="answer ${selected === value ? "selected" : ""}" data-answer="${value}" data-section="${section}" data-index="${index}">${label}</button>`;
}

function historyMarkup() {
	if (!state.completed) return "";
	return `<div class="history"><div class="history-title"><span>ROUND HISTORY</span><span>EDIT ANY ROUND</span></div><div class="history-buttons">${Array.from({ length: state.completed }, (_, index) => `<button class="history-button ${state.editing && state.question === index ? "active" : ""}" data-edit-question="${index}">Q${index + 1}<b>${state.answers[index].results.filter(Boolean).length}/${state.teams.length}</b></button>`).join("")}</div></div>`;
}

function ensureTeamAnswers() {
	state.answers.forEach((question) => question.results.push(null));
	state.committedAnswers.forEach((question) => question.results.push(null));
}

function addTeam() {
	const name = `Team ${state.teams.length + 1}`;
	state.teams.push({ name, joined: Date.now(), joinedQuestion: state.screen === "game" ? state.completed : 0 });
	ensureTeamAnswers();
	render();
	if (state.screen === "setup") {
		const input = document.querySelector(`input[data-team-index="${state.teams.length - 1}"]`);
		input?.focus();
	}
}

app.addEventListener("click", (event) => {
	const action = event.target.closest("[data-action]")?.dataset.action;
	if (action === "create") { state.teams = [{ name: "Team 1", joined: Date.now(), joinedQuestion: 0 }]; state.screen = "setup"; render(); return; }
	if (action === "back-intro") { state.screen = "intro"; render(); return; }
	if (action === "add-setup-team" || action === "add-game-team") { addTeam(); return; }
	if (action === "start") {
		document.querySelectorAll("input[data-team-index]").forEach((input) => { state.teams[Number(input.dataset.teamIndex)].name = input.value.trim(); });
		state.teams = state.teams.filter((team) => team.name);
		if (!state.teams.length) return;
		state.answers = Array.from({ length: QUESTION_COUNT }, newQuestion);
		state.committedAnswers = state.answers.map((question) => ({ type: question.type, results: question.results.slice() }));
		state.question = 0; state.completed = 0; state.editing = false; state.screen = "game"; render(); return;
	}
	if (action === "next") {
		state.committedAnswers[state.question] = { type: state.answers[state.question].type, results: state.answers[state.question].results.slice() };
		state.completed = Math.max(state.completed, state.question + 1);
		if (state.editing) { state.question = state.completed < QUESTION_COUNT ? state.completed : QUESTION_COUNT - 1; state.editing = false; }
		else if (state.question < QUESTION_COUNT - 1) state.question += 1;
		render(); return;
	}
	const typeButton = event.target.closest("[data-question-type]");
	if (typeButton) {
		if (state.editing) return;
		const question = state.answers[state.question];
		question.type = typeButton.dataset.questionType;
		question.results = state.teams.map(() => null);
		render();
		return;
	}
	const answer = event.target.closest("[data-answer]");
	if (answer) {
		const teamIndex = Number(answer.dataset.index);
		if (state.question < state.teams[teamIndex].joinedQuestion) return;
		const question = state.answers[state.question];
		if (question.type === "song") question.results[teamIndex] = { ...(question.results[teamIndex] || {}), [answer.dataset.section]: answer.dataset.answer };
		else if (question.type === "wager") question.results[teamIndex] = { ...(question.results[teamIndex] || {}), answer: answer.dataset.answer };
		else question.results[teamIndex] = answer.dataset.answer;
		render();
		return;
	}
	const wager = event.target.closest("[data-wager]");
	if (wager) {
		const teamIndex = Number(wager.dataset.index);
		const question = state.answers[state.question];
		question.results[teamIndex] = { ...(question.results[teamIndex] || {}), wager: wager.dataset.wager };
		render();
		return;
	}
	const edit = event.target.closest("[data-edit-question]");
	if (edit) { state.question = Number(edit.dataset.editQuestion); state.editing = true; render(); }
	const remove = event.target.closest("[data-remove-team]");
	if (remove && state.teams.length > 1) { state.teams.splice(Number(remove.dataset.removeTeam), 1); render(); }
});

app.addEventListener("input", (event) => {
	if (event.target.matches("input[data-team-index]")) state.teams[Number(event.target.dataset.teamIndex)].name = event.target.value;
});

render();
