import Chart from "./chart.js";
import {plotTimeInDaysVsStoryPoints} from "./dev-time-vs-story-points.js";

import {devTimePerPointDistribution} from "./dev-time-per-point-Distribution.js";
import releaseReport from "./release-report.js";

export default async function main(jiraHelpers){

	let token = await jiraHelpers.getAccessToken();

	mainElement.textContent = "Getting stories";

		//return {release, labels, data};

	const data = plotTimeInDaysVsStoryPoints(jiraHelpers);
	devTimePerPointDistribution(jiraHelpers, data);
	//releaseReport(jiraHelpers);
	return;


	await Promise.all( ["4.0.0","4.1.0"].map( async (release) => {
		const issuesPromise = jiraHelpers.fetchAllJiraIssuesWithJQLAndFetchAllChangelogUsingNamedFields({
			jql: `project = "YUMPOS" and "Actual Release[Labels]" in (${release}) and issueType not in (Initiatives, Epic)`,
			fields: ["summary","Story Points"],
			expand: ["changelog"]
		});
		const {labels, data} = await getDataAndLabelsFromIssues(issuesPromise);
		datasets.push({
			label: release,
			data: data,
			labels: labels,
			backgroundColor: getRandomColor(),
		});
		timeVsPoints.update();
		return {release, labels, data};
	}) )

	mainElement.textContent = "Done";

}
