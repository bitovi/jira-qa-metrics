// ! I'm not sure why changelog has both Start Date and duedate.
export function howMuchHasDueDateMovedForwardChangedSince(epic, checkpointDate){

	let dueDateWasPriorToTheFirstChangeAfterTheCheckpoint;
	let dueDateNow;
	let currentDate;
	// find the due date at "date"
	for(let changelog of [...epic.changelog].reverse()) {
		const createdDate = new Date(changelog.created);
		const dueDateSetItem = changelog.items.find((item) => item.field === "duedate");
		if(dueDateSetItem) {
			const fromDate = dueDateSetItem.from && new Date(dueDateSetItem.from);
			const toDate = dueDateSetItem.to && new Date(dueDateSetItem.to);
			currentDate = toDate;
			// we just moved the time after checkpointDate
			if((createdDate > checkpointDate) && !dueDateWasPriorToTheFirstChangeAfterTheCheckpoint && fromDate) {
				dueDateWasPriorToTheFirstChangeAfterTheCheckpoint = fromDate;
			}
		}
	}
	if(!currentDate) {
		currentDate = new Date(epic["Due date"]);
	}
	if(!dueDateWasPriorToTheFirstChangeAfterTheCheckpoint) {
		dueDateWasPriorToTheFirstChangeAfterTheCheckpoint = currentDate;
	}

	return {
		currentDate,
		dateHasMovedForward: currentDate - DAY_IN_MS * 1 > dueDateWasPriorToTheFirstChangeAfterTheCheckpoint,
		dateHasChanged: dueDateWasPriorToTheFirstChangeAfterTheCheckpoint !== currentDate ,
		dueDateWasPriorToTheFirstChangeAfterTheCheckpoint: dueDateWasPriorToTheFirstChangeAfterTheCheckpoint,
		daysChanged: Math.round( (currentDate - dueDateWasPriorToTheFirstChangeAfterTheCheckpoint) / DAY_IN_MS )
	}
}

export const DAY_IN_MS = 1000 * 60 * 60 * 24;
