const inQAStatus = {"QA": true, "In QA": true};
const inDevStatus = {"In Development": true};
const inPartnerReviewStatus = {"Partner Review": true};
const inDoneStatus = {"Done": true};

const WIGGLE_ROOM = 0;


export function addStatusToRelease(release) {
	return {
		...release,
		status: getReleaseStatus(release)
	}
}
function getReleaseStatus(release) {
	// if everything is complete
	if( release.initiatives.filter(i => i.status !== "complete").length === 0 ){
		return "complete"
	} else {
		return getInitiativeStatus(release);
	}
}

export function addStatusToInitiative(initiative) {
	return {
		...initiative,
		status: getInitiativeStatus(initiative),
		devStatus: getInitiativeDevStatus(initiative)
	}
}

function getInitiativeStatus(initiative) {
	if(inDoneStatus[initiative.Status]) {
		return "complete"
	}
	return timedStatus(initiative.team);
}

function isStatusDevComplete(item) {
	return inQAStatus[item.Status] || inPartnerReviewStatus[item.Status] || inDoneStatus[item.Status]
}

function timedStatus(timedRecord) {
	if(!timedRecord.due) {
		return "unknown"
	} else if(timedRecord.due > WIGGLE_ROOM + timedRecord.dueLastPeriod){
		return "behind";
	} else if(timedRecord.start > new Date()) {
		return "notstarted"
	}
	else {
		return "ontrack"
	}
}

export function getInitiativeDevStatus(initiative) {
	// check if epic statuses are complete
	if(isStatusDevComplete(initiative)) {
		return "complete";
	}
	if(initiative.dev.length && initiative.dev.issues.every( epic =>  isStatusDevComplete(epic))) {
		console.warn("The dev epics for",initiative, "are complete, but the initiative is not in QA");
		return "complete"
	}
	return timedStatus(initiative.dev)
}


export function getEpicStatus(epic) {
	if(inQAStatus[epic.Status] || inPartnerReviewStatus[epic.Status] || inDoneStatus[epic.Status]) {
		return "complete";
	} else if(!epic["Due date"] ){
		return "unknown"
	} else if( new Date(epic["Due date"]) > WIGGLE_ROOM + epic.dueLastPeriod ){
		return "behind"
	} else {
		return "ontrack";
	}
}

export function addStatusToEpic(epic) {
	return {
		...epic,
		status: getEpicStatus(epic)
	};
}
