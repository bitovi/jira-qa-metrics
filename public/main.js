
import {SteercoReporter} from "./steerco-reporting/steerco-reporting.js";

export default async function main(jiraHelpers) {
	mainElement.textContent = "Checking for Jira Access Token";

	if(!jiraHelpers.hasValidAccessToken()) {
		await sleep(100);
		mainElement.textContent = "Getting access token";
	}

	const accessToken = await jiraHelpers.getAccessToken();

	mainElement.textContent = "Got Access Token";

	//const fields = await jiraHelpers.fetchJiraFields();
	//const fieldMap = makeFieldNameToIdMap(fields);

	const report = new SteercoReporter();

	//report.fieldMap = fieldMap;
	//console.log("fields", fieldMap)
	report.jiraHelpers = jiraHelpers;

	document.body.append(report);

	/*
	field: "status"
	fieldId: "status"
	fieldtype: "jira"
	from: "10012"
	fromString: "To Do"
	to: "10055"
	toString: "Refinement"
	*/

	// get all stories for a fixVersion
		// get points
	// get all changelog for those issues
			// find status changes
}


function sleep(time){
	return new Promise((resolve)=>{
		setTimeout(resolve, time)
	})
}



function isChangelogComplete(changelog) {
	return changelog.histories.length === changelog.total
}

function calculateTimeInStatus(changelog, status){
	let totalTime = 0;
	let currentStatus = "To Do";
	let inDevelopmentTime;
	changelog.reverse().forEach( (history) => {
		history.items.forEach( (changeItem)=> {
			if(changeItem.field === "status") {
				if( changeItem.toString === "In Development" ) {
					inDevelopmentTime = new Date(history.created);
				} else if(changeItem.fromString === "In Development") {
					if(!inDevelopmentTime) {
						console.error("No development time!")
					} else {
						totalTime += new Date(history.created) - inDevelopmentTime;
						inDevelopmentTime = undefined;
					}

				}

			}
		})
	})
	return totalTime;
}
