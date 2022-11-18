import Chart from "./chart.js";
import {getDataAndLabelsFromIssues, getRandomColor, calculateTimeInStatus, semverSort} from "./helpers.js";

import sheet from "./release-report.css" assert {type: 'css'};

//document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

export default async function releaseReport(jiraHelpers){

	const div = document.createElement("div");
	div.innerHTML = "<h2>Release Report</h2>"

	document.body.append(div);

	const issuesPromise = jiraHelpers.fetchAllJiraIssuesWithJQLAndFetchAllChangelogUsingNamedFields({
		jql: `project = "YUMPOS" and "Actual Release[Labels]" != EMPTY and issueType not in (Initiatives, Epic)`,
		fields: ["summary","Story Points","Actual Release"],
		expand: ["changelog"]
	});
	//const {labels, data} = await getDataAndLabelsFromIssues(issuesPromise);
	const issues = await issuesPromise;
	//const issue = await jiraHelpers.fetchJiraIssueChangelog("YUMPOS-985");
	const releases = {};
	console.log(issues);
	const issueResults = issues.forEach( (issue) => {
		let releaseName = issue.fields["Actual Release"][0];
		let release = releases[releaseName];
		if(!release) {
			release = releases[releaseName] = {
				releaseName,
				issues: []
			}
		}
		release.issues.push({
			...issue,
			points: issue.fields["Story Points"],
			devDays: calculateTimeInStatus(issue.changelog, "In Development") / (1000*60*60*24),
			qaDays: calculateTimeInStatus(issue.changelog, "QA IN PROGRESS") / (1000*60*60*24)
		});

	});

	const sortedReleases = semverSort(Object.keys(releases));
	const trs = sortedReleases.map( (releaseName)=> {
		const release = releases[releaseName];
		return `<tr>
			<td>${releaseName}</td>
			<td>${release.issues.length}</td>
			<td>${sum(release.issues, (i) => i.points)}</td>
			<td>${sum(release.issues, (i) => i.devDays).toFixed(1)}</td>
			<td>${sum(release.issues, (i) => i.qaDays).toFixed(1)}</td>
		</tr>`;
	});

	div.insertAdjacentHTML("beforeend", `
		<table>
			<thead><tr>
				<th>Release</th><th>Stories</th>
				<th>points</th><th>dev days</th><th>qa days</th></tr></thead>
			<tbody>
				${trs.join("")}
			</tbody>
		</table>
	`)





	//return {labels, data};
}

function sum(array, path){
	return array.reduce((acc, current)=>{
		return path(current)+acc
	}, 0);
}
